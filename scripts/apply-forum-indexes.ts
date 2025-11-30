/**
 * 🔥 老王创建：应用论坛性能索引
 * 用途：直接通过Supabase客户端执行索引migration
 * 日期：2025-11-27
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyIndexes() {
  console.log('🔥 老王开始应用论坛性能索引...')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 读取migration文件
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20251127000001_add_forum_performance_indexes.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📝 执行SQL:\n', sql.substring(0, 200) + '...')

  // 执行SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: sql
  })

  if (error) {
    console.error('❌ 应用索引失败:', error)
    // 尝试逐条执行
    console.log('🔄 尝试逐条执行SQL语句...')

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'))

    for (const statement of statements) {
      if (!statement) continue

      console.log(`执行: ${statement.substring(0, 50)}...`)

      const { error: stmtError } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      })

      if (stmtError) {
        // 索引可能已存在，忽略这类错误
        if (stmtError.message?.includes('already exists')) {
          console.log('⚠️  索引已存在，跳过')
        } else {
          console.error('❌ 执行失败:', stmtError.message)
        }
      } else {
        console.log('✅ 成功')
      }
    }
  } else {
    console.log('✅ 索引应用成功!')
    console.log('📊 结果:', data)
  }

  console.log('\n🎉 老王完成索引优化！')
}

applyIndexes().catch(console.error)
