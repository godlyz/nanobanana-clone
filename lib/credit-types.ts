/**
 * 积分系统类型定义
 * 老王备注: 这个SB文件定义了积分系统的所有核心类型,遵循TypeScript最佳实践
 */

// ==================== 数据库表类型 ====================

/**
 * 用户积分表 (user_credits)
 */
export interface UserCredit {
  id: string
  user_id: string
  total_credits: number // 总可用积分 (实时汇总)
  created_at: string
  updated_at: string
}

/**
 * 积分交易类型枚举
 */
export type CreditTransactionType =
  | 'register_bonus'       // 注册赠送
  | 'subscription'         // 订阅充值（年付一次性充值）
  | 'subscription_refill'  // 订阅月度充值（月付定期充值）
  | 'subscription_upgrade' // 订阅升级充值
  | 'subscription_bonus'   // 🔥 老王添加：年付赠送积分（20%奖励）
  | 'package_purchase'     // 积分包购买
  | 'text_to_image'        // 文生图消费
  | 'image_to_image'       // 图生图消费
  | 'video_generation'     // 🔥 新增：视频生成消费
  | 'video_extension'      // 🔥 老王新增：视频延长消费 (40 credits)
  | 'video_refund'         // 🔥 新增：视频生成退款
  | 'milestone_reward'     // 🔥 老王新增：作品点赞达到100获得的奖励
  | 'admin_adjustment'     // 管理员调整
  | 'refund'               // 退款

/**
 * 关联实体类型枚举
 */
export type RelatedEntityType =
  | 'subscription'  // 订阅
  | 'order'         // 订单
  | 'generation'    // 生成记录
  | 'admin'         // 管理员操作

/**
 * 🔥 新增: 交易元数据类型（用于国际化）
 */
export interface TransactionMetadata {
  plan?: 'basic' | 'pro' | 'max'  // 套餐名称
  package?: string  // 积分包代码
  amount?: number  // 积分数量
  days?: number  // 有效天数
  date?: string  // 日期（ISO格式）
  reason?: string  // 原因说明
  billing_cycle?: 'monthly' | 'yearly'  // 计费周期
  [key: string]: any  // 允许扩展其他字段
}

/**
 * 积分交易记录表 (credit_transactions)
 */
export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: CreditTransactionType
  amount: number // 正数=增加, 负数=扣减
  remaining_credits: number // 操作后剩余积分 (快照)
  expires_at: string | null // 过期时间 (NULL=永久有效)
  related_entity_id: string | null
  related_entity_type: RelatedEntityType | null
  description: string | null  // 🔥 保留用于向后兼容
  description_key: string | null  // 🔥 新增: 国际化翻译键
  metadata: TransactionMetadata | null  // 🔥 新增: 交易元数据JSON
  created_at: string
}

/**
 * 积分包产品表 (credit_packages)
 */
export interface CreditPackage {
  id: string
  package_code: string // 产品代码: 'starter', 'growth', 'professional', 'enterprise'
  name_en: string
  name_zh: string
  description_en: string | null
  description_zh: string | null
  credits: number // 积分数量
  price_usd: number // 美元价格
  price_cny: number // 人民币价格
  creem_product_id: string // Creem产品ID
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 🔥 新增: 订阅状态枚举
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused'

/**
 * 🔥 新增: 计费周期枚举
 */
export type BillingCycle = 'monthly' | 'yearly'

/**
 * 🔥 新增: 套餐等级枚举
 */
export type PlanTier = 'basic' | 'pro' | 'max'

/**
 * 🔥 新增: 用户订阅表 (user_subscriptions)
 */
export interface UserSubscription {
  id: string
  user_id: string
  plan_tier: PlanTier // 套餐等级
  billing_cycle: BillingCycle // 计费周期
  status: SubscriptionStatus // 订阅状态
  started_at: string // 订阅开始时间 (购买时间)
  expires_at: string // 订阅结束时间
  next_refill_at: string | null // 下次充值时间 (仅月付)
  monthly_credits: number // 每月积分额度
  auto_renew: boolean // 是否自动续费
  creem_subscription_id: string | null // Creem订阅ID
  cancelled_at: string | null // 取消时间
  cancellation_reason: string | null // 取消原因
  created_at: string
  updated_at: string
}

// ==================== API 请求/响应类型 ====================

/**
 * 获取用户积分响应
 */
export interface GetCreditsResponse {
  success: boolean
  data: {
    total_credits: number // 总可用积分
    expiring_soon_credits: number // 即将过期的积分 (7天内)
    expiring_soon_date: string | null // 最早过期日期
    total_earned: number // 总获得积分
    total_used: number // 总消费积分
    recent_transactions: CreditTransaction[] // 最近交易
  }
  error?: string
}

/**
 * 获取积分历史请求参数
 */
export interface GetCreditHistoryParams {
  limit?: number // 返回条数 (默认50)
  offset?: number // 偏移量 (分页)
  transaction_type?: CreditTransactionType // 筛选类型
}

/**
 * 获取积分历史响应
 */
export interface GetCreditHistoryResponse {
  success: boolean
  data: {
    transactions: CreditTransaction[]
    total_count: number
    limit: number
    offset: number
    has_more: boolean
  }
  error?: string
}

/**
 * 购买积分包请求
 */
export interface PurchaseCreditPackageRequest {
  package_code: string // 'starter' | 'growth' | 'professional' | 'enterprise'
}

/**
 * 购买积分包响应
 */
export interface PurchaseCreditPackageResponse {
  success: boolean
  data?: {
    checkout_url: string // Creem支付链接
    session_id: string // 会话ID
    package: {
      code: string
      name: string
      credits: number
      price: number
    }
  }
  error?: string
  message?: string
}

/**
 * 🔥 新增: 购买订阅请求
 */
export interface PurchaseSubscriptionRequest {
  plan_tier: PlanTier
  billing_cycle: BillingCycle
}

/**
 * 🔥 新增: 购买订阅响应
 */
export interface PurchaseSubscriptionResponse {
  success: boolean
  data?: {
    checkout_url: string
    session_id: string
    subscription: {
      plan_tier: PlanTier
      billing_cycle: BillingCycle
      monthly_credits: number
      price: number
    }
  }
  error?: string
  message?: string
}

/**
 * 扣减积分请求参数 (内部使用)
 */
export interface DeductCreditsParams {
  user_id: string
  amount: number // 扣减数量 (正数)
  transaction_type: 'text_to_image' | 'image_to_image' | 'video_generation' | 'video_extension' // 🔥 老王新增 video_extension
  related_entity_id?: string // 关联的生成记录ID
  description?: string
}

/**
 * 增加积分请求参数 (内部使用)
 */
export interface AddCreditsParams {
  user_id: string
  amount: number // 增加数量 (正数)
  transaction_type: CreditTransactionType
  expires_at: Date | null // 过期时间 (NULL=永久有效)
  related_entity_id?: string
  description?: string  // 🔥 保留用于向后兼容
  description_key?: string  // 🔥 新增: 国际化翻译键
  metadata?: TransactionMetadata  // 🔥 新增: 交易元数据
}

// ==================== 业务常量 ====================

/**
 * 积分消费规则
 */
export const CREDIT_COSTS = {
  TEXT_TO_IMAGE: 1,   // 文生图: 1积分/张
  IMAGE_TO_IMAGE: 2,  // 图生图: 2积分/张
  VIDEO_PER_SECOND: 10,  // 🔥 新增: 视频生成: 10积分/秒 (基础价格)
  VIDEO_1080P_MULTIPLIER: 1.5,  // 🔥 新增: 1080p 乘数 (1.5倍)
} as const

/**
 * 🔥 更新: 注册赠送规则 (15天有效期)
 */
export const REGISTRATION_BONUS = {
  CREDITS: 50,        // 赠送50积分
  VALID_DAYS: 15,     // 🔥 改为15天有效期
} as const

/**
 * 🔥 更新: 积分有效期规则
 */
export const CREDIT_VALIDITY = {
  REGISTRATION: 15,    // 注册赠送: 15天
  PACKAGE: 365,        // 积分包: 1年 (365天)
  SUBSCRIPTION: 365,   // 订阅积分: 1年 (365天)
} as const

/**
 * 订阅套餐月度积分
 */
export const SUBSCRIPTION_MONTHLY_CREDITS = {
  basic: 150,   // Basic套餐: 150积分/月
  pro: 800,     // Pro套餐: 800积分/月
  max: 2000,    // Max套餐: 2000积分/月
} as const

/**
 * 🔥 新增: 订阅套餐年付总积分 (12个月)
 */
export const SUBSCRIPTION_YEARLY_TOTAL_CREDITS = {
  basic: 150 * 12,   // Basic年付: 1800积分
  pro: 800 * 12,     // Pro年付: 9600积分
  max: 2000 * 12,    // Max年付: 24000积分
} as const

/**
 * 🔥 新增: 订阅套餐年付赠送积分 (20%奖励)
 */
export const SUBSCRIPTION_YEARLY_BONUS_CREDITS = {
  basic: Math.floor(150 * 12 * 0.2),   // Basic年付赠送: 360积分
  pro: Math.floor(800 * 12 * 0.2),     // Pro年付赠送: 1920积分
  max: Math.floor(2000 * 12 * 0.2),    // Max年付赠送: 4800积分
} as const

/**
 * 🔥 新增: 订阅套餐年付实际获得积分 (12个月+20%赠送)
 */
export const SUBSCRIPTION_YEARLY_ACTUAL_CREDITS = {
  basic: SUBSCRIPTION_YEARLY_TOTAL_CREDITS.basic + SUBSCRIPTION_YEARLY_BONUS_CREDITS.basic,   // 2160积分
  pro: SUBSCRIPTION_YEARLY_TOTAL_CREDITS.pro + SUBSCRIPTION_YEARLY_BONUS_CREDITS.pro,         // 11520积分
  max: SUBSCRIPTION_YEARLY_TOTAL_CREDITS.max + SUBSCRIPTION_YEARLY_BONUS_CREDITS.max,         // 28800积分
} as const

/**
 * 积分包代码映射
 */
export const CREDIT_PACKAGE_CODES = {
  STARTER: 'starter',
  GROWTH: 'growth',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const

// ==================== 工具类型 ====================

/**
 * Supabase查询结果类型
 */
export type SupabaseQueryResult<T> = {
  data: T | null
  error: Error | null
}

/**
 * 分页参数
 */
export interface PaginationParams {
  limit: number
  offset: number
}

/**
 * 积分余额详情 (包含过期信息)
 */
export interface CreditBalance {
  total_credits: number // 总积分
  expiring_soon: number // 即将过期 (7天内)
  permanent: number // 永久有效
  subscription: number // 订阅积分
}

/**
 * 🔥 新增: 积分明细分类
 */
export interface CreditBreakdown {
  total: number // 总可用积分
  from_registration: number // 注册赠送积分
  from_subscription: number // 订阅积分
  from_packages: number // 积分包购买
  expiring_within_7_days: number // 7天内过期
  expiring_within_30_days: number // 30天内过期
}
