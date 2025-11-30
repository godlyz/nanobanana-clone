/**
 * 🔥 老王创建：检查Supabase数据库触发器状态
 * 用途：验证handle_new_user触发器是否正确创建
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function checkTriggers() {
  console.log('\n🔍 [检查] Supabase数据库触发器状态\n')

  try {
    // 1. 检查触发器是否存在
    console.log('1️⃣ 检查on_auth_user_created触发器...')
    const { data: triggers, error: triggerError } = await adminClient
      .from('pg_trigger')
      .select('*')
      .eq('tgname', 'on_auth_user_created')

    if (triggerError) {
      console.error('❌ 查询触发器失败:', triggerError)
    } else if (!triggers || triggers.length === 0) {
      console.error('❌ 触发器不存在！需要执行migration')
    } else {
      console.log('✅ 触发器存在:', triggers)
    }

    // 2. 检查函数是否存在
    console.log('\n2️⃣ 检查handle_new_user函数...')
    const { data: functions, error: funcError } = await adminClient.rpc('handle_new_user' as any)

    if (funcError) {
      console.error('❌ 函数不存在或无法调用:', funcError)
    } else {
      console.log('✅ 函数存在')
    }

    // 3. 检查user_profiles表是否存在
    console.log('\n3️⃣ 检查user_profiles表...')
    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('count')
      .limit(1)

    if (profileError) {
      console.error('❌ user_profiles表不存在或无法访问:', profileError)
    } else {
      console.log('✅ user_profiles表存在')
    }

    // 4. 手动测试创建用户（绕过触发器，直接插入profile）
    console.log('\n4️⃣ 测试手动创建用户+profile...')
    const testEmail = `trigger-test-${Date.now()}@example.com`

    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (userError) {
      console.error('❌ 创建用户失败:', userError)
      return
    }

    console.log(`✅ 用户创建成功: ${userData.user.id}`)

    // 等待1秒让触发器执行
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 检查profile是否自动创建
    const { data: profile, error: checkError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (checkError || !profile) {
      console.error('❌ 触发器未执行！profile未自动创建')
      console.error('Error:', checkError)

      // 手动创建profile测试RLS
      console.log('\n5️⃣ 尝试手动创建profile测试RLS...')
      const { error: insertError } = await adminClient.from('user_profiles').insert({
        user_id: userData.user.id,
        display_name: userData.user.email,
      })

      if (insertError) {
        console.error('❌ 手动插入失败（可能RLS策略问题）:', insertError)
      } else {
        console.log('✅ 手动插入成功（说明RLS允许，但触发器没执行）')
      }
    } else {
      console.log('✅ 触发器正常执行！profile自动创建:', profile)
    }

    // 清理测试用户
    console.log('\n6️⃣ 清理测试用户...')
    await adminClient.auth.admin.deleteUser(userData.user.id)
    console.log('✅ 清理完成')
  } catch (error) {
    console.error('\n❌ 检查过程出错:', error)
  }
}

checkTriggers()
