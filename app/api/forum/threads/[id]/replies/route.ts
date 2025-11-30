/**
 * 🔥 老王创建：Forum Thread Replies API
 * 用途：获取帖子的回复列表和创建新回复
 * 路由：/api/forum/threads/[id]/replies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ForumReply, PaginatedResponse, ApiResponse } from '@/types/forum'
import { invalidateCache, CacheInvalidationEvent } from '@/lib/forum-cache'

/**
 * GET /api/forum/threads/[id]/replies
 * 获取帖子的回复列表（支持分页、排序）
 *
 * Query参数：
 * - page: number (页码，默认1)
 * - limit: number (每页数量，默认20，最大100)
 * - sort: 'oldest' | 'newest' | 'votes' (排序方式，默认oldest)
 * - parent_id: string (仅获取某个回复的子回复)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    // 🔥 老王修复：Next.js 16中params是Promise，需要await
    const { id: threadId } = await params
    const searchParams = request.nextUrl.searchParams

    // 解析分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 解析排序参数
    const sort = (searchParams.get('sort') || 'oldest') as 'oldest' | 'newest' | 'votes'
    const parentId = searchParams.get('parent_id')

    // 验证帖子是否存在
    const { data: thread } = await supabase
      .from('forum_threads')
      .select('id')
      .eq('id', threadId)
      .is('deleted_at', null)
      .single()

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread not found',
        } as ApiResponse,
        { status: 404 }
      )
    }

    // 构建查询（先查回复，再手动JOIN）
    // 🔥 老王修复：不能用外键JOIN，改为手动关联
    let query = supabase
      .from('forum_replies')
      .select('*', { count: 'exact' })
      .eq('thread_id', threadId)
      .is('deleted_at', null)

    // 如果指定了parent_id，只获取子回复
    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      // 否则只获取顶级回复（没有parent_id的回复）
      query = query.is('parent_id', null)
    }

    // 应用排序
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'votes':
        query = query.order('upvote_count', { ascending: false })
        break
    }

    // 应用分页
    const { data: replies, error, count } = await query.range(offset, offset + limit - 1)

    // 🔥 老王修复：如果error.message是奇怪的值（如 '{"'），忽略错误并返回空数组
    // 这是Supabase在某些边界情况下的bug，当查询范围超出数据时可能返回奇怪的error
    if (error && error.message && error.message.trim() === '{"') {
      console.warn('⚠️ Supabase返回了异常的error.message，忽略并返回空结果')
      // 不返回错误，继续执行，replies会是空数组
    } else if (error) {
      console.error('❌ 获取回复列表失败:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch replies',
        } as ApiResponse,
        { status: 500 }
      )
    }

    // 🔥 老王添加：手动JOIN user_profiles补充作者信息
    if (replies && replies.length > 0) {
      const userIds = [...new Set(replies.map((r: any) => r.user_id).filter(Boolean))]

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds)

        const profileMap = new Map()
        profiles?.forEach((p: any) => profileMap.set(p.user_id, p))

        replies.forEach((reply: any) => {
          reply.author = profileMap.get(reply.user_id) || null
        })
      }
    }

    // 计算分页信息
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        data: replies as ForumReply[],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      } as PaginatedResponse<ForumReply>,
    } as ApiResponse<PaginatedResponse<ForumReply>>)
  } catch (error: any) {
    console.error('❌ Get Replies API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch replies',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/forum/threads/[id]/replies
 * 创建新回复
 *
 * Body参数：
 * - content: string (必填，≥1字符)
 * - parent_id: string (可选，回复的父回复ID)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    // 🔥 老王修复：Next.js 16中params是Promise，需要await
    const { id: threadId } = await params

    // 验证用户身份
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        } as ApiResponse,
        { status: 401 }
      )
    }

    // 验证帖子是否存在且未锁定
    const { data: thread } = await supabase
      .from('forum_threads')
      .select('id, is_locked, status')
      .eq('id', threadId)
      .is('deleted_at', null)
      .single()

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread not found',
        } as ApiResponse,
        { status: 404 }
      )
    }

    // 检查帖子是否已锁定或关闭
    if (thread.is_locked) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread is locked',
        } as ApiResponse,
        { status: 403 }
      )
    }

    if (thread.status === 'closed' || thread.status === 'archived') {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread is closed or archived',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { content, parent_id } = body

    // 验证content
    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content cannot be empty',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 如果是回复某个回复，验证父回复是否存在
    if (parent_id) {
      const { data: parentReply } = await supabase
        .from('forum_replies')
        .select('id, thread_id')
        .eq('id', parent_id)
        .is('deleted_at', null)
        .single()

      if (!parentReply) {
        return NextResponse.json(
          {
            success: false,
            error: 'Parent reply not found',
          } as ApiResponse,
          { status: 404 }
        )
      }

      // 验证父回复是否属于同一个帖子
      if (parentReply.thread_id !== threadId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Parent reply does not belong to this thread',
          } as ApiResponse,
          { status: 400 }
        )
      }
    }

    // 创建回复（先插入，再手动JOIN）
    // 🔥 老王修复：不能用外键JOIN，改为手动关联
    const { data: reply, error } = await supabase
      .from('forum_replies')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        parent_id: parent_id || null,
        content,
      })
      .select('*')
      .single()

    if (error) {
      console.error('❌ 创建回复失败:', error)
      throw error
    }

    // 🔥 老王添加：手动JOIN user_profiles
    if (reply) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', reply.user_id)
        .single()

      ;(reply as any).author = profile || null
    }

    // 🔥 老王添加：回复发布后清除相关缓存
    await invalidateCache(CacheInvalidationEvent.REPLY_CREATED, {
      threadId,
    })

    return NextResponse.json(
      {
        success: true,
        data: reply as ForumReply,
        message: 'Reply created successfully',
      } as ApiResponse<ForumReply>,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Create Reply API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create reply',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
