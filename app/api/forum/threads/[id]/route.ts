/**
 * 🔥 老王创建：Forum Thread Detail API
 * 用途：单个帖子的获取、更新、删除
 * 路由：/api/forum/threads/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ForumThread, ApiResponse } from '@/types/forum'
import { generateSlug } from '@/lib/forum-utils'
import { invalidateCache, CacheInvalidationEvent } from '@/lib/forum-cache'

/**
 * GET /api/forum/threads/[id]
 * 获取单个帖子详情（包含关联数据）
 *
 * Query参数：
 * - include_user_vote: boolean (是否包含当前用户的投票状态)
 * - include_subscription: boolean (是否包含当前用户的订阅状态)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams

    const includeUserVote = searchParams.get('include_user_vote') === 'true'
    const includeSubscription = searchParams.get('include_subscription') === 'true'

    // 获取当前用户（可选）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 获取帖子详情（先查询，再手动JOIN）
    // 🔥 老王修复：不能用外键JOIN，改为手动关联
    const { data: thread, error } = await supabase
      .from('forum_threads')
      .select(
        `
        *,
        category:forum_categories(*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Thread not found',
          } as ApiResponse,
          { status: 404 }
        )
      }
      throw error
    }

    // 🔥 老王添加：手动JOIN user_profiles
    if (thread) {
      const userIds = []
      if (thread.user_id) userIds.push(thread.user_id)
      if (thread.last_reply_user_id) userIds.push(thread.last_reply_user_id)

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds)

        const profileMap = new Map()
        profiles?.forEach((p: any) => profileMap.set(p.user_id, p))

        ;(thread as any).author = profileMap.get(thread.user_id) || null
        ;(thread as any).last_reply_user = profileMap.get(thread.last_reply_user_id) || null
      }
    }

    // 获取帖子的标签
    const { data: threadTags } = await supabase
      .from('forum_thread_tags')
      .select(
        `
        tag:forum_tags(*)
      `
      )
      .eq('thread_id', id)

    // 将标签附加到thread对象上
    const threadWithTags = {
      ...thread,
      tags: threadTags?.map((t: any) => t.tag) || [],
    }

    // 如果需要包含用户投票状态
    if (includeUserVote && user) {
      const { data: userVote } = await supabase
        .from('forum_votes')
        .select('vote_type')
        .eq('thread_id', id)
        .eq('user_id', user.id)
        .is('reply_id', null)
        .single()

      ;(threadWithTags as any).user_vote = userVote?.vote_type || null
    }

    // 如果需要包含订阅状态
    if (includeSubscription && user) {
      const { data: subscription } = await supabase
        .from('forum_thread_subscriptions')
        .select('id')
        .eq('thread_id', id)
        .eq('user_id', user.id)
        .single()

      ;(threadWithTags as any).is_subscribed = !!subscription
    }

    // 增加浏览量（无需等待）
    supabase
      .from('forum_threads')
      .update({ view_count: (thread as any).view_count + 1 })
      .eq('id', id)
      .then(() => {})

    return NextResponse.json({
      success: true,
      data: threadWithTags as ForumThread,
    } as ApiResponse<ForumThread>)
  } catch (error: any) {
    console.error('❌ Get Thread API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch thread',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/forum/threads/[id]
 * 更新帖子（作者或管理员/审核员）
 *
 * Body参数（所有可选）：
 * - title: string
 * - content: string
 * - status: 'open' | 'closed' | 'archived'
 * - tag_ids: string[]
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 获取帖子以检查权限
    const { data: thread } = await supabase
      .from('forum_threads')
      .select('user_id, slug')
      .eq('id', id)
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

    // 检查用户是否有权限更新（作者或管理员/审核员）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAuthor = thread.user_id === user.id
    const isAdminOrModerator = profile?.role === 'admin' || profile?.role === 'moderator'

    if (!isAuthor && !isAdminOrModerator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { title, content, status, tag_ids } = body

    // 验证title长度（如果提供）
    if (title !== undefined && (title.length < 3 || title.length > 200)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title must be between 3 and 200 characters',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证content长度（如果提供）
    if (content !== undefined && content.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content must be at least 10 characters',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 构建更新数据
    const updateData: Partial<ForumThread> = {}
    if (title !== undefined) {
      updateData.title = title
      // 如果标题变化，重新生成slug
      let newSlug = generateSlug(title)
      let slugSuffix = 1

      // 确保新slug唯一（排除当前帖子）
      while (true) {
        const { data: existingThread } = await supabase
          .from('forum_threads')
          .select('id')
          .eq('slug', newSlug)
          .neq('id', id)
          .single()

        if (!existingThread) break

        newSlug = `${generateSlug(title)}-${slugSuffix}`
        slugSuffix++
      }

      updateData.slug = newSlug
    }
    if (content !== undefined) updateData.content = content
    if (status !== undefined) updateData.status = status as any

    // 更新帖子
    const { data: updatedThread, error } = await supabase
      .from('forum_threads')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        category:forum_categories(*),
        author:user_profiles!forum_threads_user_id_fkey(user_id, display_name, avatar_url)
      `
      )
      .single()

    if (error) {
      console.error('❌ 更新帖子失败:', error)
      throw error
    }

    // 如果提供了标签，更新标签关联
    if (tag_ids !== undefined) {
      // 删除旧标签关联
      await supabase.from('forum_thread_tags').delete().eq('thread_id', id)

      // 添加新标签关联
      if (tag_ids.length > 0) {
        const tagRelations = tag_ids.map((tagId: string) => ({
          thread_id: id,
          tag_id: tagId,
        }))

        const { error: tagError } = await supabase.from('forum_thread_tags').insert(tagRelations)

        if (tagError) {
          console.error('⚠️ 更新标签失败:', tagError)
          // 不阻止更新，只记录错误
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedThread as ForumThread,
      message: 'Thread updated successfully',
    } as ApiResponse<ForumThread>)
  } catch (error: any) {
    console.error('❌ Update Thread API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update thread',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forum/threads/[id]
 * 删除帖子（软删除，作者或管理员/审核员）
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 获取帖子以检查权限
    const { data: thread } = await supabase
      .from('forum_threads')
      .select('user_id')
      .eq('id', id)
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

    // 检查用户是否有权限删除（作者或管理员/审核员）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAuthor = thread.user_id === user.id
    const isAdminOrModerator = profile?.role === 'admin' || profile?.role === 'moderator'

    if (!isAuthor && !isAdminOrModerator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 🔥 老王重构：软删除（设置deleted_at时间戳）
    // RLS策略已更新，允许作者和管理员UPDATE deleted_at
    const { error } = await supabase
      .from('forum_threads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('❌ 删除帖子失败:', error)
      throw error
    }

    // 🔥 老王添加：删除帖子后清除相关缓存
    await invalidateCache(CacheInvalidationEvent.THREAD_DELETED, {
      threadId: id,
    })

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Thread deleted successfully',
    } as ApiResponse)
  } catch (error: any) {
    console.error('❌ Delete Thread API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete thread',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
