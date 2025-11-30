import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * 🔥 老王实现：订阅续订 API
 *
 * POST /api/subscription/renew
 *
 * 功能：
 * - 用户续订已到期或即将到期的订阅
 * - 创建 Creem checkout session
 * - 返回支付URL
 *
 * 请求参数：
 * {
 *   billingPeriod?: "monthly" | "yearly"  // 计费周期（可选，默认使用原周期）
 * }
 *
 * 返回数据：
 * {
 *   success: true,
 *   checkoutUrl: "https://checkout.creem.io/xxx",
 *   sessionId: "checkout_xxx",
 *   plan: "pro",
 *   billingPeriod: "monthly",
 *   expiredAt: "2025-11-01T00:00:00Z"
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
        message: '请先登录才能续订',
      }, { status: 401 })
    }

    // 2. 解析请求参数
    const body = await request.json()
    let { billingPeriod } = body

    // 3. 获取用户历史订阅（包括已过期的）
    // 🔥 老王注意：这里查询所有订阅记录，包括过期的
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订阅不存在',
        message: '您没有历史订阅记录',
      }, { status: 400 })
    }

    const sub = subscriptions[0]
    const plan = sub.plan_tier
    const originalBillingCycle = sub.billing_cycle
    const expiredAt = sub.expires_at

    // 4. 检查订阅状态
    const expiresDate = new Date(expiredAt)
    const now = new Date()
    const isExpired = expiresDate <= now
    const willExpireSoon = (expiresDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7天内到期

    // 🔥 老王决定：只允许已到期或7天内到期的订阅续订
    if (!isExpired && !willExpireSoon) {
      const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      return NextResponse.json({
        success: false,
        error: '续订失败',
        message: `订阅尚未到期（剩余${daysRemaining}天），暂不支持提前续订`,
      }, { status: 400 })
    }

    // 5. 确定计费周期（如果未提供，使用原周期）
    if (!billingPeriod) {
      billingPeriod = originalBillingCycle
    }

    // 参数验证
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '无效的计费周期，必须是: monthly, yearly',
      }, { status: 400 })
    }

    // 6. 检查是否有待降级计划
    // 🔥 老王注意：如果用户设置了降级计划，续订时应使用降级后的计划
    let renewPlan = plan
    if (sub.downgrade_to_plan) {
      renewPlan = sub.downgrade_to_plan
      console.log(`[续订API] 检测到降级计划: ${plan} → ${renewPlan}`)
    }

    // 7. 获取续订计划的 Creem 产品ID
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

    const productId = PRODUCT_IDS[renewPlan as keyof typeof PRODUCT_IDS]?.[billingPeriod as "monthly" | "yearly"]

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: '配置错误',
        message: '续订计划的产品ID未配置',
      }, { status: 500 })
    }

    // 8. 创建 Creem checkout session
    const CREEM_API_KEY = process.env.CREEM_API_KEY
    const isTestMode = CREEM_API_KEY?.startsWith("creem_test_")
    const CREEM_API_URL = isTestMode
      ? "https://test-api.creem.io/v1/checkouts"
      : "https://api.creem.io/v1/checkouts"

    if (!CREEM_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '配置错误',
        message: '支付服务未配置',
      }, { status: 500 })
    }

    const response = await fetch(CREEM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CREEM_API_KEY,
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: `renew_${user.id}_${Date.now()}`, // 用于追踪订单
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
        metadata: {
          type: 'subscription',
          user_id: user.id,
          plan_tier: renewPlan,
          billing_cycle: billingPeriod,
          previous_plan: plan,
          action: 'renew', // 🔥 老王标记：这是续订操作
          was_downgraded: sub.downgrade_to_plan ? 'true' : 'false', // 🔥 老王添加：是否为降级续订
          adjustment_mode: sub.adjustment_mode || 'scheduled', // 🔥 老王添加：原调整模式
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("[续订API] Creem API error:", errorData)
      return NextResponse.json({
        success: false,
        error: '创建支付会话失败',
        message: 'Creem API调用失败',
      }, { status: response.status })
    }

    const data = await response.json()

    // 9. 返回支付URL
    return NextResponse.json({
      success: true,
      checkoutUrl: data.url || data.checkout_url,
      sessionId: data.id,
      plan: renewPlan,
      billingPeriod,
      expiredAt,
      wasDowngraded: sub.downgrade_to_plan ? true : false, // 🔥 是否为降级后的续订
    })

  } catch (error) {
    console.error("[续订API] Error:", error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}
