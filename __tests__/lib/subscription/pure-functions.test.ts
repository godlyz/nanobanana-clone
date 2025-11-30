/**
 * 🧪 老王的订阅纯函数单元测试
 * 目标：100% 覆盖率，测试所有边界条件
 */

import { describe, it, expect } from 'vitest'
import {
  determinePlanAction,
  calculateRemainingDays,
  calculateExtendedExpiry,
  getSubscriptionCycleDays,
  calculateFreezeParams,
  isValidPlanTier,
  isValidBillingCycle,
} from '@/lib/subscription/pure-functions'

describe('订阅纯函数测试', () => {
  describe('determinePlanAction', () => {
    it('应该识别首次购买（当前无订阅）', () => {
      expect(determinePlanAction(null, null, 'basic', 'monthly')).toBe('purchase')
      expect(determinePlanAction(null, null, 'pro', 'yearly')).toBe('purchase')
    })

    it('应该识别续费（套餐和周期都相同）', () => {
      expect(determinePlanAction('basic', 'monthly', 'basic', 'monthly')).toBe('renew')
      expect(determinePlanAction('pro', 'yearly', 'pro', 'yearly')).toBe('renew')
      expect(determinePlanAction('max', 'monthly', 'max', 'monthly')).toBe('renew')
    })

    it('应该识别升级（套餐层级提升）', () => {
      expect(determinePlanAction('basic', 'monthly', 'pro', 'monthly')).toBe('upgrade')
      expect(determinePlanAction('basic', 'yearly', 'max', 'yearly')).toBe('upgrade')
      expect(determinePlanAction('pro', 'monthly', 'max', 'monthly')).toBe('upgrade')
    })

    it('应该识别降级（套餐层级下降）', () => {
      expect(determinePlanAction('pro', 'monthly', 'basic', 'monthly')).toBe('downgrade')
      expect(determinePlanAction('max', 'yearly', 'basic', 'yearly')).toBe('downgrade')
      expect(determinePlanAction('max', 'monthly', 'pro', 'monthly')).toBe('downgrade')
    })

    it('应该识别同级别切换（套餐相同但周期不同）', () => {
      expect(determinePlanAction('pro', 'monthly', 'pro', 'yearly')).toBe('change')
      expect(determinePlanAction('basic', 'yearly', 'basic', 'monthly')).toBe('change')
      expect(determinePlanAction('max', 'monthly', 'max', 'yearly')).toBe('change')
    })
  })

  describe('calculateRemainingDays', () => {
    it('应该正确计算剩余天数（向上取整）', () => {
      const now = new Date('2025-01-01T00:00:00Z')

      // 整数天
      expect(calculateRemainingDays('2025-01-31T00:00:00Z', now)).toBe(30)

      // 365天（完整一年）
      expect(calculateRemainingDays('2026-01-01T00:00:00Z', now)).toBe(365)

      // 不足一天，向上取整为1天
      expect(calculateRemainingDays('2025-01-01T12:00:00Z', now)).toBe(1)

      // 23小时59分钟，向上取整为1天
      expect(calculateRemainingDays('2025-01-01T23:59:00Z', now)).toBe(1)
    })

    it('应该处理已过期的订阅（返回0）', () => {
      const now = new Date('2025-01-31T00:00:00Z')

      // 已经过期
      expect(calculateRemainingDays('2025-01-01T00:00:00Z', now)).toBe(0)
      expect(calculateRemainingDays('2024-12-31T23:59:59Z', now)).toBe(0)
    })

    it('应该处理闰年（2024年2月29日）', () => {
      const now = new Date('2024-02-01T00:00:00Z')

      // 2024年是闰年，2月有29天
      expect(calculateRemainingDays('2024-03-01T00:00:00Z', now)).toBe(29)
    })

    it('应该使用当前时间作为默认值', () => {
      // 未来的时间应该返回正数
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      expect(calculateRemainingDays(future)).toBeGreaterThan(0)

      // 过去的时间应该返回0
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(calculateRemainingDays(past)).toBe(0)
    })
  })

  describe('calculateExtendedExpiry', () => {
    it('应该正确延长到期时间', () => {
      // 延长30天
      expect(calculateExtendedExpiry('2025-01-01T00:00:00Z', 30))
        .toBe('2025-01-31T00:00:00.000Z')

      // 延长365天
      expect(calculateExtendedExpiry('2025-01-01T00:00:00Z', 365))
        .toBe('2026-01-01T00:00:00.000Z')

      // 延长1天
      expect(calculateExtendedExpiry('2025-12-31T23:59:59Z', 1))
        .toBe('2026-01-01T23:59:59.000Z')
    })

    it('应该处理闰年的延长', () => {
      // 2024年2月1日 + 28天 = 2月29日（闰年）
      expect(calculateExtendedExpiry('2024-02-01T00:00:00Z', 28))
        .toBe('2024-02-29T00:00:00.000Z')

      // 2024年2月1日 + 29天 = 3月1日
      expect(calculateExtendedExpiry('2024-02-01T00:00:00Z', 29))
        .toBe('2024-03-01T00:00:00.000Z')
    })

    it('应该处理0天延长（返回原值）', () => {
      const original = '2025-06-15T12:30:45Z'
      expect(calculateExtendedExpiry(original, 0))
        .toBe('2025-06-15T12:30:45.000Z')
    })

    it('应该处理大数值延长（跨年）', () => {
      // 延长730天（2年）
      expect(calculateExtendedExpiry('2025-01-01T00:00:00Z', 730))
        .toBe('2027-01-01T00:00:00.000Z')
    })
  })

  describe('getSubscriptionCycleDays', () => {
    it('应该返回月付周期天数', () => {
      expect(getSubscriptionCycleDays('monthly')).toBe(30)
    })

    it('应该返回年付周期天数', () => {
      expect(getSubscriptionCycleDays('yearly')).toBe(365)
    })
  })

  describe('calculateFreezeParams', () => {
    it('应该正确计算冻结参数（标准场景）', () => {
      const now = new Date('2025-01-01T00:00:00Z')
      const originalExpiresAt = '2026-01-01T00:00:00Z' // 365天后到期
      const frozenUntil = '2025-03-01T00:00:00Z'       // 冻结至59天后

      const result = calculateFreezeParams(originalExpiresAt, frozenUntil, now)

      // 剩余秒数 = 365天 = 31536000秒
      expect(result.remainingSeconds).toBe(31536000)

      // 新到期时间 = 2025-03-01 + 365天 = 2026-03-01（2025不是闰年）
      expect(result.newExpiresAt).toBe('2026-03-01T00:00:00.000Z')
    })

    it('应该处理已过期的积分包（剩余秒数为0）', () => {
      const now = new Date('2025-06-01T00:00:00Z')
      const originalExpiresAt = '2025-01-01T00:00:00Z' // 已过期
      const frozenUntil = '2025-07-01T00:00:00Z'

      const result = calculateFreezeParams(originalExpiresAt, frozenUntil, now)

      // 已过期，剩余秒数为0
      expect(result.remainingSeconds).toBe(0)

      // 新到期时间 = frozenUntil + 0秒 = frozenUntil
      expect(result.newExpiresAt).toBe('2025-07-01T00:00:00.000Z')
    })

    it('应该处理不足1天的剩余时间', () => {
      const now = new Date('2025-01-01T00:00:00Z')
      const originalExpiresAt = '2025-01-01T12:00:00Z' // 12小时后到期
      const frozenUntil = '2025-02-01T00:00:00Z'

      const result = calculateFreezeParams(originalExpiresAt, frozenUntil, now)

      // 剩余秒数 = 12小时 = 43200秒
      expect(result.remainingSeconds).toBe(43200)

      // 新到期时间 = 2025-02-01 + 12小时
      expect(result.newExpiresAt).toBe('2025-02-01T12:00:00.000Z')
    })

    it('应该处理长期订阅（330天剩余）', () => {
      const now = new Date('2025-01-01T00:00:00Z')
      const originalExpiresAt = '2025-11-27T00:00:00Z' // 330天后
      const frozenUntil = '2025-03-01T00:00:00Z'       // 59天后

      const result = calculateFreezeParams(originalExpiresAt, frozenUntil, now)

      // 剩余秒数 = 330天 = 28512000秒
      expect(result.remainingSeconds).toBe(28512000)

      // 新到期时间 = 2025-03-01 + 330天 = 2026-01-25
      expect(result.newExpiresAt).toBe('2026-01-25T00:00:00.000Z')
    })

    it('应该使用当前时间作为默认值', () => {
      // 使用未来时间测试
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      const frozenUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const result = calculateFreezeParams(future, frozenUntil)

      // 应该有剩余秒数（大约335天）
      expect(result.remainingSeconds).toBeGreaterThan(28000000) // 约324天
      expect(result.remainingSeconds).toBeLessThan(32000000)    // 约370天
    })
  })

  describe('isValidPlanTier', () => {
    it('应该验证有效的套餐层级', () => {
      expect(isValidPlanTier('basic')).toBe(true)
      expect(isValidPlanTier('pro')).toBe(true)
      expect(isValidPlanTier('max')).toBe(true)
    })

    it('应该拒绝无效的套餐层级', () => {
      expect(isValidPlanTier('premium')).toBe(false)
      expect(isValidPlanTier('invalid')).toBe(false)
      expect(isValidPlanTier('')).toBe(false)
      expect(isValidPlanTier('BASIC')).toBe(false) // 大小写敏感
    })
  })

  describe('isValidBillingCycle', () => {
    it('应该验证有效的计费周期', () => {
      expect(isValidBillingCycle('monthly')).toBe(true)
      expect(isValidBillingCycle('yearly')).toBe(true)
    })

    it('应该拒绝无效的计费周期', () => {
      expect(isValidBillingCycle('weekly')).toBe(false)
      expect(isValidBillingCycle('invalid')).toBe(false)
      expect(isValidBillingCycle('')).toBe(false)
      expect(isValidBillingCycle('MONTHLY')).toBe(false) // 大小写敏感
    })
  })
})
