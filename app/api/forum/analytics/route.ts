/**
 * 🔥 老王创建：论坛分析统计API（RPC优化版）
 * 用途：获取论坛深度分析数据（posts/day, active users, engagement rate）
 * 日期：2025-11-27
 * 性能优化：使用数据库RPC函数减少网络传输和客户端聚合
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redis } from "@/lib/redis-client"

/**
 * GET /api/forum/analytics
 *
 * 获取论坛分析统计数据
 *
 * Query参数：
 * - period: 'day' | 'week' | 'month' | 'year' (统计周期，默认month)
 * - days: number (获取最近N天的数据，默认30天，最大365)
 *
 * 返回数据：
 * - posts_per_day: 每日发帖数时间序列
 * - replies_per_day: 每日回复数时间序列
 * - active_users_per_day: 每日活跃用户数时间序列
 * - engagement_rate: 参与度（回复数/帖子数）
 * - avg_replies_per_thread: 平均每帖回复数
 * - top_contributors: 最活跃贡献者（发帖+回复）
 * - category_distribution: 分类分布
 * - growth_rate: 增长率（vs上周期）
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const period = searchParams.get('period') || 'month'
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365)

    // 🔥 老王添加：Redis缓存（10分钟TTL）
    const cacheKey = `forum:analytics:${period}:${days}`
    const cached = await redis.get(cacheKey, true)
    if (cached) {
      console.log('✅ 缓存命中:', cacheKey)
      const cachedDuration = Date.now() - startTime
      return NextResponse.json({
        ...(cached as any),
        meta: {
          cached: true,
          cache_duration_ms: cachedDuration
        }
      })
    }

    // 🔥 老王优化：使用RPC函数并行查询，大幅减少网络往返
    const [
      { data: timeseriesData, error: timeseriesError },
      { data: summaryData, error: summaryError },
      { data: contributorsData, error: contributorsError },
      { data: categoryData, error: categoryError }
    ] = await Promise.all([
      // 1. 时间序列数据（每日发帖/回复/活跃用户）
      supabase.rpc('get_forum_analytics_timeseries', { days_param: days }),

      // 2. 汇总指标（总数、参与度、增长率）
      supabase.rpc('get_forum_analytics_summary', { days_param: days }),

      // 3. 最活跃贡献者（Top 10）
      supabase.rpc('get_forum_top_contributors_v2', {
        days_param: days,
        limit_param: 10
      }),

      // 4. 分类分布统计
      supabase.rpc('get_forum_category_distribution')
    ])

    // 检查错误
    if (timeseriesError) {
      console.error('❌ 查询时间序列数据失败:', timeseriesError)
      throw timeseriesError
    }
    if (summaryError) {
      console.error('❌ 查询汇总指标失败:', summaryError)
      throw summaryError
    }
    if (contributorsError) {
      console.error('❌ 查询贡献者数据失败:', contributorsError)
      throw contributorsError
    }
    if (categoryError) {
      console.error('❌ 查询分类分布失败:', categoryError)
      throw categoryError
    }

    // 🔥 老王优化：数据转换（RPC返回的数据格式调整）
    const postsPerDay = timeseriesData?.map((row: any) => ({
      date: row.date_str,
      count: parseInt(row.posts_count)
    })) || []

    const repliesPerDay = timeseriesData?.map((row: any) => ({
      date: row.date_str,
      count: parseInt(row.replies_count)
    })) || []

    const activeUsersPerDay = timeseriesData?.map((row: any) => ({
      date: row.date_str,
      count: parseInt(row.active_users_count)
    })) || []

    // 汇总指标（取第一行数据）
    const summary = summaryData?.[0] || {
      total_posts: 0,
      total_replies: 0,
      engagement_rate: 0,
      avg_replies_per_thread: 0,
      thread_growth_rate: 0,
      reply_growth_rate: 0
    }

    // 贡献者列表（已包含用户信息）
    const topContributors = contributorsData?.map((row: any) => ({
      user_id: row.contributor_user_id,
      display_name: row.contributor_display_name,
      avatar_url: row.contributor_avatar_url,
      contribution_count: parseInt(row.contribution_count)
    })) || []

    // 分类分布（已包含百分比）
    const categoryDistribution = categoryData?.map((row: any) => ({
      category_id: row.category_id,
      name: row.name,
      name_en: row.name_en,
      count: parseInt(row.thread_count),
      percentage: parseFloat(row.percentage).toFixed(2)
    })) || []

    // 计算耗时
    const duration = Date.now() - startTime

    // 🔥 老王优化：计算开始和结束日期
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 🔥 老王添加：构建响应数据
    const responseData = {
      success: true,
      data: {
        // 时间序列数据
        posts_per_day: postsPerDay,
        replies_per_day: repliesPerDay,
        active_users_per_day: activeUsersPerDay,

        // 汇总指标
        summary: {
          total_posts: parseInt(summary.total_posts),
          total_replies: parseInt(summary.total_replies),
          engagement_rate: parseFloat(summary.engagement_rate),
          avg_replies_per_thread: parseFloat(summary.avg_replies_per_thread),
          thread_growth_rate: parseFloat(summary.thread_growth_rate),
          reply_growth_rate: parseFloat(summary.reply_growth_rate)
        },

        // 贡献者排行
        top_contributors: topContributors,

        // 分类分布
        category_distribution: categoryDistribution,

        // 元信息
        meta: {
          period,
          days,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          duration_ms: duration,
          cached: false,
          optimization: 'RPC functions (database-side aggregation)'
        }
      }
    }

    // 🔥 老王添加：保存到Redis缓存（10分钟TTL）
    await redis.set(cacheKey, responseData, 600)
    console.log('💾 缓存已更新:', cacheKey, `(${duration}ms)`)

    return NextResponse.json(responseData)

  } catch (err: any) {
    console.error('❌ 论坛分析API异常:', err)
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: err.message,
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}
