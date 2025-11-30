/**
 * 🔥 老王的活动规则缓存服务
 * 用途: 管理活动规则缓存，支持快速价格计算和前端显示
 * 老王警告: 这个SB缓存要是不出问题，否则整个活动系统都要完蛋！
 */

import { redis, CACHE_KEYS, CACHE_TTL } from './redis-client'
import { createServiceClient } from './supabase/service'

// 活动规则类型定义
export interface PromotionRule {
  id: string
  rule_name: string
  rule_type: 'discount' | 'bonus_credits' | 'credits_extension' | 'subscription_extension' | 'bundle'

  // 前端展示字段
  display_name?: string
  display_description?: string
  display_badge?: string
  display_position?: 'pricing_page' | 'checkout' | 'dashboard'

  // 适用范围
  apply_to: {
    type: 'all' | 'subscriptions' | 'packages'
    tiers?: string[]
    package_ids?: string[]
    billing_periods?: string[]  // 🔥 老王 Day 4 添加：订阅计费周期过滤（monthly/yearly）
  }

  // 用户定向
  target_users: {
    type: 'all' | 'new_users' | 'vip_users' | 'specific_users'
    registered_within_days?: number
    subscription_tiers?: string[]
    user_ids?: string[]
  }

  // 折扣配置
  discount_config?: {
    type: 'percentage' | 'fixed'
    value: number
    currency?: string
  }

  // 赠送配置
  gift_config?: {
    type: 'bonus_credits' | 'credits_extension' | 'subscription_extension' | 'trial_extension' | 'free_package'
    amount?: number
    extend_days?: number
    extend_months?: number
    on_purchase?: 'any' | 'subscription' | 'package'
    trigger_count?: number
    description?: string
  }

  // 时间控制
  start_date: string
  end_date: string
  timezone: string

  // 优先级和叠加
  priority: number
  stackable: boolean

  // 使用限制
  conditions?: Record<string, any>
  usage_limit?: number
  usage_count: number
  per_user_limit?: number

  // 状态
  status: 'active' | 'paused' | 'ended'
  is_visible: boolean

  // 审计字段
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

// 价格计算结果
export interface PriceCalculationResult {
  finalPrice: number
  originalPrice: number
  totalDiscount: number
  appliedRules: Array<{
    ruleId: string
    ruleName: string
    discountAmount: number
    discountType: string
    giftDescription?: string
  }>
}

/**
 * 🔥 活动规则缓存管理器
 */
export class PromotionRuleCache {
  private supabase = createServiceClient()

  /**
   * 获取当前生效的活动规则（从缓存）
   */
  async getActiveRules(): Promise<PromotionRule[]> {
    try {
      // 🔥 老王修复：必须传 parseJson=true，否则返回的是字符串而不是数组对象！
      const cached = await redis.get<PromotionRule[]>(CACHE_KEYS.PROMOTION_RULES, true)
      if (cached) {
        console.log('✅ 从缓存获取活动规则')
        return cached
      }

      // 缓存未命中，从数据库加载
      const rules = await this.loadActiveRulesFromDB()
      await this.setCache(rules)
      console.log('✅ 从数据库加载并缓存活动规则')
      return rules
    } catch (error) {
      console.error('❌ 获取活动规则失败:', error)
      return []
    }
  }

  /**
   * 从数据库加载当前生效的活动规则
   */
  private async loadActiveRulesFromDB(): Promise<PromotionRule[]> {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('promotion_rules')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 数据库查询活动规则失败:', error)
      throw error
    }

    return data || []
  }

  /**
   * 设置缓存
   */
  async setCache(rules: PromotionRule[]): Promise<boolean> {
    try {
      const success = await redis.set(
        CACHE_KEYS.PROMOTION_RULES,
        rules,
        CACHE_TTL.PROMOTION_RULES
      )

      if (success) {
        console.log(`✅ 已缓存 ${rules.length} 条活动规则`)
      }

      return success
    } catch (error) {
      console.error('❌ 设置活动规则缓存失败:', error)
      return false
    }
  }

  /**
   * 手动刷新缓存（管理后台修改规则后调用）
   * 🔥 老王修复：即使Redis失败，只要数据库加载成功就返回true
   */
  async refresh(): Promise<boolean> {
    try {
      console.log('🔄 开始刷新活动规则缓存')

      // 清空旧缓存（Redis失败不影响流程）
      try {
        await redis.del(CACHE_KEYS.PROMOTION_RULES)
      } catch (delError) {
        console.warn('⚠️ 清空旧缓存失败（Redis不可用），继续执行:', delError instanceof Error ? delError.message : delError)
      }

      // 从数据库重新加载（这个是关键！）
      const rules = await this.loadActiveRulesFromDB()

      // 尝试设置缓存（Redis失败不影响结果）
      try {
        const cacheSuccess = await this.setCache(rules)
        if (cacheSuccess) {
          console.log(`✅ 活动规则缓存刷新成功，共 ${rules.length} 条规则`)

          // 记录缓存刷新日志
          try {
            await this.logCacheRefresh(rules.length)
          } catch (logError) {
            console.warn('⚠️ 记录缓存刷新日志失败:', logError instanceof Error ? logError.message : logError)
          }
        } else {
          console.warn(`⚠️ Redis缓存写入失败，但数据库已加载 ${rules.length} 条规则`)
        }
      } catch (cacheError) {
        console.warn('⚠️ 设置缓存失败（Redis不可用），但数据库已正常加载:', cacheError instanceof Error ? cacheError.message : cacheError)
      }

      // 🔥 只要数据库加载成功，就返回true
      console.log(`✅ 活动规则刷新完成，共 ${rules.length} 条规则（${rules.length > 0 ? '数据库模式' : 'Redis模式'}）`)
      return true
    } catch (error) {
      console.error('❌ 刷新活动规则缓存失败（数据库错误）:', error)
      return false
    }
  }

  /**
   * 预览活动效果（计算折后价格）
   */
  async previewPriceCalculation(
    basePrice: number,
    itemType: 'subscription' | 'package',
    itemDetails: {
      tier?: string
      package_id?: string
      billing_period?: string
    },
    testRuleIds?: string[]
  ): Promise<PriceCalculationResult> {
    try {
      // 获取所有活动规则
      let allRules: PromotionRule[]

      if (testRuleIds && testRuleIds.length > 0) {
        // 如果指定了测试规则，从数据库获取这些规则
        const { data } = await this.supabase
          .from('promotion_rules')
          .select('*')
          .in('id', testRuleIds)
          .eq('status', 'active')

        allRules = data || []
      } else {
        // 否则获取当前生效的规则
        allRules = await this.getActiveRules()
      }

      // 过滤出适用于当前商品的规则
      const applicableRules = this.filterRulesForItem(allRules, itemType, itemDetails)

      // 按优先级排序
      applicableRules.sort((a, b) => b.priority - a.priority)

      // 应用规则计算折扣
      return this.calculatePriceWithRules(basePrice, applicableRules)
    } catch (error) {
      console.error('❌ 预览价格计算失败:', error)
      return {
        finalPrice: basePrice,
        originalPrice: basePrice,
        totalDiscount: 0,
        appliedRules: []
      }
    }
  }

  /**
   * 判断活动规则是否适用于当前商品
   */
  private filterRulesForItem(
    rules: PromotionRule[],
    itemType: 'subscription' | 'package',
    itemDetails: {
      tier?: string
      package_id?: string
      billing_period?: string
    }
  ): PromotionRule[] {
    return rules.filter(rule => {
      const { apply_to } = rule

      // 全部商品
      if (apply_to.type === 'all') return true

      // 订阅套餐
      if (apply_to.type === 'subscriptions' && itemType === 'subscription') {
        if (apply_to.tiers && itemDetails.tier && !apply_to.tiers.includes(itemDetails.tier)) {
          return false
        }
        if (apply_to.billing_periods && itemDetails.billing_period && !apply_to.billing_periods.includes(itemDetails.billing_period)) {
          return false
        }
        return true
      }

      // 积分包
      if (apply_to.type === 'packages' && itemType === 'package') {
        if (apply_to.package_ids && itemDetails.package_id && !apply_to.package_ids.includes(itemDetails.package_id)) {
          return false
        }
        return true
      }

      return false
    })
  }

  /**
   * 应用规则计算最终价格
   */
  private calculatePriceWithRules(
    basePrice: number,
    applicableRules: PromotionRule[]
  ): PriceCalculationResult {
    let currentPrice = basePrice
    const appliedRules: PriceCalculationResult['appliedRules'] = []

    for (const rule of applicableRules) {
      // 检查使用次数限制
      if (rule.usage_limit && rule.usage_count >= rule.usage_limit) {
        console.log(`⚠️ 规则 ${rule.rule_name} 已达到使用次数限制`)
        continue
      }

      let discountAmount = 0
      let giftDescription: string | undefined

      // 处理折扣规则
      if (rule.discount_config) {
        if (rule.discount_config.type === 'percentage') {
          discountAmount = currentPrice * (rule.discount_config.value / 100)
          currentPrice -= discountAmount
        } else if (rule.discount_config.type === 'fixed') {
          discountAmount = Math.min(rule.discount_config.value, currentPrice)
          currentPrice -= discountAmount
        }
      }

      // 处理赠送规则
      if (rule.gift_config) {
        if (rule.gift_config.type === 'bonus_credits') {
          giftDescription = `赠送 ${rule.gift_config.amount} 积分`
        } else if (rule.gift_config.type === 'credits_extension') {
          giftDescription = `积分有效期延长 ${rule.gift_config.extend_days} 天`
        } else if (rule.gift_config.type === 'subscription_extension') {
          giftDescription = `订阅时长延长 ${rule.gift_config.extend_months} 个月`
        } else if (rule.gift_config.type === 'free_package') {
          giftDescription = rule.gift_config.description || '买赠优惠'
        }
      }

      // 记录应用的规则
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.rule_name,
        discountAmount,
        discountType: rule.discount_config?.type || 'none',
        giftDescription
      })

      // 如果不可叠加，只应用第一个匹配的规则
      if (!rule.stackable) {
        console.log(`🛑️ 规则 ${rule.rule_name} 不可叠加，停止后续规则应用`)
        break
      }
    }

    const finalPrice = Math.max(currentPrice, 0) // 防止负数

    return {
      finalPrice,
      originalPrice: basePrice,
      totalDiscount: basePrice - finalPrice,
      appliedRules
    }
  }

  /**
   * 获取单个活动规则
   */
  async getRuleById(ruleId: string): Promise<PromotionRule | null> {
    try {
      // 🔥 老王修复：必须传 parseJson=true
      const cachedRules = await redis.get<PromotionRule[]>(CACHE_KEYS.PROMOTION_RULES, true)
      if (cachedRules) {
        const rule = cachedRules.find(r => r.id === ruleId)
        if (rule) {
          return rule
        }
      }

      // 缓存未命中或未找到，从数据库获取
      const { data, error } = await this.supabase
        .from('promotion_rules')
        .select('*')
        .eq('id', ruleId)
        .single()

      if (error) {
        console.error('❌ 获取活动规则失败:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('❌ 获取活动规则异常:', error)
      return null
    }
  }

  /**
   * 更新活动规则使用次数
   */
  async incrementRuleUsage(ruleId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('promotion_rules')
        .update({
          usage_count: this.supabase.rpc('increment_usage', { rule_id: ruleId })
        })
        .eq('id', ruleId)

      if (error) {
        console.error('❌ 更新活动规则使用次数失败:', error)
        return false
      }

      // 刷新缓存
      await this.refresh()

      return true
    } catch (error) {
      console.error('❌ 更新活动规则使用次数异常:', error)
      return false
    }
  }

  /**
   * 记录缓存刷新日志
   */
  private async logCacheRefresh(ruleCount: number): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          admin_id: 'system', // 系统自动操作
          action_type: 'cache_refresh',
          resource_type: 'cache',
          new_value: {
            cache_type: 'promotion_rules',
            rule_count: ruleCount,
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      console.error('❌ 记录缓存刷新日志失败:', error)
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    isCacheConnected: boolean
    cacheSize: number
    cacheTtl: number
    lastRefreshTime: string | null
  }> {
    try {
      // 测试Redis连接
      const isConnected = await redis.exists(CACHE_KEYS.PROMOTION_RULES)

      // 获取缓存大小和TTL
      const cachedRules = await redis.get<PromotionRule[]>(CACHE_KEYS.PROMOTION_RULES)
      const cacheSize = cachedRules ? cachedRules.length : 0
      const cacheTtl = await redis.ttl(CACHE_KEYS.PROMOTION_RULES)

      return {
        isCacheConnected: isConnected,
        cacheSize,
        cacheTtl,
        lastRefreshTime: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ 获取缓存统计失败:', error)
      return {
        isCacheConnected: false,
        cacheSize: 0,
        cacheTtl: -1,
        lastRefreshTime: null
      }
    }
  }

  /**
   * 清空缓存（仅限开发环境）
   */
  async clearCache(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 生产环境禁止清空缓存！')
      return false
    }

    try {
      const success = await redis.del(CACHE_KEYS.PROMOTION_RULES)
      if (success) {
        console.log('🧹 开发环境活动规则缓存已清空')
      }
      return success
    } catch (error) {
      console.error('❌ 清空缓存失败:', error)
      return false
    }
  }
}

/**
 * 🔥 导出单例实例
 */
export const promotionRuleCache = new PromotionRuleCache()

/**
 * 🔥 初始化缓存服务
 */
export async function initializePromotionCache(): Promise<void> {
  try {
    console.log('🔥 初始化活动规则缓存服务')

    // 测试Redis连接
    const stats = await promotionRuleCache.getCacheStats()

    if (stats.isCacheConnected) {
      console.log('✅ Redis连接正常')
      console.log(`📊 当前缓存: ${stats.cacheSize} 条规则`)
      console.log(`⏰ 缓存TTL: ${stats.cacheTtl} 秒`)
    } else {
      console.warn('⚠️ Redis连接异常，将使用直连数据库模式')
    }
  } catch (error) {
    console.error('❌ 初始化活动规则缓存服务失败:', error)
  }
}

console.log('🔥 活动规则缓存模块加载完成')