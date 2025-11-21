/**
 * 🔍 老王调试：查看所有积分记录
 */

import { createClient } from '@supabase/supabase-js'

const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testUserId: 'bfb8182a-6865-4c66-a89e-05711796e2b2',
}

const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkAllCredits() {
  console.log('🔍 查询所有积分记录...\n')

  // 1. 查询订阅
  const { data: subscription } = await supabase
    .rpc('get_user_active_subscription', { p_user_id: TEST_CONFIG.testUserId })

  const sub = subscription?.[0]
  console.log('📋 当前订阅:')
  console.log(`   ID: ${sub?.id}`)
  console.log(`   套餐: ${sub?.plan_tier} ${sub?.billing_cycle}`)
  console.log(`   到期: ${sub?.expires_at}\n`)

  // 2. 查询所有积分记录
  const { data: credits } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', TEST_CONFIG.testUserId)
    .order('created_at', { ascending: false })

  console.log(`💰 所有积分记录（共 ${credits?.length || 0} 条）:\n`)

  let totalAvailable = 0
  const now = new Date()

  credits?.forEach((credit, index) => {
    const isExpired = credit.expires_at && new Date(credit.expires_at) <= now
    const isFrozen = credit.frozen_until && new Date(credit.frozen_until) > now
    const isAvailable = credit.amount > 0 && !isExpired && !isFrozen

    if (isAvailable) {
      totalAvailable += credit.amount
    }

    console.log(`[${index + 1}] ID: ${credit.id}`)
    console.log(`    类型: ${credit.transaction_type}`)
    console.log(`    积分: ${credit.amount}`)
    console.log(`    描述: ${credit.description}`)
    console.log(`    创建: ${credit.created_at}`)
    console.log(`    过期: ${credit.expires_at || '永久'}`)
    console.log(`    冻结: ${credit.frozen_until || '无'}`)
    console.log(`    关联: ${credit.related_entity_id || '无'}`)
    console.log(`    状态: ${isExpired ? '已过期' : isFrozen ? '已冻结' : isAvailable ? '✅可用' : '其他'}`)
    console.log()
  })

  console.log(`📊 统计:`)
  console.log(`   总记录数: ${credits?.length || 0}`)
  console.log(`   手动计算可用积分: ${totalAvailable}`)

  // 3. 查询RPC返回的可用积分
  const { data: availableCredits } = await supabase
    .rpc('get_user_available_credits', { target_user_id: TEST_CONFIG.testUserId })

  console.log(`   RPC可用积分: ${availableCredits}`)

  if (totalAvailable !== availableCredits) {
    console.log(`\n⚠️  积分不匹配！差异: ${Math.abs(totalAvailable - availableCredits)}`)
  }
}

checkAllCredits()
