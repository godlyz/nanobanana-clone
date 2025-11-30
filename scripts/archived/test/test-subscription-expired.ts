/**
 * 🔥 老王测试：手动发送 subscription.expired webhook 测试解冻逻辑
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

async function testExpiredWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhooks/creem'
  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'

  // 🔥 步骤1：查询当前Max订阅ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data: allSubs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_tier', 'max')

  if (subsError) {
    console.error('❌ 查询订阅失败:', subsError)
    return
  }

  if (!allSubs || allSubs.length === 0) {
    console.error('❌ 没有找到Max订阅')
    console.log('所有订阅:', allSubs)
    return
  }

  const maxSub = allSubs[0]

  console.log('================================================================================')
  console.log('🔥 老王测试：手动发送 subscription.expired webhook')
  console.log('================================================================================')
  console.log('当前Max订阅信息:')
  console.log(`  DB ID: ${maxSub.id}`)
  console.log(`  Creem Subscription ID: ${maxSub.creem_subscription_id}`)
  console.log(`  Status: ${maxSub.status}`)
  console.log(`  到期时间: ${maxSub.expires_at}\n`)

  // 🔥 步骤2：构造 subscription.expired webhook payload
  const webhookPayload = {
    id: 'evt_test_expired_001',
    eventType: 'subscription.expired',
    created_at: Math.floor(Date.now() / 1000),
    object: {
      id: maxSub.creem_subscription_id,
      object: 'subscription',
      subscription_id: maxSub.creem_subscription_id,
      customer_id: userId,
      status: 'expired',
      expired_at: Math.floor(Date.now() / 1000),
      metadata: {
        type: 'subscription',
        user_id: userId,
        plan_tier: 'max',
        billing_cycle: 'monthly',
      }
    }
  }

  console.log('Webhook URL:', webhookUrl)
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2))

  // 🔥 步骤3：计算签名
  const secret = process.env.CREEM_WEBHOOK_SECRET!
  const payloadString = JSON.stringify(webhookPayload)
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
  console.log('Computed Signature:', signature)

  // 🔥 步骤4：发送webhook
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature,
      },
      body: payloadString,
    })

    console.log('\n📊 响应状态:', response.status, response.statusText)

    const responseText = await response.text()
    console.log('响应内容:', responseText)

    console.log('\n================================================================================')
  } catch (error) {
    console.error('❌ 请求失败:', error)
  }
}

testExpiredWebhook().catch(console.error)
