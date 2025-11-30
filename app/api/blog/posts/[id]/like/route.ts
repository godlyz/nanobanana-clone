/**
 * 🔥 老王的博客点赞API
 * 用途: 点赞/取消点赞博客文章
 * POST /api/blog/posts/[id]/like - 点赞文章（需要登录）
 * DELETE /api/blog/posts/[id]/like - 取消点赞（需要登录）
 * 老王警告: 唯一约束防重复点赞，重复点赞返回409冲突！like_count由trigger自动维护！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  LikeBlogPostResponse
} from '@/types/blog'

/**
 * POST /api/blog/posts/[id]/like
 * 点赞文章
 * 老王警告: 重复点赞会因唯一约束报错，返回409冲突！
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    console.log('👍 收到点赞请求:', postId)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 检查文章是否存在
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, like_count')
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    if (postError || !post) {
      console.error('❌ 文章不存在或已删除:', postError)
      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '文章不存在或已删除' },
        { status: 404 }
      )
    }

    // 3. 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('blog_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      console.log('⚠️ 用户已点赞过该文章')
      // 艹，已经点赞过了，直接返回当前状态
      return NextResponse.json<LikeBlogPostResponse>({
        success: true,
        data: {
          is_liked: true,
          like_count: post.like_count
        }
      }, { status: 200 })
    }

    // 4. 创建点赞记录
    const { error: likeError } = await supabase
      .from('blog_post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      })

    if (likeError) {
      console.error('❌ 点赞失败:', likeError)

      // 艹，如果是唯一约束冲突（23505），说明重复点赞
      if (likeError.code === '23505') {
        return NextResponse.json<LikeBlogPostResponse>(
          { success: false, error: '已经点赞过该文章' },
          { status: 409 }
        )
      }

      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '点赞失败' },
        { status: 500 }
      )
    }

    console.log('✅ 点赞成功')

    // 5. 获取最新的like_count（由trigger自动更新）
    const { data: updatedPost } = await supabase
      .from('blog_posts')
      .select('like_count')
      .eq('id', postId)
      .single()

    return NextResponse.json<LikeBlogPostResponse>({
      success: true,
      data: {
        is_liked: true,
        like_count: updatedPost?.like_count || (post.like_count + 1)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 点赞异常:', error)
    return NextResponse.json<LikeBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/blog/posts/[id]/like
 * 取消点赞
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    console.log('👎 收到取消点赞请求:', postId)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 检查文章是否存在
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, like_count')
      .eq('id', postId)
      .is('deleted_at', null)
      .single()

    if (postError || !post) {
      console.error('❌ 文章不存在或已删除:', postError)
      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '文章不存在或已删除' },
        { status: 404 }
      )
    }

    // 3. 删除点赞记录
    const { error: unlikeError } = await supabase
      .from('blog_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)

    if (unlikeError) {
      console.error('❌ 取消点赞失败:', unlikeError)
      return NextResponse.json<LikeBlogPostResponse>(
        { success: false, error: '取消点赞失败' },
        { status: 500 }
      )
    }

    console.log('✅ 取消点赞成功')

    // 4. 获取最新的like_count（由trigger自动更新）
    const { data: updatedPost } = await supabase
      .from('blog_posts')
      .select('like_count')
      .eq('id', postId)
      .single()

    return NextResponse.json<LikeBlogPostResponse>({
      success: true,
      data: {
        is_liked: false,
        like_count: updatedPost?.like_count || Math.max(0, post.like_count - 1)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 取消点赞异常:', error)
    return NextResponse.json<LikeBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. POST请求创建点赞记录，唯一约束(post_id, user_id)防止重复
// 2. DELETE请求删除点赞记录
// 3. like_count字段由数据库trigger自动维护，不需要手动更新
// 4. 重复点赞返回200（幂等性），前端可以重复调用
// 5. 点赞记录删除后会触发trigger自动减少like_count
// 6. 如果用户已点赞再次点赞，直接返回成功（不报错）
