-- =============================================================================
-- 初始化系统配置和活动规则数据
-- 创建时间: 2025-01-31
-- 描述: 将代码中硬编码的配置录入到数据库，便于后台管理
-- 执行方式:
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
-- =============================================================================

-- =============================================================================
-- 第一部分: 系统配置初始化 (system_configs)
-- =============================================================================

-- 1. 积分消耗配置
-- 🔥 老王注释：这些配置对应 lib/credit-types.ts 中的 CREDIT_COSTS
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'credit.text_to_image.cost',
    '{"amount": 1, "unit": "credits", "description": "文生图每张消耗积分"}'::jsonb,
    'credit_cost',
    '文生图功能积分消耗配置（每张图片）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'credit.image_to_image.cost',
    '{"amount": 2, "unit": "credits", "description": "图生图每张消耗积分"}'::jsonb,
    'credit_cost',
    '图生图功能积分消耗配置（每张图片）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 2. 新用户试用配置
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'trial.registration_bonus',
    '{"amount": 50, "validity_days": 15, "description": "注册赠送积分和有效期"}'::jsonb,
    'trial',
    '新用户注册赠送积分配置（50积分，15天有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 3. 订阅套餐配置
-- 🔥 老王注释：Basic套餐 - 月付$9.99（100积分/月），年付$99.99（1200积分/年+20%赠送=1440积分）
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'subscription.basic.monthly',
    '{"tier": "basic", "billing_cycle": "monthly", "price": 9.99, "currency": "USD", "monthly_credits": 100, "validity_days": 365, "description": "Basic套餐月付"}'::jsonb,
    'subscription',
    'Basic套餐月付配置 - $9.99/月，100积分/月（1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'subscription.basic.yearly',
    '{"tier": "basic", "billing_cycle": "yearly", "price": 99.99, "currency": "USD", "monthly_credits": 100, "total_credits": 1440, "validity_days": 365, "bonus_percentage": 20, "description": "Basic套餐年付"}'::jsonb,
    'subscription',
    'Basic套餐年付配置 - $99.99/年，1440积分（含20%赠送，1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 🔥 Pro套餐 - 月付$24.99（300积分/月），年付$249.99（3600积分/年+20%赠送=4320积分）
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'subscription.pro.monthly',
    '{"tier": "pro", "billing_cycle": "monthly", "price": 24.99, "currency": "USD", "monthly_credits": 300, "validity_days": 365, "description": "Pro套餐月付"}'::jsonb,
    'subscription',
    'Pro套餐月付配置 - $24.99/月，300积分/月（1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'subscription.pro.yearly',
    '{"tier": "pro", "billing_cycle": "yearly", "price": 249.99, "currency": "USD", "monthly_credits": 300, "total_credits": 4320, "validity_days": 365, "bonus_percentage": 20, "description": "Pro套餐年付"}'::jsonb,
    'subscription',
    'Pro套餐年付配置 - $249.99/年，4320积分（含20%赠送，1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 🔥 Max套餐 - 月付$49.99（700积分/月），年付$499.99（8400积分/年+20%赠送=10080积分）
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'subscription.max.monthly',
    '{"tier": "max", "billing_cycle": "monthly", "price": 49.99, "currency": "USD", "monthly_credits": 700, "validity_days": 365, "description": "Max套餐月付"}'::jsonb,
    'subscription',
    'Max套餐月付配置 - $49.99/月，700积分/月（1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'subscription.max.yearly',
    '{"tier": "max", "billing_cycle": "yearly", "price": 499.99, "currency": "USD", "monthly_credits": 700, "total_credits": 10080, "validity_days": 365, "bonus_percentage": 20, "description": "Max套餐年付"}'::jsonb,
    'subscription',
    'Max套餐年付配置 - $499.99/年，10080积分（含20%赠送，1年有效期）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 4. 积分包配置
-- 🔥 老王注释：积分包永久有效，无过期时间
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'package.starter',
    '{"name": "Starter", "credits": 100, "price": 12.99, "currency": "USD", "validity_days": null, "bonus_percentage": 0, "description": "入门积分包"}'::jsonb,
    'package',
    'Starter积分包 - $12.99，100积分（永久有效）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'package.popular',
    '{"name": "Popular", "credits": 300, "price": 34.99, "currency": "USD", "validity_days": null, "bonus_percentage": 15, "badge": "最受欢迎", "description": "热门积分包"}'::jsonb,
    'package',
    'Popular积分包 - $34.99，300积分+15%赠送（永久有效）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'package.pro',
    '{"name": "Pro", "credits": 700, "price": 69.99, "currency": "USD", "validity_days": null, "bonus_percentage": 20, "description": "专业积分包"}'::jsonb,
    'package',
    'Pro积分包 - $69.99，700积分+20%赠送（永久有效）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'package.ultimate',
    '{"name": "Ultimate", "credits": 1500, "price": 129.99, "currency": "USD", "validity_days": null, "bonus_percentage": 30, "badge": "最超值", "description": "终极积分包"}'::jsonb,
    'package',
    'Ultimate积分包 - $129.99，1500积分+30%赠送（永久有效）',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- 5. 定价展示配置
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by)
VALUES
  (
    'pricing.display.order',
    '["basic", "pro", "max"]'::jsonb,
    'pricing',
    '定价页面套餐显示顺序',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  ),
  (
    'pricing.package.order',
    '["starter", "popular", "pro", "ultimate"]'::jsonb,
    'pricing',
    '积分包显示顺序',
    (SELECT id FROM auth.users WHERE email = 'kn197884@gmail.com' LIMIT 1)
  )
ON CONFLICT (config_key) DO NOTHING;

-- =============================================================================
-- 验证脚本执行结果
-- =============================================================================

-- 检查插入的配置数量
SELECT
    config_type,
    COUNT(*) AS config_count
FROM system_configs
GROUP BY config_type
ORDER BY config_type;

-- 查看所有配置
SELECT
    config_key,
    config_type,
    description,
    is_active
FROM system_configs
ORDER BY config_type, config_key;

-- =============================================================================
-- 初始化完成提示
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 系统配置初始化完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '已录入配置:';
    RAISE NOTICE '1. ✅ 积分消耗配置（文生图、图生图）';
    RAISE NOTICE '2. ✅ 新用户试用配置（注册赠送50积分）';
    RAISE NOTICE '3. ✅ 订阅套餐配置（Basic/Pro/Max 月付/年付）';
    RAISE NOTICE '4. ✅ 积分包配置（Starter/Popular/Pro/Ultimate）';
    RAISE NOTICE '5. ✅ 定价展示配置（套餐和积分包显示顺序）';
    RAISE NOTICE '';
    RAISE NOTICE '💡 下一步:';
    RAISE NOTICE '1. 访问后台管理页面 http://localhost:3000/admin/config';
    RAISE NOTICE '2. 可以查看、修改和管理所有配置';
    RAISE NOTICE '3. 后续修改配置无需改代码，直接在后台操作即可';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
