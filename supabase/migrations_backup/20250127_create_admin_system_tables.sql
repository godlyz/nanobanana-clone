-- =============================================================================
-- 管理后台系统数据库表创建脚本
-- 创建时间: 2025-01-27
-- 描述: 创建管理后台系统所需的5张核心表
-- 执行方式:
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
-- =============================================================================

-- =============================================================================
-- 1. 系统配置表 (system_configs)
-- 用途: 存储所有可配置的系统参数
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,           -- 配置键(唯一)
  config_value JSONB NOT NULL,                       -- 配置值(JSON格式)
  config_type VARCHAR(50) NOT NULL,                  -- 配置类型: credit_cost / trial / subscription / package / pricing
  description TEXT,                                  -- 配置说明
  version INTEGER DEFAULT 1,                         -- 版本号
  is_active BOOLEAN DEFAULT true,                    -- 是否启用
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),         -- 最后修改人
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 约束检查
  CONSTRAINT check_config_type CHECK (
    config_type IN ('credit_cost', 'trial', 'subscription', 'package', 'pricing')
  ),
  CONSTRAINT check_version CHECK (version >= 1)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_system_configs_type ON system_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_active ON system_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);

-- 添加注释
COMMENT ON TABLE system_configs IS '系统可配置参数表';
COMMENT ON COLUMN system_configs.config_key IS '配置键,如: credit.text_to_image.cost';
COMMENT ON COLUMN system_configs.config_value IS '配置值JSON,如: {"amount": 1, "currency": "credits"}';
COMMENT ON COLUMN system_configs.config_type IS '配置分类: credit_cost/trial/subscription/package/pricing';

-- =============================================================================
-- 2. 🔥 活动规则表 (promotion_rules) - 增强版
-- 用途: 统一管理所有商业活动规则（折扣、赠送、满减、捆绑销售）
-- =============================================================================

CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 🔥 基础信息
  rule_name VARCHAR(100) NOT NULL,                   -- 后台管理用活动名称: "双十一全场8折"
  rule_type VARCHAR(50) NOT NULL,                    -- 规则类型: discount / bonus_credits / credits_extension / subscription_extension / bundle

  -- 🔥 前端展示信息（用户可见）
  display_name TEXT,                                 -- 前端展示名称: "限时8折优惠"
  display_description TEXT,                          -- 前端展示描述: "全场商品享受8折优惠，仅限今日"
  display_badge VARCHAR(50),                         -- 前端徽章文本: "8折" / "买1送1" / "新人专享"
  display_position VARCHAR(50),                      -- 展示位置: pricing_page / checkout / dashboard

  -- 🔥 适用范围配置
  apply_to JSONB NOT NULL,                           -- 适用对象: {"type": "all"} / {"type": "subscriptions", "tiers": ["pro", "max"]} / {"type": "packages"}

  -- 🔥 用户定向配置
  target_users JSONB DEFAULT '{"type": "all"}',      -- 目标用户: {"type": "all"} / {"type": "new_users"} / {"type": "vip_users"} / {"type": "specific_users", "user_ids": [...]}

  -- 🔥 折扣规则配置
  discount_config JSONB,                             -- 折扣配置: {"type": "percentage", "value": 20} / {"type": "fixed", "value": 10, "currency": "USD"}

  -- 🔥 赠送/延期规则配置（扩展）
  gift_config JSONB,                                 -- 赠品配置:
                                                     --   加赠积分: {"type": "bonus_credits", "amount": 100, "on_purchase": "any"}
                                                     --   积分延期: {"type": "credits_extension", "extend_days": 30}
                                                     --   套餐延期: {"type": "subscription_extension", "extend_months": 3}
                                                     --   试用延期: {"type": "trial_extension", "extend_days": 7}

  -- 🔥 时间控制
  start_date TIMESTAMPTZ NOT NULL,                   -- 活动开始时间
  end_date TIMESTAMPTZ NOT NULL,                     -- 活动结束时间
  timezone VARCHAR(50) DEFAULT 'UTC',                -- 时区

  -- 🔥 优先级与叠加
  priority INTEGER DEFAULT 0,                        -- 优先级(数字越大优先级越高)
  stackable BOOLEAN DEFAULT false,                   -- 是否可以和其他活动叠加

  -- 🔥 条件限制
  conditions JSONB,                                  -- 触发条件: {"min_purchase": 100} / {"payment_method": "yearly"}

  -- 🔥 使用限制
  usage_limit INTEGER,                               -- 全局使用次数限制(NULL表示无限制)
  usage_count INTEGER DEFAULT 0,                     -- 当前已使用次数
  per_user_limit INTEGER,                            -- 每用户使用次数限制

  -- 🔥 状态管理
  status VARCHAR(20) DEFAULT 'active',               -- 状态: active / paused / ended
  is_visible BOOLEAN DEFAULT true,                   -- 是否在前端展示

  -- 🔥 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  -- 🔥 约束
  CONSTRAINT check_priority CHECK (priority >= 0),
  CONSTRAINT check_dates CHECK (end_date > start_date),
  CONSTRAINT check_status CHECK (status IN ('active', 'paused', 'ended')),
  CONSTRAINT check_rule_type CHECK (
    rule_type IN ('discount', 'bonus_credits', 'credits_extension', 'subscription_extension', 'bundle')
  ),
  CONSTRAINT check_usage_count CHECK (usage_count >= 0),
  CONSTRAINT check_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT check_per_user_limit CHECK (per_user_limit IS NULL OR per_user_limit > 0),
  CONSTRAINT check_usage_count_vs_limit CHECK (
    usage_limit IS NULL OR usage_count <= usage_limit
  )
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_promotion_rules_dates ON promotion_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_status ON promotion_rules(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_promotion_rules_priority ON promotion_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_visible ON promotion_rules(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_promotion_rules_type ON promotion_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_usage_count ON promotion_rules(usage_count);

-- 添加注释
COMMENT ON TABLE promotion_rules IS '统一活动规则引擎 - 支持折扣、赠送、满减、捆绑销售等多种活动类型';
COMMENT ON COLUMN promotion_rules.apply_to IS '适用范围JSON: 全部商品/指定套餐/积分包/类别';
COMMENT ON COLUMN promotion_rules.target_users IS '目标用户JSON: 全部用户/新用户/VIP用户/指定用户白名单';
COMMENT ON COLUMN promotion_rules.discount_config IS '折扣配置: 百分比折扣(8折) / 固定金额减免($10 off)';
COMMENT ON COLUMN promotion_rules.stackable IS '是否可叠加: true表示可以与其他活动同时使用';
COMMENT ON COLUMN promotion_rules.gift_config IS '赠品配置: 加赠积分/积分延期/套餐延期/试用延期';

-- =============================================================================
-- 3. 管理员用户表 (admin_users)
-- 用途: 管理后台用户与权限
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),  -- 关联Supabase Auth用户
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,                         -- 角色: super_admin / admin / viewer
  permissions JSONB DEFAULT '{}',                    -- 自定义权限: {"configs": ["read", "write"], "audit": ["read"]}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT check_admin_role CHECK (role IN ('super_admin', 'admin', 'viewer'))
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 添加注释
COMMENT ON TABLE admin_users IS '管理后台用户权限表';
COMMENT ON COLUMN admin_users.role IS 'super_admin: 超管 / admin: 管理员 / viewer: 只读';
COMMENT ON COLUMN admin_users.permissions IS '细粒度权限控制JSON';

-- =============================================================================
-- 4. 审计日志表 (audit_logs)
-- 用途: 记录所有管理操作
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(user_id),
  action_type VARCHAR(50) NOT NULL,                  -- 操作类型: create / update / delete / rollback
  resource_type VARCHAR(50) NOT NULL,                -- 资源类型: config / promotion_rule / admin_user / cache
  resource_id UUID,                                  -- 资源ID
  old_value JSONB,                                   -- 旧值
  new_value JSONB,                                   -- 新值
  ip_address INET,                                   -- IP地址
  user_agent TEXT,                                   -- 浏览器UA
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT check_action_type CHECK (
    action_type IN ('create', 'update', 'delete', 'rollback', 'login', 'logout', 'cache_refresh')
  ),
  CONSTRAINT check_resource_type CHECK (
    resource_type IN ('config', 'promotion_rule', 'admin_user', 'cache', 'system')
  )
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);

-- 添加注释
COMMENT ON TABLE audit_logs IS '管理操作审计日志 - 完整记录所有变更';

-- =============================================================================
-- 5. 配置历史表 (config_history)
-- 用途: 版本控制与回滚支持
-- =============================================================================

CREATE TABLE IF NOT EXISTS config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES system_configs(id),
  config_value JSONB NOT NULL,                       -- 历史配置值
  version INTEGER NOT NULL,                          -- 版本号
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT                                 -- 变更原因
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_config_history_config ON config_history(config_id);
CREATE INDEX IF NOT EXISTS idx_config_history_version ON config_history(config_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_config_history_changed ON config_history(changed_at DESC);

-- 添加注释
COMMENT ON TABLE config_history IS '配置版本历史表 - 支持配置回滚功能';

-- =============================================================================
-- 默认管理员用户创建（可选）
-- 注意: 这里的 user_id 需要替换为实际的 Supabase Auth 用户ID
-- =============================================================================

-- 示例：创建超级管理员（取消注释并替换实际UUID）
-- INSERT INTO admin_users (user_id, email, role, created_by)
-- VALUES ('your-supabase-user-uuid-here', 'admin@example.com', 'super_admin', 'your-supabase-user-uuid-here');

-- =============================================================================
-- 初始化基础配置数据（示例）
-- =============================================================================

-- 示例配置数据（可根据实际需求调整）
INSERT INTO system_configs (config_key, config_value, config_type, description, created_by) VALUES
-- 积分消耗配置
('credit.text_to_image.cost', '{"amount": 1, "unit": "credits", "description": "文生图单张消耗"}', 'credit_cost', '文生图积分消耗', '00000000-0000-0000-0000-000000000000'),
('credit.image_to_image.cost', '{"amount": 2, "unit": "credits", "description": "图生图单张消耗"}', 'credit_cost', '图生图积分消耗', '00000000-0000-0000-0000-000000000000'),

-- 试用配置
('trial.registration_bonus.credits', '{"credits": 50, "description": "新用户注册赠送积分"}', 'trial', '注册赠送积分', '00000000-0000-0000-0000-000000000000'),
('trial.registration_bonus.valid_days', '{"days": 15, "description": "注册赠送积分有效期"}', 'trial', '试用积分有效期', '00000000-0000-0000-0000-000000000000'),

-- 订阅套餐月度积分配置
('subscription.basic.monthly_credits', '{"tier": "basic", "credits": 150, "billing_period": "monthly"}', 'subscription', 'Basic套餐月度积分', '00000000-0000-0000-0000-000000000000'),
('subscription.pro.monthly_credits', '{"tier": "pro", "credits": 800, "billing_period": "monthly"}', 'subscription', 'Pro套餐月度积分', '00000000-0000-0000-0000-000000000000'),
('subscription.max.monthly_credits', '{"tier": "max", "credits": 2000, "billing_period": "monthly"}', 'subscription', 'Max套餐月度积分', '00000000-0000-0000-0000-000000000000'),

-- 套餐定价配置
('pricing.basic.monthly', '{"tier": "basic", "billing_period": "monthly", "price": 12.00, "currency": "USD"}', 'pricing', 'Basic月付价格', '00000000-0000-0000-0000-000000000000'),
('pricing.basic.yearly', '{"tier": "basic", "billing_period": "yearly", "price": 144.00, "currency": "USD"}', 'pricing', 'Basic年付价格', '00000000-0000-0000-0000-000000000000'),
('pricing.pro.monthly', '{"tier": "pro", "billing_period": "monthly", "price": 60.00, "currency": "USD"}', 'pricing', 'Pro月付价格', '00000000-0000-0000-0000-000000000000'),
('pricing.pro.yearly', '{"tier": "pro", "billing_period": "yearly", "price": 720.00, "currency": "USD"}', 'pricing', 'Pro年付价格', '00000000-0000-0000-0000-000000000000'),
('pricing.max.monthly', '{"tier": "max", "billing_period": "monthly", "price": 240.00, "currency": "USD"}', 'pricing', 'Max月付价格', '00000000-0000-0000-0000-000000000000'),
('pricing.max.yearly', '{"tier": "max", "billing_period": "yearly", "price": 2880.00, "currency": "USD"}', 'pricing', 'Max年付价格', '00000000-0000-0000-0000-000000000000'),

-- 积分包定价配置
('package.starter', '{"package_id": "starter", "credits": 100, "price": 9.90, "currency": "USD"}', 'package', 'Starter积分包', '00000000-0000-0000-0000-000000000000'),
('package.value', '{"package_id": "value", "credits": 450, "price": 39.90, "currency": "USD"}', 'package', 'Value积分包', '00000000-0000-0000-0000-000000000000'),
('package.pro', '{"package_id": "pro", "credits": 1000, "price": 79.90, "currency": "USD"}', 'package', 'Pro积分包', '00000000-0000-0000-0000-000000000000'),
('package.enterprise', '{"package_id": "enterprise", "credits": 2500, "price": 179.90, "currency": "USD"}', 'package', 'Enterprise积分包', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (config_key) DO NOTHING;

-- =============================================================================
-- 示例活动规则数据（可选）
-- =============================================================================

-- 示例：新用户注册优惠活动
INSERT INTO promotion_rules (
  rule_name, rule_type, display_name, display_description, display_badge, display_position,
  apply_to, target_users, discount_config, start_date, end_date, priority, stackable,
  usage_limit, per_user_limit, is_visible, status, created_by
) VALUES (
  '新用户首单8折优惠',
  'discount',
  '新人专享8折',
  '新用户首次购买任意商品享受8折优惠，限时特惠',
  '新人8折',
  'pricing_page',
  '{"type": "all"}',
  '{"type": "new_users", "registered_within_days": 7}',
  '{"type": "percentage", "value": 20}',
  '2025-01-27 00:00:00+00',
  '2025-12-31 23:59:59+00',
  10,
  false,
  NULL,
  1,
  true,
  'active',
  '00000000-0000-0000-0000-000000000000'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- 验证脚本执行结果
-- =============================================================================

-- 检查表是否创建成功
SELECT
  table_name,
  table_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('system_configs', 'promotion_rules', 'admin_users', 'audit_logs', 'config_history')
ORDER BY table_name, ordinal_position;

-- 检查索引是否创建成功
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('system_configs', 'promotion_rules', 'admin_users', 'audit_logs', 'config_history')
ORDER BY tablename, indexname;

-- 检查约束是否创建成功
SELECT
  conname,
  contable,
  contype,
  pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE contable IN ('system_configs', 'promotion_rules', 'admin_users', 'audit_logs', 'config_history')
ORDER BY contable, conname;

-- 统计初始数据
SELECT
  'system_configs' as table_name, COUNT(*) as record_count
FROM system_configs
UNION ALL
SELECT
  'promotion_rules' as table_name, COUNT(*) as record_count
FROM promotion_rules
UNION ALL
SELECT
  'admin_users' as table_name, COUNT(*) as record_count
FROM admin_users
UNION ALL
SELECT
  'audit_logs' as table_name, COUNT(*) as record_count
FROM audit_logs
UNION ALL
SELECT
  'config_history' as table_name, COUNT(*) as record_count
FROM config_history;

-- ✅ 管理后台系统数据库表创建完成！
-- 现在可以开始实施缓存服务和API开发了。