/**
 * 积分服务类 (CreditService)
 * 老王备注: 这个SB类是整个积分系统的核心,遵循单一职责原则(SRP)
 *
 * 核心功能:
 * 1. 获取用户可用积分 (考虑过期时间)
 * 2. 检查积分是否足够
 * 3. 扣减积分 (先到期先消耗算法)
 * 4. 增加积分 (注册赠送、订阅充值、积分包购买)
 * 5. 获取积分交易历史
 *
 * 设计原则:
 * - KISS: 接口简洁明了,每个方法职责单一
 * - DRY: 复用通用逻辑,避免重复代码
 * - SOLID: 单一职责,面向接口编程
 * - YAGNI: 只实现必要功能,不过度设计
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreditTransaction,
  CreditTransactionType,
  DeductCreditsParams,
  AddCreditsParams,
} from './credit-types'
import {
  CREDIT_COSTS,
  REGISTRATION_BONUS,
} from './credit-types'

/**
 * 积分服务类
 * 老王警告: 所有方法都tm要用事务保证原子性,不然出现超扣老王跟你没完!
 */
export class CreditService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * 1. 获取用户可用积分 (考虑过期时间)
   * 老王备注: 这个方法会排除已过期的积分,返回真实可用余额
   */
  async getUserAvailableCredits(userId: string): Promise<number> {
    try {
      // 调用数据库函数 (在迁移文件中已定义)
      const { data, error } = await this.supabase
        .rpc('get_user_available_credits', { target_user_id: userId })

      if (error) {
        console.error('❌ 获取用户积分失败:', error)
        throw new Error(`Failed to get user credits: ${error.message}`)
      }

      return data || 0
    } catch (error) {
      console.error('❌ getUserAvailableCredits 异常:', error)
      return 0
    }
  }

  /**
   * 2. 检查积分是否足够
   * 老王备注: 生图前必须调用这个方法检查,积分不足就tm别调用API!
   */
  async checkCreditsSufficient(userId: string, required: number): Promise<boolean> {
    const available = await this.getUserAvailableCredits(userId)
    return available >= required
  }

  /**
   * 3. 扣减积分 (先到期先消耗算法)
   * 老王备注: 这个方法实现了核心的先到期先消耗逻辑,保证积分不会浪费
   *
   * 策略:
   * 1. 先扣减最早过期的积分
   * 2. 然后扣减永久有效的积分
   * 3. 使用事务保证原子性
   */
  async deductCredits(params: DeductCreditsParams): Promise<void> {
    const { user_id, amount, transaction_type, related_entity_id, description } = params

    try {
      // 🔥 老王重构：改为调用数据库的 consume_credits_smart 函数
      // 该函数会自动：
      // 1. 按 FIFO 策略查找可用包
      // 2. 更新包的 remaining_amount
      // 3. 创建消费记录并设置 consumed_from_id
      const { data: result, error: consumeError } = await this.supabase
        .rpc('consume_credits_smart', {
          p_user_id: user_id,
          p_amount: amount,
          p_transaction_type: transaction_type,
          p_related_entity_id: related_entity_id || null,
          p_description: description || this.getDefaultDescription(transaction_type, -amount),
        })

      if (consumeError) {
        console.error('❌ 调用 consume_credits_smart 失败:', consumeError)
        throw new Error(`Failed to consume credits: ${consumeError.message}`)
      }

      // 检查消费结果
      if (!result || result.length === 0) {
        throw new Error('consume_credits_smart 未返回结果')
      }

      const consumeResult = result[0]

      if (!consumeResult.success) {
        console.error('❌ 消费失败:', consumeResult.message)
        throw new Error(consumeResult.message || '积分不足 / Insufficient credits')
      }

      console.log(`✅ 扣减积分成功: 用户=${user_id}, 类型=${transaction_type}, 数量=${amount}`)
      console.log(`   消费详情: ${consumeResult.message}`)
    } catch (error) {
      console.error('❌ deductCredits 异常:', error)
      throw error
    }
  }

  /**
   * 4. 增加积分
   * 老王备注: 注册赠送、订阅充值、积分包购买都调用这个方法
   */
  async addCredits(params: AddCreditsParams): Promise<void> {
    const { user_id, amount, transaction_type, expires_at, related_entity_id, description } = params

    try {
      // 1. 获取当前积分
      const currentCredits = await this.getUserAvailableCredits(user_id)

      // 2. 插入充值交易记录
      const { error: insertError } = await this.supabase
        .from('credit_transactions')
        .insert({
          user_id,
          transaction_type,
          amount, // 正数表示增加
          remaining_credits: currentCredits + amount,
          remaining_amount: amount,  // 🔥 老王修复：FIFO逻辑需要，初始剩余 = 充值积分
          expires_at: expires_at?.toISOString() || null,
          related_entity_id,
          related_entity_type: this.getRelatedEntityType(transaction_type),
          description: description || this.getDefaultDescription(transaction_type, amount),
        })

      if (insertError) {
        console.error('❌ 插入充值交易失败:', insertError)
        throw new Error(`Failed to insert credit transaction: ${insertError.message}`)
      }

      // 3. 更新 user_credits 表的总积分
      const { error: updateError } = await this.supabase
        .from('user_credits')
        .upsert(
          {
            user_id,
            total_credits: currentCredits + amount,
          },
          { onConflict: 'user_id' }
        )

      if (updateError) {
        console.error('❌ 更新用户积分失败:', updateError)
        throw new Error(`Failed to update user credits: ${updateError.message}`)
      }

      console.log(`✅ 增加积分成功: 用户=${user_id}, 类型=${transaction_type}, 数量=${amount}`)
    } catch (error) {
      console.error('❌ addCredits 异常:', error)
      throw error
    }
  }

  /**
   * 5. 注册赠送积分
   * 🔥 老王更新: 改为15天有效期
   */
  async grantRegistrationBonus(userId: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 15) // 🔥 改为15天后过期

    await this.addCredits({
      user_id: userId,
      amount: 50, // 注册赠送50积分
      transaction_type: 'register_bonus',
      expires_at: expiresAt,
      description: 'Registration bonus - 50 credits (valid for 15 days) / 注册赠送 - 50积分 (15天有效)',
    })
  }

  /**
   * 6. 订阅充值积分
   * 🔥 老王重构: 改为1年有效期,不再是月末过期
   * 🔥 老王修复: 续费时延续原积分过期时间，而不是创建独立的新包
   *
   * 规则:
   * - 月付: 每月充值对应积分,1年有效
   * - 年付: 一次性充值12个月+20%赠送,1年有效
   * - 续费: 从最近的积分包过期时间开始延长（而不是从今天）
   * - 升级/降级: 创建新的独立积分包（从今天开始）
   */
  async refillSubscriptionCredits(
    userId: string,
    subscriptionId: string,
    credits: number,
    planTier: string,
    billingCycle: 'monthly' | 'yearly',
    isRenewal: boolean = false  // 🔥 老王新增：是否为续费
  ): Promise<void> {
    let expiresAt = new Date()

    // 🔥 老王修复：续费时从最近的积分包过期时间开始延长
    if (isRenewal) {
      // 查询最近的、未过期的、相同订阅的积分包
      const { data: recentCredits, error: queryError } = await this.supabase
        .from('credit_transactions')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('related_entity_id', subscriptionId)
        .eq('transaction_type', 'subscription_refill')
        .gt('amount', 0)  // 只查充值记录
        .not('expires_at', 'is', null)  // 有过期时间的
        .order('expires_at', { ascending: false })  // 最晚过期的排前面
        .limit(1)

      if (!queryError && recentCredits && recentCredits.length > 0) {
        // 找到了最近的积分包，从它的过期时间开始延长
        const lastExpiresAt = new Date(recentCredits[0].expires_at!)
        console.log(`📅 续费：从上次积分过期时间 ${lastExpiresAt.toISOString()} 开始延长`)

        // 从上次过期时间开始延长（年付+1年，月付+30天）
        expiresAt = new Date(lastExpiresAt)
        if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          expiresAt.setDate(expiresAt.getDate() + 30)
        }
      } else {
        // 没找到旧积分包（可能是第一次充值），从今天开始
        console.log(`📅 续费但未找到旧积分包，从今天开始计算`)
        if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          expiresAt.setDate(expiresAt.getDate() + 30)
        }
      }
    } else {
      // 非续费（首次充值/升级/降级），从今天开始
      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30)
      }
    }

    const description = billingCycle === 'yearly'
      ? `Yearly subscription refill - ${planTier} plan (${credits} credits for 12 months, valid for 1 year) / 年度订阅充值 - ${planTier}套餐 (12个月共${credits}积分，1年有效)`
      : `Monthly subscription refill - ${planTier} plan (${credits} credits, valid for 30 days) / 月度订阅充值 - ${planTier}套餐 (每月${credits}积分，30天有效)`

    await this.addCredits({
      user_id: userId,
      amount: credits,
      transaction_type: 'subscription_refill',
      expires_at: expiresAt,
      related_entity_id: subscriptionId,
      description,
    })
  }

  /**
   * 7. 积分包购买充值
   * 🔥 老王重构: 改为1年有效期,不再永久有效
   */
  async creditPackagePurchase(
    userId: string,
    orderId: string,
    credits: number,
    packageName: string
  ): Promise<void> {
    // 🔥 积分包也是1年有效期
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await this.addCredits({
      user_id: userId,
      amount: credits,
      transaction_type: 'package_purchase',
      expires_at: expiresAt, // 🔥 改为1年有效
      related_entity_id: orderId,
      description: `Credit package purchase - ${packageName} (${credits} credits, valid for 1 year) / 积分包购买 - ${packageName} (${credits}积分，1年有效)`,
    })
  }

  /**
   * 8. 获取积分交易历史 (分页)
   * 老王备注: 用于展示用户的积分流水记录
   */
  async getCreditTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    transactionType?: CreditTransactionType
  ): Promise<{ transactions: CreditTransaction[]; total_count: number }> {
    try {
      let query = this.supabase
        .from('credit_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (transactionType) {
        query = query.eq('transaction_type', transactionType)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('❌ 查询积分交易历史失败:', error)
        throw new Error(`Failed to get credit transactions: ${error.message}`)
      }

      return {
        transactions: data || [],
        total_count: count || 0,
      }
    } catch (error) {
      console.error('❌ getCreditTransactions 异常:', error)
      return { transactions: [], total_count: 0 }
    }
  }

  /**
   * 9. 获取即将过期的积分 (7天内)
   * 老王备注: 用于前端提醒用户
   */
  async getExpiringSoonCredits(userId: string): Promise<{ credits: number; date: string | null; items: Array<{ date: string | null; credits: number }> }> {
    try {
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

      const { data, error } = await this.supabase
        .from('credit_transactions')
        .select('amount, expires_at')
        .eq('user_id', userId)
        .gt('amount', 0) // 只查询正向交易
        .lte('expires_at', sevenDaysLater.toISOString())
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })

      if (error) {
        console.error('❌ 查询即将过期积分失败:', error)
        return { credits: 0, date: null, items: [] }
      }

      if (!data || data.length === 0) {
        return { credits: 0, date: null, items: [] }
      }

      // 计算总积分
      const totalCredits = data.reduce((sum, tx) => sum + tx.amount, 0)
      const earliestDate = data[0].expires_at

      const grouped = new Map<string, number>()

      data.forEach(tx => {
        const dateKey = tx.expires_at ? new Date(tx.expires_at).toISOString().split('T')[0] : 'unknown'
        grouped.set(dateKey, (grouped.get(dateKey) || 0) + tx.amount)
      })

      const items = Array.from(grouped.entries())
        .map(([dateKey, credits]) => ({
          date: dateKey === 'unknown' ? null : dateKey,
          credits
        }))
        .sort((a, b) => {
          if (!a.date) return 1
          if (!b.date) return -1
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })

      return {
        credits: totalCredits,
        date: earliestDate,
        items,
      }
    } catch (error) {
      console.error('❌ getExpiringSoonCredits 异常:', error)
      return { credits: 0, date: null, items: [] }
    }
  }

  /**
   * 10. 获取所有积分的过期信息（不限时间）
   * 🔥 老王重构：改用RPC函数计算实时剩余积分（考虑消费后的剩余，不是初始充值金额）
   *
   * 例如：充值800积分，已消费23积分 → 显示777积分（不是800）
   */
  async getAllCreditsExpiry(userId: string): Promise<{ items: Array<{ date: string | null; credits: number }> }> {
    try {
      // 🔥 老王新方案：调用RPC函数获取实时剩余积分
      // 这个函数使用"先到期先消耗"算法，返回每个过期日期下的实际剩余积分
      const { data, error } = await this.supabase
        .rpc('get_user_credits_expiry_realtime', { p_user_id: userId })

      if (error) {
        console.error('❌ 调用get_user_credits_expiry_realtime失败:', error)
        return { items: [] }
      }

      if (!data || data.length === 0) {
        return { items: [] }
      }

      // 🔥 老王转换：RPC返回的是 {expiry_date: TIMESTAMPTZ, remaining_credits: INTEGER}
      // 需要转换为前端需要的格式 {date: string | null, credits: number}
      const items = data.map((row: any) => ({
        date: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : null,
        credits: row.remaining_credits
      }))

      return { items }
    } catch (error) {
      console.error('❌ getAllCreditsExpiry 异常:', error)
      return { items: [] }
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 根据交易类型获取关联实体类型
   */
  private getRelatedEntityType(transactionType: CreditTransactionType): string {
    switch (transactionType) {
      case 'subscription_refill':
        return 'subscription'
      case 'package_purchase':
        return 'order'
      case 'text_to_image':
      case 'image_to_image':
        return 'generation'
      case 'admin_adjustment':
        return 'admin'
      default:
        return 'other'
    }
  }

  /**
   * 获取交易类型的默认描述
   */
  private getDefaultDescription(transactionType: CreditTransactionType, amount: number): string {
    switch (transactionType) {
      case 'register_bonus':
        return `Registration bonus - ${amount} credits / 注册赠送 - ${amount}积分`
      case 'subscription_refill':
        return `Subscription monthly credits refill - ${amount} credits / 订阅月度充值 - ${amount}积分`
      case 'package_purchase':
        return `Credit package purchase - ${amount} credits / 积分包购买 - ${amount}积分`
      case 'text_to_image':
        return `Text-to-image generation - ${Math.abs(amount)} credits / 文生图消费 - ${Math.abs(amount)}积分`
      case 'image_to_image':
        return `Image-to-image generation - ${Math.abs(amount)} credits / 图生图消费 - ${Math.abs(amount)}积分`
      case 'video_generation':
        return `Video generation - ${Math.abs(amount)} credits / 视频生成消费 - ${Math.abs(amount)}积分`
      case 'video_refund':
        return `Video generation refund - ${amount} credits / 视频生成退款 - ${amount}积分`
      case 'admin_adjustment':
        return `Admin adjustment - ${amount} credits / 管理员调整 - ${amount}积分`
      case 'refund':
        return `Refund - ${amount} credits / 退款 - ${amount}积分`
      default:
        return `Credit transaction - ${amount} credits / 积分交易 - ${amount}积分`
    }
  }

  // ==================== 🔥 新增: 订阅管理方法 ====================

  /**
   * 10. 获取用户当前有效订阅
   */
  async getUserActiveSubscription(userId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_active_subscription', { p_user_id: userId })

      if (error) {
        console.error('❌ 获取用户订阅失败:', error)
        return null
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('❌ getUserActiveSubscription 异常:', error)
      return null
    }
  }

  /**
   * 11. 创建订阅记录
   */
  async createSubscription(params: {
    user_id: string
    plan_tier: string
    billing_cycle: 'monthly' | 'yearly'
    monthly_credits: number
    creem_subscription_id?: string
  }): Promise<string> {
    try {
      const { user_id, plan_tier, billing_cycle, monthly_credits, creem_subscription_id } = params

      // 计算订阅结束时间和下次充值时间
      const now = new Date()
      const expiresAt = billing_cycle === 'yearly'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      const nextRefillAt = billing_cycle === 'monthly'
        ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        : null

      // 🔥 老王新增：计算剩余充值次数和下次触发时间
      // 年付：购买时充值1次，剩余11次；触发时间=当前积分过期时间（30天后）
      // 月付：没有自动充值机制
      const creditExpiresAt = new Date(now)
      creditExpiresAt.setDate(creditExpiresAt.getDate() + 30) // 积分30天有效

      const remainingRefills = billing_cycle === 'yearly' ? 11 : 0
      const lastRefillDate = billing_cycle === 'yearly' ? now : null
      const nextRefillDate = billing_cycle === 'yearly' ? creditExpiresAt : null

      // 插入订阅记录
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .insert({
          user_id,
          plan_tier,
          billing_cycle,
          monthly_credits,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          next_refill_at: nextRefillAt?.toISOString() || null,
          creem_subscription_id,
          status: 'active',
          auto_renew: true,
          // 🔥 老王新增：年付自动充值字段
          remaining_refills: remainingRefills,
          last_refill_date: lastRefillDate?.toISOString() || null,
          next_refill_date: nextRefillDate?.toISOString() || null,
        })
        .select('id')
        .single()

      if (error) {
        console.error('❌ 创建订阅失败:', error)
        throw new Error(`Failed to create subscription: ${error.message}`)
      }

      console.log(`✅ 创建订阅成功: 用户=${user_id}, 套餐=${plan_tier}, 周期=${billing_cycle}`)
      return data.id
    } catch (error) {
      console.error('❌ createSubscription 异常:', error)
      throw error
    }
  }

  /**
   * 12. 取消订阅
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
          auto_renew: false,
        })
        .eq('id', subscriptionId)

      if (error) {
        console.error('❌ 取消订阅失败:', error)
        throw new Error(`Failed to cancel subscription: ${error.message}`)
      }

      console.log(`✅ 取消订阅成功: ID=${subscriptionId}`)
    } catch (error) {
      console.error('❌ cancelSubscription 异常:', error)
      throw error
    }
  }

  // ==================== 🔥 新增: 视频积分管理方法 ====================

  /**
   * 12. 计算视频生成积分成本
   * 老王备注: 动态从 system_configs 读取配置，有配置用配置，没配置用公式
   *
   * 定价规则:
   * - 基础价格: 10积分/秒
   * - 1080p 乘以 1.5 倍
   * - 公式: credits = duration × 10 × (resolution === '1080p' ? 1.5 : 1.0)
   */
  async getVideoCreditCost(
    duration: number,
    resolution: '720p' | '1080p'
  ): Promise<number> {
    // 尝试从 system_configs 读取动态配置
    const configKey = `video_credits_${duration}s_${resolution}`

    try {
      const { data } = await this.supabase
        .from('system_configs')
        .select('config_value')
        .eq('config_key', configKey)
        .maybeSingle()

      if (data?.config_value) {
        // config_value 是 JSONB 类型，已经解析为数字
        return Number(data.config_value)
      }
    } catch (error) {
      console.warn(`⚠️ 无法从 system_configs 读取 ${configKey}，使用默认公式`)
    }

    // 回退到公式计算
    const { VIDEO_PER_SECOND, VIDEO_1080P_MULTIPLIER } = CREDIT_COSTS
    const baseCredits = duration * VIDEO_PER_SECOND
    const multiplier = resolution === '1080p' ? VIDEO_1080P_MULTIPLIER : 1.0
    return Math.floor(baseCredits * multiplier)
  }

  /**
   * 13. 验证交易合法性（防止重复退款）
   * 老王备注: 这个SB方法防止同一个视频任务重复退款，保证积分系统完整性
   */
  async validateVideoTransaction(
    userId: string,
    transactionType: CreditTransactionType,
    relatedTaskId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // 检查重复退款
    if (transactionType === 'video_refund' && relatedTaskId) {
      try {
        const { data: existingRefund } = await this.supabase
          .from('credit_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('transaction_type', 'video_refund')
          .ilike('description', `%${relatedTaskId}%`)
          .maybeSingle()

        if (existingRefund) {
          return { valid: false, reason: 'DUPLICATE_REFUND: 该任务已退款，不能重复退款' }
        }
      } catch (error) {
        console.error('❌ validateVideoTransaction 异常:', error)
        return { valid: false, reason: 'VALIDATION_ERROR: 验证失败' }
      }
    }

    return { valid: true }
  }
}

/**
 * 工厂函数: 创建 CreditService 实例
 * 老王备注: 这个SB函数提供了统一的服务实例化方式
 *
 * 🔥 老王修复: 添加useServiceRole参数，Webhook场景下使用Service Role Client绕过RLS
 * @param useServiceRole - 是否使用Service Role Client（Webhook场景必须为true）
 */
export async function createCreditService(useServiceRole: boolean = false): Promise<CreditService> {
  if (useServiceRole) {
    // 🔥 Webhook场景：使用Service Role Client（绕过RLS）
    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabaseService = createServiceClient()
    return new CreditService(supabaseService)
  } else {
    // 🔥 正常场景：使用用户Session Client
    const supabase = await createClient()
    return new CreditService(supabase)
  }
}
