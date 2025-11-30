/**
 * 🔥 老王测试：手动发送webhook测试升级逻辑
 */

import crypto from 'crypto'

async function testWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/creem'

  // 🔥 老王修复：使用正确的 Creem webhook 结构
  const webhookPayload = {
    id: 'evt_test_001',
    eventType: 'subscription.active',  // 🔥 字段名是 eventType，不是 event
    created_at: Math.floor(Date.now() / 1000),
    object: {  // 🔥 字段名是 object，不是 data
      id: 'sub_test_upgrade_max',
      object: 'subscription',
      subscription_id: 'sub_test_upgrade_max',
      product_id: process.env.CREEM_MAX_MONTHLY_PRODUCT_ID,  // Max monthly 产品ID
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      billing_cycle: 'monthly',
      metadata: {
        type: 'subscription',  // 🔥 重要：标识为订阅类型
        user_id: 'bfb8182a-6865-4c66-a89e-05711796e2b2',
        plan_tier: 'max',
        billing_cycle: 'monthly',
        action: 'upgrade',  // 🔥 重要：标识为升级操作
      }
    }
  }

  console.log('================================================================================')
  console.log('🔥 老王测试：手动发送 subscription.active webhook')
  console.log('================================================================================')
  console.log('Webhook URL:', webhookUrl)
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2))

  // 🔥 老王添加：计算正确的签名
  const secret = process.env.CREEM_WEBHOOK_SECRET!
  const payloadString = JSON.stringify(webhookPayload)
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
  console.log('Computed Signature:', signature)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature,  // 🔥 老王修复：使用正确计算的签名
      },
      body: payloadString,  // 🔥 老王修复：使用相同的payload字符串
    })

    console.log('\n📊 响应状态:', response.status, response.statusText)

    const responseText = await response.text()
    console.log('响应内容:', responseText)

    console.log('\n================================================================================')
  } catch (error) {
    console.error('❌ 请求失败:', error)
  }
}

testWebhook().catch(console.error)
