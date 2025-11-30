/**
 * 测试新的积分过期函数
 */

import { createClient } from '@supabase/supabase-js'

async function testNewFunction() {
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
  console.log('🧪 测试新的积分过期函数')
  console.log('===============================================================================\n')

  // 调用新函数
  const { data, error } = await supabase
    .rpc('get_user_credits_expiry_realtime', { p_user_id: userId })

  if (error) {
    console.error('❌ 调用失败:', error)
    return
  }

  console.log('📊 积分过期信息（新函数结果）:\n')
  data?.forEach((item: any) => {
    const date = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'
    console.log(`  ${date}: ${item.remaining_credits}积分`)
  })

  console.log('\n===============================================================================')
  console.log('✅ 验证结果:\n')

  // 验证是否符合预期
  const expected = {
    '2025-12-12': 2000,
    '2026-10-26': 1920
  }

  let allCorrect = true
  data?.forEach((item: any) => {
    const dateKey = item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : null
    if (dateKey && expected[dateKey as keyof typeof expected]) {
      const expectedCredits = expected[dateKey as keyof typeof expected]
      const isCorrect = item.remaining_credits === expectedCredits
      console.log(`  ${new Date(item.expiry_date).toLocaleDateString('zh-CN')}: ${item.remaining_credits}积分 ${isCorrect ? '✅ 正确' : `❌ 错误（应该是${expectedCredits}）`}`)
      if (!isCorrect) allCorrect = false
    }
  })

  // 检查是否有不应该出现的记录（比如777积分的冻结包）
  const has777 = data?.some((item: any) => item.remaining_credits === 777)
  if (has777) {
    console.log('  ❌ 错误：显示了冻结的777积分包')
    allCorrect = false
  } else {
    console.log('  ✅ 正确：没有显示冻结的777积分包')
  }

  console.log('\n===============================================================================')
  console.log(allCorrect ? '🎉 测试通过！新逻辑完全正确！' : '❌ 测试失败！需要检查逻辑')
  console.log('===============================================================================')
}

testNewFunction().catch(console.error)
