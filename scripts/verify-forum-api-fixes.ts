/**
 * 🔥 老王创建：验证Forum API修复是否生效
 * 用途：手动创建测试数据，验证所有API端点
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Service client用于数据操作
const adminClient = createClient(supabaseUrl, supabaseServiceKey)
// Anon client用于登录
const anonClient = createClient(supabaseUrl, supabaseAnonKey)

let testCategoryId: string
let testThreadId: string
let testUserId: string
let testUserToken: string

async function setup() {
  console.log('\n🔧 [Setup] 创建测试数据...\n')

  // 1. 创建测试用户
  console.log('1️⃣ 创建测试用户...')
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email: `verify-test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    email_confirm: true,
  })

  if (userError || !userData.user) {
    console.error('❌ 创建用户失败:', userError)
    process.exit(1)
  }

  testUserId = userData.user.id
  console.log(`✅ 用户创建成功: ${testUserId}`)

  // 2. 登录获取token
  console.log('\n2️⃣ 登录获取Token...')
  const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: userData.user.email!,
    password: 'TestPass123!',
  })

  if (signInError || !sessionData.session) {
    console.error('❌ 登录失败:', signInError)
    process.exit(1)
  }

  testUserToken = sessionData.session.access_token
  console.log(`✅ Token获取成功: ${testUserToken.substring(0, 20)}...`)

  // 3. 创建测试分类
  console.log('\n3️⃣ 创建测试分类...')
  const { data: category, error: catError } = await adminClient
    .from('forum_categories')
    .insert({
      name: '验证测试分类',
      slug: `verify-test-cat-${Date.now()}`,
    })
    .select()
    .single()

  if (catError || !category) {
    console.error('❌ 创建分类失败:', catError)
    process.exit(1)
  }

  testCategoryId = category.id
  console.log(`✅ 分类创建成功: ${testCategoryId}`)

  // 4. 创建测试帖子
  console.log('\n4️⃣ 创建测试帖子...')
  const { data: thread, error: threadError } = await adminClient
    .from('forum_threads')
    .insert({
      category_id: testCategoryId,
      user_id: testUserId,
      title: '验证测试帖子',
      slug: `verify-test-thread-${Date.now()}`,
      content: '这是用于验证API修复的测试帖子内容',
      status: 'open',
    })
    .select()
    .single()

  if (threadError || !thread) {
    console.error('❌ 创建帖子失败:', threadError)
    process.exit(1)
  }

  testThreadId = thread.id
  console.log(`✅ 帖子创建成功: ${testThreadId}`)
}

async function testApis() {
  console.log('\n\n🧪 [Test] 验证API端点...\n')

  // Test 1: GET /api/forum/threads（修复的threads list）
  console.log('1️⃣ GET /api/forum/threads')
  const res1 = await fetch(`${testApiUrl}/api/forum/threads?limit=5`)
  const data1 = await res1.json()
  console.log(`   Status: ${res1.status}`)
  console.log(`   Success: ${data1.success}`)
  console.log(`   Threads Count: ${data1.data?.data?.length || 0}`)
  if (res1.status !== 200 || !data1.success) {
    console.error('   ❌ FAILED')
    return false
  }
  console.log('   ✅ PASSED')

  // Test 2: GET /api/forum/threads/[id]（修复的single thread）
  console.log('\n2️⃣ GET /api/forum/threads/[id]')
  const res2 = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`)
  const data2 = await res2.json()
  console.log(`   Status: ${res2.status}`)
  console.log(`   Success: ${data2.success}`)
  console.log(`   Thread Title: ${data2.data?.title || 'N/A'}`)
  console.log(`   Author Present: ${data2.data?.author ? 'YES' : 'NO'}`)
  if (res2.status !== 200 || !data2.success || !data2.data?.author) {
    console.error('   ❌ FAILED - Missing author info')
    return false
  }
  console.log('   ✅ PASSED')

  // Test 3: GET /api/forum/threads/[id]/replies（修复的replies list）
  console.log('\n3️⃣ GET /api/forum/threads/[id]/replies')
  const res3 = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`)
  const data3 = await res3.json()
  console.log(`   Status: ${res3.status}`)
  console.log(`   Success: ${data3.success}`)
  console.log(`   Replies Count: ${data3.data?.data?.length || 0}`)
  if (res3.status !== 200 || !data3.success) {
    console.error('   ❌ FAILED')
    return false
  }
  console.log('   ✅ PASSED')

  // Test 4: POST /api/forum/threads/[id]/replies（修复的create reply）
  console.log('\n4️⃣ POST /api/forum/threads/[id]/replies')
  const res4 = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      content: '这是验证测试回复内容',
    }),
  })
  const data4 = await res4.json()
  console.log(`   Status: ${res4.status}`)
  console.log(`   Success: ${data4.success}`)
  console.log(`   Reply Created: ${data4.data?.id ? 'YES' : 'NO'}`)
  console.log(`   Author Present: ${data4.data?.author ? 'YES' : 'NO'}`)
  if (res4.status !== 201 || !data4.success || !data4.data?.author) {
    console.error('   ❌ FAILED - Missing author info or not created')
    return false
  }
  console.log('   ✅ PASSED')

  const testReplyId = data4.data.id

  // Test 5: PUT /api/forum/replies/[id]（修复的update reply）
  console.log('\n5️⃣ PUT /api/forum/replies/[id]')
  const res5 = await fetch(`${testApiUrl}/api/forum/replies/${testReplyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      content: '这是更新后的回复内容',
    }),
  })
  const data5 = await res5.json()
  console.log(`   Status: ${res5.status}`)
  console.log(`   Success: ${data5.success}`)
  console.log(`   Reply Updated: ${data5.data?.content?.includes('更新后') ? 'YES' : 'NO'}`)
  console.log(`   Author Present: ${data5.data?.author ? 'YES' : 'NO'}`)
  if (res5.status !== 200 || !data5.success || !data5.data?.author) {
    console.error('   ❌ FAILED - Missing author info or not updated')
    return false
  }
  console.log('   ✅ PASSED')

  return true
}

async function cleanup() {
  console.log('\n\n🧹 [Cleanup] 清理测试数据...\n')

  // 删除测试帖子（会级联删除回复）
  if (testThreadId) {
    await adminClient.from('forum_threads').delete().eq('id', testThreadId)
    console.log(`✅ 帖子已删除: ${testThreadId}`)
  }

  // 删除测试分类
  if (testCategoryId) {
    await adminClient.from('forum_categories').delete().eq('id', testCategoryId)
    console.log(`✅ 分类已删除: ${testCategoryId}`)
  }

  // 删除测试用户
  if (testUserId) {
    await adminClient.auth.admin.deleteUser(testUserId)
    console.log(`✅ 用户已删除: ${testUserId}`)
  }
}

async function main() {
  console.log('🚀 Forum API 修复验证脚本\n')
  console.log('目标：验证手动JOIN修复是否生效\n')

  try {
    await setup()
    const allPassed = await testApis()

    if (allPassed) {
      console.log('\n\n✅ ========== 所有测试通过 ==========')
      console.log('✅ API修复生效！手动JOIN工作正常！')
      console.log('✅ author/profile信息正确附加到响应中')
    } else {
      console.log('\n\n❌ ========== 测试失败 ==========')
      console.log('❌ 部分API仍有问题，需要继续修复')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n\n❌ 执行错误:', error)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

main()
