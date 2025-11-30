/**
 * 验证冻结剩余天数计算
 */

import { createClient } from '@supabase/supabase-js'

async function checkFrozenDays() {
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
  console.log('🔍 验证冻结剩余天数计算')
  console.log('===============================================================================\n')

  // 查询Pro订阅（冻结的）
  const { data: proSub } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: userId })

  const frozenSub = proSub?.find((s: any) => s.is_frozen)

  if (frozenSub) {
    const now = new Date()
    const frozenUntil = new Date(frozenSub.frozen_until)

    console.log('📋 冻结订阅信息:')
    console.log(`  计划: ${frozenSub.plan_tier}`)
    console.log(`  冻结至: ${frozenUntil.toISOString()}`)
    console.log(`  当前时间: ${now.toISOString()}`)
    console.log('')

    // 计算天数差（向上取整）
    const diffMs = frozenUntil.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    console.log('📊 计算结果:')
    console.log(`  时间差（毫秒）: ${diffMs}`)
    console.log(`  时间差（小时）: ${(diffMs / (1000 * 60 * 60)).toFixed(2)}`)
    console.log(`  时间差（天数）: ${(diffMs / (1000 * 60 * 60 * 24)).toFixed(2)}`)
    console.log(`  冻结剩余天数（向上取整）: ${diffDays}天`)
    console.log('')

    console.log('===============================================================================')
    console.log('📌 显示格式:')
    console.log(`  剩余${frozenSub.remaining_months}个月未使用，冻结积分${frozenSub.frozen_credits}分，冻结剩余${diffDays}天`)
    console.log('===============================================================================')
  }
}

checkFrozenDays().catch(console.error)
