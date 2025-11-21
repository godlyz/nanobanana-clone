/**
 * 🔥 老王调试脚本：查看所有订阅
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllSubscriptions() {
  console.log('\n🔍 查看所有订阅\n')
  console.log('='.repeat(80))

  // 查询所有订阅（不限制user_id）
  const { data: subs, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`\n📊 共找到 ${subs?.length || 0} 个订阅（显示最近10个）\n`)

  if (!subs || subs.length === 0) {
    console.log('❌ 数据库中没有任何订阅')
    return
  }

  // 显示所有订阅
  subs.forEach((sub, index) => {
    console.log(`\n订阅 ${index + 1}:`)
    console.log(`  ID: ${sub.id}`)
    console.log(`  User ID: ${sub.user_id}`)
    console.log(`  计划: ${sub.plan_tier}`)
    console.log(`  计费周期: ${sub.billing_cycle}`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  月度积分: ${sub.monthly_credits}`)
    console.log(`  开始时间: ${sub.started_at}`)
    console.log(`  到期时间: ${sub.expires_at}`)
    console.log(`  创建时间: ${sub.created_at}`)

    // 手动计算剩余月数
    const now = new Date()
    const startedAt = new Date(sub.started_at)
    const totalMonths = sub.billing_cycle === 'yearly' ? 12 : 1
    const daysDiff = (now.getTime() - startedAt.getTime()) / (1000 * 86400)
    const usedMonthsCurrent = Math.floor(daysDiff / 30) + 1
    const remainingMonthsCurrent = totalMonths - usedMonthsCurrent

    console.log(`  已过天数: ${daysDiff.toFixed(2)}`)
    console.log(`  当前公式剩余月数: ${remainingMonthsCurrent}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('')
}

checkAllSubscriptions()
  .catch(console.error)
  .finally(() => process.exit())
