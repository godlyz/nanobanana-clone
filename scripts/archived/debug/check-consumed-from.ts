/**
 * 🔥 老王调试：检查消费记录的 consumed_from_id 字段
 */

import { createClient } from '@supabase/supabase-js'

async function checkConsumedFrom() {
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
  console.log('🔍 检查消费记录的 consumed_from_id 字段')
  console.log('================================================================================')

  // 查询所有记录，包含 consumed_from_id
  const { data: allTx, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, remaining_amount, consumed_from_id, transaction_type, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('\n📋 所有交易记录（包含 consumed_from_id）：')
  allTx?.forEach((tx, index) => {
    console.log(`\n记录 ${index + 1}:`)
    console.log('  ID:', tx.id.substring(0, 8))
    console.log('  Amount:', tx.amount)
    console.log('  remaining_amount:', tx.remaining_amount)
    console.log('  Type:', tx.transaction_type)
    console.log('  Expires:', tx.expires_at)
    console.log('  consumed_from_id:', tx.consumed_from_id || '(未设置)')
  })

  console.log('\n================================================================================')
}

checkConsumedFrom().catch(console.error)
