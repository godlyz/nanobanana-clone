import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 🔥 老王修复：把环境变量读取移到函数内部，支持测试时的 vi.stubEnv() mock
// 原来在模块加载时读取，导致测试时 stubEnv 还没生效就已经读取完了

export async function POST(request: NextRequest) {
  try {
    // 🔥 在函数内部读取环境变量，支持测试时动态mock
    const CREEM_API_KEY = process.env.CREEM_API_KEY
    const isTestMode = CREEM_API_KEY?.startsWith("creem_test_")
    const CREEM_API_URL = isTestMode
      ? "https://test-api.creem.io/v1/checkouts"
      : "https://api.creem.io/v1/checkouts"

    // 产品 ID 映射（每次请求时动态读取）
    const PRODUCT_IDS = {
      basic: {
        monthly: process.env.CREEM_BASIC_MONTHLY_PRODUCT_ID || "",
        yearly: process.env.CREEM_BASIC_YEARLY_PRODUCT_ID || "",
      },
      pro: {
        monthly: process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || "",
        yearly: process.env.CREEM_PRO_YEARLY_PRODUCT_ID || "",
      },
      max: {
        monthly: process.env.CREEM_MAX_MONTHLY_PRODUCT_ID || "",
        yearly: process.env.CREEM_MAX_YEARLY_PRODUCT_ID || "",
      },
    }

    const { planId, billingPeriod, adjustmentMode } = await request.json()

    // 验证参数
    if (!planId || !billingPeriod) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // 🔥 老王添加：验证 adjustmentMode 参数
    if (adjustmentMode && !['immediate', 'scheduled'].includes(adjustmentMode)) {
      return NextResponse.json({ error: "Invalid adjustment mode" }, { status: 400 })
    }

    if (!CREEM_API_KEY) {
      console.error("CREEM_API_KEY is not configured")
      return NextResponse.json({ error: "Payment service not configured" }, { status: 500 })
    }

    // 获取对应的产品 ID
    const productId =
      PRODUCT_IDS[planId as keyof typeof PRODUCT_IDS]?.[billingPeriod as "monthly" | "yearly"]

    if (!productId) {
      return NextResponse.json({ error: "Invalid plan or billing period" }, { status: 400 })
    }

    // 🔒 老王修复：获取真实用户信息
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '请先登录才能购买订阅',
      }, { status: 401 })
    }

    const userId = user.id // ✅ 使用真实用户 ID

    // 🔥 老王添加：查询用户当前订阅状态，判断 action（upgrade/downgrade/renew）
    let action = 'purchase' // 默认是首次购买
    let remainingDays = 0
    let currentSubscriptionId: string | null = null

    const { data: currentSubscription } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: userId })

    if (currentSubscription && Array.isArray(currentSubscription) && currentSubscription.length > 0) {
      const sub = currentSubscription[0]
      const currentPlan = sub.plan_tier
      const currentBillingCycle = sub.billing_cycle
      currentSubscriptionId = sub.id

      // 套餐层级
      const PLAN_HIERARCHY = { basic: 1, pro: 2, max: 3 }
      const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] || 0
      const targetLevel = PLAN_HIERARCHY[planId as keyof typeof PLAN_HIERARCHY] || 0

      // 判断 action
      if (currentPlan === planId && currentBillingCycle === billingPeriod) {
        action = 'renew' // 原套餐续费
      } else if (targetLevel > currentLevel) {
        action = 'upgrade' // 升级续费
      } else if (targetLevel < currentLevel) {
        action = 'downgrade' // 降级续费
      } else {
        action = 'change' // 改变计费周期（如 Basic月付 → Basic年付）
      }

      // 🔥 如果是 immediate 模式，计算原套餐剩余天数
      if (adjustmentMode === 'immediate') {
        const expiresAt = new Date(sub.expires_at)
        const now = new Date()
        remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      }

      console.log(`📋 订阅续费类型: ${action}, adjustmentMode=${adjustmentMode || 'null'}, remainingDays=${remainingDays}`)
    }

    // 创建 Creem checkout session
    const response = await fetch(CREEM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CREEM_API_KEY,
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: `${userId}_${Date.now()}`, // 用于追踪订单
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
        metadata: {
          user_id: userId,
          plan_tier: planId,
          billing_cycle: billingPeriod,
          action: action, // upgrade / downgrade / renew / purchase / change
          adjustment_mode: adjustmentMode || null,
          remaining_days: remainingDays > 0 ? remainingDays.toString() : null,
          current_subscription_id: currentSubscriptionId,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Creem API error:", errorData)
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 返回 checkout URL
    return NextResponse.json({
      checkoutUrl: data.url || data.checkout_url,
      sessionId: data.id,
    })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
