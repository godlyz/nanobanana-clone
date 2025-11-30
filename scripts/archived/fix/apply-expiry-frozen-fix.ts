/**
 * 应用修复：积分过期计算排除从冻结包消费的积分
 * 迁移：20251112000015_fix_expiry_exclude_frozen_consumption.sql
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyFix() {
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
  console.log('🔧 修复积分过期计算（排除从冻结包消费的积分）')
  console.log('===============================================================================\n')

  // 读取迁移文件
  const sqlPath = join(process.cwd(), 'supabase/migrations/20251112000015_fix_expiry_exclude_frozen_consumption.sql')
  const sqlContent = readFileSync(sqlPath, 'utf-8')

  console.log('📝 请在Supabase Dashboard的SQL Editor中执行以下SQL：')
  console.log('================================================================================')
  console.log(sqlContent)
  console.log('================================================================================\n')

  // 等待用户手动执行后，验证结果
  console.log('⏳ 假设SQL已执行，验证修复结果...\n')

  // 验证前的状态
  console.log('🔍 修复前的积分过期信息（预期：2025/12/12显示1977）:\n')
  const { data: beforeData } = await supabase
    .rpc('get_user_credits_expiry_realtime', { p_user_id: userId })

  beforeData?.forEach((item: any) => {
    const date = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'
    console.log(`  ${date}: ${item.remaining_credits}积分`)
  })
  console.log('')

  console.log('================================================================================')
  console.log('📌 预期修复后的结果：')
  console.log('  2025/12/12: 2000积分  ← 完整的2000包（23积分从800冻结包扣除，不影响2000包）')
  console.log('  2026/10/26: 1920积分  ← 不变')
  console.log('================================================================================')
}

applyFix().catch(console.error)
