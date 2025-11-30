# 视频生成 API 文档

Nano Banana 视频生成功能基于 Google Veo 3.1 API，支持通过自然语言提示词生成高质量视频。

---

## 📋 目录

- [功能特性](#功能特性)
- [视频生成模式](#视频生成模式)
- [参数限制矩阵](#参数限制矩阵)
- [人物生成控制](#人物生成控制)
- [技术架构](#技术架构)
- [API 端点](#api-端点)
- [视频延长功能](#视频延长功能)
- [积分消费规则](#积分消费规则)
- [使用流程](#使用流程)
- [错误处理](#错误处理)
- [最佳实践建议](#最佳实践建议)
- [环境配置](#环境配置)
- [测试指南](#测试指南)

---

## 🎯 功能特性

- ✅ **多种生成模式**：支持文生视频、图生视频、参考图片、首尾帧插值、视频延长
- ✅ **自然语言生成**：通过文字描述生成视频，支持复杂镜头语言和音频提示
- ✅ **多种分辨率**：支持 720p 和 1080p（视频延长仅支持 720p）
- ✅ **灵活时长**：支持 4 秒、6 秒、8 秒（不同模式有专门限制，见参数矩阵）
- ✅ **宽高比选择**：16:9（横屏）和 9:16（竖屏）
- ✅ **参考图像与帧控制**：支持 1–3 张参考图片、首帧 / 尾帧插值生成
- ✅ **人物生成控制**：通过 `personGeneration` 控制是否生成人物及年龄段，支持地区差异策略
- ✅ **负面提示词**：排除不需要的元素（`negativePrompt`）
- ✅ **积分系统**：动态计费，失败自动退款
- ✅ **并发限制**：每用户最多 3 个并发任务
- ✅ **异步处理**：后台生成，轮询查询状态

---

## 🎬 视频生成模式

Veo 3.1 API 支持以下5种视频生成模式：

| 模式 | 说明 | 输入要求 | 典型用途 |
|------|------|---------|---------|
| **文生视频** (text-to-video) | 纯文字提示词生成 | 仅需提示词 | 创意内容生成 |
| **图生视频** (image-to-video) | 单张图片+提示词 | 1张图片 | 静态图片动画化 |
| **参考图片** (reference-images) | 多张参考图+提示词 | 1-3张图片 | 风格/角色一致性 |
| **首尾帧插值** (first-last-frame) | 首尾两帧图片插值 | 2张图片(首+尾) | 平滑过渡动画 |
| **视频延长** (extend-video) | 延长已生成视频 | 已有Veo视频 | 增加视频长度 |

---

## 📊 参数限制矩阵

不同生成模式对参数的支持情况：

| 参数 | 文生视频 | 图生视频 | 参考图片 | 首尾帧 | 视频延长 |
|------|---------|---------|---------|-------|---------|
| `prompt` | ✅ 必需 | ✅ 必需 | ✅ 必需 | ✅ 必需 | ✅ 必需 |
| `negativePrompt` | ✅ 可选 | ✅ 可选 | ✅ 可选 | ✅ 可选 | ✅ 可选 |
| `aspectRatio` | `16:9` / `9:16` | `16:9` / `9:16` | **仅`16:9`** | `16:9` / `9:16` | 继承源视频 |
| `resolution` | `720p` / `1080p` | `720p` / `1080p` | `720p` / `1080p` | `720p` / `1080p` | **仅`720p`** |
| `durationSeconds` | `4` / `6` / `8` | `4` / `6` / `8` | **仅`8`** | **仅`8`** | 固定+7秒 |
| `personGeneration` | `allow_all` | `allow_adult` | `allow_adult` | `allow_adult` | `allow_all` |
| `image` | ❌ | ✅ 1张 | ❌ | ✅ 首帧 | ❌ |
| `lastFrame` | ❌ | ❌ | ❌ | ✅ 尾帧 | ❌ |
| `referenceImages` | ❌ | ❌ | ✅ 1-3张 | ❌ | ❌ |
| `video` | ❌ | ❌ | ❌ | ❌ | ✅ 源视频URI |

### ⚠️ 关键限制说明

**参考图片模式（reference-images）**：
- ❌ **不支持9:16竖屏** - 只能使用16:9横屏
- ❌ **不支持4秒/6秒** - 时长必须为8秒
- 📝 **官方原文**：*"Must be '8' when using referenceImages (only supports 16:9)"*

**首尾帧插值模式（first-last-frame / interpolation）**：
- ❌ **不支持4秒/6秒** - 时长必须为8秒
- ✅ 支持16:9和9:16两种宽高比
- 📝 输入两张图片（首帧和尾帧），API自动生成中间的平滑过渡

**视频延长模式（extend-video / extension）**：
- ❌ **只支持720p** - 不支持1080p
- ⏱️ **固定延长7秒** - 无法自定义延长时长
- 📏 **视频最长148秒** - 超过148秒的视频无法继续延长
- 🔄 **从4秒最多延长20次** - 可延长到144秒（4+7×20）

---

## 👤 人物生成控制（personGeneration）

控制视频中是否生成人物及年龄限制。

### 可选值

| 值 | 说明 | 适用模式 |
|---|------|---------|
| `allow_all` | 允许生成所有年龄段的人物 | 文生视频、视频延长 |
| `allow_adult` | 仅允许生成成年人 | 图生视频、参考图片、首尾帧 |
| `dont_allow` | 不允许生成人物（仅Veo 2支持） | - |

### 模式限制示例

```typescript
// ✅ 正确示例
{
  mode: 'text-to-video',
  personGeneration: 'allow_all' // 或 'allow_adult' / 'dont_allow'
}

{
  mode: 'reference-images',
  personGeneration: 'allow_adult' // 只能是 allow_adult
}

// ❌ 错误示例
{
  mode: 'reference-images',
  personGeneration: 'allow_all' // ❌ 不支持
}
```

### 地区限制

在EU、UK、CH、MENA地区：
- **Veo 3.1**：只能使用 `allow_adult`
- **Veo 2**：只能使用 `allow_adult` 或 `dont_allow`（默认`dont_allow`）

---

## 🏗️ 技术架构

### 核心组件

```
用户请求
    ↓
POST /api/v1/video/generate (创建任务)
    ↓
扣除积分 → 调用 Google Veo API
    ↓
返回 task_id 和 operation_id
    ↓
Vercel Cron (每分钟轮询)
    ↓
检查 Google Veo 状态
    ↓
completed → 下载视频 → 上传 Supabase Storage
    ↓
failed → 自动退款
    ↓
GET /api/v1/video/status/:task_id (查询结果)
```

### 数据库表

- **`video_generation_history`**: 视频生成任务记录
- **`credit_transactions`**: 积分交易记录
- **`system_configs`**: 视频定价配置

### 后台任务

- **`/api/cron/poll-video-status`**: 每分钟轮询 Google Veo 状态
- **`/api/cron/download-video`**: 下载并上传视频到 Supabase Storage

---

## 🔌 API 端点

### 1. 创建视频生成任务

**POST** `/api/v1/video/generate`

#### 请求头

```http
x-api-key: your_api_key
Content-Type: application/json
```

#### 请求体

```json
{
  "prompt": "A beautiful sunset over the ocean with waves crashing on the beach",
  "negative_prompt": "low quality, blurry, distorted",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": 4,
  "reference_image_url": "https://example.com/reference.jpg"
}
```

| 字段 | 类型 | 必需 | 说明 |
|-----|------|-----|------|
| `prompt` | string | ✅ | 视频提示词（英文，建议20-200字） |
| `negative_prompt` | string | ❌ | 负面提示词（不希望出现的元素） |
| `aspect_ratio` | string | ✅ | 宽高比：`16:9` 或 `9:16` |
| `resolution` | string | ✅ | 分辨率：`720p` 或 `1080p` |
| `duration` | number | ✅ | 时长（秒）：`4`、`6` 或 `8` |
| `reference_image_url` | string | ❌ | 参考图片URL（HTTPS） |

#### 成功响应 (200)

```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "operation_id": "projects/.../operations/...",
  "status": "processing",
  "credit_cost": 40,
  "estimated_completion_time": "11s-6min",
  "message": "Video generation task created successfully"
}
```

#### 错误响应

```json
// 400 - 参数错误
{
  "error": "Invalid aspect_ratio (must be \"16:9\" or \"9:16\")"
}

// 402 - 积分不足
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Insufficient credits for video generation. Please purchase more credits."
}

// 429 - 并发限制
{
  "error": "CONCURRENT_LIMIT_EXCEEDED",
  "message": "Maximum 3 concurrent video generation tasks allowed. Please wait for existing tasks to complete."
}
```

---

### 2. 查询任务状态

**GET** `/api/v1/video/status/:task_id`

#### 请求头

```http
x-api-key: your_api_key
```

#### 成功响应 - Processing (200)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-01-18T10:00:00Z",
  "prompt": "A beautiful sunset...",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": 4,
  "credit_cost": 40,
  "message": "Video generation in progress. Estimated time: 11s-6min"
}
```

#### 成功响应 - Completed (200)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "created_at": "2025-01-18T10:00:00Z",
  "completed_at": "2025-01-18T10:03:30Z",
  "prompt": "A beautiful sunset...",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": 4,
  "credit_cost": 40,
  "video_url": "https://xxx.supabase.co/storage/v1/object/public/videos/...",
  "thumbnail_url": "https://xxx.supabase.co/storage/v1/object/public/videos/..."
}
```

#### 失败响应 - Failed (200)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "created_at": "2025-01-18T10:00:00Z",
  "prompt": "A beautiful sunset...",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": 4,
  "credit_cost": 40,
  "error_message": "Video generation failed due to API error",
  "error_code": "VEO_API_ERROR",
  "refund_confirmed": true
}
```

#### 错误响应

```json
// 400 - 非法任务ID
{
  "error": "INVALID_TASK_ID",
  "message": "Task ID must be a valid UUID"
}

// 403 - 无权访问
{
  "error": "UNAUTHORIZED_ACCESS",
  "message": "You do not have permission to access this task"
}

// 404 - 任务不存在
{
  "error": "TASK_NOT_FOUND",
  "message": "Task with ID xxx not found"
}
```

---

## ⏱️ 视频延长功能（Extend Video）

将已生成的Veo视频延长7秒。

### ⚠️ 重要限制

**视频来源限制**：
- ✅ **只能延长Veo生成的视频** - 必须是通过本平台Veo API生成的视频
- ❌ **不支持外部上传的视频** - 即使格式符合要求也无法延长
- ✅ **可以延长"已延长过的视频"** - 支持延长链（最多20次）

**技术限制**：
- ⏱️ 每次固定延长**7秒**（无法自定义时长）
- 📏 视频最长**148秒**（超过148秒无法继续延长）
- 📹 只支持**720p分辨率**（不支持1080p）
- 🎬 宽高比自动继承源视频（16:9或9:16）
- 👤 人物生成固定为`allow_all`

**延长机制**：
- API分析源视频的**最后1秒**（24帧）作为延续依据
- 如果最后1秒没有语音，延长后的语音效果会不佳
- 延长部分与源视频无缝衔接，输出为合并后的完整视频

### API端点

**POST** `/api/v1/video/extend`

### 请求参数

```json
{
  "source_video_id": "uuid-of-existing-video",
  "prompt": "描述延长部分的内容...",
  "negative_prompt": "可选的负面提示词"
}
```

| 字段 | 类型 | 必需 | 说明 |
|-----|------|-----|------|
| `source_video_id` | string | ✅ | 源视频的数据库ID（video_generation_history表的id） |
| `prompt` | string | ✅ | 延长部分的提示词（建议与源视频内容连贯） |
| `negative_prompt` | string | ❌ | 负面提示词 |

### 固定参数（由API自动设置）

以下参数无法自定义，由系统根据源视频和API限制自动设置：

- `resolution`: `720p`（强制，视频延长不支持1080p）
- `durationSeconds`: `8`（生成7秒新内容 + 1秒重叠）
- `aspectRatio`: 继承源视频的宽高比
- `personGeneration`: `allow_all`（固定值）

### TypeScript 调用示例

```typescript
async function extendVideo(sourceVideoId: string, prompt: string) {
  // 1. 检查源视频信息
  const sourceVideo = await getVideoById(sourceVideoId);

  if (sourceVideo.status !== 'completed') {
    throw new Error('源视频未完成生成');
  }

  if (sourceVideo.duration_seconds >= 148) {
    throw new Error('源视频已达最大长度148秒，无法继续延长');
  }

  if (sourceVideo.duration_seconds + 7 > 148) {
    throw new Error('延长后将超过最大长度148秒，无法延长');
  }

  if (!sourceVideo.gemini_video_uri) {
    throw new Error('源视频缺少Gemini URI，无法延长');
  }

  // 2. 创建延长任务
  const response = await fetch('/api/v1/video/extend', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source_video_id: sourceVideoId,
      prompt: '继续之前的场景，太阳完全升起，照亮整个山谷',
      negative_prompt: 'blurry, low quality'
    })
  });

  const { task_id, credit_cost } = await response.json();
  console.log(`延长任务已创建：${task_id}，消耗${credit_cost}积分`);

  // 3. 轮询状态（同常规视频生成）
  const result = await pollVideoStatus(task_id);
  return result;
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "task_id": "new-task-uuid",
  "source_video_id": "original-video-uuid",
  "operation_id": "projects/.../operations/...",
  "status": "processing",
  "credit_cost": 40,
  "original_duration": 4,
  "new_duration": 11,
  "message": "视频延长任务已创建，预计新视频时长11秒"
}
```

### 错误响应

```json
// 400 - 源视频已达最大长度
{
  "error": "SOURCE_VIDEO_TOO_LONG",
  "message": "Source video is 148s, cannot extend further (max 148s)"
}

// 400 - 延长后将超过最大长度
{
  "error": "EXTENSION_EXCEEDS_LIMIT",
  "message": "Extension would result in 155s video, exceeding maximum 148s"
}

// 400 - 源视频非Veo生成
{
  "error": "INVALID_SOURCE_VIDEO",
  "message": "Source video must be generated by Veo API"
}

// 404 - 源视频不存在
{
  "error": "SOURCE_VIDEO_NOT_FOUND",
  "message": "Source video with ID xxx not found"
}

// 400 - 源视频未完成
{
  "error": "SOURCE_VIDEO_NOT_READY",
  "message": "Source video is still processing or failed"
}
```

### UI展示建议

**显示延长按钮的条件**：
```typescript
// 在视频卡片上显示"延长"按钮
function shouldShowExtendButton(video: VideoRecord) {
  return (
    video.status === 'completed' &&           // 生成成功
    video.resolution === '720p' &&            // 🔥 只支持720p（1080p隐藏此功能）
    video.duration_seconds + 7 <= 148 &&      // 延长后不超过148秒
    video.gemini_video_uri !== null           // 有Gemini URI
  );
}

// 💡 业务规则说明：
// - 当前API只支持720p视频延长，1080p视频不显示延长按钮
// - 后续API支持1080p延长后，只需移除 resolution === '720p' 条件即可
```

**延长链可视化**：
```typescript
// 在历史记录中显示延长链关系
interface VideoWithExtendChain {
  id: string;
  duration: number;
  source_video_id: string | null;  // 指向源视频
  extend_count: number;             // 第几次延长
}

// 示例：4秒 → 11秒 → 18秒 → ... → 144秒
// [原始视频] → [延长1次] → [延长2次] → ... → [延长20次]
```

### 延长链最佳实践

**渐进式延长策略**：
```typescript
// 规划延长链，确保内容连贯
const extendChain = [
  { duration: 4,  prompt: "日出时的山景，晨雾缭绕" },
  { duration: 11, prompt: "太阳逐渐升起，雾气开始消散" },
  { duration: 18, prompt: "阳光照亮山谷，鸟儿开始鸣叫" },
  { duration: 25, prompt: "完全的白昼，山谷充满生机" }
];

// ✅ 好的延长提示词：内容连贯、场景延续
// ❌ 避免：突然的场景切换、不相关的内容
```

---

## 💰 积分消费规则

### 计算公式

```
基础积分 = 时长(秒) × 10
实际消费 = 基础积分 × 分辨率系数

分辨率系数:
- 720p: 1.0x
- 1080p: 1.5x
```

### 价格表

**常规生成**：

| 时长 | 720p | 1080p |
|-----|------|-------|
| 4秒 | 40积分 | 60积分 |
| 6秒 | 60积分 | 90积分 |
| 8秒 | 80积分 | 120积分 |

**视频延长**：

| 操作 | 720p（固定） | 说明 |
|-----|-------------|------|
| 延长7秒 | 40积分 | 固定价格，不支持1080p |

💡 **延长链成本计算示例**：
- 4秒基础视频：40积分
- 延长到11秒：+40积分 = **80积分总计**
- 延长到18秒：+40积分 = **120积分总计**
- 延长到25秒：+40积分 = **160积分总计**
- ...
- 延长到144秒（20次）：**840积分总计** (40 + 40×20)

### 退款政策

- ✅ **失败自动退款**：任务失败时积分100%退还
- ✅ **超时退款**：生成超过10分钟自动标记失败并退款
- ✅ **下载失败退款**：视频下载失败时退款

---

## 📝 使用流程

### 完整示例（cURL）

```bash
# 1. 创建视频生成任务
TASK_ID=$(curl -X POST https://nanobanana.com/api/v1/video/generate \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at dawn with mist rolling over the peaks",
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "duration": 6
  }' | jq -r '.task_id')

echo "任务ID: $TASK_ID"

# 2. 轮询任务状态（每10秒检查一次）
while true; do
  STATUS=$(curl -H "x-api-key: YOUR_API_KEY" \
    https://nanobanana.com/api/v1/video/status/$TASK_ID | jq -r '.status')

  echo "当前状态: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo "✅ 视频生成完成！"
    curl -H "x-api-key: YOUR_API_KEY" \
      https://nanobanana.com/api/v1/video/status/$TASK_ID | jq '.video_url'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ 视频生成失败"
    curl -H "x-api-key: YOUR_API_KEY" \
      https://nanobanana.com/api/v1/video/status/$TASK_ID | jq '.error_message'
    break
  fi

  sleep 10
done
```

### JavaScript/TypeScript 示例

```typescript
async function generateVideo() {
  const API_KEY = 'your_api_key';
  const BASE_URL = 'https://nanobanana.com';

  // 1. 创建任务
  const createResponse = await fetch(`${BASE_URL}/api/v1/video/generate`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'A beautiful sunset over the ocean',
      aspect_ratio: '16:9',
      resolution: '720p',
      duration: 4,
    }),
  });

  const { task_id } = await createResponse.json();
  console.log('任务ID:', task_id);

  // 2. 轮询状态
  while (true) {
    await new Promise((r) => setTimeout(r, 10000)); // 等待10秒

    const statusResponse = await fetch(
      `${BASE_URL}/api/v1/video/status/${task_id}`,
      {
        headers: { 'x-api-key': API_KEY },
      }
    );

    const status = await statusResponse.json();
    console.log('状态:', status.status);

    if (status.status === 'completed') {
      console.log('✅ 视频URL:', status.video_url);
      break;
    } else if (status.status === 'failed') {
      console.error('❌ 失败:', status.error_message);
      break;
    }
  }
}
```

---

## ⚠️ 错误处理

### 常见错误码

| 错误码 | HTTP状态 | 说明 | 解决方案 |
|--------|---------|------|---------|
| `MISSING_API_KEY` | 401 | 缺少API Key | 在请求头添加 `x-api-key` |
| `INVALID_API_KEY` | 401 | API Key无效 | 检查API Key是否正确 |
| `INSUFFICIENT_CREDITS` | 402 | 积分不足 | 购买积分包或订阅 |
| `CONCURRENT_LIMIT_EXCEEDED` | 429 | 并发超限 | 等待现有任务完成 |
| `INVALID_TASK_ID` | 400 | 任务ID格式错误 | 使用有效的UUID |
| `TASK_NOT_FOUND` | 404 | 任务不存在 | 检查task_id是否正确 |
| `UNAUTHORIZED_ACCESS` | 403 | 无权访问 | 只能查询自己的任务 |
| `VEO_API_ERROR` | 503 | Google Veo API错误 | 已自动退款，稍后重试 |

---

## 🔧 环境配置

### 必需环境变量

```bash
# Google AI API Key
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Cron 任务密钥
CRON_SECRET=your_random_secret_key

# 应用URL（用于触发下载任务）
NEXT_PUBLIC_APP_URL=https://nanobanana.com
```

### Vercel 部署配置

确保 `vercel.json` 包含 Cron 任务配置：

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-video-status",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## 🧪 测试指南

### 运行集成测试

```bash
# 1. 配置测试 API Key
export TEST_API_KEY=your_test_api_key

# 2. 运行测试脚本
pnpm ts-node scripts/test-video-generation.ts
```

### 测试内容

- ✅ 创建视频生成任务
- ✅ 查询任务状态
- ✅ 参数验证（缺少必需字段）
- ✅ 非法参数拒绝（aspect_ratio, duration）
- ✅ 非法任务ID验证
- ✅ API Key验证

### 手动测试

```bash
# 创建任务
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat playing with a ball",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'

# 查询状态
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/api/v1/video/status/TASK_ID
```

---

## 📚 相关文档

- [Google Veo 3.1 API 文档](https://ai.google.dev/gemini-api/docs/veo)
- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)
- [Vercel Cron Jobs 文档](https://vercel.com/docs/cron-jobs)

---

## 🐛 故障排查

### 任务一直处于 processing 状态

**原因**：Cron 任务未运行或轮询失败

**解决方案**：
1. 检查 Vercel Cron 任务日志
2. 手动触发 Cron 任务测试：
   ```bash
   curl -X GET http://localhost:3000/api/cron/poll-video-status \
     -H "authorization: Bearer YOUR_CRON_SECRET"
   ```

### 视频下载失败

**原因**：Google 临时 URL 过期或网络问题

**解决方案**：
1. 检查 `temporary_video_url` 是否有效
2. 查看下载任务日志：`/api/cron/download-video`
3. 任务会自动标记为失败并退款

### 积分未退款

**原因**：退款逻辑未执行或重复退款验证失败

**解决方案**：
1. 检查 `credit_transactions` 表是否有 `video_refund` 记录
2. 查看 `refundFailedTask()` 方法日志
3. 手动触发退款（仅管理员）

---

**最后更新**: 2025-01-18
**版本**: 1.0.0
