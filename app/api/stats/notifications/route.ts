/**
 * 🔥 老王的通知投递监控API
 * 用途: 监控通知投递率和健康状态
 * 路由: GET /api/stats/notifications
 *
 * 指标:
 * - 投递率（目标99%+）
 * - 平均投递时间
 * - 失败原因分析
 * - 健康度检查
 */

import { NextResponse } from 'next/server'
import {
  getDeliveryStats,
  getDeliveryLogs,
  checkDeliveryHealth
} from '@/lib/notification-service'

export async function GET() {
  try {
    // 获取不同时间范围的统计
    const stats1Hour = getDeliveryStats(60)       // 1小时
    const stats24Hour = getDeliveryStats(1440)    // 24小时
    const stats7Day = getDeliveryStats(10080)     // 7天

    // 获取健康度检查
    const health = checkDeliveryHealth()

    // 获取最近的失败日志
    const recentFailures = getDeliveryLogs({
      status: 'failed',
      limit: 10
    })

    // 获取最近的成功日志
    const recentDelivered = getDeliveryLogs({
      status: 'delivered',
      limit: 10
    })

    // 按类型统计投递情况
    const allLogs = getDeliveryLogs({ limit: 500 })
    const byType = {
      like: { total: 0, delivered: 0, failed: 0 },
      comment: { total: 0, delivered: 0, failed: 0 },
      follow: { total: 0, delivered: 0, failed: 0 },
      mention: { total: 0, delivered: 0, failed: 0 },
      achievement: { total: 0, delivered: 0, failed: 0 },
      system: { total: 0, delivered: 0, failed: 0 }
    }

    allLogs.forEach(log => {
      const type = log.type as keyof typeof byType
      if (byType[type]) {
        byType[type].total++
        if (log.status === 'delivered') {
          byType[type].delivered++
        } else if (log.status === 'failed') {
          byType[type].failed++
        }
      }
    })

    // 计算SLA达标情况
    const slaTarget = 99 // 99%投递率目标
    const slaStatus = {
      target: slaTarget,
      current1Hour: stats1Hour.deliveryRate,
      current24Hour: stats24Hour.deliveryRate,
      isMeeting1Hour: stats1Hour.deliveryRate >= slaTarget,
      isMeeting24Hour: stats24Hour.deliveryRate >= slaTarget,
      gap: Math.max(0, slaTarget - stats24Hour.deliveryRate)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),

      // 健康状态
      health: {
        status: health.healthy ? 'healthy' : 'degraded',
        deliveryRate: health.deliveryRate,
        issues: health.issues,
        recommendations: health.recommendations
      },

      // 时间范围统计
      stats: {
        last1Hour: stats1Hour,
        last24Hours: stats24Hour,
        last7Days: stats7Day
      },

      // SLA达标情况
      sla: slaStatus,

      // 按类型统计
      byType,

      // 最近失败
      recentFailures: recentFailures.map(f => ({
        notificationId: f.notification_id,
        type: f.type,
        userId: f.user_id.substring(0, 8) + '...',
        error: f.error_message,
        attempt: f.attempt,
        timestamp: f.created_at
      })),

      // 系统指标
      metrics: {
        totalLogEntries: allLogs.length,
        averageDeliveryTimeMs: stats24Hour.averageDeliveryTime,
        pendingCount: stats1Hour.pending,
        failureRate: stats24Hour.total > 0
          ? ((stats24Hour.failed / stats24Hour.total) * 100).toFixed(2) + '%'
          : '0%'
      }
    })

  } catch (error) {
    console.error('[Notification Stats] Error:', error)
    return NextResponse.json({
      success: false,
      error: '获取通知统计失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
