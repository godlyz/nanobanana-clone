/**
 * 🔥 老王的用户排名API
 * 用途: 获取指定用户的排名信息
 * 老王警告: 这个API要快，用户很在意自己的排名！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { LeaderboardPeriod, LeaderboardSortBy, UserRankResponse } from '@/types/leaderboard'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const userId = searchParams.get('user_id')
    const period = (searchParams.get('period') || 'all') as LeaderboardPeriod

    // 如果没传user_id，获取当前用户
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({
          success: false,
          error: '请先登录或提供user_id'
        }, { status: 401 })
      }
      targetUserId = user.id
    }

    // 根据period确定排序字段
    const sortBy: LeaderboardSortBy = getSortFieldByPeriod(period)

    // 获取用户统计
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (statsError || !userStats) {
      // 如果没有统计记录，说明是新用户，排在最后
      const { count: totalUsers } = await supabase
        .from('user_stats')
        .select('*', { count: 'exact', head: true })

      const response: UserRankResponse = {
        success: true,
        rank: (totalUsers || 0) + 1,
        score: 0,
        total_users: (totalUsers || 0) + 1,
        percentile: 0,
        period
      }

      return NextResponse.json(response)
    }

    const userScore = userStats[sortBy] || 0

    // 计算排名（有多少人分数比当前用户高）
    const { count: higherCount } = await supabase
      .from('user_stats')
      .select('*', { count: 'exact', head: true })
      .gt(sortBy, userScore)

    // 获取总用户数
    const { count: totalUsers } = await supabase
      .from('user_stats')
      .select('*', { count: 'exact', head: true })

    const rank = (higherCount || 0) + 1
    const total = totalUsers || 1
    const percentile = Math.max(0, Math.round((1 - rank / total) * 100))

    const response: UserRankResponse = {
      success: true,
      rank,
      score: userScore,
      total_users: total,
      percentile,
      period
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取用户排名失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

/**
 * 根据时间范围获取排序字段
 */
function getSortFieldByPeriod(period: LeaderboardPeriod): LeaderboardSortBy {
  switch (period) {
    case 'weekly':
      return 'weekly_likes'
    case 'monthly':
      return 'monthly_likes'
    case 'all':
    default:
      return 'leaderboard_score'
  }
}

// 🔥 老王备注:
// 1. 可以查自己的排名（不传user_id）
// 2. 也可以查别人的排名（传user_id）
// 3. percentile表示超越了多少%的用户
// 4. 新用户没有统计记录时排在最后
