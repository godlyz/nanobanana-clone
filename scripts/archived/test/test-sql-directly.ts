/**
 * 🔥 老王调试：直接查询积分数据分析问题
 */

import { createClient } from '@supabase/supabase-js'

async function testSQL() {
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
  console.log('🔍 直接查询积分交易数据')
  console.log('================================================================================')

  // 测试1：查看所有积分交易记录
  const { data: allTx, error: txError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (txError) {
    console.error('❌ 查询失败:', txError)
    return
  }

  console.log('\n📋 所有积分交易记录：')
  console.log('记录总数:', allTx?.length || 0)

  allTx?.forEach((tx, index) => {
    console.log(`\n记录 ${index + 1}:`)
    console.log('  ID:', tx.id)
    console.log('  Amount:', tx.amount)
    console.log('  Remaining:', tx.remaining_credits)
    console.log('  Type:', tx.transaction_type)
    console.log('  Expires:', tx.expires_at)
    console.log('  Created:', tx.created_at)
    console.log('  Frozen:', tx.is_frozen)
    console.log('  Frozen Until:', tx.frozen_until)
  })

  // 测试2：手动模拟函数逻辑
  console.log('\n📊 手动模拟函数逻辑：')

  const now = new Date()
  console.log('当前时间 (JS):', now.toISOString())

  let manualSum = 0
  allTx?.forEach((tx) => {
    const expiresAt = tx.expires_at ? new Date(tx.expires_at) : null
    const notExpired = !expiresAt || expiresAt > now
    const notFrozen = tx.is_frozen === false || tx.is_frozen === null

    let countedAmount = 0
    if (tx.amount > 0 && notExpired && notFrozen) {
      countedAmount = tx.amount
    } else if (tx.amount < 0) {
      countedAmount = tx.amount
    }

    console.log(`\nTX ${tx.id.substring(0, 8)}...`)
    console.log('  amount:', tx.amount)
    console.log('  expires_at:', tx.expires_at)
    console.log('  not_expired:', notExpired)
    console.log('  is_frozen:', tx.is_frozen)
    console.log('  not_frozen:', notFrozen)
    console.log('  counted_amount:', countedAmount)

    manualSum += countedAmount
  })

  console.log('\n手动计算总和:', manualSum)

  // 测试3：调用实际函数
  const { data: funcResult, error: funcError } = await supabase
    .rpc('get_user_available_credits', { target_user_id: userId })

  console.log('\n函数返回结果:', funcResult)
  if (funcError) {
    console.error('函数调用错误:', funcError)
  }

  console.log('\n================================================================================')
}

testSQL().catch(console.error)
