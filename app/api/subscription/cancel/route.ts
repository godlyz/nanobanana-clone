import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * 🔥 老王实现：订阅取消 API
 *
 * POST /api/subscription/cancel
 *
 * 功能：
 * - 用户取消当前订阅
 * - 取消在当前周期结束后生效
 * - 记录取消原因和用户反馈
 *
 * 请求参数：
 * {
 *   reason?: string,       // 取消原因（可选）
 *   feedback?: string      // 用户反馈（可选）
 * }
 *
 * 返回数据：
 * {
 *   success: true,
 *   currentPlan: "pro",
 *   cancelledAt: "2025-11-09T00:00:00Z",
 *   currentPeriodEnd: "2025-12-09T00:00:00Z",
 *   message: "订阅将在当前周期结束后取消"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录状态
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '请先登录才能取消订阅',
      }, { status: 401 })
    }

    // 2. 解析请求参数
    const body = await request.json()
    const { reason, feedback } = body

    // 3. 获取用户当前订阅状态
    const { data: subscription, error: subError } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: user.id })

    if (subError || !subscription || !Array.isArray(subscription) || subscription.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订阅不存在',
        message: '您当前没有活跃的订阅',
      }, { status: 400 })
    }

    const sub = subscription[0]
    const currentPlan = sub.plan_tier
    const currentPeriodEnd = sub.expires_at

    // 检查订阅是否已过期
    const expiresAt = new Date(currentPeriodEnd)
    const now = new Date()
    const isExpired = expiresAt <= now

    if (isExpired) {
      return NextResponse.json({
        success: false,
        error: '订阅已过期',
        message: '您的订阅已过期，无需取消',
      }, { status: 400 })
    }

    // 检查订阅是否已被取消
    if (sub.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: '订阅已取消',
        message: '您的订阅已经被取消',
      }, { status: 400 })
    }

    // 4. 更新订阅状态（标记为待取消）
    // 🔥 老王注意：这里不是立即取消，而是标记为pending_cancel
    // 实际取消会在当前周期结束后由定时任务或Webhook处理
    const cancelledAt = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'pending_cancel', // 🔥 待取消状态
        cancel_reason: reason || null,
        cancel_feedback: feedback || null,
        cancel_requested_at: cancelledAt,
        updated_at: cancelledAt,
        // 🔥 老王修复：取消订阅时清除降级计划和调整模式
        downgrade_to_plan: null,
        downgrade_to_billing_cycle: null,
        adjustment_mode: null,
        remaining_days: null,
      })
      .eq('id', sub.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[取消API] 数据库更新失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '取消失败',
        message: '数据库更新失败，请稍后重试',
      }, { status: 500 })
    }

    // 5. 🔥 老王TODO：如果Creem支持，这里应该调用Creem API取消订阅自动续订
    // const CREEM_API_KEY = process.env.CREEM_API_KEY
    // const CREEM_API_URL = "https://api.creem.io/v1/subscriptions/{subscription_id}/cancel"
    // await fetch(CREEM_API_URL, {
    //   method: "POST",
    //   headers: {
    //     "x-api-key": CREEM_API_KEY,
    //   },
    // })

    // 6. 记录取消日志（可选）
    console.log(`[取消API] 用户${user.id}取消订阅: ${currentPlan}`)
    console.log(`[取消API] 取消原因: ${reason || '未提供'}`)
    console.log(`[取消API] 用户反馈: ${feedback || '未提供'}`)

    // 7. 返回取消确认信息
    return NextResponse.json({
      success: true,
      currentPlan,
      cancelledAt,
      currentPeriodEnd,
      effectiveDate: currentPeriodEnd, // 取消在当前周期结束时生效
      message: '订阅已标记为待取消，将在当前周期结束后生效',
      note: '在此期间您可以继续使用订阅服务',
    })

  } catch (error) {
    console.error("[取消API] Error:", error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}
