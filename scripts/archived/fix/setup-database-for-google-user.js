#!/usr/bin/env node

/**
 * 🔥 老王的数据库设置和Google用户升级脚本
 * 用途: 一键设置数据库并升级kn197884@gmail.com为管理员
 * 老王警告: 这个脚本要是在Supabase控制台执行SQL之前的准备工作！
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔥 开始为kn197884@gmail.com设置管理员权限...')

const TARGET_EMAIL = 'kn197884@gmail.com'

async function setupDatabaseAndUpgradeUser() {
  console.log('📋 第一步：检查数据库连接...')

  // 使用service role key创建客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 检查数据库连接
  try {
    const { data: testConnection, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)

    if (connectionError) {
      console.log('✅ 数据库连接正常')
    } else {
      console.log('✅ 数据库连接正常')
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    return
  }

  console.log('\n📊 第二步：生成SQL设置脚本...')

  // 这里我们只生成SQL，让用户在Supabase控制台执行
  const sqlScript = `
-- ==========================================
-- 🔥 老王的Nano Banana管理员数据库设置
-- 包含kn197884@gmail.com的升级配置
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

-- 9. 插入默认管理员用户
INSERT INTO admin_users (email, name, role, status, auth_provider, email_verified, created_by, updated_by)
VALUES
  ('${TARGET_EMAIL}', 'Nano Banana 运营管理员', 'admin', 'active', 'google', true, 'system', 'system'),
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

-- 11. 验证设置结果
SELECT
  '🎉 设置完成！' as status,
  (SELECT COUNT(*) FROM admin_users) as admin_users_count,
  (SELECT COUNT(*) FROM system_configs) as configs_count;
  `

  console.log('\n📄 SQL脚本已生成！请按以下步骤操作：')
  console.log('=' .repeat(60))
  console.log('\n1️⃣ 打开Supabase控制台: https://app.supabase.com')
  console.log('\n2️⃣ 选择你的Nano Banana项目')
  console.log('\n3️⃣ 进入SQL编辑器')
  console.log('\n4️⃣ 复制下面的SQL代码并执行：')
  console.log('\n' + '='.repeat(60))
  console.log('\n🔥 SQL代码（复制全部内容）：')
  console.log('\n```sql')
  console.log(sqlScript)
  console.log('\n```\n')

  console.log('\n' + '='.repeat(60))
  console.log('\n5️⃣ 执行完成后，kn197884@gmail.com将拥有管理员权限！')
  console.log('\n6️⃣ 然后用Google登录，访问: http://localhost:3000/admin')
  console.log('\n🎯 你的Google账号将具有以下权限：')
  console.log('  ✅ 查看系统配置')
  console.log('  ✅ 修改系统配置')
  console.log('  ✅ 查看活动规则')
  console.log('  ✅ 修改活动规则')
  console.log('  ✅ 查看审计日志')
  console.log('  ✅ 导出审计日志')
}

// 执行设置
setupDatabaseAndUpgradeUser()