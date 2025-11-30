-- =============================================================================
-- 创建缺失的管理后台系统表
-- 注意：admin_users 表已存在，只创建 promotion_rules、audit_logs 和 system_configs
-- =============================================================================

-- =============================================================================
-- 1. 系统配置表 (system_configs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),

  CONSTRAINT check_config_type CHECK (
    config_type IN ('credit_cost', 'trial', 'subscription', 'package', 'pricing')
  ),
  CONSTRAINT check_version CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_system_configs_type ON system_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_active ON system_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);

-- =============================================================================
-- 2. 活动规则表 (promotion_rules)
-- =============================================================================

CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  display_name TEXT,
  display_description TEXT,
  display_badge VARCHAR(50),
  display_position VARCHAR(50),
  apply_to JSONB NOT NULL,
  target_users JSONB DEFAULT '{"type": "all"}',
  discount_config JSONB,
  gift_config JSONB,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  priority INTEGER DEFAULT 0,
  stackable BOOLEAN DEFAULT false,
  conditions JSONB,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),

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

CREATE INDEX IF NOT EXISTS idx_promotion_rules_dates ON promotion_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_status ON promotion_rules(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_promotion_rules_priority ON promotion_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_visible ON promotion_rules(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_promotion_rules_type ON promotion_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_usage_count ON promotion_rules(usage_count);

-- =============================================================================
-- 3. 审计日志表 (audit_logs) - 使用 VARCHAR 而不是 UUID 引用
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(255) NOT NULL,  -- 改为 VARCHAR，不使用外键约束
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_action_type CHECK (
    action_type IN ('create', 'update', 'delete', 'rollback', 'login', 'logout', 'cache_refresh', 
                    'config_read', 'config_write', 'config_delete',
                    'promotion_read', 'promotion_write', 'promotion_delete', 'promotion_activate',
                    'user_read', 'user_write', 'user_delete', 'user_role_manage',
                    'audit_read', 'audit_export',
                    'system_backup', 'system_restore', 'system_maintenance')
  ),
  CONSTRAINT check_resource_type CHECK (
    resource_type IN ('config', 'promotion', 'promotion_rule', 'admin_user', 'user', 'cache', 'system', 'audit')
  )
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);

-- =============================================================================
-- 4. 验证表创建
-- =============================================================================

SELECT 
  '✅ 表创建完成' as message,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'system_configs') as system_configs_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'promotion_rules') as promotion_rules_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_logs') as audit_logs_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'admin_users') as admin_users_exists;
