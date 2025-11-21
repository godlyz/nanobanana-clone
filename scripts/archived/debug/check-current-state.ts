/**
 * 🔥 老王调试：检查当前数据库状态
 */

import { createClient } from '@supabase/supabase-js'

async function checkCurrentState() {
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
  console.log('🔍 检查当前数据库状态')
  console.log('================================================================================')

  // 1. 查询所有订阅
  const { data: subs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  console.log('\n📋 订阅记录：')
  if (subsError) {
    console.error('❌ 查询失败:', subsError)
  } else {
    console.log(`总数: ${subs?.length || 0}`)
    subs?.forEach((sub, i) => {
      console.log(`\n订阅 ${i + 1}:`)
      console.log('  ID:', sub.id.substring(0, 8))
      console.log('  Plan:', sub.plan_tier, sub.billing_cycle)
      console.log('  Status:', sub.status)
      console.log('  Started:', sub.started_at)
      console.log('  Expires:', sub.expires_at)
      console.log('  Monthly Credits:', sub.monthly_credits)
    })
  }

  // 2. 查询所有积分交易
  const { data: txs, error: txsError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  console.log('\n📋 积分交易记录：')
  if (txsError) {
    console.error('❌ 查询失败:', txsError)
  } else {
    console.log(`总数: ${txs?.length || 0}`)
    txs?.forEach((tx, i) => {
      console.log(`\n交易 ${i + 1}:`)
      console.log('  Amount:', tx.amount)
      console.log('  remaining_amount:', tx.remaining_amount)
      console.log('  Type:', tx.transaction_type)
      console.log('  is_frozen:', tx.is_frozen)
      console.log('  frozen_until:', tx.frozen_until)
      console.log('  Expires:', tx.expires_at)
      console.log('  Created:', tx.created_at)
      console.log('  Description:', tx.description?.substring(0, 50))
    })
  }

  // 3. 查询可用积分
  const { data: availableCredits, error: creditsError } = await supabase
    .rpc('get_user_available_credits', { target_user_id: userId })

  console.log('\n📊 可用积分:', availableCredits)
  if (creditsError) {
    console.error('❌ 查询失败:', creditsError)
  }

  console.log('\n================================================================================')
}

checkCurrentState().catch(console.error)
