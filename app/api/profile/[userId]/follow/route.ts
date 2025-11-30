/**
 * 🔥 老王的关注用户API
 * 用途: 关注/取关用户
 * POST /api/profile/[userId]/follow - 关注用户（幂等操作）
 * DELETE /api/profile/[userId]/follow - 取关用户
 * 老王警告: follower_count和following_count通过触发器自动更新，别tm手动改！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FollowUserResponse } from '@/types/profile'

/**
 * POST /api/profile/[userId]/follow
 * 关注用户（幂等操作：如果已关注则直接返回成功）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: followingId } = await params
    console.log('➕ 收到关注用户请求:', followingId)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const followerId = user.id

    // 2. 验证不能关注自己
    if (followerId === followingId) {
      console.error('❌ 不能关注自己')
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '不能关注自己' },
        { status: 400 }
      )
    }

    // 3. 检查被关注用户是否存在
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', followingId)
      .single()

    if (userError || !targetUser) {
      console.error('❌ 被关注用户不存在:', userError)
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '被关注用户不存在' },
        { status: 404 }
      )
    }

    // 4. 检查是否已关注（幂等性）
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (existingFollow) {
      console.log('✅ 已关注该用户（幂等操作）')

      // 获取最新的follower_count
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('follower_count')
        .eq('user_id', followingId)
        .single()

      return NextResponse.json<FollowUserResponse>({
        success: true,
        data: {
          follower_id: followerId,
          following_id: followingId,
          is_following: true,
          follower_count: profileData?.follower_count || 0
        }
      }, { status: 200 })
    }

    // 5. 创建关注关系
    const { error: insertError } = await supabase
      .from('user_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })

    if (insertError) {
      console.error('❌ 关注用户失败:', insertError)
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '关注用户失败' },
        { status: 500 }
      )
    }

    // 6. 获取更新后的follower_count（触发器已自动增加）
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('follower_count')
      .eq('user_id', followingId)
      .single()

    console.log('✅ 关注用户成功')

    return NextResponse.json<FollowUserResponse>({
      success: true,
      data: {
        follower_id: followerId,
        following_id: followingId,
        is_following: true,
        follower_count: profileData?.follower_count || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 关注用户异常:', error)
    return NextResponse.json<FollowUserResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/[userId]/follow
 * 取关用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: followingId } = await params
    console.log('➖ 收到取关用户请求:', followingId)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const followerId = user.id

    // 2. 删除关注关系
    const { error: deleteError } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (deleteError) {
      console.error('❌ 取关用户失败:', deleteError)
      return NextResponse.json<FollowUserResponse>(
        { success: false, error: '取关用户失败' },
        { status: 500 }
      )
    }

    // 3. 获取更新后的follower_count（触发器已自动减少）
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('follower_count')
      .eq('user_id', followingId)
      .single()

    console.log('✅ 取关用户成功')

    return NextResponse.json<FollowUserResponse>({
      success: true,
      data: {
        follower_id: followerId,
        following_id: followingId,
        is_following: false,
        follower_count: profileData?.follower_count || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 取关用户异常:', error)
    return NextResponse.json<FollowUserResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. POST请求实现幂等性：如果已关注则直接返回成功
// 2. 不能关注自己（CHECK约束在数据库层面也有，这里双重保险）
// 3. 关注/取关操作会触发器自动更新follower_count和following_count
// 4. 返回最新的follower_count给前端实时更新UI
// 5. 删除操作即使关系不存在也不报错（软删除语义）
// 6. RLS策略确保用户只能创建/删除自己的关注关系
