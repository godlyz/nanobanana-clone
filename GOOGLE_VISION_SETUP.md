# Google Cloud Vision API 配置指南

## 🔥 老王的 NSFW 内容扫描配置教程

**用途**: 使用 Google Cloud Vision API 自动检测图片和视频中的不适宜内容（NSFW、暴力等）

**成本**:
- 每月前 1000 次调用**免费**
- 之后每 1000 次调用 $1.50
- 详见: https://cloud.google.com/vision/pricing

---

## 📋 前置要求

1. ✅ Google Cloud 账号（有的话用Gmail直接登录）
2. ✅ 项目已安装 `@google-cloud/vision` SDK（已完成）
3. ✅ 数据库表 `content_moderation` 已创建（已完成）

---

## 🚀 快速开始（3分钟配置）

### 方法一：使用 API Key（推荐 - 简单快速）

#### Step 1: 启用 Vision API

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择或创建一个项目
3. 进入 [Vision API 页面](https://console.cloud.google.com/apis/library/vision.googleapis.com)
4. 点击 **"启用"** 按钮

#### Step 2: 创建 API Key

1. 进入 [API Credentials 页面](https://console.cloud.google.com/apis/credentials)
2. 点击 **"+ 创建凭据"** → 选择 **"API 密钥"**
3. 复制生成的 API Key（格式类似：`AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`）
4. **（重要）** 点击"限制密钥"，设置以下限制：
   - **应用限制**: HTTP 引用站点（添加你的域名）
   - **API 限制**: 仅选择 "Cloud Vision API"
   - 点击 **"保存"**

#### Step 3: 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
GOOGLE_CLOUD_VISION_API_KEY=你刚才复制的API_Key
```

#### Step 4: 验证配置

重启开发服务器：

```bash
pnpm dev
```

测试扫描功能（可选）：

```bash
# 创建测试脚本
node -e "
const { getModerationService } = require('./lib/moderation-service.ts');
const service = getModerationService();

service.scanContent(
  'https://example.com/test-image.jpg',
  'image'
).then(result => {
  console.log('✅ 扫描成功:', result);
}).catch(err => {
  console.error('❌ 扫描失败:', err);
});
"
```

---

### 方法二：使用服务账号（高级 - 生产环境推荐）

#### Step 1: 创建服务账号

1. 进入 [服务账号页面](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. 点击 **"+ 创建服务账号"**
3. 填写信息：
   - **服务账号名称**: `vision-api-service`
   - **描述**: `用于 NSFW 内容扫描`
4. 点击 **"创建并继续"**
5. **角色**：选择 `Cloud Vision AI Service Agent`
6. 点击 **"完成"**

#### Step 2: 生成密钥

1. 在服务账号列表中，找到刚创建的账号
2. 点击账号名称 → 切换到 **"密钥"** 标签页
3. 点击 **"添加密钥"** → **"创建新密钥"**
4. 选择 **JSON** 格式
5. 下载 JSON 密钥文件（例如：`vision-api-key.json`）

#### Step 3: 配置环境变量

在 `.env.local` 中添加：

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/vision-api-key.json
```

或者将 JSON 内容转换为 base64：

```bash
# macOS/Linux
cat vision-api-key.json | base64 > vision-api-key.base64.txt

# 然后在 .env.local 中
GOOGLE_CLOUD_VISION_CREDENTIALS_BASE64=base64编码后的内容
```

---

## 🧪 测试扫描功能

### 测试图片示例

在浏览器中访问：

```
http://localhost:3000/api/test-moderation?url=https://example.com/image.jpg
```

或创建测试 API 路由 `app/api/test-moderation/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getModerationService } from '@/lib/moderation-service'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const service = getModerationService()
  const result = await service.scanContent(url, 'image')

  return NextResponse.json({
    success: true,
    result,
    decision: service.makeDecision(result),
  })
}
```

### 测试结果示例

```json
{
  "success": true,
  "result": {
    "adultScore": 15,
    "violenceScore": 0,
    "racyScore": 50,
    "medicalScore": 0,
    "spoofScore": 0,
    "overallRiskScore": 24.21
  },
  "decision": {
    "decision": "approved",
    "manualReviewRequired": false,
    "reason": "Low risk (24.21)"
  }
}
```

---

## 🔧 集成到现有流程

### 1. 图片生成后自动扫描

修改 `app/api/generate/route.ts`（或视频生成路由）：

```typescript
import { getModerationService } from '@/lib/moderation-service'

// 生成图片/视频后
const imageUrl = result.imageUrl
const userId = user.id
const imageId = result.id

// 调用审核服务
const moderationService = getModerationService()
const moderationResult = await moderationService.moderateContent({
  contentType: 'image',
  contentId: imageId,
  contentUrl: imageUrl,
  userId: userId,
})

console.log('审核结果:', moderationResult.decision)

// 根据结果决定是否展示
if (moderationResult.decision === 'rejected') {
  // 隐藏内容，通知用户
  await supabase
    .from('generation_history')
    .update({ privacy: 'private', moderation_status: 'rejected' })
    .eq('id', imageId)
}
```

### 2. Showcase 提交时扫描

在 `app/api/showcase/submit/route.ts` 中：

```typescript
// 提交到 Showcase 前先扫描
const moderationService = getModerationService()
const moderationResult = await moderationService.moderateContent({
  contentType: 'image',
  contentId: submissionId,
  contentUrl: imageUrl,
  userId: user.id,
})

// 仅允许安全内容进入 Showcase
if (moderationResult.decision !== 'approved') {
  return NextResponse.json({
    error: '内容未通过安全审核，无法提交到 Showcase'
  }, { status: 403 })
}
```

---

## 📊 审核决策规则

### 风险评分算法

```typescript
综合评分 = (
  adult × 1.5 +      // 成人内容权重最高
  violence × 1.2 +   // 暴力次之
  racy × 1.0 +       // 性感内容
  medical × 0.3 +    // 医疗内容
  spoof × 0.5        // 虚假内容
) / 4.5
```

### 决策阈值

| 综合评分 | 决策 | 操作 |
|---------|------|------|
| **0-30** | ✅ 自动通过 | 正常展示 |
| **30-70** | ⚠️ 待审核 | 隐藏 + 人工审核队列 |
| **70-100** | ❌ 自动拒绝 | 隐藏 + 通知用户 |

### 特殊规则

- **Adult Score > 80** → 直接拒绝（无论综合评分）
- **Violence Score > 85** → 直接拒绝
- **所有分数 < 20** → 直接通过

---

## 🛡️ 安全最佳实践

### 1. API Key 保护

✅ **正确做法**:
- API Key 仅存储在 `.env.local`（不提交到 Git）
- 设置 API Key 限制（HTTP 引用站点、仅 Vision API）
- 定期轮换 API Key

❌ **错误做法**:
- 硬编码在代码中
- 提交到 Git 仓库
- 在客户端使用（暴露在浏览器中）

### 2. 成本控制

- 使用免费额度（每月 1000 次）
- 仅对用户上传/生成的内容扫描（不扫描所有图片）
- 缓存扫描结果（相同图片不重复扫描）

### 3. 降级策略

```typescript
// 如果 Google Vision API 失败，返回安全分数（避免误杀）
catch (error) {
  console.error('Vision API 失败:', error)
  return {
    adultScore: 0,
    violenceScore: 0,
    ...
    overallRiskScore: 0,  // 默认安全
  }
}
```

---

## 📈 监控和优化

### 1. 查看 API 使用量

访问 [Google Cloud Console - API 使用情况](https://console.cloud.google.com/apis/dashboard)

### 2. 审核队列管理

创建管理后台查看待审核内容：

```sql
SELECT * FROM content_moderation
WHERE moderation_decision = 'pending'
ORDER BY created_at DESC
LIMIT 100;
```

### 3. 误判率分析

定期检查被拒绝的内容，优化评分阈值。

---

## 🚨 常见问题

### Q1: API Key 无效？

**症状**: `403 Forbidden` 或 `API key not valid`

**解决方案**:
1. 检查 API Key 是否正确复制
2. 确认 Vision API 已启用
3. 检查 API Key 限制设置

### Q2: 扫描失败返回 0 分？

**症状**: 所有分数都是 0

**原因**: 这是**降级策略**，API 调用失败时返回安全分数

**检查**:
- 查看控制台错误日志
- 确认环境变量配置正确
- 测试网络连接

### Q3: 免费额度用完了怎么办？

**方案**:
1. 升级到付费账号（$1.5/1000 次）
2. 切换到备选方案（NSFW.js）
3. 人工审核

---

## 📚 相关文档

- [Google Cloud Vision API 官方文档](https://cloud.google.com/vision/docs)
- [SafeSearch 检测指南](https://cloud.google.com/vision/docs/detecting-safe-search)
- [定价详情](https://cloud.google.com/vision/pricing)
- [NSFW_SCANNING.md](./NSFW_SCANNING.md) - 完整设计方案

---

**配置完成时间**: 2025-11-23
**文档维护者**: 老王（暴躁技术流）
**当前状态**: ✅ 代码实现完成，待配置 API Key
