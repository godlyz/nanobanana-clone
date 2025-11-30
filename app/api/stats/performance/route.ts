/**
 * 🔥 老王的性能监控API
 * 用途: 追踪社交功能加载时间和性能指标
 * 路由: GET /api/stats/performance
 *
 * 监控指标:
 * - 社交 Feed 加载时间
 * - API 响应时间
 * - 数据库查询性能
 * - 页面加载指标
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 性能阈值配置（毫秒）
const PERFORMANCE_THRESHOLDS = {
  socialFeed: 3000,      // 社交 Feed 目标 < 3秒
  apiResponse: 500,      // API 响应目标 < 500ms
  dbQuery: 200,          // 数据库查询目标 < 200ms
  pageLoad: 2000,        // 页面加载目标 < 2秒
}

// 超时保护
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
}

// 测量函数执行时间
async function measureTime<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<{ result: T | null; duration: number; error?: string }> {
  const startTime = performance.now()
  try {
    const result = await Promise.race([fn(), timeout(timeoutMs)])
    const duration = performance.now() - startTime
    return { result, duration }
  } catch (error) {
    const duration = performance.now() - startTime
    return {
      result: null,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Supabase 客户端类型
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>

// 性能指标类型
interface PerformanceMetric {
  name: string
  displayName: string
  duration: number
  threshold: number
  status: 'healthy' | 'slow' | 'error'
  error?: string
  data: unknown
}

// 测量社交 Feed 加载性能
async function measureSocialFeedPerformance(supabase: SupabaseClientType) {
  // 模拟真实的社交 Feed 查询（包含多表联查）
  const measurement = await measureTime(async () => {
    // 查询最近的博客文章（带作者信息）
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        id, title, excerpt, created_at, view_count, like_count, comment_count,
        author_id
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) throw postsError

    // 查询评论数量
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    // 查询关注动态
    const { count: followCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })

    return { posts: posts?.length || 0, comments: commentCount || 0, follows: followCount || 0 }
  }, 5000)

  return {
    name: 'socialFeed',
    displayName: '社交 Feed 加载',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.socialFeed,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.socialFeed
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量博客列表性能
async function measureBlogListPerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, excerpt, created_at, view_count')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { count: data?.length || 0 }
  }, 3000)

  return {
    name: 'blogList',
    displayName: '博客列表',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.apiResponse,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.apiResponse
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量用户资料加载性能
async function measureUserProfilePerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single()

    // 即使没有数据也算成功（空表情况）
    if (error && !error.message.includes('No rows found')) throw error
    return { hasProfile: !!data }
  }, 2000)

  return {
    name: 'userProfile',
    displayName: '用户资料加载',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.dbQuery,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.dbQuery
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量评论加载性能
async function measureCommentsPerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error && !error.message.includes('does not exist')) throw error
    return { count: data?.length || 0 }
  }, 2000)

  return {
    name: 'comments',
    displayName: '评论加载',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.apiResponse,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.apiResponse
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量通知加载性能
async function measureNotificationsPerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, type, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error && !error.message.includes('does not exist')) throw error
    return { count: data?.length || 0 }
  }, 2000)

  return {
    name: 'notifications',
    displayName: '通知加载',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.apiResponse,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.apiResponse
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量排行榜性能
async function measureLeaderboardPerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_id, weekly_score, monthly_score, all_time_score')
      .order('weekly_score', { ascending: false })
      .limit(100)

    if (error && !error.message.includes('does not exist')) throw error
    return { count: data?.length || 0 }
  }, 2000)

  return {
    name: 'leaderboard',
    displayName: '排行榜',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.apiResponse,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.apiResponse
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

// 测量成就系统性能
async function measureAchievementsPerformance(supabase: SupabaseClientType) {
  const measurement = await measureTime(async () => {
    const { data: definitions } = await supabase
      .from('achievement_definitions')
      .select('id, name, category')
      .limit(50)

    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('id, achievement_id')
      .limit(100)

    return {
      definitions: definitions?.length || 0,
      unlocked: userAchievements?.length || 0
    }
  }, 3000)

  return {
    name: 'achievements',
    displayName: '成就系统',
    duration: Math.round(measurement.duration),
    threshold: PERFORMANCE_THRESHOLDS.apiResponse,
    status: measurement.error
      ? 'error'
      : measurement.duration <= PERFORMANCE_THRESHOLDS.apiResponse
        ? 'healthy'
        : 'slow',
    error: measurement.error,
    data: measurement.result
  }
}

export async function GET() {
  const startTime = performance.now()

  try {
    const supabase = await createClient()

    // 并行测量所有性能指标
    const [
      socialFeed,
      blogList,
      userProfile,
      comments,
      notifications,
      leaderboard,
      achievements
    ] = await Promise.allSettled([
      measureSocialFeedPerformance(supabase),
      measureBlogListPerformance(supabase),
      measureUserProfilePerformance(supabase),
      measureCommentsPerformance(supabase),
      measureNotificationsPerformance(supabase),
      measureLeaderboardPerformance(supabase),
      measureAchievementsPerformance(supabase)
    ])

    // 提取结果
    const metricsRaw = [
      socialFeed.status === 'fulfilled' ? socialFeed.value : null,
      blogList.status === 'fulfilled' ? blogList.value : null,
      userProfile.status === 'fulfilled' ? userProfile.value : null,
      comments.status === 'fulfilled' ? comments.value : null,
      notifications.status === 'fulfilled' ? notifications.value : null,
      leaderboard.status === 'fulfilled' ? leaderboard.value : null,
      achievements.status === 'fulfilled' ? achievements.value : null
    ]
    const metrics = metricsRaw.filter(Boolean) as PerformanceMetric[]

    // 计算总体健康度
    const healthyCount = metrics.filter(m => m?.status === 'healthy').length
    const slowCount = metrics.filter(m => m?.status === 'slow').length
    const errorCount = metrics.filter(m => m?.status === 'error').length
    const totalCount = metrics.length

    let overallStatus: 'healthy' | 'degraded' | 'critical'
    if (errorCount > totalCount / 2) {
      overallStatus = 'critical'
    } else if (slowCount > totalCount / 3 || errorCount > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    // 计算平均响应时间
    const avgDuration = Math.round(
      metrics.reduce((sum, m) => sum + (m?.duration || 0), 0) / totalCount
    )

    const totalDuration = Math.round(performance.now() - startTime)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overallStatus,
        healthyCount,
        slowCount,
        errorCount,
        totalCount,
        averageDuration: avgDuration,
        totalMeasurementTime: totalDuration
      },
      thresholds: PERFORMANCE_THRESHOLDS,
      metrics,
      recommendations: generateRecommendations(metrics)
    })

  } catch (error) {
    console.error('[Performance Monitor] Error:', error)
    return NextResponse.json({
      success: false,
      error: '性能监控失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 生成优化建议
function generateRecommendations(metrics: PerformanceMetric[]) {
  const recommendations: string[] = []

  metrics.forEach(metric => {
    if (!metric) return

    if (metric.status === 'slow') {
      switch (metric.name) {
        case 'socialFeed':
          recommendations.push(`社交 Feed 加载时间 ${metric.duration}ms 超过阈值 ${metric.threshold}ms，建议: 添加索引优化、实现分页缓存`)
          break
        case 'blogList':
          recommendations.push(`博客列表查询时间 ${metric.duration}ms 偏高，建议: 添加 created_at 索引、减少返回字段`)
          break
        case 'comments':
          recommendations.push(`评论加载时间 ${metric.duration}ms 偏高，建议: 添加 content_id 索引、实现懒加载`)
          break
        case 'notifications':
          recommendations.push(`通知加载时间 ${metric.duration}ms 偏高，建议: 添加 user_id + created_at 复合索引`)
          break
        case 'leaderboard':
          recommendations.push(`排行榜查询时间 ${metric.duration}ms 偏高，建议: 使用 Materialized View 或 Redis 缓存`)
          break
        case 'achievements':
          recommendations.push(`成就系统查询时间 ${metric.duration}ms 偏高，建议: 缓存成就定义、批量查询用户成就`)
          break
        default:
          recommendations.push(`${metric.displayName} 性能需要优化`)
      }
    }

    if (metric.status === 'error') {
      recommendations.push(`${metric.displayName} 出现错误: ${metric.error}，请检查数据库表结构和连接`)
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('所有性能指标正常，继续保持！')
  }

  return recommendations
}
