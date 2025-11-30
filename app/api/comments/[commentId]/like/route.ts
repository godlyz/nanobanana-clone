/**
 * 🔥 老王的评论点赞API
 * 用途: POST 点赞评论, DELETE 取消点赞
 * 老王警告: 一个用户对一条评论只能点一次赞，别想刷赞！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CommentActionResponse } from '@/types/comment'

interface RouteContext {
  params: Promise<{ commentId: string }>
}

// ============================================
// POST: 点赞评论
// ============================================
export async function POST(
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

    // 2. 验证评论存在
    const { data: comment, error: findError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single()

    if (findError || !comment) {
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    // 3. 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
      .single()

    if (existingLike) {
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '已经点赞过了' },
        { status: 400 }
      )
    }

    // 4. 创建点赞记录（触发器会自动更新 like_count）
    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({
        user_id: user.id,
        comment_id: commentId
      })

    if (insertError) {
      console.error('❌ 点赞失败:', insertError)
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '点赞失败' },
        { status: 500 }
      )
    }

    // 5. TODO: 创建点赞通知（通知API完成后补充）

    return NextResponse.json<CommentActionResponse>({
      success: true,
      message: '点赞成功'
    })
  } catch (err) {
    console.error('❌ 点赞异常:', err)
    return NextResponse.json<CommentActionResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE: 取消点赞
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

    // 2. 删除点赞记录（触发器会自动更新 like_count）
    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', commentId)

    if (deleteError) {
      console.error('❌ 取消点赞失败:', deleteError)
      return NextResponse.json<CommentActionResponse>(
        { success: false, error: '取消点赞失败' },
        { status: 500 }
      )
    }

    return NextResponse.json<CommentActionResponse>({
      success: true,
      message: '已取消点赞'
    })
  } catch (err) {
    console.error('❌ 取消点赞异常:', err)
    return NextResponse.json<CommentActionResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. POST 点赞，DELETE 取消点赞
// 2. 数据库触发器自动维护评论的 like_count
// 3. 一个用户对一条评论只能点一次赞（复合主键约束）
// 4. 点赞通知逻辑在通知API完成后补充
