/**
 * 🔥 老王检查：800积分包的冻结状态
 */

import { createClient } from '@supabase/supabase-js'

async function checkFreezeStatus() {
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
  console.log('🔍 检查800积分包的冻结状态')
  console.log('===============================================================================\n')

  // 查询800积分包
  const { data: package800, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('amount', 800)
    .single()

  if (error || !package800) {
    console.error('❌ 查询800包失败:', error)
    return
  }

  console.log('📦 800积分包详情:')
  console.log('================================================================================')
  console.log(`ID: ${package800.id}`)
  console.log(`积分: ${package800.amount}`)
  console.log(`剩余积分: ${package800.remaining_amount}`)
  console.log(`is_frozen: ${package800.is_frozen}`)
  console.log(`frozen_until: ${package800.frozen_until}`)
  console.log(`frozen_remaining_seconds: ${package800.frozen_remaining_seconds}`)
  console.log(`original_expires_at: ${package800.original_expires_at}`)
  console.log(`expires_at: ${package800.expires_at}`)
  console.log(`created_at: ${package800.created_at}`)
  console.log('================================================================================\n')

  // 判断冻结状态
  const now = new Date()
  const frozenUntil = package800.frozen_until ? new Date(package800.frozen_until) : null
  const isFrozen = package800.is_frozen && frozenUntil && frozenUntil > now

  console.log('🔍 冻结状态分析:')
  console.log(`当前时间: ${now.toLocaleString('zh-CN')}`)
  console.log(`frozen_until: ${frozenUntil ? frozenUntil.toLocaleString('zh-CN') : 'null'}`)
  console.log(`is_frozen字段: ${package800.is_frozen}`)
  console.log(`frozen_until > 当前时间: ${frozenUntil ? frozenUntil > now : 'N/A'}`)
  console.log(`最终判断: ${isFrozen ? '🔒 冻结中' : '✅ 未冻结'}`)
  console.log('================================================================================\n')

  if (!isFrozen && package800.is_frozen === true) {
    console.log('⚠️ 警告：is_frozen=true 但 frozen_until 已过期，需要解冻！')
  } else if (!package800.is_frozen) {
    console.log('⚠️ 警告：800积分包的 is_frozen 为 false，可能冻结逻辑未执行！')
  }
}

checkFreezeStatus().catch(console.error)
