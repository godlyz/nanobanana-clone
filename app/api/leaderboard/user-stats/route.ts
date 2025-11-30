/**
 * 🔥 老王的用户统计API
 * 用途: 获取/初始化用户统计数据
 * 老王警告: 统计数据是排行榜和成就系统的基础！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserStatsResponse } from '@/types/leaderboard'

/**
 * GET - 获取用户统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const userId = searchParams.get('user_id')

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

    // 获取用户统计
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (error && error.code !== 'PGRST116') {  // PGRST116 = no rows
      console.error('获取用户统计失败:', error)
      return NextResponse.json({
        success: false,
        error: '获取统计数据失败'
      }, { status: 500 })
    }

    const response: UserStatsResponse = {
      success: true,
      data: stats || null,
      message: stats ? undefined : '用户暂无统计数据'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('用户统计API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

/**
 * POST - 初始化/更新用户统计数据
 * 注意: 这个API主要给后端触发器使用，前端一般不直接调用
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户身份
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录'
      }, { status: 401 })
    }

    // 检查是否已有统计记录
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (existingStats) {
      // 已存在，更新统计数据
      const updatedStats = await recalculateUserStats(supabase, user.id)

      return NextResponse.json({
        success: true,
        data: updatedStats,
        message: '统计数据已更新'
      })
    } else {
      // 不存在，创建新记录
      const { data: newStats, error } = await supabase
        .from('user_stats')
        .insert({
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('创建用户统计失败:', error)
        return NextResponse.json({
          success: false,
          error: '创建统计数据失败'
        }, { status: 500 })
      }

      // 立即计算统计数据
      const updatedStats = await recalculateUserStats(supabase, user.id)

      return NextResponse.json({
        success: true,
        data: updatedStats || newStats,
        message: '统计数据已初始化'
      })
    }
  } catch (error) {
    console.error('用户统计API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

/**
 * 重新计算用户统计数据
 * 注意: 这是一个辅助函数，实际项目中可能需要更复杂的计算逻辑
 */
async function recalculateUserStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  try {
    // 获取关注者数量
    const { count: followersCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)

    // 获取关注数量
    const { count: followingCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)

    // 获取成就数量和点数
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select(`
        achievement_id,
        achievements_definitions (points)
      `)
      .eq('user_id', userId)

    const achievementsCount = achievements?.length || 0
    const totalAchievementPoints = achievements?.reduce((sum, a) => {
      // Supabase关联查询可能返回数组或单对象
      const defData = a.achievements_definitions
      const def = Array.isArray(defData) ? defData[0] : defData
      return sum + ((def as { points?: number } | null)?.points || 0)
    }, 0) || 0

    // 计算排行榜积分
    const leaderboardScore = calculateLeaderboardScore(
      0, // total_works - 需要从其他表计算
      followersCount || 0,
      0, // total_likes_received - 需要从其他表计算
      totalAchievementPoints
    )

    // 更新统计数据
    const { data: updatedStats, error } = await supabase
      .from('user_stats')
      .update({
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        achievements_count: achievementsCount,
        total_achievement_points: totalAchievementPoints,
        leaderboard_score: leaderboardScore,
        last_calculated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('更新用户统计失败:', error)
      return null
    }

    return updatedStats
  } catch (error) {
    console.error('计算用户统计失败:', error)
    return null
  }
}

/**
 * 计算排行榜积分
 * 公式：作品*10 + 点赞*1 + 粉丝*5 + 成就点数*0.5
 */
function calculateLeaderboardScore(
  works: number,
  followers: number,
  likes: number,
  achievementPoints: number
): number {
  return (works * 10) + (likes * 1) + (followers * 5) + Math.floor(achievementPoints / 2)
}

// 🔥 老王备注:
// 1. GET获取统计数据，可查自己或别人
// 2. POST初始化/更新自己的统计数据
// 3. recalculateUserStats重新计算所有统计
// 4. 排行榜积分公式需要根据产品需求调整
