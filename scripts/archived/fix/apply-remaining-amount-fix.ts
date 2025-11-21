/**
 * 🔥 老王修复：应用remaining_amount修复SQL
 * 用途：将可用积分计算从SUM(amount)改为SUM(remaining_amount)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 缺少环境变量：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('===============================================================================')
  console.log('🔧 应用 remaining_amount 修复SQL')
  console.log('===============================================================================\n')

  // 读取SQL文件
  const sqlPath = join(process.cwd(), 'supabase/migrations/20251112000013_fix_available_credits_use_remaining.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  // 移除注释行，只保留CREATE OR REPLACE FUNCTION部分
  const lines = sqlContent.split('\n')
  const functionStartIndex = lines.findIndex(line => line.includes('CREATE OR REPLACE FUNCTION'))

  if (functionStartIndex === -1) {
    console.error('❌ 未找到 CREATE OR REPLACE FUNCTION 语句')
    process.exit(1)
  }

  const functionSQL = lines.slice(functionStartIndex).join('\n')

  console.log('📝 执行SQL...\n')

  try {
    // 直接执行SQL（使用rpc可能不支持DDL，我们用fetch）
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: functionSQL })
    })

    if (!response.ok) {
      console.error('❌ SQL执行失败，尝试手动执行...')
      console.log('\n📋 请在Supabase Dashboard的SQL Editor中执行以下SQL：')
      console.log('================================================================================')
      console.log(functionSQL)
      console.log('================================================================================\n')

      // 即使API调用失败，我们也尝试验证修复
      await verifyFix(supabase)
      return
    }

    console.log('✅ SQL执行成功！\n')
    await verifyFix(supabase)

  } catch (error) {
    console.error('❌ 执行失败:', error)
    console.log('\n📋 请在Supabase Dashboard的SQL Editor中手动执行：')
    console.log('================================================================================')
    console.log(functionSQL)
    console.log('================================================================================\n')
  }
}

async function verifyFix(supabase: any) {
  console.log('🔍 验证修复结果...\n')

  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  try {
    // 调用修复后的函数
    const { data: newAvailableCredits, error } = await supabase
      .rpc('get_user_available_credits', { target_user_id: userId })

    if (error) {
      console.error('❌ 调用函数失败:', error)
      return
    }

    console.log('📊 修复后的可用积分:', newAvailableCredits)

    // 查询所有积分包的详情
    const { data: allPackages, error: packagesError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .gt('amount', 0)
      .order('created_at', { ascending: false })

    if (packagesError) {
      console.error('❌ 查询积分包失败:', packagesError)
      return
    }

    console.log('\n📦 所有积分包明细:')
    console.log('================================================================================')

    let totalAvailable = 0
    let totalFrozen = 0

    allPackages?.forEach((pkg: any) => {
      const isFrozen = pkg.is_frozen && pkg.frozen_until && new Date(pkg.frozen_until) > new Date()
      const isExpired = pkg.expires_at && new Date(pkg.expires_at) <= new Date()
      const remaining = pkg.remaining_amount || 0

      console.log(`ID: ${pkg.id.substring(0, 8)}...`)
      console.log(`  积分: ${pkg.amount} → 剩余: ${remaining}`)
      console.log(`  状态: ${isFrozen ? '🔒 冻结' : isExpired ? '⏰ 过期' : '✅ 可用'}`)
      if (isFrozen) {
        console.log(`  冻结至: ${new Date(pkg.frozen_until).toLocaleString('zh-CN')}`)
        totalFrozen += remaining
      } else if (!isExpired) {
        totalAvailable += remaining
      }
      console.log(`  过期时间: ${pkg.expires_at ? new Date(pkg.expires_at).toLocaleString('zh-CN') : '永久'}`)
      console.log('')
    })

    console.log('================================================================================')
    console.log(`✅ 可用积分（手动计算）: ${totalAvailable}`)
    console.log(`🔒 冻结积分（手动计算）: ${totalFrozen}`)
    console.log(`📊 数据库函数返回: ${newAvailableCredits}`)
    console.log(`${totalAvailable === newAvailableCredits ? '✅ 一致！' : '❌ 不一致！'}`)
    console.log('================================================================================')

  } catch (error) {
    console.error('❌ 验证失败:', error)
  }
}

applyFix().catch(console.error)
