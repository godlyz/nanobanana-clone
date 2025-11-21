/**
 * 修复：冻结积分显示改用 remaining_amount
 * 应用迁移：20251112000014_fix_frozen_credits_display.sql
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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
  console.log('🔧 修复冻结积分显示（800 → 777）')
  console.log('===============================================================================\n')

  // 读取SQL文件
  const sqlPath = join(process.cwd(), 'supabase/migrations/20251112000014_fix_frozen_credits_display.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  // 提取CREATE OR REPLACE FUNCTION部分
  const lines = sqlContent.split('\n')
  const functionStartIndex = lines.findIndex(line => line.includes('CREATE OR REPLACE FUNCTION'))
  const functionSQL = lines.slice(functionStartIndex).join('\n')

  console.log('📝 请在Supabase Dashboard的SQL Editor中执行以下SQL：')
  console.log('================================================================================')
  console.log(functionSQL)
  console.log('================================================================================\n')

  // 验证修复
  await verifyFix(supabase)
}

async function verifyFix(supabase: any) {
  console.log('🔍 验证修复结果...\n')

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  // 调用修复后的函数
  const { data: subscriptions, error } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: userId })

  if (error) {
    console.error('❌ 调用函数失败:', error)
    return
  }

  console.log('📊 订阅列表（修复后）:')
  console.log('================================================================================')

  subscriptions?.forEach((sub: any) => {
    console.log(`${sub.plan_tier.toUpperCase()} 订阅:`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  is_frozen: ${sub.is_frozen}`)
    if (sub.frozen_credits !== null && sub.frozen_credits !== undefined) {
      console.log(`  冻结积分: ${sub.frozen_credits} ${sub.frozen_credits === 777 ? '✅' : '❌ (应该是777)'}`)
    }
    console.log(`  剩余月数: ${sub.remaining_months}`)
    console.log('')
  })

  console.log('================================================================================')

  // 检查800包的实际状态
  const { data: package800 } = await supabase
    .from('credit_transactions')
    .select('amount, remaining_amount')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  if (package800) {
    console.log(`\n📦 800积分包验证:`)
    console.log(`  充值积分: ${package800.amount}`)
    console.log(`  剩余积分: ${package800.remaining_amount}`)
    console.log(`  预期显示: ${package800.remaining_amount}`)
    console.log('================================================================================')
  }
}

applyFix().catch(console.error)
