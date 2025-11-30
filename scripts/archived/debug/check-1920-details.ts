/**
 * 🔥 老王调试：检查1920积分交易详情
 */

import { createClient } from '@supabase/supabase-js'

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  // 查询1920积分的交易记录
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 1920)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('\n📋 1920积分交易记录：')
  data?.forEach((tx, index) => {
    console.log(`\n记录 ${index + 1}:`)
    console.log('  ID:', tx.id)
    console.log('  Amount:', tx.amount)
    console.log('  remaining_amount:', tx.remaining_amount)
    console.log('  is_frozen:', tx.is_frozen)
    console.log('  frozen_until:', tx.frozen_until)
    console.log('  expires_at:', tx.expires_at)
    console.log('  created_at:', tx.created_at)
    console.log('  updated_at:', tx.updated_at)
    console.log('  description:', tx.description)
  })
}

check().catch(console.error)
