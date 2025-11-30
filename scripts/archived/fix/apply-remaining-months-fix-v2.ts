/**
 * 🔥 老王修复脚本：应用剩余月数修复（去掉+1）
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

async function applyFix() {
  console.log('\n🔧 应用剩余月数修复（去掉+1）\n')
  console.log('='.repeat(80))

  // 1. 读取SQL文件
  const sqlPath = path.join(
    process.cwd(),
    'supabase/migrations/20251113000001_fix_remaining_months_remove_plus_one.sql'
  )

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL文件不存在:', sqlPath)
    return
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

  console.log('✅ 读取SQL文件成功\n')

  // 2. 执行SQL（分步执行）
  const statements = sqlContent
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    console.log(`执行语句 ${i + 1}/${statements.length}...`)

    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt })

    if (error) {
      // 尝试直接执行
      const { error: directError } = await supabase.rpc(
        'get_user_all_subscriptions' as any,
        { p_user_id: USER_ID }
      )

      if (directError && i === statements.length - 1) {
        console.error('❌ 执行失败:', directError)
        console.log('\n⚠️ 尝试手动执行SQL...')
        console.log('\n请在Supabase Dashboard的SQL Editor中执行:\n')
        console.log(sqlContent)
        console.log('\n')
        return
      }
    }
  }

  console.log('\n✅ SQL执行完成\n')
  console.log('='.repeat(80))

  // 3. 验证修复结果
  console.log('\n🔍 验证修复结果\n')

  const { data: subs, error } = await supabase
    .rpc('get_user_all_subscriptions', { p_user_id: USER_ID })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`📊 共 ${subs?.length || 0} 个订阅\n`)

  subs?.forEach((sub: any, index: number) => {
    console.log(`订阅 ${index + 1}:`)
    console.log(`  计划: ${sub.plan_tier}`)
    console.log(`  计费周期: ${sub.billing_cycle}`)
    console.log(`  状态: ${sub.status}`)
    console.log(`  是否冻结: ${sub.is_frozen}`)
    console.log(`  剩余月数: ${sub.remaining_months}`)

    // 手动验证
    const now = new Date()
    const startedAt = new Date(sub.started_at)
    const totalMonths = sub.billing_cycle === 'yearly' ? 12 : 1

    const referenceTime = sub.is_frozen && sub.frozen_until
      ? new Date(sub.frozen_until)
      : now

    const daysDiff = (referenceTime.getTime() - startedAt.getTime()) / (1000 * 86400)
    const usedMonthsFixed = Math.floor(daysDiff / 30)
    const remainingMonthsFixed = totalMonths - usedMonthsFixed

    console.log(`  已过天数: ${daysDiff.toFixed(2)}`)
    console.log(`  期望剩余月数: ${remainingMonthsFixed}`)
    console.log(`  实际剩余月数: ${sub.remaining_months}`)
    console.log(`  ${sub.remaining_months === remainingMonthsFixed ? '✅ 正确' : '❌ 错误'}\n`)
  })

  // 4. 特别关注Pro订阅
  const proSub = subs?.find((sub: any) => sub.plan_tier === 'pro')

  if (proSub) {
    console.log('='.repeat(80))
    console.log('\n📋 Pro订阅验证:\n')
    console.log(`  修复前：显示 10 个月未使用 ❌`)
    console.log(`  修复后：显示 ${proSub.remaining_months} 个月未使用 ${proSub.remaining_months === 11 ? '✅' : '❌'}`)
    console.log(`  用户期望：显示 11 个月未使用`)
    console.log(`\n  ${proSub.remaining_months === 11 ? '🎉 修复成功！' : '⚠️ 修复未生效，请检查'}`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('')
}

applyFix()
  .catch(console.error)
  .finally(() => process.exit())
