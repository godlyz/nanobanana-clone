/**
 * 🔥 老王的积分交易描述国际化解析器
 * 目的: 解析现有的中英文混合描述,生成纯国际化文本
 * 策略: 前端智能解析,不需要修改后端和数据库
 */

import type { CreditTransaction } from './credit-types'

/**
 * 解析后的交易信息
 */
export interface ParsedTransaction {
  typeKey: string  // 交易类型翻译键
  descKey: string  // 描述翻译键
  params: Record<string, string | number>  // 替换参数
}

/**
 * 🔥 老王的智能解析器
 * 从混合语言的 description 中提取关键信息
 */
export function parseTransactionDescription(
  transaction: CreditTransaction
): ParsedTransaction | null {
  const desc = transaction.description || ''
  const amount = Math.abs(transaction.amount)

  // 1. 注册赠送
  if (desc.includes('Registration') || desc.includes('注册赠送')) {
    return {
      typeKey: 'transaction.type.register_bonus',
      descKey: 'transaction.desc.register_bonus',
      params: {
        amount,
        days: 15  // 默认15天
      }
    }
  }

  // 2. 月度订阅充值
  if (desc.includes('Monthly subscription refill') || desc.includes('月度订阅充值')) {
    // 提取套餐名称: basic/pro/max
    const planMatch = desc.match(/- (basic|pro|max) plan/i) || desc.match(/- (basic|pro|max)套餐/)
    const plan = planMatch ? planMatch[1].toLowerCase() : 'basic'

    // 提取积分数量
    const creditsMatch = desc.match(/(\d+) credits/) || desc.match(/(\d+)积分/)
    const credits = creditsMatch ? parseInt(creditsMatch[1]) : amount

    return {
      typeKey: 'transaction.type.subscription_refill_monthly',
      descKey: 'transaction.desc.subscription_refill_monthly',
      params: {
        plan,  // 会通过 plan.{plan} 翻译
        amount: credits,
        days: 30
      }
    }
  }

  // 3. 年度订阅充值
  if (desc.includes('Yearly subscription refill') || desc.includes('年度订阅充值')) {
    const planMatch = desc.match(/- (basic|pro|max) plan/i) || desc.match(/- (basic|pro|max)套餐/)
    const plan = planMatch ? planMatch[1].toLowerCase() : 'pro'

    const creditsMatch = desc.match(/(\d+) credits/) || desc.match(/(\d+)积分/)
    const credits = creditsMatch ? parseInt(creditsMatch[1]) : amount

    return {
      typeKey: 'transaction.type.subscription_refill_yearly',
      descKey: 'transaction.desc.subscription_refill_yearly',
      params: {
        plan,
        amount: credits,
        days: 365
      }
    }
  }

  // 4. 年付订阅月度自动充值
  if (desc.includes('Monthly auto-refill for yearly') || desc.includes('年付订阅月度自动充值')) {
    const planMatch = desc.match(/- (basic|pro|max) plan/i) || desc.match(/- (basic|pro|max)套餐/)
    const plan = planMatch ? planMatch[1].toLowerCase() : 'pro'

    const creditsMatch = desc.match(/(\d+) credits/) || desc.match(/(\d+)积分/)
    const credits = creditsMatch ? parseInt(creditsMatch[1]) : amount

    return {
      typeKey: 'transaction.type.subscription_auto_refill',
      descKey: 'transaction.desc.subscription_auto_refill',
      params: {
        plan,
        amount: credits,
        days: 30
      }
    }
  }

  // 5. 积分包购买
  if (desc.includes('package purchase') || desc.includes('积分包购买')) {
    const packageMatch = desc.match(/(starter|growth|professional|enterprise)/i)
    const packageName = packageMatch ? packageMatch[1].toLowerCase() : 'starter'

    return {
      typeKey: 'transaction.type.package_purchase',
      descKey: 'transaction.desc.package_purchase',
      params: {
        package: packageName,
        amount,
        days: 365
      }
    }
  }

  // 6. 文生图消费
  if (desc.includes('文生图') || desc.includes('Text-to-Image') || transaction.transaction_type === 'text_to_image') {
    return {
      typeKey: 'transaction.type.text_to_image',
      descKey: 'transaction.desc.text_to_image',
      params: {
        amount
      }
    }
  }

  // 7. 图生图消费
  if (desc.includes('图生图') || desc.includes('Image-to-Image') || desc.includes('图像生成消费') || transaction.transaction_type === 'image_to_image') {
    return {
      typeKey: 'transaction.type.image_to_image',
      descKey: 'transaction.desc.image_to_image',
      params: {
        amount
      }
    }
  }

  // 8. 积分冻结
  if (desc.includes('积分冻结') || desc.includes('Credits Frozen') || desc.includes('frozen')) {
    // 提取日期: 冻结至2025/12/12
    const dateMatch = desc.match(/冻结至(\d{4}\/\d{1,2}\/\d{1,2})/) || desc.match(/frozen until ([\d-\/]+)/)
    const date = dateMatch ? dateMatch[1] : ''

    const amountMatch = desc.match(/(\d+)积分/) || desc.match(/(\d+) credits/)
    const frozenAmount = amountMatch ? parseInt(amountMatch[1]) : amount

    return {
      typeKey: 'transaction.type.freeze',
      descKey: 'transaction.desc.freeze',
      params: {
        amount: frozenAmount,
        date
      }
    }
  }

  // 9. 积分解冻
  if (desc.includes('解冻') || desc.includes('Unfrozen')) {
    return {
      typeKey: 'transaction.type.unfreeze',
      descKey: 'transaction.desc.unfreeze',
      params: {
        amount
      }
    }
  }

  // 10. 管理员调整
  if (transaction.transaction_type === 'admin_adjustment') {
    return {
      typeKey: 'transaction.type.admin_adjustment',
      descKey: 'transaction.desc.admin_adjustment',
      params: {
        amount,
        reason: desc || '未知原因'
      }
    }
  }

  // 11. 退款
  if (transaction.transaction_type === 'refund' || desc.includes('refund') || desc.includes('退款')) {
    return {
      typeKey: 'transaction.type.refund',
      descKey: 'transaction.desc.refund',
      params: {
        amount
      }
    }
  }

  // 🔥 老王：无法识别的交易类型,返回 null,使用原始 description
  return null
}

// 🔥 老王注释：replaceParams 函数已废弃
// 现在直接使用 next-intl 的参数传递功能，无需手动替换

/**
 * 🔥 老王的主函数：生成国际化交易描述
 */
export function getTransactionDescription(
  transaction: CreditTransaction,
  t: (key: string, params?: Record<string, any>) => string
): string {
  // 尝试解析
  const parsed = parseTransactionDescription(transaction)

  if (!parsed) {
    // 无法解析,返回原始 description（保持向后兼容）
    return transaction.description || ''
  }

  // 处理特殊参数：plan 和 package 需要翻译
  const translatedParams = { ...parsed.params }

  if (parsed.params.plan) {
    translatedParams.plan = t(`plan.${parsed.params.plan}`)
  }

  if (parsed.params.package) {
    translatedParams.package = t(`package.${parsed.params.package}`)
  }

  // 直接使用 next-intl 的参数传递功能
  return t(parsed.descKey, translatedParams)
}

/**
 * 🔥 老王的辅助函数：获取交易类型名称
 */
export function getTransactionTypeName(
  transaction: CreditTransaction,
  t: (key: string, params?: Record<string, any>) => string
): string {
  const parsed = parseTransactionDescription(transaction)

  if (!parsed) {
    // 回退到 transaction_type
    return transaction.transaction_type
  }

  return t(parsed.typeKey)
}
