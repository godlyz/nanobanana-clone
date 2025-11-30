/**
 * 🔥 老王的视频生成统计API
 * 用途: 追踪视频生成成功率和性能指标
 * 路由: GET /api/stats/video-generation
 *
 * 目标指标:
 * - 成功率: ≥95%
 * - 平均处理时间: <3分钟（8s 1080p视频）
 * - 失败原因分类统计
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase 客户端类型
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>

// 统计时间范围选项
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all'

// 统计结果接口
interface VideoGenerationStats {
  total: number
  completed: number
  failed: number
  processing: number
  downloading: number
  successRate: number
  failureRate: number
  avgProcessingTime: number | null
  avgProcessingTimeFormatted: string
}

// 失败原因统计
interface FailureReasonStats {
  errorCode: string
  count: number
  percentage: number
  examples: string[]
}

// 性能指标
interface PerformanceMetrics {
  p50ProcessingTime: number | null
  p95ProcessingTime: number | null
  p99ProcessingTime: number | null
}

// 按参数分组统计
interface ParameterStats {
  resolution: {
    '720p': { count: number; successRate: number }
    '1080p': { count: number; successRate: number }
  }
  duration: {
    '4s': { count: number; successRate: number }
    '6s': { count: number; successRate: number }
    '8s': { count: number; successRate: number }
  }
  aspectRatio: {
    '16:9': { count: number; successRate: number }
    '9:16': { count: number; successRate: number }
  }
}

// 解析时间范围为 SQL 条件
function getTimeRangeCondition(range: TimeRange): string {
  switch (range) {
    case '1h':
      return "created_at >= NOW() - INTERVAL '1 hour'"
    case '24h':
      return "created_at >= NOW() - INTERVAL '24 hours'"
    case '7d':
      return "created_at >= NOW() - INTERVAL '7 days'"
    case '30d':
      return "created_at >= NOW() - INTERVAL '30 days'"
    case 'all':
    default:
      return '1=1' // 无时间限制
  }
}

// 计算处理时间（秒）
function calculateProcessingTime(createdAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null
  const created = new Date(createdAt).getTime()
  const completed = new Date(completedAt).getTime()
  return (completed - created) / 1000 // 转换为秒
}

// 格式化时间（秒 → 可读格式）
function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'N/A'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

// 获取基础统计
async function getBasicStats(supabase: SupabaseClientType, range: TimeRange): Promise<VideoGenerationStats> {
  const { data, error } = await supabase
    .from('video_generation_history')
    .select('status, created_at, completed_at')
    .gte('created_at', range === 'all' ? '1970-01-01' : new Date(Date.now() - getRangeMilliseconds(range)).toISOString())

  if (error) {
    console.error('[Video Stats] 获取基础统计失败:', error)
    throw error
  }

  const total = data.length
  const completed = data.filter(v => v.status === 'completed').length
  const failed = data.filter(v => v.status === 'failed').length
  const processing = data.filter(v => v.status === 'processing').length
  const downloading = data.filter(v => v.status === 'downloading').length

  // 计算平均处理时间（仅已完成）
  const processingTimes = data
    .filter(v => v.status === 'completed')
    .map(v => calculateProcessingTime(v.created_at, v.completed_at))
    .filter((t): t is number => t !== null)

  const avgProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length
    : null

  return {
    total,
    completed,
    failed,
    processing,
    downloading,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
    avgProcessingTime,
    avgProcessingTimeFormatted: formatDuration(avgProcessingTime),
  }
}

// 辅助函数：时间范围转毫秒
function getRangeMilliseconds(range: TimeRange): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000
    case '24h': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
    case 'all': return 0
  }
}

// 获取失败原因统计
async function getFailureReasons(supabase: SupabaseClientType, range: TimeRange): Promise<FailureReasonStats[]> {
  const { data, error } = await supabase
    .from('video_generation_history')
    .select('error_code, error_message')
    .eq('status', 'failed')
    .gte('created_at', range === 'all' ? '1970-01-01' : new Date(Date.now() - getRangeMilliseconds(range)).toISOString())

  if (error || !data) {
    console.error('[Video Stats] 获取失败原因失败:', error)
    return []
  }

  // 按 error_code 分组统计
  const grouped = data.reduce((acc, item) => {
    const code = item.error_code || 'UNKNOWN'
    if (!acc[code]) {
      acc[code] = { count: 0, examples: [] }
    }
    acc[code].count++
    if (acc[code].examples.length < 3 && item.error_message) {
      acc[code].examples.push(item.error_message)
    }
    return acc
  }, {} as Record<string, { count: number; examples: string[] }>)

  const total = data.length

  return Object.entries(grouped)
    .map(([errorCode, stats]) => ({
      errorCode,
      count: stats.count,
      percentage: total > 0 ? (stats.count / total) * 100 : 0,
      examples: stats.examples,
    }))
    .sort((a, b) => b.count - a.count) // 按数量降序
}

// 获取性能指标（P50, P95, P99）
async function getPerformanceMetrics(supabase: SupabaseClientType, range: TimeRange): Promise<PerformanceMetrics> {
  const { data, error } = await supabase
    .from('video_generation_history')
    .select('created_at, completed_at')
    .eq('status', 'completed')
    .gte('created_at', range === 'all' ? '1970-01-01' : new Date(Date.now() - getRangeMilliseconds(range)).toISOString())

  if (error || !data || data.length === 0) {
    return { p50ProcessingTime: null, p95ProcessingTime: null, p99ProcessingTime: null }
  }

  // 计算所有处理时间并排序
  const times = data
    .map(v => calculateProcessingTime(v.created_at, v.completed_at))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)

  if (times.length === 0) {
    return { p50ProcessingTime: null, p95ProcessingTime: null, p99ProcessingTime: null }
  }

  const p50Index = Math.floor(times.length * 0.5)
  const p95Index = Math.floor(times.length * 0.95)
  const p99Index = Math.floor(times.length * 0.99)

  return {
    p50ProcessingTime: times[p50Index],
    p95ProcessingTime: times[p95Index],
    p99ProcessingTime: times[p99Index],
  }
}

// 按参数分组统计
async function getParameterStats(supabase: SupabaseClientType, range: TimeRange): Promise<ParameterStats> {
  const { data, error } = await supabase
    .from('video_generation_history')
    .select('resolution, duration, aspect_ratio, status')
    .gte('created_at', range === 'all' ? '1970-01-01' : new Date(Date.now() - getRangeMilliseconds(range)).toISOString())

  if (error || !data) {
    // 返回空统计
    return {
      resolution: {
        '720p': { count: 0, successRate: 0 },
        '1080p': { count: 0, successRate: 0 },
      },
      duration: {
        '4s': { count: 0, successRate: 0 },
        '6s': { count: 0, successRate: 0 },
        '8s': { count: 0, successRate: 0 },
      },
      aspectRatio: {
        '16:9': { count: 0, successRate: 0 },
        '9:16': { count: 0, successRate: 0 },
      },
    }
  }

  // 统计函数
  const calculateStats = (items: typeof data) => {
    const total = items.length
    const completed = items.filter(v => v.status === 'completed').length
    return {
      count: total,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    }
  }

  return {
    resolution: {
      '720p': calculateStats(data.filter(v => v.resolution === '720p')),
      '1080p': calculateStats(data.filter(v => v.resolution === '1080p')),
    },
    duration: {
      '4s': calculateStats(data.filter(v => v.duration === 4)),
      '6s': calculateStats(data.filter(v => v.duration === 6)),
      '8s': calculateStats(data.filter(v => v.duration === 8)),
    },
    aspectRatio: {
      '16:9': calculateStats(data.filter(v => v.aspect_ratio === '16:9')),
      '9:16': calculateStats(data.filter(v => v.aspect_ratio === '9:16')),
    },
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const range = (searchParams.get('range') || '24h') as TimeRange

  try {
    const supabase = await createClient()

    // 并行获取所有统计数据
    const [basicStats, failureReasons, performanceMetrics, parameterStats] = await Promise.all([
      getBasicStats(supabase, range),
      getFailureReasons(supabase, range),
      getPerformanceMetrics(supabase, range),
      getParameterStats(supabase, range),
    ])

    // 判断是否达标
    const meetsTarget = {
      successRate: basicStats.successRate >= 95,
      avgProcessingTime:
        basicStats.avgProcessingTime !== null && basicStats.avgProcessingTime <= 180, // 3分钟
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeRange: range,

      // 基础统计
      summary: basicStats,

      // 目标达标情况
      targets: {
        successRate: {
          target: 95,
          current: Number(basicStats.successRate.toFixed(2)),
          met: meetsTarget.successRate,
          status: meetsTarget.successRate ? 'healthy' : 'needs_attention',
        },
        avgProcessingTime: {
          target: '3 minutes',
          current: basicStats.avgProcessingTimeFormatted,
          met: meetsTarget.avgProcessingTime,
          status: meetsTarget.avgProcessingTime ? 'healthy' : 'needs_optimization',
        },
      },

      // 失败原因分析
      failureReasons,

      // 性能指标
      performance: {
        p50: formatDuration(performanceMetrics.p50ProcessingTime),
        p95: formatDuration(performanceMetrics.p95ProcessingTime),
        p99: formatDuration(performanceMetrics.p99ProcessingTime),
      },

      // 参数统计
      byParameter: parameterStats,

      // 建议
      recommendations: generateRecommendations(basicStats, failureReasons, performanceMetrics),
    })
  } catch (error) {
    console.error('[Video Generation Stats] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取视频生成统计失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 生成优化建议
function generateRecommendations(
  stats: VideoGenerationStats,
  failures: FailureReasonStats[],
  perf: PerformanceMetrics
): string[] {
  const recommendations: string[] = []

  // 成功率检查
  if (stats.successRate < 95) {
    recommendations.push(
      `当前成功率 ${stats.successRate.toFixed(1)}% 低于目标 95%，建议分析失败原因并优化错误处理`
    )
  }

  // 处理时间检查
  if (stats.avgProcessingTime && stats.avgProcessingTime > 180) {
    recommendations.push(
      `平均处理时间 ${stats.avgProcessingTimeFormatted} 超过目标 3 分钟，建议检查 Google Veo API 性能`
    )
  }

  // 失败原因分析
  if (failures.length > 0) {
    const topFailure = failures[0]
    recommendations.push(
      `最常见失败原因: ${topFailure.errorCode} (${topFailure.count} 次, ${topFailure.percentage.toFixed(1)}%)，建议优先处理`
    )
  }

  // P99 延迟检查
  if (perf.p99ProcessingTime && perf.p99ProcessingTime > 360) {
    recommendations.push(
      `P99 处理时间 ${formatDuration(perf.p99ProcessingTime)} 过长，建议优化长尾延迟`
    )
  }

  // 全部正常
  if (recommendations.length === 0) {
    recommendations.push('所有指标正常，继续保持！')
  }

  return recommendations
}
