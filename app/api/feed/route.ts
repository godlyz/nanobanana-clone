// app/api/feed/route.ts
// 🔥 老王创建：Activity Feed API
// 功能: 获取用户关注者的活动信息流

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/feed
 * 获取当前用户关注者的活动
 *
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 1. 获取用户关注的人
    const { data: following, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (followError) {
      console.error('获取关注列表失败:', followError)
      throw followError
    }

    const followingIds = following?.map(f => f.following_id) || []

    // 如果没有关注任何人，返回空列表
    if (followingIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          limit,
          offset
        }
      })
    }

    // 2. 聚合不同类型的活动（使用多个查询然后合并）
    const feedItems: any[] = []

    // 2.1 获取关注者的作品（最近的图片生成）
    const { data: artworks } = await supabase
      .from('generation_history')
      .select(`
        id,
        created_at,
        prompt,
        image_url,
        user_id,
        user_profiles!inner(display_name, avatar_url)
      `)
      .in('user_id', followingIds)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(20)

    if (artworks) {
      artworks.forEach(artwork => {
        feedItems.push({
          id: `artwork_${artwork.id}`,
          type: 'artwork',
          user: {
            id: artwork.user_id,
            name: (artwork as any).user_profiles?.display_name || 'User',
            avatar: (artwork as any).user_profiles?.avatar_url
          },
          content: {
            title: artwork.prompt?.substring(0, 100),
            thumbnail: artwork.image_url
          },
          created_at: artwork.created_at
        })
      })
    }

    // 2.2 获取关注者的视频生成
    const { data: videos } = await supabase
      .from('video_generation_history')
      .select(`
        id,
        created_at,
        prompt,
        video_url,
        user_id,
        user_profiles!inner(display_name, avatar_url)
      `)
      .in('user_id', followingIds)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(20)

    if (videos) {
      videos.forEach(video => {
        feedItems.push({
          id: `video_${video.id}`,
          type: 'video',
          user: {
            id: video.user_id,
            name: (video as any).user_profiles?.display_name || 'User',
            avatar: (video as any).user_profiles?.avatar_url
          },
          content: {
            title: video.prompt?.substring(0, 100)
          },
          created_at: video.created_at
        })
      })
    }

    // 2.3 获取关注者获得的成就
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select(`
        id,
        unlocked_at,
        achievement_id,
        user_id,
        user_profiles!inner(display_name, avatar_url)
      `)
      .in('user_id', followingIds)
      .order('unlocked_at', { ascending: false })
      .limit(10)

    if (achievements) {
      achievements.forEach(achievement => {
        feedItems.push({
          id: `achievement_${achievement.id}`,
          type: 'achievement',
          user: {
            id: achievement.user_id,
            name: (achievement as any).user_profiles?.display_name || 'User',
            avatar: (achievement as any).user_profiles?.avatar_url
          },
          content: {
            title: achievement.achievement_id // 实际应该查成就名称
          },
          created_at: achievement.unlocked_at
        })
      })
    }

    // 3. 按时间排序
    feedItems.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // 4. 分页
    const paginatedItems = feedItems.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      meta: {
        total: feedItems.length,
        limit,
        offset
      }
    })

  } catch (error: any) {
    console.error('❌ Feed获取失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FEED_ERROR',
          message: '获取动态失败，请稍后重试'
        }
      },
      { status: 500 }
    )
  }
}
