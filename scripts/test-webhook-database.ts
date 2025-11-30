#!/usr/bin/env tsx

/**
 * 艹！Webhook数据库表测试脚本
 *
 * 这个SB脚本测试Webhook系统的所有核心功能！
 *
 * 测试内容：
 * 1. 创建Webhook（create_webhook RPC）
 * 2. 订阅事件（subscribe_webhook_events RPC）
 * 3. 触发Webhook事件（trigger_webhook_event RPC）
 * 4. 查询Webhook统计（get_webhook_statistics RPC）
 * 5. 重试失败的投递（retry_failed_delivery RPC）
 * 6. 查询待重试的投递（get_pending_webhook_retries RPC）
 */

import { createClient } from '@supabase/supabase-js'

// 环境变量
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少环境变量：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 创建Supabase客户端（使用Service Role Key以绕过RLS）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * 测试结果统计
 */
interface TestStats {
  total: number
  passed: number
  failed: number
  errors: string[]
}

const stats: TestStats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
}

/**
 * 测试用例函数
 */
async function runTest(name: string, fn: () => Promise<void>) {
  stats.total++
  console.log(`\n🧪 测试: ${name}`)

  try {
    await fn()
    stats.passed++
    console.log(`✅ 通过: ${name}`)
  } catch (error) {
    stats.failed++
    const errorMsg = error instanceof Error ? error.message : String(error)
    stats.errors.push(`${name}: ${errorMsg}`)
    console.error(`❌ 失败: ${name}`)
    console.error(`   错误: ${errorMsg}`)
  }
}

/**
 * 测试1：创建Webhook
 */
async function testCreateWebhook() {
  await runTest('创建Webhook (create_webhook)', async () => {
    const { data, error } = await supabase.rpc('create_webhook', {
      p_name: '测试Webhook',
      p_url: 'https://example.com/webhook',
      p_event_types: ['video.generated', 'video.failed'],
    })

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('未返回数据')

    const webhook = data[0]
    console.log(`   Webhook ID: ${webhook.webhook_id}`)
    console.log(`   Webhook Secret: ${webhook.webhook_secret?.substring(0, 10)}...`)
    console.log(`   订阅事件数: ${webhook.subscribed_events?.length || 0}`)

    // 验证返回数据
    if (!webhook.webhook_id) throw new Error('缺少webhook_id')
    if (!webhook.webhook_secret) throw new Error('缺少webhook_secret')
    if (webhook.webhook_secret.length !== 64) throw new Error('Secret长度不正确（应为64位）')

    // 保存webhook_id供后续测试使用
    ;(global as any).testWebhookId = webhook.webhook_id
  })
}

/**
 * 测试2：查询Webhook列表
 */
async function testListWebhooks() {
  await runTest('查询Webhook列表', async () => {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .limit(10)

    if (error) throw new Error(error.message)
    console.log(`   找到 ${data?.length || 0} 个Webhook`)

    if (data && data.length > 0) {
      const webhook = data[0]
      console.log(`   第一个Webhook: ${webhook.name} (${webhook.url})`)
    }
  })
}

/**
 * 测试3：订阅事件
 */
async function testSubscribeEvents() {
  await runTest('订阅事件 (subscribe_webhook_events)', async () => {
    const webhookId = (global as any).testWebhookId
    if (!webhookId) throw new Error('未找到测试Webhook ID')

    const { data, error } = await supabase.rpc('subscribe_webhook_events', {
      p_webhook_id: webhookId,
      p_event_types: ['credit.added', 'credit.consumed'],
    })

    if (error) throw new Error(error.message)
    console.log(`   订阅结果: ${data?.message || '成功'}`)
    console.log(`   订阅数量: ${data?.subscription_count || 0}`)
  })
}

/**
 * 测试4：触发Webhook事件
 */
async function testTriggerWebhookEvent() {
  await runTest('触发Webhook事件 (trigger_webhook_event)', async () => {
    const { data, error } = await supabase.rpc('trigger_webhook_event', {
      p_event_type: 'video.generated',
      p_payload: {
        video_id: 'test-video-123',
        status: 'completed',
        url: 'https://example.com/video.mp4',
      },
    })

    if (error) throw new Error(error.message)
    console.log(`   触发结果: ${data?.message || '成功'}`)
    console.log(`   投递数量: ${data?.delivery_count || 0}`)

    // 保存delivery_id供后续测试使用
    if (data && data.delivery_ids && data.delivery_ids.length > 0) {
      ;(global as any).testDeliveryId = data.delivery_ids[0]
    }
  })
}

/**
 * 测试5：查询Webhook统计
 */
async function testGetWebhookStatistics() {
  await runTest('查询Webhook统计 (get_webhook_statistics)', async () => {
    const webhookId = (global as any).testWebhookId
    if (!webhookId) throw new Error('未找到测试Webhook ID')

    const { data, error } = await supabase.rpc('get_webhook_statistics', {
      p_webhook_id: webhookId,
    })

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('未返回统计数据')

    const stats = data[0]
    console.log(`   总投递: ${stats.total_deliveries}`)
    console.log(`   成功: ${stats.successful_deliveries}`)
    console.log(`   失败: ${stats.failed_deliveries}`)
    console.log(`   待处理: ${stats.pending_deliveries}`)
    console.log(`   成功率: ${stats.success_rate}%`)
    console.log(`   平均响应时间: ${stats.avg_response_time}ms`)
  })
}

/**
 * 测试6：查询待重试的投递
 */
async function testGetPendingRetries() {
  await runTest('查询待重试的投递 (get_pending_webhook_retries)', async () => {
    const { data, error } = await supabase.rpc('get_pending_webhook_retries', {
      p_limit: 10,
    })

    if (error) throw new Error(error.message)
    console.log(`   待重试数量: ${data?.length || 0}`)

    if (data && data.length > 0) {
      const delivery = data[0]
      console.log(`   第一个待重试投递: ${delivery.delivery_id}`)
      console.log(`   尝试次数: ${delivery.attempt_number}`)
      console.log(`   下次重试时间: ${delivery.next_retry_at}`)
    }
  })
}

/**
 * 测试7：重试失败的投递
 */
async function testRetryFailedDelivery() {
  await runTest('重试失败的投递 (retry_failed_delivery)', async () => {
    const deliveryId = (global as any).testDeliveryId
    if (!deliveryId) {
      console.log('   跳过：未找到测试投递ID')
      return
    }

    const { data, error } = await supabase.rpc('retry_failed_delivery', {
      p_delivery_id: deliveryId,
    })

    if (error) throw new Error(error.message)
    console.log(`   重试结果: ${data?.message || '成功'}`)
  })
}

/**
 * 测试8：取消订阅事件
 */
async function testUnsubscribeEvents() {
  await runTest('取消订阅事件 (unsubscribe_webhook_events)', async () => {
    const webhookId = (global as any).testWebhookId
    if (!webhookId) throw new Error('未找到测试Webhook ID')

    const { data, error } = await supabase.rpc('unsubscribe_webhook_events', {
      p_webhook_id: webhookId,
      p_event_types: ['credit.added'],
    })

    if (error) throw new Error(error.message)
    console.log(`   取消订阅结果: ${data?.message || '成功'}`)
    console.log(`   剩余订阅数: ${data?.remaining_count || 0}`)
  })
}

/**
 * 测试9：查询Webhook事件类型
 */
async function testListWebhookEvents() {
  await runTest('查询Webhook事件类型', async () => {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('is_enabled', true)

    if (error) throw new Error(error.message)
    console.log(`   可用事件类型: ${data?.length || 0}`)

    if (data && data.length > 0) {
      console.log('   事件列表:')
      data.forEach((event) => {
        console.log(`     - ${event.event_type} (${event.category})`)
      })
    }
  })
}

/**
 * 测试10：清理测试数据
 */
async function testCleanup() {
  await runTest('清理测试数据', async () => {
    const webhookId = (global as any).testWebhookId
    if (!webhookId) {
      console.log('   跳过：未找到测试Webhook ID')
      return
    }

    // 删除测试Webhook（会级联删除订阅和投递记录）
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)

    if (error) throw new Error(error.message)
    console.log('   测试数据已清理')
  })
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 开始测试 Webhook 数据库表...\n')
  console.log('=' .repeat(60))

  // 执行所有测试
  await testCreateWebhook()
  await testListWebhooks()
  await testSubscribeEvents()
  await testTriggerWebhookEvent()
  await testGetWebhookStatistics()
  await testGetPendingRetries()
  await testRetryFailedDelivery()
  await testUnsubscribeEvents()
  await testListWebhookEvents()
  await testCleanup()

  // 输出测试结果
  console.log('\n' + '=' .repeat(60))
  console.log('\n📊 测试结果统计:')
  console.log(`   总测试数: ${stats.total}`)
  console.log(`   通过: ${stats.passed} ✅`)
  console.log(`   失败: ${stats.failed} ❌`)
  console.log(`   通过率: ${((stats.passed / stats.total) * 100).toFixed(2)}%`)

  if (stats.failed > 0) {
    console.log('\n❌ 失败的测试:')
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  }

  console.log('\n' + '=' .repeat(60))
  console.log(stats.failed === 0 ? '✅ 所有测试通过！' : '❌ 部分测试失败！')

  process.exit(stats.failed === 0 ? 0 : 1)
}

// 执行主函数
main().catch((error) => {
  console.error('💥 测试脚本执行失败:', error)
  process.exit(1)
})
