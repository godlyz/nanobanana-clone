/**
 * 艹！Webhook队列管理器 - BullMQ队列封装
 *
 * 功能：
 * - 创建和管理Webhook投递队列
 * - 创建和管理Webhook重试队列
 * - 任务添加、查询、取消
 * - 队列统计和监控
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { Queue, QueueEvents } from 'bullmq'
import {
  redisConnection,
  defaultQueueOptions,
  WEBHOOK_QUEUE_NAME,
  WEBHOOK_RETRY_QUEUE_NAME,
  WebhookDeliveryJobData,
  WebhookRetryJobData,
  QueueEventType,
} from './config'

/**
 * 艹！Webhook投递队列单例
 *
 * 用途：处理Webhook HTTP请求投递
 * 特点：
 * - 单例模式，避免重复创建队列
 * - 自动重试（配置在defaultQueueOptions中）
 * - 支持延迟任务
 */
class WebhookDeliveryQueue {
  private static instance: Queue<WebhookDeliveryJobData> | null = null
  private static events: QueueEvents | null = null

  /**
   * 获取队列实例（单例模式）
   */
  static getInstance(): Queue<WebhookDeliveryJobData> {
    if (!this.instance) {
      this.instance = new Queue<WebhookDeliveryJobData>(
        WEBHOOK_QUEUE_NAME,
        defaultQueueOptions
      )
      console.log(`[WebhookQueue] 创建队列: ${WEBHOOK_QUEUE_NAME}`)
    }
    return this.instance
  }

  /**
   * 获取队列事件监听器
   */
  static getEvents(): QueueEvents {
    if (!this.events) {
      this.events = new QueueEvents(WEBHOOK_QUEUE_NAME, {
        connection: redisConnection,
      })
      console.log(`[WebhookQueue] 创建事件监听器: ${WEBHOOK_QUEUE_NAME}`)
    }
    return this.events
  }

  /**
   * 添加Webhook投递任务
   *
   * @param data 任务数据
   * @param options 任务选项
   */
  static async addDeliveryJob(
    data: WebhookDeliveryJobData,
    options?: {
      delay?: number // 延迟执行（毫秒）
      priority?: number // 优先级（1-10，数字越小优先级越高）
      attempts?: number // 重试次数
      removeOnComplete?: boolean | number // 完成后是否移除
      removeOnFail?: boolean | number // 失败后是否移除
    }
  ) {
    const queue = this.getInstance()
    const job = await queue.add('webhook-delivery', data, {
      ...options,
      jobId: `webhook-${data.webhookId}-${Date.now()}`, // 唯一任务ID
    })
    console.log(`[WebhookQueue] 添加投递任务: ${job.id}`)
    return job
  }

  /**
   * 获取队列统计信息
   */
  static async getStats() {
    const queue = this.getInstance()
    const counts = await queue.getJobCounts()
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    }
  }

  /**
   * 暂停队列
   */
  static async pause() {
    const queue = this.getInstance()
    await queue.pause()
    console.log(`[WebhookQueue] 队列已暂停: ${WEBHOOK_QUEUE_NAME}`)
  }

  /**
   * 恢复队列
   */
  static async resume() {
    const queue = this.getInstance()
    await queue.resume()
    console.log(`[WebhookQueue] 队列已恢复: ${WEBHOOK_QUEUE_NAME}`)
  }

  /**
   * 清空队列（仅清空等待中的任务）
   */
  static async clean() {
    const queue = this.getInstance()
    await queue.drain() // 清空等待中的任务
    console.log(`[WebhookQueue] 队列已清空: ${WEBHOOK_QUEUE_NAME}`)
  }

  /**
   * 关闭队列（释放资源）
   */
  static async close() {
    if (this.events) {
      await this.events.close()
      this.events = null
    }
    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }
    console.log(`[WebhookQueue] 队列已关闭: ${WEBHOOK_QUEUE_NAME}`)
  }
}

/**
 * 艹！Webhook重试队列单例
 *
 * 用途：处理失败Webhook的自动重试
 * 特点：
 * - 独立队列，避免影响主队列性能
 * - 智能重试策略（指数退避）
 * - 支持延迟重试
 */
class WebhookRetryQueue {
  private static instance: Queue<WebhookRetryJobData> | null = null
  private static events: QueueEvents | null = null

  /**
   * 获取队列实例（单例模式）
   */
  static getInstance(): Queue<WebhookRetryJobData> {
    if (!this.instance) {
      this.instance = new Queue<WebhookRetryJobData>(
        WEBHOOK_RETRY_QUEUE_NAME,
        defaultQueueOptions
      )
      console.log(`[WebhookRetryQueue] 创建队列: ${WEBHOOK_RETRY_QUEUE_NAME}`)
    }
    return this.instance
  }

  /**
   * 获取队列事件监听器
   */
  static getEvents(): QueueEvents {
    if (!this.events) {
      this.events = new QueueEvents(WEBHOOK_RETRY_QUEUE_NAME, {
        connection: redisConnection,
      })
      console.log(`[WebhookRetryQueue] 创建事件监听器: ${WEBHOOK_RETRY_QUEUE_NAME}`)
    }
    return this.events
  }

  /**
   * 添加Webhook重试任务
   *
   * @param data 重试任务数据
   * @param delaySeconds 延迟时间（秒）
   */
  static async addRetryJob(
    data: WebhookRetryJobData,
    delaySeconds: number = 0
  ) {
    const queue = this.getInstance()

    // 艹！计算延迟时间（指数退避 + 抖动）
    const baseDelay = delaySeconds * 1000 // 秒转毫秒
    const exponentialDelay = Math.pow(2, data.attemptNumber) * 1000 // 2^n 秒
    const jitter = Math.random() * 1000 // 0-1秒随机抖动
    const totalDelay = baseDelay + exponentialDelay + jitter

    const job = await queue.add('webhook-retry', data, {
      delay: totalDelay,
      jobId: `retry-${data.deliveryId}-${data.attemptNumber}`,
      attempts: 1, // 重试任务本身不再重试
      removeOnComplete: {
        age: 7 * 24 * 60 * 60, // 7天
      },
      removeOnFail: {
        age: 30 * 24 * 60 * 60, // 30天
      },
    })

    console.log(
      `[WebhookRetryQueue] 添加重试任务: ${job.id}, ` +
      `attemptNumber=${data.attemptNumber}, delay=${Math.round(totalDelay/1000)}s`
    )

    return job
  }

  /**
   * 获取队列统计信息
   */
  static async getStats() {
    const queue = this.getInstance()
    const counts = await queue.getJobCounts()
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    }
  }

  /**
   * 关闭队列（释放资源）
   */
  static async close() {
    if (this.events) {
      await this.events.close()
      this.events = null
    }
    if (this.instance) {
      await this.instance.close()
      this.instance = null
    }
    console.log(`[WebhookRetryQueue] 队列已关闭: ${WEBHOOK_RETRY_QUEUE_NAME}`)
  }
}

/**
 * 导出队列管理器
 */
export { WebhookDeliveryQueue, WebhookRetryQueue }

/**
 * 关闭所有队列（清理资源）
 */
export async function closeAllQueues() {
  await WebhookDeliveryQueue.close()
  await WebhookRetryQueue.close()
  console.log('[WebhookQueue] 所有队列已关闭')
}
