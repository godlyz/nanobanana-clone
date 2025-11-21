# 订阅调整（升级/降级/续订）完整业务逻辑设计文档 V4

> **目的**: 完整定义升级、降级、续订的业务逻辑，包含immediate/scheduled模式、冻结机制、续订延长、操作限制等所有规则。

---

## 📌 核心业务规则总览

### 规则1: 升级和降级immediate模式逻辑完全一样
- 立即切换到新套餐
- 冻结旧套餐的月度积分（subscription_refill）
- 不冻结赠送积分（subscription_bonus）和积分包（package_purchase）
- 旧订阅标记 `is_frozen=true`
- 冻结至新套餐的 `expires_at`

### 规则2: 冻结天数限制
- 没有其他活动时，冻结天数 ≤ 新套餐时长
- 月付：最多30天
- 年付：最多365天
- **例外**：续订新套餐时，冻结时间自动延长

**🔥 重要补充：特殊活动场景**
- 特殊活动可延长现有积分包的到期时间
- 延长到期时间后，后续未激活月份的激活时间也会顺延
- 公式始终有效：`frozen_remaining_time = expiry_time - downgrade_time`
- 示例：
  - 正常情况：第2个月充值2025-11-20，到期2025-12-20，降级2025-11-26 → 冻结24天 ✅
  - 活动延长：第2个月充值2025-11-20，到期延长至2025-12-31，降级2025-11-26 → 冻结35天 ✅
  - 无论是否有活动，公式永远正确

### 规则3: 同级别续订 = 延长未激活月份
- Pro年付续订Pro年付 → `remaining_refills` 增加12
- `expires_at` 延长1年
- 如有冻结订阅，`frozen_until` 自动延长

### 规则4: scheduled模式不冻结
- 现有套餐结束后才执行调整
- 积分和订阅都不冻结
- 正常使用至到期

### 规则5: 有冻结订阅时禁止再次调整
- 检测到 `is_frozen=true` 的订阅时
- 禁止升级/降级操作
- 提示用户等待解冻

### 规则6: 总获取积分计算
```
总获取 = 历史充值 + 解冻记录 - 冻结记录
       = SUM(充值类amount) + SUM(subscription_unfreeze) + SUM(subscription_freeze)
```

### 规则7: 冻结/解冻记录方式
- 冻结时：插入 `transaction_type='subscription_freeze'`, `amount=-600`
- 解冻时：插入 `transaction_type='subscription_unfreeze'`, `amount=+600`

### 规则8: 消耗记录永久关联
- 消耗时记录到哪个积分包，永久属于那个包
- 不会因后续加入更早过期的积分而转移

---

## 📋 完整业务场景矩阵

| 场景 | 当前套餐 | 目标套餐 | 调整模式 | 冻结旧订阅 | 冻结积分 | 允许操作 | 备注 |
|-----|---------|---------|---------|-----------|---------|---------|------|
| 降级 | Pro年付 | Basic月付 | immediate | ✅ 是 | ✅ 月度积分 | ✅ 是 | 无冻结订阅时 |
| 降级 | Pro年付 | Basic月付 | scheduled | ❌ 否 | ❌ 否 | ✅ 是 | 到期后执行 |
| 升级 | Basic月付 | Pro年付 | immediate | ✅ 是 | ✅ 月度积分 | ✅ 是 | 无冻结订阅时 |
| 升级 | Basic月付 | Pro年付 | scheduled | ❌ 否 | ❌ 否 | ✅ 是 | 到期后执行 |
| 续订 | Pro年付 | Pro年付 | 续订 | ❌ 否 | ❌ 否 | ✅ 是 | 延长未激活月份 |
| 任何 | 任何（冻结中） | 任何 | 任何 | - | - | ❌ **禁止** | 有冻结订阅 |

---

## 🔄 场景1: immediate降级（Pro年付 → Basic月付）

### 时间线

| 时间节点 | 事件 | 说明 |
|---------|------|------|
| 2025-10-20 | 购买Pro年付 | 第1次充值800+赠送1920 |
| 2025-11-19 | 第1次积分到期 | 已全部消耗 |
| 2025-11-20 | 第2次充值 | 自动充值800积分（有效期30天，2025-12-20到期） |
| 2025-11-26 | **降级操作** | Pro年付 → Basic月付（immediate），冻结600积分 |
| 2025-12-20 | 第2次积分到期 | 冻结期间到期，剩余600扣除计入消耗（到期=消耗） |
| 2025-12-26 | 新订阅到期 | Basic月付到期，旧订阅解冻（新套餐30天后） |

### 初始状态（2025-11-26降级前）

#### 订阅信息
```javascript
{
  id: 'sub-pro-yearly',
  plan_tier: 'pro',
  billing_cycle: 'yearly',
  monthly_credits: 800,
  started_at: '2025-10-20T00:00:00Z',
  expires_at: '2026-10-20T00:00:00Z',
  remaining_refills: 10,  // 剩余10个月未激活
  next_refill_date: '2025-12-20T00:00:00Z',
  is_frozen: false,
  frozen_credits: 0,
  frozen_remaining_days: 0,
}
```

#### 积分交易流水
```javascript
[
  // 赠送积分（剩余1720，已消耗200）
  {
    id: 'tx-001-bonus',
    transaction_type: 'subscription_bonus',
    amount: 1920,
    expires_at: '2026-10-20T00:00:00Z',
    remaining_amount: 1720,
  },

  // 第1月充值（已全部消耗）
  {
    id: 'tx-002-month1',
    transaction_type: 'subscription_refill',
    amount: 800,
    expires_at: '2025-11-19T23:59:59Z',
    remaining_amount: 0,
  },

  // 第2月充值（剩余600，已消耗200）
  {
    id: 'tx-003-month2',
    transaction_type: 'subscription_refill',
    amount: 800,
    expires_at: '2025-12-20T00:00:00Z',
    remaining_amount: 600,
  },

  // 第1个月消耗1000（800从tx-002，200从tx-001）
  {
    id: 'tx-004-consume',
    transaction_type: 'text_to_image',
    amount: -1000,
  },

  // 第2个月消耗200（从tx-003）
  {
    id: 'tx-005-consume',
    transaction_type: 'image_to_image',
    amount: -200,
  },
]
```

#### 积分汇总
```javascript
{
  available_credits: 2320,  // 1720 + 600
  frozen_credits: 0,
  total_credits: 2320,
  total_earned: 3520,  // 1920 + 800 + 800
  total_consumed: 1200,  // 1000 + 200
}
```

### 降级操作（immediate模式）

**API调用：**
```json
POST /api/subscription/downgrade
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

**API执行逻辑：**

1. **检查是否有冻结订阅**
```typescript
const { data: frozenSubs } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_frozen', true)

if (frozenSubs && frozenSubs.length > 0) {
  return { error: 'FROZEN_SUBSCRIPTION_EXISTS' }
}
```

2. **计算需要冻结的积分（只算subscription_refill）**
```typescript
const { data: creditsToFreeze } = await supabase
  .rpc('get_subscription_actual_remaining_credits', {
    p_user_id: user.id,
    p_subscription_id: currentSub.id
  })
// creditsToFreeze = 600
```

3. **调用冻结函数（生成-600记录）**
```typescript
await supabase.rpc('freeze_subscription_credits_with_record', {
  p_user_id: user.id,
  p_subscription_id: currentSub.id,
  p_frozen_credits: 600,
  p_frozen_until: '2025-12-26T00:00:00Z',  // 新订阅到期时间
  p_reason: 'Immediate downgrade - 600 credits frozen'
})
```

4. **更新订阅记录**
```typescript
await supabase
  .from('user_subscriptions')
  .update({
    plan_tier: 'basic',
    billing_cycle: 'monthly',
    monthly_credits: 150,
    expires_at: '2025-12-26T00:00:00Z',
    adjustment_mode: 'immediate',
    original_plan_expires_at: '2026-10-20T00:00:00Z',
    is_frozen: true,
    freeze_start_time: '2025-11-26T00:00:00Z',
    frozen_credits: 600,
    frozen_remaining_days: 24,  // 公式：expires_at - downgrade_time = 2025-12-20 - 2025-11-26 = 24天
  })
  .eq('id', currentSub.id)
```

5. **充值新套餐积分**
```typescript
await supabase.from('credit_transactions').insert({
  user_id: user.id,
  transaction_type: 'subscription_refill',
  amount: 150,
  expires_at: '2025-12-26T00:00:00Z',
  description: 'Basic monthly refill',
})
```

### 降级后状态（2025-11-26）

#### 订阅信息
```javascript
{
  id: 'sub-pro-yearly',
  plan_tier: 'basic',  // ✅ 改为Basic
  billing_cycle: 'monthly',  // ✅ 改为月付
  monthly_credits: 150,
  started_at: '2025-10-20T00:00:00Z',  // 不变
  expires_at: '2025-12-26T00:00:00Z',  // ✅ 新套餐30天后（从2025-11-26开始）
  remaining_refills: 10,  // 保持不变
  next_refill_date: '2025-12-20T00:00:00Z',  // 保持不变（旧订阅延后）
  adjustment_mode: 'immediate',
  original_plan_expires_at: '2026-10-20T00:00:00Z',
  is_frozen: true,  // 🔥 冻结
  freeze_start_time: '2025-11-26T00:00:00Z',
  frozen_credits: 600,  // 🔥 冻结600积分
  frozen_remaining_days: 24,  // 🔥 冻结24天（2025-12-20 - 2025-11-26）
}
```

#### 积分交易流水（新增2条）
```javascript
[
  // ... 原有5条记录 ...

  // 🔥 冻结记录（-600）
  {
    id: 'tx-006-freeze',
    transaction_type: 'subscription_freeze',
    amount: -600,  // 负数
    related_entity_id: 'sub-pro-yearly',
    expires_at: '2025-12-26T00:00:00Z',  // frozen_until（新订阅到期时间）
    description: 'Immediate downgrade - 600 credits frozen until 2025-12-26',
  },

  // 🔥 Basic充值（+150）
  {
    id: 'tx-007-basic-refill',
    transaction_type: 'subscription_refill',
    amount: 150,
    expires_at: '2025-12-26T00:00:00Z',
    remaining_amount: 150,
    description: 'Basic monthly refill',
  },
]
```

#### 积分汇总
```javascript
{
  available_credits: 1870,  // 1720 + 150（600被冻结）
  frozen_credits: 600,
  total_credits: 2470,
  total_earned: 4070,  // 3520 + 150 - 600 = 4070  🔥
  total_consumed: 1200,
}
```

---

## 🔄 场景2: 续订延长冻结时间

### 场景描述
用户在2025-12-20续订Basic月付（新订阅还未到期）

### 续订前状态
```javascript
// 激活的Basic月付
{
  plan_tier: 'basic',
  billing_cycle: 'monthly',
  expires_at: '2025-12-26T00:00:00Z',
}

// 冻结的Pro年付
{
  id: 'sub-pro-yearly',
  is_frozen: true,
  frozen_credits: 600,
  frozen_remaining_days: 6,  // 还剩6天（12-26 - 12-20）
}

// 冻结记录
{
  id: 'tx-006-freeze',
  amount: -600,
  expires_at: '2025-12-26T00:00:00Z',  // frozen_until
}
```

### 续订操作

**API调用：**
```json
POST /api/subscription/renew
{
  "plan": "basic",
  "billingPeriod": "monthly"
}
```

**API执行逻辑：**

1. **延长当前订阅**
```typescript
const newExpiresAt = new Date('2025-12-26')
newExpiresAt.setDate(newExpiresAt.getDate() + 30)  // +30天

await supabase
  .from('user_subscriptions')
  .update({
    expires_at: '2026-01-25T00:00:00Z',  // 延长到2026-01-25
  })
  .eq('id', currentSub.id)
```

2. **🔥 自动延长冻结时间**
```typescript
await supabase.rpc('extend_frozen_subscription', {
  p_subscription_id: 'sub-pro-yearly',
  p_new_frozen_until: '2026-01-25T00:00:00Z',
})
```

### 续订后状态

```javascript
// 激活的Basic月付
{
  expires_at: '2026-01-25T00:00:00Z',  // ✅ 延长30天
}

// 冻结的Pro年付
{
  frozen_remaining_days: 36,  // ✅ 从6天延长到36天（+30天）
}

// 冻结记录（更新expires_at）
{
  id: 'tx-006-freeze',
  expires_at: '2026-01-25T00:00:00Z',  // ✅ 更新frozen_until
}
```

---

## 🔄 场景3: 同级别续订（Pro年付续订Pro年付）

### 续订前状态
```javascript
{
  plan_tier: 'pro',
  billing_cycle: 'yearly',
  started_at: '2025-10-20T00:00:00Z',
  expires_at: '2026-10-20T00:00:00Z',
  remaining_refills: 10,  // 剩余10个月
}
```

### 续订操作
```json
POST /api/subscription/renew
{
  "plan": "pro",
  "billingPeriod": "yearly"
}
```

### 续订后状态
```javascript
{
  plan_tier: 'pro',
  billing_cycle: 'yearly',
  started_at: '2025-10-20T00:00:00Z',  // 不变
  expires_at: '2027-10-20T00:00:00Z',  // ✅ 延长1年
  remaining_refills: 22,  // ✅ 增加12个月（10 + 12）
}
```

---

## 🚫 场景4: 有冻结订阅时禁止调整

### 场景描述
用户有冻结订阅时，尝试升级/降级

### 检测逻辑
```typescript
// app/api/subscription/upgrade 或 downgrade
const { data: frozenSubs } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_frozen', true)
  .limit(1)

if (frozenSubs && frozenSubs.length > 0) {
  const frozen = frozenSubs[0]
  return NextResponse.json({
    error: 'FROZEN_SUBSCRIPTION_EXISTS',
    message: '您有冻结的订阅，请等待解冻后再进行操作',
    frozen_subscription: {
      plan: frozen.plan_tier,
      billing: frozen.billing_cycle,
      frozen_credits: frozen.frozen_credits,
      frozen_remaining_days: frozen.frozen_remaining_days,
      estimated_unfreeze_date: calculateUnfreezeDate(frozen),
    },
  }, { status: 400 })
}
```

### 前端提示
```
❌ 操作失败

您有一个冻结的Pro年付订阅
- 冻结积分：600
- 冻结剩余天数：24天
- 预计解冻时间：2025-12-26

请等待冻结订阅自动解冻后再进行升级/降级操作
```

---

## 🔄 场景5: scheduled降级（Pro年付 → Basic月付）

### 降级操作（2025-11-16）
```json
POST /api/subscription/downgrade
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "scheduled"
}
```

### 降级后状态（2025-11-16）

**当前订阅保持不变：**
```javascript
{
  plan_tier: 'pro',  // 保持不变
  billing_cycle: 'yearly',
  expires_at: '2026-10-20T00:00:00Z',  // 保持不变
  adjustment_mode: 'scheduled',  // 🔥 记录降级计划
  downgrade_to_plan: 'basic',
  downgrade_to_billing_cycle: 'monthly',
  is_frozen: false,  // ❌ 不冻结
}
```

**积分不冻结，正常使用：**
- 第3-12个月继续按原计划充值
- 所有积分正常消耗

### 到期执行（2026-10-20）

**定时任务或Webhook检测到scheduled降级：**
```typescript
if (sub.adjustment_mode === 'scheduled' && sub.expires_at <= now) {
  // 1. 旧订阅标记为过期
  await supabase
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('id', sub.id)

  // 2. 创建新订阅
  await supabase.from('user_subscriptions').insert({
    user_id: sub.user_id,
    plan_tier: sub.downgrade_to_plan,
    billing_cycle: sub.downgrade_to_billing_cycle,
    started_at: now,
    expires_at: calculateExpiresAt(now, sub.downgrade_to_billing_cycle),
  })
}
```

---

## 🛠️ 数据库Schema修改

### 1. user_subscriptions 表新增字段

```sql
-- 冻结相关字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS frozen_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frozen_remaining_days INTEGER DEFAULT 0;

COMMENT ON COLUMN user_subscriptions.frozen_credits IS '冻结的积分数量';
COMMENT ON COLUMN user_subscriptions.frozen_remaining_days IS '冻结的剩余天数';
```

### 2. credit_transactions 新增类型

```sql
ALTER TABLE credit_transactions
DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions
ADD CONSTRAINT credit_transactions_transaction_type_check
CHECK (transaction_type IN (
  'register_bonus',
  'subscription_refill',
  'subscription_bonus',
  'package_purchase',
  'text_to_image',
  'image_to_image',
  'credit_expiry',
  'subscription_freeze',   -- 🔥 新增
  'subscription_unfreeze'  -- 🔥 新增
));
```

---

## 🛠️ RPC函数实现

### 1. 计算订阅剩余积分（只算月度充值）

```sql
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
      AND transaction_type = 'subscription_refill'
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND (expires_at IS NULL OR expires_at > NOW());

    RETURN GREATEST(total_remaining, 0);
END;
$$;
```

### 2. 冻结积分（生成-600记录）

```sql
CREATE OR REPLACE FUNCTION freeze_subscription_credits_with_record(
    p_user_id UUID,
    p_subscription_id UUID,
    p_frozen_credits INTEGER,
    p_frozen_until TIMESTAMPTZ,
    p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frozen_days INTEGER;
BEGIN
    -- 计算冻结天数
    v_frozen_days := CEIL(EXTRACT(EPOCH FROM (p_frozen_until - NOW())) / 86400);

    -- 更新订阅记录
    UPDATE user_subscriptions
    SET
        is_frozen = true,
        freeze_start_time = NOW(),
        frozen_credits = p_frozen_credits,
        frozen_remaining_days = v_frozen_days,
        updated_at = NOW()
    WHERE id = p_subscription_id
      AND user_id = p_user_id;

    -- 插入冻结记录（-600）
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        related_entity_type,
        related_entity_id,
        expires_at,
        description
    ) VALUES (
        p_user_id,
        'subscription_freeze',
        -p_frozen_credits,
        'subscription',
        p_subscription_id,
        p_frozen_until,
        p_reason
    );

    RETURN p_frozen_credits;
END;
$$;
```

### 3. 解冻积分（生成+600记录）

```sql
CREATE OR REPLACE FUNCTION unfreeze_subscription_credits_with_record(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frozen_credits INTEGER;
BEGIN
    -- 获取冻结积分数量
    SELECT frozen_credits INTO v_frozen_credits
    FROM user_subscriptions
    WHERE id = p_subscription_id
      AND user_id = p_user_id
      AND is_frozen = true;

    IF v_frozen_credits IS NULL OR v_frozen_credits = 0 THEN
        RETURN 0;
    END IF;

    -- 更新订阅记录
    UPDATE user_subscriptions
    SET
        is_frozen = false,
        freeze_start_time = NULL,
        frozen_credits = 0,
        frozen_remaining_days = 0,
        updated_at = NOW()
    WHERE id = p_subscription_id
      AND user_id = p_user_id;

    -- 插入解冻记录（+600）
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        related_entity_type,
        related_entity_id,
        description
    ) VALUES (
        p_user_id,
        'subscription_unfreeze',
        v_frozen_credits,
        'subscription',
        p_subscription_id,
        format('积分解冻 - %s积分解冻', v_frozen_credits)
    );

    RETURN v_frozen_credits;
END;
$$;
```

### 4. 延长冻结时间

```sql
CREATE OR REPLACE FUNCTION extend_frozen_subscription(
    p_subscription_id UUID,
    p_new_frozen_until TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_days INTEGER;
BEGIN
    -- 计算新的冻结天数
    v_new_days := CEIL(EXTRACT(EPOCH FROM (p_new_frozen_until - NOW())) / 86400);

    -- 更新冻结订阅的冻结天数
    UPDATE user_subscriptions
    SET
        frozen_remaining_days = v_new_days,
        updated_at = NOW()
    WHERE id = p_subscription_id
      AND is_frozen = true;

    -- 更新冻结记录的expires_at（frozen_until）
    UPDATE credit_transactions
    SET expires_at = p_new_frozen_until
    WHERE related_entity_id = p_subscription_id
      AND transaction_type = 'subscription_freeze'
      AND expires_at IS NOT NULL;
END;
$$;
```

---

## ✅ 测试验收标准

### 1. immediate降级测试
- [ ] 订阅字段正确更新（plan_tier, billing_cycle, expires_at）
- [ ] 订阅冻结字段正确（is_frozen=true, frozen_credits=600, frozen_remaining_days=24）
- [ ] 生成冻结记录（amount=-600）
- [ ] 生成新套餐充值记录（amount=150）
- [ ] 总获取积分计算正确（4070 = 3520 + 150 - 600）
- [ ] 可用积分计算正确（1870 = 1720 + 150）
- [ ] 冻结积分计算正确（600）

### 2. 续订延长冻结测试
- [ ] 新订阅expires_at延长30天
- [ ] 冻结订阅frozen_remaining_days增加30天
- [ ] 冻结记录expires_at更新到新的frozen_until

### 3. 同级别续订测试
- [ ] expires_at延长1年
- [ ] remaining_refills增加12

### 4. 冻结订阅限制测试
- [ ] 检测到冻结订阅时返回400错误
- [ ] 错误信息包含冻结详情

### 5. scheduled降级测试
- [ ] 订阅adjustment_mode='scheduled'
- [ ] 订阅不冻结（is_frozen=false）
- [ ] 积分不冻结
- [ ] downgrade_to_plan和downgrade_to_billing_cycle正确记录

---

## 📊 测试报告格式（新增章节）

### 第六部分：订阅冻结状态详情

#### 6.1 订阅冻结信息

| 字段 | 操作前 | 操作后 | 说明 |
|------|--------|--------|------|
| is_frozen | false | true | ✅ 订阅已冻结 |
| freeze_start_time | null | 2025-11-26T00:00:00Z | ✅ 冻结开始时间 |
| frozen_credits | 0 | 600 | ✅ 冻结积分数量 |
| frozen_remaining_days | 0 | 24 | ✅ 冻结剩余天数（2025-12-20 - 2025-11-26） |

#### 6.2 冻结/解冻记录

| 时间 | 类型 | 金额 | 说明 |
|------|------|------|------|
| 2025-11-26 | subscription_freeze | -600 | 降级冻结600积分 |
| 2025-12-26 | subscription_unfreeze | +600 | 自动解冻600积分 |

---

**生成时间**: 2025-11-16
**作者**: 老王（暴躁技术流）
**版本**: V4（完整版，包含所有场景）
