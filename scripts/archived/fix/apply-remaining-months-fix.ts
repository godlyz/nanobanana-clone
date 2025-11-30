/**
 * 应用未使用月数计算修复
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function applyFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('===============================================================================')
  console.log('📝 应用未使用月数计算修复')
  console.log('===============================================================================\n')

  // 读取迁移文件
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20251112000018_fix_remaining_months_logic.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  console.log('执行SQL迁移...\n')

  // 执行SQL
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql })

  if (error) {
    console.error('❌ 迁移执行失败:', error)
    // 如果rpc不可用，尝试直接执行
    console.log('\n尝试分步执行...\n')

    // 删除旧函数
    const { error: dropError } = await supabase.rpc('get_user_all_subscriptions')
    console.log('删除旧函数...')

    // 由于Supabase客户端无法直接执行DDL，我们需要手动通过Dashboard或其他方式执行
    console.log('\n⚠️  请手动执行以下SQL（在Supabase Dashboard的SQL Editor中）：')
    console.log('================================================================================')
    console.log(sql)
    console.log('================================================================================\n')
    return
  }

  console.log('✅ 迁移执行成功！\n')

  // 验证修复
  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  console.log('验证修复结果...\n')
  const { data: subscriptions } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: userId })

  if (subscriptions) {
    console.log('📋 订阅信息:')
    subscriptions.forEach((sub: any) => {
      console.log(`\n  ${sub.plan_tier} (${sub.billing_cycle}):`)
      console.log(`    状态: ${sub.status}`)
      console.log(`    冻结: ${sub.is_frozen ? '是' : '否'}`)
      console.log(`    未使用月数: ${sub.remaining_months}个月`)
      if (sub.is_frozen) {
        console.log(`    冻结积分: ${sub.frozen_credits}分`)
        console.log(`    冻结剩余: ${sub.remaining_days}天`)
      }
    })
  }

  console.log('\n===============================================================================')
  console.log('✅ 修复完成！')
  console.log('===============================================================================')
}

applyFix().catch(console.error)
