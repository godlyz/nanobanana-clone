/**
 * 🔥 老王验证脚本：用 original_expires_at 计算冻结开始时间
 *
 * 关键发现：
 * - frozen_remaining_seconds = original_expires_at - 冻结开始时间（NOW）
 * - 冻结开始时间 = original_expires_at - frozen_remaining_seconds
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

async function verifyFreezeStartWithOriginal() {
  console.log('\n🔍 用 original_expires_at 计算冻结开始时间\n')
  console.log('='.repeat(80))

  // 查询冻结交易
  const { data: tx } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('is_frozen', true)
    .single()

  if (!tx) {
    console.log('❌ 未找到冻结交易')
    return
  }

  // 查询Pro订阅
  const { data: proSub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('plan_tier', 'pro')
    .single()

  if (!proSub) {
    console.log('❌ 未找到Pro订阅')
    return
  }

  console.log('✅ 数据准备完成\n')

  // 关键时间点
  const startedAt = new Date(proSub.started_at)
  const originalExpiresAt = new Date(tx.original_expires_at!)
  const frozenRemainingSeconds = tx.frozen_remaining_seconds || 0
  const frozenUntil = new Date(tx.frozen_until)

  console.log('📊 关键时间点:\n')
  console.log(`  Pro订阅开始: ${startedAt.toISOString()}`)
  console.log(`  原始到期时间: ${originalExpiresAt.toISOString()}`)
  console.log(`  冻结至: ${frozenUntil.toISOString()}`)
  console.log(`  冻结剩余秒数: ${frozenRemainingSeconds} 秒 (${(frozenRemainingSeconds / 86400).toFixed(2)} 天)`)

  console.log('\n' + '='.repeat(80))
  console.log('\n🧮 计算冻结开始时间:\n')

  // ✅ 正确计算：original_expires_at - frozen_remaining_seconds
  const freezeStartTime = new Date(originalExpiresAt.getTime() - frozenRemainingSeconds * 1000)
  console.log(`  公式: original_expires_at - frozen_remaining_seconds`)
  console.log(`  计算: ${originalExpiresAt.toISOString()} - ${frozenRemainingSeconds}秒`)
  console.log(`  结果: ${freezeStartTime.toISOString()}`)

  // 转换为北京时间显示
  const freezeStartBeijing = new Date(freezeStartTime.getTime() + 8 * 3600 * 1000)
  console.log(`  北京时间: ${freezeStartBeijing.toISOString().replace('T', ' ').substring(0, 19)}`)

  console.log('\n' + '='.repeat(80))
  console.log('\n📋 用户期望验证:\n')

  const userExpected = new Date('2025-11-12T00:00:00Z')
  const diff = Math.abs(freezeStartTime.getTime() - userExpected.getTime()) / (1000 * 86400)

  console.log(`  用户说的升级时间: 11月12日`)
  console.log(`  计算出的冻结开始时间: ${freezeStartTime.toISOString().substring(0, 10)}`)
  console.log(`  差异: ${diff.toFixed(2)} 天`)
  console.log(`  ${diff < 1 ? '✅ 吻合！' : '⚠️ 有偏差'}`)

  console.log('\n' + '='.repeat(80))
  console.log('\n🎯 剩余月数计算:\n')

  // 实际使用天数
  const actualUsedDays = (freezeStartTime.getTime() - startedAt.getTime()) / (1000 * 86400)
  console.log(`  实际使用天数: ${actualUsedDays.toFixed(2)} 天`)

  // 已用月数和剩余月数
  const totalMonths = 12  // Pro年付
  const usedMonthsWithPlus1 = Math.floor(actualUsedDays / 30) + 1
  const usedMonthsWithout = Math.floor(actualUsedDays / 30)

  console.log(`\n  总月数: ${totalMonths}`)
  console.log(`  公式1（带+1）: 已用 ${usedMonthsWithPlus1} 月，剩余 ${totalMonths - usedMonthsWithPlus1} 月 ${totalMonths - usedMonthsWithPlus1 === 11 ? '✅' : '❌'}`)
  console.log(`  公式2（不带+1）: 已用 ${usedMonthsWithout} 月，剩余 ${totalMonths - usedMonthsWithout} 月 ${totalMonths - usedMonthsWithout === 11 ? '✅' : '❌'}`)

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 结论:\n')
  console.log(`  ✅ 冻结开始时间 = original_expires_at - frozen_remaining_seconds`)
  console.log(`  ${diff < 1 ? '✅' : '❌'} 计算出的时间与用户说的11月12日${diff < 1 ? '吻合' : '有偏差'}`)
  console.log(`  ${totalMonths - usedMonthsWithPlus1 === 11 ? '✅ 带+1公式正确' : ''}${totalMonths - usedMonthsWithout === 11 ? '✅ 不带+1公式正确' : ''}`)

  console.log('\n' + '='.repeat(80))
  console.log('')
}

verifyFreezeStartWithOriginal()
  .catch(console.error)
  .finally(() => process.exit())
