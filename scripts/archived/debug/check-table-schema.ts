/**
 * 🔥 老王调试：检查表结构和 remaining_amount 字段
 */

import { createClient } from '@supabase/supabase-js'

async function checkSchema() {
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
  console.log('🔍 检查 credit_transactions 表结构和数据')
  console.log('================================================================================')

  // 查询所有字段的数据
  const { data: allTx, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, remaining_credits, remaining_amount, expires_at, is_frozen, frozen_until, transaction_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('\n📋 所有积分交易记录（包含 remaining_amount）：')
  allTx?.forEach((tx, index) => {
    console.log(`\n记录 ${index + 1}:`)
    console.log('  ID:', tx.id.substring(0, 8))
    console.log('  Amount:', tx.amount)
    console.log('  remaining_credits:', tx.remaining_credits)
    console.log('  remaining_amount:', tx.remaining_amount)  // 🔥 关键字段
    console.log('  Type:', tx.transaction_type)
    console.log('  Expires:', tx.expires_at)
    console.log('  is_frozen:', tx.is_frozen)
    console.log('  frozen_until:', tx.frozen_until)
  })

  // 手动计算两种逻辑
  console.log('\n📊 手动计算对比：')

  const sumByRemainingCredits = allTx
    ?.filter(tx => tx.amount > 0 && !tx.is_frozen)
    .reduce((sum, tx) => sum + (tx.remaining_credits || 0), 0) || 0

  const sumByRemainingAmount = allTx
    ?.filter(tx => (tx.remaining_amount || 0) > 0 && !tx.is_frozen)
    .reduce((sum, tx) => sum + (tx.remaining_amount || 0), 0) || 0

  const totalNegative = Math.abs(
    allTx?.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0) || 0
  )

  console.log('使用 remaining_credits (旧逻辑):', sumByRemainingCredits - totalNegative)
  console.log('使用 remaining_amount (新逻辑):', sumByRemainingAmount)

  console.log('\n================================================================================')
}

checkSchema().catch(console.error)
