/**
 * 🔥 老王创建：直接通过Supabase REST API执行索引SQL
 * 用途：不依赖supabase CLI，直接用service role key执行
 * 日期：2025-11-27
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function executeSQL(sql: string) {
  console.log('🔥 老王开始执行SQL...')
  console.log('📝 SQL预览:', sql.substring(0, 100) + '...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 分割SQL语句（按分号分隔）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !/^\/\*[\s\S]*?\*\/$/.test(s))

  console.log(`📊 共 ${statements.length} 条SQL语句\n`)

  let successCount = 0
  let skipCount = 0
  let failCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue

    // 显示进度
    const preview = statement.length > 60
      ? statement.substring(0, 60) + '...'
      : statement
    console.log(`[${i + 1}/${statements.length}] ${preview}`)

    try {
      // 使用rpc执行原始SQL（如果有的话）
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement + ';'
      })

      if (error) {
        // 检查是否是"已存在"错误
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate')
        ) {
          console.log('  ⏭️  已存在，跳过\n')
          skipCount++
        } else {
          console.error('  ❌ 失败:', error.message, '\n')
          failCount++
        }
      } else {
        console.log('  ✅ 成功\n')
        successCount++
      }
    } catch (err: any) {
      console.error('  ❌ 异常:', err.message, '\n')
      failCount++
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n📊 执行结果汇总:')
  console.log(`✅ 成功: ${successCount}`)
  console.log(`⏭️  跳过: ${skipCount}`)
  console.log(`❌ 失败: ${failCount}`)
  console.log(`📝 总计: ${statements.length}`)

  if (failCount > 0) {
    console.log('\n⚠️  部分语句执行失败，请检查Supabase Dashboard的SQL编辑器手动执行')
  } else if (successCount + skipCount === statements.length) {
    console.log('\n🎉 所有索引应用成功！')
  }
}

async function main() {
  console.log('🔥 老王的索引应用脚本启动！\n')

  // 读取migration文件
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20251127000001_add_forum_performance_indexes.sql'
  )

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration文件不存在:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  await executeSQL(sql)

  console.log('\n🔥 老王完成！')
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err)
  process.exit(1)
})
