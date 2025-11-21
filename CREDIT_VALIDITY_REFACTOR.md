# 积分有效期重构文档

## 📋 概述

本次重构优化了积分系统的有效期规则，使其更加合理和用户友好。

## 🔥 核心变更

### 1. 有效期规则调整

| 类型 | 旧规则 | 新规则 | 说明 |
|------|--------|--------|------|
| **注册赠送** | 7天有效 | **15天有效** | 给新用户更多体验时间 |
| **积分包** | 永久有效 | **1年有效** | 从购买时间算起 |
| **订阅月付** | 每月重置 | **每月充值，1年有效** | 积分可累积使用 |
| **订阅年付** | 未实现 | **一次性充值12个月+20%赠送，1年有效** | 年付更优惠 |

### 2. 年付积分计算规则

年付用户享受**20%额外赠送**：

| 套餐 | 月付积分 | 年付基础积分 (12个月) | 年付赠送积分 (20%) | 年付实际获得 |
|------|----------|---------------------|------------------|-------------|
| **Basic** | 150/月 | 1800 | 360 | **2160积分** |
| **Pro** | 800/月 | 9600 | 1920 | **11520积分** |
| **Max** | 2000/月 | 24000 | 4800 | **28800积分** |

### 3. 月付订阅充值机制

- **购买时**: 立即充值当月积分
- **每月充值**: 从购买时间每个月自动充值
- **有效期**: 每次充值的积分从充值时间起1年有效
- **累积**: 积分可累积，未使用的积分在1年内有效

**示例**：
```
用户在 2025-01-15 购买 Pro 月付订阅 (800积分/月)

2025-01-15: 充值 800积分，过期时间 2026-01-15
2025-02-15: 充值 800积分，过期时间 2026-02-15
2025-03-15: 充值 800积分，过期时间 2026-03-15
...

如果用户在 2025-06-01 还有 2000 积分未使用，
这些积分会在各自的过期时间前有效
```

## 📊 数据库变更

### 新增表: `user_subscriptions`

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_tier VARCHAR(20),        -- 'basic', 'pro', 'max'
    billing_cycle VARCHAR(20),    -- 'monthly', 'yearly'
    status VARCHAR(20),            -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMPTZ,        -- 订阅开始时间 (购买时间)
    expires_at TIMESTAMPTZ,        -- 订阅结束时间
    next_refill_at TIMESTAMPTZ,    -- 下次充值时间 (仅月付)
    monthly_credits INTEGER,       -- 每月积分额度
    ...
);
```

### 新增数据库函数

1. **`refill_subscription_credits()`** - 处理订阅充值
2. **`process_monthly_subscription_refills()`** - 定时任务：处理月付自动充值
3. **`get_user_active_subscription()`** - 获取用户当前有效订阅
4. **`calculate_yearly_bonus_credits()`** - 计算年付赠送积分

## 🔧 API 变更

### 新增API

1. **`POST /api/subscription/purchase`** - 订阅购买
   ```typescript
   请求: { plan_tier: 'basic'|'pro'|'max', billing_cycle: 'monthly'|'yearly' }
   响应: { checkout_url, session_id, subscription: {...} }
   ```

2. **`GET /api/cron/refill-subscriptions`** - 定时任务：月付自动充值
   - 每天凌晨2点执行
   - 检查所有需要充值的月付订阅

### 修改的API

1. **`POST /api/credits/purchase`** - 积分包购买
   - 积分有效期改为1年

2. **`POST /api/webhooks/creem`** - Webhook处理
   - 新增订阅购买处理逻辑
   - 支持月付/年付

3. **`GET /api/credits`** - 获取用户积分
   - 返回数据包含积分来源分类

## 💻 代码变更

### 1. TypeScript 类型定义 (`lib/credit-types.ts`)

新增类型：
```typescript
export type BillingCycle = 'monthly' | 'yearly'
export type PlanTier = 'basic' | 'pro' | 'max'
export interface UserSubscription { ... }
```

新增常量：
```typescript
export const CREDIT_VALIDITY = {
  REGISTRATION: 15,    // 注册: 15天
  PACKAGE: 365,        // 积分包: 1年
  SUBSCRIPTION: 365,   // 订阅: 1年
}

export const SUBSCRIPTION_YEARLY_ACTUAL_CREDITS = {
  basic: 2160,   // 1800 + 360
  pro: 11520,    // 9600 + 1920
  max: 28800,    // 24000 + 4800
}
```

### 2. CreditService (`lib/credit-service.ts`)

新增方法：
```typescript
- getUserActiveSubscription()    // 获取用户当前订阅
- createSubscription()            // 创建订阅记录
- cancelSubscription()            // 取消订阅
```

修改方法：
```typescript
- grantRegistrationBonus()        // 15天有效期
- refillSubscriptionCredits()     // 1年有效期，支持月付/年付
- creditPackagePurchase()         // 1年有效期
```

### 3. 定价页面 (`app/pricing/page.tsx`)

更新积分显示：
```tsx
// 月付
"150积分/月 (1年有效)"

// 年付
"2160积分/年 (含360赠送，1年有效)"
```

## 📅 部署步骤

### 1. 数据库迁移

在 Supabase Dashboard 执行：
```sql
/Users/kening/biancheng/nanobanana-clone/supabase/migrations/20250123_refactor_credit_validity.sql
```

### 2. 环境变量配置

添加 Creem 订阅产品 ID：
```bash
# 月付产品 ID
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx

# 年付产品 ID
CREEM_BASIC_YEARLY_PRODUCT_ID=prod_xxx
CREEM_PRO_YEARLY_PRODUCT_ID=prod_xxx
CREEM_MAX_YEARLY_PRODUCT_ID=prod_xxx

# 定时任务密钥 (可选，生产环境推荐)
CRON_SECRET=your_random_secret
```

### 3. Vercel Cron 配置

创建或更新 `vercel.json`：
```json
{
  "crons": [{
    "path": "/api/cron/refill-subscriptions",
    "schedule": "0 2 * * *"
  }]
}
```

### 4. Creem Dashboard 配置

1. 创建6个订阅产品 (3个套餐 × 2个计费周期)
2. 复制产品 ID 到环境变量
3. 配置 Webhook URL: `https://your-domain.com/api/webhooks/creem`

## 🧪 测试指南

### 1. 注册赠送测试
```bash
# 1. 注册新用户
# 2. 查看积分: GET /api/credits
# 预期: total_credits = 50, expiring_soon_date = 15天后
```

### 2. 积分包购买测试
```bash
# 1. 购买积分包
POST /api/credits/purchase
Body: { "package_code": "starter" }

# 2. 完成支付

# 3. 查看积分历史
GET /api/credits/history
# 预期: 显示积分包购买记录，expires_at = 1年后
```

### 3. 订阅月付测试
```bash
# 1. 购买月付订阅
POST /api/subscription/purchase
Body: { "plan_tier": "basic", "billing_cycle": "monthly" }

# 2. 完成支付

# 3. 查看积分
GET /api/credits
# 预期: 充值150积分，过期时间1年后

# 4. 等待下个月 (或手动触发定时任务)
GET /api/cron/refill-subscriptions
# 预期: 再次充值150积分
```

### 4. 订阅年付测试
```bash
# 1. 购买年付订阅
POST /api/subscription/purchase
Body: { "plan_tier": "pro", "billing_cycle": "yearly" }

# 2. 完成支付

# 3. 查看积分
GET /api/credits
# 预期: 充值11520积分 (9600基础 + 1920赠送)，过期时间1年后
```

## ⚠️ 注意事项

1. **数据迁移**: 现有积分不会受影响，新规则仅应用于新充值
2. **月付充值**: 依赖定时任务，确保 Vercel Cron 正常运行
3. **时区问题**: 所有时间使用 UTC，前端需要转换为用户时区
4. **积分过期提醒**: 建议在用户中心显示即将过期的积分
5. **订阅取消**: 取消订阅后不再充值新积分，但已有积分仍有效至过期时间

## 📈 优势分析

### 用户角度
1. ✅ 注册赠送延长至15天，更充裕的体验时间
2. ✅ 月付积分可累积，不再"用不完就浪费"
3. ✅ 年付享受20%赠送，更划算
4. ✅ 所有积分都有1年有效期，合理且清晰

### 技术角度
1. ✅ 数据库函数处理充值，保证一致性
2. ✅ 定时任务自动化，减少人工干预
3. ✅ 代码结构清晰，遵循 SOLID 原则
4. ✅ TypeScript 类型完善，减少错误

### 商业角度
1. ✅ 年付赠送吸引用户预付费
2. ✅ 月付累积降低用户流失
3. ✅ 1年有效期平衡用户体验和商业收益

## 🚀 后续优化建议

1. **前端积分中心**
   - 显示积分来源分类 (注册/订阅/购买)
   - 显示即将过期的积分提醒
   - 显示每月充值历史

2. **邮件通知**
   - 订阅成功通知
   - 月付充值通知
   - 积分即将过期提醒

3. **数据分析**
   - 积分使用率统计
   - 订阅转化率追踪
   - 用户留存分析

---

**文档版本**: v1.0
**最后更新**: 2025-01-23
**作者**: 老王
