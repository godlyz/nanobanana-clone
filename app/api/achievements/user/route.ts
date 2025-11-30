/**
 * 🔥 老王的用户成就API
 * 用途: 获取用户已解锁的成就
 * 老王警告: 用户很在意自己的成就，展示要漂亮！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserAchievementsListResponse } from '@/types/achievement'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const userId = searchParams.get('user_id')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    // 确定目标用户
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

    // 获取用户已解锁的成就
    const { data: achievements, error, count } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements_definitions (*)
      `, { count: 'exact' })
      .eq('user_id', targetUserId)
      .order('unlocked_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('获取用户成就失败:', error)
      return NextResponse.json({
        success: false,
        error: '获取成就失败'
      }, { status: 500 })
    }

    // 获取总成就数（用于计算完成度）
    const { count: totalAchievements } = await supabase
      .from('achievements_definitions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_hidden', false)

    // 计算统计数据
    const unlockedCount = count || 0
    const totalCount = totalAchievements || 0
    const totalPoints = (achievements || []).reduce((sum, a) => {
      const achievement = a.achievement as { points: number } | null
      return sum + (achievement?.points || 0)
    }, 0)
    const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

    const response: UserAchievementsListResponse = {
      success: true,
      data: (achievements || []).map(a => ({
        id: a.id,
        user_id: a.user_id,
        achievement_id: a.achievement_id,
        unlocked_at: a.unlocked_at,
        progress: a.progress,
        notified: a.notified,
        achievement: a.achievement
      })),
      stats: {
        total_achievements: totalCount,
        total_points: totalPoints,
        unlocked_count: unlockedCount,
        completion_percent: completionPercent
      },
      pagination: {
        page,
        limit,
        total: unlockedCount,
        has_more: offset + limit < unlockedCount
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('用户成就API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

// 🔥 老王备注:
// 1. 可查自己或别人的成就
// 2. 返回完成度统计（解锁数/总数/点数/百分比）
// 3. 按解锁时间倒序排列
// 4. 支持分页
