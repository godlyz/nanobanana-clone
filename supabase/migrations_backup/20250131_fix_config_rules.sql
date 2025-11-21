-- =============================================================================
-- 修正系统配置规则
-- 创建时间: 2025-01-31
-- 描述: 修正积分有效期规则（积分包1年有效，订阅月付30天有效，年付分基础+赠送）
-- 执行方式:
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
-- =============================================================================

-- =============================================================================
-- 第一部分：修正积分包配置（改为365天有效期，不是永久）
-- =============================================================================

-- 🔥 老王修正：积分包都是一年有效期，不是永久有效
UPDATE system_configs
SET config_value = jsonb_set(
  config_value,
  '{validity_days}',
  '365'::jsonb
)
WHERE config_key IN (
  'package.starter',
  'package.popular',
  'package.pro',
  'package.ultimate'
);

-- =============================================================================
-- 第二部分：修正订阅月付配置（改为30天有效期，每月发放，没用完清零）
-- =============================================================================

-- 🔥 老王修正：订阅月付每月发放积分，30天有效期，没用完清零
UPDATE system_configs
SET
  config_value = jsonb_set(config_value, '{validity_days}', '30'::jsonb),
  description = CASE config_key
    WHEN 'subscription.basic.monthly' THEN 'Basic套餐月付配置 - $9.99/月，100积分/月（30天有效，过期清零）'
    WHEN 'subscription.pro.monthly' THEN 'Pro套餐月付配置 - $24.99/月，300积分/月（30天有效，过期清零）'
    WHEN 'subscription.max.monthly' THEN 'Max套餐月付配置 - $49.99/月，700积分/月（30天有效，过期清零）'
  END
WHERE config_key IN (
  'subscription.basic.monthly',
  'subscription.pro.monthly',
  'subscription.max.monthly'
);

-- =============================================================================
-- 第三部分：修正订阅年付配置（分离基础积分和赠送积分）
-- =============================================================================

-- 🔥 老王修正：订阅年付规则复杂
-- 1. 基础积分：每月发放（和月付一样），30天有效，没用完清零
-- 2. 赠送积分：一次性发放（20%赠送），365天有效

-- Basic年付：月付100 × 12 = 1200基础 + 240赠送（20%）= 1440总积分
UPDATE system_configs
SET config_value = '{
  "tier": "basic",
  "billing_cycle": "yearly",
  "price": 99.99,
  "currency": "USD",
  "monthly_credits": 100,
  "monthly_validity_days": 30,
  "bonus_credits": 240,
  "bonus_validity_days": 365,
  "total_credits": 1440,
  "bonus_percentage": 20,
  "description": "Basic套餐年付：每月发放100积分（30天有效），一次性赠送240积分（365天有效）"
}'::jsonb,
description = 'Basic套餐年付配置 - $99.99/年，每月100积分（30天有效）+ 240赠送积分（365天有效）'
WHERE config_key = 'subscription.basic.yearly';

-- Pro年付：月付300 × 12 = 3600基础 + 720赠送（20%）= 4320总积分
UPDATE system_configs
SET config_value = '{
  "tier": "pro",
  "billing_cycle": "yearly",
  "price": 249.99,
  "currency": "USD",
  "monthly_credits": 300,
  "monthly_validity_days": 30,
  "bonus_credits": 720,
  "bonus_validity_days": 365,
  "total_credits": 4320,
  "bonus_percentage": 20,
  "description": "Pro套餐年付：每月发放300积分（30天有效），一次性赠送720积分（365天有效）"
}'::jsonb,
description = 'Pro套餐年付配置 - $249.99/年，每月300积分（30天有效）+ 720赠送积分（365天有效）'
WHERE config_key = 'subscription.pro.yearly';

-- Max年付：月付700 × 12 = 8400基础 + 1680赠送（20%）= 10080总积分
UPDATE system_configs
SET config_value = '{
  "tier": "max",
  "billing_cycle": "yearly",
  "price": 499.99,
  "currency": "USD",
  "monthly_credits": 700,
  "monthly_validity_days": 30,
  "bonus_credits": 1680,
  "bonus_validity_days": 365,
  "total_credits": 10080,
  "bonus_percentage": 20,
  "description": "Max套餐年付：每月发放700积分（30天有效），一次性赠送1680积分（365天有效）"
}'::jsonb,
description = 'Max套餐年付配置 - $499.99/年，每月700积分（30天有效）+ 1680赠送积分（365天有效）'
WHERE config_key = 'subscription.max.yearly';

-- =============================================================================
-- 验证修正结果
-- =============================================================================

-- 查看修正后的积分包配置
SELECT
    config_key,
    config_value->>'name' AS package_name,
    config_value->>'credits' AS credits,
    config_value->>'validity_days' AS validity_days,
    config_value->>'bonus_percentage' AS bonus
FROM system_configs
WHERE config_type = 'package'
ORDER BY config_key;

-- 查看修正后的订阅月付配置
SELECT
    config_key,
    config_value->>'tier' AS tier,
    config_value->>'monthly_credits' AS monthly_credits,
    config_value->>'validity_days' AS validity_days
FROM system_configs
WHERE config_type = 'subscription' AND config_value->>'billing_cycle' = 'monthly'
ORDER BY config_key;

-- 查看修正后的订阅年付配置
SELECT
    config_key,
    config_value->>'tier' AS tier,
    config_value->>'monthly_credits' AS monthly_credits,
    config_value->>'monthly_validity_days' AS monthly_validity_days,
    config_value->>'bonus_credits' AS bonus_credits,
    config_value->>'bonus_validity_days' AS bonus_validity_days,
    config_value->>'total_credits' AS total_credits
FROM system_configs
WHERE config_type = 'subscription' AND config_value->>'billing_cycle' = 'yearly'
ORDER BY config_key;

-- =============================================================================
-- 修正完成提示
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 系统配置规则修正完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '已修正规则:';
    RAISE NOTICE '1. ✅ 积分包：一年有效期（365天）';
    RAISE NOTICE '2. ✅ 订阅月付：30天有效期，没用完清零';
    RAISE NOTICE '3. ✅ 订阅年付：';
    RAISE NOTICE '   - 基础积分：每月发放，30天有效，没用完清零';
    RAISE NOTICE '   - 赠送积分：一次性发放20%%，365天有效';
    RAISE NOTICE '';
    RAISE NOTICE '示例（Basic年付）：';
    RAISE NOTICE '- 每月发放100积分（30天有效）';
    RAISE NOTICE '- 一次性赠送240积分（365天有效）';
    RAISE NOTICE '- 总计1440积分（1200基础+240赠送）';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
