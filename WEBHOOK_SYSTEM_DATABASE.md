# Webhook System Database Documentation

**艹！这是 Nano Banana 项目的 Webhook 系统数据库完整文档！**

---

## 📋 目录

1. [系统概述](#系统概述)
2. [数据库架构](#数据库架构)
3. [表结构详解](#表结构详解)
4. [RPC 函数](#rpc-函数)
5. [使用示例](#使用示例)
6. [安全机制](#安全机制)
7. [性能优化](#性能优化)

---

## 系统概述

Webhook 系统允许用户注册 HTTP 端点，并在特定事件发生时接收实时通知。

**核心功能：**
- ✅ Webhook URL 注册和管理
- ✅ 事件订阅（订阅特定的 GraphQL 事件）
- ✅ HMAC 签名验证（sha256/sha512）
- ✅ 智能重试机制（可配置最大重试次数和延迟）
- ✅ 完整的调用历史和日志
- ✅ 统计分析（成功率、响应时间、按日期/事件类型统计）
- ✅ URL 验证机制

---

## 数据库架构

### ER 图

```
┌─────────────────┐         ┌──────────────────────┐
│   auth.users    │         │   webhook_events     │
└────────┬────────┘         └──────────┬───────────┘
         │                              │
         │ 1                            │ *
         │                              │
         ▼ *                            ▼ *
  ┌─────────────┐           ┌───────────────────────────┐
  │   webhooks  │◄──────────┤ webhook_event_subscriptions│
  └──────┬──────┘     1   * └───────────────────────────┘
         │
         │ 1
         │
         ▼ *
  ┌──────────────────┐
  │ webhook_deliveries│
  └──────────────────┘
```

### 表关系说明

1. **webhooks** - 主表，存储 webhook 注册信息
   - 关联：`auth.users` (user_id)
   - 子表：`webhook_event_subscriptions`, `webhook_deliveries`

2. **webhook_events** - 事件类型定义表
   - 关联：`webhook_event_subscriptions` (event_type)

3. **webhook_event_subscriptions** - 事件订阅关系表
   - 关联：`webhooks` (webhook_id), `webhook_events` (event_type)

4. **webhook_deliveries** - 调用记录表
   - 关联：`webhooks` (webhook_id)

---

## 表结构详解

### 1. `webhooks` - Webhook 注册表

**主要字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户 ID（外键 auth.users） |
| `name` | VARCHAR(255) | Webhook 名称 |
| `url` | TEXT | Webhook URL（必须是 http/https） |
| `description` | TEXT | 描述 |
| `secret` | VARCHAR(255) | HMAC 签名密钥 |
| `signature_algorithm` | VARCHAR(50) | 签名算法（sha256/sha512） |
| `is_active` | BOOLEAN | 是否启用 |
| `is_verified` | BOOLEAN | URL 是否已验证 |
| `verification_token` | VARCHAR(255) | URL 验证 token |
| `verified_at` | TIMESTAMPTZ | 验证时间 |
| `retry_enabled` | BOOLEAN | 是否启用重试 |
| `max_retries` | INTEGER | 最大重试次数（0-10） |
| `retry_delay_seconds` | INTEGER | 重试延迟（秒，1-3600） |
| `timeout_seconds` | INTEGER | 超时时间（秒，1-300） |
| `total_deliveries` | INTEGER | 总调用次数 |
| `successful_deliveries` | INTEGER | 成功次数 |
| `failed_deliveries` | INTEGER | 失败次数 |
| `last_delivery_at` | TIMESTAMPTZ | 最后调用时间 |
| `last_success_at` | TIMESTAMPTZ | 最后成功时间 |
| `last_failure_at` | TIMESTAMPTZ | 最后失败时间 |
| `metadata` | JSONB | 元数据 |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |

**约束：**
- `valid_url`: URL 必须以 http:// 或 https:// 开头
- `valid_name`: 名称长度 1-255
- `max_retries`: 0-10
- `retry_delay_seconds`: 1-3600
- `timeout_seconds`: 1-300

**索引：**
- `idx_webhooks_user_id` - 用户查询
- `idx_webhooks_is_active` - 活跃状态过滤
- `idx_webhooks_created_at` - 按创建时间排序

**RLS 策略：**
- ✅ 用户只能查看、创建、更新、删除自己的 webhooks

---

### 2. `webhook_events` - 事件类型表

**主要字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `event_type` | VARCHAR(100) | 事件类型（唯一） |
| `category` | VARCHAR(50) | 事件分类（video/credit/subscription） |
| `description` | TEXT | 描述 |
| `is_enabled` | BOOLEAN | 是否启用 |
| `payload_schema` | JSONB | Payload JSON Schema |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |

**预设事件类型：**

| 事件类型 | 分类 | 说明 |
|----------|------|------|
| `video.generated` | video | 视频生成完成 |
| `video.failed` | video | 视频生成失败 |
| `credit.added` | credit | 积分添加 |
| `credit.consumed` | credit | 积分消耗 |
| `subscription.created` | subscription | 订阅创建 |
| `subscription.renewed` | subscription | 订阅续费 |
| `subscription.cancelled` | subscription | 订阅取消 |

**索引：**
- `idx_webhook_events_category` - 按分类查询
- `idx_webhook_events_is_enabled` - 启用状态过滤

**RLS 策略：**
- ✅ 所有认证用户可查看事件类型

---

### 3. `webhook_event_subscriptions` - 事件订阅表

**主要字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `webhook_id` | UUID | Webhook ID（外键） |
| `event_type` | VARCHAR(100) | 事件类型（外键） |
| `is_active` | BOOLEAN | 是否启用 |
| `filters` | JSONB | 事件过滤器（可选） |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |

**唯一约束：**
- `(webhook_id, event_type)` - 每个 webhook 只能订阅同一事件一次

**索引：**
- `idx_webhook_event_subs_webhook_id` - Webhook 查询
- `idx_webhook_event_subs_event_type` - 事件类型查询
- `idx_webhook_event_subs_is_active` - 启用状态过滤

**RLS 策略：**
- ✅ 用户只能查看和管理自己 webhook 的订阅

---

### 4. `webhook_deliveries` - 调用记录表

**主要字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `webhook_id` | UUID | Webhook ID（外键） |
| `event_type` | VARCHAR(100) | 事件类型 |
| `request_url` | TEXT | 请求 URL |
| `request_method` | VARCHAR(10) | 请求方法（默认 POST） |
| `request_headers` | JSONB | 请求头 |
| `request_payload` | JSONB | 请求体 |
| `request_signature` | VARCHAR(255) | HMAC 签名 |
| `response_status` | INTEGER | HTTP 状态码 |
| `response_headers` | JSONB | 响应头 |
| `response_body` | TEXT | 响应体 |
| `response_time_ms` | INTEGER | 响应时间（毫秒） |
| `status` | VARCHAR(20) | 状态（pending/success/failed/retrying） |
| `attempt_number` | INTEGER | 当前尝试次数 |
| `max_attempts` | INTEGER | 最大尝试次数 |
| `next_retry_at` | TIMESTAMPTZ | 下次重试时间 |
| `error_message` | TEXT | 错误信息 |
| `error_code` | VARCHAR(50) | 错误代码 |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `delivered_at` | TIMESTAMPTZ | 成功投递时间 |
| `failed_at` | TIMESTAMPTZ | 失败时间 |
| `metadata` | JSONB | 元数据 |

**状态说明：**
- `pending` - 等待发送
- `success` - 发送成功
- `failed` - 发送失败（达到最大重试次数）
- `retrying` - 重试中

**索引：**
- `idx_webhook_deliveries_webhook_id` - Webhook 查询
- `idx_webhook_deliveries_event_type` - 事件类型查询
- `idx_webhook_deliveries_status` - 状态过滤
- `idx_webhook_deliveries_created_at` - 按时间排序
- `idx_webhook_deliveries_next_retry` - 重试队列（WHERE status = 'retrying'）

**RLS 策略：**
- ✅ 用户只能查看自己 webhook 的调用记录

---

## RPC 函数

### 1. `create_webhook()` - 创建 Webhook

**功能：** 创建新 webhook 并自动生成 secret

**参数：**
```sql
create_webhook(
  p_name VARCHAR(255),              -- Webhook 名称
  p_url TEXT,                       -- Webhook URL
  p_description TEXT DEFAULT NULL,  -- 描述（可选）
  p_event_types TEXT[] DEFAULT '{}',-- 订阅的事件类型数组（可选）
  p_retry_enabled BOOLEAN DEFAULT true,    -- 是否启用重试
  p_max_retries INTEGER DEFAULT 3,         -- 最大重试次数
  p_timeout_seconds INTEGER DEFAULT 30     -- 超时时间
)
```

**返回：**
```sql
TABLE(
  webhook_id UUID,               -- Webhook ID
  webhook_secret VARCHAR(255),   -- 自动生成的 secret
  subscribed_events JSONB        -- 订阅的事件列表
)
```

**示例：**
```sql
SELECT * FROM create_webhook(
  p_name := 'My Production Webhook',
  p_url := 'https://api.example.com/webhooks',
  p_description := 'Production webhook for video events',
  p_event_types := ARRAY['video.generated', 'video.failed']
);
```

---

### 2. `subscribe_webhook_events()` - 订阅事件

**功能：** 为现有 webhook 订阅事件

**参数：**
```sql
subscribe_webhook_events(
  p_webhook_id UUID,      -- Webhook ID
  p_event_types TEXT[]    -- 事件类型数组
)
```

**返回：**
```sql
TABLE(
  subscribed_count INTEGER,   -- 成功订阅的事件数量
  subscribed_events JSONB     -- 订阅的事件列表
)
```

**示例：**
```sql
SELECT * FROM subscribe_webhook_events(
  p_webhook_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  p_event_types := ARRAY['credit.added', 'credit.consumed']
);
```

---

### 3. `unsubscribe_webhook_events()` - 取消订阅

**功能：** 取消 webhook 的事件订阅

**参数：**
```sql
unsubscribe_webhook_events(
  p_webhook_id UUID,      -- Webhook ID
  p_event_types TEXT[]    -- 事件类型数组
)
```

**返回：**
```sql
TABLE(
  unsubscribed_count INTEGER  -- 成功取消订阅的数量
)
```

**示例：**
```sql
SELECT * FROM unsubscribe_webhook_events(
  p_webhook_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  p_event_types := ARRAY['video.failed']
);
```

---

### 4. `trigger_webhook_event()` - 触发事件（系统内部）

**功能：** 触发 webhook 事件，创建 delivery 记录

**参数：**
```sql
trigger_webhook_event(
  p_event_type VARCHAR(100),  -- 事件类型
  p_payload JSONB,            -- 事件 payload
  p_user_id UUID DEFAULT NULL -- 用户 ID（可选，限制只触发该用户的 webhooks）
)
```

**返回：**
```sql
TABLE(
  delivery_id UUID,    -- Delivery ID
  webhook_id UUID,     -- Webhook ID
  webhook_url TEXT     -- Webhook URL
)
```

**示例：**
```sql
-- 触发视频生成完成事件
SELECT * FROM trigger_webhook_event(
  p_event_type := 'video.generated',
  p_payload := '{
    "video_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "user_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "status": "completed",
    "url": "https://storage.example.com/videos/abc123.mp4"
  }'::jsonb
);
```

---

### 5. `get_webhook_statistics()` - 获取统计信息

**功能：** 获取 webhook 的统计信息

**参数：**
```sql
get_webhook_statistics(
  p_webhook_id UUID,         -- Webhook ID
  p_days INTEGER DEFAULT 30  -- 统计天数
)
```

**返回：**
```sql
TABLE(
  total_deliveries BIGINT,          -- 总调用次数
  successful_deliveries BIGINT,     -- 成功次数
  failed_deliveries BIGINT,         -- 失败次数
  success_rate NUMERIC,             -- 成功率（%）
  avg_response_time_ms NUMERIC,     -- 平均响应时间（毫秒）
  deliveries_by_day JSONB,          -- 按日期统计
  deliveries_by_event_type JSONB    -- 按事件类型统计
)
```

**示例：**
```sql
-- 获取最近 7 天的统计
SELECT * FROM get_webhook_statistics(
  p_webhook_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  p_days := 7
);
```

**返回示例：**
```json
{
  "total_deliveries": 150,
  "successful_deliveries": 142,
  "failed_deliveries": 8,
  "success_rate": 94.67,
  "avg_response_time_ms": 235.5,
  "deliveries_by_day": {
    "2025-11-22": 25,
    "2025-11-23": 30,
    "2025-11-24": 28
  },
  "deliveries_by_event_type": {
    "video.generated": 100,
    "video.failed": 10,
    "credit.added": 40
  }
}
```

---

### 6. `retry_failed_delivery()` - 手动重试

**功能：** 手动重试失败的 delivery

**参数：**
```sql
retry_failed_delivery(
  p_delivery_id UUID  -- Delivery ID
)
```

**返回：**
```sql
TABLE(
  success BOOLEAN,  -- 是否成功
  message TEXT      -- 消息
)
```

**示例：**
```sql
SELECT * FROM retry_failed_delivery(
  p_delivery_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
);
```

---

### 7. `get_pending_webhook_retries()` - 获取待重试队列（系统内部）

**功能：** 获取待重试的 deliveries（供 worker 调用）

**参数：**
```sql
get_pending_webhook_retries(
  p_limit INTEGER DEFAULT 100  -- 最大返回数量
)
```

**返回：**
```sql
TABLE(
  delivery_id UUID,
  webhook_id UUID,
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  event_type VARCHAR(100),
  request_payload JSONB,
  attempt_number INTEGER,
  max_attempts INTEGER
)
```

**示例：**
```sql
-- Worker 定期调用
SELECT * FROM get_pending_webhook_retries(p_limit := 50);
```

---

## 使用示例

### 完整流程示例

#### 1. 创建 Webhook
```sql
-- 创建一个 webhook 并订阅视频事件
SELECT * FROM create_webhook(
  p_name := 'Production Video Webhook',
  p_url := 'https://api.example.com/webhooks/video',
  p_description := 'Receive video generation events',
  p_event_types := ARRAY['video.generated', 'video.failed'],
  p_max_retries := 5,
  p_timeout_seconds := 60
);

-- 返回:
-- webhook_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- webhook_secret: abcdef1234567890... (64个字符)
-- subscribed_events: ["video.generated", "video.failed"]
```

#### 2. 订阅更多事件
```sql
SELECT * FROM subscribe_webhook_events(
  p_webhook_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  p_event_types := ARRAY['credit.added']
);
```

#### 3. 触发事件（应用代码中）
```sql
-- 在视频生成完成后触发
SELECT * FROM trigger_webhook_event(
  p_event_type := 'video.generated',
  p_payload := jsonb_build_object(
    'video_id', video_id,
    'user_id', user_id,
    'status', 'completed',
    'url', video_url
  )
);
```

#### 4. 查看统计
```sql
SELECT * FROM get_webhook_statistics(
  p_webhook_id := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  p_days := 30
);
```

#### 5. 查看调用历史
```sql
-- 查询最近 10 次调用
SELECT
  id,
  event_type,
  status,
  response_status,
  response_time_ms,
  attempt_number,
  created_at
FROM webhook_deliveries
WHERE webhook_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
ORDER BY created_at DESC
LIMIT 10;
```

#### 6. 重试失败的调用
```sql
SELECT * FROM retry_failed_delivery(
  p_delivery_id := 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
);
```

---

## 安全机制

### 1. HMAC 签名验证

每个 webhook 请求都包含 HMAC 签名，用于验证请求的真实性。

**签名生成：**
```
signature = algorithm + '=' + hex(hmac(payload, secret, algorithm))
```

**请求头：**
```
X-Webhook-Signature: sha256=abcdef1234567890...
X-Webhook-Event: video.generated
X-Webhook-ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**接收端验证（Node.js 示例）：**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret, algorithm = 'sha256') {
  const expectedSignature = algorithm + '=' +
    crypto.createHmac(algorithm, secret)
      .update(JSON.stringify(payload))
      .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js 中间件
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = 'your-webhook-secret'; // 从数据库获取

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 处理 webhook 事件
  // ...
});
```

### 2. RLS 策略

所有表都启用了 Row Level Security（RLS），确保：
- ✅ 用户只能访问自己的 webhooks
- ✅ 用户只能查看自己 webhook 的调用记录
- ✅ 所有认证用户可查看事件类型

### 3. URL 验证（可选实现）

系统支持 URL 验证机制：
1. 用户创建 webhook 后，系统生成 `verification_token`
2. 系统发送验证请求到 webhook URL
3. Webhook 端点返回 token，系统标记为 `is_verified = true`

---

## 性能优化

### 1. 索引策略

已创建的索引：
- ✅ 用户查询：`idx_webhooks_user_id`
- ✅ 状态过滤：`idx_webhooks_is_active`
- ✅ 时间排序：`idx_webhooks_created_at`
- ✅ 重试队列：`idx_webhook_deliveries_next_retry` (WHERE status = 'retrying')

### 2. 统计信息自动更新

使用触发器自动更新 webhook 统计：
- `total_deliveries`
- `successful_deliveries`
- `failed_deliveries`
- `last_delivery_at`
- `last_success_at`
- `last_failure_at`

### 3. 批量处理

`get_pending_webhook_retries()` 支持批量获取待重试的 deliveries，建议：
- 使用 worker 定期调用（如每分钟一次）
- 限制每次处理数量（如 50-100 条）
- 并发处理多个 deliveries

### 4. 数据清理策略（建议）

建议定期清理旧的 delivery 记录：
```sql
-- 删除 90 天前的成功 delivery 记录
DELETE FROM webhook_deliveries
WHERE status = 'success'
  AND created_at < NOW() - INTERVAL '90 days';

-- 删除 30 天前的失败 delivery 记录
DELETE FROM webhook_deliveries
WHERE status = 'failed'
  AND created_at < NOW() - INTERVAL '30 days';
```

---

## 总结

**艹！Webhook 系统数据库设计完成！**

**主要特性：**
- ✅ 4 张表（webhooks, webhook_events, webhook_event_subscriptions, webhook_deliveries）
- ✅ 7 个 RPC 函数（创建、订阅、触发、统计、重试等）
- ✅ HMAC 签名验证（sha256/sha512）
- ✅ 智能重试机制
- ✅ 完整的调用历史和统计
- ✅ RLS 安全策略
- ✅ 性能优化索引

**下一步：**
- Week 6: 实现 Webhook 系统业务逻辑（BullMQ 集成、Worker、API 路由等）

---

**老王提醒：这个设计能处理高并发、大流量的 webhook 场景，性能杠杠的！** 💪
