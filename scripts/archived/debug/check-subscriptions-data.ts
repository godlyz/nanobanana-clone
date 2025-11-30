/**
 * 🔥 老王诊断脚本：检查订阅数据
 * 检查 user_subscriptions 表和 credit_transactions 表的数据
 */

import { createClient } from '@supabase/supabase-js'

async function checkSubscriptionsData() {
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
  console.log('🔍 [诊断] 检查用户订阅数据')
  console.log('用户 ID:', userId)
  console.log('================================================================================')

  // 1. 检查 user_subscriptions 表
  console.log('\n📋 [user_subscriptions] 表数据:')
  const { data: subs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (subsError) {
    console.error('❌ 查询失败:', subsError)
  } else {
    console.log(`找到 ${subs.length} 条订阅记录:`)
    subs.forEach((sub, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log('  ID:', sub.id)
      console.log('  Plan:', sub.plan_tier)
      console.log('  Billing Cycle:', sub.billing_cycle)
      console.log('  Status:', sub.status)
      console.log('  Started At:', sub.started_at)
      console.log('  Expires At:', sub.expires_at)
      console.log('  Created At:', sub.created_at)
      console.log('  Monthly Credits:', sub.monthly_credits)
    })
  }

  // 2. 检查 credit_transactions 表（冻结记录）
  console.log('\n\n❄️  [credit_transactions] 冻结记录:')
  const { data: frozen, error: frozenError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_frozen', true)
    .order('created_at', { ascending: false })

  if (frozenError) {
    console.error('❌ 查询失败:', frozenError)
  } else {
    console.log(`找到 ${frozen.length} 条冻结记录:`)
    frozen.forEach((f, index) => {
      console.log(`\n冻结记录 ${index + 1}:`)
      console.log('  ID:', f.id)
      console.log('  Amount:', f.amount)
      console.log('  Related Entity ID:', f.related_entity_id)
      console.log('  Frozen Until:', f.frozen_until)
      console.log('  Description:', f.description)
      console.log('  Created At:', f.created_at)
    })
  }

  // 3. 调用函数测试
  console.log('\n\n🔧 [get_user_all_subscriptions] 函数返回:')
  const { data: funcResult, error: funcError } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: userId })

  if (funcError) {
    console.error('❌ 函数调用失败:', funcError)
  } else {
    console.log('返回记录数:', funcResult.length)
    console.log('详细数据:', JSON.stringify(funcResult, null, 2))
  }

  console.log('\n================================================================================')
  console.log('🏁 检查完成')
  console.log('================================================================================')
}

checkSubscriptionsData().catch(console.error)
