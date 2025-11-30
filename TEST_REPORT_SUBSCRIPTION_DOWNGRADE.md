# 订阅调整功能自动化测试报告 - 降级场景

**测试日期**: 2025-11-16
**测试框架**: Vitest 4.0.6
**API**: POST /api/subscription/downgrade
**测试用例数**: 4
**通过用例**: 4
**失败用例**: 0

---

## 场景 2.1: 降级 Immediate（Pro → Basic，月付→月付）

### 初始状态（测试前）

**订阅页面数据：**
| 字段 | 值 |
|------|-----|
| plan_tier | "pro" |
| billing_cycle | "monthly" |
| monthly_credits | 500 |
| expires_at | "2025-12-09T00:00:00Z" |
| downgrade_to_plan | null |
| downgrade_to_billing_cycle | null |
| adjustment_mode | null |
| original_plan_expires_at | null |
| remaining_days | 23 |

**积分页面数据：**
| 字段 | 值 |
|------|-----|
| available_credits | 500 |
| frozen_credits | 0 |
| total_credits | 500 |

### 执行操作

**API端点**: POST /api/subscription/downgrade

**请求参数**:
```json
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

**执行时间**: 2025-11-16T00:00:00.000Z

### 预期结果 vs 实际结果

**订阅页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| plan_tier | "pro" | "basic" | "basic" | ✅ 通过 |
| billing_cycle | "monthly" | "monthly" | "monthly" | ✅ 通过 |
| monthly_credits | 500 | 150 | 150 | ✅ 通过 |
| expires_at | "2025-12-09T00:00:00Z" | "2025-12-09T00:00:00Z" | "2025-12-09T00:00:00Z" | ✅ 通过 |
| downgrade_to_plan | null | null | null | ✅ 通过 |
| downgrade_to_billing_cycle | null | null | null | ✅ 通过 |
| adjustment_mode | null | "immediate" | "immediate" | ✅ 通过 |
| original_plan_expires_at | null | "2025-12-09T00:00:00Z" | "2025-12-09T00:00:00Z" | ✅ 通过 |
| remaining_days | 23 | 23 | 23 | ✅ 通过 |

**积分页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| available_credits | 500 | 150 | 150 | ✅ 通过 |
| frozen_credits | 0 | 500 | 500 | ✅ 通过 |
| total_credits | 500 | 650 | 650 | ✅ 通过 |

### 业务逻辑验证

- ✅ **套餐变化逻辑**: 立即从Pro降级到Basic
- ✅ **积分变化逻辑**: 原500积分冻结，新充值150积分

### 总体结果

✅ **场景测试通过**

---

## 场景 2.2: 降级 Scheduled（Max → Pro，年付→年付）

### 初始状态（测试前）

**订阅页面数据：**
| 字段 | 值 |
|------|-----|
| plan_tier | "max" |
| billing_cycle | "yearly" |
| monthly_credits | 2000 |
| expires_at | "2026-11-09T00:00:00Z" |
| downgrade_to_plan | null |
| downgrade_to_billing_cycle | null |
| adjustment_mode | null |
| original_plan_expires_at | null |
| remaining_days | 358 |

**积分页面数据：**
| 字段 | 值 |
|------|-----|
| available_credits | 2000 |
| frozen_credits | 0 |
| total_credits | 2000 |

### 执行操作

**API端点**: POST /api/subscription/downgrade

**请求参数**:
```json
{
  "targetPlan": "pro",
  "billingPeriod": "yearly",
  "adjustmentMode": "scheduled"
}
```

**执行时间**: 2025-11-16T00:00:00.000Z

### 预期结果 vs 实际结果

**订阅页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| plan_tier | "max" | "max" | "max" | ✅ 通过 |
| billing_cycle | "yearly" | "yearly" | "yearly" | ✅ 通过 |
| monthly_credits | 2000 | 2000 | 2000 | ✅ 通过 |
| expires_at | "2026-11-09T00:00:00Z" | "2026-11-09T00:00:00Z" | "2026-11-09T00:00:00Z" | ✅ 通过 |
| downgrade_to_plan | null | "pro" | "pro" | ✅ 通过 |
| downgrade_to_billing_cycle | null | "yearly" | "yearly" | ✅ 通过 |
| adjustment_mode | null | "scheduled" | "scheduled" | ✅ 通过 |
| original_plan_expires_at | null | null | null | ✅ 通过 |
| remaining_days | 358 | 358 | 358 | ✅ 通过 |

**积分页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| available_credits | 2000 | 2000 | 2000 | ✅ 通过 |
| frozen_credits | 0 | 0 | 0 | ✅ 通过 |
| total_credits | 2000 | 2000 | 2000 | ✅ 通过 |

### 业务逻辑验证

- ✅ **套餐不立即变化**: scheduled模式，仅记录降级计划
- ✅ **积分不立即变化**: scheduled模式下积分保持不变

### 总体结果

✅ **场景测试通过**

---

## 场景 2.3: 降级 Immediate（Pro → Basic，年付→月付，跨周期降级）

### 初始状态（测试前）

**订阅页面数据：**
| 字段 | 值 |
|------|-----|
| plan_tier | "pro" |
| billing_cycle | "yearly" |
| monthly_credits | 500 |
| expires_at | "2026-11-03T00:00:00Z" |
| downgrade_to_plan | null |
| downgrade_to_billing_cycle | null |
| adjustment_mode | null |
| original_plan_expires_at | null |
| remaining_days | 352 |

**积分页面数据：**
| 字段 | 值 |
|------|-----|
| available_credits | 500 |
| frozen_credits | 0 |
| total_credits | 500 |

### 执行操作

**API端点**: POST /api/subscription/downgrade

**请求参数**:
```json
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate"
}
```

**执行时间**: 2025-11-16T00:00:00.000Z

### 预期结果 vs 实际结果

**订阅页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| plan_tier | "pro" | "basic" | "basic" | ✅ 通过 |
| billing_cycle | "yearly" | "monthly" | "monthly" | ✅ 通过 |
| monthly_credits | 500 | 150 | 150 | ✅ 通过 |
| expires_at | "2026-11-03T00:00:00Z" | "2026-11-03T00:00:00Z" | "2026-11-03T00:00:00Z" | ✅ 通过 |
| downgrade_to_plan | null | null | null | ✅ 通过 |
| downgrade_to_billing_cycle | null | null | null | ✅ 通过 |
| adjustment_mode | null | "immediate" | "immediate" | ✅ 通过 |
| original_plan_expires_at | null | "2026-11-03T00:00:00Z" | "2026-11-03T00:00:00Z" | ✅ 通过 |
| remaining_days | 352 | 352 | 352 | ✅ 通过 |

**积分页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| available_credits | 500 | 150 | 150 | ✅ 通过 |
| frozen_credits | 0 | 500 | 500 | ✅ 通过 |
| total_credits | 500 | 650 | 650 | ✅ 通过 |

### 业务逻辑验证

- ✅ **跨周期降级逻辑**: 从年付降级到月付，到期时间保持不变
- ✅ **积分变化逻辑**: 原500积分冻结，新充值150积分

### 总体结果

✅ **场景测试通过**

---

## 场景 2.4: 降级 Scheduled（Pro → Basic，年付→月付，跨周期降级）

### 初始状态（测试前）

**订阅页面数据：**
| 字段 | 值 |
|------|-----|
| plan_tier | "pro" |
| billing_cycle | "yearly" |
| monthly_credits | 500 |
| expires_at | "2026-11-03T00:00:00Z" |
| downgrade_to_plan | null |
| downgrade_to_billing_cycle | null |
| adjustment_mode | null |
| original_plan_expires_at | null |
| remaining_days | 352 |

**积分页面数据：**
| 字段 | 值 |
|------|-----|
| available_credits | 500 |
| frozen_credits | 0 |
| total_credits | 500 |

### 执行操作

**API端点**: POST /api/subscription/downgrade

**请求参数**:
```json
{
  "targetPlan": "basic",
  "billingPeriod": "monthly",
  "adjustmentMode": "scheduled"
}
```

**执行时间**: 2025-11-16T00:00:00.000Z

### 预期结果 vs 实际结果

**订阅页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| plan_tier | "pro" | "pro" | "pro" | ✅ 通过 |
| billing_cycle | "yearly" | "yearly" | "yearly" | ✅ 通过 |
| monthly_credits | 500 | 500 | 500 | ✅ 通过 |
| expires_at | "2026-11-03T00:00:00Z" | "2026-11-03T00:00:00Z" | "2026-11-03T00:00:00Z" | ✅ 通过 |
| downgrade_to_plan | null | "basic" | "basic" | ✅ 通过 |
| downgrade_to_billing_cycle | null | "monthly" | "monthly" | ✅ 通过 |
| adjustment_mode | null | "scheduled" | "scheduled" | ✅ 通过 |
| original_plan_expires_at | null | null | null | ✅ 通过 |
| remaining_days | 352 | 352 | 352 | ✅ 通过 |

**积分页面变化：**
| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |
|------|--------|--------|--------|----------|
| available_credits | 500 | 500 | 500 | ✅ 通过 |
| frozen_credits | 0 | 0 | 0 | ✅ 通过 |
| total_credits | 500 | 500 | 500 | ✅ 通过 |

### 业务逻辑验证

- ✅ **跨周期scheduled降级**: 记录降级计划，套餐和积分都不立即变化
- ✅ **降级计划记录正确**: downgrade_to_plan=basic, downgrade_to_billing_cycle=monthly

### 总体结果

✅ **场景测试通过**

---

## 测试结论

✅ **所有场景测试通过**

- ✅ 所有4个降级场景测试通过
- ✅ 业务逻辑验证正确
- ✅ 订阅页面数据变化符合预期
- ✅ 积分页面数据变化符合预期
- ✅ Immediate模式：立即生效，冻结旧积分，充值新积分
- ✅ Scheduled模式：仅记录降级计划，不立即生效


