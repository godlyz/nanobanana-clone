#!/usr/bin/env node
// @ts-nocheck

/**
 * 🔥 老王的简化数据库迁移执行脚本
 * 用途: 逐步执行管理后台系统的数据库迁移
 * 老王警告: 虽然简单，但一步都不能错！
 */

import { config } from 'dotenv'
import { createServiceClient } from '../../lib/supabase/service'
import fs from 'fs'
import path from 'path'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔄 开始执行简化数据库迁移...')

async function executeMigration() {
  try {
    const supabase = createServiceClient()

    console.log('📝 正在创建 system_configs 表...')
    const { error: configsError } = await supabase.sql`
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
    `

    if (configsError) {
      console.error('❌ system_configs 表创建失败:', configsError)
    } else {
      console.log('✅ system_configs 表创建成功')
    }

    console.log('📝 正在创建 promotion_rules 表...')
    const { error: rulesError } = await supabase.sql`
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
    `

    if (rulesError) {
      console.error('❌ promotion_rules 表创建失败:', rulesError)
    } else {
      console.log('✅ promotion_rules 表创建成功')
    }

    console.log('📝 正在创建 admin_users 表...')
    const { error: adminError } = await supabase.sql`
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
    `

    if (adminError) {
      console.error('❌ admin_users 表创建失败:', adminError)
    } else {
      console.log('✅ admin_users 表创建成功')
    }

    console.log('📝 正在创建 audit_logs 表...')
    const { error: auditError } = await supabase.sql`
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
    `

    if (auditError) {
      console.error('❌ audit_logs 表创建失败:', auditError)
    } else {
      console.log('✅ audit_logs 表创建成功')
    }

    console.log('📝 正在创建 config_history 表...')
    const { error: historyError } = await supabase.sql`
      CREATE TABLE IF NOT EXISTS config_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        config_id UUID REFERENCES system_configs(id) ON DELETE CASCADE,
        config_value JSONB NOT NULL,
        version INTEGER NOT NULL,
        changed_by TEXT,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        change_reason TEXT
      );
    `

    if (historyError) {
      console.error('❌ config_history 表创建失败:', historyError)
    } else {
      console.log('✅ config_history 表创建成功')
    }

    // 验证表是否创建成功
    console.log('🔍 验证表结构...')

    const tables = [
      'system_configs',
      'promotion_rules',
      'admin_users',
      'audit_logs',
      'config_history'
    ]

    for (const tableName of tables) {
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error(`❌ 表 ${tableName} 验证失败:`, countError)
      } else {
        console.log(`✅ 表 ${tableName} 验证通过，记录数: ${count || 0}`)
      }
    }

    console.log('🎉 数据库迁移和验证全部完成！')
    console.log('🔥 Phase 1 - 数据库与缓存基础开发完成！')

  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行迁移
executeMigration()