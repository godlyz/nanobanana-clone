/**
 * 🔥 老王调试脚本：调用数据库函数检查返回值
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'  // 从上面查到的user_id

async function checkFunctionResult() {
  console.log('\n🔍 调用 get_user_all_subscriptions 函数\n')
  console.log('='.repeat(80))

  // 调用数据库函数
  const { data: subs, error } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: USER_ID })

  if (error) {
    console.error('❌ 调用函数失败:', error)
    return
  }

  console.log(`\n📊 函数返回 ${subs?.length || 0} 个订阅\n`)

  if (!subs || subs.length === 0) {
    console.log('❌ 函数未返回任何订阅')
    return
  }

  // 显示所有订阅
  subs.forEach((sub: any, index: number) => {
    console.log(`\n订阅 ${index + 1}:`)
    console.log(`  ID: ${sub.id}`)
    console.log(`  计划: ${sub.plan_tier}`)
    console.log(`  计费周期: ${sub.billing_cycle}`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  是否冻结: ${sub.is_frozen}`)
    console.log(`  开始时间: ${sub.started_at}`)
    console.log(`  到期时间: ${sub.expires_at}`)
    console.log(`  剩余天数: ${sub.remaining_days}`)
    console.log(`  剩余月数: ${sub.remaining_months}`)  // 🔥 重点！

    if (sub.is_frozen) {
      console.log(`  冻结至: ${sub.frozen_until}`)
      console.log(`  冻结积分: ${sub.frozen_credits}`)
    }

    // 手动验证计算
    const now = new Date()
    const startedAt = new Date(sub.started_at)
    const totalMonths = sub.billing_cycle === 'yearly' ? 12 : 1

    // 参考时间（冻结用frozen_until，激活用NOW()）
    const referenceTime = sub.is_frozen && sub.frozen_until
      ? new Date(sub.frozen_until)
      : now

    const daysDiff = (referenceTime.getTime() - startedAt.getTime()) / (1000 * 86400)

    // 当前公式
    const usedMonthsCurrent = Math.floor(daysDiff / 30) + 1
    const remainingMonthsCurrent = totalMonths - usedMonthsCurrent

    // 修复公式
    const usedMonthsFixed = Math.floor(daysDiff / 30)
    const remainingMonthsFixed = totalMonths - usedMonthsFixed

    console.log(`\n  🧮 手动验证:`)
    console.log(`     总月数: ${totalMonths}`)
    console.log(`     已过天数: ${daysDiff.toFixed(2)}`)
    console.log(`     当前公式：已用 ${usedMonthsCurrent} 月，剩余 ${remainingMonthsCurrent} 月`)
    console.log(`     修复公式：已用 ${usedMonthsFixed} 月，剩余 ${remainingMonthsFixed} 月`)
    console.log(`     函数返回：剩余 ${sub.remaining_months} 月`)

    // 对比
    if (sub.remaining_months === remainingMonthsCurrent) {
      console.log(`     ✅ 函数返回值 = 当前公式`)
    } else if (sub.remaining_months === remainingMonthsFixed) {
      console.log(`     ✅ 函数返回值 = 修复公式`)
    } else {
      console.log(`     ❓ 函数返回值与预期不符`)
    }
  })

  // 找到Pro订阅
  const proSub = subs.find((sub: any) => sub.plan_tier === 'pro')

  if (proSub) {
    console.log('\n' + '='.repeat(80))
    console.log('\n📋 Pro订阅分析:\n')
    console.log(`  函数返回的剩余月数: ${proSub.remaining_months}`)
    console.log(`  用户反馈的当前显示: 10个月`)
    console.log(`  用户期望的显示: 11个月`)
    console.log(`  差异: ${proSub.remaining_months !== 10 ? '不符合' : '符合'}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkFunctionResult()
  .catch(console.error)
  .finally(() => process.exit())
