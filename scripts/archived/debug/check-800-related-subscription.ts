/**
 * 检查800包关联的订阅信息
 */

import { createClient } from '@supabase/supabase-js'

async function checkRelatedSubscription() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  // 查询800包
  const { data: package800 } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  console.log('===============================================================================')
  console.log('🔍 800包关联信息')
  console.log('===============================================================================\n')

  if (package800) {
    console.log('📦 800积分包:')
    console.log(`  related_entity_id: ${package800.related_entity_id}`)
    console.log(`  related_entity_type: ${package800.related_entity_type}`)
    console.log('')

    if (package800.related_entity_id && package800.related_entity_type === 'subscription') {
      // 查询关联的订阅
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', package800.related_entity_id)
        .single()

      if (subscription) {
        console.log('📋 关联的订阅（Pro年付）:')
        console.log(`  plan_tier: ${subscription.plan_tier}`)
        console.log(`  status: ${subscription.status}`)
        console.log(`  started_at: ${subscription.started_at}`)
        console.log(`  cancelled_at: ${subscription.cancelled_at || 'NULL'}`)
        console.log('')

        // 查询Max订阅（升级后的订阅）
        const { data: maxSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('plan_tier', 'max')
          .single()

        if (maxSub) {
          console.log('📋 升级后的订阅（Max月付）:')
          console.log(`  started_at: ${maxSub.started_at}`)
          console.log('')

          console.log('===============================================================================')
          console.log('📌 冻结时间应该使用：')
          console.log(`  ${maxSub.started_at}（Max订阅开始时间 = 升级操作时间）`)
          console.log('===============================================================================')
        }
      }
    }
  }
}

checkRelatedSubscription().catch(console.error)
