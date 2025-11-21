import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

/**
 * 🔥 老王实现：订阅降级 API（支持两种调整模式）
 *
 * POST /api/subscription/downgrade
 *
 * 功能：
 * - 用户降级到更低级别的订阅计划
 * - 支持即时调整和后续调整两种模式
 * - 在数据库中记录降级计划
 *
 * 请求参数：
 * {
 *   targetPlan: "basic" | "pro",                   // 目标计划（不能降级到Free）
 *   billingPeriod: "monthly" | "yearly",           // 计费周期
 *   adjustmentMode?: "immediate" | "scheduled",    // 🔥 调整模式（可选，默认scheduled）
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
 *   currentPlan: "pro",
 *   targetPlan: "basic",
 *   currentPeriodEnd: "2025-12-09T00:00:00Z",
 *   effectiveDate: "2025-12-09T00:00:00Z",
 *   adjustmentMode: "scheduled",
 *   remainingDays: 30,
 *   message: "降级将在当前订阅周期结束后生效"
 * }
 */

// 计划层级（用于验证降级）
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
        message: '请先登录才能降级订阅',
      }, { status: 401 })
    }

    // 2. 解析请求参数
    const body = await request.json()
    const { targetPlan, billingPeriod, adjustmentMode = 'scheduled' } = body

    // 🔥 老王调试：打印收到的参数
    console.error('='.repeat(80))
    console.error('🔍 [降级API] 收到的请求参数:')
    console.error(JSON.stringify({ targetPlan, billingPeriod, adjustmentMode }, null, 2))
    console.error('🔍 [降级API] 完整请求体:')
    console.error(JSON.stringify(body, null, 2))
    console.error('='.repeat(80))

    // 3. 参数验证
    if (!targetPlan || !billingPeriod) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '缺少必需参数: targetPlan 或 billingPeriod',
      }, { status: 400 })
    }

    if (!['basic', 'pro'].includes(targetPlan)) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '无效的目标计划，必须是: basic, pro（不支持降级到Free）',
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

    if (subError || !subscription || !Array.isArray(subscription) || subscription.length === 0) {
      return NextResponse.json({
        success: false,
        error: '订阅不存在',
        message: '您当前没有活跃的订阅',
      }, { status: 400 })
    }

    const sub = subscription[0]
    const currentPlan = sub.plan_tier
    const currentBillingCycle = sub.billing_cycle
    const currentPeriodEnd = sub.expires_at

    // 🔥 老王添加：检查订阅是否被冻结
    if (sub.status === 'frozen' && sub.frozen_until) {
      const frozenUntil = new Date(sub.frozen_until)
      const now = new Date()
      if (frozenUntil > now) {
        // 订阅仍在冻结期内
        return NextResponse.json({
          success: false,
          error: '订阅已冻结',
          message: `您的订阅已被冻结至 ${frozenUntil.toLocaleDateString('zh-CN')}，暂时无法降级。冻结期间积分将被保留，解冻后自动恢复。`,
          frozenUntil: sub.frozen_until,
        }, { status: 403 })
      }
    }

    // 检查订阅是否过期
    const expiresAt = new Date(currentPeriodEnd)
    const now = new Date()
    const isExpired = expiresAt <= now

    if (isExpired) {
      return NextResponse.json({
        success: false,
        error: '订阅已过期',
        message: '您的订阅已过期，请先续订',
      }, { status: 400 })
    }

    // 5. 验证降级有效性
    const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY]
    const targetLevel = PLAN_HIERARCHY[targetPlan as keyof typeof PLAN_HIERARCHY]

    if (targetLevel >= currentLevel) {
      return NextResponse.json({
        success: false,
        error: '降级失败',
        message: `当前计划(${currentPlan})不高于目标计划(${targetPlan})，请使用升级或续订功能`,
      }, { status: 400 })
    }

    // 6. 在数据库中记录降级计划
    // 🔥 老王重构：immediate模式下真正修改套餐，scheduled模式下只记录计划
    const updateData: {
      plan_tier?: string,
      billing_cycle?: string,
      monthly_credits?: number,
      downgrade_to_plan: string,
      downgrade_to_billing_cycle: string,
      adjustment_mode: string,
      original_plan_expires_at?: string,
      expires_at?: string,  // 🔥 老王修复：添加expires_at类型定义
      updated_at: string,
    } = {
      downgrade_to_plan: targetPlan,
      downgrade_to_billing_cycle: billingPeriod,
      adjustment_mode: adjustmentMode,
      updated_at: new Date().toISOString(),
    }

    // 🔥 老王添加：immediate模式下，真正修改套餐字段 + 记录原套餐信息
    if (adjustmentMode === 'immediate') {
      // 立即切换到新套餐
      updateData.plan_tier = targetPlan
      updateData.billing_cycle = billingPeriod

      // 设置新套餐的月度积分
      const PLAN_CREDITS = {
        basic: { monthly: 150, yearly: 150 },
        pro: { monthly: 800, yearly: 800 },
        max: { monthly: 2000, yearly: 2000 },
      }
      updateData.monthly_credits = PLAN_CREDITS[targetPlan as keyof typeof PLAN_CREDITS][billingPeriod === 'yearly' ? 'yearly' : 'monthly']

      // 记录原套餐的到期时间（用于后续解冻积分）
      updateData.original_plan_expires_at = currentPeriodEnd

      // 🔥 老王修复：更新新套餐的到期时间
      // immediate模式：新套餐周期 + 原套餐剩余时间
      // 月付：当前时间 + 30天 + 剩余天数
      // 年付：当前时间 + 365天 + 剩余天数
      const newExpiresAt = new Date()
      const remainingDays = Math.ceil((new Date(currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

      if (billingPeriod === 'yearly') {
        newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1)
        newExpiresAt.setDate(newExpiresAt.getDate() + remainingDays)
      } else {
        newExpiresAt.setDate(newExpiresAt.getDate() + 30 + remainingDays)
      }
      updateData.expires_at = newExpiresAt.toISOString()

      console.error('🔥 [降级API] immediate模式：立即修改套餐')
      console.error('原套餐:', currentPlan, currentBillingCycle)
      console.error('新套餐:', targetPlan, billingPeriod)
      console.error('新月度积分:', updateData.monthly_credits)
      console.error('原到期时间:', currentPeriodEnd)
      console.error('新到期时间:', updateData.expires_at)
    } else {
      console.error('🔥 [降级API] scheduled模式：只记录降级计划，不立即修改')
    }

    console.error('='.repeat(80))
    console.error('🔍 [降级API] 准备更新数据库')
    console.error('订阅ID:', sub.id)
    console.error('用户ID:', user.id)
    console.error('更新数据:', JSON.stringify(updateData, null, 2))
    console.error('='.repeat(80))

    // 🔥 老王修复：使用Service Role Client绕过RLS策略
    // RLS策略只允许service_role更新订阅记录，用户client无权限
    const supabaseService = createServiceClient()

    const { data: updateResult, error: updateError, count } = await supabaseService
      .from('user_subscriptions')
      .update(updateData)
      .eq('id', sub.id)
      .eq('user_id', user.id)
      .select()

    console.error('='.repeat(80))
    console.error('🔍 [降级API] 数据库更新结果:')
    console.error('错误:', updateError)
    console.error('影响行数:', updateResult?.length || 0)
    console.error('更新后数据:', JSON.stringify(updateResult, null, 2))
    console.error('='.repeat(80))

    if (updateError) {
      console.error('[降级API] 数据库更新失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '降级失败',
        message: '数据库更新失败，请稍后重试',
      }, { status: 500 })
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('[降级API] 警告: update没有影响任何记录！')
      return NextResponse.json({
        success: false,
        error: '降级失败',
        message: '未找到匹配的订阅记录',
      }, { status: 404 })
    }

    // 🔥 老王添加：immediate模式下，冻结原套餐的积分
    if (adjustmentMode === 'immediate') {
      try {
        // 🔥 老王修复：计算新套餐的结束时间（包含剩余天数）
        // 使用 updateData.expires_at（已包含新套餐周期 + 剩余天数）
        const newPlanEndDate = new Date(updateData.expires_at!)
        const actualRemainingDays = Math.ceil((new Date(currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

        console.error('🔍 [降级API] 冻结原套餐积分')
        console.error('订阅ID:', sub.id)
        console.error('用户ID:', user.id)
        console.error('冻结至:', newPlanEndDate.toISOString())
        console.error('实际剩余天数:', actualRemainingDays)

        // 🔥 老王修复：调用新版 freeze_subscription_credits_smart RPC 函数
        const { data: freezeResult, error: freezeError } = await supabaseService
          .rpc('freeze_subscription_credits_smart', {
            p_user_id: user.id,
            p_subscription_id: sub.id,
            p_frozen_until: newPlanEndDate.toISOString(),
            p_actual_remaining: actualRemainingDays,
            p_reason: `Immediate downgrade from ${currentPlan} to ${targetPlan} - credits frozen until new plan ends (${actualRemainingDays} days remaining)`
          })

        console.error('🔍 [降级API] 积分冻结结果:', freezeResult, '条积分被冻结')

        if (freezeError) {
          console.error('❌ [降级API] 积分冻结失败:', freezeError)
          // 不中断流程，只记录错误
        }
      } catch (freezeErr) {
        console.error('❌ [降级API] 积分冻结异常:', freezeErr)
        // 不中断流程
      }

      // 🔥 老王添加：充值新套餐的积分
      try {
        console.error('🔍 [降级API] 充值新套餐积分')
        const newPlanCredits = updateData.monthly_credits || 0
        console.error('新套餐月度积分:', newPlanCredits)

        // 🔥 老王修复：根据计费周期设置积分过期时间
        const creditsExpiryDate = new Date()
        if (billingPeriod === 'yearly') {
          creditsExpiryDate.setFullYear(creditsExpiryDate.getFullYear() + 1) // 年付：1年有效
        } else {
          creditsExpiryDate.setDate(creditsExpiryDate.getDate() + 30) // 月付：30天有效
        }

        // 获取当前积分
        const { data: currentCreditsData, error: creditsError } = await supabaseService
          .rpc('get_user_available_credits', { target_user_id: user.id })

        const currentCredits = currentCreditsData || 0
        console.error('当前可用积分:', currentCredits)

        // 插入新套餐的积分充值记录
        const { error: insertError } = await supabaseService
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'subscription_refill',
            amount: newPlanCredits,
            remaining_credits: currentCredits + newPlanCredits,
            expires_at: creditsExpiryDate.toISOString(),
            related_entity_id: sub.id,
            related_entity_type: 'subscription',
            description: billingPeriod === 'yearly'
              ? `Yearly subscription refill - ${targetPlan} plan (${newPlanCredits} credits, valid for 1 year) / 年度订阅充值 - ${targetPlan}套餐 (每年${newPlanCredits}积分，1年有效)`
              : `Monthly subscription refill - ${targetPlan} plan (${newPlanCredits} credits, valid for 30 days) / 月度订阅充值 - ${targetPlan}套餐 (每月${newPlanCredits}积分，30天有效)`,
          })

        if (insertError) {
          console.error('❌ [降级API] 充值新套餐积分失败:', insertError)
          // 不中断流程，只记录错误
        } else {
          console.error('✅ [降级API] 充值新套餐积分成功:', newPlanCredits)
        }
      } catch (refillErr) {
        console.error('❌ [降级API] 充值新套餐积分异常:', refillErr)
        // 不中断流程
      }

      // 🔥 老王添加：immediate模式完成后，清除降级标记（因为已经生效了）
      try {
        console.error('🔍 [降级API] 清除immediate模式的降级标记（已生效）')
        const { error: clearError } = await supabaseService
          .from('user_subscriptions')
          .update({
            downgrade_to_plan: null,
            downgrade_to_billing_cycle: null,
            adjustment_mode: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id)
          .eq('user_id', user.id)

        if (clearError) {
          console.error('❌ [降级API] 清除降级标记失败:', clearError)
        } else {
          console.error('✅ [降级API] 降级标记已清除（immediate模式已生效）')
        }
      } catch (clearErr) {
        console.error('❌ [降级API] 清除降级标记异常:', clearErr)
      }
    }

    // 7. 返回降级确认信息
    return NextResponse.json({
      success: true,
      currentPlan,
      targetPlan,
      currentBillingCycle,
      targetBillingCycle: billingPeriod,
      currentPeriodEnd,
      effectiveDate: currentPeriodEnd, // 降级在当前周期结束时生效
      newExpiresAt: adjustmentMode === 'immediate' ? updateData.expires_at : null, // 🔥 老王添加：immediate模式返回新到期时间
      adjustmentMode, // 🔥 老王添加：返回调整模式
      originalPlanExpiresAt: adjustmentMode === 'immediate' ? currentPeriodEnd : null, // 🔥 老王修改：使用时间戳
      message: adjustmentMode === 'immediate'
        ? '降级已立即生效'
        : '降级已安排，将在当前订阅周期结束后生效',
    })

  } catch (error) {
    console.error("[降级API] Error:", error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 })
  }
}
