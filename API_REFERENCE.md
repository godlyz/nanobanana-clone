# Nano Banana API 参考文档

## 概览

Nano Banana API 提供强大的 AI 图像编辑功能，支持自然语言描述的图像处理、背景移除、角色一致性保持等功能。

### 基础信息

- **Base URL**: `https://api.nanobanana.ai/v1`
- **认证方式**: Bearer Token (API Key)
- **数据格式**: JSON
- **支持格式**: JPEG, PNG, WebP

### 获取 API 密钥

1. 访问 [个人信息页面](/profile)
2. 创建新的 API 密钥
3. 复制密钥用于 API 调用

---

## 认证

### Bearer Token 认证

所有 API 请求都需要在请求头中包含 API 密钥：

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 示例

```bash
curl -H "Authorization: Bearer nk_live_xxxxxxxxxxxx" \
     -H "Content-Type: application/json" \
     https://api.nanobanana.ai/v1/image-edit
```

---

## 核心端点

### 1. 图像编辑

编辑现有图像，支持自然语言描述的各种编辑操作。

**端点**: `POST /v1/image-edit`

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| prompt | string | 是 | 自然语言描述的编辑指令 |
| image_url | string | 是 | 要编辑的图像URL |
| strength | float | 否 | 编辑强度 (0.1-1.0, 默认0.8) |
| preserve_scene | boolean | 否 | 是否保留场景 (默认false) |
| output_format | string | 否 | 输出格式 (jpeg/png, 默认jpeg) |

#### 请求示例

```json
{
  "prompt": "将人物背景改为海滩风景，保持人物不变",
  "image_url": "https://example.com/portrait.jpg",
  "strength": 0.8,
  "preserve_scene": true
}
```

#### 响应示例

```json
{
  "success": true,
  "task_id": "task_123456789",
  "image_url": "https://cdn.nanobanana.ai/results/edited_image.jpg",
  "description": "已成功将背景替换为海滩风景，保持人物主体不变",
  "processing_time": 2.3,
  "credits_used": 5
}
```

#### 使用示例

```bash
curl -X POST https://api.nanobanana.ai/v1/image-edit \
  -H "Authorization: Bearer nk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "将天空改成晚霞效果",
    "image_url": "https://example.com/landscape.jpg",
    "strength": 0.7
  }'
```

### 2. 背景移除

智能移除图像背景，返回透明背景的图像。

**端点**: `POST /v1/remove-background`

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| image_url | string | 是 | 要处理图像的URL |
| return_mask | boolean | 否 | 是否返回蒙版 (默认false) |
| edge_smooth | boolean | 否 | 边缘平滑 (默认true) |

#### 请求示例

```json
{
  "image_url": "https://example.com/person.jpg",
  "return_mask": false,
  "edge_smooth": true
}
```

#### 响应示例

```json
{
  "success": true,
  "task_id": "task_123456790",
  "image_url": "https://cdn.nanobanana.ai/results/no_bg.png",
  "mask_url": "https://cdn.nanobanana.ai/results/mask.png",
  "description": "背景移除完成，主体轮廓清晰",
  "processing_time": 1.8,
  "credits_used": 3
}
```

### 3. 文本生成图像

根据文本描述生成全新的图像。

**端点**: `POST /v1/text-to-image`

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| prompt | string | 是 | 图像生成描述 |
| width | integer | 否 | 图像宽度 (默认512) |
| height | integer | 否 | 图像高度 (默认512) |
| style | string | 否 | 风格 (realistic, anime, artistic, 默认realistic) |
| quality | string | 否 | 质量 (standard, high, 默认standard) |

#### 请求示例

```json
{
  "prompt": "一只可爱的小熊猫在竹林里玩耍，阳光明媚，高清摄影风格",
  "width": 768,
  "height": 512,
  "style": "realistic",
  "quality": "high"
}
```

#### 响应示例

```json
{
  "success": true,
  "task_id": "task_123456791",
  "image_url": "https://cdn.nanobanana.ai/results/generated_image.jpg",
  "description": "生成了一张熊猫在竹林的图像",
  "processing_time": 8.5,
  "credits_used": 8
}
```

### 4. 任务状态查询

查询异步处理任务的状态和结果。

**端点**: `GET /v1/task/{task_id}`

#### 响应示例

```json
{
  "task_id": "task_123456789",
  "status": "completed", // pending, processing, completed, failed
  "progress": 100,
  "result": {
    "image_url": "https://cdn.nanobanana.ai/results/final.jpg",
    "description": "处理完成"
  },
  "error": null,
  "created_at": "2024-01-01T10:00:00Z",
  "completed_at": "2024-01-01T10:02:30Z"
}
```

### 5. 账户信息

获取当前账户的状态和积分信息。

**端点**: `GET /v1/account`

#### 响应示例

```json
{
  "user_id": "user_123456",
  "email": "user@example.com",
  "subscription": {
    "plan": "pro",
    "status": "active",
    "expires_at": "2024-02-01T00:00:00Z"
  },
  "credits": {
    "balance": 850,
    "used_this_month": 150,
    "last_renewed": "2024-01-01T00:00:00Z"
  },
  "usage_limits": {
    "max_images_per_request": 5,
    "max_file_size_mb": 10,
    "allowed_formats": ["jpeg", "png", "webp"]
  }
}
```

---

## 高级功能

### 1. 批量处理

同时处理多张图像，保持角色或场景一致性。

**端点**: `POST /v1/batch-edit`

#### 请求示例

```json
{
  "prompt": "保持人物面部特征，更换不同的服装背景",
  "image_urls": [
    "https://example.com/person1.jpg",
    "https://example.com/person2.jpg",
    "https://example.com/person3.jpg"
  ],
  "preserve_character": true,
  "style_consistency": true
}
```

#### 响应示例

```json
{
  "success": true,
  "batch_id": "batch_123456",
  "tasks": [
    {
      "task_id": "task_123456792",
      "status": "processing"
    },
    {
      "task_id": "task_123456793",
      "status": "processing"
    },
    {
      "task_id": "task_123456794",
      "status": "processing"
    }
  ],
  "total_credits": 15
}
```

### 2. 风格迁移

将一张图像的风格应用到另一张图像。

**端点**: `POST /v1/style-transfer`

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| content_image_url | string | 是 | 内容图像URL |
| style_image_url | string | 是 | 风格参考图像URL |
| strength | float | 否 | 风格强度 (0.1-1.0, 默认0.8) |

#### 请求示例

```json
{
  "content_image_url": "https://example.com/portrait.jpg",
  "style_image_url": "https://example.com/van_gogh.jpg",
  "strength": 0.7
}
```

### 3. 图像增强

提升图像质量，包括分辨率提升、降噪、色彩优化等。

**端点**: `POST /v1/enhance`

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| image_url | string | 是 | 要增强的图像URL |
| enhancement_type | string | 否 | 增强类型 (upscale, denoise, color, 默认upscale) |
| upscale_factor | integer | 否 | 放大倍数 (2, 4, 默认2) |

#### 请求示例

```json
{
  "image_url": "https://example.com/low_res.jpg",
  "enhancement_type": "upscale",
  "upscale_factor": 4
}
```

---

## 错误处理

### 错误响应格式

所有 API 错误都遵循统一的响应格式：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "请求参数无效",
    "details": "prompt 字段不能为空"
  },
  "request_id": "req_123456789"
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API密钥无效或已过期 |
| `INSUFFICIENT_CREDITS` | 402 | 积分不足 |
| `INVALID_REQUEST` | 400 | 请求参数错误 |
| `FILE_TOO_LARGE` | 413 | 文件大小超过限制 |
| `UNSUPPORTED_FORMAT` | 415 | 不支持的文件格式 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `PROCESSING_ERROR` | 500 | 图像处理失败 |
| `TEMPORARY_UNAVAILABLE` | 503 | 服务暂时不可用 |

### 错误处理示例

```javascript
try {
  const response = await fetch('https://api.nanobanana.ai/v1/image-edit', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer nk_live_xxxxxxxxxxxx',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: '测试编辑',
      image_url: 'https://example.com/test.jpg'
    })
  })

  const result = await response.json()

  if (!result.success) {
    console.error('API Error:', result.error.message)

    // 根据错误类型进行处理
    switch (result.error.code) {
      case 'INSUFFICIENT_CREDITS':
        // 跳转到充值页面
        window.location.href = '/pricing'
        break
      case 'INVALID_API_KEY':
        // 跳转到登录页面
        window.location.href = '/login'
        break
      default:
        // 显示通用错误信息
        alert(`处理失败: ${result.error.message}`)
    }
  } else {
    // 处理成功结果
    console.log('生成的图像:', result.image_url)
  }
} catch (error) {
  console.error('网络错误:', error)
}
```

---

## 限制和配额

### 请求限制

| 项目 | 限制 |
|------|------|
| 单文件大小 | 10MB |
| 并发请求数 | 5个/分钟 |
| 每日请求次数 | 根据订阅计划 |
| 批量处理数量 | 最多20张图像 |

### 积分消耗

| 功能 | 积分消耗 |
|------|----------|
| 图像编辑 | 5积分 |
| 背景移除 | 3积分 |
| 文本生成图像 | 8积分 |
| 图像增强 | 4积分 |
| 风格迁移 | 6积分 |
| 批量处理 | 每张图像5积分 |

### 订阅计划配额

| 计划 | 月度积分 | 并发请求 | 文件大小限制 |
|------|----------|----------|--------------|
| Basic | 500 | 3个/分钟 | 5MB |
| Pro | 2000 | 5个/分钟 | 10MB |
| Max | 无限 | 10个/分钟 | 20MB |

---

## SDK 和示例

### JavaScript/TypeScript SDK

```bash
npm install nanobanana-js
```

```typescript
import { NanoBananaAPI } from 'nanobanana-js'

const client = new NanoBananaAPI({
  apiKey: 'nk_live_xxxxxxxxxxxx',
  baseURL: 'https://api.nanobanana.ai/v1'
})

// 图像编辑
const editResult = await client.editImage({
  prompt: '将背景改为海滩',
  imageUrl: 'https://example.com/photo.jpg'
})

// 背景移除
const removeBgResult = await client.removeBackground({
  imageUrl: 'https://example.com/portrait.jpg'
})

// 任务状态查询
const taskStatus = await client.getTaskStatus('task_123456789')
```

### Python SDK

```bash
pip install nanobanana-python
```

```python
from nanobanana import NanoBananaClient

client = NanoBananaClient(
    api_key='nk_live_xxxxxxxxxxxx',
    base_url='https://api.nanobanana.ai/v1'
)

# 图像编辑
result = client.edit_image(
    prompt='将背景改为海滩',
    image_url='https://example.com/photo.jpg'
)

print(f"编辑结果: {result['image_url']}")
```

### cURL 示例

```bash
# 图像编辑
curl -X POST https://api.nanobanana.ai/v1/image-edit \
  -H "Authorization: Bearer nk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "将天空改成晚霞效果",
    "image_url": "https://example.com/landscape.jpg",
    "strength": 0.7
  }'

# 背景移除
curl -X POST https://api.nanobanana.ai/v1/remove-background \
  -H "Authorization: Bearer nk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/person.jpg"
  }'

# 账户信息
curl -X GET https://api.nanobanana.ai/v1/account \
  -H "Authorization: Bearer nk_live_xxxxxxxxxxxx"
```

---

## 更新日志

### v1.2.0 (2024-01-15)
- ✨ 新增批量处理功能
- ✨ 新增风格迁移API
- 🐛 修复背景移除边缘处理问题
- 📈 提升图像处理速度 20%

### v1.1.0 (2024-01-01)
- ✨ 新增文本生成图像功能
- ✨ 新增图像增强功能
- 🔒 增强API安全性
- 📚 完善错误处理

### v1.0.0 (2023-12-01)
- 🎉 首次发布
- ✨ 图像编辑和背景移除功能
- ✨ 账户管理和积分系统
- 📖 完整的API文档

---

## 支持与反馈

- **技术支持**: support@nanobanana.ai
- **API文档**: https://docs.nanobanana.ai
- **状态页面**: https://status.nanobanana.ai
- **开发者社区**: https://community.nanobanana.ai

---

*API版本: v1.2.0*
*最后更新: 2024年1月15日*