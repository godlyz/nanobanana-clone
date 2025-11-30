#!/usr/bin/env node

/**
 * 🔥 老王的数据库连接测试脚本
 * 用途: 简单测试 Supabase 连接是否正常
 * 老王警告: 连接不上，什么都免谈！
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔌 测试 Supabase 连接...')

async function testConnection() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('📝 配置检查:')
    console.log(`  URL: ${supabaseUrl}`)
    console.log(`  Service Role Key: ${serviceRoleKey ? '已配置 ✓' : '未配置 ✗'}`)

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('❌ Supabase 配置缺失！')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('\n📋 测试1: 基础连接测试')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10)

    if (tablesError) {
      console.error('  ❌ 基础连接失败:', tablesError.message)
      return false
    } else {
      console.log(`  ✅ 基础连接成功，发现 ${tables?.length || 0} 个表`)
    }

    console.log('\n📋 测试2: 权限测试 (尝试查询 system_configs)')
    const { data: configs, error: configError } = await supabase
      .from('system_configs')
      .select('count')
      .limit(1)

    if (configError) {
      console.error('  ❌ 权限测试失败:', configError.message)
      console.log(`  💡 可能原因: ${configError.message}`)
      return false
    } else {
      console.log(`  ✅ 权限测试成功，表中有 ${configs || 0} 条记录`)
    }

    console.log('\n📋 测试3: Service Role 权限测试')
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('count')
      .limit(1)

    if (usersError) {
      console.error('  ❌ Service Role 权限测试失败:', usersError.message)
      return false
    } else {
      console.log(`  ✅ Service Role 权限测试成功，auth.users 表中有 ${users || 0} 个用户`)
    }

    console.log('\n🎉 数据库连接和权限测试全部通过！')
    console.log('🔥 Phase 1 - 数据库与缓存基础开发完成！')
    console.log('\n🚀 可以开始 Phase 2: 后端 API 开发')

    return true

  } catch (error) {
    console.error('❌ 连接测试失败:', error.message)
    return false
  }
}

// 执行测试
testConnection()