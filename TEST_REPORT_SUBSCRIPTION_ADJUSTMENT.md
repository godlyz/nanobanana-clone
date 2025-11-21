# 订阅调整模式时间计算测试报告

**测试日期**: 2025-11-09
**测试人员**: AI Assistant + User (kn197884@gmail.com)
**测试环境**: Creem 测试环境 (creem_test_xxx)
**项目版本**: Git commit 8f3e756

---

## 📊 测试概览

**总场景数**: 9
**通过数**: 0
**失败数**: 0
**阻塞数**: 1 (场景 2.4 - 待数据库修复后验证)
**跳过数**: 8

---

## ⚠️ 当前状态：测试阻塞

**阻塞原因**：Supabase RPC 函数缺少降级字段

**问题描述**：
- 降级API调用成功，但降级标记未写入数据库
- 根本原因：`get_user_active_subscription` RPC函数未返回降级相关字段
- 已创建修复迁移：`supabase/migrations/20251109000002_update_rpc_add_downgrade_fields.sql`

**待执行操作**：
1. 在 Supabase Dashboard 执行 RPC 更新迁移SQL
2. 验证降级数据能否正确返回
3. 继续完成剩余8个测试场景

---

## 测试用户信息

**User ID**: bfb8182a-6865-4c66-a89e-05711796e2b2
**Email**: kn197884@gmail.com
**当前订阅**:
- 订阅ID: aeb9d519-e9d5-43ca-ae1c-808a2d84ec5b
- 套餐: Pro Yearly
- 开始时间: 2025-10-26
- 到期时间: 2026-10-26
- 剩余天数: 352

---

## ✅ 第一组：升级场景（4个）

### 场景 1.1: 升级 - Immediate 模式（月付 → 月付）

**测试目标**: 验证升级时立即切换，剩余天数延续到新订阅结束后

**执行时间**: [填写时间]

**前置数据**:
- 用户ID: [填写]
- 当前订阅ID: [填写]
- 当前订阅: Basic Monthly
- 剩余天数: 15
- 当前过期时间: [填写，格式：2025-11-24T00:00:00Z]

**执行操作**:
1. 访问 `/profile` 页面
2. 点击"升级套餐"
3. 选择 Pro Monthly
4. 选择"即时调整"模式
5. 完成 Creem 支付流程

**API 请求验证**:
```json
// 升级 API 请求参数（从 Network 面板复制）
{
  "targetPlan": "pro",
  "billingPeriod": "monthly",
  "adjustmentMode": "immediate",
  "remainingDays": 15
}
```

**Creem Checkout Metadata**:
```json
// 从 Network 面板复制
{
  "action": "upgrade",
  "adjustment_mode": "immediate",
  "remaining_days": "15"
}
```

**实际结果**:
- 新订阅ID: [填写]
- 新订阅计划: [填写]
- 新订阅创建时间: [填写]
- 新订阅过期时间: [填写]
- adjustment_mode: [填写]
- remaining_days: [填写]

**时间计算验证**:
```javascript
// 在浏览器 Console 中执行
const createdAt = new Date('[新订阅创建时间]')
const expiresAt = new Date('[新订阅过期时间]')
const diffMs = expiresAt - createdAt
const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
console.log(`实际订阅天数: ${diffDays}`)
console.log(`预期天数: 30 + 15 = 45`)
console.log(`计算正确: ${diffDays === 45 ? '✅' : '❌'}`)
```

**数据库查询结果**:
```sql
-- 在 Supabase SQL Editor 中执行
SELECT
  id,
  plan_tier,
  billing_cycle,
  created_at,
  expires_at,
  adjustment_mode,
  remaining_days
FROM user_subscriptions
WHERE user_id = '[你的用户ID]'
ORDER BY created_at DESC
LIMIT 2;

-- 结果粘贴在这里：
```

**结论**: ⬜ 通过 / ⬜ 失败

**问题记录**:
- [如有问题，详细描述]

**截图**:
- [附加截图路径或描述]

---

### 场景 1.2: 升级 - Scheduled 模式（月付 → 年付）

**测试目标**: 验证升级时等待当前周期结束，不影响现有订阅

**执行时间**: [填写时间]

**前置数据**:
- 用户ID: [填写]
- 当前订阅ID: [填写]
- 当前订阅: Basic Monthly
- 剩余天数: 20
- 当前过期时间: [填写]

**执行操作**:
1. 访问 `/profile` 页面
2. 点击"升级套餐"
3. 选择 Pro Yearly
4. 选择"后续调整"模式
5. 完成支付流程

**API 请求验证**:
```json
{
  "targetPlan": "pro",
  "billingPeriod": "yearly",
  "adjustmentMode": "scheduled",
  "remainingDays": 20
}
```

**实际结果**:
- 新订阅ID: [填写]
- 新订阅计划: [填写]
- 新订阅创建时间: [填写]
- 新订阅过期时间: [填写]
- adjustment_mode: [填写]
- remaining_days: [填写]
- 旧订阅过期时间（应不变）: [填写]

**时间计算验证**:
```javascript
const createdAt = new Date('[新订阅创建时间]')
const expiresAt = new Date('[新订阅过期时间]')
const diffDays = Math.ceil((expiresAt - createdAt) / (1000 * 60 * 60 * 24))
console.log(`实际订阅天数: ${diffDays}`)
console.log(`预期天数: 365（不包含剩余20天）`)
console.log(`计算正确: ${diffDays === 365 ? '✅' : '❌'}`)
```

**数据库查询结果**:
```sql
-- 查询结果粘贴在这里
```

**结论**: ⬜ 通过 / ⬜ 失败

**问题记录**: [填写]

---

### 场景 1.3: 升级 - Immediate 模式（年付 → 年付）

**测试目标**: 验证长周期订阅的时间延续

**执行时间**: [填写时间]

**前置数据**:
- 用户ID: [填写]
- 当前订阅: Pro Yearly
- 剩余天数: 100
- 当前过期时间: [填写]

**执行操作**:
1. 升级到 Max Yearly
2. 选择"即时调整"
3. 完成支付

**时间计算验证**:
```javascript
// 预期天数: 365 + 100 = 465
const diffDays = Math.ceil((expiresAt - createdAt) / (1000 * 60 * 60 * 24))
console.log(`实际: ${diffDays}, 预期: 465, 正确: ${diffDays === 465 ? '✅' : '❌'}`)
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 1.4: 升级 - Scheduled 模式（月付 → 月付）

**测试目标**: 验证同周期升级的 Scheduled 模式

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Basic Monthly
- 剩余天数: 8

**执行操作**:
1. 升级到 Pro Monthly
2. 选择"后续调整"
3. 完成支付

**时间计算验证**:
```javascript
// 预期天数: 30（独立计算，不包含8天）
```

**结论**: ⬜ 通过 / ⬜ 失败

---

## ✅ 第二组：降级场景（4个）

### 场景 2.1: 降级 - Immediate 模式（Pro → Basic）

**测试目标**: 验证降级时立即切换，剩余时间延续

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Pro Monthly
- 剩余天数: 12

**执行操作**:
1. 点击"降级套餐"
2. 选择 Basic Monthly
3. 选择"即时调整"
4. **重要**: 完成降级支付流程

**降级 API 响应验证**:
```json
{
  "success": true,
  "currentPlan": "pro",
  "targetPlan": "basic",
  "adjustmentMode": "immediate",
  "remainingDays": 12
}
```

**数据库验证（降级设置后）**:
```sql
-- 检查旧订阅的降级标记
SELECT
  plan_tier,
  downgrade_to_plan,
  downgrade_to_billing_cycle,
  adjustment_mode,
  remaining_days
FROM user_subscriptions
WHERE id = '[旧订阅ID]';

-- 预期结果:
-- plan_tier: 'pro'
-- downgrade_to_plan: 'basic'
-- adjustment_mode: 'immediate'
-- remaining_days: 12
```

**数据库验证（支付完成后）**:
```sql
-- 检查新订阅
SELECT
  plan_tier,
  billing_cycle,
  created_at,
  expires_at,
  adjustment_mode,
  remaining_days
FROM user_subscriptions
WHERE user_id = '[你的用户ID]'
ORDER BY created_at DESC
LIMIT 1;

-- 预期结果:
-- plan_tier: 'basic'
-- expires_at: 创建时间 + 30 + 12 = 42天
-- adjustment_mode: NULL
-- remaining_days: NULL
```

**时间计算验证**:
```javascript
// 预期天数: 30 + 12 = 42
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 2.2: 降级 - Scheduled 模式（Max → Pro）

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Max Yearly
- 剩余天数: 90

**执行操作**:
1. 降级到 Pro Yearly
2. 选择"后续调整"
3. **注意**: Scheduled 模式不需要立即支付

**数据库验证**:
```sql
SELECT
  plan_tier,
  downgrade_to_plan,
  adjustment_mode,
  remaining_days,
  expires_at
FROM user_subscriptions
WHERE id = '[订阅ID]';

-- 预期结果:
-- downgrade_to_plan: 'pro'
-- adjustment_mode: 'scheduled'
-- remaining_days: 90
-- expires_at: 不变
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 2.3: 降级 - Immediate 模式（年付 → 月付）

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Pro Yearly
- 剩余天数: 200

**时间计算验证**:
```javascript
// 预期天数: 30 + 200 = 230
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 2.4: 降级 - Scheduled 模式（Pro Yearly → Basic Monthly）

**执行时间**: 2025-11-09 11:30

**前置数据**:
- 用户ID: bfb8182a-6865-4c66-a89e-05711796e2b2
- 当前订阅: Pro Yearly
- 剩余天数: 352
- 当前过期时间: 2026-10-26

**执行操作**:
1. ✅ 访问 `/profile` 页面
2. ✅ 点击"降级套餐"按钮
3. ✅ 选择 Basic Monthly
4. ✅ 选择"后续调整（Scheduled）"模式
5. ✅ 点击确认

**降级API响应**:
- HTTP状态: 200 OK
- 降级操作成功（API层面）

**问题发现**:
❌ **阻塞问题**：降级标记未写入数据库

**问题分析**:
1. 前端查询 `/api/subscription/status` 返回降级字段全为 `null`
2. 服务端日志显示 Supabase RPC 函数只返回8个字段：
   - `id`, `plan_tier`, `billing_cycle`, `status`, `started_at`, `expires_at`, `next_refill_at`, `monthly_credits`
3. **缺少降级字段**：
   - `adjustment_mode`
   - `remaining_days`
   - `downgrade_to_plan`
   - `downgrade_to_billing_cycle`

**根本原因**:
- RPC函数 `get_user_active_subscription` 的 `RETURNS TABLE` 定义中缺少降级字段
- 虽然数据库表已添加字段，但RPC函数未更新

**已采取修复措施**:
1. ✅ 修复数据库迁移文件（补全降级字段）
2. ✅ 修复 `/api/subscription/status` 返回对象
3. ✅ 创建 RPC 函数更新迁移：`supabase/migrations/20251109000002_update_rpc_add_downgrade_fields.sql`
4. ⏳ **待执行**：在 Supabase Dashboard 执行 RPC 更新迁移

**结论**: 🟡 **阻塞 - 待数据库修复后重新验证**

**下次继续步骤**:
1. 执行 RPC 更新迁移SQL
2. 刷新页面
3. 验证降级标记是否正确设置：
   ```javascript
   const response = await fetch('/api/subscription/status')
   const data = await response.json()
   console.log('降级目标套餐:', data.subscription?.downgrade_to_plan) // 应为 "basic"
   console.log('降级计费周期:', data.subscription?.downgrade_to_billing_cycle) // 应为 "monthly"
   console.log('调整模式:', data.subscription?.adjustment_mode) // 应为 "scheduled"
   console.log('剩余天数:', data.subscription?.remaining_days) // 应为 352
   ```

---

## ✅ 第三组：边界情况（3个）

### 场景 3.1: 剩余天数为 0

**测试目标**: 验证当天到期时的处理

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Basic Monthly（今天到期）
- 剩余天数: 0

**时间计算验证**:
```javascript
// 预期天数: 30 + 0 = 30（不延长）
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 3.2: 剩余天数 > 365

**测试目标**: 验证长周期订阅的处理

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Max Yearly
- 剩余天数: 400

**时间计算验证**:
```javascript
// 预期天数: 365 + 400 = 765
```

**结论**: ⬜ 通过 / ⬜ 失败

---

### 场景 3.3: 降级后续订

**测试目标**: 验证续订时应用降级计划

**执行时间**: [填写时间]

**前置数据**:
- 当前订阅: Pro Monthly（已过期）
- 降级计划: Basic Monthly（已设置）

**执行操作**:
1. 点击"续订订阅"
2. 确认续订并支付

**续订 API 响应验证**:
```json
{
  "plan": "basic",  // 应该使用降级后的计划
  "wasDowngraded": true
}
```

**数据库验证**:
```sql
SELECT
  plan_tier,
  downgrade_to_plan,
  adjustment_mode,
  remaining_days
FROM user_subscriptions
WHERE user_id = '[你的用户ID]'
ORDER BY created_at DESC
LIMIT 1;

-- 预期结果:
-- plan_tier: 'basic'（使用降级后的计划）
-- downgrade_to_plan: NULL（已清除）
-- adjustment_mode: NULL
-- remaining_days: NULL
```

**结论**: ⬜ 通过 / ⬜ 失败

---

## 📋 测试总结

### 通过的场景
- [ ] 场景 1.1: 升级 Immediate（月付 → 月付）
- [ ] 场景 1.2: 升级 Scheduled（月付 → 年付）
- [ ] 场景 1.3: 升级 Immediate（年付 → 年付）
- [ ] 场景 1.4: 升级 Scheduled（月付 → 月付）
- [ ] 场景 2.1: 降级 Immediate（Pro → Basic）
- [ ] 场景 2.2: 降级 Scheduled（Max → Pro）
- [ ] 场景 2.3: 降级 Immediate（年付 → 月付）
- [ ] 场景 2.4: 降级 Scheduled（月付 → 月付）
- [ ] 场景 3.1: 剩余天数为 0
- [ ] 场景 3.2: 剩余天数 > 365
- [ ] 场景 3.3: 降级后续订

### 发现的问题

#### 问题 1: [问题标题]
- **严重程度**: 高 / 中 / 低
- **场景**: [哪个场景发现的]
- **现象**: [详细描述]
- **预期结果**: [应该是什么]
- **实际结果**: [实际是什么]
- **复现步骤**: [如何复现]
- **建议修复**: [修复建议]

---

## 🎯 验收结论

- [ ] ✅ 所有测试通过，可以上线
- [ ] ⚠️ 部分测试失败，需要修复
- [ ] ❌ 严重问题，不可上线

**最终结论**: [填写总结]

---

**测试完成时间**: [填写]
**报告生成时间**: 2025-11-09
