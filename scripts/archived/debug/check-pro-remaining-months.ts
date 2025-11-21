/**
 * 🔥 老王调试脚本：检查Pro订阅剩余月数计算
 *
 * 问题：Pro订阅显示10个月未使用，应该是11个月
 *
 * 需要检查：
 * 1. Pro订阅的started_at时间
 * 2. 当前时间
 * 3. 时间差（天数）
 * 4. 计算的已用月数
 * 5. 计算的剩余月数
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProRemainingMonths() {
  console.log('\n🔍 检查Pro订阅剩余月数计算\n')
  console.log('='.repeat(80))

  // 1. 获取所有订阅数据
  const { data: allSubs, error } = await supabase
    .rpc('get_user_all_subscriptions', {
      p_user_id: '2e5cb44b-f18d-4e6c-83e6-e0bda66b26dd'
    })

  if (error) {
    console.error('❌ 获取订阅失败:', error)
    return
  }

  console.log(`\n📊 共找到 ${allSubs?.length || 0} 个订阅\n`)

  // 2. 找到Pro订阅
  const proSub = allSubs?.find((sub: any) => sub.plan_tier === 'pro')

  if (!proSub) {
    console.log('❌ 未找到Pro订阅')
    return
  }

  console.log('✅ 找到Pro订阅:\n')
  console.log(`  ID: ${proSub.id}`)
  console.log(`  计划: ${proSub.plan_tier}`)
  console.log(`  计费周期: ${proSub.billing_cycle}`)
  console.log(`  状态: ${proSub.status}`)
  console.log(`  是否冻结: ${proSub.is_frozen}`)
  console.log(`  开始时间: ${proSub.started_at}`)
  console.log(`  到期时间: ${proSub.expires_at}`)
  if (proSub.frozen_until) {
    console.log(`  冻结至: ${proSub.frozen_until}`)
  }
  console.log(`  剩余天数: ${proSub.remaining_days}`)
  console.log(`  剩余月数: ${proSub.remaining_months}`)

  // 3. 手动计算验证
  console.log('\n' + '='.repeat(80))
  console.log('\n🧮 手动计算验证:\n')

  const now = new Date()
  const startedAt = new Date(proSub.started_at)
  const expiresAt = new Date(proSub.expires_at)

  // 参考时间（冻结用frozen_until，激活用NOW()）
  const referenceTime = proSub.is_frozen && proSub.frozen_until
    ? new Date(proSub.frozen_until)
    : now

  console.log(`  当前时间: ${now.toISOString()}`)
  console.log(`  订阅开始时间: ${startedAt.toISOString()}`)
  console.log(`  参考时间: ${referenceTime.toISOString()} ${proSub.is_frozen ? '(冻结至)' : '(当前时间)'}`)

  // 总月数
  const totalMonths = proSub.billing_cycle === 'yearly' ? 12 : 1
  console.log(`\n  总月数: ${totalMonths}`)

  // 时间差（秒）
  const timeDiff = (referenceTime.getTime() - startedAt.getTime()) / 1000
  console.log(`  时间差（秒）: ${timeDiff}`)

  // 时间差（天）
  const daysDiff = timeDiff / 86400
  console.log(`  时间差（天）: ${daysDiff.toFixed(2)}`)

  // 已用月数（当前公式）
  const usedMonthsCurrent = Math.floor(daysDiff / 30) + 1
  console.log(`\n  📌 当前公式：已用月数 = FLOOR(${daysDiff.toFixed(2)} / 30) + 1 = ${usedMonthsCurrent}`)
  console.log(`  📌 当前公式：剩余月数 = ${totalMonths} - ${usedMonthsCurrent} = ${totalMonths - usedMonthsCurrent}`)

  // 修复后的公式（去掉+1）
  const usedMonthsFixed = Math.floor(daysDiff / 30)
  console.log(`\n  ✅ 修复公式：已用月数 = FLOOR(${daysDiff.toFixed(2)} / 30) = ${usedMonthsFixed}`)
  console.log(`  ✅ 修复公式：剩余月数 = ${totalMonths} - ${usedMonthsFixed} = ${totalMonths - usedMonthsFixed}`)

  // 分析差异
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 差异分析:\n')
  console.log(`  数据库返回的剩余月数: ${proSub.remaining_months}`)
  console.log(`  当前公式计算结果: ${totalMonths - usedMonthsCurrent}`)
  console.log(`  修复后公式计算结果: ${totalMonths - usedMonthsFixed}`)
  console.log(`  差异: ${(totalMonths - usedMonthsFixed) - proSub.remaining_months} 个月`)

  // 4. 建议
  console.log('\n' + '='.repeat(80))
  console.log('\n💡 建议:\n')

  if (proSub.remaining_months === totalMonths - usedMonthsFixed) {
    console.log('  ✅ 当前逻辑已是修复后的公式，无需修改')
  } else if (proSub.remaining_months === totalMonths - usedMonthsCurrent) {
    console.log('  ⚠️ 当前逻辑使用了 +1，建议修改为去掉 +1')
    console.log(`  ⚠️ 修改后，Pro订阅将显示 ${totalMonths - usedMonthsFixed} 个月未使用`)
  } else {
    console.log('  ❓ 计算结果与数据库不匹配，需要进一步调查')
  }

  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkProRemainingMonths()
  .catch(console.error)
  .finally(() => process.exit())
