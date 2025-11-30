-- ==========================================
-- 🔥 老王的Nano Banana管理员数据库设置
-- 专门为kn197884@gmail.com设置管理员权限
-- ==========================================

-- 1. 创建admin_users表
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'viewer' NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  auth_provider VARCHAR(50) DEFAULT 'email' NOT NULL,
  user_id TEXT,
  auth_metadata JSONB,
  last_login_at TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- 2. 创建admin_users表索引
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_provider ON admin_users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 3. 创建system_configs表
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- 4. 创建system_configs表索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configs_type ON system_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_active ON system_configs(is_active);

-- 5. 创建promotion_rules表
CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  rule_type VARCHAR(50) NOT NULL,
  discount_config JSONB,
  gift_config JSONB,
  extension_config JSONB,
  user_targeting JSONB NOT NULL DEFAULT '{}',
  conditions JSONB,
  priority INTEGER DEFAULT 100,
  is_stackable BOOLEAN DEFAULT false,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- 6. 创建promotion_rules表索引
CREATE INDEX IF NOT EXISTS idx_promotion_rules_name ON promotion_rules(rule_name);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_type ON promotion_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_status ON promotion_rules(status);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_priority ON promotion_rules(priority);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_dates ON promotion_rules(start_date, end_date);

-- 7. 创建audit_logs表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 创建audit_logs表索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 9. 插入管理员用户（包含kn197884@gmail.com）
INSERT INTO admin_users (email, name, role, status, auth_provider, email_verified, created_by, updated_by)
VALUES
  ('kn197884@gmail.com', 'Nano Banana 运营管理员', 'admin', 'active', 'google', true, 'system', 'system'),
  ('admin@example.com', '系统管理员', 'super_admin', 'active', 'email', true, 'system', 'system'),
  ('ops@example.com', '运营管理员', 'admin', 'active', 'email', true, 'system', 'system')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  auth_provider = EXCLUDED.auth_provider,
  email_verified = EXCLUDED.email_verified,
  updated_by = 'system_setup',
  updated_at = NOW();

-- 10. 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, updated_by) VALUES
  ('credit.basic_generation_cost', '1', 'credit_cost', '基础图像生成消耗积分', 'system'),
  ('credit.premium_generation_cost', '3', 'credit_cost', '高级图像生成消耗积分', 'system'),
  ('credit.batch_generation_discount', '0.9', 'credit_cost', '批量生成折扣', 'system'),
  ('trial.initial_credits', '10', 'trial', '新用户初始积分', 'system'),
  ('trial.period_days', '7', 'trial', '试用期天数', 'system'),
  ('subscription.basic.monthly_price', '9.99', 'pricing', '基础版月费', 'system'),
  ('subscription.basic.yearly_price', '99.99', 'pricing', '基础版年费', 'system'),
  ('subscription.pro.monthly_price', '19.99', 'pricing', '专业版月费', 'system'),
  ('subscription.pro.yearly_price', '199.99', 'pricing', '专业版年费', 'system'),
  ('subscription.max.monthly_price', '39.99', 'pricing', '企业版月费', 'system'),
  ('subscription.max.yearly_price', '399.99', 'pricing', '企业版年费', 'system')
ON CONFLICT (config_key) DO NOTHING;

-- 11. 验证设置完成
SELECT
  '🎉 kn197884@gmail.com管理员设置完成！' as message,
  (SELECT COUNT(*) FROM admin_users) as total_admins,
  (SELECT COUNT(*) FROM system_configs) as total_configs;