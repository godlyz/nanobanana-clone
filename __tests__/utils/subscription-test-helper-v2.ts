/**
 * 订阅调整测试工具类 V2
 *
 * 完整版：包含积分流水、到期记录、FIFO消耗逻辑
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-16
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 订阅页面数据快照 */
export interface SubscriptionSnapshot {
  plan_tier: string | null
  billing_cycle: string | null
  monthly_credits: number | null
  started_at: string | null  // 🔥 新增：开始时间
  expires_at: string | null
  downgrade_to_plan: string | null
  downgrade_to_billing_cycle: string | null
  adjustment_mode: string | null
  original_plan_expires_at: string | null
  remaining_days: number | null
}

/** 积分汇总数据快照 */
export interface CreditSnapshot {
  available_credits: number      // 可用积分
  frozen_credits: number          // 冻结积分
  total_credits: number           // 总积分
  total_earned: number            // 🔥 新增：总获取积分（历史累计）
  total_consumed: number          // 🔥 新增：总消耗积分（历史累计）
}

/** 积分交易记录 */
export interface CreditTransaction {
  id: string
  created_at: string
  transaction_type: 'register_bonus' | 'subscription_refill' | 'package_purchase' | 'text_to_image' | 'image_to_image'
  amount: number
  expires_at: string | null
  remaining_amount: number
  is_frozen: boolean
  frozen_until: string | null
  frozen_remaining_seconds: number | null
  description: string
}

/** 积分到期记录 */
export interface CreditExpiry {
  expires_at: string
  source: string  // 积分来源描述
  original_amount: number
  remaining_amount: number
  is_frozen: boolean
  status: 'active' | 'expiring_soon' | 'frozen'
  description: string
}

/** 完整状态快照 */
export interface StateSnapshot {
  subscription: SubscriptionSnapshot
  credits: CreditSnapshot
  creditTransactions: CreditTransaction[]  // 🔥 新增：积分流水
  creditExpiries: CreditExpiry[]           // 🔥 新增：积分到期记录
  timestamp: string
}

/** 字段对比结果 */
export interface FieldComparison {
  field: string
  initial: any
  expected: any
  actual: any
  passed: boolean
}

/** 场景对比结果 */
export interface ScenarioComparison {
  scenario: string
  description: string
  operation: {
    api: string
    params: Record<string, any>
    timestamp: string
  }
  initialState: StateSnapshot
  expectedState: StateSnapshot
  actualState: StateSnapshot
  subscriptionComparisons: FieldComparison[]
  creditComparisons: FieldComparison[]
  businessLogicChecks: {
    check: string
    passed: boolean
    reason?: string
  }[]
  allPassed: boolean
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算剩余天数
 */
export function calculateRemainingDays(
  expiresAt: string | null,
  currentTime: Date = new Date('2025-11-16T00:00:00Z')
): number | null {
  if (!expiresAt) return null

  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - currentTime.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : 0
}

/**
 * 格式化日期为ISO字符串
 */
export function formatISODate(date: Date): string {
  return date.toISOString()
}

/**
 * 对比两个值是否相等
 */
export function compareValues(actual: any, expected: any): boolean {
  if (actual === null && expected === null) return true
  if (actual === undefined && expected === undefined) return true
  if (actual === null || expected === null) return false
  if (actual === undefined || expected === undefined) return false

  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 0.001
  }

  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.trim() === expected.trim()
  }

  return actual === expected
}

// ============================================================================
// 核心测试函数
// ============================================================================

/**
 * 捕获订阅页面数据快照
 */
export function captureSubscriptionState(
  subscriptionData: any
): SubscriptionSnapshot {
  if (!subscriptionData) {
    return {
      plan_tier: null,
      billing_cycle: null,
      monthly_credits: null,
      started_at: null,
      expires_at: null,
      downgrade_to_plan: null,
      downgrade_to_billing_cycle: null,
      adjustment_mode: null,
      original_plan_expires_at: null,
      remaining_days: null,
    }
  }

  return {
    plan_tier: subscriptionData.plan_tier || null,
    billing_cycle: subscriptionData.billing_cycle || null,
    monthly_credits: subscriptionData.monthly_credits || null,
    started_at: subscriptionData.started_at || null,
    expires_at: subscriptionData.expires_at || null,
    downgrade_to_plan: subscriptionData.downgrade_to_plan || null,
    downgrade_to_billing_cycle: subscriptionData.downgrade_to_billing_cycle || null,
    adjustment_mode: subscriptionData.adjustment_mode || null,
    original_plan_expires_at: subscriptionData.original_plan_expires_at || null,
    remaining_days: subscriptionData.remaining_days || calculateRemainingDays(subscriptionData.expires_at),
  }
}

/**
 * 捕获积分汇总数据快照
 */
export function captureCreditState(
  availableCredits: number,
  frozenCredits: number = 0,
  totalEarned: number = 0,
  totalConsumed: number = 0
): CreditSnapshot {
  return {
    available_credits: availableCredits,
    frozen_credits: frozenCredits,
    total_credits: availableCredits + frozenCredits,
    total_earned: totalEarned,
    total_consumed: totalConsumed,
  }
}

/**
 * 计算总获取积分（从交易记录）
 */
export function calculateTotalEarned(transactions: CreditTransaction[]): number {
  return transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
}

/**
 * 计算总消耗积分（从交易记录）
 */
export function calculateTotalConsumed(transactions: CreditTransaction[]): number {
  return transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

/**
 * 生成积分到期记录
 */
export function generateCreditExpiries(
  transactions: CreditTransaction[],
  currentTime: Date = new Date('2025-11-16T00:00:00Z')
): CreditExpiry[] {
  // 只保留充值类型且有剩余的记录
  const validTransactions = transactions.filter(
    t => t.amount > 0 && t.remaining_amount > 0 && t.expires_at
  )

  // 按到期时间排序
  const sortedTransactions = validTransactions.sort((a, b) => {
    const aTime = new Date(a.expires_at!).getTime()
    const bTime = new Date(b.expires_at!).getTime()
    return aTime - bTime
  })

  return sortedTransactions.map(t => {
    const expiresAt = new Date(t.expires_at!)
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))

    let status: 'active' | 'expiring_soon' | 'frozen' = 'active'
    if (t.is_frozen) {
      status = 'frozen'
    } else if (daysUntilExpiry <= 3) {
      status = 'expiring_soon'
    }

    return {
      expires_at: t.expires_at!,
      source: t.description,
      original_amount: t.amount,
      remaining_amount: t.remaining_amount,
      is_frozen: t.is_frozen,
      status,
      description: `${t.transaction_type}: ${t.remaining_amount}/${t.amount} 积分剩余`,
    }
  })
}

/**
 * 捕获完整状态快照
 */
export function captureFullState(
  subscriptionData: any,
  creditTransactions: CreditTransaction[],
  availableCredits: number,
  frozenCredits: number = 0
): StateSnapshot {
  const totalEarned = calculateTotalEarned(creditTransactions)
  const totalConsumed = calculateTotalConsumed(creditTransactions)
  const creditExpiries = generateCreditExpiries(creditTransactions)

  return {
    subscription: captureSubscriptionState(subscriptionData),
    credits: captureCreditState(availableCredits, frozenCredits, totalEarned, totalConsumed),
    creditTransactions,
    creditExpiries,
    timestamp: formatISODate(new Date('2025-11-16T00:00:00Z')),
  }
}

/**
 * 对比订阅页面字段变化
 */
export function compareSubscriptionFields(
  initial: SubscriptionSnapshot,
  expected: SubscriptionSnapshot,
  actual: SubscriptionSnapshot
): FieldComparison[] {
  const fields: (keyof SubscriptionSnapshot)[] = [
    'plan_tier',
    'billing_cycle',
    'monthly_credits',
    'started_at',
    'expires_at',
    'downgrade_to_plan',
    'downgrade_to_billing_cycle',
    'adjustment_mode',
    'original_plan_expires_at',
    'remaining_days',
  ]

  return fields.map((field) => ({
    field,
    initial: initial[field],
    expected: expected[field],
    actual: actual[field],
    passed: compareValues(actual[field], expected[field]),
  }))
}

/**
 * 对比积分页面字段变化
 */
export function compareCreditFields(
  initial: CreditSnapshot,
  expected: CreditSnapshot,
  actual: CreditSnapshot
): FieldComparison[] {
  const fields: (keyof CreditSnapshot)[] = [
    'available_credits',
    'frozen_credits',
    'total_credits',
    'total_earned',
    'total_consumed',
  ]

  return fields.map((field) => ({
    field,
    initial: initial[field],
    expected: expected[field],
    actual: actual[field],
    passed: compareValues(actual[field], expected[field]),
  }))
}

/**
 * 对比完整状态
 */
export function compareStates(
  scenario: string,
  description: string,
  operation: {
    api: string
    params: Record<string, any>
    timestamp: string
  },
  initialState: StateSnapshot,
  expectedState: StateSnapshot,
  actualState: StateSnapshot,
  businessLogicChecks: {
    check: string
    passed: boolean
    reason?: string
  }[] = []
): ScenarioComparison {
  const subscriptionComparisons = compareSubscriptionFields(
    initialState.subscription,
    expectedState.subscription,
    actualState.subscription
  )

  const creditComparisons = compareCreditFields(
    initialState.credits,
    expectedState.credits,
    actualState.credits
  )

  const allPassed =
    subscriptionComparisons.every((c) => c.passed) &&
    creditComparisons.every((c) => c.passed) &&
    businessLogicChecks.every((c) => c.passed)

  return {
    scenario,
    description,
    operation,
    initialState,
    expectedState,
    actualState,
    subscriptionComparisons,
    creditComparisons,
    businessLogicChecks,
    allPassed,
  }
}

// ============================================================================
// Markdown 报告生成（完整版）
// ============================================================================

/**
 * 生成单场景Markdown报告（完整版）
 */
export function generateScenarioReport(comparison: ScenarioComparison): string {
  const { scenario, description, operation, initialState, expectedState, actualState, subscriptionComparisons, creditComparisons, businessLogicChecks, allPassed } = comparison

  let report = `## 场景 ${scenario}: ${description}\n\n`

  // ==================== 第一部分：订阅信息对比 ====================
  report += `### 📅 第一部分：订阅信息完整对比\n\n`
  report += `| 字段 | 操作前 | 操作后 | 变化说明 |\n`
  report += `|------|--------|--------|----------|\n`

  subscriptionComparisons.forEach((c) => {
    const icon = c.passed ? '✅' : '❌'
    const change = JSON.stringify(c.initial) === JSON.stringify(c.expected) ? '- 不变' : `${icon} 变化`
    report += `| **${c.field}** | ${JSON.stringify(c.initial)} | ${JSON.stringify(c.expected)} | ${change} |\n`
  })
  report += `\n`

  // ==================== 第二部分：积分汇总对比 ====================
  report += `### 💰 第二部分：积分汇总对比\n\n`
  report += `| 指标 | 操作前 | 操作后 | 变化 | 说明 |\n`
  report += `|------|--------|--------|------|------|\n`

  creditComparisons.forEach((c) => {
    const icon = c.passed ? '✅' : '❌'
    const diff = typeof c.expected === 'number' && typeof c.initial === 'number'
      ? c.expected - c.initial
      : 0
    const diffStr = diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`)
    report += `| **${c.field}** | ${c.initial} | ${c.expected} | ${diffStr} | ${icon} |\n`
  })
  report += `\n`

  // ==================== 第二部分补充：积分到期记录 ====================
  report += `### 📆 第二部分补充：积分到期记录详情\n\n`

  report += `#### 操作前的积分到期记录\n\n`
  if (initialState.creditExpiries.length > 0) {
    report += `| 到期时间 | 积分来源 | 原始金额 | 剩余金额 | 状态 | 说明 |\n`
    report += `|----------|----------|----------|----------|------|------|\n`
    initialState.creditExpiries.forEach(e => {
      const statusIcon = e.status === 'frozen' ? '⏸️ 冻结中' : e.status === 'expiring_soon' ? '⏰ 即将到期' : '✅ 有效'
      report += `| **${e.expires_at}** | ${e.source.substring(0, 30)}... | ${e.original_amount} | ${e.remaining_amount} | ${statusIcon} | ${e.description} |\n`
    })
  } else {
    report += `_无积分到期记录_\n`
  }
  report += `\n`

  report += `#### 操作后的积分到期记录\n\n`
  if (expectedState.creditExpiries.length > 0) {
    report += `| 到期时间 | 积分来源 | 原始金额 | 剩余金额 | 是否冻结 | 状态 | 说明 |\n`
    report += `|----------|----------|----------|----------|----------|------|------|\n`
    expectedState.creditExpiries.forEach(e => {
      const frozenIcon = e.is_frozen ? '✅' : '❌'
      const statusIcon = e.status === 'frozen' ? '⏸️ 冻结中' : e.status === 'expiring_soon' ? '⏰ 即将到期' : '✅ 有效'
      report += `| **${e.expires_at}** | ${e.source.substring(0, 30)}... | ${e.original_amount} | ${e.remaining_amount} | ${frozenIcon} | ${statusIcon} | ${e.description} |\n`
    })
  } else {
    report += `_无积分到期记录_\n`
  }
  report += `\n`

  // ==================== 第三部分：积分流水记录 ====================
  report += `### 📊 第三部分：积分流水记录详情\n\n`

  report += `#### 3.1 操作前的积分记录（credit_transactions表）\n\n`
  if (initialState.creditTransactions.length > 0) {
    report += `| 记录ID | 时间 | 类型 | 金额 | 过期时间 | 剩余可用 | 是否冻结 | 描述 |\n`
    report += `|--------|------|------|------|----------|----------|----------|------|\n`
    initialState.creditTransactions.forEach(t => {
      const frozenIcon = t.is_frozen ? '✅' : '❌'
      report += `| ${t.id} | ${t.created_at} | ${t.transaction_type} | ${t.amount > 0 ? '+' : ''}${t.amount} | ${t.expires_at || '-'} | ${t.remaining_amount} | ${frozenIcon} | ${t.description.substring(0, 40)}... |\n`
    })
  } else {
    report += `_无积分记录_\n`
  }
  report += `\n`

  report += `#### 3.2 操作后新增的积分记录\n\n`
  const newTransactions = expectedState.creditTransactions.filter(
    t => !initialState.creditTransactions.find(it => it.id === t.id)
  )
  if (newTransactions.length > 0) {
    report += `| 记录ID | 时间 | 类型 | 金额 | 过期时间 | 剩余可用 | 是否冻结 | 冻结至 | 描述 |\n`
    report += `|--------|------|------|------|----------|----------|----------|--------|------|\n`
    newTransactions.forEach(t => {
      const frozenIcon = t.is_frozen ? '✅' : '❌'
      report += `| **${t.id}** | ${t.created_at} | ${t.transaction_type} | **${t.amount > 0 ? '+' : ''}${t.amount}** | **${t.expires_at || '-'}** | ${t.remaining_amount} | ${frozenIcon} | ${t.frozen_until || '-'} | ${t.description.substring(0, 40)}... |\n`
    })
  } else {
    report += `_无新增积分记录_\n`
  }
  report += `\n`

  // ==================== 第四部分：业务逻辑验证 ====================
  report += `### ✅ 第四部分：业务逻辑验证\n\n`
  report += `| 验证项 | 状态 | 详细说明 |\n`
  report += `|--------|------|----------|\n`
  businessLogicChecks.forEach((check) => {
    const icon = check.passed ? '✅' : '❌'
    const reason = check.reason ? ` - ${check.reason}` : ''
    report += `| ${check.check} | ${icon} | ${icon}${reason} |\n`
  })
  report += `\n`

  // ==================== 第五部分：场景总结 ====================
  const overallIcon = allPassed ? '✅' : '❌'
  report += `### 🎯 第五部分：场景总结\n\n`
  report += `**测试结果**: ${overallIcon} **${allPassed ? '全部通过' : '存在失败'}**\n\n`
  report += `**执行操作**: ${operation.api}\n\n`
  report += `**请求参数**:\n`
  report += `\`\`\`json\n${JSON.stringify(operation.params, null, 2)}\n\`\`\`\n\n`
  report += `---\n\n`

  return report
}

/**
 * 生成完整的测试报告
 */
export function generateFullReport(
  comparisons: ScenarioComparison[],
  coverageData?: any
): string {
  let report = `# 订阅调整功能自动化测试报告（完整版）\n\n`
  report += `**测试日期**: ${formatISODate(new Date('2025-11-16T00:00:00Z'))}\n`
  report += `**测试框架**: Vitest 4.0.6\n`
  report += `**总场景数**: ${comparisons.length}\n`
  report += `**通过场景**: ${comparisons.filter((c) => c.allPassed).length}\n`
  report += `**失败场景**: ${comparisons.filter((c) => !c.allPassed).length}\n\n`
  report += `---\n\n`

  comparisons.forEach((comparison) => {
    report += generateScenarioReport(comparison)
  })

  const allPassed = comparisons.every((c) => c.allPassed)
  const overallIcon = allPassed ? '✅' : '❌'

  report += `## 结论\n\n`
  report += `${overallIcon} **${allPassed ? '所有场景测试通过' : '部分场景测试失败'}**\n\n`

  return report
}
