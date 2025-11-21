/**
 * 🔥 老王检查：Max订阅的状态
 */

import { createClient } from '@supabase/supabase-js'

async function checkMaxSubscription() {
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
  console.log('🔍 检查Max订阅状态')
  console.log('===============================================================================\n')

  // 查询Max订阅
  const { data: maxSub, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_tier', 'max')
    .single()

  if (error || !maxSub) {
    console.error('❌ 查询Max订阅失败:', error)
    return
  }

  console.log('📋 Max订阅详情:')
  console.log('================================================================================')
  console.log(`ID: ${maxSub.id}`)
  console.log(`plan_tier: ${maxSub.plan_tier}`)
  console.log(`billing_cycle: ${maxSub.billing_cycle}`)
  console.log(`status: ${maxSub.status}`)
  console.log(`started_at: ${maxSub.started_at}`)
  console.log(`expires_at: ${maxSub.expires_at}`)
  console.log(`creem_subscription_id: ${maxSub.creem_subscription_id}`)
  console.log('================================================================================\n')

  // 判断订阅状态
  const now = new Date()
  const expiresAt = new Date(maxSub.expires_at)
  const isExpired = expiresAt <= now
  const isActive = maxSub.status === 'active' && !isExpired

  console.log('🔍 状态分析:')
  console.log(`当前时间: ${now.toLocaleString('zh-CN')}`)
  console.log(`到期时间: ${expiresAt.toLocaleString('zh-CN')}`)
  console.log(`status字段: ${maxSub.status}`)
  console.log(`已过期: ${isExpired ? '是' : '否'}`)
  console.log(`最终判断: ${isActive ? '✅ 激活中' : '❌ 未激活/已过期'}`)
  console.log('================================================================================\n')

  if (isActive) {
    console.log('✅ Max订阅仍然激活，800积分包应该保持冻结！')
    console.log('⚠️  但800包的 is_frozen=false，需要重新冻结。')
  } else {
    console.log('⚠️  Max订阅已过期，800积分包应该解冻。')
  }
}

checkMaxSubscription().catch(console.error)
