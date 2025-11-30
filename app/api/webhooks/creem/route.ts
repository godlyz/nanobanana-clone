import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import {
  handleUpgradeDowngradePrepare,
  handleCreditFreeze,
} from '@/lib/subscription/upgrade-downgrade'
import {
  sendWelcomeEmail,
  sendCancellationEmail,
  sendInvoiceEmail,
  sendPaymentFailureEmail
} from '@/lib/email-service'

// 🔥 老王修复：把环境变量读取移到函数内部，支持测试时的 vi.stubEnv() mock
// 原来在模块加载时读取，导致测试时 stubEnv 还没生效就已经读取完了

// 🔥 老王修复：Creem Webhook 事件类型（字段名是 eventType，不是 type！）
type CreemWebhookEvent = {
  id: string
  eventType: string  // 🔥 Creem 用的是 eventType，不是 type
  created_at: number
  object: {
    id: string
    object: string
    metadata?: {
      [key: string]: any
    }
    [key: string]: any
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔥 在函数内部读取环境变量，支持测试时动态mock
    const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET

    // 1. 验证 Webhook Secret 是否配置
    if (!CREEM_WEBHOOK_SECRET) {
      console.error("CREEM_WEBHOOK_SECRET is not configured")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    // 2. 获取请求体和签名
    const rawBody = await request.text()
    const signature = request.headers.get("creem-signature")

    if (!signature) {
      console.error("Missing creem-signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // 3. 验证签名
    const isValid = verifyWebhookSignature(rawBody, signature, CREEM_WEBHOOK_SECRET)

    if (!isValid) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // 4. 解析事件数据
    const event: CreemWebhookEvent = JSON.parse(rawBody)

    // 🔥 老王调试：打印完整的请求体，查看Creem到底发了什么
    console.error("=".repeat(80))
    console.error("🔍 [Webhook] 收到的完整请求体:")
    console.error(JSON.stringify(event, null, 2))
    console.error("🔍 [Webhook] 事件类型:", event.eventType)
    console.error("🔍 [Webhook] 所有字段:", Object.keys(event))
    console.error("=".repeat(80))

    // 5. 根据事件类型处理（🔥 老王修复：使用 eventType 字段）
    switch (event.eventType) {
      case "checkout.completed":
        await handleCheckoutCompleted(event.object)
        break

      case "subscription.created":
        await handleSubscriptionCreated(event.object)
        break

      case "subscription.updated":
        await handleSubscriptionUpdated(event.object)
        break

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.object)
        break

      case "subscription.active":  // 🔥 老王新增：Creem 发送的是 subscription.active
        await handleSubscriptionActive(event.object)
        break

      case "subscription.paid":  // 🔥 老王新增：Creem 发送的是 subscription.paid
        await handleSubscriptionPaid(event.object)
        break

      case "subscription.expired":  // 🔥 老王新增：订阅到期，自动解冻积分
        await handleSubscriptionExpired(event.object)
        break

      case "payment.succeeded":
        await handlePaymentSucceeded(event.object)
        break

      case "payment.failed":
        await handlePaymentFailed(event.object)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.eventType}`)
    }

    // 6. 返回成功响应
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

// 验证 Webhook 签名
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const computedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")

    return signature === computedSignature
  } catch (error) {
    console.error("Signature verification error:", error)
    return false
  }
}

// 处理支付完成事件
async function handleCheckoutCompleted(data: any) {
  console.log("✅ Checkout completed:", data)

  try {
    // 从 metadata 中获取信息
    const metadata = data.metadata || {}
    const purchaseType = metadata.type // 'credit_package' 或 'subscription'

    if (purchaseType === 'credit_package') {
      // 🔥 老王新增: 处理积分包购买
      await handleCreditPackagePurchase(data, metadata)
    } else {
      // 处理订阅购买 (保持原有逻辑)
      await handleSubscriptionPurchase(data, metadata)
    }
  } catch (error) {
    console.error('❌ handleCheckoutCompleted 错误:', error)
    throw error
  }
}

// 🔥 老王新增: 处理积分包购买完成
async function handleCreditPackagePurchase(data: any, metadata: any) {
  console.log('📦 处理积分包购买:', metadata)

  const { user_id, package_code, credits } = metadata
  const { order_id, product_id } = data

  if (!user_id || !package_code || !credits) {
    console.error('❌ 积分包购买缺少必要参数:', metadata)
    return
  }

  // 导入服务
  const { createCreditService } = await import('@/lib/credit-service')
  const { createClient } = await import('@/lib/supabase/server')

  const supabase = await createClient()
  const creditService = await createCreditService(true)  // 🔥 老王修复：Webhook场景使用Service Role Client

  // 1. 查询积分包信息
  const { data: packageData, error: packageError } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('package_code', package_code)
    .single()

  if (packageError || !packageData) {
    console.error('❌ 查询积分包失败:', packageError)
    return
  }

  // 2. 记录订单到 subscription_orders 表 (复用订阅订单表)
  const { error: orderError } = await supabase
    .from('subscription_orders')
    .insert({
      user_id,
      creem_order_id: order_id || data.id,
      creem_checkout_id: data.checkout_id || data.id,
      product_id,
      amount: packageData.price_usd,
      currency: 'USD',
      status: 'completed'
    })

  if (orderError) {
    console.error('⚠️ 记录订单失败 (继续充值积分):', orderError)
  }

  // 3. 充值积分 (永久有效)
  await creditService.creditPackagePurchase(
    user_id,
    order_id || data.id,
    credits,
    packageData.name_zh
  )

  console.log(`✅ 积分包购买完成: 用户=${user_id}, 积分=${credits}`)
}

// 处理订阅购买
async function handleSubscriptionPurchase(data: any, metadata: any) {
  console.log('📅 处理订阅购买:', metadata)

  const { user_id, plan_tier, billing_cycle, action, adjustment_mode, remaining_seconds, was_downgraded, current_subscription_id } = metadata
  const { order_id, product_id } = data

  if (!user_id || !plan_tier || !billing_cycle) {
    console.error('订阅购买缺少必要参数:', metadata)
    return
  }

  // 导入服务和常量
  const { createCreditService } = await import('@/lib/credit-service')
  const { createClient } = await import('@/lib/supabase/server')
  const { createServiceClient } = await import('@/lib/supabase/service')  // 🔥 老王添加：Service Role Client
  const {
    SUBSCRIPTION_MONTHLY_CREDITS,
    SUBSCRIPTION_YEARLY_ACTUAL_CREDITS
  } = await import('@/lib/credit-types')

  const supabase = await createClient()
  const supabaseService = createServiceClient()  // 🔥 老王添加：Service Role Client
  const creditService = await createCreditService(true)  // 🔥 老王修复：Webhook场景使用Service Role Client

  // 🔥 老王添加：打印调整模式信息
  console.log(`📋 订阅详情: action=${action}, adjustment_mode=${adjustment_mode}, remaining_seconds=${remaining_seconds}, was_downgraded=${was_downgraded}`)

  // 🔥 老王新增：重复充值防护（5分钟内重复请求跳过）
  const fiveMinutesAgo = new Date()
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)

  const { data: recentRefills, error: checkError } = await supabaseService
    .from('credit_transactions')
    .select('id, created_at')
    .eq('user_id', user_id)
    .eq('transaction_type', 'subscription_refill')
    .gte('created_at', fiveMinutesAgo.toISOString())
    .limit(1)

  if (checkError) {
    console.error('❌ 检查重复充值失败:', checkError)
    // 继续执行，不因为检查失败而中断业务
  } else if (recentRefills && recentRefills.length > 0) {
    console.log(`⚠️ 检测到5分钟内重复充值请求，跳过处理`)
    console.log(`   用户: ${user_id}`)
    console.log(`   上次充值时间: ${recentRefills[0].created_at}`)
    return // 直接返回，不执行充值
  }

  const monthlyCredits = SUBSCRIPTION_MONTHLY_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_MONTHLY_CREDITS]

  let subscriptionId: string
  let oldSubscriptionId: string | null = null

  // 🔥 老王重构：使用2阶段handler处理upgrade/downgrade
  let prepareResult: any = null  // 保存Prepare阶段结果

  if (action === 'upgrade' || action === 'downgrade') {
    // 🔥 老王重构：根据 adjustment_mode 区分处理逻辑
    const isScheduled = adjustment_mode === 'scheduled'

    if (isScheduled) {
      // ==================== SCHEDULED 模式 ====================
      // 创建 pending 状态的订阅，等旧订阅结束后再激活
      console.log(`📅 [scheduled模式] ${action}: 创建pending订阅，等旧订阅结束后激活`)

      // Step 1: 获取旧订阅信息（用于计算activation_date）
      const { data: oldSub } = await supabaseService
        .from('user_subscriptions')
        .select('id, expires_at, plan_tier, billing_cycle')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .single()

      if (!oldSub) {
        console.error(`❌ 找不到用户的活跃订阅`)
        throw new Error('No active subscription found')
      }

      oldSubscriptionId = oldSub.id
      const activationDate = oldSub.expires_at  // 新订阅的激活时间 = 旧订阅到期时间

      // Step 2: 创建 pending 状态的订阅（不充值！）
      const { data: newSub, error: createError } = await supabaseService
        .from('user_subscriptions')
        .insert({
          user_id,
          plan_tier,
          billing_cycle,
          monthly_credits: monthlyCredits,
          creem_subscription_id: data.subscription_id || null,
          status: 'pending',  // 🔥 关键：pending 状态
          activation_date: activationDate,  // 🔥 关键：激活时间
          unactivated_months: billing_cycle === 'yearly' ? 12 : 1,  // 未激活月份数
        })
        .select('id')
        .single()

      if (createError) {
        console.error(`❌ 创建pending订阅失败:`, createError)
        throw createError
      }

      subscriptionId = newSub.id
      console.log(`✅ [scheduled模式] pending订阅创建成功: ID=${subscriptionId}, 激活日期=${activationDate}`)

      // 🔥 scheduled模式不执行冻结和充值，直接记录订单后返回
      // 积分充值由 Cron Job 在激活时执行

    } else {
      // ==================== IMMEDIATE 模式 ====================
      // 立即切换：冻结旧订阅 + 创建并激活新订阅
      console.log(`⚡ [immediate模式] ${action}: 立即切换，冻结旧订阅`)

      // Phase 1: Prepare（准备阶段：取消旧订阅 + 创建新订阅 + 查询FIFO包）
      prepareResult = await handleUpgradeDowngradePrepare(
        supabaseService,
        creditService,
        {
          userId: user_id,
          planTier: plan_tier,
          billingCycle: billing_cycle,
          monthlyCredits,
          creemSubscriptionId: data.subscription_id || null,
          action,
        }
      )

      subscriptionId = prepareResult.newSubscriptionId
      oldSubscriptionId = prepareResult.oldSubscriptionId

      // 🔥 老王添加：冻结旧订阅的剩余时间（存储remaining_seconds）
      if (remaining_seconds && parseInt(remaining_seconds) > 0) {
        console.log(`🧊 [immediate模式] 冻结旧订阅剩余时间: ${remaining_seconds}秒`)

        const { error: freezeTimeError } = await supabaseService
          .from('user_subscriptions')
          .update({
            frozen_remaining_seconds: parseInt(remaining_seconds),
            is_time_frozen: true,  // 标记时间被冻结
          })
          .eq('id', oldSubscriptionId)

        if (freezeTimeError) {
          console.error(`❌ 冻结旧订阅时间失败:`, freezeTimeError)
        }
      }

      // 🔥 老王添加：后延pending月份的激活时间
      // 查找旧订阅的未激活月份记录，将其 activate_at 后延
      const newSubDays = billing_cycle === 'yearly' ? 360 : 30
      const delaySeconds = newSubDays * 24 * 60 * 60

      const { data: pendingMonths, error: queryPendingError } = await supabaseService
        .from('credit_transactions')
        .select('id, activate_at')
        .eq('user_id', user_id)
        .eq('is_pending', true)
        .eq('related_entity_id', oldSubscriptionId)

      if (!queryPendingError && pendingMonths && pendingMonths.length > 0) {
        console.log(`📅 [immediate模式] 找到 ${pendingMonths.length} 个pending月份，后延激活时间`)

        for (const pm of pendingMonths) {
          const oldActivateAt = new Date(pm.activate_at)
          const newActivateAt = new Date(oldActivateAt.getTime() + delaySeconds * 1000)

          await supabaseService
            .from('credit_transactions')
            .update({ activate_at: newActivateAt.toISOString() })
            .eq('id', pm.id)

          console.log(`   - ${pm.id.substring(0, 8)}: ${pm.activate_at} → ${newActivateAt.toISOString()}`)
        }
      }

      console.log(`✅ [immediate模式] Prepare阶段完成: newSubId=${subscriptionId}, oldSubId=${oldSubscriptionId}`)
    }
  } else {
    // 创建新订阅（首次购买）
    console.log('🆕 首次购买：创建新订阅')
    subscriptionId = await creditService.createSubscription({
      user_id,
      plan_tier,
      billing_cycle,
      monthly_credits: monthlyCredits,
      creem_subscription_id: data.subscription_id || null,
    })
  }

  // 🔥 老王添加：如果是降级续订，清除降级相关字段
  if (action === 'renew' && was_downgraded === 'true') {
    console.log('🔄 降级续订: 清除降级计划字段')

    const { error: clearError } = await supabase
      .from('user_subscriptions')
      .update({
        downgrade_to_plan: null,
        downgrade_to_billing_cycle: null,
        adjustment_mode: null,
        remaining_days: null,
      })
      .eq('id', subscriptionId)

    if (clearError) {
      console.error('❌ 清除降级字段失败:', clearError)
    } else {
      console.log('✅ 降级字段已清除')
    }
  }

  // 🔥 老王重构：新的积分充值逻辑（支持未激活月份）
  // 逻辑：
  // - 首次购买年付：充值第1个月积分 + 设置 unactivated_months = 11
  // - 续订年付：unactivated_months += 12（不充值）
  // - 首次购买月付：充值1个月积分 + unactivated_months = 0
  // - 续订月付：unactivated_months += 1（不充值）

  const isRenewal = action === 'renew'  // 判断是否为续订
  const isFirstPurchase = !isRenewal && action !== 'upgrade' && action !== 'downgrade'

  if (billing_cycle === 'yearly') {
    // ==================== 年付逻辑 ====================
    if (isFirstPurchase) {
      // 🔥 首次购买年付：充值第1个月积分 + 设置 unactivated_months = 11
      console.log('📦 首次购买年付：充值第1个月积分 + 设置未激活月份=11')

      // 充值第1个月积分（30天有效期）
      const firstMonthCredits = monthlyCredits
      await creditService.refillSubscriptionCredits(
        user_id,
        subscriptionId,
        firstMonthCredits,
        plan_tier,
        'monthly',  // 第1个月按月付处理（30天有效期）
        false  // 首次购买，不是续费
      )

      // 设置未激活月份 = 11（剩余11个月）
      const { error: updateError } = await supabaseService
        .from('user_subscriptions')
        .update({ unactivated_months: 11 })
        .eq('id', subscriptionId)

      if (updateError) {
        console.error('❌ 设置未激活月份失败:', updateError)
      } else {
        console.log('✅ 未激活月份已设置: 11个月')
      }

      // 🔥 充值年付赠送积分（20%，立即到账，1年有效期）
      const yearlyBonusCredits = SUBSCRIPTION_YEARLY_ACTUAL_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_YEARLY_ACTUAL_CREDITS] - (monthlyCredits * 12)
      if (yearlyBonusCredits > 0) {
        const bonusExpiresAt = new Date()
        bonusExpiresAt.setFullYear(bonusExpiresAt.getFullYear() + 1)

        await creditService.addCredits({
          user_id,
          amount: yearlyBonusCredits,
          transaction_type: 'subscription_bonus',
          expires_at: bonusExpiresAt,
          related_entity_id: subscriptionId,
          description: `年付赠送积分 - ${plan_tier}套餐 (${yearlyBonusCredits}积分，1年有效) / Yearly subscription bonus - ${plan_tier} plan (${yearlyBonusCredits} credits, valid for 1 year)`,
        })
        console.log(`🎁 年付赠送积分充值成功: ${yearlyBonusCredits}积分`)
      }

      console.log(`✅ 首次购买年付完成: 第1个月=${firstMonthCredits}积分 + 未激活月份=11 + 赠送积分=${yearlyBonusCredits}`)

    } else if (isRenewal) {
      // 🔥 续订年付：unactivated_months += 12（不充值）
      console.log('🔄 续订年付：增加12个未激活月份（不立即充值）')

      // 查询当前的未激活月份数
      const { data: currentSub, error: fetchError } = await supabaseService
        .from('user_subscriptions')
        .select('unactivated_months')
        .eq('id', subscriptionId)
        .single()

      if (fetchError) {
        console.error('❌ 查询未激活月份失败:', fetchError)
        return
      }

      const currentUnactivated = currentSub?.unactivated_months || 0
      const newUnactivated = currentUnactivated + 12

      // 更新未激活月份
      const { error: updateError } = await supabaseService
        .from('user_subscriptions')
        .update({ unactivated_months: newUnactivated })
        .eq('id', subscriptionId)

      if (updateError) {
        console.error('❌ 更新未激活月份失败:', updateError)
      } else {
        console.log(`✅ 续订年付完成: 未激活月份 ${currentUnactivated} → ${newUnactivated}`)
      }
    }
  } else {
    // ==================== 月付逻辑 ====================
    if (isFirstPurchase) {
      // 🔥 首次购买月付：立即充值1个月积分（30天有效期）
      console.log('📦 首次购买月付：立即充值1个月积分（30天有效期）')

      await creditService.refillSubscriptionCredits(
        user_id,
        subscriptionId,
        monthlyCredits,
        plan_tier,
        'monthly',
        false  // 首次购买，不是续费
      )

      console.log(`✅ 首次购买月付完成: ${monthlyCredits}积分（30天有效期）`)

    } else if (isRenewal) {
      // 🔥 续订月付：增加1个未激活月份（不立即充值）
      console.log('🔄 续订月付：增加1个未激活月份（不立即充值）')

      // 查询当前的未激活月份数
      const { data: currentSub, error: fetchError } = await supabaseService
        .from('user_subscriptions')
        .select('unactivated_months')
        .eq('id', subscriptionId)
        .single()

      if (fetchError) {
        console.error('❌ 查询未激活月份失败:', fetchError)
        return
      }

      const currentUnactivated = currentSub?.unactivated_months || 0
      const newUnactivated = currentUnactivated + 1

      // 更新未激活月份
      const { error: updateError } = await supabaseService
        .from('user_subscriptions')
        .update({ unactivated_months: newUnactivated })
        .eq('id', subscriptionId)

      if (updateError) {
        console.error('❌ 更新未激活月份失败:', updateError)
      } else {
        console.log(`✅ 续订月付完成: 未激活月份 ${currentUnactivated} → ${newUnactivated}（每月=30天）`)
      }
    }
  }

  // 🔥 老王添加：upgrade/downgrade 充值新订阅积分（仅immediate模式）
  // scheduled模式由Cron激活时充值
  const isImmediateMode = adjustment_mode !== 'scheduled'
  if ((action === 'upgrade' || action === 'downgrade') && isImmediateMode) {
    console.log(`💰 [immediate模式] ${action}场景：充值新订阅积分`)

    // 充值新订阅的积分（立即到账）
    if (billing_cycle === 'yearly') {
      // 年付：充值第1个月积分 + 设置 unactivated_months = 11
      await creditService.refillSubscriptionCredits(
        user_id,
        subscriptionId,
        monthlyCredits,
        plan_tier,
        'monthly',  // 第1个月按月付处理（30天有效期）
        false
      )

      // 设置未激活月份 = 11
      const { error: updateError } = await supabaseService
        .from('user_subscriptions')
        .update({ unactivated_months: 11 })
        .eq('id', subscriptionId)

      if (updateError) {
        console.error('❌ 设置未激活月份失败:', updateError)
      }

      // 充值年付赠送积分（20%，1年有效期）
      const yearlyBonusCredits = SUBSCRIPTION_YEARLY_ACTUAL_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_YEARLY_ACTUAL_CREDITS] - (monthlyCredits * 12)
      if (yearlyBonusCredits > 0) {
        const bonusExpiresAt = new Date()
        bonusExpiresAt.setFullYear(bonusExpiresAt.getFullYear() + 1)

        await creditService.addCredits({
          user_id,
          amount: yearlyBonusCredits,
          transaction_type: 'subscription_bonus',
          expires_at: bonusExpiresAt,
          related_entity_id: subscriptionId,
          description: `年付赠送积分 - ${plan_tier}套餐 (${yearlyBonusCredits}积分，1年有效) / Yearly subscription bonus - ${plan_tier} plan (${yearlyBonusCredits} credits, valid for 1 year)`,
        })
        console.log(`🎁 年付赠送积分充值成功: ${yearlyBonusCredits}积分`)
      }

      console.log(`✅ ${action}年付完成: 第1个月=${monthlyCredits}积分 + 未激活月份=11 + 赠送积分=${yearlyBonusCredits}`)
    } else {
      // 月付：立即充值1个月积分（30天有效期）
      await creditService.refillSubscriptionCredits(
        user_id,
        subscriptionId,
        monthlyCredits,
        plan_tier,
        'monthly',
        false
      )

      console.log(`✅ ${action}月付完成: ${monthlyCredits}积分（30天有效期）`)
    }
  }

  // 🔥 老王重构：Phase 2 - Freeze（冻结阶段，在充值后执行，仅immediate模式）
  if (prepareResult && (action === 'upgrade' || action === 'downgrade') && isImmediateMode) {
    const freezeResult = await handleCreditFreeze(
      supabaseService,
      prepareResult,
      action,
      plan_tier,
      billing_cycle
    )

    if (freezeResult.frozen) {
      console.log(`✅ Freeze阶段完成: frozen=true, packageId=${freezeResult.packageId}`)
    } else {
      console.log(`ℹ️  Freeze阶段完成: frozen=false (没有积分包需要冻结)`)
    }
  }

  // 4. 记录订单
  const { error: orderError } = await supabase
    .from('subscription_orders')
    .insert({
      user_id,
      creem_order_id: order_id || data.id,
      creem_checkout_id: data.checkout_id || data.id,
      product_id,
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      status: 'completed'
    })

  if (orderError) {
    console.error('记录订单失败:', orderError)
  }

  console.log(`✅ 订阅购买完成: 用户=${user_id}, 套餐=${plan_tier}, 周期=${billing_cycle}`)
}

// 处理订阅创建事件
async function handleSubscriptionCreated(data: any) {
  console.log("Subscription created:", data)

  try {
    const {
      subscription_id,
      customer_id,
      product_id,
      status,
      created_at,
      billing_cycle
    } = data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. 创建/更新订阅记录
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        subscription_id,
        user_id: customer_id,
        product_id,
        status: status || 'active',
        billing_cycle: billing_cycle || 'monthly',
        current_period_start: new Date(created_at).toISOString(),
        current_period_end: new Date(
          new Date(created_at).getTime() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        created_at: new Date(created_at).toISOString(),
        updated_at: new Date().toISOString()
      })

    if (subscriptionError) {
      console.error('创建订阅记录失败:', subscriptionError)
      throw subscriptionError
    }

    // 2. 根据产品ID添加积分
    const { CreditService } = await import('@/lib/credit-service')
    const creditService = new CreditService(supabase)

    // 根据产品ID确定积分数量
    let creditsToAdd = 0
    if (product_id.includes('basic')) {
      creditsToAdd = billing_cycle === 'yearly' ? 1200 : 100 // Basic: 年1200，月100
    } else if (product_id.includes('pro')) {
      creditsToAdd = billing_cycle === 'yearly' ? 6000 : 500 // Pro: 年6000，月500
    } else if (product_id.includes('max')) {
      creditsToAdd = 999999 // Max: 无限积分，用大数表示
    }

    if (creditsToAdd > 0) {
      // 🔥 老王 Day 3 修复：参数名应该是 user_id 不是 userId，transaction_type 不是 type
      // 🔥 老王 Day 4 修复：添加 expires_at 字段（订阅积分1年有效期）
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1年有效期

      await creditService.addCredits({
        user_id: customer_id,
        amount: creditsToAdd,
        transaction_type: 'subscription',
        expires_at: expiresAt,
        description: `订阅充值 - ${billing_cycle === 'yearly' ? '年付' : '月付'}`,
        metadata: {
          subscription_id,
          product_id,
          billing_cycle
        }
      })
    }

    // 3. 发送欢迎邮件
    try {
      // 🔥 老王实现：根据product_id确定计划名称和价格
      let planName = 'Basic'
      let planPrice = '$9.99'

      if (product_id.includes('basic')) {
        planName = 'Basic'
        planPrice = billing_cycle === 'yearly' ? '$99/年' : '$9.99/月'
      } else if (product_id.includes('pro')) {
        planName = 'Pro'
        planPrice = billing_cycle === 'yearly' ? '$249/年' : '$24.99/月'
      } else if (product_id.includes('max')) {
        planName = 'Max'
        planPrice = billing_cycle === 'yearly' ? '$999/年' : '$99.99/月'
      }

      const emailResult = await sendWelcomeEmail({
        userId: customer_id,
        planName,
        planPrice,
        billingCycle: billing_cycle as 'monthly' | 'yearly'
      })

      if (emailResult.success) {
        console.log(`📧 欢迎邮件已发送: ${emailResult.email}`)
      } else {
        console.warn(`⚠️ 欢迎邮件发送失败: ${emailResult.error}`)
      }
    } catch (emailError) {
      console.error(`❌ 欢迎邮件发送异常:`, emailError)
      // 🔥 错误隔离：邮件发送失败不影响核心业务
    }

    console.log(`🎉 订阅创建成功: 用户=${customer_id}, 套餐=${product_id}, 积分=${creditsToAdd}`)

  } catch (error) {
    console.error('处理订阅创建事件失败:', error)
    throw error
  }
}

// 处理订阅更新事件
async function handleSubscriptionUpdated(data: any) {
  console.log("Subscription updated:", data)

  try {
    const {
      subscription_id,
      customer_id,
      product_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end
    } = data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. 获取旧订阅信息，用于判断升级/降级
    const { data: oldSubscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('subscription_id', subscription_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('获取旧订阅信息失败:', fetchError)
      throw fetchError
    }

    // 2. 更新订阅信息
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .upsert({
        subscription_id,
        user_id: customer_id,
        product_id,
        status,
        billing_cycle,
        current_period_start: new Date(current_period_start).toISOString(),
        current_period_end: new Date(current_period_end).toISOString(),
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('更新订阅记录失败:', updateError)
      throw updateError
    }

    // 3. 处理升级/降级逻辑
    if (oldSubscription && oldSubscription.product_id !== product_id) {
      console.log(`📊 订阅变更: ${oldSubscription.product_id} -> ${product_id}`)

      // 根据新旧产品计算积分差异
      const oldCredits = getProductCredits(oldSubscription.product_id, oldSubscription.billing_cycle)
      const newCredits = getProductCredits(product_id, billing_cycle)
      const creditDifference = newCredits - oldCredits

      if (creditDifference > 0) {
        // 升级：增加积分
        const { CreditService } = await import('@/lib/credit-service')
        const creditService = new CreditService(supabase)

        // 🔥 老王 Day 3 修复：参数名应该是 user_id 不是 userId，transaction_type 不是 type
        // 🔥 老王 Day 4 修复：添加 expires_at 字段（订阅积分1年有效期）
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1年有效期

        await creditService.addCredits({
          user_id: customer_id,
          amount: creditDifference,
          transaction_type: 'subscription_upgrade',
          expires_at: expiresAt,
          description: `订阅升级 - 积分补偿`,
          metadata: {
            subscription_id,
            old_product_id: oldSubscription.product_id,
            new_product_id: product_id,
            credit_difference: creditDifference
          }
        })

        console.log(`🎉 订阅升级成功: 用户=${customer_id}, 增加积分=${creditDifference}`)
      }
    }

  } catch (error) {
    console.error('处理订阅更新事件失败:', error)
    throw error
  }
}

// 辅助函数：根据产品ID获取积分数
function getProductCredits(productId: string, billingCycle: string): number {
  if (productId.includes('basic')) {
    return billingCycle === 'yearly' ? 1200 : 100
  } else if (productId.includes('pro')) {
    return billingCycle === 'yearly' ? 6000 : 500
  } else if (productId.includes('max')) {
    return 999999
  }
  return 0
}

// 处理订阅取消事件
async function handleSubscriptionCancelled(data: any) {
  console.log("Subscription cancelled:", data)

  try {
    const {
      subscription_id,
      customer_id,
      cancelled_at,
      current_period_end
    } = data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. 更新订阅状态为取消
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date(cancelled_at).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription_id)

    if (updateError) {
      console.error('更新订阅取消状态失败:', updateError)
      throw updateError
    }

    // 2. 设置订阅结束日期（如果还没有结束日期）
    if (current_period_end) {
      await supabase
        .from('user_subscriptions')
        .update({
          current_period_end: new Date(current_period_end).toISOString()
        })
        .eq('subscription_id', subscription_id)
    }

    // 3. 发送取消确认邮件
    try {
      // 🔥 老王实现：获取订阅信息用于邮件内容
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('product_id, billing_cycle')
        .eq('subscription_id', subscription_id)
        .single()

      if (subscription) {
        // 确定计划名称
        let planName = 'Basic'
        if (subscription.product_id.includes('pro')) {
          planName = 'Pro'
        } else if (subscription.product_id.includes('max')) {
          planName = 'Max'
        }

        // 格式化到期日期
        const expirationDate = new Date(current_period_end || cancelled_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        const emailResult = await sendCancellationEmail({
          userId: customer_id,
          planName,
          expirationDate
        })

        if (emailResult.success) {
          console.log(`📧 取消确认邮件已发送: ${emailResult.email}`)
        } else {
          console.warn(`⚠️ 取消确认邮件发送失败: ${emailResult.error}`)
        }
      }
    } catch (emailError) {
      console.error(`❌ 取消确认邮件发送异常:`, emailError)
      // 🔥 错误隔离：邮件发送失败不影响核心业务
    }

    // 4. 处理退款（如有）
    // Creem 通常会在取消时自动处理退款，这里记录日志即可
    console.log(`📋 订阅取消成功: 用户=${customer_id}, 订阅ID=${subscription_id}`)

  } catch (error) {
    console.error('处理订阅取消事件失败:', error)
    throw error
  }
}

// 🔥 老王新增：处理订阅到期事件（自动解冻积分）
async function handleSubscriptionExpired(data: any) {
  console.log("🔥 Subscription expired - 自动解冻积分:", data)

  try {
    const {
      subscription_id,
      customer_id,
      expired_at,
      id
    } = data

    // 🔥 老王修复：使用Service Role Client绕过RLS权限限制
    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabase = createServiceClient()

    // 🔥 步骤1：更新订阅状态为已过期
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription_id || id)

    if (updateError) {
      console.error('❌ 更新订阅过期状态失败:', updateError)
    } else {
      console.log(`✅ 订阅状态已更新为 expired: ${subscription_id || id}`)
    }

    // 🔥 步骤2：获取用户ID（如果 customer_id 不存在，从订阅记录中查询）
    let user_id = customer_id
    if (!user_id) {
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('subscription_id', subscription_id || id)
        .single()
      user_id = subData?.user_id
    }

    if (!user_id) {
      console.error('❌ 无法获取用户ID，跳过解冻积分')
      return
    }

    console.log(`🔍 开始查找需要解冻的积分包...`)
    console.log(`   用户ID: ${user_id}`)
    console.log(`   过期订阅ID: ${subscription_id || id}`)

    // 🔥 步骤3：查找所有需要解冻的积分包
    // 🔥 修改逻辑：不依赖时间判断，直接查找所有is_frozen=true的包
    // 因为收到 subscription.expired 事件就说明订阅已结束，应该解冻
    const { data: frozenPackages, error: queryError } = await supabase
      .from('credit_transactions')
      .select('id, amount, remaining_amount, expires_at, frozen_until, frozen_remaining_seconds, original_expires_at, related_entity_id, is_frozen')
      .eq('user_id', user_id)
      .eq('is_frozen', true)
      // 🔥 不再依赖 frozen_until 时间判断，因为 subscription.expired 事件本身就表示订阅已结束

    console.log(`🔍 [Debug] 查询结果:`, { frozenPackages, queryError })

    if (queryError) {
      console.error('❌ 查询冻结积分包失败:', queryError)
      return
    }

    if (!frozenPackages || frozenPackages.length === 0) {
      console.log('⚠️  没有找到需要解冻的积分包')

      // 🔥 Debug: 查询所有积分包
      const { data: allPackages } = await supabase
        .from('credit_transactions')
        .select('id, amount, is_frozen, frozen_until')
        .eq('user_id', user_id)
        .gt('amount', 0)
      console.log(`🔍 [Debug] 所有积分包:`, allPackages)

      return
    }

    console.log(`📦 找到 ${frozenPackages.length} 个需要解冻的积分包`)

    // 🔥 步骤4：解冻所有符合条件的包
    for (const pkg of frozenPackages) {
      console.log(`\n🔓 解冻积分包:`)
      console.log(`   包ID: ${pkg.id.substring(0, 8)}`)
      console.log(`   剩余积分: ${pkg.remaining_amount}`)
      console.log(`   过期时间: ${pkg.expires_at}`)
      console.log(`   冻结至: ${pkg.frozen_until}`)

      const { error: unfreezeError } = await supabase
        .from('credit_transactions')
        .update({
          is_frozen: false,
          // 保留其他冻结字段作为历史记录（frozen_until, frozen_remaining_seconds, original_expires_at）
        })
        .eq('id', pkg.id)

      if (unfreezeError) {
        console.error(`   ❌ 解冻失败:`, unfreezeError)
      } else {
        console.log(`   ✅ 解冻成功！现在可用于消费`)
      }
    }

    console.log(`\n🎉 订阅到期处理完成: 用户=${user_id}, 订阅=${subscription_id || id}`)
    console.log(`   已解冻 ${frozenPackages.length} 个积分包`)

  } catch (error) {
    console.error('❌ 处理订阅到期事件失败:', error)
    throw error
  }
}

// 处理支付成功事件
async function handlePaymentSucceeded(data: any) {
  console.log("Payment succeeded:", data)

  try {
    const {
      order_id,
      customer_id,
      product_id,
      amount,
      currency,
      paid_at
    } = data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. 记录支付成功，更新订单状态
    const { error: orderError } = await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        paid_at: new Date(paid_at).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', order_id)

    if (orderError) {
      console.error('更新订单状态失败:', orderError)
      throw orderError
    }

    // 2. 记录支付历史
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert({
        order_id,
        user_id: customer_id,
        product_id,
        amount,
        currency: currency || 'USD',
        status: 'success',
        payment_date: new Date(paid_at).toISOString(),
        created_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('记录支付历史失败:', historyError)
      // 非致命错误，继续处理
    }

    // 3. 生成发票记录并发送邮件
    try {
      // 🔥 老王实现：生成发票号（格式：INV-YYYYMMDD-订单ID后8位）
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const invoiceNumber = `INV-${dateStr}-${order_id.slice(-8)}`

      // 获取订阅信息
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('product_id, billing_cycle')
        .eq('subscription_id', product_id)
        .single()

      let planName = 'Basic'
      let billingCycle: 'monthly' | 'yearly' = 'monthly'

      if (subscription) {
        if (subscription.product_id.includes('pro')) {
          planName = 'Pro'
        } else if (subscription.product_id.includes('max')) {
          planName = 'Max'
        }
        billingCycle = subscription.billing_cycle || 'monthly'
      }

      // 格式化金额（假设金额单位是美分，需要除以100）
      const formattedAmount = `$${(Number(amount) / 100).toFixed(2)}`

      // 格式化日期
      const invoiceDate = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const emailResult = await sendInvoiceEmail({
        userId: customer_id,
        planName,
        amount: formattedAmount,
        invoiceNumber,
        invoiceDate,
        billingCycle
      })

      if (emailResult.success) {
        console.log(`📧 发票邮件已发送: ${emailResult.email} (发票号: ${invoiceNumber})`)
      } else {
        console.warn(`⚠️ 发票邮件发送失败: ${emailResult.error}`)
      }
    } catch (emailError) {
      console.error(`❌ 发票邮件发送异常:`, emailError)
      // 🔥 错误隔离：邮件发送失败不影响核心业务
    }

    console.log(`💰 支付成功记录: 订单=${order_id}, 用户=${customer_id}, 金额=${amount} ${currency}`)

  } catch (error) {
    console.error('处理支付成功事件失败:', error)
    throw error
  }
}

// 处理支付失败事件
async function handlePaymentFailed(data: any) {
  console.log("Payment failed:", data)

  try {
    const {
      order_id,
      customer_id,
      product_id,
      amount,
      error_message,
      failed_at
    } = data

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. 记录支付失败
    const { error: orderError } = await supabase
      .from('payment_orders')
      .update({
        status: 'failed',
        error_message,
        failed_at: new Date(failed_at).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', order_id)

    if (orderError) {
      console.error('更新订单失败状态失败:', orderError)
      throw orderError
    }

    // 2. 记录支付失败历史
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert({
        order_id,
        user_id: customer_id,
        product_id,
        amount,
        status: 'failed',
        error_message,
        payment_date: new Date(failed_at).toISOString(),
        created_at: new Date().toISOString()
      })

    if (historyError) {
      console.error('记录支付失败历史失败:', historyError)
      // 非致命错误，继续处理
    }

    // 3. 通知用户支付失败
    try {
      // 🔥 老王实现：发送支付失败通知邮件
      // 获取订阅信息
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('product_id')
        .eq('user_id', customer_id)
        .single()

      let planName = 'Basic'

      if (subscription) {
        if (subscription.product_id.includes('pro')) {
          planName = 'Pro'
        } else if (subscription.product_id.includes('max')) {
          planName = 'Max'
        }
      }

      // 计算下次重试时间（3天后）
      const retryDate = new Date()
      retryDate.setDate(retryDate.getDate() + 3)
      const retryDateStr = retryDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const emailResult = await sendPaymentFailureEmail({
        userId: customer_id,
        planName,
        failureReason: error_message || '支付处理失败',
        retryDate: retryDateStr
      })

      if (emailResult.success) {
        console.log(`📧 支付失败通知邮件已发送: ${emailResult.email}`)
      } else {
        console.warn(`⚠️ 支付失败通知邮件发送失败: ${emailResult.error}`)
      }
    } catch (emailError) {
      console.error(`❌ 支付失败通知邮件发送异常:`, emailError)
      // 🔥 错误隔离：邮件发送失败不影响核心业务
    }

    console.log(`❌ 支付失败记录: 订单=${order_id}, 用户=${customer_id}, 错误=${error_message}`)

  } catch (error) {
    console.error('处理支付失败事件失败:', error)
    throw error
  }
}

// 🔥 老王新增：处理订阅激活事件（Creem 真实发送的事件类型）
async function handleSubscriptionActive(data: any) {
  console.log("✅ Subscription active:", data)

  try {
    // 从订阅对象的 metadata 中提取信息
    const metadata = data.metadata || {}

    console.log("📋 Subscription metadata:", metadata)

    // 判断是订阅类型（不是积分包）
    if (metadata.type === 'subscription') {
      await handleSubscriptionPurchase(data, metadata)
    } else {
      console.log(`⚠️ Skipping non-subscription active event, type=${metadata.type}`)
    }
  } catch (error) {
    console.error('处理订阅激活事件失败:', error)
    throw error
  }
}

// 🔥 老王新增：处理订阅付款事件（Creem 真实发送的事件类型）
async function handleSubscriptionPaid(data: any) {
  console.log("💰 Subscription paid:", data)

  try {
    // 从订阅对象的 metadata 中提取信息
    const metadata = data.metadata || {}

    console.log("📋 Subscription metadata:", metadata)

    // 判断是订阅类型（不是积分包）
    if (metadata.type === 'subscription') {
      await handleSubscriptionPurchase(data, metadata)
    } else {
      console.log(`⚠️ Skipping non-subscription paid event, type=${metadata.type}`)
    }
  } catch (error) {
    console.error('处理订阅付款事件失败:', error)
    throw error
  }
}
