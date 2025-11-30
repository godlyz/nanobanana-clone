/**
 * 🔥 老王的创作者排行榜API
 * 用途: 获取创作者排行榜数据
 * 老王警告: 排行榜是用户激励的核心，性能必须快！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  LeaderboardPeriod,
  LeaderboardSortBy,
  LeaderboardCreatorEntry,
  CreatorLeaderboardResponse
} from '@/types/leaderboard'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const period = (searchParams.get('period') || 'all') as LeaderboardPeriod
    const sortBy = (searchParams.get('sort_by') || getSortFieldByPeriod(period)) as LeaderboardSortBy
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 获取当前用户（用于显示自己的排名）
    const { data: { user } } = await supabase.auth.getUser()

    // 构建查询 - 获取用户统计和profile信息
    let query = supabase
      .from('user_stats')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .gt(sortBy, 0)  // 只显示有数据的用户

    // 根据排序字段排序
    query = query.order(sortBy, { ascending: false })

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data: statsData, error: statsError, count } = await query

    if (statsError) {
      console.error('获取排行榜失败:', statsError)
      return NextResponse.json({
        success: false,
        error: '获取排行榜失败'
      }, { status: 500 })
    }

    // 格式化排行榜数据
    const leaderboardData: LeaderboardCreatorEntry[] = (statsData || []).map((item, index) => {
      const profile = item.profiles as { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null

      return {
        rank: offset + index + 1,
        user: {
          id: item.user_id,
          username: profile?.username || null,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null
        },
        stats: {
          user_id: item.user_id,
          total_works: item.total_works || 0,
          total_videos: item.total_videos || 0,
          total_likes_received: item.total_likes_received || 0,
          total_comments_received: item.total_comments_received || 0,
          total_views: item.total_views || 0,
          followers_count: item.followers_count || 0,
          following_count: item.following_count || 0,
          achievements_count: item.achievements_count || 0,
          total_achievement_points: item.total_achievement_points || 0,
          leaderboard_score: item.leaderboard_score || 0,
          weekly_likes: item.weekly_likes || 0,
          monthly_likes: item.monthly_likes || 0,
          weekly_works: item.weekly_works || 0,
          monthly_works: item.monthly_works || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          last_calculated_at: item.last_calculated_at
        },
        score: item[sortBy] || 0
      }
    })

    // 获取当前用户排名
    let currentUserRank = undefined
    if (user) {
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (userStats) {
        const userScore = userStats[sortBy] || 0

        // 计算排名（有多少人分数比当前用户高）
        const { count: higherCount } = await supabase
          .from('user_stats')
          .select('*', { count: 'exact', head: true })
          .gt(sortBy, userScore)

        const rank = (higherCount || 0) + 1
        const totalUsers = count || 0
        const percentile = totalUsers > 0 ? Math.round((1 - rank / totalUsers) * 100) : 0

        currentUserRank = {
          rank,
          score: userScore,
          percentile: Math.max(0, percentile)
        }
      }
    }

    const total = count || 0

    const response: CreatorLeaderboardResponse = {
      success: true,
      data: leaderboardData,
      period,
      sort_by: sortBy,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + limit < total
      },
      current_user_rank: currentUserRank
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('排行榜API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

/**
 * 根据时间范围获取默认排序字段
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
// 1. 支持总榜/周榜/月榜三种时间范围
// 2. 支持多种排序维度（积分/作品/点赞/粉丝等）
// 3. 返回当前用户的排名和超越百分比
// 4. 性能优化：只查询有数据的用户
