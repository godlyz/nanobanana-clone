// 🔥 老王：执行image_names字段迁移脚本
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 开始执行image_names字段迁移...\n')

  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../supabase/migrations/20250128_add_image_names_field.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // 执行SQL（分段执行，避免DO块问题）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'))

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE')) {
        console.log('📝 执行：添加image_names字段...')
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error && !error.message.includes('already exists')) {
          throw error
        }
      }
    }

    // 验证字段是否存在
    console.log('✅ 验证字段是否添加成功...')
    const { data, error } = await supabase
      .from('generation_history')
      .select('id, image_names')
      .limit(1)

    if (error) {
      throw error
    }

    console.log('\n✅ image_names字段迁移完成！')
    console.log('📊 测试查询成功，字段已存在')

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message)
    process.exit(1)
  }
}

runMigration()
