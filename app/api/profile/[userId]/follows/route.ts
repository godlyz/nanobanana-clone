/**
 * 🔥 老王的关注列表API
 * 用途: 获取用户的关注列表或粉丝列表
 * GET /api/profile/[userId]/follows?type=following - 获取用户关注的人列表
 * GET /api/profile/[userId]/follows?type=followers - 获取用户的粉丝列表
 * 老王警告: 这个查询要优化好，不然数据多了会卡成SB！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FollowUser, GetFollowListResponse } from '@/types/profile'

/**
 * GET /api/profile/[userId]/follows
 * 获取关注列表或粉丝列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)

    // 1. 解析查询参数
    const type = searchParams.get('type') || 'following' // 默认查询关注列表
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最多100条
    const offset = (page - 1) * limit

    console.log('📖 获取关注列表:', { userId, type, page, limit })

    // 2. 验证type参数
    if (type !== 'following' && type !== 'followers') {
      return NextResponse.json<GetFollowListResponse>(
        { success: false, error: 'type参数必须是following或followers' },
        { status: 400 }
      )
    }

    // 3. 创建Supabase客户端
    const supabase = await createClient()

    // 4. 获取当前登录用户（用于判断关注状态）
    const { data: { user } } = await supabase.auth.getUser()

    // 5. 构建查询
    let query

    if (type === 'following') {
      // 查询用户关注的人
      query = supabase
        .from('user_follows')
        .select(`
          following_id,
          created_at,
          user_profiles!user_follows_following_id_fkey (
            user_id,
            display_name,
            avatar_url,
            bio,
            follower_count,
            following_count,
            total_likes
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    } else {
      // 查询用户的粉丝
      query = supabase
        .from('user_follows')
        .select(`
          follower_id,
          created_at,
          user_profiles!user_follows_follower_id_fkey (
            user_id,
            display_name,
            avatar_url,
            bio,
            follower_count,
            following_count,
            total_likes
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    }

    const { data: followData, error: followError } = await query

    if (followError) {
      console.error('❌ 查询关注列表失败:', followError)
      return NextResponse.json<GetFollowListResponse>(
        { success: false, error: '查询关注列表失败' },
        { status: 500 }
      )
    }

    // 6. 获取总数（用于分页）
    const countQuery = type === 'following'
      ? supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId)
      : supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)

    const { count } = await countQuery

    // 7. 处理结果并查询当前用户的关注状态
    const users: FollowUser[] = await Promise.all(
      (followData || []).map(async (item: any) => {
        const profile = item.user_profiles
        const targetUserId = type === 'following' ? item.following_id : item.follower_id

        // 查询当前用户是否关注了该用户
        let isFollowing = false
        if (user && user.id !== targetUserId) {
          const { data: followCheck } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .single()

          isFollowing = !!followCheck
        }

        return {
          user_id: profile.user_id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          follower_count: profile.follower_count,
          following_count: profile.following_count,
          total_likes: profile.total_likes,
          is_following: isFollowing,
          followed_at: item.created_at
        }
      })
    )

    console.log('✅ 关注列表查询成功，共', users.length, '条')

    return NextResponse.json<GetFollowListResponse>({
      success: true,
      data: users,
      pagination: {
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取关注列表异常:', error)
    return NextResponse.json<GetFollowListResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. type参数控制查询类型：following=关注列表，followers=粉丝列表
// 2. 使用分页避免一次查询太多数据（默认20条，最多100条）
// 3. 使用Supabase的外键关联（!user_profiles!...）自动join用户资料
// 4. 为每个用户查询当前登录用户的关注状态（is_following）
// 5. 返回分页信息（total, page, limit, has_more）方便前端实现无限滚动
// 6. 按关注时间降序排列（最新关注的在前面）
// 7. followed_at字段记录关注/被关注的时间
