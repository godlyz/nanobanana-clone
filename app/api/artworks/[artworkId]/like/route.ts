/**
 * 🔥 老王的作品点赞API
 * 用途: 点赞/取消点赞作品（图片或视频）
 * POST /api/artworks/[artworkId]/like?type=image|video - 点赞作品（幂等操作）
 * DELETE /api/artworks/[artworkId]/like?type=image|video - 取消点赞
 * GET /api/artworks/[artworkId]/like?type=image|video - 获取点赞状态
 * 老王警告: like_count通过触发器自动更新，别tm手动改！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  ArtworkType,
  LikeArtworkResponse,
  GetLikeStatusResponse
} from '@/types/profile'

/**
 * GET /api/artworks/[artworkId]/like
 * 获取作品点赞状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> }
) {
  try {
    const { artworkId } = await params
    const { searchParams } = new URL(request.url)
    const artworkType = searchParams.get('type') as ArtworkType

    console.log('📖 获取作品点赞状态:', { artworkId, artworkType })

    // 1. 验证type参数
    if (!artworkType || (artworkType !== 'image' && artworkType !== 'video')) {
      return NextResponse.json<GetLikeStatusResponse>(
        { success: false, error: 'type参数必须是image或video' },
        { status: 400 }
      )
    }

    // 2. 创建Supabase客户端
    const supabase = await createClient()

    // 3. 获取当前登录用户
    const { data: { user } } = await supabase.auth.getUser()

    // 4. 查询点赞状态
    let isLiked = false
    if (user) {
      const { data: likeData } = await supabase
        .from('artwork_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('artwork_id', artworkId)
        .eq('artwork_type', artworkType)
        .single()

      isLiked = !!likeData
    }

    // 5. 获取作品的点赞总数
    const tableName = artworkType === 'image' ? 'image_generations' : 'video_generations'
    const { data: artworkData } = await supabase
      .from(tableName)
      .select('like_count')
      .eq('id', artworkId)
      .single()

    console.log('✅ 点赞状态查询成功:', { isLiked, likeCount: artworkData?.like_count || 0 })

    return NextResponse.json<GetLikeStatusResponse>({
      success: true,
      data: {
        is_liked: isLiked,
        like_count: artworkData?.like_count || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取点赞状态异常:', error)
    return NextResponse.json<GetLikeStatusResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/artworks/[artworkId]/like
 * 点赞作品（幂等操作：如果已点赞则直接返回成功）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> }
) {
  try {
    const { artworkId } = await params
    const { searchParams } = new URL(request.url)
    const artworkType = searchParams.get('type') as ArtworkType

    console.log('➕ 收到点赞作品请求:', { artworkId, artworkType })

    // 1. 验证type参数
    if (!artworkType || (artworkType !== 'image' && artworkType !== 'video')) {
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: 'type参数必须是image或video' },
        { status: 400 }
      )
    }

    // 2. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 3. 检查作品是否存在
    const tableName = artworkType === 'image' ? 'image_generations' : 'video_generations'
    const { data: artwork, error: artworkError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', artworkId)
      .single()

    if (artworkError || !artwork) {
      console.error('❌ 作品不存在:', artworkError)
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: '作品不存在' },
        { status: 404 }
      )
    }

    // 4. 检查是否已点赞（幂等性）
    const { data: existingLike } = await supabase
      .from('artwork_likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('artwork_id', artworkId)
      .eq('artwork_type', artworkType)
      .single()

    if (existingLike) {
      console.log('✅ 已点赞该作品（幂等操作）')

      // 获取最新的like_count
      const { data: artworkData } = await supabase
        .from(tableName)
        .select('like_count')
        .eq('id', artworkId)
        .single()

      return NextResponse.json<LikeArtworkResponse>({
        success: true,
        data: {
          user_id: user.id,
          artwork_id: artworkId,
          artwork_type: artworkType,
          is_liked: true,
          like_count: artworkData?.like_count || 0
        }
      }, { status: 200 })
    }

    // 5. 创建点赞记录
    const { error: insertError } = await supabase
      .from('artwork_likes')
      .insert({
        user_id: user.id,
        artwork_id: artworkId,
        artwork_type: artworkType
      })

    if (insertError) {
      console.error('❌ 点赞作品失败:', insertError)
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: '点赞作品失败' },
        { status: 500 }
      )
    }

    // 6. 获取更新后的like_count（触发器已自动增加）
    const { data: artworkData } = await supabase
      .from(tableName)
      .select('like_count')
      .eq('id', artworkId)
      .single()

    console.log('✅ 点赞作品成功')

    return NextResponse.json<LikeArtworkResponse>({
      success: true,
      data: {
        user_id: user.id,
        artwork_id: artworkId,
        artwork_type: artworkType,
        is_liked: true,
        like_count: artworkData?.like_count || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 点赞作品异常:', error)
    return NextResponse.json<LikeArtworkResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/artworks/[artworkId]/like
 * 取消点赞
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> }
) {
  try {
    const { artworkId } = await params
    const { searchParams } = new URL(request.url)
    const artworkType = searchParams.get('type') as ArtworkType

    console.log('➖ 收到取消点赞请求:', { artworkId, artworkType })

    // 1. 验证type参数
    if (!artworkType || (artworkType !== 'image' && artworkType !== 'video')) {
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: 'type参数必须是image或video' },
        { status: 400 }
      )
    }

    // 2. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 3. 删除点赞记录
    const { error: deleteError } = await supabase
      .from('artwork_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('artwork_id', artworkId)
      .eq('artwork_type', artworkType)

    if (deleteError) {
      console.error('❌ 取消点赞失败:', deleteError)
      return NextResponse.json<LikeArtworkResponse>(
        { success: false, error: '取消点赞失败' },
        { status: 500 }
      )
    }

    // 4. 获取更新后的like_count（触发器已自动减少）
    const tableName = artworkType === 'image' ? 'image_generations' : 'video_generations'
    const { data: artworkData } = await supabase
      .from(tableName)
      .select('like_count')
      .eq('id', artworkId)
      .single()

    console.log('✅ 取消点赞成功')

    return NextResponse.json<LikeArtworkResponse>({
      success: true,
      data: {
        user_id: user.id,
        artwork_id: artworkId,
        artwork_type: artworkType,
        is_liked: false,
        like_count: artworkData?.like_count || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 取消点赞异常:', error)
    return NextResponse.json<LikeArtworkResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET请求查询当前用户的点赞状态和作品的总点赞数
// 2. POST请求实现幂等性：如果已点赞则直接返回成功
// 3. DELETE请求取消点赞，即使记录不存在也不报错
// 4. type参数区分图片和视频，必须是'image'或'video'
// 5. 点赞/取消点赞会触发器自动更新like_count和用户的total_likes
// 6. 返回最新的like_count给前端实时更新UI
// 7. RLS策略确保用户只能创建/删除自己的点赞记录
