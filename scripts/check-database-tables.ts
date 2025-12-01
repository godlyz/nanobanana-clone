/**
 * 🔥 老王诊断脚本：检查数据库表结构
 * 用途：列出所有public schema下的表，检查缺失的表
 * 日期：2025-12-01
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 期望的表列表（来自migrations）
const expectedTables = [
  'user_profiles',
  'user_follows',
  'user_achievements',
  'generation_history',
  'video_generation_history',
  'forum_categories',
  'forum_tags',
  'forum_threads',
  'forum_replies',
  'forum_thread_tags',
  'forum_thread_reactions',
  'forum_reply_reactions',
  'user_sessions',
  'notifications'
]

async function checkDatabaseTables() {
  console.log('🔍 老王正在检查数据库表结构...\n')

  try {
    // 使用RPC调用获取所有表名
    const { data: tables, error } = await supabase.rpc('get_public_tables')

    if (error) {
      console.error('❌ 查询失败（尝试直接查询）:', error.message)

      // 备用方法：直接查询information_schema（需要service role key）
      const { data: fallbackTables, error: fallbackError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      if (fallbackError) {
        console.error('❌ 备用查询也失败:', fallbackError)
        throw fallbackError
      }

      if (fallbackTables && fallbackTables.length > 0) {
        const tableNames = fallbackTables.map((t: any) => t.table_name).sort()
        displayResults(tableNames)
      }
      return
    }

    if (tables && Array.isArray(tables)) {
      const tableNames = tables.sort()
      displayResults(tableNames)
    } else {
      console.log('⚠️ 未获取到表列表')
    }

  } catch (error: any) {
    console.error('❌ 脚本执行异常:', error.message)
  }
}

function displayResults(actualTables: string[]) {
  console.log('📊 数据库中的表:\n')
  console.log('='.repeat(60))
  actualTables.forEach((table, index) => {
    const exists = expectedTables.includes(table)
    const status = exists ? '✅' : '⚠️ (未在预期列表中)'
    console.log(`${index + 1}. ${table.padEnd(30)} ${status}`)
  })
  console.log('='.repeat(60))

  console.log('\n🔍 检查缺失的表:\n')
  const missingTables = expectedTables.filter(t => !actualTables.includes(t))

  if (missingTables.length === 0) {
    console.log('✅ 所有预期的表都存在！')
  } else {
    console.log(`❌ 缺少 ${missingTables.length} 个表:\n`)
    missingTables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`)
    })
    console.log('\n💡 建议：运行 Supabase migrations 来创建缺失的表')
  }

  console.log('\n📊 统计:')
  console.log(`   - 实际表数量: ${actualTables.length}`)
  console.log(`   - 预期表数量: ${expectedTables.length}`)
  console.log(`   - 缺失表数量: ${missingTables.length}`)
}

// 创建获取表名的RPC函数（如果不存在）
async function createGetTablesRPC() {
  console.log('🔧 尝试创建辅助函数...')

  const sql = `
    CREATE OR REPLACE FUNCTION get_public_tables()
    RETURNS TABLE (table_name text) AS $$
    BEGIN
      RETURN QUERY
      SELECT tablename::text
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  // 注意：这需要通过Supabase SQL Editor执行，或使用正确的权限
  console.log('⚠️ 请在Supabase SQL Editor中执行以下SQL:')
  console.log(sql)
}

checkDatabaseTables()
  .then(() => {
    console.log('\n✅ 检查完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })
