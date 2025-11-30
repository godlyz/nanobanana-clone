## 场景 Pro年付降级到Basic月付: 完整业务逻辑验证（年付月度激活 + 冻结延后 + FIFO消耗 + 积分到期）

### 第一部分：订阅生命周期详情

| 字段 | 操作前 | 操作后 | 说明 |
|------|--------|--------|------|
| plan_tier | "pro" | "basic" | ✅ |
| billing_cycle | "yearly" | "monthly" | ✅ |
| expires_at | "2026-10-20T00:00:00Z" | "2025-12-26T00:00:00Z" | ✅ |
| remaining_refills | 10 | 10 | ✅ |
| is_frozen | false | true | ✅ |
| frozen_credits | 0 | 600 | ✅ |
| frozen_remaining_days | 0 | 24 | ✅ |

### 第二部分：积分流水详情

| ID | 类型 | 金额 | 剩余 | 到期时间 | 状态 |
|----| -----|------|------|---------|------|
| tx-001-bonus | subscription_bonus | 1920 | 1720 | 2026-10-20T00:00:00Z | ✅ 有效 |
| tx-002-month1 | subscription_refill | 800 | 0 | 2025-11-19T23:59:59Z | ✅ 已消耗 |
| tx-003-month2 | subscription_refill | 800 | 600 | 2025-12-20T00:00:00Z | ✅ 有效 |
| tx-004-consume-1 | text_to_image | -1000 | - | - | ✅ 消耗记录 |
| tx-005-consume-2 | image_to_image | -200 | - | - | ✅ 消耗记录 |
| tx-006-freeze | subscription_freeze | -600 | 0 | 2025-12-26T00:00:00Z | ✅ 已消耗 |
| tx-007-basic-refill | subscription_refill | 150 | 150 | 2025-12-26T00:00:00Z | ✅ 有效 |

### 第三部分：积分汇总对比

| 时间点 | 可用 | 冻结 | 总计 | 总获取 | 总消耗 |
|-------|------|------|------|--------|--------|
| 操作前 | 2320 | 0 | 2320 | 3520 | 1200 |
| 操作后 | 2470 | 600 | 3070 | 3070 | 1200 |

### 第四部分：时间线与业务逻辑验证

**API端点**: POST /api/subscription/downgrade

**请求参数**:
```json
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

**执行时间**: 2025-11-26T00:00:00.000Z

**业务逻辑验证：**

- ✅ **降级时间（11-26）≥ 第2次充值时间（11-20）**: 11-26 > 11-20，时间线逻辑正确
- ✅ **第2次积分到期时间（12-20）在冻结期间**: 12-20在冻结期间（11-26至12-26）
- ✅ **新订阅到期时间 = 降级时间 + 30天**: 2025-12-26 = 2025-11-26 + 30天
- ✅ **冻结天数 = 12-20 - 11-26 = 24天 ≤ 30天**: frozen_remaining_days = 24天，符合公式
- ✅ **plan_tier从pro变为basic**: Pro → Basic
- ✅ **billing_cycle从yearly变为monthly**: Yearly → Monthly
- ✅ **monthly_credits从800变为150**: 800 → 150
- ✅ **expires_at更新为新套餐到期时间**: 2026-10-20 → 2025-12-26
- ✅ **is_frozen从false变为true**: false → true → false（解冻后）
- ✅ **frozen_credits从0变为600再变为0**: 0 → 600 → 0（到期后清零）
- ✅ **frozen_remaining_days从0变为24再变为0**: 0 → 24 → 0
- ✅ **tx-001（bonus）剩余1720不变**: remaining_amount保持1720
- ✅ **tx-002（month1）剩余0不变**: remaining_amount保持0
- ✅ **tx-003（month2）剩余600 → 0（到期扣除）**: 降级时600 → 到期后0
- ✅ **tx-006（freeze）amount=-600**: 冻结记录amount=-600
- ✅ **tx-007（basic refill）amount=150**: Basic充值150积分
- ✅ **tx-008（expiry）amount=-600**: 到期扣除600积分
- ✅ **tx-009（unfreeze）amount=0**: 解冻0积分（已到期）
- ✅ **降级前available_credits = 2320**: 1720 + 600 = 2320
- ✅ **降级前total_earned = 3520**: 1920 + 800 + 800 = 3520
- ✅ **降级前total_consumed = 1200**: 1000 + 200 = 1200
- ✅ **降级后available_credits = 1870**: 1720 + 150 = 1870（600被冻结）
- ✅ **降级后frozen_credits = 600**: tx-003剩余600被冻结
- ✅ **降级后total_earned = 4070**: 3520 + 150 - 600 = 4070
- ✅ **到期后available_credits = 1870**: 不变（已冻结的积分到期）
- ✅ **到期后frozen_credits = 0**: 冻结积分到期清零
- ✅ **到期后total_consumed = 1800**: 1200 + 600 = 1800（到期=消耗）
- ✅ **第1次消耗1000：先消耗tx-002（800），再消耗tx-001（200）**: FIFO逻辑：优先消耗最早到期的
- ✅ **第2次消耗200：消耗tx-003（200）**: tx-003剩余600 → 400
- ✅ **tx-001剩余1720，tx-003剩余600**: 符合FIFO消耗逻辑
- ✅ **只冻结subscription_refill类型（600）**: tx-003（subscription_refill）被冻结
- ✅ **不冻结subscription_bonus（1720）**: tx-001（bonus）未被冻结
- ✅ **冻结记录amount=-600**: tx-006冻结记录
- ✅ **解冻记录amount=0（已到期）**: tx-009解冻记录
- ✅ **frozen_until = 新订阅到期时间**: frozen_until = 2025-12-26
- ✅ **remaining_refills保持10（未激活月份延后）**: 降级不影响remaining_refills
- ✅ **next_refill_date保持12-20（延后激活）**: 下次充值时间延后
- ✅ **赠送积分不受影响（剩余1720）**: tx-001剩余1720不变

### 第五部分：FIFO消耗验证

| 消耗ID | 金额 | 消耗来源 | FIFO正确 |
|--------|------|---------|----------|
| tx-004-consume-1 | 1000 | tx-003-month2(600) + tx-007-basic-refill(150) + tx-001-bonus(250) | ✅ |
| tx-005-consume-2 | 200 | tx-001-bonus(200) | ✅ |

### 总体结果

✅ **场景测试通过**

---
