/**
 * 🔥 老王调试脚本：详细检查冻结交易记录
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

async function checkFreezeTransactionDetails() {
  console.log('\n🔍 详细检查冻结交易记录\n')
  console.log('='.repeat(80))

  // 1. 查询冻结交易记录（显示所有字段）
  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('is_frozen', true)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  if (!transactions || transactions.length === 0) {
    console.log('❌ 未找到冻结交易记录')
    return
  }

  console.log(`✅ 找到 ${transactions.length} 条冻结交易记录\n`)

  transactions.forEach((tx, index) => {
    console.log(`冻结交易 ${index + 1}:`)
    console.log('所有字段:')
    Object.entries(tx).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    console.log('')
  })

  // 2. 分析时间字段
  console.log('='.repeat(80))
  console.log('\n📊 时间字段分析:\n')

  const tx = transactions[0]
  const frozenUntil = new Date(tx.frozen_until)
  const createdAt = tx.created_at ? new Date(tx.created_at) : null

  console.log(`  frozen_until: ${frozenUntil.toISOString()}`)
  if (createdAt) {
    console.log(`  created_at: ${createdAt.toISOString()}`)
  } else {
    console.log(`  created_at: 未设置`)
  }

  // 3. 查询Pro订阅
  const { data: proSub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('plan_tier', 'pro')
    .single()

  if (proSub) {
    const startedAt = new Date(proSub.started_at)
    const expiresAt = new Date(proSub.expires_at)

    console.log(`\n  Pro订阅开始: ${startedAt.toISOString()}`)
    console.log(`  Pro订阅到期: ${expiresAt.toISOString()}`)

    // frozen_remaining_seconds 是什么？
    const frozenRemainingSeconds = tx.frozen_remaining_seconds || 0
    const frozenRemainingDays = frozenRemainingSeconds / 86400

    console.log(`\n  frozen_remaining_seconds: ${frozenRemainingSeconds} 秒`)
    console.log(`  frozen_remaining_seconds: ${frozenRemainingDays.toFixed(2)} 天`)

    // 如果 frozen_remaining_seconds 是到原本到期时间的秒数
    const freezeStartTime1 = new Date(expiresAt.getTime() - frozenRemainingSeconds * 1000)
    console.log(`\n  假设1：frozen_remaining_seconds = Pro剩余到期秒数`)
    console.log(`    → 冻结开始时间 = expires_at - frozen_remaining_seconds`)
    console.log(`    → 冻结开始时间 = ${freezeStartTime1.toISOString()}`)

    // 如果 frozen_remaining_seconds 是从 frozen_until 回溯的秒数
    const freezeStartTime2 = new Date(frozenUntil.getTime() - frozenRemainingSeconds * 1000)
    console.log(`\n  假设2：frozen_remaining_seconds = 从frozen_until回溯`)
    console.log(`    → 冻结开始时间 = frozen_until - frozen_remaining_seconds`)
    console.log(`    → 冻结开始时间 = ${freezeStartTime2.toISOString()}`)

    // 如果用 created_at 作为冻结开始时间
    if (createdAt) {
      console.log(`\n  假设3：created_at = 冻结开始时间`)
      console.log(`    → 冻结开始时间 = ${createdAt.toISOString()}`)
    }

    // 用户说的11月12日
    const userExpectedFreezeStart = new Date('2025-11-12T00:00:00Z')
    console.log(`\n  用户期望的冻结开始时间: ${userExpectedFreezeStart.toISOString()}`)

    // 对比
    console.log('\n' + '='.repeat(80))
    console.log('\n💡 哪个假设接近用户期望的11月12日？\n')

    const diff1 = Math.abs(freezeStartTime1.getTime() - userExpectedFreezeStart.getTime()) / (1000 * 86400)
    const diff2 = Math.abs(freezeStartTime2.getTime() - userExpectedFreezeStart.getTime()) / (1000 * 86400)
    const diff3 = createdAt ? Math.abs(createdAt.getTime() - userExpectedFreezeStart.getTime()) / (1000 * 86400) : 999

    console.log(`  假设1 差异: ${diff1.toFixed(2)} 天`)
    console.log(`  假设2 差异: ${diff2.toFixed(2)} 天`)
    if (createdAt) {
      console.log(`  假设3 差异: ${diff3.toFixed(2)} 天`)
    }

    const minDiff = Math.min(diff1, diff2, diff3)
    if (minDiff === diff1) {
      console.log(`\n  ✅ 假设1最接近！`)
    } else if (minDiff === diff2) {
      console.log(`\n  ✅ 假设2最接近！`)
    } else if (minDiff === diff3) {
      console.log(`\n  ✅ 假设3最接近！`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkFreezeTransactionDetails()
  .catch(console.error)
  .finally(() => process.exit())
