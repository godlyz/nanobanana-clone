/**
 * 检查23积分的消费记录
 */

import { createClient } from '@supabase/supabase-js'

async function checkConsumption() {
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
  console.log('🔍 检查23积分的消费记录')
  console.log('===============================================================================\n')

  // 查询所有消费记录（负数交易）
  const { data: consumptions, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .lt('amount', 0)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`📋 找到 ${consumptions.length} 条消费记录:\n`)

  let totalConsumed = 0
  consumptions.forEach((tx: any, index: number) => {
    const absAmount = Math.abs(tx.amount)
    totalConsumed += absAmount
    console.log(`${index + 1}. 消费 ${absAmount}积分`)
    console.log(`   ID: ${tx.id}`)
    console.log(`   时间: ${tx.created_at}`)
    console.log(`   描述: ${tx.description || 'NULL'}`)
    console.log(`   consumed_from_id: ${tx.consumed_from_id || 'NULL'}`)
    console.log(`   is_frozen: ${tx.is_frozen || false}`)
    console.log('')
  })

  console.log(`📊 总消费: ${totalConsumed}积分\n`)

  // 查询800包和2000包
  const { data: packages, error: pkgError } = await supabase
    .from('credit_transactions')
    .select('id, amount, remaining_amount, expires_at')
    .eq('user_id', userId)
    .in('amount', [800, 2000])
    .gt('amount', 0)
    .order('created_at', { ascending: true })

  if (!pkgError && packages) {
    console.log('📦 积分包信息:\n')
    packages.forEach((pkg: any) => {
      const expiryDate = pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString('zh-CN') : '永久'
      console.log(`${pkg.amount}积分包:`)
      console.log(`  ID: ${pkg.id}`)
      console.log(`  剩余: ${pkg.remaining_amount}积分`)
      console.log(`  过期: ${expiryDate}`)
      console.log(`  已消费: ${pkg.amount - pkg.remaining_amount}积分`)
      console.log('')
    })
  }
}

checkConsumption().catch(console.error)
