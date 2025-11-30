import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * PATCH /api/forum/reports/[id] - 审核举报（管理员）
 *
 * 请求体：
 * {
 *   status: 'approved' | 'rejected',
 *   action_taken?: 'none' | 'warning' | 'content_removed' | 'user_banned',
 *   review_note?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔥 老王修复：Next.js 16中params是Promise，必须await
    const { id } = await params

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
        { error: "无权限操作" },
        { status: 403 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { status, action_taken, review_note } = body

    // 验证 status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "无效的 status，必须是 'approved' 或 'rejected'" },
        { status: 400 }
      )
    }

    // 验证 action_taken（如果提供）
    const validActions = ['none', 'warning', 'content_removed', 'user_banned']
    if (action_taken && !validActions.includes(action_taken)) {
      return NextResponse.json(
        { error: `无效的 action_taken，必须是：${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // 获取举报记录
    const { data: report, error: fetchError } = await supabase
      .from('forum_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !report) {
      return NextResponse.json(
        { error: "举报记录不存在" },
        { status: 404 }
      )
    }

    // 检查举报是否已被处理
    if (report.status !== 'pending') {
      return NextResponse.json(
        { error: "该举报已被处理" },
        { status: 409 }
      )
    }

    // 更新举报记录
    const { data: updatedReport, error: updateError } = await supabase
      .from('forum_reports')
      .update({
        status,
        action_taken: action_taken || 'none',
        review_note: review_note || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update report error:', updateError)
      return NextResponse.json(
        { error: "更新失败" },
        { status: 500 }
      )
    }

    // 如果审核通过且需要删除内容
    if (status === 'approved' && action_taken === 'content_removed') {
      if (report.target_type === 'thread') {
        // 删除帖子
        await supabase
          .from('forum_threads')
          .delete()
          .eq('id', report.target_id)
      } else if (report.target_type === 'reply') {
        // 删除回复
        await supabase
          .from('forum_replies')
          .delete()
          .eq('id', report.target_id)
      }
    }

    // TODO: 如果需要封禁用户，这里添加封禁逻辑

    return NextResponse.json({
      message: "审核完成",
      report: updatedReport
    })
  } catch (error) {
    console.error('Review report error:', error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/forum/reports/[id] - 获取举报详情（管理员或举报人）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔥 老王修复：Next.js 16中params是Promise，必须await
    const { id } = await params

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

    // 获取举报记录
    const { data: report, error: fetchError } = await supabase
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
      `)
      .eq('id', id)
      .single()

    if (fetchError || !report) {
      return NextResponse.json(
        { error: "举报记录不存在" },
        { status: 404 }
      )
    }

    // 检查权限：管理员或举报人本人可以查看
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile && ['admin', 'moderator'].includes(profile.role)
    const isReporter = report.reporter_id === user.id

    if (!isAdmin && !isReporter) {
      return NextResponse.json(
        { error: "无权限查看" },
        { status: 403 }
      )
    }

    // 获取被举报的内容（如果还存在）
    let targetContent = null
    if (report.target_type === 'thread') {
      const { data: thread } = await supabase
        .from('forum_threads')
        .select('id, title, content, user_id')
        .eq('id', report.target_id)
        .single()
      targetContent = thread
    } else if (report.target_type === 'reply') {
      const { data: reply } = await supabase
        .from('forum_replies')
        .select('id, content, user_id, thread_id')
        .eq('id', report.target_id)
        .single()
      targetContent = reply
    }

    return NextResponse.json({
      report,
      target_content: targetContent
    })
  } catch (error) {
    console.error('Get report error:', error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
