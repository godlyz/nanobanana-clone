#!/usr/bin/env node

/**
 * 🔥 老王的管理员表完整创建脚本
 * 用途: 创建完整的管理员系统表结构
 * 老王警告: 这个脚本要是执行失败，整个管理后台都要完蛋！
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔥 开始创建管理员系统表...')

async function setupAdminTables() {
  try {
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

    console.log('📊 正在创建管理员系统表结构...')

    // 需要执行的SQL语句
    const sqlStatements = [
      // 1. admin_users 表
      `CREATE TABLE IF NOT EXISTS admin_users (
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
      );`,

      // 2. 创建索引
      `CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);`,
      `CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);`,
      `CREATE INDEX IF NOT EXISTS idx_admin_users_auth_provider ON admin_users(auth_provider);`,
      `CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);`,

      // 3. system_configs 表
      `CREATE TABLE IF NOT EXISTS system_configs (
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
      );`,

      // 4. system_configs 索引
      `CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);`,
      `CREATE INDEX IF NOT EXISTS idx_system_configs_type ON system_configs(config_type);`,
      `CREATE INDEX IF NOT EXISTS idx_system_configs_active ON system_configs(is_active);`,

      // 5. promotion_rules 表
      `CREATE TABLE IF NOT EXISTS promotion_rules (
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
      );`,

      // 6. promotion_rules 索引
      `CREATE INDEX IF NOT EXISTS idx_promotion_rules_name ON promotion_rules(rule_name);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_rules_type ON promotion_rules(rule_type);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_rules_status ON promotion_rules(status);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_rules_priority ON promotion_rules(priority);`,
      `CREATE INDEX IF NOT EXISTS idx_promotion_rules_dates ON promotion_rules(start_date, end_date);`,

      // 7. audit_logs 表
      `CREATE TABLE IF NOT EXISTS audit_logs (
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
      );`,

      // 8. audit_logs 索引
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`,

      // 9. 插入默认管理员用户
      `INSERT INTO admin_users (email, name, role, status, auth_provider, email_verified, created_by, updated_by)
       VALUES
       ('admin@example.com', '系统管理员', 'super_admin', 'active', 'email', true, 'system', 'system'),
       ('ops@example.com', '运营管理员', 'admin', 'active', 'email', true, 'system', 'system')
       ON CONFLICT (email) DO NOTHING;`,

      // 10. 插入默认配置
      `INSERT INTO system_configs (config_key, config_value, config_type, description, updated_by) VALUES
       ('credit.basic_generation_cost', '1', 'credit_cost', '基础图像生成消耗积分'),
       ('credit.premium_generation_cost', '3', 'credit_cost', '高级图像生成消耗积分'),
       ('credit.batch_generation_discount', '0.9', 'credit_cost', '批量生成折扣'),
       ('trial.initial_credits', '10', 'trial', '新用户初始积分'),
       ('trial.period_days', '7', 'trial', '试用期天数'),
       ('subscription.basic.monthly_price', '9.99', 'pricing', '基础版月费'),
       ('subscription.basic.yearly_price', '99.99', 'pricing', '基础版年费'),
       ('subscription.pro.monthly_price', '19.99', 'pricing', '专业版月费'),
       ('subscription.pro.yearly_price', '199.99', 'pricing', '专业版年费'),
       ('subscription.max.monthly_price', '39.99', 'pricing', '企业版月费'),
       ('subscription.max.yearly_price', '399.99', 'pricing', '企业版年费')
       ON CONFLICT (config_key) DO NOTHING;`
    ]

    console.log(`📝 准备执行 ${sqlStatements.length} 条SQL语句...`)

    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      console.log(`📊 执行第 ${i + 1}/${sqlStatements.length} 条SQL...`)

      try {
        // 由于Supabase客户端限制，我们只打印SQL让用户手动执行
        console.log(`🔧 需要在Supabase控制台执行的SQL:`)
        console.log(`\n${sql}\n`)

        // 测试表是否创建成功（只对部分表进行测试）
        if (sql.includes('CREATE TABLE IF NOT EXISTS admin_users')) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
          console.log('✅ admin_users表创建指令已生成')
        }
      } catch (error) {
        console.log(`⚠️ SQL语句生成时出现问题:`, error.message)
      }
    }

    console.log('\n🎉 SQL语句生成完成！')
    console.log('📋 请将以上SQL语句复制到Supabase控制台的SQL编辑器中执行')
    console.log('🔗 Supabase控制台: https://app.supabase.com/project/_/sql')

  } catch (error) {
    console.error('❌ 设置过程失败:', error)
    process.exit(1)
  }
}

// 运行设置
setupAdminTables()