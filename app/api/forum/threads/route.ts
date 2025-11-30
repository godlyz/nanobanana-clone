/**
 * 🔥 老王创建：Forum Threads API
 * 用途：论坛帖子的列表查���和创建
 * 路由：/api/forum/threads
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ForumThread,
  GetThreadsParams,
  CreateThreadRequest,
  PaginatedResponse,
  ApiResponse,
} from '@/types/forum'
import { generateSlug, calculateHotScore, calculateTopScore } from '@/lib/forum-utils'
import { invalidateCache, CacheInvalidationEvent } from '@/lib/forum-cache'

/**
 * GET /api/forum/threads
 * 获取帖子列表（支持分页、筛选、排序、搜索）
 *
 * Query参数：
 * - page: number (页码，默认1)
 * - limit: number (每页数量，默认20，最大100)
 * - category_id: string (按分类筛选)
 * - tag_slug: string (按标签筛选)
 * - search: string (全文搜索)
 * - sort: 'latest' | 'hot' | 'top' | 'unanswered' (排序方式，默认latest)
 * - status: 'open' | 'closed' | 'archived' (按状态筛选)
 * - is_pinned: boolean (是否只显示置顶)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // 解析分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // 解析筛选参数
    const categoryId = searchParams.get('category_id')
    const tagSlug = searchParams.get('tag_slug')
    const searchQuery = searchParams.get('search')
    const sort = (searchParams.get('sort') || 'latest') as 'latest' | 'hot' | 'top' | 'unanswered'
    const status = searchParams.get('status') as 'open' | 'closed' | 'archived' | null
    const isPinned = searchParams.get('is_pinned') === 'true'

    // 构建查询（先查帖子，再手动JOIN user_profiles）
    // 🔥 老王修复：Supabase不能跨表JOIN，改为先查询再手动关联
    let query = supabase
      .from('forum_threads')
      .select(
        `
        *,
        category:forum_categories(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)

    // 应用筛选条件
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (isPinned) {
      query = query.eq('is_pinned', true)
    }

    // ���文搜索
    if (searchQuery) {
      query = query.textSearch('search_vector', searchQuery)
    }

    // 按标签筛选（需要子查询）
    if (tagSlug) {
      const { data: tag } = await supabase
        .from('forum_tags')
        .select('id')
        .eq('slug', tagSlug)
        .single()

      if (tag) {
        const { data: threadIds } = await supabase
          .from('forum_thread_tags')
          .select('thread_id')
          .eq('tag_id', tag.id)

        if (threadIds && threadIds.length > 0) {
          query = query.in(
            'id',
            threadIds.map((t) => t.thread_id)
          )
        } else {
          // 标签下没有帖子
          return NextResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false,
              },
            } as PaginatedResponse<ForumThread>,
          } as ApiResponse<PaginatedResponse<ForumThread>>)
        }
      }
    }

    // 应用排序
    switch (sort) {
      case 'latest':
        // 置顶帖子优先，精华帖次之，然后按创建时间倒序
        query = query
          .order('is_pinned', { ascending: false })
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
        break
      case 'hot':
        // 置顶帖子优先，精华帖次之，然后按最新回复时间倒序
        query = query
          .order('is_pinned', { ascending: false })
          .order('is_featured', { ascending: false })
          .order('last_reply_at', { ascending: false, nullsFirst: false })
        break
      case 'top':
        // 置顶帖子优先，精华帖次之，然后按upvote数倒序
        query = query
          .order('is_pinned', { ascending: false })
          .order('is_featured', { ascending: false })
          .order('upvote_count', { ascending: false })
        break
      case 'unanswered':
        // 只显示没有回复的帖子（置顶优先）
        query = query
          .eq('reply_count', 0)
          .order('is_pinned', { ascending: false })
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
        break
    }

    // 应用分页
    const { data: threads, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ 获取帖子列表失败:', error)
      throw error
    }

    // 🔥 老王添加：手动JOIN user_profiles补充作者信息
    if (threads && threads.length > 0) {
      // 收集所有需要查询的user_id
      const userIds = new Set<string>()
      threads.forEach((thread: any) => {
        if (thread.user_id) userIds.add(thread.user_id)
        if (thread.last_reply_user_id) userIds.add(thread.last_reply_user_id)
      })

      // 批量查询user_profiles
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', Array.from(userIds))

        // 构建user_id -> profile的映射
        const profileMap = new Map()
        profiles?.forEach((p: any) => profileMap.set(p.user_id, p))

        // 将profile信息附加到threads
        threads.forEach((thread: any) => {
          thread.author = profileMap.get(thread.user_id) || null
          thread.last_reply_user = profileMap.get(thread.last_reply_user_id) || null
        })
      }
    }

    // 计算分页信息
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        data: threads as ForumThread[],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      } as PaginatedResponse<ForumThread>,
    } as ApiResponse<PaginatedResponse<ForumThread>>)
  } catch (error: any) {
    console.error('❌ Threads API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch threads',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/forum/threads
 * 创建新帖子
 *
 * Body参数：
 * - category_id: string (必填)
 * - title: string (必填，3-200字符)
 * - content: string (必填，≥10字符)
 * - tag_ids: string[] (可选，标签ID数组)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // 解析请求体
    const body: CreateThreadRequest = await request.json()
    const { category_id, title, content, tag_ids } = body

    // 验证必填字段
    if (!category_id || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID, title, and content are required',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证标题长度
    if (title.length < 3 || title.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title must be between 3 and 200 characters',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证内容长度
    if (content.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content must be at least 10 characters',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证分类是否存在
    const { data: category } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('id', category_id)
      .eq('is_visible', true)
      .single()

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found or not visible',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 生成slug
    let slug = generateSlug(title)
    let slugSuffix = 1

    // 确保slug唯一
    while (true) {
      const { data: existingThread } = await supabase
        .from('forum_threads')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existingThread) break

      slug = `${generateSlug(title)}-${slugSuffix}`
      slugSuffix++
    }

    // 创建帖子
    const { data: thread, error } = await supabase
      .from('forum_threads')
      .insert({
        category_id,
        user_id: user.id,
        title,
        slug,
        content,
        status: 'open',
      })
      .select(
        `
        *,
        category:forum_categories(*),
        author:user_profiles!forum_threads_user_id_fkey(user_id, display_name, avatar_url)
      `
      )
      .single()

    if (error) {
      console.error('❌ 创建帖子失败:', error)
      throw error
    }

    // 如果提供了标签，添加标签关联
    if (tag_ids && tag_ids.length > 0) {
      const tagRelations = tag_ids.map((tagId) => ({
        thread_id: thread.id,
        tag_id: tagId,
      }))

      const { error: tagError } = await supabase.from('forum_thread_tags').insert(tagRelations)

      if (tagError) {
        console.error('⚠�� 添加标签失败:', tagError)
        // 不阻止帖子创建，只记录错误
      }
    }

    // 🔥 老王添加：新帖发布后清除相关缓存
    await invalidateCache(CacheInvalidationEvent.THREAD_CREATED, {
      categoryId: category_id,
      threadId: thread.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: thread as ForumThread,
        message: 'Thread created successfully',
      } as ApiResponse<ForumThread>,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Create Thread API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create thread',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
