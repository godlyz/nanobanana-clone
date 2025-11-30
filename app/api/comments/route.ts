/**
 * 🔥 老王的评论API - 列表和创建
 * 用途: GET 获取评论列表, POST 创建评论
 * 老王警告: 嵌套评论用parent_id，别tm搞成N+1查询！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CommentContentType,
  CommentWithAuthor,
  CreateCommentRequest,
  CommentsResponse,
  CommentResponse
} from '@/types/comment'

// ============================================
// GET: 获取评论列表
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 1. 解析查询参数
    const content_id = searchParams.get('content_id')
    const content_type = searchParams.get('content_type') as CommentContentType
    const parent_id = searchParams.get('parent_id') // null=顶级评论
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const sort = searchParams.get('sort') || 'newest'

    // 2. 参数验证
    if (!content_id || !content_type) {
      return NextResponse.json<CommentsResponse>(
        { success: false, error: '缺少 content_id 或 content_type 参数' },
        { status: 400 }
      )
    }

    // 3. 获取当前用户（用于判断是否点赞）
    const { data: { user } } = await supabase.auth.getUser()

    // 4. 构建查询
    const offset = (page - 1) * limit

    let query = supabase
      .from('comments')
      .select(`
        *,
        author:user_profiles!comments_user_id_fkey(
          user_id,
          display_name,
          avatar_url,
          username
        )
      `, { count: 'exact' })
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .is('deleted_at', null)

    // 5. 根据 parent_id 筛选
    if (parent_id === null || parent_id === 'null' || !parent_id) {
      // 只查顶级评论
      query = query.is('parent_id', null)
    } else {
      // 查某评论的回复
      query = query.eq('parent_id', parent_id)
    }

    // 6. 排序
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'popular') {
      query = query.order('like_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // 7. 分页
    query = query.range(offset, offset + limit - 1)

    const { data: comments, error, count } = await query

    if (error) {
      console.error('❌ 查询评论失败:', error)
      return NextResponse.json<CommentsResponse>(
        { success: false, error: '获取评论失败' },
        { status: 500 }
      )
    }

    // 8. 如果用户已登录，查询点赞状态
    let likedCommentIds = new Set<string>()
    if (user && comments && comments.length > 0) {
      const commentIds = comments.map(c => c.id)
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds)

      if (likes) {
        likedCommentIds = new Set(likes.map(l => l.comment_id))
      }
    }

    // 9. 组装返回数据
    const commentsWithAuthor: CommentWithAuthor[] = (comments || []).map(comment => ({
      ...comment,
      author: comment.author || {
        user_id: comment.user_id,
        display_name: '已注销用户',
        avatar_url: null,
        username: null
      },
      is_liked: likedCommentIds.has(comment.id)
    }))

    // 10. 如果是顶级评论，加载前2条回复预览
    if (!parent_id || parent_id === 'null') {
      for (const comment of commentsWithAuthor) {
        if (comment.reply_count > 0) {
          const { data: replies } = await supabase
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
            .eq('parent_id', comment.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(2)

          if (replies) {
            comment.replies = replies.map(reply => ({
              ...reply,
              author: reply.author || {
                user_id: reply.user_id,
                display_name: '已注销用户',
                avatar_url: null,
                username: null
              },
              is_liked: likedCommentIds.has(reply.id)
            }))
          }
        }
      }
    }

    return NextResponse.json<CommentsResponse>({
      success: true,
      data: commentsWithAuthor,
      pagination: {
        page,
        limit,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      }
    })
  } catch (err) {
    console.error('❌ 获取评论异常:', err)
    return NextResponse.json<CommentsResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// ============================================
// POST: 创建评论
// ============================================
export async function POST(request: NextRequest) {
  try {
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
    const body: CreateCommentRequest = await request.json()
    const { content_id, content_type, parent_id, content } = body

    // 3. 参数验证
    if (!content_id || !content_type) {
      return NextResponse.json<CommentResponse>(
        { success: false, error: '缺少 content_id 或 content_type' },
        { status: 400 }
      )
    }

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

    // 4. 如果是回复，验证父评论存在且深度未超限
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, depth, user_id')
        .eq('id', parent_id)
        .is('deleted_at', null)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json<CommentResponse>(
          { success: false, error: '父评论不存在' },
          { status: 400 }
        )
      }

      // 检查深度限制（数据库触发器也会检查，这里提前返回友好错误）
      if (parentComment.depth >= 2) {
        return NextResponse.json<CommentResponse>(
          { success: false, error: '评论嵌套层级不能超过3层' },
          { status: 400 }
        )
      }
    }

    // 5. 创建评论
    const { data: newComment, error: insertError } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        content_id,
        content_type,
        parent_id: parent_id || null,
        content: content.trim()
      })
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

    if (insertError) {
      console.error('❌ 创建评论失败:', insertError)
      return NextResponse.json<CommentResponse>(
        { success: false, error: insertError.message || '创建评论失败' },
        { status: 500 }
      )
    }

    // 6. TODO: 创建通知（回复通知、@提及通知）
    // 这部分在通知API完成后补充

    return NextResponse.json<CommentResponse>({
      success: true,
      data: {
        ...newComment,
        author: newComment.author || {
          user_id: user.id,
          display_name: '用户',
          avatar_url: null,
          username: null
        },
        is_liked: false
      }
    }, { status: 201 })
  } catch (err) {
    console.error('❌ 创建评论异常:', err)
    return NextResponse.json<CommentResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET 支持分页、排序、按parent_id筛选
// 2. POST 创建评论时自动检查深度限制
// 3. 顶级评论自动加载前2条回复预览
// 4. 登录用户可以看到自己的点赞状态
// 5. 通知创建逻辑在通知API完成后补充
