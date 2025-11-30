/**
 * 艹！Webhook统计API - 获取Webhook投递统计信息
 *
 * GET /api/webhooks/statistics?webhookId=xxx&startDate=xxx&endDate=xxx
 *
 * 功能：
 * - 获取Webhook投递统计（成功率、响应时间等）
 * - 支持时间范围过滤
 * - 包含队列状态
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  WebhookDeliveryQueue,
  WebhookRetryQueue,
} from '@/lib/queue/webhook-queue'

export async function GET(request: NextRequest) {
  try {
    // 1. 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const webhookId = searchParams.get('webhookId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Missing webhookId parameter' },
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

    // 3. 验证Webhook所有权
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single()

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found or access denied' },
        { status: 404 }
      )
    }

    // 4. 查询投递统计
    const { data: statistics, error: statsError } = await supabase.rpc(
      'get_webhook_delivery_statistics',
      {
        p_webhook_id: webhookId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    )

    if (statsError) {
      console.error('[WebhookStatistics] 查询统计失败:', statsError)
      return NextResponse.json(
        { error: 'Failed to query statistics' },
        { status: 500 }
      )
    }

    // 5. 查询队列状态
    const [deliveryQueueStats, retryQueueStats] = await Promise.all([
      WebhookDeliveryQueue.getStats(),
      WebhookRetryQueue.getStats(),
    ])

    // 6. 返回统计结果
    return NextResponse.json(
      {
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          isActive: webhook.is_active,
          isVerified: webhook.is_verified,
        },
        statistics: statistics[0] || {
          total_deliveries: 0,
          successful_deliveries: 0,
          failed_deliveries: 0,
          success_rate: 0,
          avg_response_time_ms: 0,
          min_response_time_ms: 0,
          max_response_time_ms: 0,
          p50_response_time_ms: 0,
          p95_response_time_ms: 0,
          p99_response_time_ms: 0,
        },
        queue: {
          delivery: deliveryQueueStats,
          retry: retryQueueStats,
        },
        dateRange: {
          startDate: startDate || 'all time',
          endDate: endDate || 'now',
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[WebhookStatistics] 获取统计失败:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
