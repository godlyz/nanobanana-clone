/**
 * 艹！Webhook重试Worker - 处理失败Webhook的自动重试
 *
 * 功能：
 * - 从Redis重试队列获取任务
 * - 重新执行Webhook投递
 * - 更新投递记录
 * - 失败继续重试（直到达到最大重试次数）
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { Worker, Job } from 'bullmq'
import {
  redisConnection,
  defaultWorkerOptions,
  WEBHOOK_RETRY_QUEUE_NAME,
  WebhookRetryJobData,
} from '../queue/config'
import {
  deliverWebhook,
  generateSignature,
} from './webhook-delivery-worker'
import { createClient } from '@/lib/supabase/server'
import { WebhookRetryQueue } from '../queue/webhook-queue'

/**
 * 艹！更新投递记录（重试）
 *
 * @param deliveryId - 投递记录ID
 * @param result - 投递结果
 * @param attemptNumber - 尝试次数
 */
async function updateDeliveryRecord(
  deliveryId: string,
  result: Awaited<ReturnType<typeof deliverWebhook>>,
  attemptNumber: number
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('webhook_deliveries')
    .update({
      attempt_number: attemptNumber,
      status_code: result.statusCode,
      response_body: result.responseBody || null,
      error_message: result.error || null,
      response_time_ms: result.duration,
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .select()
    .single()

  if (error) {
    console.error(`[WebhookRetryWorker] 更新投递记录失败: ${error.message}`)
    throw error
  }

  return data
}

/**
 * 艹！Webhook重试Worker处理函数
 *
 * 核心逻辑：
 * 1. 从数据库查询Webhook配置
 * 2. 重新发送HTTP POST请求
 * 3. 更新投递记录
 * 4. 如果仍然失败且未达最大重试次数，继续加入重试队列
 */
async function processWebhookRetry(job: Job<WebhookRetryJobData>) {
  const {
    deliveryId,
    webhookId,
    eventType,
    payload,
    attemptNumber,
    maxRetries,
    lastError,
    lastStatusCode,
  } = job.data

  console.log(
    `[WebhookRetryWorker] 处理重试任务: ` +
    `deliveryId=${deliveryId}, attemptNumber=${attemptNumber}/${maxRetries}`
  )

  try {
    // 1. 从数据库查询Webhook配置
    const supabase = await createClient()
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('is_active', true)
      .single()

    if (webhookError || !webhook) {
      console.error(
        `[WebhookRetryWorker] Webhook不存在或未激活: ${webhookId}`
      )
      throw new Error(`Webhook not found or inactive: ${webhookId}`)
    }

    // 2. 执行HTTP重试投递
    const result = await deliverWebhook(
      webhookId,
      webhook.url,
      payload,
      webhook.secret,
      webhook.signature_algorithm as 'sha256' | 'sha512',
      webhook.timeout_seconds || 30
    )

    // 3. 更新投递记录
    await updateDeliveryRecord(deliveryId, result, attemptNumber)

    // 4. 如果仍然失败且未达最大重试次数
    if (!result.success && attemptNumber < maxRetries) {
      // 继续加入重试队列
      await WebhookRetryQueue.addRetryJob(
        {
          deliveryId,
          webhookId,
          eventType,
          payload,
          attemptNumber: attemptNumber + 1,
          maxRetries,
          lastError: result.error,
          lastStatusCode: result.statusCode,
        },
        webhook.retry_delay_seconds || 60
      )

      console.log(
        `[WebhookRetryWorker] 重试失败，继续重试: ` +
        `attemptNumber=${attemptNumber + 1}/${maxRetries}`
      )
    } else if (result.success) {
      console.log(
        `[WebhookRetryWorker] 重试成功: attemptNumber=${attemptNumber}`
      )

      // 更新Webhook统计（成功次数+1）
      await supabase.rpc('increment_webhook_success', {
        p_webhook_id: webhookId,
      })
    } else {
      console.warn(
        `[WebhookRetryWorker] 重试失败，已达最大重试次数: ${maxRetries}`
      )

      // 更新Webhook统计（失败次数+1）
      await supabase.rpc('increment_webhook_failure', {
        p_webhook_id: webhookId,
      })
    }

    // 5. 返回处理结果
    return {
      success: result.success,
      statusCode: result.statusCode,
      duration: result.duration,
      attemptNumber,
      maxRetries,
    }
  } catch (error: any) {
    console.error(
      `[WebhookRetryWorker] 处理重试任务失败: ${error.message}`
    )
    throw error
  }
}

/**
 * 艹！创建Webhook重试Worker
 *
 * 用途：从Redis重试队列获取任务并处理
 */
export function createWebhookRetryWorker(): Worker<WebhookRetryJobData> {
  const worker = new Worker<WebhookRetryJobData>(
    WEBHOOK_RETRY_QUEUE_NAME,
    processWebhookRetry,
    {
      ...defaultWorkerOptions,
      connection: redisConnection,
      // 重试Worker并发度降低（避免过载）
      concurrency: 5,
    }
  )

  // 监听Worker事件
  worker.on('active', (job) => {
    console.log(`[WebhookRetryWorker] 任务开始: ${job.id}`)
  })

  worker.on('completed', (job, result) => {
    console.log(
      `[WebhookRetryWorker] 任务完成: ${job.id}, ` +
      `success=${result.success}, attemptNumber=${result.attemptNumber}/${result.maxRetries}`
    )
  })

  worker.on('failed', (job, error) => {
    console.error(
      `[WebhookRetryWorker] 任务失败: ${job?.id}, error=${error.message}`
    )
  })

  worker.on('error', (error) => {
    console.error(`[WebhookRetryWorker] Worker错误: ${error.message}`)
  })

  console.log('[WebhookRetryWorker] Worker已启动')

  return worker
}

/**
 * 导出处理函数（用于测试）
 */
export { processWebhookRetry }
