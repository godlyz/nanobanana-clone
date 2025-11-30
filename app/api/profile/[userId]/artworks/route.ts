/**
 * 🔥 老王的用户作品画廊API
 * 用途: 获取用户的所有作品（图片+视频）
 * GET /api/profile/[userId]/artworks?type=all|image|video&sort=latest|popular
 * 老王警告: 这个查询要优化好，数据多了会卡成SB！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ArtworkItem, GetUserArtworksResponse } from '@/types/profile'

/**
 * GET /api/profile/[userId]/artworks
 * 获取用户的作品画廊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)

    // 1. 解析查询参数
    const type = searchParams.get('type') || 'all' // all/image/video
    const sort = searchParams.get('sort') || 'latest' // latest/popular
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最多100条
    const offset = (page - 1) * limit

    console.log('📖 获取用户作品画廊:', { userId, type, sort, page, limit })

    // 2. 验证type参数
    if (!['all', 'image', 'video'].includes(type)) {
      return NextResponse.json<GetUserArtworksResponse>(
        { success: false, error: 'type参数必须是all、image或video' },
        { status: 400 }
      )
    }

    // 3. 验证sort参数
    if (!['latest', 'popular'].includes(sort)) {
      return NextResponse.json<GetUserArtworksResponse>(
        { success: false, error: 'sort参数必须是latest或popular' },
        { status: 400 }
      )
    }

    // 4. 创建Supabase客户端
    const supabase = await createClient()

    // 5. 获取当前登录用户（用于判断点赞状态）
    const { data: { user } } = await supabase.auth.getUser()

    // 6. 获取用户信息（用于返回作品作者信息）
    const { data: authorData } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .single()

    if (!authorData) {
      return NextResponse.json<GetUserArtworksResponse>(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    const author = {
      user_id: authorData.user_id,
      display_name: authorData.display_name,
      avatar_url: authorData.avatar_url
    }

    // 7. 查询作品（图片和视频分别查询，然后合并）
    let artworks: ArtworkItem[] = []

    // 查询图片作品
    if (type === 'all' || type === 'image') {
      const orderColumn = sort === 'latest' ? 'created_at' : 'like_count'
      const { data: images } = await supabase
        .from('image_generations')
        .select('id, user_id, prompt, image_url, aspect_ratio, like_count, created_at')
        .eq('user_id', userId)
        .order(orderColumn, { ascending: false })
        .limit(type === 'image' ? limit : Math.ceil(limit / 2))

      if (images) {
        // 查询当前用户对这些图片的点赞状态
        const imageIds = images.map(img => img.id)
        let likedImageIds: string[] = []

        if (user && imageIds.length > 0) {
          const { data: likesData } = await supabase
            .from('artwork_likes')
            .select('artwork_id')
            .eq('user_id', user.id)
            .eq('artwork_type', 'image')
            .in('artwork_id', imageIds)

          likedImageIds = likesData?.map(like => like.artwork_id) || []
        }

        const imageArtworks: ArtworkItem[] = images.map(img => ({
          id: img.id,
          type: 'image' as const,
          user_id: img.user_id,
          prompt: img.prompt,
          image_url: img.image_url,
          aspect_ratio: img.aspect_ratio || undefined,
          like_count: img.like_count || 0,
          is_liked: likedImageIds.includes(img.id),
          created_at: img.created_at,
          user: author
        }))

        artworks = [...artworks, ...imageArtworks]
      }
    }

    // 查询视频作品
    if (type === 'all' || type === 'video') {
      const orderColumn = sort === 'latest' ? 'created_at' : 'like_count'
      const { data: videos } = await supabase
        .from('video_generations')
        .select('id, user_id, prompt, video_url, thumbnail_url, like_count, created_at')
        .eq('user_id', userId)
        .order(orderColumn, { ascending: false })
        .limit(type === 'video' ? limit : Math.ceil(limit / 2))

      if (videos) {
        // 查询当前用户对这些视频的点赞状态
        const videoIds = videos.map(vid => vid.id)
        let likedVideoIds: string[] = []

        if (user && videoIds.length > 0) {
          const { data: likesData } = await supabase
            .from('artwork_likes')
            .select('artwork_id')
            .eq('user_id', user.id)
            .eq('artwork_type', 'video')
            .in('artwork_id', videoIds)

          likedVideoIds = likesData?.map(like => like.artwork_id) || []
        }

        const videoArtworks: ArtworkItem[] = videos.map(vid => ({
          id: vid.id,
          type: 'video' as const,
          user_id: vid.user_id,
          prompt: vid.prompt,
          image_url: vid.thumbnail_url || undefined, // 使用缩略图作为封面
          video_url: vid.video_url,
          like_count: vid.like_count || 0,
          is_liked: likedVideoIds.includes(vid.id),
          created_at: vid.created_at,
          user: author
        }))

        artworks = [...artworks, ...videoArtworks]
      }
    }

    // 8. 如果是混合查询，需要重新排序并分页
    if (type === 'all') {
      // 重新排序
      artworks.sort((a, b) => {
        if (sort === 'latest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        } else {
          return b.like_count - a.like_count
        }
      })

      // 分页
      artworks = artworks.slice(offset, offset + limit)
    }

    // 9. 获取总数（用于分页）
    let total = 0
    if (type === 'all' || type === 'image') {
      const { count: imageCount } = await supabase
        .from('image_generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      total += imageCount || 0
    }
    if (type === 'all' || type === 'video') {
      const { count: videoCount } = await supabase
        .from('video_generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      total += videoCount || 0
    }

    console.log('✅ 作品画廊查询成功，共', artworks.length, '条')

    return NextResponse.json<GetUserArtworksResponse>({
      success: true,
      data: artworks,
      pagination: {
        total,
        page,
        limit,
        has_more: total > offset + limit
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取作品画廊异常:', error)
    return NextResponse.json<GetUserArtworksResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. type参数控制查询类型：all=所有作品，image=仅图片，video=仅视频
// 2. sort参数控制排序：latest=最新，popular=最热门（按点赞数）
// 3. 使用分页避免一次查询太多数据（默认20条，最多100条）
// 4. 为每个作品查询当前登录用户的点赞状态（is_liked）
// 5. 视频作品使用thumbnail_url作为封面图（image_url字段）
// 6. type=all时会混合查询图片和视频，然后按sort参数重新排序
// 7. 返回分页信息（total, page, limit, has_more）方便前端实现无限滚动
// 8. 每个作品都包含作者信息（user字段）
