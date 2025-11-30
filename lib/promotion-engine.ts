/**
 * 🔥 老王的活动规则引擎 - 智能价格计算核心
 * 用途: 统一的活动规则计算引擎，支持折扣、赠送、延期等多种活动类型
 * 老王警告: 这个SB引擎要是算错价格，整个商业系统都要完蛋！
 */

import { PromotionRule, PriceCalculationResult } from './promotion-rule-cache'
import { promotionRuleCache } from './promotion-rule-cache'

// 商品类型定义
export type ItemType = 'subscription' | 'package'

// 商品详情接口
export interface ItemDetails {
  tier?: string           // 订阅等级: basic, pro, max
  billing_period?: string // 计费周期: monthly, yearly
  package_id?: string     // 积分包ID: starter, value, pro, enterprise
  price?: number         // 商品原价
  currency?: string      // 货币: USD
}

// 用户定向结果
export interface UserTargetingResult {
  isApplicable: boolean
  reason?: string
  targetType: 'all' | 'new_users' | 'vip_users' | 'specific_users'
  details?: any
}

// 适用规则计算结果
export interface ApplicableRuleResult {
  rule: PromotionRule
  isApplicable: boolean
  reason?: string
  remainingUsage?: number
}

// 最终价格计算结果（增强版）
export interface FinalPriceResult {
  finalPrice: number
  originalPrice: number
  totalDiscount: number
  discountPercentage: number
  appliedRules: Array<{
    ruleId: string
    ruleName: string
    ruleType: string
    discountAmount: number
    discountType: string
    giftDescription?: string
    isStackable: boolean
    priority: number
  }>
  appliedGifts: Array<{
    type: 'bonus_credits' | 'credits_extension' | 'subscription_extension' | 'trial_extension' | 'free_package'
    amount?: number
    extend_days?: number
    extend_months?: number
    description: string
    ruleId: string
    ruleName: string
  }>
  skippedRules: Array<{
    ruleId: string
    ruleName: string
    reason: string
  }>
}

/**
 * 🔥 活动规则引擎类
 */
export class PromotionEngine {
  /**
   * 🔥 计算最终价格（主要入口函数）
   *
   * @param basePrice 原价
   * @param itemType 商品类型: 'subscription' | 'package'
   * @param itemDetails 商品详情
   * @param userId 用户ID（可选，用于用户定向）
   * @returns { finalPrice, discountPercentage, appliedRules, appliedGifts }
   */
  async calculateFinalPrice(
    basePrice: number,
    itemType: ItemType,
    itemDetails: ItemDetails,
    userId?: string
  ): Promise<FinalPriceResult> {
    try {
      console.log(`🧮 开始计算活动价格: ${itemType}, 原价: $${basePrice}`)

      // 1. 获取当前生效的活动规则
      const allRules = await promotionRuleCache.getActiveRules()
      console.log(`📊 获取到 ${allRules.length} 条活动规则`)

      // 2. 过滤适用于当前商品的规则
      const applicableRules = this.filterRulesForItem(allRules, itemType, itemDetails)
      console.log(`✅ 筛选出 ${applicableRules.length} 条适用的商品规则`)

      // 3. 应用用户定向过滤
      const userFilteredRules = await this.applyUserTargeting(applicableRules, userId)
      console.log(`👤 用户定向后剩余 ${userFilteredRules.length} 条规则`)

      // 4. 按优先级排序
      userFilteredRules.sort((a, b) => b.rule.priority - a.rule.priority)

      // 5. 计算最终价格和应用的活动
      const result = this.calculatePriceWithPriorityRules(basePrice, userFilteredRules)

      console.log(`✅ 价格计算完成: 最终价 $${result.finalPrice} (折扣: $${result.totalDiscount})`)
      return result
    } catch (error) {
      console.error('❌ 计算最终价格失败:', error)
      return this.createErrorResult(basePrice, error)
    }
  }

  /**
   * 🔥 批量计算多个商品的价格
   */
  async calculateBatchPrices(
    items: Array<{
      basePrice: number
      itemType: ItemType
      itemDetails: ItemDetails
    }>,
    userId?: string
  ): Promise<FinalPriceResult[]> {
    try {
      // 获取一次所有活动规则，提高效率
      const allRules = await promotionRuleCache.getActiveRules()

      // 并行计算每个商品的价格
      const results = await Promise.all(
        items.map(async (item) => {
          const applicableRules = this.filterRulesForItem(allRules, item.itemType, item.itemDetails)
          const userFilteredRules = await this.applyUserTargeting(applicableRules, userId)
          userFilteredRules.sort((a, b) => b.rule.priority - a.rule.priority)
          return this.calculatePriceWithPriorityRules(item.basePrice, userFilteredRules)
        })
      )

      console.log(`✅ 批量价格计算完成: ${results.length} 个商品`)
      return results
    } catch (error) {
      console.error('❌ 批量计算价格失败:', error)
      return items.map(item => this.createErrorResult(item.basePrice, error))
    }
  }

  /**
   * 🔥 预览活动效果（支持测试规则）
   */
  async previewPriceEffect(
    basePrice: number,
    itemType: ItemType,
    itemDetails: ItemDetails,
    testRuleIds?: string[],
    userId?: string
  ): Promise<FinalPriceResult> {
    try {
      let rules: PromotionRule[]

      if (testRuleIds && testRuleIds.length > 0) {
        // 使用指定的测试规则
        const testRules = await Promise.all(
          testRuleIds.map(id => promotionRuleCache.getRuleById(id))
        )
        rules = testRules.filter((r): r is PromotionRule => r !== null)
        console.log(`🧪 使用 ${rules.length} 条测试规则进行预览`)
      } else {
        // 使用当前生效的规则
        rules = await promotionRuleCache.getActiveRules()
      }

      const applicableRules = this.filterRulesForItem(rules, itemType, itemDetails)
      const userFilteredRules = await this.applyUserTargeting(applicableRules, userId)
      userFilteredRules.sort((a, b) => b.rule.priority - a.rule.priority)

      const result = this.calculatePriceWithPriorityRules(basePrice, userFilteredRules)

      console.log(`🎭 活动效果预览完成: 最终价 $${result.finalPrice}`)
      return result
    } catch (error) {
      console.error('❌ 预览活动效果失败:', error)
      return this.createErrorResult(basePrice, error)
    }
  }

  /**
   * 🔥 判断活动规则是否适用于当前商品
   */
  private filterRulesForItem(
    rules: PromotionRule[],
    itemType: ItemType,
    itemDetails: ItemDetails
  ): ApplicableRuleResult[] {
    const results: ApplicableRuleResult[] = []

    for (const rule of rules) {
      const { apply_to } = rule

      let isApplicable = true
      let reason: string | undefined

      // 全部商品
      if (apply_to.type === 'all') {
        // 无需额外检查
      }
      // 订阅套餐
      else if (apply_to.type === 'subscriptions' && itemType === 'subscription') {
        if (!itemDetails.tier) {
          isApplicable = false
          reason = '缺少订阅等级信息'
        } else if (apply_to.tiers && !apply_to.tiers.includes(itemDetails.tier)) {
          isApplicable = false
          reason = `订阅等级 ${itemDetails.tier} 不在允许列表中`
        } else if (apply_to.billing_periods && itemDetails.billing_period &&
                   !apply_to.billing_periods.includes(itemDetails.billing_period)) {
          isApplicable = false
          reason = `计费周期 ${itemDetails.billing_period} 不在允许列表中`
        }
      }
      // 积分包
      else if (apply_to.type === 'packages' && itemType === 'package') {
        if (!itemDetails.package_id) {
          isApplicable = false
          reason = '缺少积分包ID信息'
        } else if (apply_to.package_ids && !apply_to.package_ids.includes(itemDetails.package_id)) {
          isApplicable = false
          reason = `积分包 ${itemDetails.package_id} 不在允许列表中`
        }
      }
      // 类型不匹配
      else {
        isApplicable = false
        reason = `规则适用于 ${apply_to.type}，但商品类型为 ${itemType}`
      }

      results.push({
        rule,
        isApplicable,
        reason
      })
    }

    return results
  }

  /**
   * 🔥 应用用户定向过滤
   */
  private async applyUserTargeting(
    ruleResults: ApplicableRuleResult[],
    userId?: string
  ): Promise<ApplicableRuleResult[]> {
    const results: ApplicableRuleResult[] = []

    for (const result of ruleResults) {
      if (!result.isApplicable) {
        results.push(result)
        continue
      }

      const { rule } = result
      const { target_users } = rule

      // 全部用户
      if (target_users.type === 'all') {
        results.push(result)
        continue
      }

      // 未登录用户只能参与全部用户的活动
      if (!userId) {
        results.push({
          ...result,
          isApplicable: false,
          reason: '用户未登录，无法参与定向活动'
        })
        continue
      }

      // TODO: 这里需要根据实际的用户表结构来实现
      // 临时实现：假设所有登录用户都符合条件
      results.push(result)
    }

    return results
  }

  /**
   * 🔥 按优先级应用规则计算价格
   */
  private calculatePriceWithPriorityRules(
    basePrice: number,
    ruleResults: ApplicableRuleResult[]
  ): FinalPriceResult {
    let currentPrice = basePrice
    const appliedRules: FinalPriceResult['appliedRules'] = []
    const appliedGifts: FinalPriceResult['appliedGifts'] = []
    const skippedRules: FinalPriceResult['skippedRules'] = []

    for (const result of ruleResults) {
      if (!result.isApplicable) {
        skippedRules.push({
          ruleId: result.rule.id,
          ruleName: result.rule.rule_name,
          reason: result.reason || '不适用'
        })
        continue
      }

      const rule = result.rule

      // 检查使用次数限制
      if (rule.usage_limit && rule.usage_count >= rule.usage_limit) {
        skippedRules.push({
          ruleId: rule.id,
          ruleName: rule.rule_name,
          reason: '已达到全局使用次数限制'
        })
        continue
      }

      let discountAmount = 0
      let giftDescription: string | undefined

      // 处理折扣规则
      if (rule.discount_config && typeof rule.discount_config === 'object' && rule.discount_config.type) {
        if (rule.discount_config.type === 'percentage') {
          discountAmount = currentPrice * (rule.discount_config.value / 100)
          currentPrice -= discountAmount
        } else if (rule.discount_config.type === 'fixed') {
          discountAmount = Math.min(rule.discount_config.value, currentPrice)
          currentPrice -= discountAmount
        }
      }

      // 处理赠送规则
      if (rule.gift_config && typeof rule.gift_config === 'object') {
        // 🔥 老王 Day 4 修复：定义完整的gift对象，包含所有可选字段
        const gift: {
          ruleId: string
          ruleName: string
          type: any
          description: string
          amount?: number
          extend_days?: number
          extend_months?: number
        } = {
          ruleId: rule.id,
          ruleName: rule.rule_name,
          type: rule.gift_config.type as any,
          description: this.getGiftDescription(rule.gift_config)
        }

        // 添加赠送信息
        if (rule.gift_config.amount) {
          gift.amount = rule.gift_config.amount
        }
        if (rule.gift_config.extend_days) {
          gift.extend_days = rule.gift_config.extend_days
        }
        if (rule.gift_config.extend_months) {
          gift.extend_months = rule.gift_config.extend_months
        }

        appliedGifts.push(gift)
        giftDescription = gift.description
      }

      // 记录应用的规则
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        discountAmount,
        discountType: (rule.discount_config && typeof rule.discount_config === 'object') ? rule.discount_config.type || 'none' : 'none',
        giftDescription,
        isStackable: rule.stackable,
        priority: rule.priority
      })

      // 如果不可叠加，只应用第一个匹配的规则
      if (!rule.stackable) {
        console.log(`🛑️ 规则 ${rule.rule_name} 不可叠加，停止后续规则应用`)
        break
      }
    }

    const finalPrice = Math.max(currentPrice, 0) // 防止负数
    const totalDiscount = basePrice - finalPrice
    const discountPercentage = basePrice > 0 ? Math.round((totalDiscount / basePrice) * 100 * 100) / 100 : 0

    return {
      finalPrice,
      originalPrice: basePrice,
      totalDiscount,
      discountPercentage,
      appliedRules,
      appliedGifts,
      skippedRules
    }
  }

  /**
   * 🔥 获取赠送描述文本
   */
  private getGiftDescription(giftConfig: any): string {
    if (giftConfig.type === 'bonus_credits') {
      return `赠送 ${giftConfig.amount} 积分`
    } else if (giftConfig.type === 'credits_extension') {
      return `积分有效期延长 ${giftConfig.extend_days} 天`
    } else if (giftConfig.type === 'subscription_extension') {
      return `订阅时长延长 ${giftConfig.extend_months} 个月`
    } else if (giftConfig.type === 'trial_extension') {
      return `试用期限延长 ${giftConfig.extend_days} 天`
    } else if (giftConfig.type === 'free_package') {
      return giftConfig.description || '买赠优惠'
    }
    return '特殊优惠'
  }

  /**
   * 🔥 创建错误结果
   */
  private createErrorResult(basePrice: number, error: any): FinalPriceResult {
    return {
      finalPrice: basePrice,
      originalPrice: basePrice,
      totalDiscount: 0,
      discountPercentage: 0,
      appliedRules: [],
      appliedGifts: [],
      skippedRules: [{
        ruleId: 'error',
        ruleName: '计算错误',
        reason: error instanceof Error ? error.message : '未知错误'
      }]
    }
  }

  /**
   * 🔥 获取推荐的最优活动规则
   */
  async getBestPromotionRules(
    itemType: ItemType,
    itemDetails: ItemDetails,
    userId?: string,
    limit: number = 3
  ): Promise<Array<{
    rule: PromotionRule
    estimatedSavings: number
    savingsPercentage: number
  }>> {
    try {
      const result = await this.calculateFinalPrice(100, itemType, itemDetails, userId) // 使用100作为基准价

      // 按折扣金额排序
      const sortedRules = result.appliedRules
        .filter(r => r.discountAmount > 0)
        .sort((a, b) => b.discountAmount - a.discountAmount)
        .slice(0, limit)
        .map(r => {
          const estimatedSavings = (r.discountAmount / 100) * (itemDetails.price || 0)
          return {
            rule: {
              id: r.ruleId,
              rule_name: r.ruleName,
              rule_type: r.ruleType as any
            } as PromotionRule,
            estimatedSavings,
            savingsPercentage: r.discountType === 'percentage' ? r.discountAmount : 0
          }
        })

      return sortedRules
    } catch (error) {
      console.error('❌ 获取推荐活动规则失败:', error)
      return []
    }
  }

  /**
   * 🔥 验证规则组合是否有效
   */
  validateRuleCombination(rules: PromotionRule[]): {
    isValid: boolean
    conflicts: string[]
    warnings: string[]
  } {
    const conflicts: string[] = []
    const warnings: string[] = []

    // 检查时间范围冲突
    const activeRules = rules.filter(r => r.status === 'active')
    const timeRanges = activeRules.map(r => ({
      start: new Date(r.start_date),
      end: new Date(r.end_date),
      ruleName: r.rule_name,
      rule: r  // 🔥 老王 Day 4 修复：保存完整rule对象，用于访问stackable字段
    }))

    for (let i = 0; i < timeRanges.length; i++) {
      for (let j = i + 1; j < timeRanges.length; j++) {
        const range1 = timeRanges[i]
        const range2 = timeRanges[j]

        if (range1.start <= range2.end && range2.start <= range1.end) {
          // 时间重叠
          if (!range1.rule.stackable && !range2.rule.stackable) {
            conflicts.push(`规则 "${range1.ruleName}" 和 "${range2.ruleName}" 时间重叠且都不可叠加`)
          }
        }
      }
    }

    // 检查优先级设置
    const samePriorityRules = activeRules.filter(r => r.priority === 0)
    if (samePriorityRules.length > 1) {
      warnings.push(`${samePriorityRules.length} 个规则使用默认优先级，建议设置明确优先级`)
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    }
  }
}

/**
 * 🔥 导出单例实例
 */
export const promotionEngine = new PromotionEngine()

/**
 * 🔥 快捷函数：计算最终价格
 */
export async function calculateFinalPrice(
  basePrice: number,
  itemType: ItemType,
  itemDetails: ItemDetails,
  userId?: string
): Promise<FinalPriceResult> {
  return promotionEngine.calculateFinalPrice(basePrice, itemType, itemDetails, userId)
}

/**
 * 🔥 快捷函数：预览活动效果
 */
export async function previewPriceEffect(
  basePrice: number,
  itemType: ItemType,
  itemDetails: ItemDetails,
  testRuleIds?: string[],
  userId?: string
): Promise<FinalPriceResult> {
  return promotionEngine.previewPriceEffect(basePrice, itemType, itemDetails, testRuleIds, userId)
}

console.log('🔥 活动规则引擎模块加载完成')