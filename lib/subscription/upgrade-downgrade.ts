/**
 * 🔥 老王的 Upgrade/Downgrade Handler
 * 用途：处理订阅升级/降级的完整流程
 *
 * 组合 Phase 1 (纯函数) 和 Phase 2 (服务层) 的功能
 * 保持业务逻辑不变，只是提取和模块化
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanTier, BillingCycle } from './types'
import {
  getSubscriptionCycleDays,
  calculateExtendedExpiry,
  calculateFreezeParams,
} from './pure-functions'
import {
  getActiveSubscription,
  cancelSubscription,
  getFifoPackage,
  getSubscriptionExpiresAt,
  freezeCreditPackage,
} from './subscription-service'

/**
 * Upgrade/Downgrade 准备阶段结果
 */
export interface UpgradeDowngradePrepareResult {
  /** 新订阅ID */
  newSubscriptionId: string
  /** 旧订阅ID */
  oldSubscriptionId: string
  /** FIFO积分包信息（如果有） */
  fifoPackage?: {
    id: string
    amount: number
    remaining_amount: number
    expires_at: string
    created_at: string
  }
}

/**
 * 积分冻结结果
 */
export interface CreditFreezeResult {
  /** 是否成功冻结 */
  frozen: boolean
  /** 冻结的积分包ID */
  packageId?: string
  /** 错误信息（如果失败） */
  error?: string
}

/**
 * Upgrade/Downgrade 参数
 */
export interface UpgradeDowngradeParams {
  userId: string
  planTier: PlanTier
  billingCycle: BillingCycle
  monthlyCredits: number
  creemSubscriptionId: string | null
  action: 'upgrade' | 'downgrade'
}

/**
 * 处理订阅升级/降级的准备阶段
 *
 * 业务逻辑：
 * 1. 获取用户当前活跃订阅
 * 2. 计算延长后的旧订阅到期时间
 * 3. 取消旧订阅（改为cancelled，延长到期时间）
 * 4. 创建新订阅记录
 * 5. 查询FIFO积分包
 *
 * ⚠️ 注意：不执行冻结逻辑！冻结必须在充值新积分之后执行！
 *
 * @param supabaseClient - Supabase Client（依赖注入）
 * @param creditService - Credit Service（用于创建订阅）
 * @param params - 升级/降级参数
 * @returns 准备阶段结果（包含FIFO包信息，供后续冻结使用）
 */
export async function handleUpgradeDowngradePrepare(
  supabaseClient: SupabaseClient,
  creditService: any, // CreditService 类型
  params: UpgradeDowngradeParams
): Promise<UpgradeDowngradePrepareResult> {
  const { userId, planTier, billingCycle, monthlyCredits, creemSubscriptionId, action } = params

  console.log(`🔄 ${action} 操作：创建新订阅 + 保留旧订阅`)

  // Step 1: 获取用户当前的活跃订阅
  const oldSub = await getActiveSubscription(supabaseClient, userId)
  if (!oldSub) {
    throw new Error(`No active subscription found for user ${userId}`)
  }

  const oldSubscriptionId = oldSub.id
  console.log(
    `📌 找到旧订阅: ID=${oldSubscriptionId}, 套餐=${oldSub.plan_tier} ${oldSub.billing_cycle}, 到期=${oldSub.expires_at}`
  )

  // Step 2: 计算新订阅的周期天数
  const newCycleDays = getSubscriptionCycleDays(billingCycle)

  // Step 3: 计算旧订阅的新到期时间 = 原到期时间 + 新订阅周期天数
  const extendedOldExpires = calculateExtendedExpiry(oldSub.expires_at, newCycleDays)
  console.log(
    `📅 旧订阅新到期时间: ${oldSub.expires_at} + ${newCycleDays}天 = ${extendedOldExpires}`
  )

  // Step 4: 将旧订阅改为 cancelled 状态，延长到期时间
  await cancelSubscription(supabaseClient, oldSubscriptionId, userId, extendedOldExpires)

  // Step 5: 创建新订阅记录
  console.log('🆕 创建新订阅记录')
  const newSubscriptionId = await creditService.createSubscription({
    user_id: userId,
    plan_tier: planTier,
    billing_cycle: billingCycle,
    monthly_credits: monthlyCredits,
    creem_subscription_id: creemSubscriptionId,
  })
  console.log(`✅ 新订阅创建成功: ID=${newSubscriptionId}, 套餐=${planTier} ${billingCycle}`)

  // Step 6: 查询FIFO积分包（不执行冻结！）
  console.log(`🔍 查询FIFO积分包...`)
  const fifoPackage = await getFifoPackage(supabaseClient, userId, oldSubscriptionId)

  if (fifoPackage) {
    console.log(`✅ 找到FIFO包: ID=${fifoPackage.id}, 剩余=${fifoPackage.remaining_amount}`)
  } else {
    console.log(`ℹ️  没有找到需要冻结的积分包`)
  }

  return {
    newSubscriptionId,
    oldSubscriptionId,
    fifoPackage: fifoPackage || undefined,  // 🔥 老王修复：将null转换为undefined以匹配接口定义
  }
}

/**
 * 执行积分冻结逻辑（在充值新积分之后调用）
 *
 * 业务逻辑：
 * 1. 获取新订阅的到期时间（作为冻结截止时间）
 * 2. 计算冻结参数（剩余秒数、新到期时间）
 * 3. 更新FIFO包的冻结状态
 *
 * @param supabaseClient - Supabase Client（依赖注入）
 * @param prepareResult - 准备阶段的结果
 * @param action - 操作类型（upgrade/downgrade）
 * @param planTier - 新套餐层级
 * @param billingCycle - 新计费周期
 * @returns 冻结结果
 */
export async function handleCreditFreeze(
  supabaseClient: SupabaseClient,
  prepareResult: UpgradeDowngradePrepareResult,
  action: 'upgrade' | 'downgrade',
  planTier: PlanTier,
  billingCycle: BillingCycle
): Promise<CreditFreezeResult> {
  const { newSubscriptionId, fifoPackage } = prepareResult

  // 如果没有FIFO包，直接返回
  if (!fifoPackage) {
    console.log(`ℹ️  没有需要冻结的积分包`)
    return { frozen: false }
  }

  try {
    console.log(`🧊 开始冻结积分: packageId=${fifoPackage.id}`)

    // Step 1: 获取新订阅的到期时间（作为冻结截止时间）
    const newSubExpiresAt = await getSubscriptionExpiresAt(supabaseClient, newSubscriptionId)
    console.log(`🔍 新订阅到期时间: ${newSubExpiresAt}`)

    // Step 2: 计算冻结参数
    const freezeParams = calculateFreezeParams(fifoPackage.expires_at, newSubExpiresAt)
    console.log(`🔍 冻结参数: 剩余秒数=${freezeParams.remainingSeconds}, 新到期=${freezeParams.newExpiresAt}`)

    // Step 3: 执行冻结
    await freezeCreditPackage(
      supabaseClient,
      fifoPackage.id,
      newSubExpiresAt, // frozen_until
      freezeParams.remainingSeconds,
      freezeParams.newExpiresAt,
      fifoPackage.expires_at, // original_expires_at
      `${action} to ${planTier} ${billingCycle}`
    )

    console.log(`✅ 积分冻结成功: packageId=${fifoPackage.id}`)
    return { frozen: true, packageId: fifoPackage.id }
  } catch (error) {
    console.error(`❌ 积分冻结失败:`, error)
    return {
      frozen: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
