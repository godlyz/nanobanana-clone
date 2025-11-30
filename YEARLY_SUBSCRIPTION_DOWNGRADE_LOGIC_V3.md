# 年付订阅降级业务逻辑完整设计文档 V3

> **目的**: 明确年付订阅immediate降级的完整业务逻辑，供用户检查确认后再执行代码修改和测试编写。

---

## 📌 核心业务规则（用户确认）

### 规则1: 冻结规则（方案B）

**immediate降级时冻结对象：**
- ✅ **冻结旧订阅记录**: 设置 `is_frozen=true`
- ✅ **只冻结订阅月度积分**: `transaction_type = 'subscription_refill'`
- ❌ **不冻结赠送积分**: `transaction_type = 'subscription_bonus'`
- ❌ **不冻结积分包**: `transaction_type = 'package_purchase'`

**冻结时间：**
- `frozen_until` = 新订阅的 `expires_at`
- 例如：新订阅Basic月付，`expires_at = 2025-12-16`，则冻结至 `2025-12-16`

### 规则2: 积分到期 = 积分消耗

**重要：每个月积分到期后，剩余积分直接扣除并计入总消耗！**

**示例：**
```
第2次充值：800积分
- 充值时间：2025-11-20
- 过期时间：2025-12-20（30天后）
- 用户消耗：500积分
- 剩余积分：300积分

2025-12-20到期时：
- 系统扣除：300积分
- 生成记录：transaction_type='credit_expiry', amount=-300
- 总消耗更新：1000 + 300 = 1300
```

**关键点：**
- 到期扣除的积分**必须**计入"总消耗积分"
- 积分消耗记录中要显示"积分到期消耗"类型

### 规则3: 时间计算规则

**固定时间单位：**
- 每个月 = **30天**（2592000秒）
- 时间戳精确到**秒**
- 不考虑自然月的天数差异（1月31天，2月28天等）

**示例：**
```
第1次充值：2025-10-20
第1次到期：2025-11-19（+30天）
第2次充值：2025-11-20（第1次到期后第1天）
第2次到期：2025-12-20（+30天）
第3次充值：2025-12-21（第2次到期后第1天）
```

### 规则4: 未激活月份激活时间

**正常情况（无冻结）：**
- 前一个月到期后**第二天**激活（到期+1天）

**冻结情况（immediate降级）：**
- 前一个月**解冻后到期**时间+1天激活

**计算公式：**
```
冻结后的第N月激活时间 = 第(N-1)月解冻后到期时间 + 1天

其中：
第(N-1)月解冻后到期时间 = frozen_until + frozen_remaining_seconds
```

**示例（见下文完整场景）**

### 规则5: 冻结时间延长（续订新套餐）

**🔥 新增规则：如果用户续订新套餐，冻结时间自动延长！**

**场景：**
```
1. 用户降级：Pro年付 → Basic月付（immediate模式）
   - 新订阅到期：2025-12-16
   - 冻结至：2025-12-16

2. 用户续订Basic月付（2025-12-10续订）
   - 新订阅到期延长：2025-12-16 → 2026-01-15（+30天）
   - 冻结时间延长：2025-12-16 → 2026-01-15

3. 旧订阅解冻时间自动延后到：2026-01-15
```

**实现逻辑：**
- 检测到新订阅续订（`expires_at` 延长）
- 自动更新旧订阅的冻结积分的 `frozen_until` 字段
- 旧订阅的 `is_frozen` 保持 `true`，直到新订阅真正到期

**SQL伪代码：**
```sql
-- 续订时自动延长冻结时间
UPDATE credit_transactions
SET frozen_until = :new_expires_at  -- 新订阅的新到期时间
WHERE user_id = :user_id
  AND is_frozen = true
  AND frozen_until = :old_expires_at  -- 原冻结时间
```

---

## 📋 完整测试场景设计

### 场景：Pro年付 → Basic月付（immediate模式）

#### 时间线

| 时间节点 | 事件 | 说明 |
|---------|------|------|
| 2025-10-20 | 购买Pro年付 | 第1次充值800+赠送1920 |
| 2025-11-19 | 第1次积分到期 | 全部消耗完，无到期扣除 |
| 2025-11-20 | 第2次充值 | 自动充值800积分 |
| 2025-11-16 | 当前时间 | 用户执行降级操作 |
| 2025-12-16 | 新订阅到期 | Basic月付到期，旧订阅解冻 |
| 2025-12-20 | 第2次积分解冻后到期 | 剩余300积分到期扣除 |
| 2025-12-21 | 第3次充值 | 解冻后自动充值800积分 |

---

### 初始状态（2025-11-16 降级前）

#### 1.1 订阅信息

```javascript
const initialSubscription = {
  id: 'sub-yearly-001',
  user_id: 'user-123',
  plan_tier: 'pro',
  billing_cycle: 'yearly',
  monthly_credits: 800,
  started_at: '2025-10-20T00:00:00Z',
  expires_at: '2026-10-20T00:00:00Z',  // 1年后
  remaining_refills: 10,  // 剩余10次充值（第3-12个月）
  last_refill_date: '2025-11-20T00:00:00Z',  // 上次充值（第2次）
  next_refill_date: '2025-12-20T00:00:00Z',  // 下次充值（第3次，第2次到期后）
  is_frozen: false,
  freeze_start_time: null,
  adjustment_mode: null,
  original_plan_expires_at: null,
}
```

#### 1.2 积分交易流水

```javascript
const initialCreditTransactions = [
  // ==================== 充值类 ====================

  // 🎁 年付赠送积分（1920，1年有效，2026-10-20过期）
  {
    id: 'tx-001-bonus',
    created_at: '2025-10-20T00:00:00Z',
    transaction_type: 'subscription_bonus',
    amount: 1920,
    expires_at: '2026-10-20T00:00:00Z',
    remaining_amount: 1920,  // ✅ 未消耗
    is_frozen: false,
    frozen_until: null,
    frozen_remaining_seconds: null,
    description: 'Pro yearly bonus (1920 credits, valid for 1 year) / Pro年付赠送（1920积分，1年有效）',
  },

  // 📅 第1次充值（800，30天有效，2025-11-19过期）
  {
    id: 'tx-002-refill-month1',
    created_at: '2025-10-20T00:00:00Z',  // 购买时立即充值
    transaction_type: 'subscription_refill',
    amount: 800,
    expires_at: '2025-11-19T23:59:59Z',  // 30天后
    remaining_amount: 0,  // ✅ 已全部消耗
    is_frozen: false,
    frozen_until: null,
    frozen_remaining_seconds: null,
    description: 'Pro yearly refill - Month 1 (800 credits, valid for 30 days) / Pro年付充值 - 第1个月（800积分，30天有效）',
  },

  // 📅 第2次充值（800，30天有效，2025-12-20过期）
  {
    id: 'tx-003-refill-month2',
    created_at: '2025-11-20T00:00:00Z',  // 第1次到期后第1天
    transaction_type: 'subscription_refill',
    amount: 800,
    expires_at: '2025-12-20T00:00:00Z',  // 30天后
    remaining_amount: 300,  // ✅ 已消耗500，剩余300
    is_frozen: false,
    frozen_until: null,
    frozen_remaining_seconds: null,
    description: 'Pro yearly refill - Month 2 (800 credits, valid for 30 days) / Pro年付充值 - 第2个月（800积分，30天有效）',
  },

  // ==================== 消耗类 ====================

  // 🖼️ 文生图消耗（-500，从第1次充值扣除）
  {
    id: 'tx-004-consume-text2img',
    created_at: '2025-11-10T12:00:00Z',
    transaction_type: 'text_to_image',
    amount: -500,
    expires_at: null,
    remaining_amount: 300,  // 扣除后第1次还剩300
    is_frozen: false,
    frozen_until: null,
    frozen_remaining_seconds: null,
    description: 'Text to image generation / 文生图生成',
  },

  // 🎨 图生图消耗（-500，从第1次充值扣除300，从第2次充值扣除200）
  {
    id: 'tx-005-consume-img2img',
    created_at: '2025-11-15T14:00:00Z',
    transaction_type: 'image_to_image',
    amount: -500,
    expires_at: null,
    remaining_amount: 300,  // 第1次消耗完0，第2次剩余300
    is_frozen: false,
    frozen_until: null,
    frozen_remaining_seconds: null,
    description: 'Image to image generation / 图生图生成',
  },
]
```

**🔥 关键点：第1次充值到期（2025-11-19）**
- 第1次充值800积分已全部消耗（remaining_amount=0）
- 2025-11-19到期时**无剩余积分扣除**
- **不生成**积分到期消耗记录

#### 1.3 积分汇总

```javascript
const initialCredits = {
  available_credits: 2220,  // 1920赠送 + 300第2次剩余
  frozen_credits: 0,
  total_credits: 2220,
  total_earned: 3520,  // 1920 + 800 + 800
  total_consumed: 1000,  // 500 + 500
}
```

#### 1.4 FIFO消耗顺序验证

**消耗规则：优先消耗即将过期的积分**

```
消耗顺序：
1. tx-002（第1次充值，2025-11-19过期）→ 先消耗
2. tx-003（第2次充值，2025-12-20过期）→ 第1次用完后消耗
3. tx-001（赠送积分，2026-10-20过期）→ 最后消耗

实际消耗：
- 第1次消耗500：从tx-002扣除 → tx-002剩余300
- 第2次消耗500：从tx-002扣除300 + 从tx-003扣除200 → tx-002剩余0，tx-003剩余600
- 但我们的Mock数据中tx-003剩余300，说明又消耗了300
```

**🔥 修正：第2次充值应该剩余600，不是300！**

让我重新计算：
```
初始：
- tx-002: 800（2025-11-19过期）
- tx-003: 800（2025-12-20过期）
- tx-001: 1920（2026-10-20过期）

第1次消耗500（2025-11-10）：
- 从tx-002扣除500 → tx-002剩余300

第2次消耗500（2025-11-15）：
- 从tx-002扣除300 → tx-002剩余0
- 从tx-003扣除200 → tx-003剩余600

所以：
- tx-002: 0（即将到期）
- tx-003: 600（剩余）
- 总可用：600 + 1920 = 2520
```

**老王我之前算错了！让我用600作为第2次充值的剩余！**

---

### 降级后状态（2025-11-16 immediate模式）

#### 2.1 API操作

```javascript
POST /api/subscription/downgrade
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

#### 2.2 订阅信息变化

```javascript
const finalSubscription = {
  ...initialSubscription,
  plan_tier: 'basic',  // ✅ 改为Basic
  billing_cycle: 'monthly',  // ✅ 改为月付
  monthly_credits: 150,  // ✅ 更新为Basic月度积分
  expires_at: '2025-12-16T00:00:00Z',  // ✅ 当前时间+30天
  adjustment_mode: 'immediate',  // ✅ 记录调整模式
  original_plan_expires_at: '2026-10-20T00:00:00Z',  // ✅ 记录原到期时间
  is_frozen: true,  // 🔥 冻结旧订阅
  freeze_start_time: '2025-11-16T00:00:00Z',  // 🔥 记录冻结时间
  remaining_refills: 10,  // ✅ 保持不变
  next_refill_date: '2025-12-20T00:00:00Z',  // ⏸️ 暂不延后（见下文）
}
```

**🔥 关键字段说明：**
- `is_frozen=true`：订阅冻结，定时任务跳过
- `remaining_refills=10`：保持不变，解冻后继续充值
- `next_refill_date`：暂不修改，解冻后重新计算

#### 2.3 积分交易流水变化

**新增记录：**

```javascript
// 💰 Basic月付首次充值（150，30天有效，2025-12-16过期）
{
  id: 'tx-006-new-basic-refill',
  created_at: '2025-11-16T00:00:00Z',
  transaction_type: 'subscription_refill',
  amount: 150,
  expires_at: '2025-12-16T00:00:00Z',
  remaining_amount: 150,  // 未消耗
  is_frozen: false,  // ❌ 新积分不冻结
  frozen_until: null,
  frozen_remaining_seconds: null,
  description: 'Basic monthly refill (150 credits, valid for 30 days) / Basic月付充值（150积分，30天有效）',
}
```

**冻结记录（tx-003更新）：**

```javascript
// 📅 第2次充值（冻结）
{
  ...tx-003-refill-month2,
  is_frozen: true,  // 🔥 冻结
  frozen_until: '2025-12-16T00:00:00Z',  // 🔥 冻结至新订阅结束
  frozen_remaining_seconds: 2937600,  // 🔥 剩余有效时间（秒）
}
```

**frozen_remaining_seconds 计算：**
```javascript
原到期时间：2025-12-20T00:00:00Z
当前时间：  2025-11-16T00:00:00Z
剩余时间 = (2025-12-20 - 2025-11-16) = 34天 = 2937600秒
```

**解冻后的到期时间计算：**
```javascript
frozen_until = '2025-12-16T00:00:00Z'
frozen_remaining_seconds = 2937600秒（34天）
unfrozen_expires_at = frozen_until + frozen_remaining_seconds
                    = 2025-12-16 + 34天
                    = 2026-01-19T00:00:00Z
```

**未冻结记录（tx-001保持不变）：**

```javascript
// 🎁 年付赠送积分（不冻结）
{
  ...tx-001-bonus,
  is_frozen: false,  // ❌ 赠送积分不冻结
  frozen_until: null,
  frozen_remaining_seconds: null,
}
```

#### 2.4 积分汇总变化

```javascript
const finalCredits = {
  available_credits: 2070,  // 1920赠送 + 150新充值（600第2次冻结）
  frozen_credits: 600,  // 第2次充值剩余600冻结
  total_credits: 2670,  // 可用 + 冻结
  total_earned: 3670,  // 3520 + 150新充值
  total_consumed: 1000,  // 不变（本次无到期消耗）
}
```

#### 2.5 未激活月份延后计算

**第3-12个月的激活时间：**

| 月份 | 原激活时间 | 冻结延后（30天） | 新激活时间 | 延后天数 |
|------|-----------|----------------|-----------|---------|
| 第3个月 | 2025-12-21 | +30天 | 2026-01-20 | 30天 |
| 第4个月 | 2026-01-20 | +30天 | 2026-02-19 | 30天 |
| 第5个月 | 2026-02-19 | +30天 | 2026-03-21 | 30天 |
| ... | ... | ... | ... | ... |
| 第12个月 | 2026-09-18 | +30天 | 2026-10-18 | 30天 |

**计算逻辑：**
```javascript
冻结时长 = frozen_until - now
        = 2025-12-16 - 2025-11-16
        = 30天

第N月新激活时间 = 第N月原激活时间 + 冻结时长
```

**🔥 关键点：如果用户续订新套餐，冻结时长自动延长！**

---

### 续订场景（新套餐续订延长冻结）

#### 场景：用户在2025-12-10续订Basic月付

**操作前：**
- 新订阅到期：2025-12-16
- 冻结至：2025-12-16
- 第2次积分解冻后到期：2026-01-19

**续订操作：**
```javascript
POST /api/subscription/renew  // 假设有续订API
{
  "plan": "basic",
  "billingPeriod": "monthly"
}
```

**操作后：**
- 新订阅到期延长：2025-12-16 → 2026-01-15（+30天）
- 冻结时间延长：2025-12-16 → 2026-01-15
- 第2次积分冻结时长增加：30天 → 60天
- 第2次积分解冻后到期：2026-01-19 → 2026-02-18（+30天）

**未激活月份延后更新：**

| 月份 | 原激活时间 | 续订前延后 | 续订后延后 | 新激活时间 |
|------|-----------|-----------|-----------|-----------|
| 第3个月 | 2025-12-21 | +30天 | +60天 | 2026-02-19 |
| 第4个月 | 2026-01-20 | +30天 | +60天 | 2026-03-21 |
| ... | ... | ... | ... | ... |

**实现逻辑：**
```sql
-- 续订时自动延长冻结时间
UPDATE credit_transactions
SET frozen_until = '2026-01-15'  -- 新到期时间
WHERE user_id = :user_id
  AND is_frozen = true
  AND frozen_until = '2025-12-16'  -- 旧冻结时间
```

---

### 解冻场景（2025-12-16新订阅到期）

**自动解冻逻辑（定时任务或RPC触发）：**

1. **更新订阅状态：**
```javascript
{
  is_frozen: false,  // 解冻
  freeze_start_time: null,  // 清空
}
```

2. **解冻积分并恢复剩余有效时间：**
```javascript
// tx-003解冻
{
  ...tx-003-refill-month2,
  is_frozen: false,  // 解冻
  expires_at: '2026-01-19T00:00:00Z',  // 新到期时间 = frozen_until + frozen_remaining_seconds
  frozen_until: null,
  frozen_remaining_seconds: null,
}
```

3. **恢复充值计划：**
- 第3次充值时间：2026-01-20（第2次解冻后到期+1天）
- 第4-12次充值：依次每30天

**解冻后的积分汇总：**
```javascript
{
  available_credits: 2670,  // 1920 + 600解冻 + 150新订阅剩余
  frozen_credits: 0,
  total_credits: 2670,
}
```

---

### 积分到期消耗场景（第2次积分解冻后到期）

**时间：2026-01-19（第2次积分解冻后到期）**

**假设：用户一直没消耗，第2次积分还剩600**

**自动到期扣除逻辑：**

1. **生成到期消耗记录：**
```javascript
{
  id: 'tx-007-expiry-month2',
  created_at: '2026-01-19T00:00:00Z',  // 到期时间
  transaction_type: 'credit_expiry',  // 🔥 新增类型
  amount: -600,  // 🔥 负数（扣除600）
  source_transaction_id: 'tx-003-refill-month2',  // 原积分记录
  expires_at: null,
  remaining_amount: 0,
  is_frozen: false,
  frozen_until: null,
  frozen_remaining_seconds: null,
  description: '积分到期消耗 - Pro yearly refill - Month 2 / Credit expiry - Pro yearly refill - Month 2',
}
```

2. **更新原积分记录：**
```javascript
// tx-003更新
{
  ...tx-003-refill-month2,
  remaining_amount: 0,  // 🔥 清零
}
```

3. **更新积分汇总：**
```javascript
{
  available_credits: 2070,  // 2670 - 600到期
  total_consumed: 1600,  // 1000 + 600到期消耗 🔥
}
```

**🔥 关键点：到期扣除的600积分计入"总消耗"！**

---

## 🛠️ 需要修复的代码

### 修复点1: 降级API调用freeze函数

**文件**: `app/api/subscription/downgrade/route.ts`

**当前代码（line 262）：**
```typescript
// ❌ 调用已废弃的函数
const { data: freezeResult, error: freezeError } = await supabaseService
  .rpc('freeze_subscription_credits', {
    p_user_id: user.id,
    p_subscription_id: sub.id,
    p_frozen_until: newPlanEndDate.toISOString(),
    p_reason: `Immediate downgrade...`
  })
```

**修复后代码：**
```typescript
// ✅ 先计算实际剩余积分（只计算subscription_refill类型）
const { data: actualRemaining } = await supabaseService
  .rpc('get_subscription_actual_remaining_credits', {
    p_user_id: user.id,
    p_subscription_id: sub.id
  })

// ✅ 调用新的smart freeze函数
const { data: freezeResult, error: freezeError } = await supabaseService
  .rpc('freeze_subscription_credits_smart', {
    p_user_id: user.id,
    p_subscription_id: sub.id,
    p_frozen_until: newPlanEndDate.toISOString(),
    p_actual_remaining: actualRemaining || 0,  // 🔥 传入实际剩余
    p_reason: `Immediate downgrade from ${currentPlan} to ${targetPlan} - credits frozen until new plan ends`
  })
```

### 修复点2: 设置订阅冻结状态

**当前代码（line 159）：**
```typescript
const updateData: {
  plan_tier?: string,
  billing_cycle?: string,
  monthly_credits?: number,
  downgrade_to_plan: string,
  downgrade_to_billing_cycle: string,
  adjustment_mode: string,
  original_plan_expires_at?: string,
  updated_at: string,
} = {
  downgrade_to_plan: targetPlan,
  downgrade_to_billing_cycle: billingPeriod,
  adjustment_mode: adjustmentMode,
  updated_at: new Date().toISOString(),
}
```

**修复后代码：**
```typescript
const updateData: {
  plan_tier?: string,
  billing_cycle?: string,
  monthly_credits?: number,
  downgrade_to_plan: string,
  downgrade_to_billing_cycle: string,
  adjustment_mode: string,
  original_plan_expires_at?: string,
  is_frozen?: boolean,  // 🔥 新增
  freeze_start_time?: string,  // 🔥 新增
  updated_at: string,
} = {
  downgrade_to_plan: targetPlan,
  downgrade_to_billing_cycle: billingPeriod,
  adjustment_mode: adjustmentMode,
  updated_at: new Date().toISOString(),
}

if (adjustmentMode === 'immediate') {
  updateData.is_frozen = true  // 🔥 冻结订阅
  updateData.freeze_start_time = new Date().toISOString()  // 🔥 记录冻结时间
  // ... 其他immediate模式的字段
}
```

### 修复点3: 创建新的SQL函数

**新建文件**: `supabase/migrations/20251116000001_add_get_subscription_actual_remaining.sql`

```sql
-- 🔥 计算订阅的实际剩余积分（只计算subscription_refill类型）
CREATE OR REPLACE FUNCTION get_subscription_actual_remaining_credits(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_remaining INTEGER := 0;
BEGIN
    -- 只计算subscription_refill类型的剩余积分
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO total_remaining
    FROM credit_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'subscription_refill'  -- 🔥 只冻结月度充值
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (is_frozen = FALSE OR is_frozen IS NULL);

    RETURN GREATEST(total_remaining, 0);
END;
$$;

COMMENT ON FUNCTION get_subscription_actual_remaining_credits(UUID, UUID)
IS '计算订阅的实际剩余积分（只计算subscription_refill类型，用于冻结）';
```

### 修复点4: 定时任务跳过冻结订阅

**文件**: `supabase/migrations/20251110000001_add_remaining_refills.sql`

**当前代码（line 44）：**
```sql
WHERE us.status = 'active'
    AND us.remaining_refills > 0
    AND us.next_refill_date <= NOW()
```

**修复后代码：**
```sql
WHERE us.status = 'active'
    AND us.remaining_refills > 0
    AND us.next_refill_date <= NOW()
    AND (us.is_frozen IS FALSE OR us.is_frozen IS NULL)  -- 🔥 跳过冻结订阅
```

---

## ✅ 测试验证点

### 1. 订阅字段验证

- [ ] `plan_tier`: "pro" → "basic"
- [ ] `billing_cycle`: "yearly" → "monthly"
- [ ] `monthly_credits`: 800 → 150
- [ ] `expires_at`: "2026-10-20" → "2025-12-16"
- [ ] `adjustment_mode`: null → "immediate"
- [ ] `original_plan_expires_at`: null → "2026-10-20"
- [ ] `is_frozen`: false → true  🔥
- [ ] `freeze_start_time`: null → "2025-11-16"  🔥
- [ ] `remaining_refills`: 10 → 10（保持不变）
- [ ] `next_refill_date`: "2025-12-20" → "2025-12-20"（暂不变）

### 2. 积分冻结验证

- [ ] tx-001（赠送1920）→ 不冻结（subscription_bonus）
- [ ] tx-003（充值剩余600）→ 冻结至2025-12-16（subscription_refill）
- [ ] `frozen_remaining_seconds`: 2937600秒（34天）
- [ ] 解冻后到期时间：2026-01-19

### 3. 积分汇总验证

- [ ] `available_credits`: 2520 → 2070（-600冻结，+150新充值）
- [ ] `frozen_credits`: 0 → 600
- [ ] `total_earned`: 3520 → 3670（+150新充值）
- [ ] `total_consumed`: 1000 → 1000（本次无到期消耗）

### 4. 未激活月份验证

- [ ] 第3个月：原2025-12-21 → 新2026-01-20（+30天）
- [ ] 第4个月：原2026-01-20 → 新2026-02-19（+30天）
- [ ] 延后天数计算：冻结时长30天

### 5. 积分到期消耗验证（解冻后）

- [ ] 第2次积分到期（2026-01-19）时生成到期消耗记录
- [ ] 到期消耗金额：-600（剩余600全部扣除）
- [ ] 总消耗更新：1000 → 1600（+600到期消耗）

### 6. 续订延长冻结验证

- [ ] 续订后新订阅到期延长：2025-12-16 → 2026-01-15
- [ ] 冻结时间自动延长：2025-12-16 → 2026-01-15
- [ ] 第2次积分解冻后到期延长：2026-01-19 → 2026-02-18
- [ ] 未激活月份延后增加：+30天 → +60天

---

## 📊 测试报告格式

### 第一部分：订阅信息对比

（已有，不变）

### 第二部分：积分汇总对比

（已有，不变）

### 第三部分：积分到期记录

（已有，不变）

### 第四部分：积分交易流水

（已有，不变）

### 第五部分：业务逻辑验证

（已有，不变）

### 🔥 第六部分：订阅冻结状态详情（新增）

#### 6.1 订阅冻结信息

| 字段 | 操作前 | 操作后 | 说明 |
|------|--------|--------|------|
| is_frozen | false | true | ✅ 订阅已冻结 |
| freeze_start_time | null | 2025-11-16T00:00:00Z | ✅ 冻结开始时间 |
| remaining_refills | 10 | 10 | ✅ 保持不变 |
| next_refill_date | 2025-12-20 | 2025-12-20 | ✅ 暂不修改 |

#### 6.2 未激活月份延后计划

| 月份 | 原激活时间 | 新激活时间 | 延后天数 | 说明 |
|------|-----------|-----------|---------|------|
| 第3个月 | 2025-12-21 | 2026-01-20 | 30天 | 冻结30天 |
| 第4个月 | 2026-01-20 | 2026-02-19 | 30天 | 冻结30天 |
| 第5个月 | 2026-02-19 | 2026-03-21 | 30天 | 冻结30天 |
| ... | ... | ... | ... | ... |

**如果续订新套餐（延长30天）：**

| 月份 | 原激活时间 | 续订前延后 | 续订后延后 | 新激活时间 | 延后天数 |
|------|-----------|-----------|-----------|-----------|---------|
| 第3个月 | 2025-12-21 | 2026-01-20 | 2026-02-19 | 2026-02-19 | 60天 |

### 🔥 第七部分：积分到期消耗记录（新增）

#### 7.1 本次操作涉及的到期消耗

**本次操作（2025-11-16降级）：**

| 到期时间 | 原积分来源 | 到期扣除积分 | 计入总消耗 | 说明 |
|----------|-----------|-------------|----------|------|
| 2025-11-19 | tx-002（第1次充值） | 0 | ❌ 否 | 已全部消耗，无到期扣除 |

**解冻后到期（2026-01-19）：**

| 到期时间 | 原积分来源 | 到期扣除积分 | 计入总消耗 | 说明 |
|----------|-----------|-------------|----------|------|
| 2026-01-19 | tx-003（第2次充值） | -600 | ✅ 是 | 解冻后到期，剩余600全部扣除 |

**总消耗更新：**
- 操作前：1000
- 操作后：1000（本次无到期消耗）
- 解冻后到期：1600（+600到期消耗）

---

## 🚨 重要提醒

### 1. FIFO消耗顺序验证

**老王我之前算错了第2次充值的剩余！应该是600，不是300！**

正确计算：
```
第1次消耗500：tx-002剩余300
第2次消耗500：tx-002扣除300，tx-003扣除200
tx-003剩余：800 - 200 = 600 ✅
```

### 2. 续订延长冻结逻辑

**新增业务规则：用户续订新套餐时，冻结时间自动延长！**

这个逻辑需要在**续订API**或**Webhook**中实现，不是降级API的职责。

建议单独创建一个RPC函数：
```sql
CREATE OR REPLACE FUNCTION extend_frozen_credits_on_renewal(
    p_user_id UUID,
    p_old_expires_at TIMESTAMPTZ,
    p_new_expires_at TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE credit_transactions
    SET frozen_until = p_new_expires_at
    WHERE user_id = p_user_id
      AND is_frozen = true
      AND frozen_until = p_old_expires_at;

    RETURN (SELECT COUNT(*) FROM credit_transactions
            WHERE user_id = p_user_id AND is_frozen = true);
END;
$$;
```

### 3. 积分到期消耗的实现

**当前系统没有实现积分到期自动扣除逻辑！**

这需要一个**定时任务**或**RPC函数**来处理：
```sql
CREATE OR REPLACE FUNCTION auto_expire_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. 查找所有到期且有剩余的积分
    FOR rec IN
        SELECT id, user_id, remaining_amount, description
        FROM credit_transactions
        WHERE expires_at <= NOW()
          AND remaining_amount > 0
          AND amount > 0  -- 只处理充值类
    LOOP
        -- 2. 生成到期消耗记录
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            source_transaction_id,
            description
        ) VALUES (
            rec.user_id,
            'credit_expiry',
            -rec.remaining_amount,  -- 负数
            rec.id,
            '积分到期消耗 - ' || rec.description
        );

        -- 3. 清零原记录的剩余积分
        UPDATE credit_transactions
        SET remaining_amount = 0
        WHERE id = rec.id;
    END LOOP;
END;
$$;
```

---

## ✅ 检查清单

请检查以下业务逻辑是否正确：

### 冻结规则
- [ ] 只冻结subscription_refill类型积分 ✅
- [ ] 不冻结subscription_bonus（赠送积分） ✅
- [ ] 不冻结package_purchase（积分包） ✅
- [ ] 设置订阅is_frozen=true ✅

### 积分到期消耗
- [ ] 到期剩余积分自动扣除 ✅
- [ ] 到期扣除计入总消耗 ✅
- [ ] 生成credit_expiry类型记录 ✅

### 时间计算
- [ ] 每个月固定30天（2592000秒） ✅
- [ ] 时间戳精确到秒 ✅
- [ ] 不考虑自然月天数 ✅

### 未激活月份
- [ ] 正常：前一个月到期后+1天激活 ✅
- [ ] 冻结：前一个月解冻后到期+1天激活 ✅
- [ ] 延后天数 = 冻结时长 ✅

### 续订延长冻结
- [ ] 新订阅续订时，frozen_until自动延长 ✅
- [ ] 解冻后到期时间自动延长 ✅
- [ ] 未激活月份延后增加 ✅

### 定时任务
- [ ] 跳过冻结订阅（is_frozen检查） ✅
- [ ] 自动充值未激活月份 ✅
- [ ] 自动扣除到期积分 ✅

---

**请检查以上逻辑是否符合业务需求，确认无误后老王立即开始执行代码修改和测试编写！**

---

**生成时间**: 2025-11-16
**作者**: 老王（暴躁技术流）
**版本**: V3（包含续订延长冻结逻辑）
