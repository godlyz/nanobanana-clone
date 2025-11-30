import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * 🔥 老王新增：获取用户所有订阅（包括冻结的）
 *
 * GET /api/subscription/all
 *
 * 返回格式：
 * {
 *   isLoggedIn: boolean,
 *   subscriptions: Array<{
 *     id: string,
 *     plan: string,
 *     billingCycle: string,
 *     status: string,  // 'active' | 'frozen' | 'expired'
 *     startDate: string,
 *     endDate: string,
 *     frozenUntil?: string,  // 冻结至时间（仅冻结订阅有）
 *     frozenCredits?: number,  // 冻结的积分数量
 *     remainingDays: number,
 *     remainingMonths: number
 *   }>
 * }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 🔥 老王修复：未登录时返回401
    if (!user || authError) {
      return NextResponse.json({
        error: 'Not authenticated',
        requiresAuth: true
      }, { status: 401 })
    }

    // 🔥 调用数据库函数获取所有订阅
    const { data: subscriptions, error } = await supabase
      .rpc('get_user_all_subscriptions', { p_user_id: user.id })

    if (error) {
      console.error('❌ 查询所有订阅失败:', error)
      return NextResponse.json({
        isLoggedIn: true,
        subscriptions: []
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        isLoggedIn: true,
        subscriptions: []
      })
    }

    // 🔥 转换为前端格式
    const formattedSubscriptions = subscriptions.map((sub: any) => ({
      id: sub.id,
      plan: sub.plan_tier,
      billingCycle: sub.billing_cycle,
      // 🔥 老王修复：状态判断优先级 - 冻结 > 未激活(cancelled) > 过期 > 激活
      status: sub.is_frozen
        ? 'frozen'
        : sub.status === 'cancelled'
          ? 'inactive'  // cancelled订阅显示为未激活
          : (new Date(sub.expires_at) < new Date() ? 'expired' : 'active'),
      startDate: sub.started_at,
      endDate: sub.expires_at,
      frozenUntil: sub.frozen_until || null,
      frozenCredits: sub.frozen_credits || 0,
      remainingDays: Math.max(0, sub.remaining_days || 0),
      remainingMonths: Math.max(0, sub.remaining_months || 0),
    }))

    // 🔥 老王调试：打印返回数据
    console.log("✅ [所有订阅API] 返回数据:", JSON.stringify(formattedSubscriptions, null, 2))

    return NextResponse.json({
      isLoggedIn: true,
      subscriptions: formattedSubscriptions
    })

  } catch (error) {
    console.error("❌ 获取所有订阅失败:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
