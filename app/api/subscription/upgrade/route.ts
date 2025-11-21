import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * 🔥 老王实现：订阅升级 API（支持两种调整模式）
 *
 * POST /api/subscription/upgrade
 *
 * 功能：
 * - 用户升级到更高级别的订阅计划
 * - 支持即时调整和后续调整两种模式
 * - 创建 Creem checkout session
 * - 返回支付URL
 *
 * 请求参数：
 * {
 *   targetPlan: "basic" | "pro" | "max",           // 目标计划
 *   billingPeriod: "monthly" | "yearly",           // 计费周期
 *   adjustmentMode?: "immediate" | "scheduled",    // 🔥 调整模式（可选，默认immediate）
 *   remainingDays?: number                         // 🔥 剩余天数（可选）
 * }
 *
 * 调整模式说明：
 * - immediate: 立即切换到新套餐，当前套餐剩余时间在新套餐结束后继续
 * - scheduled: 当前套餐结束后再切换（默认行为）
 *
 * 返回数据：
 * {
 *   success: true,
 *   checkoutUrl: "https://checkout.creem.io/xxx",
 *   sessionId: "checkout_xxx",
 *   currentPlan: "basic",
 *   targetPlan: "pro",
 *   billingPeriod: "monthly",
 *   adjustmentMode: "immediate",
 *   remainingDays: 15
 * }
 */

// 计划层级（用于验证升级）
const PLAN_HIERARCHY = {
  basic: 1,
  pro: 2,
  max: 3,
}

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录状态
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '请先登录才能升级订阅',
      }, { status: 401 })
    }

    // 2. 解析请求参数
    const body = await request.json()
    const { targetPlan, billingPeriod, adjustmentMode = 'immediate', remainingDays = 0 } = body

    // 3. 参数验证
    if (!targetPlan || !billingPeriod) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '缺少必需参数: targetPlan 或 billingPeriod',
      }, { status: 400 })
    }

    if (!['basic', 'pro', 'max'].includes(targetPlan)) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '无效的目标计划，必须是: basic, pro, max',
      }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '无效的计费周期，必须是: monthly, yearly',
      }, { status: 400 })
    }

    // 🔥 老王添加：验证调整模式参数
    if (adjustmentMode && !['immediate', 'scheduled'].includes(adjustmentMode)) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '无效的调整模式，必须是: immediate, scheduled',
      }, { status: 400 })
    }

    // 4. 获取用户当前订阅状态
    const { data: subscription, error: subError } = await supabase
      .rpc('get_user_active_subscription', { p_user_id: user.id })

    // 🔥 老王注意：这里需要检查subscription是否为数组且有数据
    let currentPlan: string | null = null
    let currentBillingCycle: string | null = null

    if (!subError && subscription && Array.isArray(subscription) && subscription.length > 0) {
      const sub = subscription[0]
      currentPlan = sub.plan_tier
      currentBillingCycle = sub.billing_cycle

      // 🔥 老王添加：检查订阅是否被冻结
      if (sub.status === 'frozen' && sub.frozen_until) {
        const frozenUntil = new Date(sub.frozen_until)
        const now = new Date()
        if (frozenUntil > now) {
          // 订阅仍在冻结期内
          return NextResponse.json({
            success: false,
            error: '订阅已冻结',
            message: `您的订阅已被冻结至 ${frozenUntil.toLocaleDateString('zh-CN')}，暂时无法升级。冻结期间积分将被保留，解冻后自动恢复。`,
            frozenUntil: sub.frozen_until,
          }, { status: 403 })
        }
      }

      // 检查订阅是否过期
      const expiresAt = new Date(sub.expires_at)
      const now = new Date()
      const isExpired = expiresAt <= now

      if (isExpired) {
        currentPlan = null // 已过期视为无订阅
      }
    }

    // 5. 验证升级有效性
    if (!currentPlan) {
      // 🔥 无当前订阅，可以"升级"到任何计划（实际是新购买）
      console.log(`[升级API] 用户${user.id}没有活跃订阅，将创建新订阅: ${targetPlan}`)
    } else {
      // 有当前订阅，验证是否为升级
      const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY]
      const targetLevel = PLAN_HIERARCHY[targetPlan as keyof typeof PLAN_HIERARCHY]

      if (targetLevel <= currentLevel) {
        return NextResponse.json({
          success: false,
          error: '升级失败',
          message: `当前计划(${currentPlan})不低于目标计划(${targetPlan})，请使用降级或续订功能`,
        }, { status: 400 })
      }
    }

    // 6. 获取目标计划的 Creem 产品ID
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

    const productId = PRODUCT_IDS[targetPlan as keyof typeof PRODUCT_IDS]?.[billingPeriod as "monthly" | "yearly"]

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: '配置错误',
        message: '目标计划的产品ID未配置',
      }, { status: 500 })
    }

    // 7. 创建 Creem checkout session
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
        request_id: `upgrade_${user.id}_${Date.now()}`, // 用于追踪订单
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
        metadata: {
          type: 'subscription',
          user_id: user.id,
          plan_tier: targetPlan,
          billing_cycle: billingPeriod,
          previous_plan: currentPlan || 'none',
          action: 'upgrade', // 🔥 老王标记：这是升级操作
          adjustment_mode: adjustmentMode, // 🔥 老王添加：调整模式（immediate/scheduled）
          remaining_days: remainingDays.toString(), // 🔥 老王添加：剩余天数（需要转为字符串）
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("[升级API] Creem API error:", errorData)
      return NextResponse.json({
        success: false,
        error: '创建支付会话失败',
        message: 'Creem API调用失败',
      }, { status: response.status })
    }

    const data = await response.json()

    // 8. 返回支付URL
    return NextResponse.json({
      success: true,
      checkoutUrl: data.url || data.checkout_url,
      sessionId: data.id,
      currentPlan: currentPlan || 'none',
      targetPlan,
      billingPeriod,
      adjustmentMode, // 🔥 老王添加：返回调整模式
      remainingDays, // 🔥 老王添加：返回剩余天数
    })

  } catch (error) {
    console.error("[升级API] Error:", error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}
