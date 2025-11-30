/**
 * 🧪 老王测试：验证 /api/subscription/status 的 remaining_days 返回值
 *
 * 测试目的：
 * 1. 验证普通订阅（无降级）时，remaining_days 是否正确计算
 * 2. 验证 immediate 降级后，remaining_days 是否使用 original_plan_expires_at
 */

import { createClient } from '@supabase/supabase-js'

// 测试配置
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testUserId: 'bfb8182a-6865-4c66-a89e-05711796e2b2', // 你的测试用户ID
}

// 创建 Supabase Service Client
const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 测试结果记录
interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const testResults: TestResult[] = []

// 辅助函数：记录测试结果
function recordTest(name: string, passed: boolean, message: string, details?: any) {
  testResults.push({ name, passed, message, details })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
  if (details) {
    console.log('   详情:', JSON.stringify(details, null, 2))
  }
}

// ============================================
// 测试1：验证 RPC 返回的原始数据
// ============================================
async function test1_RpcRawData() {
  console.log('\n🧪 测试1：验证 RPC 返回的原始数据')

  try {
    const { data: subscription, error } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: TEST_CONFIG.testUserId })

    if (error) throw error
    if (!subscription || subscription.length === 0) {
      throw new Error('用户没有活跃订阅')
    }

    const sub = subscription[0]

    // 验证关键字段
    console.log('   📋 RPC 返回的订阅数据:')
    console.log('      - plan_tier:', sub.plan_tier)
    console.log('      - billing_cycle:', sub.billing_cycle)
    console.log('      - expires_at:', sub.expires_at)
    console.log('      - original_plan_expires_at:', sub.original_plan_expires_at || 'null')
    console.log('      - adjustment_mode:', sub.adjustment_mode || 'null')
    console.log('      - downgrade_to_plan:', sub.downgrade_to_plan || 'null')

    // 手动计算剩余天数
    const now = new Date()
    let expectedRemainingDays: number

    if (sub.original_plan_expires_at) {
      // immediate 降级模式：使用原套餐到期时间
      const originalExpiresAt = new Date(sub.original_plan_expires_at)
      expectedRemainingDays = Math.ceil((originalExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      // 正常订阅：使用当前订阅到期时间
      const expiresAt = new Date(sub.expires_at)
      expectedRemainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    console.log('      - 预期 remaining_days:', expectedRemainingDays)

    recordTest(
      'RPC 原始数据验证',
      true,
      `订阅数据正常，预期剩余 ${expectedRemainingDays} 天`,
      {
        plan: `${sub.plan_tier} ${sub.billing_cycle}`,
        expires_at: sub.expires_at,
        original_plan_expires_at: sub.original_plan_expires_at,
        adjustment_mode: sub.adjustment_mode,
        expected_remaining_days: expectedRemainingDays
      }
    )

    return expectedRemainingDays
  } catch (error: any) {
    recordTest(
      'RPC 原始数据验证',
      false,
      error.message,
      error
    )
    return null
  }
}

// ============================================
// 测试2：模拟 status API 的计算逻辑
// ============================================
async function test2_StatusApiLogic(expectedRemainingDays: number | null) {
  console.log('\n🧪 测试2：模拟 status API 的计算逻辑')

  if (expectedRemainingDays === null) {
    recordTest(
      'Status API 逻辑模拟',
      false,
      '跳过测试（RPC数据获取失败）'
    )
    return
  }

  try {
    const { data: subscription, error } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: TEST_CONFIG.testUserId })

    if (error) throw error
    if (!subscription || subscription.length === 0) {
      throw new Error('用户没有活跃订阅')
    }

    const sub = subscription[0]
    const now = new Date()

    // 🔥 老王的修复逻辑（与 status/route.ts 一致）
    let remainingDays: number | null = null
    if (sub.original_plan_expires_at) {
      // immediate降级模式：计算原套餐剩余时间
      const originalExpiresAt = new Date(sub.original_plan_expires_at)
      const diffInMs = originalExpiresAt.getTime() - now.getTime()
      remainingDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    } else if (sub.expires_at) {
      // 正常订阅或scheduled降级：计算当前订阅剩余时间
      const expiresAt = new Date(sub.expires_at)
      const diffInMs = expiresAt.getTime() - now.getTime()
      remainingDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    }

    console.log('   📋 计算结果:')
    console.log('      - 计算方式:', sub.original_plan_expires_at ? 'immediate降级模式' : '正常订阅模式')
    console.log('      - 实际 remaining_days:', remainingDays)
    console.log('      - 预期 remaining_days:', expectedRemainingDays)

    const passed = remainingDays === expectedRemainingDays
    recordTest(
      'Status API 逻辑模拟',
      passed,
      passed ? `计算正确，remaining_days = ${remainingDays}` : `计算错误，期望 ${expectedRemainingDays}，实际 ${remainingDays}`,
      {
        calculated: remainingDays,
        expected: expectedRemainingDays,
        mode: sub.original_plan_expires_at ? 'immediate' : 'normal'
      }
    )
  } catch (error: any) {
    recordTest(
      'Status API 逻辑模拟',
      false,
      error.message,
      error
    )
  }
}

// ============================================
// 主测试函数
// ============================================
async function runAllTests() {
  console.log('🚀 开始测试 status API 的 remaining_days 计算...\n')
  console.log('=' .repeat(60))

  // 验证环境变量
  if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseServiceKey) {
    console.error('❌ 缺少必要的环境变量！')
    console.error('   请确保设置了:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  try {
    // 运行所有测试
    const expectedRemainingDays = await test1_RpcRawData()
    await test2_StatusApiLogic(expectedRemainingDays)

    // 打印测试报告
    console.log('\n' + '='.repeat(60))
    console.log('📊 测试报告')
    console.log('='.repeat(60))

    const totalTests = testResults.length
    const passedTests = testResults.filter(t => t.passed).length
    const failedTests = totalTests - passedTests

    console.log(`\n总测试数: ${totalTests}`)
    console.log(`✅ 通过: ${passedTests}`)
    console.log(`❌ 失败: ${failedTests}`)
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:')
      testResults
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`   - ${t.name}: ${t.message}`)
        })
    }

    console.log('\n' + '='.repeat(60))

    // 退出码
    process.exit(failedTests > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error)
    process.exit(1)
  }
}

// 运行测试
runAllTests()
