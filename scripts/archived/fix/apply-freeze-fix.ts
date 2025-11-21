/**
 * 🔥 老王修复脚本：应用 freeze_subscription_credits_smart 函数的修复
 *
 * 修复内容：排除最新一条积分记录，只冻结旧的积分
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
}

const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function applyFreezeFix() {
  console.log('🔥 开始应用 freeze_subscription_credits_smart 函数修复...\n')
  console.log('=' .repeat(60))

  try {
    // 读取 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20251109000006_fix_freeze_logic_with_remaining.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('\n📄 读取 SQL 文件成功')
    console.log(`   文件路径: ${sqlPath}`)
    console.log(`   文件大小: ${sqlContent.length} 字符\n`)

    // 执行 SQL
    console.log('🔄 执行 SQL...')
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent }) as any

    if (error) {
      // 如果 exec_sql 不存在，尝试直接执行
      console.log('⚠️  exec_sql 函数不存在，尝试分段执行...\n')

      // 分割 SQL 语句（按照函数定义分割）
      const createFunctionRegex = /CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/g
      const functions = sqlContent.match(createFunctionRegex)

      if (!functions || functions.length === 0) {
        console.error('❌ 无法解析 SQL 文件中的函数定义')
        process.exit(1)
      }

      console.log(`📝 找到 ${functions.length} 个函数定义\n`)

      // 逐个执行函数定义
      for (let i = 0; i < functions.length; i++) {
        const func = functions[i]
        console.log(`🔄 执行函数 ${i + 1}/${functions.length}...`)

        const { error: execError } = await supabase.rpc('exec', {
          sql: func
        }) as any

        if (execError) {
          console.error(`❌ 执行失败:`, execError)
          console.log('\n尝试通过原始查询执行...')

          // 最后的尝试：使用原始查询
          const { error: rawError } = await supabase
            .from('_sql_exec')
            .insert({ query: func }) as any

          if (rawError) {
            console.error('❌ 原始查询也失败了:', rawError)
            console.log('\n📋 请手动在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL:\n')
            console.log('=' .repeat(60))
            console.log(func)
            console.log('=' .repeat(60))
            process.exit(1)
          }
        }

        console.log(`✅ 函数 ${i + 1} 执行成功\n`)
      }
    }

    console.log('✅ SQL 执行完成！\n')
    console.log('=' .repeat(60))
    console.log('🎉 freeze_subscription_credits_smart 函数已更新！')
    console.log('\n📋 修复内容:')
    console.log('   - 使用 CTE 找到最新的一条积分记录')
    console.log('   - UPDATE 时排除最新记录，只过期旧的积分')
    console.log('   - 确保新套餐的积分不会被冻结\n')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ 应用修复失败:', error)

    // 如果自动执行失败，打印手动执行指南
    console.log('\n📋 自动应用失败，请手动执行以下步骤:\n')
    console.log('1. 打开 Supabase Dashboard')
    console.log('2. 进入 SQL Editor')
    console.log('3. 复制并执行以下文件内容:')
    console.log('   supabase/migrations/20251109000006_fix_freeze_logic_with_remaining.sql')
    console.log('\n或者直接在 Dashboard 中运行以下 SQL:\n')
    console.log('=' .repeat(60))

    try {
      const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20251109000006_fix_freeze_logic_with_remaining.sql')
      const sqlContent = readFileSync(sqlPath, 'utf-8')
      console.log(sqlContent)
    } catch (readError) {
      console.error('无法读取 SQL 文件:', readError)
    }

    console.log('=' .repeat(60))
    process.exit(1)
  }
}

applyFreezeFix()
