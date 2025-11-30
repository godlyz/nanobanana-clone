/**
 * 🔥 老王创建：Forum Votes API
 * 用途：帖子和回复的投票（upvote/downvote）功能
 * 路由：/api/forum/votes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/forum'

/**
 * POST /api/forum/votes
 * 投票或取消投票
 *
 * Body参数：
 * - thread_id: string (可选，与reply_id二选一)
 * - reply_id: string (可选，与thread_id二选一)
 * - vote_type: 'upvote' | 'downvote' (必填)
 *
 * 逻辑：
 * 1. 如果用户已投相同类型的票，则取消投票（删除记录）
 * 2. 如果用户已投不同类型的票，则切换投票类型（更新记录）
 * 3. 如果用户未投票，则创建新投票（插入记录）
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
    const body = await request.json()
    const { thread_id, reply_id, vote_type } = body

    // 验证参数：thread_id和reply_id二选一
    if (!thread_id && !reply_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either thread_id or reply_id is required',
        } as ApiResponse,
        { status: 400 }
      )
    }

    if (thread_id && reply_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot vote on both thread and reply simultaneously',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证vote_type
    if (!vote_type || (vote_type !== 'upvote' && vote_type !== 'downvote')) {
      return NextResponse.json(
        {
          success: false,
          error: 'vote_type must be either "upvote" or "downvote"',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 如果是给帖子投票，验证帖子是否存在
    if (thread_id) {
      const { data: thread } = await supabase
        .from('forum_threads')
        .select('id')
        .eq('id', thread_id)
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
    }

    // 如果是给回复投票，验证回复是否存在
    if (reply_id) {
      const { data: reply } = await supabase
        .from('forum_replies')
        .select('id')
        .eq('id', reply_id)
        .is('deleted_at', null)
        .single()

      if (!reply) {
        return NextResponse.json(
          {
            success: false,
            error: 'Reply not found',
          } as ApiResponse,
          { status: 404 }
        )
      }
    }

    // 🔥 老王修复：使用正确的字段名（target_type和target_id）
    // forum_votes表结构是: target_type ('thread'/'reply') + target_id (UUID)
    const targetType = thread_id ? 'thread' : 'reply'
    const targetId = thread_id || reply_id

    // 检查用户是否已经投过票
    const { data: existingVote } = await supabase
      .from('forum_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId!)
      .single()

    // 情况1：用户已投相同类型的票 → 取消投票（删除记录）
    if (existingVote && existingVote.vote_type === vote_type) {
      const { error } = await supabase.from('forum_votes').delete().eq('id', existingVote.id)

      if (error) {
        console.error('❌ 取消投票失败:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        data: { action: 'removed', vote_type: null },
        message: 'Vote removed successfully',
      } as ApiResponse)
    }

    // 情况2：用户已投不同类型的票 → 切换投票类型（更新记录）
    if (existingVote && existingVote.vote_type !== vote_type) {
      const { error } = await supabase
        .from('forum_votes')
        .update({ vote_type })
        .eq('id', existingVote.id)

      if (error) {
        console.error('❌ 切换投票类型失败:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        data: { action: 'updated', vote_type },
        message: 'Vote updated successfully',
      } as ApiResponse)
    }

    // 情况3：用户未投票 → 创建新投票（插入记录）
    // 🔥 老王修复：使用正确的字段名（target_type和target_id）
    const { error } = await supabase.from('forum_votes').insert({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId!,
      vote_type,
    })

    if (error) {
      console.error('❌ 创建投票失败:', error)
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        data: { action: 'created', vote_type },
        message: 'Vote created successfully',
      } as ApiResponse,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Vote API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process vote',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
