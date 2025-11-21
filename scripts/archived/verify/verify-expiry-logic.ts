/**
 * 验证积分过期逻辑的正确性
 */

import { createClient } from '@supabase/supabase-js'

async function verify() {
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
  console.log('🔍 验证积分过期逻辑')
  console.log('===============================================================================\n')

  // 查询所有充值包的详细信息
  const { data: packages, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .gt('amount', 0)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('📦 所有充值包信息:\n')

  const now = new Date()
  packages?.forEach((pkg: any) => {
    const expiryDate = pkg.expires_at ? new Date(pkg.expires_at) : null
    const frozenUntil = pkg.frozen_until ? new Date(pkg.frozen_until) : null
    const isExpired = expiryDate && expiryDate <= now
    const isFrozen = pkg.is_frozen && frozenUntil && frozenUntil > now

    console.log(`${pkg.amount}积分包:`)
    console.log(`  剩余积分: ${pkg.remaining_amount}`)
    console.log(`  过期时间: ${expiryDate ? expiryDate.toLocaleDateString('zh-CN') : '永久'}`)
    console.log(`  是否过期: ${isExpired ? '是 ❌' : '否 ✅'}`)
    console.log(`  是否冻结: ${isFrozen ? '是 (冻结至' + frozenUntil!.toLocaleDateString('zh-CN') + ') ❌' : '否 ✅'}`)

    // 判断是否应该显示在过期信息里
    const shouldShow = pkg.remaining_amount > 0 && !isExpired && !isFrozen
    console.log(`  应该显示: ${shouldShow ? '是 ✅' : '否 ❌'}`)
    console.log('')
  })

  console.log('===============================================================================')
  console.log('📋 预期的积分过期信息（简化逻辑）:\n')

  // 模拟新逻辑的结果
  const expectedResults = packages
    ?.filter((pkg: any) => {
      const expiryDate = pkg.expires_at ? new Date(pkg.expires_at) : null
      const frozenUntil = pkg.frozen_until ? new Date(pkg.frozen_until) : null
      const isExpired = expiryDate && expiryDate <= now
      const isFrozen = pkg.is_frozen && frozenUntil && frozenUntil > now

      return pkg.remaining_amount > 0 && !isExpired && !isFrozen
    })
    .reduce((acc: any, pkg: any) => {
      const key = pkg.expires_at || 'NULL'
      if (!acc[key]) {
        acc[key] = 0
      }
      acc[key] += pkg.remaining_amount
      return acc
    }, {})

  Object.entries(expectedResults || {}).forEach(([expiryKey, credits]) => {
    const date = expiryKey === 'NULL' ? '永久' : new Date(expiryKey).toLocaleDateString('zh-CN')
    console.log(`  ${date}: ${credits}积分`)
  })

  console.log('\n===============================================================================')
}

verify().catch(console.error)
