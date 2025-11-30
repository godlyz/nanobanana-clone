/**
 * 🔥 老王创建：Forum Reply Detail API
 * 用途：单个回复的更新和删除
 * 路由：/api/forum/replies/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ForumReply, ApiResponse } from '@/types/forum'

/**
 * PUT /api/forum/replies/[id]
 * 更新回复（作者或管理员/审核员）
 *
 * Body参数：
 * - content: string (必填，≥1字符)
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

    // 获取回复以检查权限
    const { data: reply } = await supabase
      .from('forum_replies')
      .select('user_id, thread_id')
      .eq('id', id)
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

    // 检查用户是否有权限更新（作者或管理员/审核员）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAuthor = reply.user_id === user.id
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
    const { content } = body

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

    // 更新回复（先更新，再手动JOIN）
    // 🔥 老王修复：不能用外键JOIN，改为手动关联
    const { data: updatedReply, error } = await supabase
      .from('forum_replies')
      .update({ content })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('❌ 更新回复失败:', error)
      throw error
    }

    // 🔥 老王添加：手动JOIN user_profiles
    if (updatedReply) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', updatedReply.user_id)
        .single()

      ;(updatedReply as any).author = profile || null
    }

    return NextResponse.json({
      success: true,
      data: updatedReply as ForumReply,
      message: 'Reply updated successfully',
    } as ApiResponse<ForumReply>)
  } catch (error: any) {
    console.error('❌ Update Reply API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update reply',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forum/replies/[id]
 * 删除回复（软删除，作者或管理员/审核员）
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

    // 获取回复以检查权限
    const { data: reply } = await supabase
      .from('forum_replies')
      .select('user_id')
      .eq('id', id)
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

    // 检查用户是否有权限删除（作者或管理员/审核员）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAuthor = reply.user_id === user.id
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
      .from('forum_replies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('❌ 删除回复失败:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Reply deleted successfully',
    } as ApiResponse)
  } catch (error: any) {
    console.error('❌ Delete Reply API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete reply',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
