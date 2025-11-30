/**
 * 🔥 老王测试：直接测试触发器是否工作
 * 用途：创建一个测试用户，验证profile是否自动创建
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function testTrigger() {
  console.log('\n🧪 [测试] 触发器是否正常工作\n')

  const testEmail = `trigger-direct-test-${Date.now()}@example.com`
  let testUserId: string | null = null

  try {
    // 1. 创建用户
    console.log('1️⃣ 创建测试用户...')
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (createError) {
      console.error('❌ 创建用户失败:', createError)
      console.error('Error details:', JSON.stringify(createError, null, 2))
      return
    }

    testUserId = userData.user.id
    console.log(`✅ 用户创建成功: ${testUserId}`)

    // 2. 等待2秒让触发器执行
    console.log('\n2️⃣ 等待触发器执行（2秒）...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 3. 检查profile是否自动创建
    console.log('\n3️⃣ 检查profile是否自动创建...')
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle()

    if (profileError) {
      console.error('❌ 查询profile失败:', profileError)
      return
    }

    if (!profile) {
      console.error('❌ 触发器未执行！Profile未自动创建！')
      console.error('这说明触发器虽然创建了，但没有正常工作')

      // 尝试手动创建profile测试
      console.log('\n4️⃣ 尝试手动创建profile...')
      const { error: insertError } = await adminClient.from('user_profiles').insert({
        user_id: testUserId,
        display_name: testEmail,
      })

      if (insertError) {
        console.error('❌ 手动插入也失败:', insertError)
      } else {
        console.log('✅ 手动插入成功（说明表和RLS没问题，就是触发器没执行）')
      }
    } else {
      console.log('✅ 触发器正常工作！Profile已自动创建:')
      console.log(JSON.stringify(profile, null, 2))
    }
  } catch (error) {
    console.error('\n❌ 测试过程出错:', error)
  } finally {
    // 清理测试用户
    if (testUserId) {
      console.log('\n5️⃣ 清理测试用户...')
      await adminClient.auth.admin.deleteUser(testUserId)
      console.log('✅ 清理完成')
    }
  }
}

testTrigger()
