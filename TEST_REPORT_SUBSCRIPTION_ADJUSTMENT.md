# 订阅调整模式时间计算测试报告

**测试日期**: 2025-11-21（更新）
**测试人员**: AI Assistant + User (kn197884@gmail.com)
**测试环境**: Creem 测试环境 (creem_test_xxx)
**项目版本**: Git commit 010896e (修复4个关键BUG后)

---

## 📊 测试概览

**总场景数**: 9
**通过数**: 4 ✅
**失败数**: 0
**阻塞数**: 0 ✅ (已解除)
**跳过数**: 5

**已完成场景**（降级场景全部完成）：
- ✅ 场景2.1: 降级Immediate（Max→Basic）- 通过
- ✅ 场景2.2: 降级Scheduled（Max→Pro）- 通过
- ✅ 场景2.3: 降级Immediate（Pro Yearly→Basic Monthly）- 通过
- ✅ 场景2.4: 降级Scheduled（Max→Basic）- 通过

---

## ✅ 当前状态：数据库修复完成，4个降级场景全部通过

**修复完成**：
1. ✅ RPC函数已更新（添加降级字段）
2. ✅ 修复4个关键BUG：
   - 时间计算错误（immediate模式未加剩余天数）
   - 积分冻结API废弃（使用新API `freeze_subscription_credits_smart`）
   - API响应缺少 `newExpiresAt` 字段
   - immediate模式完成后未清除降级标记

**下一步**：
- 继续完成剩余5个测试场景（4个升级场景 + 1个边界情况）

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

### 场景 2.1: 降级 - Immediate 模式（Max → Basic）

**测试目标**: 验证降级时立即切换，剩余时间延续

**执行时间**: 2025-11-21 06:00

**前置数据**:
- 用户ID: bfb8182a-6865-4c66-a89e-05711796e2b2
- 订阅ID: 757e96be-66c7-4e2b-97e5-6965e1814713
- 当前订阅: Max Monthly
- 剩余天数: 21
- 当前过期时间: 2025-12-11T16:00:00+00:00

**执行操作**:
1. ✅ 浏览器Console执行降级API
2. ✅ 目标套餐: Basic Monthly
3. ✅ 调整模式: immediate

**降级 API 响应验证**:
```json
{
  "success": true,
  "currentPlan": "max",
  "targetPlan": "basic",
  "currentBillingCycle": "monthly",
  "targetBillingCycle": "monthly",
  "currentPeriodEnd": "2025-12-11T16:00:00+00:00",
  "effectiveDate": "2025-12-11T16:00:00+00:00",
  "newExpiresAt": "2026-01-11T05:59:48.840Z",  // ✅ 新增字段
  "adjustmentMode": "immediate",
  "originalPlanExpiresAt": "2025-12-11T16:00:00+00:00",
  "message": "降级已立即生效"
}
```

**数据库验证（immediate模式直接修改）**:
```sql
-- 检查订阅（immediate模式直接修改，无需支付）
SELECT
  plan_tier,
  billing_cycle,
  monthly_credits,
  expires_at,
  adjustment_mode,
  original_plan_expires_at
FROM user_subscriptions
WHERE id = '757e96be-66c7-4e2b-97e5-6965e1814713';

-- 实际结果 ✅:
-- plan_tier: 'basic'  ✅
-- billing_cycle: 'monthly'  ✅
-- monthly_credits: 150  ✅
-- expires_at: '2026-01-11T05:59:48.84+00:00'  ✅ (51天后)
-- adjustment_mode: 'immediate'  ✅
-- original_plan_expires_at: '2025-12-11T16:00:00+00:00'  ✅
```

**时间计算验证**:
```javascript
// 预期天数: 30 (新套餐月付) + 21 (剩余) = 51
// 实际天数: 51 ✅
// 新到期时间: 2026-01-11 ✅
// 计算正确: ✅ 通过
```

**积分冻结验证**（后台日志）:
```
🔍 [降级API] 冻结原套餐积分
实际剩余天数: 21  ✅
🔍 [降级API] 积分冻结结果: 1 条积分被冻结  ✅
✅ [降级API] 充值新套餐积分成功: 150  ✅
```

**修复的BUG**:
1. ✅ 时间计算错误：修复前只加30天，修复后正确加30+21=51天
2. ✅ 积分冻结API废弃：从 `freeze_subscription_credits` 改为 `freeze_subscription_credits_smart`
3. ✅ API响应缺少字段：增加 `newExpiresAt` 字段

**结论**: ✅ **通过**（所有验证点全绿）

---

### 场景 2.2: 降级 - Scheduled 模式（Max Monthly → Pro Monthly）

**执行时间**: 2025-11-21 06:45

**前置数据**:
- 用户ID: bfb8182a-6865-4c66-a89e-05711796e2b2
- 订阅ID: 757e96be-66c7-4e2b-97e5-6965e1814713
- 当前订阅: Max Monthly
- 剩余天数: 21
- 当前过期时间: 2025-12-11T16:00:00+00:00

**执行操作**:
1. ✅ 浏览器控制台执行降级API：
   ```javascript
   const response = await fetch('/api/subscription/downgrade', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       targetPlan: 'pro',
       billingPeriod: 'monthly',
       adjustmentMode: 'scheduled'
     })
   })
   ```

**降级API响应**:
```json
{
  "success": true,
  "currentPlan": "max",
  "targetPlan": "pro",
  "currentBillingCycle": "monthly",
  "targetBillingCycle": "monthly",
  "currentPeriodEnd": "2025-12-11T16:00:00+00:00",
  "effectiveDate": "2025-12-11T16:00:00+00:00",
  "newExpiresAt": null,
  "adjustmentMode": "scheduled",
  "originalPlanExpiresAt": null,
  "message": "降级已安排，将在当前订阅周期结束后生效"
}
```

**数据库验证** - 降级标记正确写入:
```sql
SELECT
  id, user_id, plan_tier, billing_cycle,
  adjustment_mode, remaining_days,
  downgrade_to_plan, downgrade_to_billing_cycle,
  expires_at, current_period_end
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

-- ✅ 验证结果：
-- plan_tier: max (未改变)
-- billing_cycle: monthly (未改变)
-- downgrade_to_plan: pro
-- downgrade_to_billing_cycle: monthly
-- adjustment_mode: scheduled
-- expires_at: 2025-12-11T16:00:00+00:00 (未改变)
```

**后端日志验证**:
```
🔥 [降级API] scheduled模式：只记录降级计划，不立即修改
✅ [降级API] 数据库更新结果:
影响行数: 1
更新后数据: {
  plan_tier: "max",               // ✅ 未改变
  billing_cycle: "monthly",       // ✅ 未改变
  downgrade_to_plan: "pro",       // ✅ 正确
  downgrade_to_billing_cycle: "monthly", // ✅ 正确
  adjustment_mode: "scheduled",   // ✅ 正确
  expires_at: "2025-12-11T16:00:00+00:00" // ✅ 未改变
}
```

**验证点汇总**:
- ✅ API返回状态200
- ✅ API响应包含正确的降级参数
- ✅ 数据库字段正确写入（downgrade_to_plan: pro, downgrade_to_billing_cycle: monthly）
- ✅ adjustment_mode = "scheduled"（后续调整模式）
- ✅ 当前套餐未改变（plan_tier: max）
- ✅ 到期时间未改变（expires_at: 2025-12-11T16:00:00+00:00）
- ✅ scheduled模式不立即生效，仅记录降级计划

**结论**: ✅ **通过**（所有验证点全绿）

---

### 场景 2.3: 降级 - Immediate 模式（Pro Yearly → Basic Monthly）

**执行时间**: 2025-11-21 07:06

**前置数据**:
- 用户ID: bfb8182a-6865-4c66-a89e-05711796e2b2
- 订阅ID: 757e96be-66c7-4e2b-97e5-6965e1814713
- 当前订阅: Pro Yearly
- 剩余天数: 21天（从2025-11-21到原到期时间2025-12-11）
- 当前过期时间: 2025-12-11T16:00:00+00:00

**执行操作**:
1. ✅ 浏览器控制台执行降级API：
   ```javascript
   const response = await fetch('/api/subscription/downgrade', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       targetPlan: 'basic',
       billingPeriod: 'monthly',
       adjustmentMode: 'immediate'
     })
   })
   const data = await response.json()
   console.log('API响应:', data)
   ```

**降级API响应**:
```json
{
  "success": true,
  "currentPlan": "pro",
  "targetPlan": "basic",
  "currentBillingCycle": "yearly",
  "targetBillingCycle": "monthly",
  "adjustmentMode": "immediate",
  "message": "降级立即生效"
}
```

**时间计算验证**（后端日志）:
```
原套餐: pro yearly
新套餐: basic monthly
新月度积分: 150
原到期时间: 2025-12-11T16:00:00+00:00
新到期时间: 2026-01-11T07:06:51.652Z
实际剩余天数: 21
```

**计算公式验证**:
- 剩余天数 = (原到期 - 现在) = (2025-12-11 - 2025-11-21) = 21天 ✅
- 新到期时间 = 现在 + 剩余天数 + 新周期天数 = 2025-11-21 + 21 + 30 = 2026-01-11 ✅

**数据库验证** - immediate模式立即生效:
```json
{
  "plan_tier": "basic",              // ✅ 立即改为basic
  "billing_cycle": "monthly",         // ✅ 立即改为monthly
  "monthly_credits": 150,             // ✅ 新套餐积分（Basic月付）
  "expires_at": "2026-01-11T07:06:51.652+00:00",  // ✅ 新到期时间
  "original_plan_expires_at": "2025-12-11T16:00:00+00:00",  // ✅ 记录原到期时间
  "downgrade_to_plan": null,          // ✅ 标记已清除
  "downgrade_to_billing_cycle": null, // ✅ 标记已清除
  "adjustment_mode": null             // ✅ 标记已清除
}
```

**积分冻结验证**（后端日志）:
```
🔍 [降级API] 冻结原套餐积分
订阅ID: 757e96be-66c7-4e2b-97e5-6965e1814713
冻结至: 2026-01-11T07:06:51.652Z
实际剩余天数: 21
🔍 [降级API] 积分冻结结果: 1 条积分被冻结
```

**新积分充值验证**（后端日志）:
```
🔍 [降级API] 充值新套餐积分
新套餐月度积分: 150
当前可用积分: 2040
✅ [降级API] 充值新套餐积分成功: 150
```

**降级标记清除验证**（后端日志）:
```
🔍 [降级API] 清除immediate模式的降级标记（已生效）
✅ [降级API] 降级标记已清除（immediate模式已生效）
```

**验证点汇总**:
- ✅ API返回状态200，success=true
- ✅ 套餐立即改变（plan_tier: pro → basic）
- ✅ 计费周期立即改变（billing_cycle: yearly → monthly）
- ✅ 剩余天数计算正确（21天）
- ✅ 新到期时间正确（原到期 + 剩余21天 + 新周期30天 = 51天后）
- ✅ 月度积分正确（150，符合Basic Monthly标准）
- ✅ 原套餐积分冻结成功（1条记录）
- ✅ 新套餐积分充值成功（150积分）
- ✅ 降级标记已清除（downgrade_to_plan, adjustment_mode全部null）
- ✅ 原到期时间记录正确（original_plan_expires_at）

**结论**: ✅ **通过**（所有验证点全绿，immediate模式完整功能正常）

---

### 场景 2.4: 降级 - Scheduled 模式（Max Monthly → Basic Monthly）

**执行时间**: 2025-11-21 05:40（首次阻塞），2025-11-21 05:50（验证通过）

**前置数据**:
- 用户ID: bfb8182a-6865-4c66-a89e-05711796e2b2
- 订阅ID: 757e96be-66c7-4e2b-97e5-6965e1814713
- 当前订阅: Max Monthly
- 剩余天数: 21
- 当前过期时间: 2025-12-11T16:00:00+00:00

**执行操作**:
1. ✅ 浏览器控制台执行降级API：
   ```javascript
   const response = await fetch('/api/subscription/downgrade', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       targetPlan: 'basic',
       billingPeriod: 'monthly',
       adjustmentMode: 'scheduled'
     })
   })
   const result = await response.json()
   console.log('API响应:', result)
   ```

**降级API响应**:
```json
{
  "success": true,
  "currentPlan": "max",
  "targetPlan": "basic",
  "currentBillingCycle": "monthly",
  "targetBillingCycle": "monthly",
  "currentPeriodEnd": "2025-12-11T16:00:00+00:00",
  "effectiveDate": "2025-12-11T16:00:00+00:00",
  "adjustmentMode": "scheduled",
  "originalPlanExpiresAt": null,
  "message": "降级已安排，将在当前订阅周期结束后生效"
}
```

**数据库验证** - 降级标记正确写入:
```sql
SELECT
  id, user_id, plan_tier, billing_cycle,
  adjustment_mode, remaining_days,
  downgrade_to_plan, downgrade_to_billing_cycle,
  expires_at, current_period_end
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

-- ✅ 验证结果：
-- downgrade_to_plan: basic
-- downgrade_to_billing_cycle: monthly
-- adjustment_mode: scheduled
-- remaining_days: 21
```

**RPC 函数验证** - `get_user_active_subscription` 正确返回降级字段:
```javascript
const response = await fetch('/api/subscription/status')
const data = await response.json()
console.log('降级目标套餐:', data.subscription?.downgrade_to_plan) // ✅ "basic"
console.log('降级计费周期:', data.subscription?.downgrade_to_billing_cycle) // ✅ "monthly"
console.log('调整模式:', data.subscription?.adjustment_mode) // ✅ "scheduled"
console.log('剩余天数:', data.subscription?.remaining_days) // ✅ 21
```

**后端日志验证**:
```
🔥 老王查降级套餐开始...
✅ 活跃订阅数据: {
  id: "757e96be-66c7-4e2b-97e5-6965e1814713",
  plan_tier: "max",
  billing_cycle: "monthly",
  downgrade_to_plan: "basic",          // ✅ 正确
  downgrade_to_billing_cycle: "monthly", // ✅ 正确
  adjustment_mode: "scheduled",         // ✅ 正确
  remaining_days: 21,                   // ✅ 正确
  current_period_end: "2025-12-11T16:00:00+00:00"
}
✅ 降级标记设置成功: { count: 1 }
```

**问题发现与修复** (2025-11-09阻塞问题):
❌ **原始阻塞问题**：RPC函数 `get_user_active_subscription` 只返回8个字段，缺少降级字段
✅ **修复措施**：
1. 执行数据库迁移 `supabase/migrations/20251109000002_update_rpc_add_downgrade_fields.sql`
2. 更新RPC函数 `RETURNS TABLE` 定义，添加降级字段
3. 验证通过（2025-11-21 05:50）

**验证点汇总**:
- ✅ API返回状态200
- ✅ API响应包含正确的降级参数
- ✅ 数据库字段正确写入（downgrade_to_plan, downgrade_to_billing_cycle）
- ✅ RPC函数正确返回降级字段
- ✅ adjustment_mode = "scheduled"（后续调整模式）
- ✅ 原订阅到期时间未改变（scheduled模式不立即生效）
- ✅ 剩余天数计算正确（21天）

**结论**: ✅ **通过**（RPC修复完成，所有验证点全绿）

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
