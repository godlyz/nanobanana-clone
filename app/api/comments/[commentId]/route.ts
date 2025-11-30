/**
 * 🔥 老王的评论API - 单条评论操作
 * 用途: GET 获取单条评论, PUT 更新评论, DELETE 删除评论
 * 老王警告: 只能操作自己的评论，别想动别人的！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CommentWithAuthor,
  UpdateCommentRequest,
  CommentResponse,
  CommentActionResponse
} from '@/types/comment'

interface RouteContext {
  params: Promise<{ commentId: string }>
}

// ============================================
// GET: 获取单条评论详情
// ============================================
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { commentId } = await context.params
    const supabase = await createClient()

    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

    // 2. 查询评论
    const { data: comment, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:user_profiles!comments_user_id_fkey(
          user_id,
          display_name,
          avatar_url,
          username
        )
      `)
      .eq('id', commentId)
      .is('deleted_at', null)
      .single()

    if (error || !comment) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    // 3. 查询点赞状态
    let is_liked = false
    if (user) {
      const { data: like } = await supabase
        .from('comment_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .single()

      is_liked = !!like
    }

    const commentWithAuthor: CommentWithAuthor = {
      ...comment,
      author: comment.author || {
        user_id: comment.user_id,
        display_name: '已注销用户',
        avatar_url: null,
        username: null
      },
      is_liked
    }

    return NextResponse.json<CommentResponse>({
      success: true,
      data: commentWithAuthor
    })
  } catch (err) {
    console.error('❌ 获取评论详情异常:', err)
    return NextResponse.json<CommentResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT: 更新评论内容
// ============================================
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { commentId } = await context.params
    const supabase = await createClient()

    // 1. 验证登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body: UpdateCommentRequest = await request.json()
    const { content } = body

    // 3. 参数验证
    if (!content || content.trim().length === 0) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '评论内容不能为空' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '评论内容不能超过2000字' },
        { status: 400 }
      )
    }

    // 4. 验证评论存在且属于当前用户
    const { data: existingComment, error: findError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single()

    if (findError || !existingComment) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '只能编辑自己的评论' },
        { status: 403 }
      )
    }

    // 5. 更新评论（触发器会自动设置 is_edited 和 updated_at）
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .select(`
        *,
        author:user_profiles!comments_user_id_fkey(
          user_id,
          display_name,
          avatar_url,
          username
        )
      `)
      .single()

    if (updateError) {
      console.error('❌ 更新评论失败:', updateError)
      return NextResponse.json<CommentResponse>(
        { success: false, error: '更新评论失败' },
        { status: 500 }
      )
    }

    return NextResponse.json<CommentResponse>({
      success: true,
      data: {
        ...updatedComment,
        author: updatedComment.author || {
          user_id: user.id,
          display_name: '用户',
          avatar_url: null,
          username: null
        },
        is_liked: false
      }
    })
  } catch (err) {
    console.error('❌ 更新评论异常:', err)
    return NextResponse.json<CommentResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE: 删除评论（软删除）
// ============================================
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { commentId } = await context.params
    const supabase = await createClient()

    // 1. 验证登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 验证评论存在且属于当前用户
    const { data: existingComment, error: findError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single()

    if (findError || !existingComment) {
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '只能删除自己的评论' },
        { status: 403 }
      )
    }

    // 3. 软删除（设置 deleted_at）
    const { error: deleteError } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)

    if (deleteError) {
      console.error('❌ 删除评论失败:', deleteError)
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '删除评论失败' },
        { status: 500 }
      )
    }

    return NextResponse.json<CommentActionResponse>({
      success: true,
      message: '评论已删除'
    })
  } catch (err) {
    console.error('❌ 删除评论异常:', err)
    return NextResponse.json<CommentActionResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET 获取单条评论详情，包含作者信息和点赞状态
// 2. PUT 更新评论内容，只能改自己的
// 3. DELETE 软删除评论，设置 deleted_at 而不是真删
// 4. RLS 策略也会做权限检查，这里双重保险
