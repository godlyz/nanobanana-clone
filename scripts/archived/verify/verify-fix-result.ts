/**
 * 🔥 老王验证脚本：检查修复结果
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

async function verifyFixResult() {
  console.log('\n🔍 验证修复结果\n')
  console.log('='.repeat(80))

  // 1. 调用修复后的函数
  const { data: subs, error } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: USER_ID })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  if (!subs || subs.length === 0) {
    console.log('❌ 未找到订阅')
    return
  }

  console.log(`✅ 找到 ${subs.length} 个订阅\n`)

  // 2. 显示所有订阅
  subs.forEach((sub: any, index: number) => {
    console.log(`订阅 ${index + 1}: ${sub.plan_tier} (${sub.billing_cycle})`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  是否冻结: ${sub.is_frozen}`)
    console.log(`  开始时间: ${sub.started_at}`)
    console.log(`  到期时间: ${sub.expires_at}`)
    console.log(`  剩余天数: ${sub.remaining_days}`)
    console.log(`  剩余月数: ${sub.remaining_months}`)

    if (sub.is_frozen) {
      console.log(`  冻结至: ${sub.frozen_until}`)
      console.log(`  冻结积分: ${sub.frozen_credits}`)
    }

    console.log('')
  })

  // 3. 重点验证Pro订阅
  const proSub = subs.find((sub: any) => sub.plan_tier === 'pro')

  console.log('='.repeat(80))
  console.log('\n📋 Pro订阅验证结果:\n')

  if (!proSub) {
    console.log('❌ 未找到Pro订阅')
    return
  }

  console.log(`  修复前：显示 10 个月未使用 ❌`)
  console.log(`  修复后：显示 ${proSub.remaining_months} 个月未使用 ${proSub.remaining_months === 11 ? '✅' : '❌'}`)
  console.log(`  期望值：显示 11 个月未使用`)

  if (proSub.remaining_months === 11) {
    console.log('\n  🎉 修复成功！Pro订阅正确显示11个月未使用！')
  } else {
    console.log('\n  ⚠️ 修复未生效，当前显示:', proSub.remaining_months)
    console.log('  请检查：')
    console.log('  1. SQL是否正确执行？')
    console.log('  2. 是否有SQL错误？')
    console.log('  3. 刷新前端页面试试')
  }

  // 4. 验证Max订阅
  const maxSub = subs.find((sub: any) => sub.plan_tier === 'max')

  if (maxSub) {
    console.log('\n' + '='.repeat(80))
    console.log('\n📋 Max订阅验证:\n')
    console.log(`  剩余月数: ${maxSub.remaining_months}`)
    console.log(`  期望值: 0 个月（刚购买不到1个月）`)
    console.log(`  ${maxSub.remaining_months === 0 ? '✅ 正确' : '⚠️ 有偏差'}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 下一步:\n')
  console.log('  1. 刷新前端页面')
  console.log('  2. 查看订阅管理页面')
  console.log('  3. 确认Pro订阅显示 "剩余11个月未使用"')
  console.log('\n' + '='.repeat(80))
  console.log('')
}

verifyFixResult()
  .catch(console.error)
  .finally(() => process.exit())
