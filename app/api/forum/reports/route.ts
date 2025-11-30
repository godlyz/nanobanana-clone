import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/forum/reports - 提交举报
 *
 * 功能：
 * - 用户举报帖子或回复
 * - 防止重复举报（同一用户对同一目标只能举报一次）
 * - 自动标记目标内容为"已举报"
 *
 * 请求体：
 * {
 *   target_type: 'thread' | 'reply',
 *   target_id: string,
 *   reason: 'spam' | 'harassment' | 'inappropriate' | 'illegal' | 'other',
 *   description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 检查认证
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "未登录，请先登录后再举报" },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { target_type, target_id, reason, description } = body

    // 验证必填字段
    if (!target_type || !target_id || !reason) {
      return NextResponse.json(
        { error: "缺少必填字段：target_type, target_id, reason" },
        { status: 400 }
      )
    }

    // 验证 target_type
    if (!['thread', 'reply'].includes(target_type)) {
      return NextResponse.json(
        { error: "无效的 target_type，必须是 'thread' 或 'reply'" },
        { status: 400 }
      )
    }

    // 验证 reason
    const validReasons = ['spam', 'harassment', 'inappropriate', 'illegal', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `无效的 reason，必须是：${validReasons.join(', ')}` },
        { status: 400 }
      )
    }

    // 检查目标是否存在
    if (target_type === 'thread') {
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .select('id')
        .eq('id', target_id)
        .single()

      if (threadError || !thread) {
        return NextResponse.json(
          { error: "帖子不存在" },
          { status: 404 }
        )
      }
    } else if (target_type === 'reply') {
      const { data: reply, error: replyError } = await supabase
        .from('forum_replies')
        .select('id')
        .eq('id', target_id)
        .single()

      if (replyError || !reply) {
        return NextResponse.json(
          { error: "回复不存在" },
          { status: 404 }
        )
      }
    }

    // 检查是否已举报过（pending 状态）
    const { data: existingReport } = await supabase
      .from('forum_reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .eq('status', 'pending')
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: "您已经举报过该内容，请等待审核" },
        { status: 409 }
      )
    }

    // 创建举报记录
    const { data: report, error: insertError } = await supabase
      .from('forum_reports')
      .insert({
        target_type,
        target_id,
        reporter_id: user.id,
        reason,
        description: description || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert report error:', insertError)
      return NextResponse.json(
        { error: "举报提交失败，请稍后重试" },
        { status: 500 }
      )
    }

    // 返回成功
    return NextResponse.json(
      {
        message: "举报已提交，感谢您的反馈",
        report
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Report submission error:', error)
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/forum/reports - 查询举报列表（仅管理员）
 *
 * 查询参数：
 * - status: pending | approved | rejected（可选）
 * - target_type: thread | reply（可选）
 * - page: 页码（默认 1）
 * - page_size: 每页数量（默认 20，最大 100）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 检查认证
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }

    // 检查用户是否为管理员或审核员
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json(
        { error: "无权限访问" },
        { status: 403 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const targetType = searchParams.get('target_type')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(
      parseInt(searchParams.get('page_size') || '20'),
      100
    )

    // 构建查询
    let query = supabase
      .from('forum_reports')
      .select(`
        *,
        reporter:reporter_id (
          id,
          email
        ),
        reviewer:reviewed_by (
          id,
          email
        )
      `, { count: 'exact' })

    // 添加筛选条件
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    if (targetType && ['thread', 'reply'].includes(targetType)) {
      query = query.eq('target_type', targetType)
    }

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 排序：pending 优先，然后按创建时间倒序
    query = query
      .order('status', { ascending: true })  // pending < approved < rejected
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: reports, error: queryError, count } = await query

    if (queryError) {
      console.error('Query reports error:', queryError)
      return NextResponse.json(
        { error: "查询失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: reports,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize)
      }
    })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
