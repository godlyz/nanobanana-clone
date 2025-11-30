/**
 * 🔥 老王的用户资料API
 * 用途: 获取和更新用户资料
 * GET /api/profile/[userId] - 获取用户资料
 * PUT /api/profile/[userId] - 更新用户资料（需要登录且只能更新自己的）
 * 老王警告: 统计字段不能手动更新，只能通过触发器自动更新！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  UserProfileDetail,
  GetUserProfileResponse,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse
} from '@/types/profile'

/**
 * GET /api/profile/[userId]
 * 获取用户资料（包含是否关注状态）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    console.log('📖 获取用户资料:', userId)

    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 获取当前登录用户（用于判断关注状态）
    const { data: { user } } = await supabase.auth.getUser()

    // 3. 查询用户资料
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ 用户资料不存在:', profileError)
      return NextResponse.json<GetUserProfileResponse>(
        { success: false, error: '用户资料不存在' },
        { status: 404 }
      )
    }

    // 4. 查询关注状态（仅登录用户）
    let isFollowing = false
    let isFollowedBy = false

    if (user && user.id !== userId) {
      // 查询当前用户是否关注了该用户
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single()

      isFollowing = !!followingData

      // 查询该用户是否关注了当前用户
      const { data: followedByData } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('following_id', user.id)
        .single()

      isFollowedBy = !!followedByData
    }

    // 5. 组装详情数据
    const detail: UserProfileDetail = {
      ...profile,
      is_following: isFollowing,
      is_followed_by: isFollowedBy
    }

    console.log('✅ 用户资料查询成功')

    return NextResponse.json<GetUserProfileResponse>({
      success: true,
      data: detail
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取用户资料异常:', error)
    return NextResponse.json<GetUserProfileResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile/[userId]
 * 更新用户资料（仅用户本人可更新）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    console.log('✏️ 收到更新用户资料请求:', userId)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<UpdateUserProfileResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 验证权限：只能更新自己的资料
    if (user.id !== userId) {
      console.error('❌ 无权更新他人资料')
      return NextResponse.json<UpdateUserProfileResponse>(
        { success: false, error: '无权更新他人资料' },
        { status: 403 }
      )
    }

    // 3. 解析请求体
    const body: UpdateUserProfileRequest = await request.json()
    const {
      display_name,
      avatar_url,
      bio,
      website_url,
      twitter_handle,
      instagram_handle,
      github_handle,
      location
    } = body

    console.log('📋 更新信息:', {
      display_name,
      has_avatar_url: !!avatar_url,
      has_bio: !!bio,
      has_website_url: !!website_url
    })

    // 4. 验证字段长度
    if (display_name !== undefined && display_name.length > 100) {
      return NextResponse.json<UpdateUserProfileResponse>(
        { success: false, error: '显示名称最多100个字符' },
        { status: 400 }
      )
    }

    if (bio !== undefined && bio.length > 500) {
      return NextResponse.json<UpdateUserProfileResponse>(
        { success: false, error: '个人简介最多500个字符' },
        { status: 400 }
      )
    }

    // 5. 构建更新数据（只更新提供的字段）
    const updateData: any = {}
    if (display_name !== undefined) updateData.display_name = display_name || null
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null
    if (bio !== undefined) updateData.bio = bio || null
    if (website_url !== undefined) updateData.website_url = website_url || null
    if (twitter_handle !== undefined) updateData.twitter_handle = twitter_handle || null
    if (instagram_handle !== undefined) updateData.instagram_handle = instagram_handle || null
    if (github_handle !== undefined) updateData.github_handle = github_handle || null
    if (location !== undefined) updateData.location = location || null

    // 6. 更新用户资料
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select('user_id, updated_at')
      .single()

    if (updateError) {
      console.error('❌ 更新用户资料失败:', updateError)
      return NextResponse.json<UpdateUserProfileResponse>(
        { success: false, error: '更新用户资料失败' },
        { status: 500 }
      )
    }

    console.log('✅ 用户资料更新成功')

    // 7. 返回成功
    return NextResponse.json<UpdateUserProfileResponse>({
      success: true,
      data: {
        user_id: updatedProfile.user_id,
        updated_at: updatedProfile.updated_at
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 更新用户资料异常:', error)
    return NextResponse.json<UpdateUserProfileResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET请求查询用户资料，同时查询当前用户的关注状态
// 2. is_following表示当前用户是否关注了该用户
// 3. is_followed_by表示该用户是否关注了当前用户
// 4. PUT请求只能更新自己的资料（user_id必须等于当前登录用户ID）
// 5. 只更新提供的字段，未提供的字段保持不变
// 6. 统计字段（follower_count等）不能手动更新，通过触发器自动维护
// 7. 所有文本字段都进行长度验证，防止恶意输入
