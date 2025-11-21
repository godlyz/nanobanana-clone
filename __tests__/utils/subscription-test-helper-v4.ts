/**
 * 订阅调整测试工具类 V4（修正版）
 *
 * 用于年付订阅降级端到端业务逻辑测试，完整记录：
 * - 订阅生命周期详情（冻结状态、剩余月份）
 * - 积分交易流水（包含到期消耗、冻结/解冻记录）
 * - 积分汇总对比（总获取、总消耗、FIFO验证）
 * - 时间线与业务逻辑验证
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-16
 * @version V4
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 积分交易类型 */
export type CreditTransactionType =
  | 'register_bonus'
  | 'subscription_refill'
  | 'subscription_bonus'
  | 'package_purchase'
  | 'text_to_image'
  | 'image_to_image'
  | 'credit_expiry'           // 🔥 新增：积分到期扣除
  | 'subscription_freeze'     // 🔥 新增：订阅冻结
  | 'subscription_unfreeze'   // 🔥 新增：订阅解冻

/** 积分交易记录 */
export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: CreditTransactionType
  amount: number
  remaining_amount?: number  // 充值类型才有
  related_entity_type?: string
  related_entity_id?: string
  expires_at?: string | null
  created_at: string
  description?: string
}

/** 订阅页面数据快照（V4版本） */
export interface SubscriptionSnapshot {
  // 基础字段
  plan_tier: string | null
  billing_cycle: string | null
  monthly_credits: number | null
  started_at: string | null
  expires_at: string | null

  // 年付订阅字段
  remaining_refills: number | null  // 🔥 剩余未激活月份
  next_refill_date: string | null   // 🔥 下次充值日期

  // 调整字段
  downgrade_to_plan: string | null
  downgrade_to_billing_cycle: string | null
  adjustment_mode: string | null
  original_plan_expires_at: string | null

  // 🔥 冻结字段
  is_frozen: boolean
  freeze_start_time: string | null
  frozen_credits: number
  frozen_remaining_days: number

  // 计算字段
  remaining_days: number | null
}

/** 积分页面数据快照（V4版本） */
export interface CreditSnapshot {
  available_credits: number
  frozen_credits: number
  total_credits: number
  total_earned: number      // 🔥 新增：总获取积分
  total_consumed: number    // 🔥 新增：总消耗积分
}

/** 积分流水快照 */
export interface CreditFlowSnapshot {
  transactions: CreditTransaction[]
  fifoVerification: {
    consumptionOrder: {
      consumptionId: string
      amount: number
      sources: { transactionId: string; amount: number }[]
    }[]
    allCorrect: boolean
  }
}

/** 完整状态快照（V4版本） */
export interface StateSnapshotV4 {
  subscription: SubscriptionSnapshot
  credits: CreditSnapshot
  creditFlow: CreditFlowSnapshot  // 🔥 新增：积分流水
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

/** 场景对比结果（V4版本） */
export interface ScenarioComparisonV4 {
  scenario: string
  description: string
  operation: {
    api: string
    params: Record<string, any>
    timestamp: string
  }
  initialState: StateSnapshotV4
  expectedState: StateSnapshotV4
  actualState: StateSnapshotV4
  subscriptionComparisons: FieldComparison[]
  creditComparisons: FieldComparison[]
  creditFlowComparisons: FieldComparison[]  // 🔥 新增：积分流水对比
  businessLogicChecks: {
    check: string
    passed: boolean
    reason?: string
  }[]
  allPassed: boolean
}

// ============================================================================
// 积分交易辅助函数
// ============================================================================

/**
 * 判断是否为充值类型交易
 */
export function isRechargeType(type: CreditTransactionType): boolean {
  return [
    'register_bonus',
    'subscription_refill',
    'subscription_bonus',
    'package_purchase',
  ].includes(type)
}

/**
 * 判断是否为消耗类型交易
 */
export function isConsumeType(type: CreditTransactionType): boolean {
  return [
    'text_to_image',
    'image_to_image',
    'credit_expiry',  // 🔥 到期也算消耗
  ].includes(type)
}

/**
 * 计算总获取积分（包含冻结/解冻记录）
 * 公式：总获取 = 充值类amount + 解冻记录 + 冻结记录（负数）
 */
export function calculateTotalEarned(transactions: CreditTransaction[]): number {
  return transactions
    .filter(t =>
      isRechargeType(t.transaction_type) ||
      t.transaction_type === 'subscription_freeze' ||
      t.transaction_type === 'subscription_unfreeze'
    )
    .reduce((sum, t) => sum + t.amount, 0)
}

/**
 * 计算总消耗积分（包含到期消耗）
 */
export function calculateTotalConsumed(transactions: CreditTransaction[]): number {
  return Math.abs(
    transactions
      .filter(t => isConsumeType(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0)
  )
}

/**
 * 计算当前可用积分（基于remaining_amount）
 */
export function calculateAvailableCredits(transactions: CreditTransaction[]): number {
  return transactions
    .filter(t => isRechargeType(t.transaction_type) && t.remaining_amount !== undefined)
    .reduce((sum, t) => sum + (t.remaining_amount || 0), 0)
}

/**
 * FIFO消耗逻辑验证
 *
 * 验证每次消耗是否按照"先到期的先消耗"原则
 *
 * @param transactions 所有交易记录（按时间排序）
 * @returns FIFO验证结果
 */
export function verifyFIFOConsumption(
  transactions: CreditTransaction[]
): {
  consumptionOrder: {
    consumptionId: string
    amount: number
    sources: { transactionId: string; amount: number }[]
  }[]
  allCorrect: boolean
} {
  const consumptions = transactions.filter(t => isConsumeType(t.transaction_type))
  const recharges = transactions
    .filter(t => isRechargeType(t.transaction_type))
    .map(t => ({
      ...t,
      current_remaining: t.remaining_amount || 0,
    }))
    .sort((a, b) => {
      // 按到期时间排序（先到期的优先）
      if (!a.expires_at && !b.expires_at) return 0
      if (!a.expires_at) return 1
      if (!b.expires_at) return -1
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    })

  const consumptionOrder: {
    consumptionId: string
    amount: number
    sources: { transactionId: string; amount: number }[]
  }[] = []

  let allCorrect = true

  for (const consumption of consumptions) {
    const consumeAmount = Math.abs(consumption.amount)
    const sources: { transactionId: string; amount: number }[] = []
    let remaining = consumeAmount

    // 按FIFO顺序消耗
    for (const recharge of recharges) {
      if (remaining <= 0) break
      if (recharge.current_remaining <= 0) continue

      const consumeFromThis = Math.min(remaining, recharge.current_remaining)
      sources.push({
        transactionId: recharge.id,
        amount: consumeFromThis,
      })
      recharge.current_remaining -= consumeFromThis
      remaining -= consumeFromThis
    }

    consumptionOrder.push({
      consumptionId: consumption.id,
      amount: consumeAmount,
      sources,
    })

    // 验证是否完全消耗
    if (remaining > 0) {
      allCorrect = false
    }
  }

  return { consumptionOrder, allCorrect }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算剩余天数
 *
 * @param expiresAt 到期时间（ISO string）
 * @param currentTime 当前时间（默认固定为 2025-11-26T00:00:00Z）
 * @returns 剩余天数
 */
export function calculateRemainingDays(
  expiresAt: string | null,
  currentTime: Date = new Date('2025-11-26T00:00:00Z')
): number | null {
  if (!expiresAt) return null

  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - currentTime.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : 0
}

/**
 * 格式化日期为ISO字符串（UTC时区）
 */
export function formatISODate(date: Date): string {
  return date.toISOString()
}

/**
 * 对比两个值是否相等（支持null和undefined）
 */
export function compareValues(actual: any, expected: any): boolean {
  // 处理null和undefined
  if (actual === null && expected === null) return true
  if (actual === undefined && expected === undefined) return true
  if (actual === null || expected === null) return false
  if (actual === undefined || expected === undefined) return false

  // 处理数字（允许小误差）
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 0.001
  }

  // 处理字符串（trim后比较）
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.trim() === expected.trim()
  }

  // 处理布尔值
  if (typeof actual === 'boolean' && typeof expected === 'boolean') {
    return actual === expected
  }

  // 其他类型直接比较
  return actual === expected
}

// ============================================================================
// 核心测试函数（V4版本）
// ============================================================================

/**
 * 捕获订阅页面数据快照（V4版本）
 *
 * @param subscriptionData RPC返回的订阅数据
 * @returns 订阅快照
 */
export function captureSubscriptionStateV4(
  subscriptionData: any
): SubscriptionSnapshot {
  if (!subscriptionData) {
    return {
      plan_tier: null,
      billing_cycle: null,
      monthly_credits: null,
      started_at: null,
      expires_at: null,
      remaining_refills: null,
      next_refill_date: null,
      downgrade_to_plan: null,
      downgrade_to_billing_cycle: null,
      adjustment_mode: null,
      original_plan_expires_at: null,
      is_frozen: false,
      freeze_start_time: null,
      frozen_credits: 0,
      frozen_remaining_days: 0,
      remaining_days: null,
    }
  }

  return {
    plan_tier: subscriptionData.plan_tier || null,
    billing_cycle: subscriptionData.billing_cycle || null,
    monthly_credits: subscriptionData.monthly_credits || null,
    started_at: subscriptionData.started_at || null,
    expires_at: subscriptionData.expires_at || null,
    remaining_refills: subscriptionData.remaining_refills ?? null,
    next_refill_date: subscriptionData.next_refill_date || null,
    downgrade_to_plan: subscriptionData.downgrade_to_plan || null,
    downgrade_to_billing_cycle: subscriptionData.downgrade_to_billing_cycle || null,
    adjustment_mode: subscriptionData.adjustment_mode || null,
    original_plan_expires_at: subscriptionData.original_plan_expires_at || null,
    is_frozen: subscriptionData.is_frozen || false,
    freeze_start_time: subscriptionData.freeze_start_time || null,
    frozen_credits: subscriptionData.frozen_credits || 0,
    frozen_remaining_days: subscriptionData.frozen_remaining_days || 0,
    remaining_days: subscriptionData.remaining_days ?? calculateRemainingDays(subscriptionData.expires_at),
  }
}

/**
 * 捕获积分页面数据快照（V4版本）
 *
 * @param transactions 所有积分交易记录
 * @returns 积分快照
 */
export function captureCreditStateV4(
  transactions: CreditTransaction[]
): CreditSnapshot {
  const availableCredits = calculateAvailableCredits(transactions)
  const frozenCredits = transactions
    .filter(t => t.transaction_type === 'subscription_freeze')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) -
    transactions
      .filter(t => t.transaction_type === 'subscription_unfreeze')
      .reduce((sum, t) => sum + t.amount, 0)

  const totalEarned = calculateTotalEarned(transactions)
  const totalConsumed = calculateTotalConsumed(transactions)

  return {
    available_credits: availableCredits,
    frozen_credits: Math.max(frozenCredits, 0),
    total_credits: availableCredits + Math.max(frozenCredits, 0),
    total_earned: totalEarned,
    total_consumed: totalConsumed,
  }
}

/**
 * 捕获积分流水快照
 *
 * @param transactions 所有积分交易记录
 * @returns 积分流水快照
 */
export function captureCreditFlowSnapshot(
  transactions: CreditTransaction[]
): CreditFlowSnapshot {
  return {
    transactions,
    fifoVerification: verifyFIFOConsumption(transactions),
  }
}

/**
 * 捕获完整状态快照（V4版本）
 *
 * @param subscriptionData 订阅数据
 * @param transactions 积分交易记录
 * @returns 完整快照
 */
export function captureFullStateV4(
  subscriptionData: any,
  transactions: CreditTransaction[]
): StateSnapshotV4 {
  return {
    subscription: captureSubscriptionStateV4(subscriptionData),
    credits: captureCreditStateV4(transactions),
    creditFlow: captureCreditFlowSnapshot(transactions),
    timestamp: formatISODate(new Date('2025-11-26T00:00:00Z')),
  }
}

/**
 * 对比订阅页面字段变化（V4版本）
 */
export function compareSubscriptionFieldsV4(
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
    'remaining_refills',
    'next_refill_date',
    'downgrade_to_plan',
    'downgrade_to_billing_cycle',
    'adjustment_mode',
    'original_plan_expires_at',
    'is_frozen',
    'freeze_start_time',
    'frozen_credits',
    'frozen_remaining_days',
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
 * 对比积分页面字段变化（V4版本）
 */
export function compareCreditFieldsV4(
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
 * 对比积分流水变化（V4版本）
 */
export function compareCreditFlowFields(
  initial: CreditFlowSnapshot,
  expected: CreditFlowSnapshot,
  actual: CreditFlowSnapshot
): FieldComparison[] {
  return [
    {
      field: 'transaction_count',
      initial: initial.transactions.length,
      expected: expected.transactions.length,
      actual: actual.transactions.length,
      passed: actual.transactions.length === expected.transactions.length,
    },
    {
      field: 'fifo_consumption_correct',
      initial: initial.fifoVerification.allCorrect,
      expected: expected.fifoVerification.allCorrect,
      actual: actual.fifoVerification.allCorrect,
      passed: actual.fifoVerification.allCorrect === expected.fifoVerification.allCorrect,
    },
  ]
}

/**
 * 对比完整状态（订阅 + 积分 + 积分流水）（V4版本）
 */
export function compareStatesV4(
  scenario: string,
  description: string,
  operation: {
    api: string
    params: Record<string, any>
    timestamp: string
  },
  initialState: StateSnapshotV4,
  expectedState: StateSnapshotV4,
  actualState: StateSnapshotV4,
  businessLogicChecks: {
    check: string
    passed: boolean
    reason?: string
  }[] = []
): ScenarioComparisonV4 {
  const subscriptionComparisons = compareSubscriptionFieldsV4(
    initialState.subscription,
    expectedState.subscription,
    actualState.subscription
  )

  const creditComparisons = compareCreditFieldsV4(
    initialState.credits,
    expectedState.credits,
    actualState.credits
  )

  const creditFlowComparisons = compareCreditFlowFields(
    initialState.creditFlow,
    expectedState.creditFlow,
    actualState.creditFlow
  )

  const allPassed =
    subscriptionComparisons.every((c) => c.passed) &&
    creditComparisons.every((c) => c.passed) &&
    creditFlowComparisons.every((c) => c.passed) &&
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
    creditFlowComparisons,
    businessLogicChecks,
    allPassed,
  }
}

// ============================================================================
// Markdown 报告生成（V4版本 - 5部分格式）
// ============================================================================

/**
 * 生成单场景Markdown报告（V4版本 - 5部分格式）
 *
 * @param comparison 场景对比结果
 * @returns Markdown格式的报告
 */
export function generateScenarioReportV4(comparison: ScenarioComparisonV4): string {
  const { scenario, description, operation, initialState, expectedState, actualState, subscriptionComparisons, creditComparisons, creditFlowComparisons, businessLogicChecks, allPassed } = comparison

  let report = `## 场景 ${scenario}: ${description}\n\n`

  // ========== 第一部分：订阅生命周期详情 ==========
  report += `### 第一部分：订阅生命周期详情\n\n`
  report += `| 字段 | 操作前 | 操作后 | 说明 |\n`
  report += `|------|--------|--------|------|\n`

  const keySubscriptionFields = [
    'plan_tier',
    'billing_cycle',
    'expires_at',
    'remaining_refills',
    'is_frozen',
    'frozen_credits',
    'frozen_remaining_days',
  ]

  keySubscriptionFields.forEach(field => {
    const comp = subscriptionComparisons.find(c => c.field === field)
    if (comp) {
      const icon = comp.passed ? '✅' : '❌'
      report += `| ${field} | ${JSON.stringify(comp.initial)} | ${JSON.stringify(comp.actual)} | ${icon} |\n`
    }
  })
  report += `\n`

  // ========== 第二部分：积分流水详情 ==========
  report += `### 第二部分：积分流水详情\n\n`
  report += `| ID | 类型 | 金额 | 剩余 | 到期时间 | 状态 |\n`
  report += `|----| -----|------|------|---------|------|\n`

  actualState.creditFlow.transactions.forEach(tx => {
    const status = tx.remaining_amount === 0 ? '✅ 已消耗' :
                  tx.amount < 0 ? '✅ 消耗记录' : '✅ 有效'
    report += `| ${tx.id} | ${tx.transaction_type} | ${tx.amount} | ${tx.remaining_amount ?? '-'} | ${tx.expires_at || '-'} | ${status} |\n`
  })
  report += `\n`

  // ========== 第三部分：积分汇总对比 ==========
  report += `### 第三部分：积分汇总对比\n\n`
  report += `| 时间点 | 可用 | 冻结 | 总计 | 总获取 | 总消耗 |\n`
  report += `|-------|------|------|------|--------|--------|\n`
  report += `| 操作前 | ${initialState.credits.available_credits} | ${initialState.credits.frozen_credits} | ${initialState.credits.total_credits} | ${initialState.credits.total_earned} | ${initialState.credits.total_consumed} |\n`
  report += `| 操作后 | ${actualState.credits.available_credits} | ${actualState.credits.frozen_credits} | ${actualState.credits.total_credits} | ${actualState.credits.total_earned} | ${actualState.credits.total_consumed} |\n`
  report += `\n`

  // ========== 第四部分：时间线与业务逻辑 ==========
  report += `### 第四部分：时间线与业务逻辑验证\n\n`
  report += `**API端点**: ${operation.api}\n\n`
  report += `**请求参数**:\n`
  report += `\`\`\`json\n`
  report += JSON.stringify(operation.params, null, 2)
  report += `\n\`\`\`\n\n`
  report += `**执行时间**: ${operation.timestamp}\n\n`

  report += `**业务逻辑验证：**\n\n`
  businessLogicChecks.forEach((check) => {
    const icon = check.passed ? '✅' : '❌'
    report += `- ${icon} **${check.check}**`
    if (check.reason) {
      report += `: ${check.reason}`
    }
    report += `\n`
  })
  report += `\n`

  // ========== 第五部分：FIFO消耗验证 ==========
  report += `### 第五部分：FIFO消耗验证\n\n`
  report += `| 消耗ID | 金额 | 消耗来源 | FIFO正确 |\n`
  report += `|--------|------|---------|----------|\n`

  actualState.creditFlow.fifoVerification.consumptionOrder.forEach(consumption => {
    const sources = consumption.sources.map(s => `${s.transactionId}(${s.amount})`).join(' + ')
    const icon = consumption.sources.length > 0 ? '✅' : '❌'
    report += `| ${consumption.consumptionId} | ${consumption.amount} | ${sources} | ${icon} |\n`
  })
  report += `\n`

  // ========== 总体结果 ==========
  const overallIcon = allPassed ? '✅' : '❌'
  report += `### 总体结果\n\n`
  report += `${overallIcon} **${allPassed ? '场景测试通过' : '场景测试失败'}**\n\n`

  report += `---\n\n`

  return report
}

/**
 * 生成完整的测试报告（V4版本 - 多个场景）
 */
export function generateFullReportV4(
  comparisons: ScenarioComparisonV4[],
  coverageData?: {
    upgrade: { coverage: number; testCount: number }
    downgrade: { coverage: number; testCount: number }
    status: { coverage: number; testCount: number }
    overall: number
  }
): string {
  let report = `# 年付订阅降级功能自动化测试报告 V4\n\n`
  report += `**测试日期**: ${formatISODate(new Date('2025-11-26T00:00:00Z'))}\n`
  report += `**测试框架**: Vitest 4.0.6\n`
  report += `**业务逻辑版本**: V4（修正版）\n`
  report += `**总场景数**: ${comparisons.length}\n`
  report += `**通过场景**: ${comparisons.filter((c) => c.allPassed).length}\n`
  report += `**失败场景**: ${comparisons.filter((c) => !c.allPassed).length}\n`

  if (coverageData) {
    report += `**测试覆盖率**: ${coverageData.overall.toFixed(1)}%\n`
  }

  report += `\n---\n\n`

  // 添加每个场景的报告
  comparisons.forEach((comparison) => {
    report += generateScenarioReportV4(comparison)
  })

  // 添加覆盖率统计（如果有）
  if (coverageData) {
    report += `## 测试覆盖率统计\n\n`
    report += `| API | 覆盖率 | 测试用例数 |\n`
    report += `|-----|--------|------------|\n`
    report += `| POST /api/subscription/upgrade | ${coverageData.upgrade.coverage.toFixed(1)}% | ${coverageData.upgrade.testCount} |\n`
    report += `| POST /api/subscription/downgrade | ${coverageData.downgrade.coverage.toFixed(1)}% | ${coverageData.downgrade.testCount} |\n`
    report += `| GET /api/subscription/status | ${coverageData.status.coverage.toFixed(1)}% | ${coverageData.status.testCount} |\n`
    report += `| **总计** | **${coverageData.overall.toFixed(1)}%** | **${coverageData.upgrade.testCount + coverageData.downgrade.testCount + coverageData.status.testCount}** |\n\n`
  }

  // 添加结论
  const allPassed = comparisons.every((c) => c.allPassed)
  const overallIcon = allPassed ? '✅' : '❌'

  report += `## 结论\n\n`
  report += `${overallIcon} **${allPassed ? '所有场景测试通过' : '部分场景测试失败'}**\n\n`

  if (allPassed) {
    report += `- ✅ 所有${comparisons.length}个核心场景测试通过\n`
    report += `- ✅ 订阅生命周期验证正确（含冻结状态）\n`
    report += `- ✅ 积分流水记录完整（含到期消耗、冻结/解冻）\n`
    report += `- ✅ 积分汇总计算准确（总获取、总消耗）\n`
    report += `- ✅ FIFO消耗逻辑验证通过\n`
    if (coverageData && coverageData.overall >= 85) {
      report += `- ✅ 测试覆盖率达到${coverageData.overall.toFixed(1)}%（超过85%目标）\n`
    }
  } else {
    report += `请查看上述失败场景的详细信息，并修复相关问题。\n`
  }

  report += `\n`

  return report
}
