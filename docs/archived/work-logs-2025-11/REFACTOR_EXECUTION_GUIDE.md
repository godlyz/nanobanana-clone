# 🔥 老王积分系统重构 - 执行指南

## 📋 重构概述

本次重构实现了完整的**按包消费**和**时间冻结**机制，包括：

1. **包追踪字段**：`remaining_amount`, `consumed_from_id`, `frozen_remaining_seconds`, `original_expires_at`
2. **FIFO 消费策略**：优先消耗最早过期的积分包
3. **智能消费函数**：`consume_credits_smart()` 自动按包扣减
4. **自动解冻机制**：PostgreSQL `pg_cron` 定时任务
5. **条件延长冻结时间**：即时调整延长，后续调整不延长

---

## ✅ 已完成的工作

### 1. 测试环境恢复 ✅
- 订阅：Pro yearly（1年有效期）
- 可用积分：2697（800 refill + 1920 bonus - 23 consumed）
- 状态：干净，无冻结记录

### 2. 数据库改造 SQL ✅
创建了 4 个 migration 文件：

#### 文件 1: `20251111000008_add_package_tracking.sql`
- 添加 `remaining_amount INTEGER` - 每个包的实际剩余积分
- 添加 `consumed_from_id UUID` - 消费记录关联到具体的包
- 添加 `frozen_remaining_seconds INTEGER` - 冻结时的剩余秒数
- 添加 `original_expires_at TIMESTAMPTZ` - 原始过期时间备份
- 初始化现有记录：`remaining_amount = amount`（正数记录）
- 创建性能优化索引

#### 文件 2: `20251111000009_auto_unfreeze_function.sql`
- 安装 `pg_cron` 扩展
- 创建 `auto_unfreeze_credits()` 函数
- 设置每小时执行一次的定时任务
- 自动计算新过期时间：`NOW() + frozen_remaining_seconds`

#### 文件 3: `20251111000010_smart_consumption.sql`
- 创建 `consume_credits_smart()` 函数（FIFO 消费策略）
- 更新 `get_user_available_credits()` 使用 `remaining_amount`
- 按包扣减，创建消费记录并关联 `consumed_from_id`

#### 文件 4: `20251111000011_conditional_freeze_extension.sql`
- 创建 `extend_frozen_credits_if_immediate()` 函数
- 更新 `freeze_subscription_credits_smart()` 记录剩余秒数
- 条件延长冻结时间：即时=TRUE，后续=FALSE

### 3. Webhook 逻辑修改 ✅
- 在 `/app/api/webhooks/creem/route.ts` 中添加调用 `extend_frozen_credits_if_immediate()`
- upgrade/downgrade 都传 `p_is_immediate: true`

---

## 🚀 执行步骤（用户操作）

### 步骤 1：在 Supabase Dashboard 执行 SQL

**⚠️ 重要：必须按顺序执行，不能跳过或颠倒！**

#### 1.1 打开 Supabase Dashboard
1. 访问：https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧菜单 **SQL Editor**

#### 1.2 执行 SQL 文件（按顺序）

**第 1 个文件：添加包追踪字段**

```sql
-- 📄 supabase/migrations/20251111000008_add_package_tracking.sql
-- 复制整个文件内容，粘贴到 SQL Editor，点击 Run

-- =====================================================
-- 🔥 老王重构：添加包追踪字段，支持按包消费和时间冻结
-- 创建时间: 2025-11-11
-- 用途：
--   1. remaining_amount - 记录每个积分包的实际剩余
--   2. consumed_from_id - 消费记录关联到具体的包
--   3. frozen_remaining_seconds - 冻结时的剩余秒数
--   4. original_expires_at - 原始过期时间（备份，用于计算）
-- =====================================================

-- ... （复制完整文件内容）
```

**预期输出：**
```
Success. No rows returned
```

---

**第 2 个文件：安装 pg_cron 和自动解冻函数**

```sql
-- 📄 supabase/migrations/20251111000009_auto_unfreeze_function.sql
-- 复制整个文件内容，粘贴到 SQL Editor，点击 Run

-- ⚠️ 注意：如果 pg_cron 安装失败，需要在 Supabase Dashboard 的 Database Settings 中启用

-- ... （复制完整文件内容）
```

**预期输出：**
```
Success. No rows returned
或
NOTICE: ⏰ [auto_unfreeze] pg_cron 定时任务已设置：每小时执行一次
```

---

**第 3 个文件：智能消费函数**

```sql
-- 📄 supabase/migrations/20251111000010_smart_consumption.sql
-- 复制整个文件内容，粘贴到 SQL Editor，点击 Run

-- ... （复制完整文件内容）
```

**预期输出：**
```
Success. No rows returned
```

---

**第 4 个文件：条件延长冻结时间函数**

```sql
-- 📄 supabase/migrations/20251111000011_conditional_freeze_extension.sql
-- 复制整个文件内容，粘贴到 SQL Editor，点击 Run

-- ... （复制完整文件内容）
```

**预期输出：**
```
Success. No rows returned
```

---

### 步骤 2：验证 SQL 执行结果

在 SQL Editor 中执行以下查询，验证所有字段和函数都已创建：

```sql
-- 验证字段是否添加成功
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'credit_transactions'
  AND column_name IN ('remaining_amount', 'consumed_from_id', 'frozen_remaining_seconds', 'original_expires_at')
ORDER BY column_name;

-- 预期输出：4 行记录
-- consumed_from_id | uuid
-- frozen_remaining_seconds | integer
-- original_expires_at | timestamp with time zone
-- remaining_amount | integer
```

```sql
-- 验证函数是否创建成功
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'consume_credits_smart',
    'get_user_available_credits',
    'auto_unfreeze_credits',
    'extend_frozen_credits_if_immediate',
    'freeze_subscription_credits_smart'
  )
ORDER BY routine_name;

-- 预期输出：5 行记录
-- auto_unfreeze_credits
-- consume_credits_smart
-- extend_frozen_credits_if_immediate
-- freeze_subscription_credits_smart
-- get_user_available_credits
```

```sql
-- 验证 pg_cron 定时任务是否创建成功
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'auto_unfreeze_credits_hourly';

-- 预期输出：1 行记录
-- jobname: auto_unfreeze_credits_hourly
-- schedule: 0 * * * *
-- command: SELECT auto_unfreeze_credits()
```

---

### 步骤 3：测试 Webhook（发送 Max monthly 升级）

#### 3.1 打开 Creem Dashboard
1. 访问：https://creem.io/dashboard
2. 找到 **Max monthly** 的订单
3. 点击订单详情

#### 3.2 重新发送 Webhook
1. 找到 **Webhooks** 或 **重新发送** 按钮
2. 点击重新发送 Webhook

#### 3.3 查看 Next.js 日志
在你的终端中（`pnpm dev` 运行的窗口），应该看到以下日志：

```
🔍 [冻结计算] 升级前可用积分: 2697
🔍 [冻结计算] Bonus积分总额: 1920
🔍 [冻结计算] 老套餐实际剩余: 777 (2697 - 1920)
🧊 检测到升级，开始冻结原订阅积分...
🔍 [冻结执行] 将冻结 777 积分
✅ 原订阅积分已冻结 1 条记录，将在 2027-10-27T... 解冻
🔄 [条件延长] 调用 extend_frozen_credits_if_immediate，即时模式=TRUE
✅ 已延长 1 条冻结记录的冻结时间
```

---

### 步骤 4：验证最终结果

在 SQL Editor 中执行以下查询，验证积分状态：

```sql
-- 查询可用积分
SELECT get_user_available_credits('bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID);

-- 预期输出：3920
-- 计算：1920 (bonus) + 2000 (Max monthly) = 3920
```

```sql
-- 查询所有积分记录
SELECT
    id,
    transaction_type,
    amount,
    remaining_amount,
    is_frozen,
    frozen_until,
    frozen_remaining_seconds,
    expires_at,
    description
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID
  AND amount > 0
ORDER BY created_at DESC
LIMIT 5;

-- 预期输出：
-- 1. Max monthly refill: 2000 积分，remaining_amount=2000
-- 2. Pro yearly frozen: 777 积分，remaining_amount=777，is_frozen=TRUE
-- 3. Bonus: 1920 积分，remaining_amount=1920
```

```sql
-- 验证冻结记录的详细信息
SELECT
    amount,
    remaining_amount,
    is_frozen,
    frozen_until,
    frozen_remaining_seconds,
    original_expires_at,
    expires_at
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID
  AND is_frozen = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- 预期输出：
-- amount: 777
-- remaining_amount: 777
-- is_frozen: TRUE
-- frozen_until: 2027-10-27T... (Max monthly 到期时间)
-- frozen_remaining_seconds: ~31536000 (大约1年的秒数)
-- original_expires_at: 2026-11-11T... (Pro yearly 原过期时间)
-- expires_at: 2028-10-27T... (frozen_until + 1年)
```

---

## 🎉 成功标准

所有以下条件都满足时，重构才算成功：

1. ✅ 可用积分 = **3920**（1920 bonus + 2000 Max monthly）
2. ✅ 冻结积分 = **777**（Pro yearly 实际剩余）
3. ✅ 冻结时间延长至 **2027-10-27**（Max monthly 到期时间）
4. ✅ `frozen_remaining_seconds` ≈ **31536000**（约1年）
5. ✅ 所有 SQL 函数都能正常调用，无错误
6. ✅ `pg_cron` 定时任务已设置并运行

---

## ⚠️ 常见问题

### Q1: pg_cron 安装失败怎么办？

**A1**: 在 Supabase Dashboard 的 **Database Settings** → **Extensions** 中手动启用 `pg_cron` 扩展。

### Q2: SQL 执行报错 "function does not exist"？

**A2**: 确保按顺序执行 SQL 文件，不能跳过或颠倒。如果跳过了，回到第 1 个文件重新执行。

### Q3: 冻结积分数量不对（不是 777）？

**A3**: 检查测试环境是否恢复到 Pro yearly 状态，可用积分应该是 2697。如果不对，重新运行 `pnpm tsx scripts/restore-clean-state.ts`。

### Q4: Webhook 日志没有显示冻结相关信息？

**A4**: 检查 `pnpm dev` 是否在运行，并且 Creem Dashboard 发送的是 **Max monthly** 订单的 Webhook。

### Q5: 验证查询没有返回预期结果？

**A5**: 等待 1-2 分钟，确保所有异步操作完成。然后重新运行验证查询。

---

## 📞 联系方式

如果遇到任何问题，请提供以下信息：

1. SQL 执行的错误信息（完整的）
2. Webhook 日志（完整的）
3. 验证查询的实际输出

---

**🔥 老王温馨提示：**
- 别tm着急，一步一步来！
- SQL 执行顺序不能错！
- 看清楚预期输出，别瞎猜！
- 遇到报错别慌，先看错误信息再说！

---

**最后更新：2025-11-11**
