/**
 * 检查800积分包的冻结状态
 */

import { createClient } from '@supabase/supabase-js'

async function checkFrozenStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  console.log('===============================================================================')
  console.log('🔍 检查800积分包的冻结状态')
  console.log('===============================================================================\n')

  // 查询800积分包
  const { data: package800, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, remaining_amount, is_frozen, frozen_until, created_at')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📦 800积分包信息:')
  console.log(`  ID: ${package800.id}`)
  console.log(`  充值积分: ${package800.amount}`)
  console.log(`  剩余积分: ${package800.remaining_amount}`)
  console.log(`  是否冻结: ${package800.is_frozen} ${package800.is_frozen ? '✅' : '❌ (应该是true)'}`)
  console.log(`  冻结至: ${package800.frozen_until || 'NULL'}`)
  console.log(`  创建时间: ${package800.created_at}`)
  console.log('')

  // 调用 get_user_credits_expiry_realtime 看看结果
  const { data: expiryData, error: expiryError } = await supabase
    .rpc('get_user_credits_expiry_realtime', { p_user_id: userId })

  if (expiryError) {
    console.error('❌ 调用get_user_credits_expiry_realtime失败:', expiryError)
    return
  }

  console.log('📊 积分过期信息（应该只显示2000，不显示777）:')
  console.log('===============================================================================')
  expiryData?.forEach((item: any) => {
    const date = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'
    console.log(`  ${date}: ${item.remaining_credits}积分`)
  })
  console.log('===============================================================================')
}

checkFrozenStatus().catch(console.error)
