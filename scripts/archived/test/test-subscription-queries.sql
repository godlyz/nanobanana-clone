-- 🔥 老王的订阅测试数据库查询脚本
-- 使用方法：在 Supabase SQL Editor 中执行

-- ============================================================
-- 1️⃣ 检查数据库迁移是否已运行
-- ============================================================

-- 检查 adjustment_mode 和 remaining_days 字段是否存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
  AND column_name IN ('adjustment_mode', 'remaining_days', 'downgrade_to_plan', 'downgrade_to_billing_cycle')
ORDER BY column_name;

-- 预期结果：应该返回 4 行数据
-- adjustment_mode | text | YES
-- remaining_days | integer | YES
-- downgrade_to_plan | text | YES
-- downgrade_to_billing_cycle | text | YES


-- ============================================================
-- 2️⃣ 查询当前用户的所有订阅（最近 3 条）
-- ============================================================

-- 🔥 将 'YOUR_USER_ID' 替换为你的实际用户ID
SELECT
  id,
  user_id,
  plan_tier,
  billing_cycle,
  status,
  created_at,
  expires_at,
  -- 🔥 新增字段
  adjustment_mode,
  remaining_days,
  downgrade_to_plan,
  downgrade_to_billing_cycle,
  -- 计算剩余天数
  CASE
    WHEN expires_at > NOW() THEN
      EXTRACT(DAY FROM (expires_at - NOW()))
    ELSE
      0
  END AS current_remaining_days,
  -- 计算订阅总天数
  EXTRACT(DAY FROM (expires_at - created_at)) AS total_days
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 3;


-- ============================================================
-- 3️⃣ 查询特定订阅的详细信息
-- ============================================================

-- 🔥 将 'SUBSCRIPTION_ID' 替换为实际订阅ID
SELECT
  id,
  user_id,
  plan_tier,
  billing_cycle,
  status,
  created_at AT TIME ZONE 'UTC' AS created_at_utc,
  expires_at AT TIME ZONE 'UTC' AS expires_at_utc,
  adjustment_mode,
  remaining_days,
  downgrade_to_plan,
  downgrade_to_billing_cycle,
  -- 时间计算验证
  expires_at - created_at AS subscription_duration,
  EXTRACT(DAY FROM (expires_at - created_at)) AS subscription_days,
  EXTRACT(HOUR FROM (expires_at - created_at)) AS subscription_hours,
  -- 剩余时间计算
  CASE
    WHEN expires_at > NOW() THEN
      expires_at - NOW()
    ELSE
      INTERVAL '0'
  END AS time_remaining,
  CASE
    WHEN expires_at > NOW() THEN
      EXTRACT(DAY FROM (expires_at - NOW()))
    ELSE
      0
  END AS days_remaining
FROM user_subscriptions
WHERE id = 'SUBSCRIPTION_ID';


-- ============================================================
-- 4️⃣ 验证 Immediate 模式的时间计算
-- ============================================================

-- 场景：升级 Immediate 模式，检查新订阅是否正确延长时间
-- 🔥 将下面的参数替换为实际值
WITH test_data AS (
  SELECT
    'NEW_SUBSCRIPTION_ID' AS new_sub_id,
    30 AS base_period_days,  -- 月付=30，年付=365
    15 AS old_remaining_days -- 旧订阅剩余天数
)
SELECT
  s.id,
  s.plan_tier,
  s.billing_cycle,
  s.created_at,
  s.expires_at,
  s.adjustment_mode,
  s.remaining_days,
  -- 计算实际订阅天数
  EXTRACT(DAY FROM (s.expires_at - s.created_at)) AS actual_days,
  -- 计算预期天数
  t.base_period_days + t.old_remaining_days AS expected_days,
  -- 验证是否正确
  CASE
    WHEN EXTRACT(DAY FROM (s.expires_at - s.created_at)) = (t.base_period_days + t.old_remaining_days) THEN
      '✅ 时间计算正确'
    ELSE
      '❌ 时间计算错误'
  END AS validation_result,
  -- 验证字段是否清除
  CASE
    WHEN s.adjustment_mode IS NULL AND s.remaining_days IS NULL THEN
      '✅ 字段已清除'
    ELSE
      '❌ 字段未清除'
  END AS cleanup_result
FROM user_subscriptions s
CROSS JOIN test_data t
WHERE s.id = t.new_sub_id;


-- ============================================================
-- 5️⃣ 验证 Scheduled 模式的时间计算
-- ============================================================

-- 场景：升级 Scheduled 模式，检查新订阅是否独立计算时间
WITH test_data AS (
  SELECT
    'NEW_SUBSCRIPTION_ID' AS new_sub_id,
    365 AS base_period_days,  -- 年付
    20 AS old_remaining_days  -- 旧订阅剩余天数（不应包含在内）
)
SELECT
  s.id,
  s.plan_tier,
  s.billing_cycle,
  s.created_at,
  s.expires_at,
  -- 计算实际订阅天数
  EXTRACT(DAY FROM (s.expires_at - s.created_at)) AS actual_days,
  -- Scheduled 模式：预期天数 = 基础周期（不包含旧订阅剩余天数）
  t.base_period_days AS expected_days,
  -- 验证是否正确
  CASE
    WHEN EXTRACT(DAY FROM (s.expires_at - s.created_at)) = t.base_period_days THEN
      '✅ 时间计算正确（独立计算）'
    WHEN EXTRACT(DAY FROM (s.expires_at - s.created_at)) = (t.base_period_days + t.old_remaining_days) THEN
      '❌ 错误：包含了旧订阅剩余时间'
    ELSE
      '❌ 时间计算错误'
  END AS validation_result
FROM user_subscriptions s
CROSS JOIN test_data t
WHERE s.id = t.new_sub_id;


-- ============================================================
-- 6️⃣ 验证降级标记设置
-- ============================================================

-- 场景：降级操作后，检查旧订阅是否正确设置降级标记
-- 🔥 将 'OLD_SUBSCRIPTION_ID' 替换为实际值
SELECT
  id,
  plan_tier AS current_plan,
  downgrade_to_plan AS target_plan,
  downgrade_to_billing_cycle AS target_cycle,
  adjustment_mode,
  remaining_days,
  expires_at,
  -- 验证降级标记是否正确
  CASE
    WHEN downgrade_to_plan IS NOT NULL THEN
      '✅ 降级标记已设置'
    ELSE
      '❌ 降级标记未设置'
  END AS downgrade_mark_result,
  -- 验证调整模式
  CASE
    WHEN adjustment_mode IN ('immediate', 'scheduled') THEN
      '✅ 调整模式正确'
    ELSE
      '❌ 调整模式错误'
  END AS adjustment_mode_result,
  -- 验证剩余天数
  CASE
    WHEN remaining_days > 0 THEN
      '✅ 剩余天数已记录'
    ELSE
      '⚠️ 剩余天数为0或NULL'
  END AS remaining_days_result
FROM user_subscriptions
WHERE id = 'OLD_SUBSCRIPTION_ID';


-- ============================================================
-- 7️⃣ 验证降级续订
-- ============================================================

-- 场景：降级后续订，检查新订阅是否使用降级后的计划
-- 🔥 将参数替换为实际值
WITH old_sub AS (
  SELECT
    downgrade_to_plan,
    downgrade_to_billing_cycle,
    adjustment_mode,
    remaining_days
  FROM user_subscriptions
  WHERE id = 'OLD_SUBSCRIPTION_ID'
),
new_sub AS (
  SELECT
    id,
    plan_tier,
    billing_cycle,
    created_at,
    expires_at,
    adjustment_mode AS new_adjustment_mode,
    remaining_days AS new_remaining_days,
    downgrade_to_plan AS new_downgrade_plan
  FROM user_subscriptions
  WHERE id = 'NEW_SUBSCRIPTION_ID'
)
SELECT
  -- 旧订阅的降级计划
  o.downgrade_to_plan AS expected_plan,
  o.downgrade_to_billing_cycle AS expected_cycle,
  -- 新订阅的实际计划
  n.plan_tier AS actual_plan,
  n.billing_cycle AS actual_cycle,
  -- 验证是否使用降级计划
  CASE
    WHEN n.plan_tier = o.downgrade_to_plan THEN
      '✅ 续订使用了降级计划'
    ELSE
      '❌ 续订未使用降级计划'
  END AS plan_validation,
  -- 验证字段是否清除
  CASE
    WHEN n.new_adjustment_mode IS NULL
      AND n.new_remaining_days IS NULL
      AND n.new_downgrade_plan IS NULL THEN
      '✅ 降级字段已清除'
    ELSE
      '❌ 降级字段未清除'
  END AS cleanup_validation
FROM old_sub o
CROSS JOIN new_sub n;


-- ============================================================
-- 8️⃣ 查询所有异常订阅（调试用）
-- ============================================================

-- 查询所有设置了调整模式但未清除的订阅（可能是Webhook失败）
SELECT
  id,
  user_id,
  plan_tier,
  billing_cycle,
  status,
  created_at,
  expires_at,
  adjustment_mode,
  remaining_days,
  downgrade_to_plan,
  -- 计算订阅天数
  EXTRACT(DAY FROM (expires_at - created_at)) AS subscription_days
FROM user_subscriptions
WHERE adjustment_mode IS NOT NULL
   OR remaining_days IS NOT NULL
   OR downgrade_to_plan IS NOT NULL
ORDER BY created_at DESC;


-- ============================================================
-- 9️⃣ 边界情况测试：剩余天数为 0
-- ============================================================

-- 验证剩余0天的订阅升级后，时间是否正确（不延长）
WITH test_data AS (
  SELECT
    'NEW_SUBSCRIPTION_ID' AS new_sub_id,
    30 AS base_period_days,
    0 AS old_remaining_days  -- 剩余0天
)
SELECT
  s.id,
  s.plan_tier,
  EXTRACT(DAY FROM (s.expires_at - s.created_at)) AS actual_days,
  t.base_period_days AS expected_days,
  CASE
    WHEN EXTRACT(DAY FROM (s.expires_at - s.created_at)) = t.base_period_days THEN
      '✅ 剩余0天处理正确（未延长）'
    ELSE
      '❌ 剩余0天处理错误'
  END AS validation_result
FROM user_subscriptions s
CROSS JOIN test_data t
WHERE s.id = t.new_sub_id;


-- ============================================================
-- 🔟 边界情况测试：剩余天数 > 365
-- ============================================================

-- 验证超长周期订阅的时间计算
WITH test_data AS (
  SELECT
    'NEW_SUBSCRIPTION_ID' AS new_sub_id,
    365 AS base_period_days,
    400 AS old_remaining_days  -- 剩余400天
)
SELECT
  s.id,
  s.plan_tier,
  EXTRACT(DAY FROM (s.expires_at - s.created_at)) AS actual_days,
  t.base_period_days + t.old_remaining_days AS expected_days,
  CASE
    WHEN EXTRACT(DAY FROM (s.expires_at - s.created_at)) = (t.base_period_days + t.old_remaining_days) THEN
      '✅ 超长周期处理正确（765天）'
    ELSE
      '❌ 超长周期处理错误'
  END AS validation_result
FROM user_subscriptions s
CROSS JOIN test_data t
WHERE s.id = t.new_sub_id;


-- ============================================================
-- 💡 使用提示
-- ============================================================

/*
1. 复制需要的查询到 Supabase SQL Editor
2. 替换 'YOUR_USER_ID', 'SUBSCRIPTION_ID' 等占位符
3. 执行查询并记录结果到测试报告
4. 使用验证查询（4-10）检查时间计算是否正确
*/
