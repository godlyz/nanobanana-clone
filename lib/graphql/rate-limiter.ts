/**
 * GraphQL Rate Limiter
 * 老王备注：基于用户订阅层级的 Rate Limiting
 *
 * 艹！这个 Rate Limiter 用于限制 GraphQL 请求频率，防止滥用！
 */

import { RateLimiterMemory } from 'rate-limiter-flexible'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * 用户订阅层级
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  MAX = 'max',
  ADMIN = 'admin',
}

/**
 * Rate Limit 配置（每个层级的限制）
 */
export const RATE_LIMITS: Record<SubscriptionTier, { requestsPerMinute: number; maxComplexity: number }> = {
  [SubscriptionTier.FREE]: {
    requestsPerMinute: 100,  // 免费用户：100 次/分钟
    maxComplexity: 500,      // 免费用户：查询复杂度 ≤ 500
  },
  [SubscriptionTier.BASIC]: {
    requestsPerMinute: 500,  // Basic 用户：500 次/分钟
    maxComplexity: 750,      // Basic 用户：查询复杂度 ≤ 750
  },
  [SubscriptionTier.PRO]: {
    requestsPerMinute: 1000, // Pro 用户：1000 次/分钟
    maxComplexity: 1000,     // Pro 用户：查询复杂度 ≤ 1000
  },
  [SubscriptionTier.MAX]: {
    requestsPerMinute: 2000, // Max 用户：2000 次/分钟
    maxComplexity: 2000,     // Max 用户：查询复杂度 ≤ 2000
  },
  [SubscriptionTier.ADMIN]: {
    requestsPerMinute: 10000, // 管理员：10000 次/分钟（几乎无限制）
    maxComplexity: 5000,      // 管理员：查询复杂度 ≤ 5000
  },
}

/**
 * 创建 Rate Limiters（基于订阅层级）
 * 艹！每个层级都有独立的 Rate Limiter 实例
 */
export const rateLimiters: Record<SubscriptionTier, RateLimiterMemory> = {
  [SubscriptionTier.FREE]: new RateLimiterMemory({
    points: RATE_LIMITS.free.requestsPerMinute,
    duration: 60, // 60秒
    blockDuration: 60, // 超限后阻塞60秒
  }),
  [SubscriptionTier.BASIC]: new RateLimiterMemory({
    points: RATE_LIMITS.basic.requestsPerMinute,
    duration: 60,
    blockDuration: 60,
  }),
  [SubscriptionTier.PRO]: new RateLimiterMemory({
    points: RATE_LIMITS.pro.requestsPerMinute,
    duration: 60,
    blockDuration: 60,
  }),
  [SubscriptionTier.MAX]: new RateLimiterMemory({
    points: RATE_LIMITS.max.requestsPerMinute,
    duration: 60,
    blockDuration: 60,
  }),
  [SubscriptionTier.ADMIN]: new RateLimiterMemory({
    points: RATE_LIMITS.admin.requestsPerMinute,
    duration: 60,
    blockDuration: 60,
  }),
}

/**
 * 特殊操作的更严格限制
 * 艹！这些限制适用于所有用户，不分层级
 */
export const specialLimiters = {
  // Mutations 限制（所有用户）
  mutations: new RateLimiterMemory({
    points: 20, // 每分钟20个mutations
    duration: 60,
    blockDuration: 60,
  }),
  // 文件上传限制（所有用户）
  uploads: new RateLimiterMemory({
    points: 5, // 每分钟5个上传
    duration: 60,
    blockDuration: 120, // 超限后阻塞2分钟
  }),
}

/**
 * 根据用户 ID 获取订阅层级
 * 艹！这个函数查询数据库获取用户的真实订阅状态
 *
 * @param userId - 用户 ID
 * @returns 订阅层级
 */
export async function getUserSubscriptionTier(userId: string | null): Promise<SubscriptionTier> {
  if (!userId) {
    return SubscriptionTier.FREE
  }

  try {
    // 艹！使用 Service Role 客户端查询 user_subscriptions 表
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan_tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // 艹！查询失败或无有效订阅，返回 FREE
      return SubscriptionTier.FREE
    }

    // 艹！将数据库的 plan_tier 映射到 SubscriptionTier 枚举
    const tierMap: Record<string, SubscriptionTier> = {
      basic: SubscriptionTier.BASIC,
      pro: SubscriptionTier.PRO,
      max: SubscriptionTier.MAX,
    }

    return tierMap[data.plan_tier] ?? SubscriptionTier.FREE
  } catch (error) {
    // 艹！出错了就默认返回 FREE，别让整个请求挂掉
    console.error('❌ [Rate Limiter] 查询用户订阅层级失败:', error)
    return SubscriptionTier.FREE
  }
}