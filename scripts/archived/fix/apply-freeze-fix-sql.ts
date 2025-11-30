/**
 * 🔥 老王修复：应用冻结函数修复SQL
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function applySQL() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('================================================================================')
  console.log('🔧 应用冻结函数修复SQL')
  console.log('================================================================================')

  // 读取SQL文件
  const sqlContent = readFileSync('supabase/migrations/20251112000012_fix_freeze_dont_modify_expires.sql', 'utf-8')

  // 移除注释行和空行，只保留CREATE OR REPLACE FUNCTION部分
  const functionSQL = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n')

  console.log('\n📝 执行SQL...')

  // 执行SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql: functionSQL })

  if (error) {
    // 如果rpc('exec_sql')不存在，尝试直接执行
    console.log('⚠️ rpc exec_sql 不可用，尝试直接发送SQL请求...')

    // 使用fetch直接调用Supabase REST API
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
      console.error('❌ SQL执行失败:', await response.text())
      console.log('\n📋 请手动在Supabase Dashboard的SQL Editor中执行以下SQL：')
      console.log('================================================================================')
      console.log(functionSQL)
      console.log('================================================================================')
      return
    }
  }

  console.log('✅ SQL执行成功！')
  console.log('✅ freeze_subscription_credits_smart 函数已更新')
  console.log('================================================================================')
}

applySQL().catch(console.error)
