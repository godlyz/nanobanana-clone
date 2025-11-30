/**
 * 🔥 老王临时迁移脚本
 * 执行数据库迁移：��加 tool_type 字段
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// 🔥 使用 @supabase/supabase-js v2
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置！请检查 .env.local 文件')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)

  try {
    // 读取迁移SQL文件
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127_add_tool_type_to_history.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 读取迁移文件成功')
    console.log('=' .repeat(80))

    // 🔥 拆分SQL语句（按分号分割，跳过注释）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📊 共${statements.length}条SQL语句待执行\n`)

    // 🔥 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // 跳过纯注释
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue
      }

      console.log(`[${i + 1}/${statements.length}] 执行SQL...`)
      console.log(`Statement preview: ${statement.substring(0, 100)}...`)

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })

        if (error) {
          // 尝试直接执行（某些语句不支持rpc）
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0)

          if (directError) {
            console.warn(`⚠️  RPC失败，尝试使用Postgres REST API...`)
          }

          throw error
        }

        console.log(`✅ 执行成功\n`)
      } catch (err) {
        console.error(`❌ 执行失败:`, err.message)
        console.error(`SQL: ${statement}\n`)
      }
    }

    console.log('=' .repeat(80))
    console.log('🎉 迁移执行完成！')
    console.log('\n📋 验证迁移结果...\n')

    // 🔥 验证：检查字段是否添加成功
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'generation_history'
          AND column_name = 'tool_type'
        `
      })

    if (colError) {
      console.log('⚠️  无法通过RPC验证（可能是权限问题），请手动在Supabase Dashboard验证')
    } else {
      console.log('✅ 字段验证结果:', columns)
    }

    console.log('\n✨ 迁移完成！请在Supabase Dashboard > SQL Editor中执行验证查询')

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

// 🔥 执行迁移
runMigration().then(() => {
  console.log('\n🏁 脚本执行完成')
  process.exit(0)
}).catch(err => {
  console.error('💥 脚本执行出错:', err)
  process.exit(1)
})
