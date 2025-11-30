/**
 * 🧪 老王测试：验证即时升级模式下，旧套餐积分是否正确冻结
 *
 * 测试场景：Pro 年付 → Max 月付（immediate模式）
 *
 * 预期行为：
 * 1. 订阅记录更新为 Max 月付
 * 2. 订阅时间延长（新周期 + 原剩余天数）
 * 3. 旧套餐（Pro年付）的积分被冻结，解冻时间 = 延长后的expires_at
 * 4. 新套餐（Max月付）的积分正常充值，不被冻结
 */

import { createClient } from '@supabase/supabase-js'

// 测试配置
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  testUserId: 'bfb8182a-6865-4c66-a89e-05711796e2b2',  // 你的测试用户ID
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
// 测试1：查询用户订阅和积分状态
// ============================================
async function test1_CheckSubscriptionAndCredits() {
  console.log('\n🧪 测试1：查询用户当前订阅和积分状态')

  try {
    // 1. 查询订阅
    const { data: subscription, error: subError } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: TEST_CONFIG.testUserId })

    if (subError) throw subError
    if (!subscription || subscription.length === 0) {
      throw new Error('用户没有活跃订阅')
    }

    const sub = subscription[0]

    console.log('   📋 订阅信息:')
    console.log('      - 套餐:', sub.plan_tier, sub.billing_cycle)
    console.log('      - 状态:', sub.status)
    console.log('      - 到期时间:', sub.expires_at)
    console.log('      - 订阅ID:', sub.id)

    // 2. 查询积分记录
    const { data: credits, error: creditsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .eq('related_entity_id', sub.id)
      .eq('transaction_type', 'subscription_refill')
      .order('created_at', { ascending: false })

    if (creditsError) throw creditsError

    console.log(`   💰 积分记录（共 ${credits?.length || 0} 条）:`)
    credits?.forEach((credit, index) => {
      console.log(`      [${index + 1}] 积分: ${credit.amount}, 过期: ${credit.expires_at}, 冻结: ${credit.frozen_until || '无'}`)
    })

    // 3. 查询可用积分
    const { data: availableCredits, error: availError } = await supabase
      .rpc('get_user_available_credits', { target_user_id: TEST_CONFIG.testUserId })

    if (availError) throw availError

    console.log(`   ✨ 当前可用积分: ${availableCredits}`)

    recordTest(
      '查询订阅和积分状态',
      true,
      `订阅: ${sub.plan_tier} ${sub.billing_cycle}, 可用积分: ${availableCredits}`,
      {
        subscription_id: sub.id,
        plan: `${sub.plan_tier} ${sub.billing_cycle}`,
        status: sub.status,
        expires_at: sub.expires_at,
        total_credits: credits?.length || 0,
        available_credits: availableCredits
      }
    )

    return { subscription: sub, credits, availableCredits }
  } catch (error: any) {
    recordTest(
      '查询订阅和积分状态',
      false,
      error.message,
      error
    )
    return null
  }
}

// ============================================
// 测试2：检查冻结逻辑是否正确（根据最新充值记录判断）
// ============================================
async function test2_CheckFreezeLogic(beforeState: any) {
  console.log('\n🧪 测试2：检查积分冻结逻辑')

  if (!beforeState) {
    recordTest('检查积分冻结逻辑', false, '跳过测试（状态查询失败）')
    return
  }

  try {
    const { subscription, credits } = beforeState

    // 找出最新的两条充值记录
    if (!credits || credits.length < 2) {
      recordTest(
        '检查积分冻结逻辑',
        false,
        `积分记录不足（需要至少2条，当前 ${credits?.length || 0} 条）`,
        { credits }
      )
      return
    }

    const latestCredit = credits[0]  // 最新充值（应该是新套餐Max月付的积分）
    const secondLatestCredit = credits[1]  // 第二新的充值（应该是旧套餐Pro年付的积分）

    console.log('   📊 最新两条积分记录:')
    console.log('      [最新] 积分:', latestCredit.amount, ', 冻结至:', latestCredit.frozen_until || '无')
    console.log('      [次新] 积分:', secondLatestCredit.amount, ', 冻结至:', secondLatestCredit.frozen_until || '无')

    // 预期：
    // - 最新充值（新套餐）应该 **没有** 被冻结
    // - 次新充值（旧套餐）应该 **被冻结**

    const latestIsFrozen = !!latestCredit.frozen_until
    const secondLatestIsFrozen = !!secondLatestCredit.frozen_until

    let passed = true
    let message = ''

    if (latestIsFrozen) {
      passed = false
      message = '❌ 错误：最新积分（新套餐）不应该被冻结！'
    } else if (!secondLatestIsFrozen) {
      passed = false
      message = '❌ 错误：旧积分（旧套餐）应该被冻结！'
    } else {
      message = '✅ 正确：新套餐积分未冻结，旧套餐积分已冻结'
    }

    // 如果旧积分被冻结，检查冻结时间是否正确
    if (secondLatestIsFrozen) {
      const frozenUntil = new Date(secondLatestCredit.frozen_until!)
      const expiresAt = new Date(subscription.expires_at)

      // 冻结时间应该等于订阅的 expires_at（延长后的时间）
      const timeDiff = Math.abs(frozenUntil.getTime() - expiresAt.getTime())
      const isDiffAcceptable = timeDiff < 60000  // 允许1分钟误差

      if (!isDiffAcceptable) {
        passed = false
        message += `\n   ⚠️ 警告：冻结时间不正确！期望: ${expiresAt.toISOString()}, 实际: ${frozenUntil.toISOString()}`
      } else {
        message += `\n   ✅ 冻结时间正确: ${frozenUntil.toISOString()}`
      }
    }

    recordTest(
      '检查积分冻结逻辑',
      passed,
      message,
      {
        latest_credit: {
          amount: latestCredit.amount,
          frozen_until: latestCredit.frozen_until,
          created_at: latestCredit.created_at
        },
        second_latest_credit: {
          amount: secondLatestCredit.amount,
          frozen_until: secondLatestCredit.frozen_until,
          created_at: secondLatestCredit.created_at
        }
      }
    )
  } catch (error: any) {
    recordTest(
      '检查积分冻结逻辑',
      false,
      error.message,
      error
    )
  }
}

// ============================================
// 测试3：验证可用积分计算（应该只包含未冻结的积分）
// ============================================
async function test3_VerifyAvailableCredits(beforeState: any) {
  console.log('\n🧪 测试3：验证可用积分计算')

  if (!beforeState) {
    recordTest('验证可用积分计算', false, '跳过测试（状态查询失败）')
    return
  }

  try {
    const { credits, availableCredits } = beforeState

    // 手动计算可用积分（未冻结 + 未过期）
    const now = new Date()
    let expectedAvailable = 0

    credits.forEach((credit: any) => {
      const isFrozen = credit.frozen_until && new Date(credit.frozen_until) > now
      const isExpired = credit.expires_at && new Date(credit.expires_at) <= now
      const isValid = credit.amount > 0

      if (isValid && !isFrozen && !isExpired) {
        expectedAvailable += credit.amount
      }
    })

    console.log('   📊 积分统计:')
    console.log('      - RPC 返回可用积分:', availableCredits)
    console.log('      - 手动计算可用积分:', expectedAvailable)

    const passed = availableCredits === expectedAvailable

    recordTest(
      '验证可用积分计算',
      passed,
      passed
        ? `可用积分正确: ${availableCredits}`
        : `可用积分不匹配！期望: ${expectedAvailable}, 实际: ${availableCredits}`,
      {
        rpc_available: availableCredits,
        manual_calculation: expectedAvailable,
        total_credits: credits.length
      }
    )
  } catch (error: any) {
    recordTest(
      '验证可用积分计算',
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
  console.log('🚀 开始测试即时升级模式下的积分冻结逻辑...\n')
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
    const beforeState = await test1_CheckSubscriptionAndCredits()
    await test2_CheckFreezeLogic(beforeState)
    await test3_VerifyAvailableCredits(beforeState)

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
