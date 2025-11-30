/**
 * 🔥 老王修复：手动更新 remaining_amount 模拟 FIFO 消费
 */

import { createClient } from '@supabase/supabase-js'

async function fixRemainingAmount() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  console.log('================================================================================')
  console.log('🔧 手动更新 remaining_amount 模拟 FIFO 消费')
  console.log('================================================================================')

  // 1. 查询所有充值记录（按FIFO策略：过期时间升序，NULL排最后）
  const { data: rechargeTxs } = await supabase
    .from('credit_transactions')
    .select('id, amount, remaining_amount, expires_at, created_at')
    .eq('user_id', userId)
    .gt('amount', 0)
    .order('expires_at', { ascending: true, nullsFirst: false })

  console.log('\n📋 充值记录（按FIFO顺序：先过期先消费）:')
  rechargeTxs?.forEach((tx, i) => {
    console.log(`  ${i + 1}. Amount: ${tx.amount}, Remaining: ${tx.remaining_amount}`)
    console.log(`     Expires: ${tx.expires_at}, Created: ${tx.created_at}`)
  })

  // 2. FIFO 消费 23 积分：从最早过期的包扣除
  if (rechargeTxs && rechargeTxs.length > 0) {
    const firstPackage = rechargeTxs[0]
    const newRemaining = firstPackage.remaining_amount - 23

    console.log(`\n🔥 FIFO策略：从最早过期的包（${firstPackage.amount}积分，expires: ${firstPackage.expires_at}）扣除 23 积分`)
    console.log(`   原 remaining_amount: ${firstPackage.remaining_amount}`)
    console.log(`   新 remaining_amount: ${newRemaining}`)

    const { error } = await supabase
      .from('credit_transactions')
      .update({ remaining_amount: newRemaining })
      .eq('id', firstPackage.id)

    if (error) {
      console.error('❌ 更新失败:', error)
      return
    }

    console.log('✅ 更新成功')
  }

  // 3. 验证结果
  const { data: availableCredits } = await supabase
    .rpc('get_user_available_credits', { target_user_id: userId })

  console.log('\n📊 验证结果:')
  console.log('   函数返回可用积分:', availableCredits)
  console.log('   预期值: 2697')

  console.log('\n================================================================================')
}

fixRemainingAmount().catch(console.error)
