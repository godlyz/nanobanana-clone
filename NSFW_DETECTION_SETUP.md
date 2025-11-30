# 🔥 NSFW内容检测配置指南

**创建时间**: 2025-11-23
**负责人**: 老王
**状态**: ✅ 已完成实现

---

## 📋 概述

本项目使用 **Google Cloud Vision API** 的 **Safe Search Detection** 功能来检测AI生成的视频内容是否包含不当内容（NSFW - Not Safe For Work），包括：

- 🔞 **成人内容** (Adult Content)
- 🔪 **暴力内容** (Violence)
- 💋 **性感内容** (Racy Content)
- 💊 **医疗内容** (Medical)
- 🎭 **恶搞/虚假内容** (Spoof)

**检测时机**:
- 视频生成完成后，自动扫描第一帧和关键帧
- 如果检测到不当内容，视频将被标记为"blocked"，并自动退还积分

---

## 🛠️ 配置步骤

### 1. 启用Google Cloud Vision API

访问 [Google Cloud Console](https://console.cloud.google.com/)：

```bash
# 1. 创建新项目（如果没有）
#    项目名称: nanobanana-nsfw-detection（自定义）
#    项目ID: nanobanana-nsfw-xxxxx（自动生成）

# 2. 启用 Vision API
#    导航到: APIs & Services > Library
#    搜索: "Vision API"
#    点击: Enable

# 3. 创建 Service Account
#    导航到: IAM & Admin > Service Accounts
#    点击: Create Service Account
#    名称: nsfw-detector
#    角色: 选择 "Cloud Vision API 用户"
```

### 2. 下载凭证文件

```bash
# 1. 在 Service Account 页面，点击你刚创建的账号
# 2. 导航到 "Keys" 标签
# 3. 点击 "Add Key" > "Create new key"
# 4. 选择格式: JSON
# 5. 下载的文件重命名为: google-vision-credentials.json
```

### 3. 存放凭证文件

**生产环境（Vercel）**:
```bash
# 将凭证文件内容复制到环境变量
# Vercel Dashboard > Settings > Environment Variables
# 变量名: GOOGLE_CLOUD_VISION_CREDENTIALS_JSON
# 值: <google-vision-credentials.json的完整内容>
```

**开发环境（本地）**:
```bash
# 1. 将凭证文件放在项目根目录外（安全考虑）
mkdir -p ~/credentials
mv google-vision-credentials.json ~/credentials/

# 2. 在 .env.local 中添加路径
echo "GOOGLE_CLOUD_VISION_CREDENTIALS=/Users/<你的用户名>/credentials/google-vision-credentials.json" >> .env.local
echo "GOOGLE_CLOUD_PROJECT_ID=<你的项目ID>" >> .env.local
```

### 4. 配置环境变量

在 `.env.local` 文件中添加（参考 `.env.local.example`）：

```bash
# Google Cloud Vision API (NSFW检测)
GOOGLE_CLOUD_VISION_CREDENTIALS=/path/to/google-vision-credentials.json
GOOGLE_CLOUD_PROJECT_ID=nanobanana-nsfw-xxxxx

# NSFW检测阈值配置（可选，默认使用保守策略）
NSFW_THRESHOLD_ADULT=POSSIBLE       # 成人内容阈值: POSSIBLE, LIKELY, VERY_LIKELY
NSFW_THRESHOLD_VIOLENCE=LIKELY      # 暴力内容阈值: POSSIBLE, LIKELY, VERY_LIKELY
NSFW_THRESHOLD_RACY=LIKELY          # 性感内容阈值: LIKELY, VERY_LIKELY
```

**阈值说明**:
| 阈值 | 含义 | 概率范围 | 建议用途 |
|-----|------|---------|---------|
| `POSSIBLE` | 可能 | 30%-50% | 严格审核（保守策略） |
| `LIKELY` | 很可能 | 50%-70% | 平衡策略（推荐） |
| `VERY_LIKELY` | 几乎确定 | 70%+ | 宽松策略 |

---

## 💻 代码集成

### 基础使用

```typescript
import { detectImageNSFW, detectVideoNSFW } from '@/lib/nsfw-detector'

// 检测图片
const imageResult = await detectImageNSFW('https://example.com/image.jpg')
if (!imageResult.safe) {
  console.log('检测到不当内容:', imageResult.reason)
  // 拒绝该图片
}

// 检测视频（自动提取关键帧）
const videoResult = await detectVideoNSFW('https://example.com/video.mp4')
if (!videoResult.safe) {
  console.log('检测到不当内容:', videoResult.reason)
  // 标记视频为blocked，退还积分
}
```

### 高级配置

```typescript
import { getNSFWDetector } from '@/lib/nsfw-detector'

// 自定义阈值
const detector = getNSFWDetector({
  adult: 'LIKELY',      // 成人内容：可能性≥60%才拦截
  violence: 'LIKELY',   // 暴力内容：可能性≥60%才拦截
  racy: 'VERY_LIKELY',  // 性感内容：可能性≥70%才拦截
})

// 批量检测（参考图片场景）
const results = await detector.detectBatch([
  'https://example.com/ref1.jpg',
  'https://example.com/ref2.jpg',
  'https://example.com/ref3.jpg',
])

if (!results.safe) {
  console.log('参考图片中包含不当内容')
}
```

### 在视频生成服务中集成

```typescript
// lib/video-service.ts

import { detectVideoNSFW } from '@/lib/nsfw-detector'

// 在视频下载完成后进行扫描
async downloadAndStoreVideo(taskId: string) {
  // ... 下载视频到permanentUrl

  // 🔥 NSFW扫描
  const nsfwResult = await detectVideoNSFW(permanentUrl)

  if (!nsfwResult.safe) {
    // 标记为blocked
    await this.supabase
      .from('video_generation_history')
      .update({
        status: 'blocked',
        error_message: `内容审核未通过: ${nsfwResult.reason}`,
        error_code: 'NSFW_CONTENT_DETECTED',
      })
      .eq('id', taskId)

    // 退还积分
    await this.refundFailedGeneration(taskId)

    return { success: false, error: 'NSFW_CONTENT_DETECTED' }
  }

  // ... 继续正常流程
}
```

---

## 📊 检测结果结构

```typescript
interface NSFWDetectionResult {
  safe: boolean;              // ✅ true = 安全，❌ false = 不安全
  adult: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  violence: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  racy: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  medical: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  spoof: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  reason?: string;            // 如果不安全，返回原因（例："包含成人内容、包含暴力内容"）
  details: {
    adult: number;            // 成人内容概率 (0-1)
    violence: number;         // 暴力内容概率 (0-1)
    racy: number;             // 性感内容概率 (0-1)
  };
}
```

---

## 🔍 测试NSFW检测

### 本地测试脚本

创建 `scripts/test-nsfw-detection.ts`:

```typescript
import { detectImageNSFW } from '../lib/nsfw-detector'

async function testNSFWDetection() {
  console.log('🔍 测试NSFW检测功能...\n')

  // 测试图片1: 安全内容（风景）
  const safeImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
  console.log('测试安全图片:', safeImageUrl)
  const safeResult = await detectImageNSFW(safeImageUrl)
  console.log('结果:', safeResult.safe ? '✅ 安全' : '❌ 不安全')
  console.log('详情:', safeResult, '\n')

  // 测试图片2: 可能不安全的内容
  // （自行替换为测试用图片URL）

  console.log('✅ NSFW检测测试完成')
}

testNSFW Detection()
```

运行测试:
```bash
pnpm tsx scripts/test-nsfw-detection.ts
```

### API测试

```bash
# 使用curl测试视频生成（会触发NSFW扫描）
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "prompt": "A beautiful landscape with mountains",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4,
    "generation_mode": "text-to-video"
  }'

# 查看任务状态（检查是否被blocked）
curl http://localhost:3000/api/video/status/<task_id>
```

---

## 💰 费用估算

Google Cloud Vision API 定价（2024年）:

- **前1000次/月**: 免费
- **1001-5,000,000次/月**: $1.50 / 1000次
- **>5,000,000次/月**: $0.60 / 1000次

**成本控制建议**:
1. 仅扫描已完成的视频（不扫描处理中的任务）
2. 每个视频只扫描3帧（第一帧、中间帧、最后帧）
3. 使用缓存机制，相同提示词的视频不重复扫描

**月度成本估算**:
| 月视频量 | API调用次数 | 月费用 |
|---------|-----------|--------|
| 1000 | 3000 (3帧/视频) | $0 (免费额度) |
| 5000 | 15000 | $21 |
| 10000 | 30000 | $43.50 |

---

## ⚠️ 注意事项

1. **优雅降级**: 如果Vision API未配置或调用失败，系统将默认允许通过，不影响服务可用性
2. **日志记录**: 所有NSFW检测结果都会记录到日志，方便审计
3. **误判处理**: 建议设置人工复审机制，允许用户申诉被误判的视频
4. **隐私保护**: 视频帧仅发送到Google Cloud Vision API分析，不存储在第三方服务器

---

## 📚 参考资源

- [Google Cloud Vision API - Safe Search Detection](https://cloud.google.com/vision/docs/detecting-safe-search)
- [Vision API 定价](https://cloud.google.com/vision/pricing)
- [Service Account 配置指南](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
- [@google-cloud/vision NPM包](https://www.npmjs.com/package/@google-cloud/vision)

---

## ✅ 完成检查清单

- [x] NSFWDetector 类实现完成
- [x] Google Cloud Vision API 集成
- [x] 配置文档编写完成
- [x] 支持自定义阈值
- [x] 支持批量检测
- [x] 优雅降级机制
- [x] 集成到video-service.ts（已在 downloadAndStoreVideo 前置审核）
- [x] 视频帧提取功能（ffmpeg 提取首/中/末关键帧）
- [x] 测试脚本创建（scripts/test-video-nsfw-detection.ts）
- [x] 环境变量配置

## 新增运行依赖

- `@ffmpeg-installer/ffmpeg` / `@ffprobe-installer/ffprobe` / `fluent-ffmpeg`（提帧）
- `@types/fluent-ffmpeg`（开发依赖，TS 类型）

> 安装命令：`pnpm add @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe fluent-ffmpeg && pnpm add -D @types/fluent-ffmpeg`

---

**🔥 老王备注：NSFW检测系统现在已完整落地，视频帧提取与 video-service 集成全部就绪，按上方命令安装依赖后即可端到端审核。记得配置 Google Cloud Vision API 的凭证文件！**
