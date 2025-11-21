/**
 * 🔥 老王调试脚本：直接查询Pro订阅数据
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProDirect() {
  console.log('\n🔍 直接查询Pro订阅数据\n')
  console.log('='.repeat(80))

  // 1. 直接查询 user_subscriptions 表
  const { data: subs, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', '2e5cb44b-f18d-4e6c-83e6-e0bda66b26dd')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`\n📊 共找到 ${subs?.length || 0} 个订阅\n`)

  if (!subs || subs.length === 0) {
    console.log('❌ 未找到任何订阅')
    return
  }

  // 2. 显示所有订阅
  subs.forEach((sub, index) => {
    console.log(`\n订阅 ${index + 1}:`)
    console.log(`  ID: ${sub.id}`)
    console.log(`  计划: ${sub.plan_tier}`)
    console.log(`  计费周期: ${sub.billing_cycle}`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  月度积分: ${sub.monthly_credits}`)
    console.log(`  开始时间: ${sub.started_at}`)
    console.log(`  到期时间: ${sub.expires_at}`)
    console.log(`  创建时间: ${sub.created_at}`)
  })

  // 3. 找到Pro订阅并手动计算
  const proSub = subs.find(sub => sub.plan_tier === 'pro')

  if (!proSub) {
    console.log('\n❌ 未找到Pro订阅')
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n🧮 Pro订阅手动计算:\n')

  const now = new Date()
  const startedAt = new Date(proSub.started_at)
  const expiresAt = new Date(proSub.expires_at)

  console.log(`  当前时间: ${now.toISOString()}`)
  console.log(`  订阅开始时间: ${startedAt.toISOString()}`)
  console.log(`  订阅到期时间: ${expiresAt.toISOString()}`)

  // 总月数
  const totalMonths = proSub.billing_cycle === 'yearly' ? 12 : 1
  console.log(`\n  总月数: ${totalMonths}`)

  // 时间差（天）
  const daysDiff = (now.getTime() - startedAt.getTime()) / (1000 * 86400)
  console.log(`  已过天数: ${daysDiff.toFixed(2)}`)

  // 当前公式：已用月数 = FLOOR(天数 / 30) + 1
  const usedMonthsCurrent = Math.floor(daysDiff / 30) + 1
  console.log(`\n  📌 当前公式：已用月数 = FLOOR(${daysDiff.toFixed(2)} / 30) + 1 = ${usedMonthsCurrent}`)
  console.log(`  📌 当前公式：剩余月数 = ${totalMonths} - ${usedMonthsCurrent} = ${totalMonths - usedMonthsCurrent}`)

  // 修复公式：已用月数 = FLOOR(天数 / 30)
  const usedMonthsFixed = Math.floor(daysDiff / 30)
  console.log(`\n  ✅ 修复公式：已用月数 = FLOOR(${daysDiff.toFixed(2)} / 30) = ${usedMonthsFixed}`)
  console.log(`  ✅ 修复公式：剩余月数 = ${totalMonths} - ${usedMonthsFixed} = ${totalMonths - usedMonthsFixed}`)

  // 用户期望
  console.log('\n' + '='.repeat(80))
  console.log('\n📋 用户反馈:\n')
  console.log(`  当前显示: 10个月未使用`)
  console.log(`  期望显示: 11个月未使用`)
  console.log(`  差异: 1个月`)

  console.log('\n💡 分析:\n')
  console.log(`  如果当前显示10个月，说明已用月数 = ${totalMonths - 10} = ${12 - 10}`)
  console.log(`  如果期望显示11个月，说明已用月数应该 = ${totalMonths - 11} = ${12 - 11}`)
  console.log(`\n  结论：需要将已用月数从 2 减少到 1`)
  console.log(`  方法：去掉公式中的 +1`)

  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkProDirect()
  .catch(console.error)
  .finally(() => process.exit())
