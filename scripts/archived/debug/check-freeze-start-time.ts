/**
 * 🔥 老王调试脚本：检查冻结开始时间
 *
 * 问题：当前计算用 frozen_until 作为参考时间，包含了后延时间
 * 应该：用升级时的时间（冻结开始时间）
 *
 * 计算公式：
 * 冻结开始时间 = frozen_until - frozen_remaining_seconds
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

async function checkFreezeStartTime() {
  console.log('\n🔍 检查冻结开始时间\n')
  console.log('='.repeat(80))

  // 1. 查询Pro订阅
  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('plan_tier', 'pro')
    .single()

  if (!subs) {
    console.log('❌ 未找到Pro订阅')
    return
  }

  console.log('✅ 找到Pro订阅\n')
  console.log(`  ID: ${subs.id}`)
  console.log(`  开始时间: ${subs.started_at}`)
  console.log(`  到期时间: ${subs.expires_at}`)

  // 2. 查询冻结交易记录
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('related_entity_id', subs.id)
    .eq('is_frozen', true)

  if (!transactions || transactions.length === 0) {
    console.log('\n❌ 未找到冻结交易记录')
    return
  }

  console.log(`\n✅ 找到 ${transactions.length} 条冻结交易记录\n`)

  transactions.forEach((tx, index) => {
    console.log(`冻结交易 ${index + 1}:`)
    console.log(`  ID: ${tx.id}`)
    console.log(`  冻结至: ${tx.frozen_until}`)
    console.log(`  冻结剩余秒数: ${tx.frozen_remaining_seconds}`)
    console.log(`  冻结剩余积分: ${tx.remaining_amount}`)
    console.log(`  交易时间: ${tx.transaction_date}`)

    // 计算冻结开始时间
    const frozenUntil = new Date(tx.frozen_until)
    const frozenRemainingSeconds = tx.frozen_remaining_seconds || 0
    const freezeStartTime = new Date(frozenUntil.getTime() - frozenRemainingSeconds * 1000)

    console.log(`  🔥 冻结开始时间: ${freezeStartTime.toISOString()}`)

    // 计算实际使用天数
    const startedAt = new Date(subs.started_at)
    const actualUsedDays = (freezeStartTime.getTime() - startedAt.getTime()) / (1000 * 86400)

    console.log(`  🔥 实际使用天数: ${actualUsedDays.toFixed(2)} 天`)

    // 计算已用月数和剩余月数
    const totalMonths = 12  // Pro年付
    const usedMonthsWithPlus1 = Math.floor(actualUsedDays / 30) + 1
    const usedMonthsWithout = Math.floor(actualUsedDays / 30)

    console.log(`\n  📊 剩余月数计算:`)
    console.log(`     总月数: ${totalMonths}`)
    console.log(`     实际使用天数: ${actualUsedDays.toFixed(2)}`)
    console.log(`     公式1（带+1）: 已用 ${usedMonthsWithPlus1} 月，剩余 ${totalMonths - usedMonthsWithPlus1} 月`)
    console.log(`     公式2（不带+1）: 已用 ${usedMonthsWithout} 月，剩余 ${totalMonths - usedMonthsWithout} 月`)
    console.log(``)

    // 对比当前错误计算
    const wrongRefTime = frozenUntil
    const wrongUsedDays = (wrongRefTime.getTime() - startedAt.getTime()) / (1000 * 86400)
    const wrongUsedMonths = Math.floor(wrongUsedDays / 30) + 1

    console.log(`  ❌ 当前错误计算（用frozen_until）:`)
    console.log(`     参考时间: frozen_until = ${frozenUntil.toISOString()}`)
    console.log(`     计算天数: ${wrongUsedDays.toFixed(2)} 天（包含后延）`)
    console.log(`     已用月数: ${wrongUsedMonths} 月`)
    console.log(`     剩余月数: ${totalMonths - wrongUsedMonths} 月`)
    console.log(``)
  })

  console.log('='.repeat(80))
  console.log('\n💡 结论:\n')
  console.log('  ✅ 应该用：frozen_until - frozen_remaining_seconds 作为参考时间')
  console.log('  ❌ 不应该用：frozen_until（包含了后延时间）')
  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkFreezeStartTime()
  .catch(console.error)
  .finally(() => process.exit())
