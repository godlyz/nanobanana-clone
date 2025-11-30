/**
 * 🔥 老王的成就进度API
 * 用途: 获取用户所有成就的进度（包括未解锁的）
 * 老王警告: 进度展示能激励用户继续努力！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AchievementProgressResponse, AchievementProgress } from '@/types/achievement'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户身份（进度只能看自己的）
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录'
      }, { status: 401 })
    }

    // 获取所有成就定义
    const { data: achievements, error: achError } = await supabase
      .from('achievements_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (achError) {
      console.error('获取成就定义失败:', achError)
      return NextResponse.json({
        success: false,
        error: '获取成就失败'
      }, { status: 500 })
    }

    // 获取用户已解锁的成就
    const { data: userAchievements, error: userAchError } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id)

    if (userAchError) {
      console.error('获取用户成就失败:', userAchError)
      return NextResponse.json({
        success: false,
        error: '获取用户成就失败'
      }, { status: 500 })
    }

    // 获取用户统计数据
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 创建已解锁成就的映射
    const unlockedMap = new Map(
      (userAchievements || []).map(ua => [ua.achievement_id, ua.unlocked_at])
    )

    // 计算每个成就的进度
    const progressData: AchievementProgress[] = (achievements || []).map(achievement => {
      const isUnlocked = unlockedMap.has(achievement.id)
      const unlockedAt = unlockedMap.get(achievement.id)

      // 根据条件类型获取当前值
      const currentValue = getCurrentValueForCondition(
        achievement.condition_type,
        userStats
      )

      const targetValue = achievement.condition_value
      const progressPercent = Math.min(100, Math.round((currentValue / targetValue) * 100))

      return {
        achievement,
        current_value: currentValue,
        target_value: targetValue,
        progress_percent: isUnlocked ? 100 : progressPercent,
        is_unlocked: isUnlocked,
        unlocked_at: unlockedAt
      }
    })

    // 计算统计
    const unlockedCount = progressData.filter(p => p.is_unlocked).length
    const totalCount = progressData.length
    const totalPoints = progressData
      .filter(p => p.is_unlocked)
      .reduce((sum, p) => sum + p.achievement.points, 0)

    const response: AchievementProgressResponse = {
      success: true,
      data: progressData,
      stats: {
        unlocked_count: unlockedCount,
        total_count: totalCount,
        total_points: totalPoints
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('成就进度API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

/**
 * 根据条件类型获取用户当前值
 */
function getCurrentValueForCondition(
  conditionType: string,
  userStats: Record<string, unknown> | null
): number {
  if (!userStats) return 0

  switch (conditionType) {
    case 'works_count':
      return (userStats.total_works as number) || 0
    case 'videos_count':
      return (userStats.total_videos as number) || 0
    case 'likes_received':
      return (userStats.total_likes_received as number) || 0
    case 'comments_count':
      return 0  // 需要从comments表统计
    case 'followers_count':
      return (userStats.followers_count as number) || 0
    case 'achievement_points':
      return (userStats.total_achievement_points as number) || 0
    default:
      return 0
  }
}

// 🔥 老王备注:
// 1. 返回所有成就的进度（包括未解锁的）
// 2. 进度百分比展示当前进度
// 3. 只能查自己的进度（隐私考虑）
// 4. 用于前端展示成就墙
