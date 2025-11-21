/**
 * 🔥 老王的订阅类型定义
 * 用途：upgrade/downgrade 逻辑的类型安全
 */

/**
 * 订阅套餐层级
 */
export type PlanTier = 'basic' | 'pro' | 'max'

/**
 * 计费周期
 */
export type BillingCycle = 'monthly' | 'yearly'

/**
 * 订阅操作类型
 */
export type SubscriptionAction =
  | 'purchase'   // 首次购买
  | 'renew'      // 续费
  | 'upgrade'    // 升级
  | 'downgrade'  // 降级
  | 'change'     // 同级别切换（如Pro月付→Pro年付）

/**
 * 套餐层级映射
 */
export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  basic: 1,
  pro: 2,
  max: 3,
}

/**
 * 订阅周期天数
 */
export const SUBSCRIPTION_CYCLE_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  yearly: 365,
}

/**
 * 冻结参数计算结果
 */
export interface FreezeParams {
  /** 剩余秒数（从现在到原到期时间） */
  remainingSeconds: number
  /** 新到期时间（冻结解除后的到期时间） */
  newExpiresAt: string
}

/**
 * 订阅信息（简化版）
 */
export interface SubscriptionInfo {
  id: string
  plan_tier: PlanTier
  billing_cycle: BillingCycle
  expires_at: string
  status: 'active' | 'cancelled' | 'expired'
}
