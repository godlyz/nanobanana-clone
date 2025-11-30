/**
 * 🔥 老王的成就检查API
 * 用途: 检查并解锁用户满足条件的成就
 * 老王警告: 这个API是成就触发的核心，必须准确！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CheckAchievementsResponse, UserAchievementWithDefinition } from '@/types/achievement'

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

    // 获取用户统计数据
    let { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 如果没有统计记录，先创建一个
    if (!userStats) {
      const { data: newStats, error: createError } = await supabase
        .from('user_stats')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        console.error('创建用户统计失败:', createError)
        return NextResponse.json({
          success: false,
          error: '创建统计数据失败'
        }, { status: 500 })
      }
      userStats = newStats
    }

    // 获取所有成就定义
    const { data: achievements, error: achError } = await supabase
      .from('achievements_definitions')
      .select('*')
      .eq('is_active', true)

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
      .select('achievement_id')
      .eq('user_id', user.id)

    if (userAchError) {
      console.error('获取用户成就失败:', userAchError)
      return NextResponse.json({
        success: false,
        error: '获取用户成就失败'
      }, { status: 500 })
    }

    // 已解锁成就ID集合
    const unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id))

    // 检查每个未解锁的成就是否满足条件
    const newlyUnlocked: UserAchievementWithDefinition[] = []

    for (const achievement of (achievements || [])) {
      // 跳过已解锁的成就
      if (unlockedIds.has(achievement.id)) continue

      // 检查是否满足条件
      const currentValue = getCurrentValueForCondition(achievement.condition_type, userStats)

      if (currentValue >= achievement.condition_value) {
        // 满足条件，解锁成就
        const { data: newAchievement, error: unlockError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
            progress: currentValue,
            notified: false
          })
          .select()
          .single()

        if (unlockError) {
          // 可能是重复插入，忽略
          console.warn('解锁成就失败:', unlockError)
          continue
        }

        newlyUnlocked.push({
          ...newAchievement,
          achievement
        })

        // 创建成就解锁通知
        await createAchievementNotification(supabase, user.id, achievement)
      }
    }

    const response: CheckAchievementsResponse = {
      success: true,
      newly_unlocked: newlyUnlocked,
      message: newlyUnlocked.length > 0
        ? `恭喜！解锁了 ${newlyUnlocked.length} 个新成就！`
        : '暂无新成就解锁'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('成就检查API错误:', error)
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

/**
 * 创建成就解锁通知
 */
async function createAchievementNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  achievement: Record<string, unknown>
) {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'system',
        content_type: 'achievement',
        content: JSON.stringify({
          type: 'achievement_unlock',
          achievement_id: achievement.id,
          achievement_name: achievement.name,
          achievement_icon: achievement.badge_icon,
          tier: achievement.tier,
          points: achievement.points
        })
      })
  } catch (error) {
    console.error('创建成就通知失败:', error)
    // 不影响主流程
  }
}

// 🔥 老王备注:
// 1. 检查用户是否满足未解锁成就的条件
// 2. 自动解锁满足条件的成就
// 3. 创建成就解锁通知
// 4. 返回新解锁的成就列表
// 5. 建议在用户完成关键操作后调用
