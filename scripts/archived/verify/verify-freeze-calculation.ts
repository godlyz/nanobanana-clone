/**
 * 🔥 老王验证：冻结时间计算是否正确
 */

import { createClient } from '@supabase/supabase-js'

async function verify() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  // 查询800积分包
  const { data: package800, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  if (error || !package800) {
    console.error('❌ 查询800包失败:', error)
    return
  }

  console.log('================================================================================')
  console.log('🔍 800积分包冻结时间验证')
  console.log('================================================================================\n')

  console.log('📦 800积分包信息:')
  console.log(`  Amount: ${package800.amount}`)
  console.log(`  Remaining: ${package800.remaining_amount}`)
  console.log(`  is_frozen: ${package800.is_frozen}`)
  console.log(`  frozen_until: ${package800.frozen_until}`)
  console.log(`  original_expires_at: ${package800.original_expires_at}`)
  console.log(`  frozen_remaining_seconds: ${package800.frozen_remaining_seconds}`)
  console.log(`  expires_at: ${package800.expires_at}`)
  console.log(`  created_at: ${package800.created_at}\n`)

  // 计算验证
  const originalExpires = new Date(package800.original_expires_at || package800.created_at)
  const frozenUntil = new Date(package800.frozen_until)
  const newExpires = new Date(package800.expires_at)

  console.log('⏰ 时间计算验证:')
  console.log(`  原到期时间（冻结前）: ${originalExpires.toISOString()}`)
  console.log(`  冻结至（Max到期）: ${frozenUntil.toISOString()}`)
  console.log(`  新到期时间（解冻后）: ${newExpires.toISOString()}\n`)

  // 计算冻结时保存的剩余秒数
  const savedRemainingSeconds = package800.frozen_remaining_seconds
  console.log(`📊 剩余时间计算:`)
  console.log(`  保存的剩余秒数: ${savedRemainingSeconds}`)
  console.log(`  保存的剩余天数: ${Math.round(savedRemainingSeconds / 86400)} 天\n`)

  // 验证 expires_at 计算是否正确
  const expectedExpires = new Date(frozenUntil.getTime() + savedRemainingSeconds * 1000)
  console.log(`✅ 验证 expires_at 计算:`)
  console.log(`  预期值: ${expectedExpires.toISOString()}`)
  console.log(`  实际值: ${newExpires.toISOString()}`)
  console.log(`  是否匹配: ${Math.abs(expectedExpires.getTime() - newExpires.getTime()) < 1000 ? '✅ 是' : '❌ 否'}\n`)

  // 计算实际延后的时间
  const delayDays = Math.round((newExpires.getTime() - originalExpires.getTime()) / 86400000)
  console.log(`📅 实际延后时间:`)
  console.log(`  原到期: ${originalExpires.toISOString().split('T')[0]}`)
  console.log(`  新到期: ${newExpires.toISOString().split('T')[0]}`)
  console.log(`  延后: ${delayDays} 天`)
  console.log(`  Max订阅时长: 约30天`)
  console.log(`  是否合理: ${Math.abs(delayDays - 30) < 2 ? '✅ 是（误差在2天内）' : '⚠️ 需检查'}`)

  console.log('\n================================================================================')
}

verify().catch(console.error)
