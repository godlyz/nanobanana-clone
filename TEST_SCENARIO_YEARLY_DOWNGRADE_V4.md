# 年付订阅降级测试场景设计 V4（修正版）

> **目的**：基于修正后的业务逻辑（SUBSCRIPTION_ADJUSTMENT_COMPLETE_LOGIC_V4.md），设计完整的年付订阅降级测试场景，包含正确的时间线、积分到期消耗、冻结机制验证。

---

## 📅 测试场景时间线（修正版）

### 关键时间节点

| 时间节点 | 事件 | 业务逻辑 | 验证点 |
|---------|------|---------|--------|
| **2025-10-20 00:00** | 购买Pro年付 | 第1次充值800+赠送1920 | 初始状态建立 |
| **2025-11-19 23:59** | 第1次积分到期 | 800积分已全部消耗 | 到期扣除剩余积分 |
| **2025-11-20 00:00** | 第2次充值 | 自动充值800积分（30天有效期） | 月度激活机制 |
| **2025-11-20 ~ 2025-11-25** | 正常消耗 | 消耗200积分（FIFO：从tx-003） | FIFO逻辑验证 |
| **2025-11-26 00:00** | 🔥 降级操作 | Pro年付 → Basic月付（immediate） | 核心测试场景 |
| **2025-11-26 00:00** | 冻结600积分 | 生成-600冻结记录 | 冻结记录验证 |
| **2025-11-26 00:00** | 充值150积分 | Basic月付首次充值 | 新套餐激活 |
| **2025-12-20 00:00** | 第2次积分到期 | 冻结期间到期，600积分扣除 | 到期=消耗验证 |
| **2025-12-26 00:00** | 🔥 新订阅到期 | Basic月付到期，旧订阅解冻 | 解冻机制验证 |
| **2025-12-26 00:00** | 解冻600积分 | 生成+600解冻记录 | 解冻记录验证 |

---

## 📊 完整测试场景Mock数据

### 场景1: Pro年付降级到Basic月付（immediate模式）

#### Step 1: 初始状态（2025-11-26降级前）

**订阅信息**：
```typescript
{
  id: 'sub-001-pro-yearly',
  user_id: 'user-test-001',
  plan_tier: 'pro',
  billing_cycle: 'yearly',
  monthly_credits: 800,
  started_at: '2025-10-20T00:00:00Z',
  expires_at: '2026-10-20T00:00:00Z',
  remaining_refills: 10,  // 剩余10个月未激活
  next_refill_date: '2025-12-20T00:00:00Z',
  is_active: true,
  is_frozen: false,
  frozen_credits: 0,
  frozen_remaining_days: 0,
}
```

**积分交易流水**（降级前）：
```typescript
[
  // tx-001: 赠送积分（剩余1720，已消耗200）
  {
    id: 'tx-001-bonus',
    user_id: 'user-test-001',
    transaction_type: 'subscription_bonus',
    amount: 1920,
    remaining_amount: 1720,  // 已消耗200
    related_entity_type: 'subscription',
    related_entity_id: 'sub-001-pro-yearly',
    expires_at: '2026-10-20T00:00:00Z',  // 1年有效期
    created_at: '2025-10-20T00:00:00Z',
    description: 'Pro yearly subscription bonus',
  },

  // tx-002: 第1月充值（已全部消耗）
  {
    id: 'tx-002-month1',
    user_id: 'user-test-001',
    transaction_type: 'subscription_refill',
    amount: 800,
    remaining_amount: 0,  // 已全部消耗
    related_entity_type: 'subscription',
    related_entity_id: 'sub-001-pro-yearly',
    expires_at: '2025-11-19T23:59:59Z',  // 30天后
    created_at: '2025-10-20T00:00:00Z',
    description: 'Pro yearly month 1 refill',
  },

  // tx-003: 第2月充值（剩余600，已消耗200）
  {
    id: 'tx-003-month2',
    user_id: 'user-test-001',
    transaction_type: 'subscription_refill',
    amount: 800,
    remaining_amount: 600,  // 已消耗200
    related_entity_type: 'subscription',
    related_entity_id: 'sub-001-pro-yearly',
    expires_at: '2025-12-20T00:00:00Z',  // 30天后
    created_at: '2025-11-20T00:00:00Z',
    description: 'Pro yearly month 2 refill',
  },

  // tx-004: 第1个月消耗1000（800从tx-002，200从tx-001）
  {
    id: 'tx-004-consume-1',
    user_id: 'user-test-001',
    transaction_type: 'text_to_image',
    amount: -1000,
    created_at: '2025-11-10T12:00:00Z',
    description: 'Text to image generation',
  },

  // tx-005: 第2个月消耗200（从tx-003）
  {
    id: 'tx-005-consume-2',
    user_id: 'user-test-001',
    transaction_type: 'image_to_image',
    amount: -200,
    created_at: '2025-11-25T14:00:00Z',
    description: 'Image to image transformation',
  },
]
```

**积分汇总**（降级前）：
```typescript
{
  available_credits: 2320,  // 1720 + 600
  frozen_credits: 0,
  total_credits: 2320,
  total_earned: 3520,  // 1920 + 800 + 800
  total_consumed: 1200,  // 1000 + 200
}
```

#### Step 2: 降级操作（2025-11-26 00:00）

**API调用**：
```typescript
POST /api/subscription/downgrade
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

**预期执行逻辑**：

1. ✅ 检查是否有冻结订阅（无）
2. ✅ 计算需要冻结的积分：600（只算subscription_refill类型）
3. ✅ 调用`freeze_subscription_credits_with_record`（生成-600记录）
4. ✅ 更新订阅记录（is_frozen=true, frozen_credits=600, frozen_remaining_days=24）
5. ✅ 充值新套餐积分150

#### Step 3: 降级后状态（2025-11-26 00:00）

**订阅信息**（降级后）：
```typescript
{
  id: 'sub-001-pro-yearly',
  user_id: 'user-test-001',
  plan_tier: 'basic',  // ✅ 改为Basic
  billing_cycle: 'monthly',  // ✅ 改为月付
  monthly_credits: 150,
  started_at: '2025-10-20T00:00:00Z',  // 不变
  expires_at: '2025-12-26T00:00:00Z',  // ✅ 新套餐30天后
  remaining_refills: 10,  // 保持不变（旧订阅延后）
  next_refill_date: '2025-12-20T00:00:00Z',  // 保持不变
  adjustment_mode: 'immediate',
  original_plan_expires_at: '2026-10-20T00:00:00Z',
  is_frozen: true,  // 🔥 冻结
  freeze_start_time: '2025-11-26T00:00:00Z',
  frozen_credits: 600,  // 🔥 冻结600积分
  frozen_remaining_days: 24,  // 🔥 冻结24天（2025-12-20 - 2025-11-26）
}
```

**新增积分交易流水**：
```typescript
[
  // ... 原有5条记录 ...

  // tx-006: 🔥 冻结记录（-600）
  {
    id: 'tx-006-freeze',
    user_id: 'user-test-001',
    transaction_type: 'subscription_freeze',
    amount: -600,  // 负数
    remaining_amount: 0,
    related_entity_type: 'subscription',
    related_entity_id: 'sub-001-pro-yearly',
    expires_at: '2025-12-26T00:00:00Z',  // frozen_until（新订阅到期时间）
    created_at: '2025-11-26T00:00:00Z',
    description: 'Immediate downgrade - 600 credits frozen until 2025-12-26',
  },

  // tx-007: 🔥 Basic充值（+150）
  {
    id: 'tx-007-basic-refill',
    user_id: 'user-test-001',
    transaction_type: 'subscription_refill',
    amount: 150,
    remaining_amount: 150,
    related_entity_type: 'subscription',
    related_entity_id: 'sub-001-pro-yearly',
    expires_at: '2025-12-26T00:00:00Z',
    created_at: '2025-11-26T00:00:00Z',
    description: 'Basic monthly refill',
  },
]
```

**积分汇总**（降级后）：
```typescript
{
  available_credits: 1870,  // 1720 + 150（600被冻结）
  frozen_credits: 600,
  total_credits: 2470,
  total_earned: 4070,  // 3520 + 150 - 600 = 4070  🔥
  total_consumed: 1200,
}
```

#### Step 4: 积分到期（2025-12-20 00:00）

**预期行为**：
- tx-003（第2月充值）的600积分到期
- 由于处于冻结状态，600积分直接扣除计入消耗
- 生成`credit_expiry`类型的交易记录

**新增交易记录**：
```typescript
{
  id: 'tx-008-expiry',
  user_id: 'user-test-001',
  transaction_type: 'credit_expiry',
  amount: -600,  // 到期扣除
  related_entity_type: 'subscription',
  related_entity_id: 'sub-001-pro-yearly',
  created_at: '2025-12-20T00:00:00Z',
  description: 'Pro yearly month 2 credits expired (frozen)',
}
```

**积分汇总**（到期后）：
```typescript
{
  available_credits: 1870,  // 不变（已冻结的积分到期）
  frozen_credits: 0,  // ✅ 冻结积分清零（已到期）
  total_credits: 1870,
  total_earned: 4070,  // 不变
  total_consumed: 1800,  // 1200 + 600（到期=消耗）
}
```

#### Step 5: 解冻操作（2025-12-26 00:00）

**预期行为**：
- 新订阅到期，触发自动解冻
- 调用`unfreeze_subscription_credits_with_record`
- 由于冻结的600积分已在12-20到期，实际解冻0积分
- 仍需生成解冻记录（+0）

**新增交易记录**：
```typescript
{
  id: 'tx-009-unfreeze',
  user_id: 'user-test-001',
  transaction_type: 'subscription_unfreeze',
  amount: 0,  // 🔥 已到期，解冻0积分
  related_entity_type: 'subscription',
  related_entity_id: 'sub-001-pro-yearly',
  created_at: '2025-12-26T00:00:00Z',
  description: '积分解冻 - 0积分解冻（已到期）',
}
```

**订阅信息**（解冻后）：
```typescript
{
  id: 'sub-001-pro-yearly',
  is_frozen: false,  // ✅ 解冻
  freeze_start_time: null,
  frozen_credits: 0,
  frozen_remaining_days: 0,
}
```

---

## ✅ 测试验证点（完整清单）

### 1. 时间线验证

- [ ] 降级时间（11-26）≥ 第2次充值时间（11-20）
- [ ] 第2次积分到期时间（12-20）在冻结期间
- [ ] 新订阅到期时间（12-26）= 降级时间 + 30天
- [ ] 冻结天数 = 12-20 - 11-26 = 24天 ≤ 30天

### 2. 订阅字段验证

- [ ] plan_tier: 'pro' → 'basic'
- [ ] billing_cycle: 'yearly' → 'monthly'
- [ ] monthly_credits: 800 → 150
- [ ] expires_at: '2026-10-20' → '2025-12-26'
- [ ] is_frozen: false → true → false
- [ ] frozen_credits: 0 → 600 → 0
- [ ] frozen_remaining_days: 0 → 24 → 0

### 3. 积分交易流水验证

- [ ] tx-001（bonus）：剩余1720不变
- [ ] tx-002（month1）：剩余0不变
- [ ] tx-003（month2）：剩余600 → 0（到期扣除）
- [ ] tx-006（freeze）：amount=-600，expires_at=2025-12-26
- [ ] tx-007（basic refill）：amount=150，expires_at=2025-12-26
- [ ] tx-008（expiry）：amount=-600（到期扣除）
- [ ] tx-009（unfreeze）：amount=0（已到期）

### 4. 积分汇总验证

**降级前**：
- [ ] available_credits: 2320 = 1720 + 600
- [ ] total_earned: 3520 = 1920 + 800 + 800
- [ ] total_consumed: 1200 = 1000 + 200

**降级后**：
- [ ] available_credits: 1870 = 1720 + 150
- [ ] frozen_credits: 600
- [ ] total_earned: 4070 = 3520 + 150 - 600
- [ ] total_consumed: 1200（不变）

**到期后**：
- [ ] available_credits: 1870（不变）
- [ ] frozen_credits: 0
- [ ] total_consumed: 1800 = 1200 + 600

### 5. FIFO消耗验证

- [ ] 第1次消耗1000：先消耗tx-002（800），再消耗tx-001（200）
- [ ] 第2次消耗200：消耗tx-003（200）
- [ ] tx-001剩余1720，tx-003剩余600
- [ ] 到期时tx-003剩余600全部扣除

### 6. 冻结/解冻机制验证

- [ ] 只冻结subscription_refill类型（600）
- [ ] 不冻结subscription_bonus（1720）
- [ ] 冻结记录amount=-600
- [ ] 解冻记录amount=0（已到期）
- [ ] frozen_until = 新订阅到期时间

### 7. 年付月度激活验证

- [ ] remaining_refills保持10（未激活月份延后）
- [ ] next_refill_date保持12-20（延后激活）
- [ ] 赠送积分不受影响（剩余1720）

---

## 📝 测试报告格式（5个部分）

### 第一部分：订阅生命周期详情

| 字段 | 操作前 | 操作后 | 到期后 | 解冻后 | 说明 |
|------|--------|--------|--------|--------|------|
| plan_tier | pro | basic | basic | basic | ✅ |
| billing_cycle | yearly | monthly | monthly | monthly | ✅ |
| expires_at | 2026-10-20 | 2025-12-26 | 2025-12-26 | 2025-12-26 | ✅ |
| remaining_refills | 10 | 10 | 10 | 10 | ✅ 延后 |
| is_frozen | false | true | true | false | ✅ |
| frozen_credits | 0 | 600 | 0 | 0 | ✅ |
| frozen_remaining_days | 0 | 24 | 0 | 0 | ✅ |

### 第二部分：积分流水详情

| ID | 类型 | 金额 | 剩余 | 到期时间 | 状态 |
|----|------|------|------|---------|------|
| tx-001 | subscription_bonus | 1920 | 1720 | 2026-10-20 | ✅ 有效 |
| tx-002 | subscription_refill | 800 | 0 | 2025-11-19 | ✅ 已消耗 |
| tx-003 | subscription_refill | 800 | 600 → 0 | 2025-12-20 | ✅ 到期扣除 |
| tx-006 | subscription_freeze | -600 | 0 | 2025-12-26 | ✅ 冻结记录 |
| tx-007 | subscription_refill | 150 | 150 | 2025-12-26 | ✅ 新套餐 |
| tx-008 | credit_expiry | -600 | 0 | - | ✅ 到期消耗 |
| tx-009 | subscription_unfreeze | 0 | 0 | - | ✅ 解冻记录 |

### 第三部分：积分汇总对比

| 时间点 | 可用 | 冻结 | 总计 | 总获取 | 总消耗 |
|-------|------|------|------|--------|--------|
| 降级前 | 2320 | 0 | 2320 | 3520 | 1200 |
| 降级后 | 1870 | 600 | 2470 | 4070 | 1200 |
| 到期后 | 1870 | 0 | 1870 | 4070 | 1800 |
| 解冻后 | 1870 | 0 | 1870 | 4070 | 1800 |

### 第四部分：时间线与业务逻辑

| 时间 | 事件 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| 10-20 | 购买Pro年付 | 1920+800 | 1920+800 | ✅ |
| 11-19 | 第1次到期 | 0剩余 | 0剩余 | ✅ |
| 11-20 | 第2次充值 | +800 | +800 | ✅ |
| 11-26 | 降级操作 | 冻结600 | 冻结600 | ✅ |
| 12-20 | 第2次到期 | 扣除600 | 扣除600 | ✅ |
| 12-26 | 解冻操作 | 解冻0 | 解冻0 | ✅ |

### 第五部分：FIFO消耗验证

| 消耗ID | 金额 | 消耗来源 | 消耗后剩余 | FIFO正确 |
|--------|------|---------|-----------|---------|
| tx-004 | -1000 | tx-002(800) + tx-001(200) | tx-002(0), tx-001(1720) | ✅ |
| tx-005 | -200 | tx-003(200) | tx-003(600) | ✅ |
| tx-008 | -600 | tx-003(600)到期 | tx-003(0) | ✅ |

---

## 🎯 下一步工作

1. ✅ **设计完成**：测试场景时间线和Mock数据
2. ⏭️ **重写测试工具类v4**：支持积分到期消耗、冻结/解冻记录
3. ⏭️ **重写测试代码**：基于新场景实现完整测试
4. ⏭️ **生成测试报告V3**：包含5个部分的完整验证

---

**生成时间**: 2025-11-16
**作者**: 老王（暴躁技术流）
**版本**: V4（基于修正后的业务逻辑）
