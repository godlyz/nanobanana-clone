import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 🔥 老王修复：未登录时返回401，符合项目统一认证规范
    if (!user || authError) {
      return NextResponse.json({
        error: 'Not authenticated',
        requiresAuth: true
      }, { status: 401 })
    }

    const { data: subscription, error } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: user.id })

    // 🔥 老王修复：RPC错误或无订阅时，返回符合前端期望的格式
    if (error || !subscription || !Array.isArray(subscription) || subscription.length === 0) {
      return NextResponse.json({
        isLoggedIn: true,
        isActive: false,                // 🔥 测试期望的顶层字段
        hasValidSubscription: false,    // 🔥 测试期望的顶层字段
        user: {
          id: user.id,
          email: user.email || '',
          userId: user.id,               // 🔥 测试期望的userId字段
        },
        subscription: null
      })
    }

    const sub = subscription[0]

    // 🔥 老王调试：强制输出到stderr，确保能看到完整数据
    console.error("=".repeat(80))
    console.error("🔍 [订阅API] Supabase RPC 返回的原始数据:")
    console.error(JSON.stringify(sub, null, 2))
    console.error("🔍 [订阅API] 所有字段名:", Object.keys(sub))
    console.error("=".repeat(80))

    // 🔥 老王修复：检查必要字段是否存在（Supabase返回的是started_at，不是created_at！）
    if (!sub.expires_at || !sub.started_at) {
      console.error("❌ [订阅API] 缺少必要日期字段:", JSON.stringify({
        has_expires_at: !!sub.expires_at,
        has_started_at: !!sub.started_at,
        available_fields: Object.keys(sub),
        raw_data: sub
      }, null, 2))
      // 如果缺少日期字段，返回 null 订阅
      return NextResponse.json({
        isLoggedIn: true,
        isActive: false,                // 🔥 测试期望的顶层字段
        hasValidSubscription: false,    // 🔥 测试期望的顶层字段
        user: {
          id: user.id,
          email: user.email || '',
          userId: user.id,               // 🔥 测试期望的userId字段
        },
        subscription: null
      })
    }

    // 检查订阅是否过期
    const expiresAt = new Date(sub.expires_at)
    const now = new Date()
    const isExpired = expiresAt <= now
    const isActive = !isExpired && sub.status === 'active'

    // 🔥 老王修复：计算剩余天数（优先使用original_plan_expires_at，否则用expires_at）
    let remainingDays: number | null = null
    if (sub.original_plan_expires_at) {
      // immediate降级模式：计算原套餐剩余时间
      const originalExpiresAt = new Date(sub.original_plan_expires_at)
      const diffInMs = originalExpiresAt.getTime() - now.getTime()
      remainingDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) // 转换为天数，向上取整
    } else if (sub.expires_at) {
      // 正常订阅或scheduled降级：计算当前订阅剩余时间
      const diffInMs = expiresAt.getTime() - now.getTime()
      remainingDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) // 转换为天数，向上取整
    }

    // 🔥 老王修复：返回符合前端期望的格式（isLoggedIn, user, subscription）
    const finalResponse = {
      isLoggedIn: true,
      isActive: isActive,                  // 🔥 测试期望的顶层字段
      hasValidSubscription: isActive,      // 🔥 测试期望的顶层字段（等同于isActive）
      user: {
        id: user.id,
        email: user.email || '',
        userId: user.id,                   // 🔥 测试期望的userId字段
      },
      subscription: {
        id: sub.id,                        // 🔥 订阅ID
        userId: user.id,                   // 🔥 测试期望的userId字段
        plan: sub.plan_tier,               // 🔥 前端期望 plan (不是 plan_id)
        status: sub.status,
        created_at: sub.started_at,        // 🔥 创建时间用started_at字段（前端需要转换为startDate）
        expires_at: sub.expires_at,        // 🔥 过期时间（前端需要转换为endDate）
        interval: sub.billing_cycle,       // 🔥 前端期望 interval (不是 billing_period)
        isExpired: isExpired,              // 🔥 测试期望的过期状态字段
        isActive: isActive,                // 🔥 测试期望的激活状态字段
        // 🔥 老王添加：降级调整模式字段（使用时间戳版本）
        downgrade_to_plan: sub.downgrade_to_plan || null,
        downgrade_to_billing_cycle: sub.downgrade_to_billing_cycle || null,
        adjustment_mode: sub.adjustment_mode || null,
        original_plan_expires_at: sub.original_plan_expires_at || null, // 🔥 时间戳
        remaining_days: remainingDays, // 🔥 实时计算的剩余天数
      }
    }

    // 🔥 老王调试：打印最终返回给前端的数据
    console.error("✅ [订阅API] 最终返回数据:", JSON.stringify(finalResponse, null, 2))

    return NextResponse.json(finalResponse)

  } catch (error) {
    console.error("Subscription status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
