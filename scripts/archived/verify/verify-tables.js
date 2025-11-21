#!/usr/bin/env node

/**
 * 🔥 老王的表结构验证脚本
 * 用途: 验证管理后台系统的所有表是否正确创建
 * 老王警告: 验证不通过，后续开发都白费！
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔍 开始验证管理后台系统表结构...')

async function verifyTables() {
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

    const tables = [
      'system_configs',
      'promotion_rules',
      'admin_users',
      'audit_logs',
      'config_history'
    ]

    let allTablesExist = true

    for (const tableName of tables) {
      try {
        console.log(`📋 验证表: ${tableName}`)

        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.error(`  ❌ 表 ${tableName} 验证失败:`, error.message)
          allTablesExist = false
        } else {
          console.log(`  ✅ 表 ${tableName} 验证通过，记录数: ${count || 0}`)
        }
      } catch (err) {
        console.error(`  ❌ 表 ${tableName} 不存在或无法访问:`, err.message)
        allTablesExist = false
      }
    }

    // 验证系统配置数据
    if (allTablesExist) {
      console.log('\n📊 验证系统配置数据...')

      const { data: configs, error: configError } = await supabase
        .from('system_configs')
        .select('config_key, config_value')
        .limit(5)

      if (configError) {
        console.error('  ❌ 系统配置数据验证失败:', configError.message)
      } else {
        console.log('  ✅ 系统配置数据验证通过')
        console.log('  📝 示例配置:')
        configs?.forEach(config => {
          console.log(`    - ${config.config_key}: ${JSON.stringify(config.config_value)}`)
        })
      }

      // 验证活动规则数据
      console.log('\n🎯 验证活动规则数据...')

      const { data: rules, error: rulesError } = await supabase
        .from('promotion_rules')
        .select('rule_name, rule_type, display_name')
        .limit(5)

      if (rulesError) {
        console.error('  ❌ 活动规则数据验证失败:', rulesError.message)
      } else {
        console.log('  ✅ 活动规则数据验证通过')
        console.log('  📝 示例规则:')
        rules?.forEach(rule => {
          console.log(`    - ${rule.rule_name} (${rule.rule_type}): ${rule.display_name || '无显示名称'}`)
        })
      }
    }

    if (allTablesExist) {
      console.log('\n🎉 所有表结构验证通过！')
      console.log('🔥 Phase 1 - 数据库与缓存基础开发完成！')
      console.log('\n🚀 可以开始 Phase 2: 后端API开发')
    } else {
      console.log('\n❌ 部分表验证失败，请检查数据库迁移')
      console.log('💡 请确保所有表都已正确创建')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行验证
verifyTables()