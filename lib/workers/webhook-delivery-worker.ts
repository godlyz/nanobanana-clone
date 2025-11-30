/**
 * 艹！Webhook投递Worker - 处理Webhook HTTP请求投递
 *
 * 功能：
 * - 从Redis队列获取投递任务
 * - 发送HTTP POST请求到Webhook URL
 * - HMAC签名验证（sha256/sha512）
 * - 记录投递结果到数据库
 * - 失败自动重试（通过重试队列）
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { Worker, Job } from 'bullmq'
import crypto from 'crypto'
import {
  redisConnection,
  defaultWorkerOptions,
  WEBHOOK_QUEUE_NAME,
  WebhookDeliveryJobData,
} from '../queue/config'
import { WebhookRetryQueue } from '../queue/webhook-queue'
import { createClient } from '@/lib/supabase/server'

/**
 * 艹！生成HMAC签名
 *
 * @param payload - 请求体（JSON字符串）
 * @param secret - Webhook密钥
 * @param algorithm - 签名算法（sha256 或 sha512）
 * @returns HMAC签名（hex编码）
 */
function generateSignature(
  payload: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  const hmac = crypto.createHmac(algorithm, secret)
  hmac.update(payload)
  return hmac.digest('hex')
}

/**
 * 艹！执行Webhook HTTP投递
 *
 * @param webhookId - Webhook ID
 * @param url - Webhook URL
 * @param payload - 请求体数据
 * @param secret - HMAC签名密钥
 * @param algorithm - 签名算法
 * @param timeoutSeconds - 超时时间（秒）
 * @returns 投递结果
 */
async function deliverWebhook(
  webhookId: string,
  url: string,
  payload: Record<string, any>,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
  timeoutSeconds: number = 30
): Promise<{
  success: boolean
  statusCode: number
  responseBody?: string
  error?: string
  duration: number
}> {
  const startTime = Date.now()

  try {
    // 1. 序列化payload
    const payloadString = JSON.stringify(payload)

    // 2. 生成HMAC签名
    const signature = generateSignature(payloadString, secret, algorithm)

    // 3. 发送HTTP POST请求
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NanoBanana-Webhook/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Signature-Algorithm': algorithm,
        'X-Webhook-Id': webhookId,
        'X-Webhook-Timestamp': Date.now().toString(),
      },
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // 4. 读取响应体（最多1KB）
    const responseText = await response.text()
    const responseBody = responseText.slice(0, 1024) // 最多1KB

    const duration = Date.now() - startTime

    // 5. 判断是否成功（2xx状态码）
    const success = response.status >= 200 && response.status < 300

    return {
      success,
      statusCode: response.status,
      responseBody,
      duration,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    return {
      success: false,
      statusCode: 0, // 网络错误
      error: error.message || 'Unknown error',
      duration,
    }
  }
}

/**
 * 艹！记录投递结果到数据库
 *
 * @param webhookId - Webhook ID
 * @param eventType - 事件类型
 * @param payload - 请求体
 * @param result - 投递结果
 * @param attemptNumber - 尝试次数
 */
async function recordDelivery(
  webhookId: string,
  eventType: string,
  payload: Record<string, any>,
  result: Awaited<ReturnType<typeof deliverWebhook>>,
  attemptNumber: number = 1
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('record_webhook_delivery', {
    p_webhook_id: webhookId,
    p_event_type: eventType,
    p_payload: payload,
    p_attempt_number: attemptNumber,
    p_status_code: result.statusCode,
    p_response_body: result.responseBody || null,
    p_error_message: result.error || null,
    p_response_time_ms: result.duration,
    p_delivered_at: new Date().toISOString(),
  })

  if (error) {
    console.error(`[WebhookDeliveryWorker] 记录投递失败: ${error.message}`)
    throw error
  }

  return data
}

/**
 * 艹！Webhook投递Worker处理函数
 *
 * 核心逻辑：
 * 1. 从数据库查询Webhook配置
 * 2. 发送HTTP POST请求
 * 3. 记录投递结果
 * 4. 如果失败且启用重试，加入重试队列
 */
async function processWebhookDelivery(job: Job<WebhookDeliveryJobData>) {
  const { webhookId, eventType, payload, attempt = 1 } = job.data

  console.log(
    `[WebhookDeliveryWorker] 处理投递任务: ` +
    `webhookId=${webhookId}, eventType=${eventType}, attempt=${attempt}`
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
        `[WebhookDeliveryWorker] Webhook不存在或未激活: ${webhookId}`
      )
      throw new Error(`Webhook not found or inactive: ${webhookId}`)
    }

    // 2. 执行HTTP投递
    const result = await deliverWebhook(
      webhookId,
      webhook.url,
      payload,
      webhook.secret,
      webhook.signature_algorithm as 'sha256' | 'sha512',
      webhook.timeout_seconds || 30
    )

    // 3. 记录投递结果
    const deliveryRecord = await recordDelivery(
      webhookId,
      eventType,
      payload,
      result,
      attempt
    )

    // 4. 如果失败且启用重试
    if (!result.success && webhook.retry_enabled) {
      const maxRetries = webhook.max_retries || 3
      const currentAttempt = attempt || 1

      if (currentAttempt < maxRetries) {
        // 加入重试队列
        await WebhookRetryQueue.addRetryJob(
          {
            deliveryId: deliveryRecord.id,
            webhookId,
            eventType,
            payload,
            attemptNumber: currentAttempt + 1,
            maxRetries,
            lastError: result.error,
            lastStatusCode: result.statusCode,
          },
          webhook.retry_delay_seconds || 60
        )

        console.log(
          `[WebhookDeliveryWorker] 投递失败，已加入重试队列: ` +
          `attemptNumber=${currentAttempt + 1}/${maxRetries}`
        )
      } else {
        console.warn(
          `[WebhookDeliveryWorker] 投递失败，已达最大重试次数: ${maxRetries}`
        )
      }
    }

    // 5. 返回处理结果
    return {
      success: result.success,
      statusCode: result.statusCode,
      duration: result.duration,
      attemptNumber: attempt,
    }
  } catch (error: any) {
    console.error(
      `[WebhookDeliveryWorker] 处理投递任务失败: ${error.message}`
    )
    throw error
  }
}

/**
 * 艹！创建Webhook投递Worker
 *
 * 用途：从Redis队列获取投递任务并处理
 */
export function createWebhookDeliveryWorker(): Worker<WebhookDeliveryJobData> {
  const worker = new Worker<WebhookDeliveryJobData>(
    WEBHOOK_QUEUE_NAME,
    processWebhookDelivery,
    {
      ...defaultWorkerOptions,
      connection: redisConnection,
    }
  )

  // 监听Worker事件
  worker.on('active', (job) => {
    console.log(`[WebhookDeliveryWorker] 任务开始: ${job.id}`)
  })

  worker.on('completed', (job, result) => {
    console.log(
      `[WebhookDeliveryWorker] 任务完成: ${job.id}, ` +
      `success=${result.success}, statusCode=${result.statusCode}`
    )
  })

  worker.on('failed', (job, error) => {
    console.error(
      `[WebhookDeliveryWorker] 任务失败: ${job?.id}, error=${error.message}`
    )
  })

  worker.on('error', (error) => {
    console.error(`[WebhookDeliveryWorker] Worker错误: ${error.message}`)
  })

  console.log('[WebhookDeliveryWorker] Worker已启动')

  return worker
}

/**
 * 导出处理函数（用于测试）
 */
export { processWebhookDelivery, deliverWebhook, generateSignature }
