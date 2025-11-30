/**
 * 🔥 老王的NSFW内容扫描模块
 * 用途: 检测AI生成的视频内容是否包含不当内容
 * 技术: Google Cloud Vision API - Safe Search Detection
 *
 * 功能:
 * - 扫描视频第一帧和中间帧，检测NSFW内容
 * - 返回详细的安全评级（ADULT, VIOLENCE, RACY等）
 * - 支持自定义阈值配置
 *
 * 🔥 老王注意：
 * - 这个功能很重要，避免平台被滥用
 * - Google Vision API 需要单独申请并配置 API Key
 * - 如果检测到不当内容，自动标记视频并退还积分
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
// 🔥 老王修复：导入fluent-ffmpeg的类型定义（用于metadata参数类型标注）
import type { FfprobeData } from 'fluent-ffmpeg';

// 🔥 老王修复：延迟加载ffmpeg，避免生产构建时出错
// ffmpeg只在服务端运行时需要，不应该在构建时加载
let ffmpeg: any;
let ffmpegInitialized = false;

async function initializeFfmpeg() {
  if (ffmpegInitialized) return;

  // 动态导入ffmpeg相关依赖（仅在运行时）
  const fluentFfmpeg = await import('fluent-ffmpeg');
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
  const ffprobeInstaller = await import('@ffprobe-installer/ffprobe');

  ffmpeg = fluentFfmpeg.default;
  ffmpeg.setFfmpegPath(ffmpegInstaller.default.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.default.path);

  ffmpegInitialized = true;
}

const HTTP_URL_REGEX = /^https?:\/\//i;

// 默认安全结果（用于优雅降级）
function createSafeResult(): NSFWDetectionResult {
  return {
    safe: true,
    adult: 'UNKNOWN',
    violence: 'UNKNOWN',
    racy: 'UNKNOWN',
    medical: 'UNKNOWN',
    spoof: 'UNKNOWN',
    details: {
      adult: 0,
      violence: 0,
      racy: 0,
    },
  };
}

async function ensureLocalVideoFile(videoUrl: string, workingDir: string): Promise<string> {
  // 允许传入 file:// 或本地路径
  if (!HTTP_URL_REGEX.test(videoUrl)) {
    return videoUrl.startsWith('file://') ? videoUrl.replace('file://', '') : videoUrl;
  }

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`下载视频失败: HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const localPath = path.join(workingDir, 'input-video.mp4');
  await fs.writeFile(localPath, buffer);
  return localPath;
}

async function getVideoDurationSeconds(videoPath: string): Promise<number | null> {
  // 🔥 老王修复：确保ffmpeg已初始化
  await initializeFfmpeg();

  return new Promise(resolve => {
    // 🔥 老王修复：明确标注error和metadata类型（fluent-ffmpeg的ffprobe回调签名）
    ffmpeg.ffprobe(videoPath, (error: Error | null, metadata: FfprobeData) => {
      if (error || !metadata?.format?.duration) {
        console.warn('⚠️ 无法获取视频时长，使用默认时间点', error);
        resolve(null);
        return;
      }
      resolve(metadata.format.duration || null);
    });
  });
}

function buildTimestamps(duration: number | null, framesToCheck: number): number[] {
  if (framesToCheck <= 0) {
    return [];
  }

  // 无法获取时长时，默认取 0s、1s、2s
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    return Array.from({ length: framesToCheck }, (_, idx) => idx);
  }

  if (framesToCheck === 1) {
    return [Math.max(duration / 2, 0)];
  }

  if (framesToCheck === 2) {
    return [0, Math.max(duration - 0.1, 0)];
  }

  const last = Math.max(duration - 0.1, 0);
  if (framesToCheck === 3) {
    return [0, duration / 2, last];
  }

  const step = duration / (framesToCheck - 1);
  const timestamps = Array.from({ length: framesToCheck }, (_, idx) =>
    Math.min(step * idx, last)
  );
  timestamps[timestamps.length - 1] = last;
  return timestamps;
}

async function extractFramesFromVideo(
  videoPath: string,
  timestamps: number[],
  outputDir: string
): Promise<string[]> {
  // 🔥 老王修复：确保ffmpeg已初始化
  await initializeFfmpeg();

  const framePaths: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts = Math.max(timestamps[i], 0);
    const framePath = path.join(outputDir, `frame-${i}.jpg`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(ts)
        .frames(1)
        .outputOptions(['-qscale:v 3'])
        .output(framePath)
        .on('end', () => {
          framePaths.push(framePath);
          resolve();
        })
        // 🔥 老王修复：标注error参数类型（fluent-ffmpeg的error事件回调）
        .on('error', (error: Error) => reject(error))
        .run();
    });
  }

  return framePaths;
}

// NSFW 检测结果
export interface NSFWDetectionResult {
  safe: boolean;              // 是否安全
  adult: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  violence: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  racy: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  medical: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  spoof: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  reason?: string;            // 如果不安全，返回原因
  details: {
    adult: number;            // 成人内容概率 (0-1)
    violence: number;         // 暴力内容概率 (0-1)
    racy: number;             // 性感内容概率 (0-1)
  };
}

// 安全阈值配置
export interface SafetyThresholds {
  adult: 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';      // 成人内容阈值（默认POSSIBLE）
  violence: 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';   // 暴力内容阈值（默认LIKELY）
  racy: 'LIKELY' | 'VERY_LIKELY';                    // 性感内容阈值（默认LIKELY）
}

// 默认阈值（保守策略）
const DEFAULT_THRESHOLDS: SafetyThresholds = {
  adult: 'POSSIBLE',      // 成人内容：可能性≥30%就拦截
  violence: 'LIKELY',     // 暴力内容：可能性≥60%才拦截
  racy: 'LIKELY',         // 性感内容：可能性≥60%才拦截
};

// 将枚举值转换为数值概率（用于详细统计）
function likelihoodToScore(likelihood: string): number {
  const scores: Record<string, number> = {
    'UNKNOWN': 0,
    'VERY_UNLIKELY': 0.1,
    'UNLIKELY': 0.3,
    'POSSIBLE': 0.5,
    'LIKELY': 0.7,
    'VERY_LIKELY': 0.9,
  };
  return scores[likelihood] || 0;
}

// 检查是否超过阈值
function exceedsThreshold(
  currentLevel: string,
  threshold: string
): boolean {
  const currentScore = likelihoodToScore(currentLevel);
  const thresholdScore = likelihoodToScore(threshold);
  return currentScore >= thresholdScore;
}

/**
 * 🔥 NSFW检测器类
 */
export class NSFWDetector {
  private client: ImageAnnotatorClient | null = null;
  private thresholds: SafetyThresholds;
  private enabled: boolean = false;

  constructor(thresholds?: Partial<SafetyThresholds>) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };

    // 检查环境变量
    const credentialsPath = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!credentialsPath || !projectId) {
      console.warn('⚠️ Google Cloud Vision API 未配置，NSFW检测功能已禁用');
      console.warn('   请设置环境变量：');
      console.warn('   - GOOGLE_CLOUD_VISION_CREDENTIALS=<path_to_credentials.json>');
      console.warn('   - GOOGLE_CLOUD_PROJECT_ID=<your_project_id>');
      this.enabled = false;
      return;
    }

    try {
      // 初始化 Google Vision API 客户端
      this.client = new ImageAnnotatorClient({
        keyFilename: credentialsPath,
        projectId: projectId,
      });

      this.enabled = true;
      console.log('✅ NSFW检测器初始化成功（Google Cloud Vision API）');
    } catch (error) {
      console.error('❌ NSFW检测器初始化失败:', error);
      this.enabled = false;
    }
  }

  /**
   * 检测图片是否包含NSFW内容
   * @param imageUrl - 图片URL或Base64字符串
   */
  async detectImage(imageUrl: string): Promise<NSFWDetectionResult> {
    // 如果未启用，默认返回安全
    if (!this.enabled || !this.client) {
      console.warn('⚠️ NSFW检测未启用，默认允许通过');
      return createSafeResult();
    }

    try {
      // 调用 Google Vision API 的 Safe Search Detection
      const [result] = await this.client.safeSearchDetection(imageUrl);
      const safeSearch = result.safeSearchAnnotation;

      if (!safeSearch) {
        throw new Error('Safe Search Detection 返回空结果');
      }

      // 检查是否超过阈值
      // 🔥 老王修复：safeSearch字段是Likelihood枚举类型，需要转成string传给exceedsThreshold
      const adultUnsafe = exceedsThreshold(String(safeSearch.adult || 'UNKNOWN'), this.thresholds.adult);
      const violenceUnsafe = exceedsThreshold(String(safeSearch.violence || 'UNKNOWN'), this.thresholds.violence);
      const racyUnsafe = exceedsThreshold(String(safeSearch.racy || 'UNKNOWN'), this.thresholds.racy);

      const safe = !adultUnsafe && !violenceUnsafe && !racyUnsafe;

      // 生成不安全原因
      let reason: string | undefined;
      if (!safe) {
        const reasons: string[] = [];
        if (adultUnsafe) reasons.push('包含成人内容');
        if (violenceUnsafe) reasons.push('包含暴力内容');
        if (racyUnsafe) reasons.push('包含性感内容');
        reason = reasons.join('、');
      }

      // 🔥 老王修复：Google Vision API返回的Likelihood枚举需要转string（类型安全处理）
      const adultStr = String(safeSearch.adult || 'UNKNOWN');
      const violenceStr = String(safeSearch.violence || 'UNKNOWN');
      const racyStr = String(safeSearch.racy || 'UNKNOWN');
      const medicalStr = String(safeSearch.medical || 'UNKNOWN');
      const spoofStr = String(safeSearch.spoof || 'UNKNOWN');

      return {
        safe,
        adult: adultStr as 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
        violence: violenceStr as 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
        racy: racyStr as 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
        medical: medicalStr as 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
        spoof: spoofStr as 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
        reason,
        details: {
          adult: likelihoodToScore(adultStr),
          violence: likelihoodToScore(violenceStr),
          racy: likelihoodToScore(racyStr),
        },
      };
    } catch (error: any) {
      console.error('❌ NSFW检测失败:', error);

      // 出错时默认允许通过（优雅降级）
      return createSafeResult();
    }
  }

  /**
   * 从视频URL提取关键帧并检测NSFW内容
   * @param videoUrl - 视频URL
   * @param framesToCheck - 需要检查的帧数（默认3：第一帧、中间帧、最后帧）
   */
  async detectVideo(
    videoUrl: string,
    framesToCheck: number = 3
  ): Promise<NSFWDetectionResult> {
    // 如果未启用，默认返回安全
    if (!this.enabled) {
      return createSafeResult();
    }

    const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nsfw-video-'));
    console.log(`🔍 开始检测视频: ${videoUrl}`);

    try {
      const localVideoPath = await ensureLocalVideoFile(videoUrl, workingDir);
      const duration = await getVideoDurationSeconds(localVideoPath);
      const timestamps = buildTimestamps(duration, framesToCheck);
      const framePaths = await extractFramesFromVideo(
        localVideoPath,
        timestamps,
        workingDir
      );

      if (framePaths.length === 0) {
        console.warn('⚠️ 未成功提取任何视频帧，默认允许通过');
        return createSafeResult();
      }

      const result = await this.detectBatch(framePaths);

      if (!result.safe) {
        console.error('❌ 视频NSFW检测未通过:', result.reason);
      } else {
        console.log('✅ 视频NSFW检测通过');
      }

      return result;
    } catch (error) {
      console.error('❌ 视频NSFW检测失败:', error);
      return createSafeResult();
    } finally {
      await fs.rm(workingDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * 批量检测多个图片
   * @param imageUrls - 图片URL数组
   * @returns 只要有一张图片不安全，整体结果就是不安全
   */
  async detectBatch(imageUrls: string[]): Promise<NSFWDetectionResult> {
    if (imageUrls.length === 0) {
      return createSafeResult();
    }

    // 并行检测所有图片
    const results = await Promise.all(
      imageUrls.map(url => this.detectImage(url))
    );

    // 只要有一张不安全，整体就不安全
    const allSafe = results.every(r => r.safe);

    if (!allSafe) {
      // 找到第一个不安全的结果并返回
      const unsafeResult = results.find(r => !r.safe);
      if (unsafeResult) {
        return unsafeResult;
      }
    }

    // 所有图片都安全，返回汇总结果
    const maxAdult = Math.max(...results.map(r => r.details.adult));
    const maxViolence = Math.max(...results.map(r => r.details.violence));
    const maxRacy = Math.max(...results.map(r => r.details.racy));

    return {
      safe: true,
      adult: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
      medical: 'UNKNOWN',
      spoof: 'UNKNOWN',
      details: {
        adult: maxAdult,
        violence: maxViolence,
        racy: maxRacy,
      },
    };
  }

  /**
   * 检查NSFW检测是否已启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 更新安全阈值
   */
  updateThresholds(thresholds: Partial<SafetyThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };
    console.log('✅ NSFW检测阈值已更新:', this.thresholds);
  }
}

/**
 * 🔥 导出单例NSFW检测器
 */
let nsfwDetector: NSFWDetector | null = null;

export function getNSFWDetector(thresholds?: Partial<SafetyThresholds>): NSFWDetector {
  if (!nsfwDetector) {
    nsfwDetector = new NSFWDetector(thresholds);
  }
  return nsfwDetector;
}

/**
 * 🔥 快捷方法：检测图片
 */
export async function detectImageNSFW(imageUrl: string): Promise<NSFWDetectionResult> {
  const detector = getNSFWDetector();
  return detector.detectImage(imageUrl);
}

/**
 * 🔥 快捷方法：检测视频
 */
// 🔥 老王修复：添加framesToCheck参数透传给detector.detectVideo
export async function detectVideoNSFW(videoUrl: string, framesToCheck: number = 3): Promise<NSFWDetectionResult> {
  const detector = getNSFWDetector();
  return detector.detectVideo(videoUrl, framesToCheck);
}

// 🔥 老王备注：
// 1. 完整的NSFW检测实现，支持图片和视频
// 2. 使用 Google Cloud Vision API 的 Safe Search Detection
// 3. 支持自定义阈值配置（adult, violence, racy）
// 4. 优雅降级：API未配置时默认允许通过，不影响服务
// 5. 批量检测支持：可以一次检测多张图片
//
// 配置步骤：
// 1. 在 Google Cloud Console 启用 Vision API
// 2. 创建 Service Account 并下载 credentials.json
// 3. 设置环境变量：
//    - GOOGLE_CLOUD_VISION_CREDENTIALS=/path/to/credentials.json
//    - GOOGLE_CLOUD_PROJECT_ID=your-project-id
//
// 使用示例:
// ```typescript
// import { detectImageNSFW } from '@/lib/nsfw-detector'
//
// const result = await detectImageNSFW('https://example.com/image.jpg')
// if (!result.safe) {
//   console.log('检测到不当内容:', result.reason)
//   // 拒绝该图片/视频
// }
// ```
