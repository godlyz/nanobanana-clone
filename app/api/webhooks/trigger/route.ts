/**
 * 艹！Webhook触发API - 触发Webhook事件并加入队列
 *
 * POST /api/webhooks/trigger
 *
 * 功能：
 * - 触发指定事件类型的Webhook
 * - 将任务加入BullMQ队列
 * - 返回已加入队列的Webhook数量
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebhookDeliveryQueue } from '@/lib/queue/webhook-queue'

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json()
    const { eventType, payload } = body

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid eventType' },
        { status: 400 }
      )
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid payload' },
        { status: 400 }
      )
    }

    // 2. 验证用户身份
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. 查询订阅此事件的所有活跃Webhook
    const { data: webhooks, error: webhookError } = await supabase.rpc(
      'get_active_webhooks_for_event',
      { p_event_type: eventType }
    )

    if (webhookError) {
      console.error('[WebhookTrigger] 查询Webhook失败:', webhookError)
      return NextResponse.json(
        { error: 'Failed to query webhooks' },
        { status: 500 }
      )
    }

    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json(
        {
          message: 'No active webhooks subscribed to this event',
          eventType,
          webhooksTriggered: 0,
        },
        { status: 200 }
      )
    }

    // 4. 为每个Webhook创建投递任务并加入队列
    const jobs = await Promise.all(
      webhooks.map((webhook: any) =>
        WebhookDeliveryQueue.addDeliveryJob({
          webhookId: webhook.webhook_id,
          eventType,
          payload,
          attempt: 1,
          maxRetries: webhook.max_retries || 3,
          retryDelaySeconds: webhook.retry_delay_seconds || 60,
        })
      )
    )

    console.log(
      `[WebhookTrigger] 触发事件: ${eventType}, ` +
        `Webhook数量: ${webhooks.length}, 任务ID: ${jobs.map((j) => j.id).join(', ')}`
    )

    // 5. 返回成功响应
    return NextResponse.json(
      {
        message: 'Webhooks triggered successfully',
        eventType,
        webhooksTriggered: webhooks.length,
        jobIds: jobs.map((j) => j.id),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[WebhookTrigger] 触发Webhook失败:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
