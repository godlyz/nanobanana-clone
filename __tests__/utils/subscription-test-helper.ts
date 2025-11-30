/**
 * 订阅调整测试工具类
 *
 * 用于端到端业务逻辑测试，完整记录订阅页面和积分页面的所有字段变化
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
  expires_at: string | null
  downgrade_to_plan: string | null
  downgrade_to_billing_cycle: string | null
  adjustment_mode: string | null
  original_plan_expires_at: string | null
  remaining_days: number | null
}

/** 积分页面数据快照 */
export interface CreditSnapshot {
  available_credits: number
  frozen_credits: number
  total_credits: number
}

/** 完整状态快照 */
export interface StateSnapshot {
  subscription: SubscriptionSnapshot
  credits: CreditSnapshot
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
 *
 * @param expiresAt 到期时间（ISO string）
 * @param currentTime 当前时间（默认固定为 2025-11-16T00:00:00Z）
 * @returns 剩余天数
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
 * 格式化日期为ISO字符串（UTC时区）
 *
 * @param date 日期对象
 * @returns ISO格式字符串
 */
export function formatISODate(date: Date): string {
  return date.toISOString()
}

/**
 * 对比两个值是否相等（支持null和undefined）
 *
 * @param actual 实际值
 * @param expected 预期值
 * @returns 是否相等
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

  // 其他类型直接比较
  return actual === expected
}

// ============================================================================
// 核心测试函数
// ============================================================================

/**
 * 捕获订阅页面数据快照
 *
 * @param subscriptionData RPC返回的订阅数据
 * @returns 订阅快照
 */
export function captureSubscriptionState(
  subscriptionData: any
): SubscriptionSnapshot {
  if (!subscriptionData) {
    return {
      plan_tier: null,
      billing_cycle: null,
      monthly_credits: null,
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
    expires_at: subscriptionData.expires_at || null,
    downgrade_to_plan: subscriptionData.downgrade_to_plan || null,
    downgrade_to_billing_cycle: subscriptionData.downgrade_to_billing_cycle || null,
    adjustment_mode: subscriptionData.adjustment_mode || null,
    original_plan_expires_at: subscriptionData.original_plan_expires_at || null,
    remaining_days: subscriptionData.remaining_days || calculateRemainingDays(subscriptionData.expires_at),
  }
}

/**
 * 捕获积分页面数据快照
 *
 * @param availableCredits 可用积分
 * @param frozenCredits 冻结积分
 * @returns 积分快照
 */
export function captureCreditState(
  availableCredits: number,
  frozenCredits: number = 0
): CreditSnapshot {
  return {
    available_credits: availableCredits,
    frozen_credits: frozenCredits,
    total_credits: availableCredits + frozenCredits,
  }
}

/**
 * 捕获完整状态快照
 *
 * @param subscriptionData 订阅数据
 * @param availableCredits 可用积分
 * @param frozenCredits 冻结积分
 * @returns 完整快照
 */
export function captureFullState(
  subscriptionData: any,
  availableCredits: number,
  frozenCredits: number = 0
): StateSnapshot {
  return {
    subscription: captureSubscriptionState(subscriptionData),
    credits: captureCreditState(availableCredits, frozenCredits),
    timestamp: formatISODate(new Date('2025-11-16T00:00:00Z')),
  }
}

/**
 * 对比订阅页面字段变化
 *
 * @param initial 初始状态
 * @param expected 预期状态
 * @param actual 实际状态
 * @returns 字段对比结果列表
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
 *
 * @param initial 初始状态
 * @param expected 预期状态
 * @param actual 实际状态
 * @returns 字段对比结果列表
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
 * 对比完整状态（订阅 + 积分）
 *
 * @param scenario 场景名称
 * @param description 场景描述
 * @param operation 执行的操作
 * @param initialState 初始状态
 * @param expectedState 预期状态
 * @param actualState 实际状态
 * @param businessLogicChecks 业务逻辑检查项
 * @returns 场景对比结果
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
// Markdown 报告生成
// ============================================================================

/**
 * 生成单场景Markdown报告
 *
 * @param comparison 场景对比结果
 * @returns Markdown格式的报告
 */
export function generateScenarioReport(comparison: ScenarioComparison): string {
  const { scenario, description, operation, initialState, expectedState, actualState, subscriptionComparisons, creditComparisons, businessLogicChecks, allPassed } = comparison

  let report = `## 场景 ${scenario}: ${description}\n\n`

  // 1. 初始状态
  report += `### 初始状态（测试前）\n\n`
  report += `**订阅页面数据：**\n`
  report += `| 字段 | 值 |\n`
  report += `|------|-----|\n`
  Object.entries(initialState.subscription).forEach(([key, value]) => {
    report += `| ${key} | ${JSON.stringify(value)} |\n`
  })
  report += `\n`

  report += `**积分页面数据：**\n`
  report += `| 字段 | 值 |\n`
  report += `|------|-----|\n`
  Object.entries(initialState.credits).forEach(([key, value]) => {
    report += `| ${key} | ${value} |\n`
  })
  report += `\n`

  // 2. 执行操作
  report += `### 执行操作\n\n`
  report += `**API端点**: ${operation.api}\n\n`
  report += `**请求参数**:\n`
  report += `\`\`\`json\n`
  report += JSON.stringify(operation.params, null, 2)
  report += `\n\`\`\`\n\n`
  report += `**执行时间**: ${operation.timestamp}\n\n`

  // 3. 预期结果 vs 实际结果 - 订阅页面
  report += `### 预期结果 vs 实际结果\n\n`
  report += `**订阅页面变化：**\n`
  report += `| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |\n`
  report += `|------|--------|--------|--------|----------|\n`
  subscriptionComparisons.forEach((c) => {
    const icon = c.passed ? '✅ 通过' : '❌ 失败'
    report += `| ${c.field} | ${JSON.stringify(c.initial)} | ${JSON.stringify(c.expected)} | ${JSON.stringify(c.actual)} | ${icon} |\n`
  })
  report += `\n`

  // 4. 预期结果 vs 实际结果 - 积分页面
  report += `**积分页面变化：**\n`
  report += `| 字段 | 初始值 | 预期值 | 实际值 | 验证结果 |\n`
  report += `|------|--------|--------|--------|----------|\n`
  creditComparisons.forEach((c) => {
    const icon = c.passed ? '✅ 通过' : '❌ 失败'
    report += `| ${c.field} | ${c.initial} | ${c.expected} | ${c.actual} | ${icon} |\n`
  })
  report += `\n`

  // 5. 业务逻辑验证
  report += `### 业务逻辑验证\n\n`
  businessLogicChecks.forEach((check) => {
    const icon = check.passed ? '✅' : '❌'
    report += `- ${icon} **${check.check}**`
    if (check.reason) {
      report += `: ${check.reason}`
    }
    report += `\n`
  })
  report += `\n`

  // 6. 总体结果
  const overallIcon = allPassed ? '✅' : '❌'
  report += `### 总体结果\n\n`
  report += `${overallIcon} **${allPassed ? '场景测试通过' : '场景测试失败'}**\n\n`

  report += `---\n\n`

  return report
}

/**
 * 生成完整的测试报告（多个场景）
 *
 * @param comparisons 多个场景对比结果
 * @param coverageData 覆盖率数据（可选）
 * @returns 完整的Markdown报告
 */
export function generateFullReport(
  comparisons: ScenarioComparison[],
  coverageData?: {
    upgrade: { coverage: number; testCount: number }
    downgrade: { coverage: number; testCount: number }
    status: { coverage: number; testCount: number }
    overall: number
  }
): string {
  let report = `# 订阅调整功能自动化测试报告\n\n`
  report += `**测试日期**: ${formatISODate(new Date('2025-11-16T00:00:00Z'))}\n`
  report += `**测试框架**: Vitest 4.0.6\n`
  report += `**总场景数**: ${comparisons.length}\n`
  report += `**通过场景**: ${comparisons.filter((c) => c.allPassed).length}\n`
  report += `**失败场景**: ${comparisons.filter((c) => !c.allPassed).length}\n`

  if (coverageData) {
    report += `**测试覆盖率**: ${coverageData.overall.toFixed(1)}%\n`
  }

  report += `\n---\n\n`

  // 添加每个场景的报告
  comparisons.forEach((comparison) => {
    report += generateScenarioReport(comparison)
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
    report += `- ✅ 业务逻辑验证正确\n`
    report += `- ✅ 订阅页面数据变化符合预期\n`
    report += `- ✅ 积分页面数据变化符合预期\n`
    if (coverageData && coverageData.overall >= 85) {
      report += `- ✅ 测试覆盖率达到${coverageData.overall.toFixed(1)}%（超过85%目标）\n`
    }
  } else {
    report += `请查看上述失败场景的详细信息，并修复相关问题。\n`
  }

  report += `\n`

  return report
}
