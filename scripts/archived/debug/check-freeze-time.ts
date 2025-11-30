/**
 * 检查冻结操作的时间
 */

import { createClient } from '@supabase/supabase-js'

async function checkFreezeTime() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  console.log('===============================================================================')
  console.log('🔍 检查冻结操作时间')
  console.log('===============================================================================\n')

  // 查询800包的详细信息
  const { data: package800 } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  if (package800) {
    console.log('📦 800积分包时间信息:')
    console.log(`  创建时间 (created_at): ${package800.created_at}`)
    console.log(`  更新时间 (updated_at): ${package800.updated_at}`)
    console.log(`  冻结至 (frozen_until): ${package800.frozen_until}`)
    console.log('')
  }

  // 查询2000包（Max订阅充值）
  const { data: package2000 } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 2000)
    .single()

  if (package2000) {
    console.log('📦 2000积分包时间信息（升级时间）:')
    console.log(`  创建时间 (created_at): ${package2000.created_at}`)
    console.log('')
  }

  // 查询Max订阅
  const { data: maxSub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_tier', 'max')
    .single()

  if (maxSub) {
    console.log('📋 Max订阅时间信息:')
    console.log(`  开始时间 (started_at): ${maxSub.started_at}`)
    console.log('')
  }

  console.log('===============================================================================')
  console.log('📌 结论：')
  console.log('  冻结交易记录应该使用的时间：2000包创建时间 或 Max订阅开始时间')
  console.log('  当前使用：800包创建时间 ❌')
  console.log('===============================================================================')
}

checkFreezeTime().catch(console.error)
