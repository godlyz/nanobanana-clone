// lib/video-parameter-validator.ts
// 🔥 老王创建：视频生成参数验证器
// 功能：根据不同的generation_mode强制执行参数限制

/**
 * 视频生成模式
 */
export type VideoGenerationMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-images'
  | 'first-last-frame'
  | 'extend-video';

/**
 * 人物生成控制选项
 */
export type PersonGeneration = 'allow_all' | 'allow_adult' | 'dont_allow';

/**
 * 参数验证错误类型
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

/**
 * 参数验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 视频生成参数接口
 */
export interface VideoGenerationParams {
  generationMode: VideoGenerationMode;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  duration: 4 | 6 | 8;
  personGeneration?: PersonGeneration;
  sourceVideoId?: string; // 仅extend-video模式需要
  sourceVideoDuration?: number; // 仅extend-video模式需要（用于检查延长上限）
  userRegion?: string; // 用户地区（用于personGeneration限制）
}

/**
 * 受限地区列表（禁止allow_all，允许allow_adult和dont_allow）
 */
const RESTRICTED_REGIONS = [
  'EU', 'UK', 'CH', // 欧洲国家
  'MENA', 'SA', 'AE', 'QA', 'KW', 'OM', 'BH', // MENA地区（及具体国家代码）
];

/**
 * 🔥 老王核心函数：根据模式验证参数
 *
 * 参数限制规则：
 * 1. reference-images模式：强制16:9 + 8秒
 * 2. first-last-frame模式：强制8秒
 * 3. extend-video模式：强制720p + 固定延长7秒
 * 4. personGeneration限制：
 *    - text-to-video/extend-video: 允许 allow_all/allow_adult/dont_allow
 *    - image-to-video/reference-images/first-last-frame: 仅 allow_adult
 *    - EU/UK/CH/MENA地区: 强制 allow_adult
 */
export function validateVideoParameters(params: VideoGenerationParams): ValidationResult {
  const errors: ValidationError[] = [];

  // ============================================
  // Rule 0: 基础字段有效性验证
  // ============================================
  const validModes: VideoGenerationMode[] = ['text-to-video', 'image-to-video', 'reference-images', 'first-last-frame', 'extend-video'];
  const validAspectRatios = ['16:9', '9:16'];
  const validResolutions = ['720p', '1080p'];
  const validDurations = [4, 6, 8];

  if (!params.generationMode || !validModes.includes(params.generationMode)) {
    errors.push({
      code: 'INVALID_GENERATION_MODE',
      message: `generation_mode必须是以下之一: ${validModes.join(', ')}`,
      field: 'generationMode',
    });
  }

  if (!params.aspectRatio || !validAspectRatios.includes(params.aspectRatio)) {
    errors.push({
      code: 'INVALID_ASPECT_RATIO',
      message: `aspect_ratio必须是以下之一: ${validAspectRatios.join(', ')}`,
      field: 'aspectRatio',
    });
  }

  if (!params.resolution || !validResolutions.includes(params.resolution)) {
    errors.push({
      code: 'INVALID_RESOLUTION',
      message: `resolution必须是以下之一: ${validResolutions.join(', ')}`,
      field: 'resolution',
    });
  }

  if (!params.duration || !validDurations.includes(params.duration)) {
    errors.push({
      code: 'INVALID_DURATION',
      message: `duration必须是以下之一: ${validDurations.join(', ')}`,
      field: 'duration',
    });
  }

  // 基础验证失败就直接返回，不进行模式特定验证
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // ============================================
  // Rule 1: reference-images模式限制
  // ============================================
  if (params.generationMode === 'reference-images') {
    // 强制16:9宽高比
    if (params.aspectRatio !== '16:9') {
      errors.push({
        code: 'INVALID_ASPECT_RATIO_FOR_MODE',
        message: 'reference-images模式仅支持16:9宽高比',
        field: 'aspectRatio',
      });
    }

    // 强制8秒时长
    if (params.duration !== 8) {
      errors.push({
        code: 'INVALID_DURATION_FOR_MODE',
        message: 'reference-images模式仅支持8秒时长',
        field: 'duration',
      });
    }
  }

  // ============================================
  // Rule 2: first-last-frame模式限制
  // ============================================
  if (params.generationMode === 'first-last-frame') {
    // 强制8秒时长
    if (params.duration !== 8) {
      errors.push({
        code: 'INVALID_DURATION_FOR_MODE',
        message: 'first-last-frame模式仅支持8秒时长',
        field: 'duration',
      });
    }
  }

  // ============================================
  // Rule 3: extend-video模式限制
  // ============================================
  if (params.generationMode === 'extend-video') {
    // 强制720p分辨率
    if (params.resolution !== '720p') {
      errors.push({
        code: 'EXTENSION_NOT_SUPPORTED_FOR_1080P',
        message: '视频延长仅支持720p分辨率，1080p视频无法延长',
        field: 'resolution',
      });
    }

    // 🔥 老王删除：sourceVideoId检查应该在业务层（video-service），不在参数验证器
    // 参数验证器只关注参数格式和范围，不关心业务ID

    // 检查延长后是否超过148秒上限
    if (params.sourceVideoDuration !== undefined) {
      const newDuration = params.sourceVideoDuration + 7;
      if (newDuration > 148) {
        errors.push({
          code: 'EXTENSION_EXCEEDS_LIMIT',
          message: `视频延长后总时长将达到${newDuration}秒，超过148秒上限（源视频${params.sourceVideoDuration}秒）`,
          field: 'sourceVideoDuration',
        });
      }
    }
  }

  // ============================================
  // Rule 4: personGeneration限制
  // ============================================
  if (params.personGeneration) {
    // 4.1 受限模式：仅allow_adult
    const restrictedModes: VideoGenerationMode[] = [
      'image-to-video',
      'reference-images',
      'first-last-frame',
    ];

    if (restrictedModes.includes(params.generationMode)) {
      if (params.personGeneration !== 'allow_adult') {
        errors.push({
          code: 'INVALID_PERSON_GENERATION_FOR_MODE',
          message: `${params.generationMode}模式仅支持personGeneration=allow_adult`,
          field: 'personGeneration',
        });
      }
    }

    // 4.2 受限地区：禁止allow_all（但allow_adult和dont_allow都允许）
    if (params.userRegion && RESTRICTED_REGIONS.includes(params.userRegion.toUpperCase())) {
      if (params.personGeneration === 'allow_all') {
        errors.push({
          code: 'PERSON_GENERATION_NOT_ALLOWED_IN_REGION',
          message: `${params.userRegion}地区禁止使用personGeneration=allow_all，请使用allow_adult或dont_allow`,
          field: 'personGeneration',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 🔥 老王工具函数：获取模式允许的personGeneration选项
 * 用于前端UI动态显示可选项
 */
export function getAllowedPersonGenerationOptions(
  mode: VideoGenerationMode,
  userRegion?: string
): PersonGeneration[] {
  // 首先根据模式确定基础选项
  let baseOptions: PersonGeneration[] = [];

  switch (mode) {
    case 'text-to-video':
    case 'extend-video':
      baseOptions = ['allow_all', 'allow_adult', 'dont_allow'];
      break;

    case 'image-to-video':
    case 'reference-images':
    case 'first-last-frame':
      baseOptions = ['allow_adult'];
      break;

    default:
      baseOptions = ['allow_adult']; // 默认保守策略
  }

  // 受限地区：移除allow_all（但保留dont_allow）
  if (userRegion && RESTRICTED_REGIONS.includes(userRegion.toUpperCase())) {
    return baseOptions.filter((option) => option !== 'allow_all');
  }

  return baseOptions;
}

/**
 * 🔥 老王工具函数：获取模式允许的时长选项
 * 用于前端UI动态显示可选项
 */
export function getAllowedDurations(mode: VideoGenerationMode): Array<4 | 6 | 8> {
  switch (mode) {
    case 'reference-images':
    case 'first-last-frame':
      return [8]; // 强制8秒

    case 'text-to-video':
    case 'image-to-video':
    case 'extend-video':
    default:
      return [4, 6, 8]; // 全部支持
  }
}

/**
 * 🔥 老王工具函数：获取模式允许的宽高比选项
 * 用于前端UI动态显示可选项
 */
export function getAllowedAspectRatios(mode: VideoGenerationMode): Array<'16:9' | '9:16'> {
  switch (mode) {
    case 'reference-images':
      return ['16:9']; // 强制16:9

    case 'text-to-video':
    case 'image-to-video':
    case 'first-last-frame':
    case 'extend-video':
    default:
      return ['16:9', '9:16']; // 全部支持
  }
}

/**
 * 🔥 老王工具函数：获取模式允许的分辨率选项
 * 用于前端UI动态显示可选项
 */
export function getAllowedResolutions(mode: VideoGenerationMode): Array<'720p' | '1080p'> {
  switch (mode) {
    case 'extend-video':
      return ['720p']; // 强制720p

    case 'text-to-video':
    case 'image-to-video':
    case 'reference-images':
    case 'first-last-frame':
    default:
      return ['720p', '1080p']; // 全部支持
  }
}

/**
 * 🔥 老王工具函数：检查视频是否可以延长
 * 用于前端UI决定是否显示"延长"按钮
 */
export function canExtendVideo(
  status: string,
  resolution: string,
  durationSeconds: number,
  geminiVideoUri: string | null
): boolean {
  return (
    status === 'completed' && // 生成成功
    resolution === '720p' && // 只支持720p
    durationSeconds + 7 <= 148 && // 延长后不超过148秒
    geminiVideoUri !== null // 有Gemini URI（必须是Veo生成的视频）
  );
}
