/**
 * 艹！BullMQ队列配置 - Webhook异步任务队列
 *
 * 功能：
 * - Redis连接配置（使用Upstash Redis）
 * - 队列通用配置
 * - 重试策略配置
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { ConnectionOptions, QueueOptions, WorkerOptions } from 'bullmq'

/**
 * Redis连接配置（使用Upstash Redis）
 *
 * 艹！Upstash Redis是Serverless Redis，专为Vercel等平台优化：
 * - 自动扩展，按需计费
 * - HTTP和TCP双协议支持
 * - 内置连接池，适合Serverless环境
 *
 * 环境变量：
 * - UPSTASH_REDIS_REST_URL: Redis REST API URL
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST API Token
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.UPSTASH_REDIS_HOST || 'localhost',
  port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
  password: process.env.UPSTASH_REDIS_PASSWORD,
  // 艹！Upstash使用TLS连接
  tls: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Upstash证书验证
  } : undefined,
  // 连接超时：10秒
  connectTimeout: 10000,
  // 命令超时：5秒
  commandTimeout: 5000,
  // 最大重试次数
  maxRetriesPerRequest: 3,
  // 启用离线队列
  enableOfflineQueue: true,
  // 重试策略（指数退避）
  retryStrategy: (times: number) => {
    if (times > 10) {
      return null // 超过10次重试，放弃连接
    }
    return Math.min(times * 100, 3000) // 100ms, 200ms, ..., 3000ms
  },
}

/**
 * 队列默认配置
 *
 * 艹！这些配置影响队列的性能和可靠性：
 * - defaultJobOptions: 任务默认配置
 * - connection: Redis连接配置
 */
export const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    // 任务保留时间（完成后）：7天
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7天（秒）
      count: 1000, // 最多保留1000个已完成任务
    },
    // 任务保留时间（失败后）：30天
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // 30天（秒）
      count: 5000, // 最多保留5000个失败任务
    },
    // 任务重试策略
    attempts: 3, // 默认重试3次
    backoff: {
      type: 'exponential', // 指数退避
      delay: 1000, // 初始延迟1秒
    },
  },
}

/**
 * Worker默认配置
 *
 * 艹！Worker配置影响任务处理效率：
 * - concurrency: 并发处理任务数
 * - connection: Redis连接配置
 */
export const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  // 并发处理10个任务
  concurrency: 10,
  // 限流配置（防止Redis过载）
  limiter: {
    max: 100, // 每秒最多处理100个任务
    duration: 1000, // 时间窗口：1秒
  },
  // 自动运行
  autorun: true,
  // 艹！skipDelayedJobs 和 skipStalledJobs 不是 BullMQ WorkerOptions 的有效属性，已移除
  // 过期检查间隔：30秒
  stalledInterval: 30000,
  // 最大过期检查时间：1小时
  maxStalledCount: 120,
}

/**
 * Webhook队列名称
 */
export const WEBHOOK_QUEUE_NAME = 'webhook-deliveries'

/**
 * Webhook重试队列名称
 */
export const WEBHOOK_RETRY_QUEUE_NAME = 'webhook-retries'

/**
 * 队列事件类型定义
 */
export type QueueEventType =
  | 'active'    // 任务开始处理
  | 'completed' // 任务完成
  | 'failed'    // 任务失败
  | 'progress'  // 任务进度更新
  | 'paused'    // 队列暂停
  | 'resumed'   // 队列恢复
  | 'error'     // 队列错误

/**
 * Webhook投递任务数据结构
 */
export interface WebhookDeliveryJobData {
  webhookId: string
  eventType: string
  payload: Record<string, any>
  headers?: Record<string, string>
  attempt?: number
  maxRetries?: number
  retryDelaySeconds?: number
}

/**
 * Webhook重试任务数据结构
 */
export interface WebhookRetryJobData {
  deliveryId: string
  webhookId: string
  eventType: string
  payload: Record<string, any>
  headers?: Record<string, string>
  attemptNumber: number
  maxRetries: number
  lastError?: string
  lastStatusCode?: number
}
