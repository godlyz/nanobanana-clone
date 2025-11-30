// 🔥 老王的订阅时间计算验证脚本（浏览器 Console 中运行）
// 使用方法：在浏览器开发者工具 Console 中粘贴并运行

// ============================================================
// 🧪 时间计算验证函数库
// ============================================================

const SubscriptionTestUtils = {
  /**
   * 计算两个日期之间的天数差
   * @param {string|Date} date1 - 开始日期
   * @param {string|Date} date2 - 结束日期
   * @returns {number} - 天数差（向上取整）
   */
  calculateDaysDiff(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffMs = d2.getTime() - d1.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  },

  /**
   * 验证升级 Immediate 模式的时间计算
   * @param {Object} params - 参数对象
   * @param {string} params.createdAt - 新订阅创建时间
   * @param {string} params.expiresAt - 新订阅过期时间
   * @param {number} params.basePeriodDays - 基础周期天数（月付=30，年付=365）
   * @param {number} params.oldRemainingDays - 旧订阅剩余天数
   */
  validateUpgradeImmediate({ createdAt, expiresAt, basePeriodDays, oldRemainingDays }) {
    const actualDays = this.calculateDaysDiff(createdAt, expiresAt)
    const expectedDays = basePeriodDays + oldRemainingDays

    console.group('🧪 升级 Immediate 模式验证')
    console.log('📅 新订阅创建时间:', createdAt)
    console.log('📅 新订阅过期时间:', expiresAt)
    console.log('⏱️  基础周期天数:', basePeriodDays)
    console.log('⏱️  旧订阅剩余天数:', oldRemainingDays)
    console.log('📊 预期总天数:', expectedDays)
    console.log('📊 实际总天数:', actualDays)
    console.log('🔍 误差:', Math.abs(actualDays - expectedDays), '天')

    if (actualDays === expectedDays) {
      console.log('✅ 时间计算正确！')
    } else if (Math.abs(actualDays - expectedDays) <= 1) {
      console.warn('⚠️  时间计算有轻微误差（±1天，可能是浮点运算或时区问题）')
    } else {
      console.error('❌ 时间计算错误！')
    }
    console.groupEnd()

    return actualDays === expectedDays
  },

  /**
   * 验证升级 Scheduled 模式的时间计算
   * @param {Object} params - 参数对象
   */
  validateUpgradeScheduled({ createdAt, expiresAt, basePeriodDays, oldRemainingDays }) {
    const actualDays = this.calculateDaysDiff(createdAt, expiresAt)
    const expectedDays = basePeriodDays // Scheduled 模式不包含旧订阅剩余时间

    console.group('🧪 升级 Scheduled 模式验证')
    console.log('📅 新订阅创建时间:', createdAt)
    console.log('📅 新订阅过期时间:', expiresAt)
    console.log('⏱️  基础周期天数:', basePeriodDays)
    console.log('⏱️  旧订阅剩余天数:', oldRemainingDays, '（不应包含在内）')
    console.log('📊 预期总天数:', expectedDays, '（独立计算）')
    console.log('📊 实际总天数:', actualDays)
    console.log('🔍 误差:', Math.abs(actualDays - expectedDays), '天')

    if (actualDays === expectedDays) {
      console.log('✅ 时间计算正确（独立计算，未包含旧订阅剩余时间）')
    } else if (actualDays === basePeriodDays + oldRemainingDays) {
      console.error('❌ 错误：包含了旧订阅剩余时间！')
    } else {
      console.error('❌ 时间计算错误！')
    }
    console.groupEnd()

    return actualDays === expectedDays
  },

  /**
   * 验证降级 Immediate 模式的时间计算
   * @param {Object} params - 参数对象
   */
  validateDowngradeImmediate({ createdAt, expiresAt, basePeriodDays, oldRemainingDays }) {
    return this.validateUpgradeImmediate({ createdAt, expiresAt, basePeriodDays, oldRemainingDays })
  },

  /**
   * 验证降级 Scheduled 模式的时间计算
   * @param {Object} params - 参数对象
   */
  validateDowngradeScheduled({ createdAt, expiresAt, basePeriodDays, oldRemainingDays }) {
    return this.validateUpgradeScheduled({ createdAt, expiresAt, basePeriodDays, oldRemainingDays })
  },

  /**
   * 快速验证：输入创建时间和过期时间，自动计算天数
   * @param {string} createdAt - 创建时间
   * @param {string} expiresAt - 过期时间
   */
  quickValidate(createdAt, expiresAt) {
    const days = this.calculateDaysDiff(createdAt, expiresAt)
    console.group('⚡ 快速验证')
    console.log('📅 创建时间:', createdAt)
    console.log('📅 过期时间:', expiresAt)
    console.log('📊 总天数:', days)

    // 判断可能的计划类型
    if (days >= 28 && days <= 32) {
      console.log('💡 可能是: 月付订阅（30天）')
    } else if (days >= 363 && days <= 367) {
      console.log('💡 可能是: 年付订阅（365天）')
    } else if (days >= 40 && days <= 50) {
      console.log('💡 可能是: 月付 + 延长 10-20天（Immediate 模式）')
    } else if (days >= 400) {
      console.log('💡 可能是: 年付 + 长时间延长（Immediate 模式）')
    } else {
      console.log('💡 自定义周期:', days, '天')
    }

    console.groupEnd()
    return days
  },

  /**
   * 批量验证：从数据库查询结果批量验证
   * @param {Array} subscriptions - 订阅数组
   * @example
   * SubscriptionTestUtils.batchValidate([
   *   { createdAt: '2025-11-09', expiresAt: '2025-12-24', basePeriodDays: 30, oldRemainingDays: 15, mode: 'immediate' },
   *   { createdAt: '2025-11-09', expiresAt: '2026-11-09', basePeriodDays: 365, oldRemainingDays: 20, mode: 'scheduled' }
   * ])
   */
  batchValidate(subscriptions) {
    console.group('🧪 批量验证')
    const results = subscriptions.map((sub, index) => {
      console.log(`\n--- 订阅 ${index + 1} ---`)
      if (sub.mode === 'immediate') {
        return this.validateUpgradeImmediate(sub)
      } else if (sub.mode === 'scheduled') {
        return this.validateUpgradeScheduled(sub)
      } else {
        return this.quickValidate(sub.createdAt, sub.expiresAt)
      }
    })

    const passCount = results.filter(r => r === true).length
    const totalCount = results.length

    console.log(`\n📊 批量验证结果: ${passCount}/${totalCount} 通过`)
    console.groupEnd()

    return results
  },

  /**
   * 格式化时间为本地时间字符串
   * @param {string|Date} date - 日期
   */
  formatDate(date) {
    return new Date(date).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  },

  /**
   * 计算剩余天数（当前时间到过期时间）
   * @param {string|Date} expiresAt - 过期时间
   */
  calculateRemainingDays(expiresAt) {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }
}

// ============================================================
// 📋 测试场景模板
// ============================================================

console.log('%c🔥 老王的订阅测试工具已加载！', 'color: orange; font-size: 16px; font-weight: bold;')
console.log('%c使用方法:', 'color: green; font-weight: bold;')
console.log('1. SubscriptionTestUtils.quickValidate(createdAt, expiresAt) - 快速验证')
console.log('2. SubscriptionTestUtils.validateUpgradeImmediate({...}) - 验证升级 Immediate')
console.log('3. SubscriptionTestUtils.validateUpgradeScheduled({...}) - 验证升级 Scheduled')
console.log('4. SubscriptionTestUtils.calculateRemainingDays(expiresAt) - 计算剩余天数')
console.log('\n示例：')
console.log(`SubscriptionTestUtils.quickValidate('2025-11-09T00:00:00Z', '2025-12-24T00:00:00Z')`)

// ============================================================
// 🧪 预定义测试场景（复制到 Console 运行）
// ============================================================

// 场景 1.1: 升级 Immediate（月付 → 月付，剩余 15 天）
const testScenario1_1 = () => {
  console.log('%c场景 1.1: 升级 Immediate（月付 → 月付）', 'color: blue; font-size: 14px; font-weight: bold;')
  SubscriptionTestUtils.validateUpgradeImmediate({
    createdAt: '2025-11-09T00:00:00Z',  // 🔥 替换为实际值
    expiresAt: '2025-12-24T00:00:00Z',   // 🔥 替换为实际值
    basePeriodDays: 30,
    oldRemainingDays: 15
  })
}

// 场景 1.2: 升级 Scheduled（月付 → 年付，剩余 20 天）
const testScenario1_2 = () => {
  console.log('%c场景 1.2: 升级 Scheduled（月付 → 年付）', 'color: blue; font-size: 14px; font-weight: bold;')
  SubscriptionTestUtils.validateUpgradeScheduled({
    createdAt: '2025-11-09T00:00:00Z',  // 🔥 替换为实际值
    expiresAt: '2026-11-09T00:00:00Z',   // 🔥 替换为实际值
    basePeriodDays: 365,
    oldRemainingDays: 20  // 不应包含在内
  })
}

// 场景 2.1: 降级 Immediate（Pro → Basic，剩余 12 天）
const testScenario2_1 = () => {
  console.log('%c场景 2.1: 降级 Immediate（Pro → Basic）', 'color: blue; font-size: 14px; font-weight: bold;')
  SubscriptionTestUtils.validateDowngradeImmediate({
    createdAt: '2025-11-09T00:00:00Z',  // 🔥 替换为实际值
    expiresAt: '2025-12-21T00:00:00Z',   // 🔥 替换为实际值
    basePeriodDays: 30,
    oldRemainingDays: 12
  })
}

// 场景 3.1: 剩余天数为 0
const testScenario3_1 = () => {
  console.log('%c场景 3.1: 剩余天数为 0', 'color: blue; font-size: 14px; font-weight: bold;')
  SubscriptionTestUtils.validateUpgradeImmediate({
    createdAt: '2025-11-09T00:00:00Z',  // 🔥 替换为实际值
    expiresAt: '2025-12-09T00:00:00Z',   // 🔥 替换为实际值（应该是30天，不延长）
    basePeriodDays: 30,
    oldRemainingDays: 0
  })
}

// 场景 3.2: 剩余天数 > 365
const testScenario3_2 = () => {
  console.log('%c场景 3.2: 剩余天数 > 365', 'color: blue; font-size: 14px; font-weight: bold;')
  SubscriptionTestUtils.validateUpgradeImmediate({
    createdAt: '2025-11-09T00:00:00Z',  // 🔥 替换为实际值
    expiresAt: '2027-01-18T00:00:00Z',   // 🔥 替换为实际值（应该是 365 + 400 = 765天）
    basePeriodDays: 365,
    oldRemainingDays: 400
  })
}

// ============================================================
// 📊 从 Network 面板获取数据并验证
// ============================================================

/**
 * 从升级 API 响应中提取数据并验证
 * @param {Object} apiResponse - API 响应对象
 * @example
 * // 1. 在 Network 面板找到 /api/subscription/upgrade 请求
 * // 2. 复制 Response 内容
 * // 3. 运行: validateFromUpgradeAPI(response)
 */
const validateFromUpgradeAPI = (apiResponse) => {
  if (!apiResponse.success) {
    console.error('❌ API 调用失败:', apiResponse.error)
    return
  }

  console.group('📡 从升级 API 响应验证')
  console.log('API 响应:', apiResponse)

  const { createdAt, expiresAt, billingPeriod, adjustmentMode, remainingDays } = apiResponse
  const basePeriodDays = billingPeriod === 'yearly' ? 365 : 30

  if (adjustmentMode === 'immediate') {
    SubscriptionTestUtils.validateUpgradeImmediate({
      createdAt,
      expiresAt,
      basePeriodDays,
      oldRemainingDays: remainingDays || 0
    })
  } else if (adjustmentMode === 'scheduled') {
    SubscriptionTestUtils.validateUpgradeScheduled({
      createdAt,
      expiresAt,
      basePeriodDays,
      oldRemainingDays: remainingDays || 0
    })
  }

  console.groupEnd()
}

// ============================================================
// 📋 使用示例
// ============================================================

console.log('\n%c📋 使用示例:', 'color: green; font-size: 14px; font-weight: bold;')
console.log('\n1️⃣ 快速验证（仅需创建和过期时间）:')
console.log(`   SubscriptionTestUtils.quickValidate('2025-11-09T00:00:00Z', '2025-12-24T00:00:00Z')`)

console.log('\n2️⃣ 验证升级 Immediate:')
console.log(`   SubscriptionTestUtils.validateUpgradeImmediate({
     createdAt: '2025-11-09T00:00:00Z',
     expiresAt: '2025-12-24T00:00:00Z',
     basePeriodDays: 30,
     oldRemainingDays: 15
   })`)

console.log('\n3️⃣ 验证升级 Scheduled:')
console.log(`   SubscriptionTestUtils.validateUpgradeScheduled({
     createdAt: '2025-11-09T00:00:00Z',
     expiresAt: '2026-11-09T00:00:00Z',
     basePeriodDays: 365,
     oldRemainingDays: 20
   })`)

console.log('\n4️⃣ 计算剩余天数:')
console.log(`   SubscriptionTestUtils.calculateRemainingDays('2025-12-24T00:00:00Z')`)

console.log('\n5️⃣ 运行预定义场景:')
console.log(`   testScenario1_1()  // 场景 1.1`)
console.log(`   testScenario1_2()  // 场景 1.2`)
console.log(`   testScenario2_1()  // 场景 2.1`)

console.log('\n6️⃣ 批量验证:')
console.log(`   SubscriptionTestUtils.batchValidate([
     { createdAt: '...', expiresAt: '...', basePeriodDays: 30, oldRemainingDays: 15, mode: 'immediate' },
     { createdAt: '...', expiresAt: '...', basePeriodDays: 365, oldRemainingDays: 20, mode: 'scheduled' }
   ])`)

console.log('\n%c🎯 开始测试吧！', 'color: orange; font-size: 16px; font-weight: bold;')
