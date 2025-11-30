# NSFW 内容扫描系统设计方案

## 🔥 老王的内容审核方案

**创建日期**: 2025-11-23
**作者**: 老王（暴躁技术流）
**目标**: 保护用户安全，符合法规要求，防止平台被滥用

---

## 📋 需求分析

### 业务目标

- ✅ **合规性**: 符合内容安全法规要求
- ✅ **用户保护**: 防止用户接触到不适内容
- ✅ **平台声誉**: 避免平台被滥用传播违规内容
- ✅ **自动化**: 减少人工审核成本

### 技术指标

- **准确率**: ≥95% (误判率 <5%)
- **响应时间**: <2秒（不影响用户体验）
- **覆盖范围**: 图像 + 视频
- **审核类别**: NSFW、暴力、仇恨言论、违禁物品

---

## 🎯 方案选型

### 方案对比

| 方案 | 优点 | 缺点 | 成本 | 推荐度 |
|-----|------|------|------|--------|
| **Google Cloud Vision API** | 准确率高、官方支持、易集成 | 需要付费、API调用 | $$$ | ⭐⭐⭐⭐⭐ |
| **Cloudflare Stream Moderation** | 视频专用、速度快 | 仅视频、需要Cloudflare | $$ | ⭐⭐⭐⭐ |
| **开源 NSFW.js** | 免费、无API限制、隐私保护 | 准确率较低、需要自建 | $ | ⭐⭐⭐ |
| **人工审核** | 最准确 | 成本极高、延迟大 | $$$$ | ⭐ |

### 推荐方案：Google Cloud Vision API

**选择理由**：
1. ✅ 准确率高（官方数据 >97%）
2. ✅ 集成简单（与现有 Google Veo 同一账号）
3. ✅ 支持多种检测类型（NSFW、暴力、医疗等）
4. ✅ 成本可控（每月前 1000 次免费）

**备选方案**：NSFW.js（用于降级或成本优化）

---

## 🛠️ 技术设计

### 1. 架构流程

```
用户上传/生成内容
    ↓
存储到 Supabase Storage
    ↓
触发 NSFW 扫描
    ↓
调用 Google Cloud Vision API
    ↓
分析结果 + 计算风险评分
    ↓
┌─────────────────┬─────────────────┐
│ 安全 (≤30%)     │ 可疑 (30-70%)   │ 违规 (>70%)
│ ✅ 自动通过     │ ⚠️ 人工审核    │ ❌ 自动拒绝
└─────────────────┴─────────────────┴─────────────────
    ↓               ↓                 ↓
正常展示         待审核队列        隐藏+通知用户
```

### 2. 数据库设计

**新增表：`content_moderation`**

```sql
CREATE TABLE content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
  content_id UUID NOT NULL, -- 指向 image_generation_history 或 video_generation_history
  content_url TEXT NOT NULL,

  -- 扫描结果
  scan_status TEXT NOT NULL CHECK (scan_status IN ('pending', 'scanned', 'failed')),
  scan_provider TEXT DEFAULT 'google_vision', -- 'google_vision' | 'nsfw_js' | 'manual'

  -- 风险评分（0-100）
  adult_score FLOAT DEFAULT 0,
  violence_score FLOAT DEFAULT 0,
  racy_score FLOAT DEFAULT 0,
  medical_score FLOAT DEFAULT 0,
  spoof_score FLOAT DEFAULT 0,
  overall_risk_score FLOAT DEFAULT 0,

  -- 审核决策
  moderation_decision TEXT NOT NULL CHECK (moderation_decision IN ('approved', 'pending', 'rejected')),
  decision_reason TEXT,

  -- 人工审核（可选）
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_reviewer_id UUID REFERENCES auth.users(id),
  manual_review_at TIMESTAMPTZ,
  manual_review_notes TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_content_moderation_content_id ON content_moderation(content_id);
CREATE INDEX idx_content_moderation_decision ON content_moderation(moderation_decision);
CREATE INDEX idx_content_moderation_scan_status ON content_moderation(scan_status);
CREATE INDEX idx_content_moderation_manual_review ON content_moderation(manual_review_required) WHERE manual_review_required = TRUE;
```

### 3. API 设计

#### `POST /api/moderation/scan`

扫描单个内容（图像或视频）

**请求体**：
```json
{
  "content_type": "image" | "video",
  "content_id": "uuid",
  "content_url": "https://..."
}
```

**响应**：
```json
{
  "success": true,
  "moderation_id": "uuid",
  "decision": "approved" | "pending" | "rejected",
  "risk_score": 25.5,
  "details": {
    "adult": 10,
    "violence": 5,
    "racy": 40,
    "medical": 0,
    "spoof": 0
  },
  "manual_review_required": false
}
```

#### `GET /api/moderation/status/:content_id`

查询内容审核状态

**响应**：
```json
{
  "success": true,
  "status": "approved",
  "scanned_at": "2025-11-23T...",
  "risk_score": 15.3
}
```

#### `GET /api/moderation/pending` (管理员)

获取待人工审核列表

**响应**：
```json
{
  "success": true,
  "pending_count": 5,
  "items": [
    {
      "moderation_id": "uuid",
      "content_url": "https://...",
      "risk_score": 65.5,
      "created_at": "..."
    }
  ]
}
```

### 4. Google Cloud Vision API 集成

**环境变量**：
```bash
GOOGLE_CLOUD_VISION_API_KEY=your_api_key
```

**核心代码**：
```typescript
import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
})

async function scanImage(imageUrl: string) {
  const [result] = await client.safeSearchDetection(imageUrl)
  const detections = result.safeSearchAnnotation

  // 计算综合风险评分（0-100）
  const riskScore = calculateRiskScore({
    adult: detections.adult,
    violence: detections.violence,
    racy: detections.racy,
    medical: detections.medical,
    spoof: detections.spoof,
  })

  return {
    adult: getLikelihoodScore(detections.adult),
    violence: getLikelihoodScore(detections.violence),
    racy: getLikelihoodScore(detections.racy),
    medical: getLikelihoodScore(detections.medical),
    spoof: getLikelihoodScore(detections.spoof),
    riskScore,
  }
}

// Google Vision API 返回值映射
function getLikelihoodScore(likelihood: string): number {
  const scoreMap = {
    'VERY_UNLIKELY': 0,
    'UNLIKELY': 15,
    'POSSIBLE': 50,
    'LIKELY': 75,
    'VERY_LIKELY': 95,
  }
  return scoreMap[likelihood] || 0
}
```

---

## 📊 审核策略

### 风险评分计算

```typescript
function calculateRiskScore(scores: {
  adult: number
  violence: number
  racy: number
  medical: number
  spoof: number
}): number {
  // 加权计算（成人内容权重最高）
  const weights = {
    adult: 1.5,
    violence: 1.2,
    racy: 1.0,
    medical: 0.3,
    spoof: 0.5,
  }

  const weightedSum =
    scores.adult * weights.adult +
    scores.violence * weights.violence +
    scores.racy * weights.racy +
    scores.medical * weights.medical +
    scores.spoof * weights.spoof

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  return Math.round((weightedSum / totalWeight) * 100) / 100
}
```

### 决策规则

| 综合评分 | 决策 | 操作 |
|---------|------|------|
| **0-30** | ✅ 自动通过 | 正常展示 |
| **30-70** | ⚠️ 待审核 | 隐藏 + 人工审核队列 |
| **70-100** | ❌ 自动拒绝 | 隐藏 + 通知用户 |

**特殊规则**：
- Adult Score > 80 → 直接拒绝（无论综合评分）
- Violence Score > 85 → 直接拒绝
- 所有分数 <20 → 直接通过

---

## 🚀 实施计划

### Phase 1: 基础集成（1-2天）

- [x] 创建 `content_moderation` 表
- [x] 实现 Google Vision API 调用
- [x] 创建 `/api/moderation/scan` 接口
- [x] 实现自动审核决策逻辑

### Phase 2: 集成到生成流程（1天）

- [x] 视频生成完成后自动扫描
- [x] 图像生成完成后自动扫描
- [x] 更新 `video_generation_history` 表添加 `moderation_status` 字段

### Phase 3: 管理后台（可选）

- [ ] 待审核列表页面
- [ ] 人工审核操作界面
- [ ] 审核统计报表

---

## ✅ 测试计划

### 单元测试

- [x] 风险评分计算逻辑
- [x] 决策规则验证
- [x] 边界情况测试

### 集成测试

- [x] Google Vision API 调用
- [x] 数据库写入/查询
- [x] 完整扫描流程

### E2E 测试

- [ ] 上传安全图像 → 自动通过
- [ ] 上传违规图像 → 自动拒绝
- [ ] 上传可疑图像 → 人工审核

---

## 💰 成本估算

### Google Cloud Vision API 定价

- **免费额度**: 每月前 1000 次
- **付费价格**: $1.50 / 1000 次

### 预估成本（月）

| 用户规模 | 月生成量 | API 调用 | 成本 |
|---------|---------|----------|------|
| 100 用户 | 5,000 | 5,000 | $6/月 |
| 1,000 用户 | 50,000 | 50,000 | $74/月 |
| 10,000 用户 | 500,000 | 500,000 | $750/月 |

**成本优化方案**：
- 缓存扫描结果（相同内容不重复扫描）
- 用户举报触发扫描（而非全量扫描）
- 高风险用户增加扫描频率

---

## 🔄 未来改进

### 短期计划（1-2个月）

- [ ] 实现缓存机制（相同图像hash）
- [ ] 添加用户举报功能
- [ ] 实现人工审核界面

### 长期计划（3-6个月）

- [ ] 训练自定义 NSFW 模型（降低API成本）
- [ ] 多语言文本审核（检测有害文本）
- [ ] 区域化审核策略（不同国家标准不同）
- [ ] 审核质量监控和改进

---

**文档维护者**: 老王
**最后更新**: 2025-11-23
**版本**: v1.0.0
