#!/usr/bin/env node

/**
 * 🔥 老王的手动数据库迁移执行脚本
 * 用途: 通过 SQL 语句逐个创建管理后台系统表
 * 老王警告: 虽然原始，但绝对可靠！
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔄 开始执行手动数据库迁移...')

async function executeMigration() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('❌ Supabase 配置缺失！')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('📝 正在创建 system_configs 表...')

    // 使用 .from().select() 来创建表 - 通过尝试查询触发表不存在错误
    try {
      const { error } = await supabase
        .from('system_configs')
        .select('count')
        .limit(1)

      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️ 表 system_configs 不存在，需要手动创建')
        console.log('💡 请在 Supabase Dashboard 中执行以下 SQL：')
        console.log(`
-- 创建 system_configs 表
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);
        `)

        // 继续其他表的创建
        console.log('\n📝 正在创建 promotion_rules 表...')
        console.log(`
-- 创建 promotion_rules 表
CREATE TABLE IF NOT EXISTS promotion_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 10,
  stackable BOOLEAN DEFAULT true NOT NULL,
  discount_config JSONB,
  gift_config JSONB,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  usage_limit INTEGER,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  apply_to JSONB DEFAULT '{"type": "all"}' NOT NULL,
  target_users JSONB DEFAULT '{"type": "all"}' NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
  display_name TEXT,
  display_description TEXT,
  display_badge VARCHAR(50),
  display_position VARCHAR(50),
  is_visible BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);
        `)

        console.log('\n📝 正在创建 admin_users 表...')
        console.log(`
-- 创建 admin_users 表
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `)

        console.log('\n📝 正在创建 audit_logs 表...')
        console.log(`
-- 创建 audit_logs 表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `)

        console.log('\n📝 正在创建 config_history 表...')
        console.log(`
-- 创建 config_history 表
CREATE TABLE IF NOT EXISTS config_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES system_configs(id) ON DELETE CASCADE,
  config_value JSONB NOT NULL,
  version INTEGER NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT
);
        `)

        console.log('\n📝 插入示例数据...')
        console.log(`
-- 插入示例配置数据
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('credit.basic_generation_cost', '1', 'credit_cost', '基础图像生成消耗积分'),
('credit.premium_generation_cost', '3', 'credit_cost', '高级图像生成消耗积分'),
('credit.initial_balance', '100', 'credit_cost', '新用户初始积分'),
('credit.expire_days', '30', 'credit_cost', '积分有效期（天）'),

('trial.credits', '50', 'trial', '试用积分数量'),
('trial.days', '7', 'trial', '试用天数'),

('subscription.basic.monthly_price', '9.99', 'subscription', 'Basic月费'),
('subscription.basic.yearly_price', '99.99', 'subscription', 'Basic年费'),
('subscription.pro.monthly_price', '19.99', 'subscription', 'Pro月费'),
('subscription.pro.yearly_price', '199.99', 'subscription', 'Pro年费'),
('subscription.max.monthly_price', '39.99', 'subscription', 'Max月费'),
('subscription.max.yearly_price', '399.99', 'subscription', 'Max年费'),

('package.starter.price', '4.99', 'package', 'Starter积分包价格'),
('package.starter.credits', '50', 'package', 'Starter积分包积分数量'),
('package.value.price', '9.99', 'package', 'Value积分包价格'),
('package.value.credits', '120', 'package', 'Value积分包积分数量'),
('package.pro.price', '19.99', 'package', 'Pro积分包价格'),
('package.pro.credits', '300', 'package', 'Pro积分包积分数量'),
('package.enterprise.price', '49.99', 'package', 'Enterprise积分包价格'),
('package.enterprise.credits', '1000', 'package', 'Enterprise积分包积分数量')

ON CONFLICT (config_key) DO NOTHING;
        `)

        console.log('\n📝 插入示例活动规则...')
        console.log(`
-- 插入示例活动规则
INSERT INTO promotion_rules (
  rule_name, rule_type, priority, stackable, discount_config, gift_config,
  apply_to, target_users, display_name, display_description, display_badge
) VALUES
  ('新用户首单8折', 'discount', 100, false,
   '{"type": "percentage", "value": 20}', NULL,
   '{"type": "subscriptions", "tiers": ["basic", "pro", "max"]}',
   '{"type": "new_users"}',
   '新用户专享8折', '首次订阅享受8折优惠', '8折'),

  ('全场限时9折', 'discount', 90, true,
   '{"type": "percentage", "value": 10}', NULL,
   '{"type": "all"}',
   '{"type": "all"}',
   '限时9折优惠', '全站商品享受9折优惠', '9折'),

  ('满减$5', 'discount', 80, true,
   '{"type": "fixed", "value": 5}', NULL,
   '{"type": "all", "min_price": 20}',
   '{"type": "all"}',
   '满$20减$5', '订单满$20立减$5', '减$5'),

  ('购买赠送积分', 'bonus_credits', 70, true,
   NULL, '{"type": "bonus_credits", "amount": 50}',
   '{"type": "all"}',
   '{"type": "all"}',
   '购买赠送积分', '任意消费赠送50积分', '赠50积分'),

  ('生日双倍积分', 'bonus_credits', 60, true,
   NULL, '{"type": "bonus_credits", "amount": 100}',
   '{"type": "all"}',
   '{"type": "specific_users"}',
   '生日特权', '生日当天购买获得双倍积分', '双倍积分')

ON CONFLICT DO NOTHING;
        `)

        console.log('\n🎉 迁移 SQL 语句已生成！')
        console.log('💡 请复制上述 SQL 语句到 Supabase Dashboard 的 SQL Editor 中执行')
        console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/gtpvyxrgkuccgpcaeeyt/sql')

      } else {
        console.log('✅ 表 system_configs 已存在')
      }
    } catch (err) {
      console.log('❌ 检查表时出错:', err.message)
    }

  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行迁移
executeMigration()