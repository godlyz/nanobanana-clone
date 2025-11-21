/**
 * 🔥 老王的订阅纯函数库
 * 用途：升级/降级/冻结逻辑的计算函数（无副作用，100%可测试）
 *
 * 原则：
 * - 所有函数都是纯函数（相同输入→相同输出，无副作用）
 * - 不依赖外部状态（数据库、全局变量等）
 * - 便于单元测试
 */

import type {
  PlanTier,
  BillingCycle,
  SubscriptionAction,
  FreezeParams,
} from './types'
import { PLAN_HIERARCHY, SUBSCRIPTION_CYCLE_DAYS } from './types'

/**
 * 判断订阅操作类型（upgrade/downgrade/renew/change/purchase）
 *
 * @param currentPlan - 当前套餐（如果没有则为null）
 * @param currentCycle - 当前计费周期（如果没有则为null）
 * @param targetPlan - 目标套餐
 * @param targetCycle - 目标计费周期
 * @returns 订阅操作类型
 *
 * @example
 * determinePlanAction('pro', 'monthly', 'max', 'monthly') // 'upgrade'
 * determinePlanAction('pro', 'yearly', 'basic', 'monthly') // 'downgrade'
 * determinePlanAction('pro', 'monthly', 'pro', 'monthly') // 'renew'
 * determinePlanAction(null, null, 'basic', 'monthly') // 'purchase'
 */
export function determinePlanAction(
  currentPlan: PlanTier | null,
  currentCycle: BillingCycle | null,
  targetPlan: PlanTier,
  targetCycle: BillingCycle
): SubscriptionAction {
  // 没有当前订阅 → 首次购买
  if (!currentPlan || !currentCycle) {
    return 'purchase'
  }

  // 套餐和周期都相同 → 续费
  if (currentPlan === targetPlan && currentCycle === targetCycle) {
    return 'renew'
  }

  const currentLevel = PLAN_HIERARCHY[currentPlan]
  const targetLevel = PLAN_HIERARCHY[targetPlan]

  // 套餐层级提升 → 升级
  if (targetLevel > currentLevel) {
    return 'upgrade'
  }

  // 套餐层级下降 → 降级
  if (targetLevel < currentLevel) {
    return 'downgrade'
  }

  // 同层级切换周期（如Pro月付→Pro年付）→ 切换
  return 'change'
}

/**
 * 计算订阅剩余天数
 *
 * @param expiresAt - 订阅到期时间（ISO 8601格式）
 * @param now - 当前时间（可选，默认为new Date()，用于测试时传入固定时间）
 * @returns 剩余天数（向上取整，最小为0）
 *
 * @example
 * calculateRemainingDays('2025-12-31T23:59:59Z', new Date('2025-01-01'))
 * // 返回 365
 */
export function calculateRemainingDays(
  expiresAt: string,
  now: Date = new Date()
): number {
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * 计算延长后的到期时间
 *
 * @param originalExpiry - 原到期时间（ISO 8601格式）
 * @param additionalDays - 要延长的天数
 * @returns 延长后的到期时间（ISO 8601格式）
 *
 * @example
 * calculateExtendedExpiry('2025-01-01T00:00:00Z', 30)
 * // 返回 '2025-01-31T00:00:00.000Z'
 */
export function calculateExtendedExpiry(
  originalExpiry: string,
  additionalDays: number
): string {
  const expiry = new Date(originalExpiry)
  const extendedMs = expiry.getTime() + additionalDays * 24 * 60 * 60 * 1000
  return new Date(extendedMs).toISOString()
}

/**
 * 获取订阅周期对应的天数
 *
 * @param billingCycle - 计费周期
 * @returns 周期天数（月付30天，年付365天）
 *
 * @example
 * getSubscriptionCycleDays('monthly') // 30
 * getSubscriptionCycleDays('yearly') // 365
 */
export function getSubscriptionCycleDays(billingCycle: BillingCycle): number {
  return SUBSCRIPTION_CYCLE_DAYS[billingCycle]
}

/**
 * 计算积分冻结参数
 *
 * 业务逻辑：
 * 1. 旧积分包的原到期时间是 originalExpiresAt
 * 2. 现在冻结积分，冻结至 frozenUntil（新订阅到期时间）
 * 3. 需要计算：
 *    - remainingSeconds：从现在到原到期时间的剩余秒数
 *    - newExpiresAt：解冻后的新到期时间 = frozenUntil + remainingSeconds
 *
 * @param originalExpiresAt - 原到期时间（ISO 8601格式）
 * @param frozenUntil - 冻结至时间（新订阅到期时间，ISO 8601格式）
 * @param now - 当前时间（可选，默认为new Date()，用于测试时传入固定时间）
 * @returns 冻结参数对象
 *
 * @example
 * // 假设现在是 2025-01-01，旧积分2026-01-01到期，新订阅2025-03-01到期
 * calculateFreezeParams('2026-01-01T00:00:00Z', '2025-03-01T00:00:00Z', new Date('2025-01-01'))
 * // 返回 {
 * //   remainingSeconds: 31536000, // 365天
 * //   newExpiresAt: '2026-01-31T00:00:00.000Z' // 2025-03-01 + 365天
 * // }
 */
export function calculateFreezeParams(
  originalExpiresAt: string,
  frozenUntil: string,
  now: Date = new Date()
): FreezeParams {
  const original = new Date(originalExpiresAt)
  const frozen = new Date(frozenUntil)

  // 计算从现在到原到期时间的剩余秒数
  const diffMs = original.getTime() - now.getTime()
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000))

  // 计算解冻后的新到期时间 = frozenUntil + remainingSeconds
  const newExpiresAtMs = frozen.getTime() + remainingSeconds * 1000
  const newExpiresAt = new Date(newExpiresAtMs).toISOString()

  return {
    remainingSeconds,
    newExpiresAt,
  }
}

/**
 * 验证套餐层级是否有效
 *
 * @param planTier - 套餐名称
 * @returns 是否为有效套餐
 */
export function isValidPlanTier(planTier: string): planTier is PlanTier {
  return planTier in PLAN_HIERARCHY
}

/**
 * 验证计费周期是否有效
 *
 * @param billingCycle - 计费周期
 * @returns 是否为有效计费周期
 */
export function isValidBillingCycle(
  billingCycle: string
): billingCycle is BillingCycle {
  return billingCycle in SUBSCRIPTION_CYCLE_DAYS
}
