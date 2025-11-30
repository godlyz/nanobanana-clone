#!/usr/bin/env node

/**
 * 🔥 老王的数据库迁移执行脚本
 * 用途: 执行管理后台系统的数据库迁移
 * 老王警告: 这个脚本要是搞挂了，整个后台都要完蛋！
 */

import { createServiceClient } from '../lib/supabase/service'
import fs from 'fs'
import path from 'path'

// 读取迁移文件内容
const migrationFile = path.join(__dirname, '20250127_create_admin_system_tables.sql')
const migrationSQL = fs.readFileSync(migrationFile, 'utf8')

console.log('🔄 开始执行数据库迁移...')

async function executeMigration() {
  try {
    const supabase = createServiceClient()

    console.log('📝 正在执行迁移: 20250127_create_admin_system_tables.sql')

    // 执行迁移 SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('❌ 迁移执行失败:', error)
      throw error
    }

    console.log('✅ 数据库迁移执行成功！')

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