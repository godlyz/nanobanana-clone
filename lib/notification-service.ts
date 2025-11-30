/**
 * 🔥 老王的通知投递服务
 * 用途: 处理通知发送、追踪投递率、记录监控日志
 *
 * 特点:
 * - 99%+ 投递率目标
 * - 详细投递日志
 * - 失败重试机制
 * - 批量发送优化
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

// 通知类型定义
export type NotificationType =
  | 'like'           // 点赞通知
  | 'comment'        // 评论通知
  | 'follow'         // 关注通知
  | 'mention'        // 提及通知
  | 'achievement'    // 成就解锁通知
  | 'system'         // 系统通知

// 投递状态
export type DeliveryStatus =
  | 'pending'        // 待发送
  | 'delivered'      // 已投递
  | 'failed'         // 投递失败
  | 'retrying'       // 重试中

// 通知投递日志
interface DeliveryLog {
  notification_id: string
  user_id: string
  type: NotificationType
  status: DeliveryStatus
  attempt: number
  error_message?: string
  delivered_at?: string
  created_at: string
}

// 投递统计
interface DeliveryStats {
  total: number
  delivered: number
  failed: number
  pending: number
  deliveryRate: number
  averageDeliveryTime: number
}

// 通知创建参数
interface CreateNotificationParams {
  userId: string
  type: NotificationType
  fromUserId?: string
  contentId?: string
  contentType?: string
  message?: string
  metadata?: Record<string, unknown>
}

// 内存中的投递日志缓冲区（生产环境应该用持久化存储）
const deliveryLogBuffer: DeliveryLog[] = []
const MAX_LOG_BUFFER_SIZE = 1000

// 添加投递日志
function addDeliveryLog(log: DeliveryLog): void {
  deliveryLogBuffer.push(log)

  // 保持缓冲区大小
  if (deliveryLogBuffer.length > MAX_LOG_BUFFER_SIZE) {
    deliveryLogBuffer.shift()
  }

  // 同时输出到控制台用于监控
  const statusEmoji = {
    pending: '⏳',
    delivered: '✅',
    failed: '❌',
    retrying: '🔄'
  }[log.status]

  console.log(
    `[Notification] ${statusEmoji} ${log.type} to ${log.user_id.substring(0, 8)}... - ${log.status}${log.error_message ? ` (${log.error_message})` : ''}`
  )
}

// 获取投递统计
export function getDeliveryStats(timeRangeMinutes: number = 60): DeliveryStats {
  const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000).toISOString()

  const recentLogs = deliveryLogBuffer.filter(log => log.created_at >= cutoffTime)

  const total = recentLogs.length
  const delivered = recentLogs.filter(log => log.status === 'delivered').length
  const failed = recentLogs.filter(log => log.status === 'failed').length
  const pending = recentLogs.filter(log => log.status === 'pending' || log.status === 'retrying').length

  // 计算平均投递时间（毫秒）
  const deliveredLogs = recentLogs.filter(log => log.status === 'delivered' && log.delivered_at)
  const avgDeliveryTime = deliveredLogs.length > 0
    ? deliveredLogs.reduce((sum, log) => {
        const created = new Date(log.created_at).getTime()
        const delivered = new Date(log.delivered_at!).getTime()
        return sum + (delivered - created)
      }, 0) / deliveredLogs.length
    : 0

  return {
    total,
    delivered,
    failed,
    pending,
    deliveryRate: total > 0 ? (delivered / total) * 100 : 100,
    averageDeliveryTime: Math.round(avgDeliveryTime)
  }
}

// 获取详细的投递日志
export function getDeliveryLogs(options: {
  limit?: number
  status?: DeliveryStatus
  type?: NotificationType
  userId?: string
} = {}): DeliveryLog[] {
  let logs = [...deliveryLogBuffer]

  if (options.status) {
    logs = logs.filter(log => log.status === options.status)
  }
  if (options.type) {
    logs = logs.filter(log => log.type === options.type)
  }
  if (options.userId) {
    logs = logs.filter(log => log.user_id === options.userId)
  }

  // 按时间倒序
  logs.sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (options.limit) {
    logs = logs.slice(0, options.limit)
  }

  return logs
}

// 创建并发送通知
export async function sendNotification(
  params: CreateNotificationParams
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const startTime = Date.now()
  const notificationId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // 记录初始日志
  addDeliveryLog({
    notification_id: notificationId,
    user_id: params.userId,
    type: params.type,
    status: 'pending',
    attempt: 1,
    created_at: createdAt
  })

  try {
    const supabase = await createServerClient()

    // 创建通知记录
    const { error } = await supabase
      .from('user_notifications')
      .insert({
        id: notificationId,
        user_id: params.userId,
        type: params.type,
        from_user_id: params.fromUserId,
        content_id: params.contentId,
        content_type: params.contentType,
        message: params.message,
        metadata: params.metadata,
        is_read: false,
        created_at: createdAt
      })

    if (error) {
      throw error
    }

    const deliveredAt = new Date().toISOString()

    // 更新日志为成功
    addDeliveryLog({
      notification_id: notificationId,
      user_id: params.userId,
      type: params.type,
      status: 'delivered',
      attempt: 1,
      delivered_at: deliveredAt,
      created_at: createdAt
    })

    return { success: true, notificationId }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // 更新日志为失败
    addDeliveryLog({
      notification_id: notificationId,
      user_id: params.userId,
      type: params.type,
      status: 'failed',
      attempt: 1,
      error_message: errorMessage,
      created_at: createdAt
    })

    console.error('[Notification] Delivery failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

// 批量发送通知
export async function sendBatchNotifications(
  notifications: CreateNotificationParams[]
): Promise<{
  total: number
  successful: number
  failed: number
  results: Array<{ userId: string; success: boolean; error?: string }>
}> {
  const results: Array<{ userId: string; success: boolean; error?: string }> = []

  // 分批处理，每批10个
  const batchSize = 10
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (notif) => {
        const result = await sendNotification(notif)
        return {
          userId: notif.userId,
          success: result.success,
          error: result.error
        }
      })
    )
    results.push(...batchResults)
  }

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(
    `[Notification] Batch complete: ${successful}/${results.length} delivered (${((successful / results.length) * 100).toFixed(1)}%)`
  )

  return {
    total: results.length,
    successful,
    failed,
    results
  }
}

// 重试失败的通知
export async function retryFailedNotifications(
  maxRetries: number = 3
): Promise<{ retried: number; recovered: number }> {
  const failedLogs = getDeliveryLogs({ status: 'failed', limit: 100 })
  let retried = 0
  let recovered = 0

  for (const log of failedLogs) {
    if (log.attempt >= maxRetries) {
      continue
    }

    retried++

    // 标记为重试中
    addDeliveryLog({
      ...log,
      status: 'retrying',
      attempt: log.attempt + 1,
      created_at: new Date().toISOString()
    })

    try {
      const supabase = await createServerClient()

      const { error } = await supabase
        .from('user_notifications')
        .insert({
          id: log.notification_id,
          user_id: log.user_id,
          type: log.type,
          is_read: false,
          created_at: new Date().toISOString()
        })

      if (!error) {
        recovered++
        addDeliveryLog({
          ...log,
          status: 'delivered',
          attempt: log.attempt + 1,
          delivered_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      }
    } catch (error) {
      // 重试失败，保持失败状态
      addDeliveryLog({
        ...log,
        status: 'failed',
        attempt: log.attempt + 1,
        error_message: error instanceof Error ? error.message : 'Retry failed',
        created_at: new Date().toISOString()
      })
    }
  }

  console.log(`[Notification] Retry complete: ${recovered}/${retried} recovered`)

  return { retried, recovered }
}

// 检查通知投递健康度
export function checkDeliveryHealth(): {
  healthy: boolean
  deliveryRate: number
  issues: string[]
  recommendations: string[]
} {
  const stats = getDeliveryStats(60) // 最近1小时
  const issues: string[] = []
  const recommendations: string[] = []

  // 检查投递率
  if (stats.deliveryRate < 99) {
    issues.push(`投递率 ${stats.deliveryRate.toFixed(1)}% 低于目标 99%`)
    recommendations.push('检查数据库连接状态')
    recommendations.push('查看失败通知的错误日志')
  }

  // 检查平均投递时间
  if (stats.averageDeliveryTime > 1000) {
    issues.push(`平均投递时间 ${stats.averageDeliveryTime}ms 过长`)
    recommendations.push('考虑使用消息队列异步处理')
    recommendations.push('检查数据库查询性能')
  }

  // 检查待处理通知
  if (stats.pending > 50) {
    issues.push(`有 ${stats.pending} 个通知待处理`)
    recommendations.push('增加并发处理能力')
  }

  const healthy = stats.deliveryRate >= 99 && stats.averageDeliveryTime <= 1000 && stats.pending < 50

  return {
    healthy,
    deliveryRate: stats.deliveryRate,
    issues,
    recommendations
  }
}

// 导出用于测试的内部函数
export const _internal = {
  addDeliveryLog,
  deliveryLogBuffer
}
