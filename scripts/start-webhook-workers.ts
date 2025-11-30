#!/usr/bin/env tsx
/**
 * 艹！Webhook Workers 启动脚本
 *
 * 功能：
 * - 启动Webhook投递Worker
 * - 启动Webhook重试Worker
 * - 优雅关闭处理
 * - 健康检查
 *
 * 使用方法：
 * - 开发环境: pnpm tsx scripts/start-webhook-workers.ts
 * - 生产环境: NODE_ENV=production pnpm tsx scripts/start-webhook-workers.ts
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-29
 */

import { Worker } from 'bullmq'
import { createWebhookDeliveryWorker } from '../lib/workers/webhook-delivery-worker'
import { createWebhookRetryWorker } from '../lib/workers/webhook-retry-worker'
import { closeAllQueues } from '../lib/queue/webhook-queue'

// 艹！全局Worker实例
let deliveryWorker: Worker | null = null
let retryWorker: Worker | null = null

/**
 * 启动所有Workers
 */
async function startWorkers() {
  console.log('====================================')
  console.log('🚀 启动 Webhook Workers')
  console.log('====================================')
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`)
  console.log(`时间: ${new Date().toISOString()}`)
  console.log('====================================\n')

  try {
    // 1. 启动投递Worker
    console.log('[Main] 启动 Webhook 投递 Worker...')
    deliveryWorker = createWebhookDeliveryWorker()

    // 2. 启动重试Worker
    console.log('[Main] 启动 Webhook 重试 Worker...')
    retryWorker = createWebhookRetryWorker()

    console.log('\n====================================')
    console.log('✅ 所有 Workers 已启动')
    console.log('====================================\n')

    // 3. 健康检查（每60秒）
    setInterval(async () => {
      try {
        const deliveryActive = deliveryWorker ? await deliveryWorker.isRunning() : false
        const retryActive = retryWorker ? await retryWorker.isRunning() : false

        console.log(
          `[HealthCheck] ${new Date().toISOString()} - ` +
            `Delivery: ${deliveryActive ? '✅' : '❌'}, ` +
            `Retry: ${retryActive ? '✅' : '❌'}`
        )
      } catch (error: any) {
        console.error('[HealthCheck] 健康检查失败:', error.message)
      }
    }, 60000)
  } catch (error: any) {
    console.error('[Main] 启动 Workers 失败:', error)
    await gracefulShutdown(1)
  }
}

/**
 * 优雅关闭
 */
async function gracefulShutdown(exitCode: number = 0) {
  console.log('\n====================================')
  console.log('🛑 正在关闭 Webhook Workers...')
  console.log('====================================\n')

  try {
    // 1. 关闭投递Worker
    if (deliveryWorker) {
      console.log('[Main] 关闭投递 Worker...')
      await deliveryWorker.close()
      deliveryWorker = null
    }

    // 2. 关闭重试Worker
    if (retryWorker) {
      console.log('[Main] 关闭重试 Worker...')
      await retryWorker.close()
      retryWorker = null
    }

    // 3. 关闭所有队列连接
    console.log('[Main] 关闭队列连接...')
    await closeAllQueues()

    console.log('\n====================================')
    console.log('✅ 所有 Workers 已安全关闭')
    console.log('====================================\n')

    process.exit(exitCode)
  } catch (error: any) {
    console.error('[Main] 关闭 Workers 失败:', error)
    process.exit(1)
  }
}

/**
 * 处理进程信号
 */
function setupSignalHandlers() {
  // SIGTERM: 优雅关闭（Docker/K8s）
  process.on('SIGTERM', () => {
    console.log('[Main] 收到 SIGTERM 信号')
    gracefulShutdown(0)
  })

  // SIGINT: Ctrl+C
  process.on('SIGINT', () => {
    console.log('[Main] 收到 SIGINT 信号 (Ctrl+C)')
    gracefulShutdown(0)
  })

  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('[Main] 未捕获的异常:', error)
    gracefulShutdown(1)
  })

  // 未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] 未处理的Promise拒绝:', reason)
    gracefulShutdown(1)
  })
}

/**
 * 主函数
 */
async function main() {
  // 设置信号处理
  setupSignalHandlers()

  // 启动Workers
  await startWorkers()

  // 保持进程运行
  console.log('[Main] Workers 正在运行，按 Ctrl+C 停止...\n')
}

// 执行主函数
main().catch((error) => {
  console.error('[Main] 启动失败:', error)
  process.exit(1)
})
