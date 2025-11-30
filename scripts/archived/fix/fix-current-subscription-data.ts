/**
 * 🔥 老王脚本：修复当前的订阅数据
 *
 * 问题：当前只有一条订阅记录（Max monthly），且时间混乱
 * 修复：
 * 1. 将当前记录改回 Pro yearly，status=cancelled，延长到期时间
 * 2. 创建新的 Max monthly 记录，开始时间=2025-11-11，30天后到期
 * 3. 创建新的 2000 积分充值记录
 * 4. 修复冻结记录的冻结截止时间
 */

import { createClient } from '@supabase/supabase-js'

async function fixCurrentData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
  const oldSubId = 'aeb9d519-e9d5-43ca-ae1c-808a2d84ec5b'

  console.log('================================================================================')
  console.log('🔧 开始修复订阅数据')
  console.log('用户 ID:', userId)
  console.log('================================================================================')

  // 1. 将现有记录改回 Pro yearly
  console.log('\n📝 步骤1: 将现有订阅改回 Pro yearly (cancelled)')

  const proYearlyStartDate = '2025-10-26T10:25:00+00:00'
  const proYearlyOriginalExpires = new Date('2026-10-26T10:25:00+00:00')
  const proYearlyExtendedExpires = new Date(proYearlyOriginalExpires.getTime() + 30 * 24 * 60 * 60 * 1000) // +30天

  const { error: updateOldError } = await supabase
    .from('user_subscriptions')
    .update({
      plan_tier: 'pro',
      billing_cycle: 'yearly',
      status: 'cancelled',
      started_at: proYearlyStartDate,
      expires_at: proYearlyExtendedExpires.toISOString(),
      monthly_credits: 500,
    })
    .eq('id', oldSubId)

  if (updateOldError) {
    console.error('❌ 更新失败:', updateOldError)
    return
  }
  console.log(`✅ Pro yearly 已更新: expires_at=${proYearlyExtendedExpires.toISOString()}`)

  // 2. 创建新的 Max monthly 订阅
  console.log('\n📝 步骤2: 创建新的 Max monthly 订阅')

  const maxMonthlyStartDate = '2025-11-11T09:46:00+00:00' // 昨天升级时间
  const maxMonthlyExpires = new Date('2025-11-11T09:46:00+00:00')
  maxMonthlyExpires.setDate(maxMonthlyExpires.getDate() + 30) // +30天

  const { data: newSub, error: createNewError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_tier: 'max',
      billing_cycle: 'monthly',
      status: 'active',
      started_at: maxMonthlyStartDate,
      expires_at: maxMonthlyExpires.toISOString(),
      monthly_credits: 2000,
    })
    .select()
    .single()

  if (createNewError || !newSub) {
    console.error('❌ 创建新订阅失败:', createNewError)
    return
  }
  console.log(`✅ Max monthly 已创建: ID=${newSub.id}, expires_at=${maxMonthlyExpires.toISOString()}`)

  // 3. 创建 2000 积分充值记录
  console.log('\n📝 步骤3: 创建 2000 积分充值记录')

  const { error: creditError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: 2000,
      transaction_type: 'subscription_refill',
      related_entity_id: newSub.id,
      expires_at: maxMonthlyExpires.toISOString(),
      description: 'Monthly subscription refill - max plan (2000 credits, valid for 30 days) / 月度订阅充值 - max套餐 (每月2000积分，30天有效)',
    })

  if (creditError) {
    console.error('❌ 创建积分记录失败:', creditError)
    return
  }
  console.log('✅ 2000 积分已充值')

  // 4. 修复冻结记录的 frozen_until
  console.log('\n📝 步骤4: 修复冻结记录的 frozen_until')

  const { error: updateFreezeError } = await supabase
    .from('credit_transactions')
    .update({
      frozen_until: maxMonthlyExpires.toISOString(), // 冻结至 Max monthly 到期时间
    })
    .eq('user_id', userId)
    .eq('is_frozen', true)

  if (updateFreezeError) {
    console.error('❌ 更新冻结记录失败:', updateFreezeError)
    return
  }
  console.log(`✅ 冻结记录已更新: frozen_until=${maxMonthlyExpires.toISOString()}`)

  console.log('\n================================================================================')
  console.log('🏁 修复完成！')
  console.log('================================================================================')
  console.log('现在数据库应该有：')
  console.log('- 2条订阅记录：')
  console.log(`  1. Pro yearly (cancelled) - expires_at=${proYearlyExtendedExpires.toISOString()}`)
  console.log(`  2. Max monthly (active) - expires_at=${maxMonthlyExpires.toISOString()}`)
  console.log('- 积分记录：')
  console.log('  - Pro yearly 冻结777积分')
  console.log('  - Max monthly 充值2000积分')
  console.log('================================================================================')
}

fixCurrentData().catch(console.error)
