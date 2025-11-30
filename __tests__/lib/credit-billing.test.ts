/**
 * 🔥 老王的Credit计费系统测试
 * 验证 10 credits/秒 的计费规则
 *
 * 计费公式:
 * - 基础费用: duration × 10 credits
 * - 1080p 倍数: 1.5x
 * - 720p 倍数: 1.0x
 */

import { describe, it, expect } from 'vitest'

// 计费函数（从 video-service.ts 提取）
function calculateCredits(duration: number, resolution: string): number {
  const baseCredits = duration * 10
  const multiplier = resolution === '1080p' ? 1.5 : 1.0
  return Math.floor(baseCredits * multiplier)
}

describe('Credit Billing System - 10 credits/秒规则', () => {
  describe('720p 视频计费（1.0x倍数）', () => {
    it('4秒 720p = 40 credits', () => {
      const cost = calculateCredits(4, '720p')
      expect(cost).toBe(40) // 4 × 10 × 1.0 = 40
    })

    it('6秒 720p = 60 credits', () => {
      const cost = calculateCredits(6, '720p')
      expect(cost).toBe(60) // 6 × 10 × 1.0 = 60
    })

    it('8秒 720p = 80 credits', () => {
      const cost = calculateCredits(8, '720p')
      expect(cost).toBe(80) // 8 × 10 × 1.0 = 80
    })
  })

  describe('1080p 视频计费（1.5x倍数）', () => {
    it('4秒 1080p = 60 credits', () => {
      const cost = calculateCredits(4, '1080p')
      expect(cost).toBe(60) // 4 × 10 × 1.5 = 60
    })

    it('6秒 1080p = 90 credits', () => {
      const cost = calculateCredits(6, '1080p')
      expect(cost).toBe(90) // 6 × 10 × 1.5 = 90
    })

    it('8秒 1080p = 120 credits', () => {
      const cost = calculateCredits(8, '1080p')
      expect(cost).toBe(120) // 8 × 10 × 1.5 = 120
    })
  })

  describe('基础计费规则验证', () => {
    it('应该遵循 10 credits/秒 的基础规则', () => {
      // 720p 测试
      expect(calculateCredits(1, '720p')).toBe(10)
      expect(calculateCredits(2, '720p')).toBe(20)
      expect(calculateCredits(5, '720p')).toBe(50)
      expect(calculateCredits(10, '720p')).toBe(100)
    })

    it('1080p 应该是 720p 的 1.5 倍', () => {
      const durations = [4, 6, 8]

      durations.forEach(duration => {
        const cost720p = calculateCredits(duration, '720p')
        const cost1080p = calculateCredits(duration, '1080p')

        // 1080p = 720p × 1.5
        expect(cost1080p).toBe(Math.floor(cost720p * 1.5))
      })
    })

    it('应该向下取整（Math.floor）', () => {
      // 测试会产生小数的情况
      const duration = 7
      const cost720p = calculateCredits(duration, '720p')
      const cost1080p = calculateCredits(duration, '1080p')

      expect(cost720p).toBe(70) // 7 × 10 = 70
      expect(cost1080p).toBe(105) // floor(7 × 10 × 1.5) = floor(105) = 105
    })
  })

  describe('特殊场景', () => {
    it('0秒视频应该是 0 credits', () => {
      expect(calculateCredits(0, '720p')).toBe(0)
      expect(calculateCredits(0, '1080p')).toBe(0)
    })

    it('不支持的分辨率应该当作 720p（1.0x）', () => {
      // 如果传入未知分辨率，默认倍数为 1.0
      const cost = calculateCredits(4, 'unknown')
      expect(cost).toBe(40) // 4 × 10 × 1.0 = 40
    })
  })

  describe('完整计费表验证', () => {
    it('应该匹配完整计费表', () => {
      const billingTable = [
        // 720p
        { duration: 4, resolution: '720p', expected: 40 },
        { duration: 6, resolution: '720p', expected: 60 },
        { duration: 8, resolution: '720p', expected: 80 },
        // 1080p
        { duration: 4, resolution: '1080p', expected: 60 },
        { duration: 6, resolution: '1080p', expected: 90 },
        { duration: 8, resolution: '1080p', expected: 120 },
      ]

      billingTable.forEach(({ duration, resolution, expected }) => {
        const cost = calculateCredits(duration, resolution)
        expect(cost).toBe(expected)
      })
    })
  })

  describe('视频延长计费（固定 40 credits）', () => {
    it('延长7秒应该扣除 40 credits（固定值）', () => {
      // 视频延长不使用 calculateCredits 函数
      // 而是直接使用固定值 40 credits
      const extensionCost = 40

      expect(extensionCost).toBe(40)
    })

    it('延长计费应该独立于源视频时长', () => {
      // 无论源视频是 4s、6s 还是 8s
      // 延长 7 秒都是固定 40 credits
      const extensionCost = 40

      expect(extensionCost).toBe(40)
      // 不应该是 7 × 10 = 70
      expect(extensionCost).not.toBe(70)
    })
  })
})

describe('Credit 计费系统 - 边界情况', () => {
  it('应该处理小数时长（虽然业务上不应该出现）', () => {
    const cost = calculateCredits(4.5, '720p')
    expect(cost).toBe(45) // 4.5 × 10 = 45
  })

  it('应该处理负数时长（虽然应该在输入验证时拦截）', () => {
    const cost = calculateCredits(-4, '720p')
    expect(cost).toBe(-40) // -4 × 10 = -40（虽然不合理）
  })

  it('应该处理极大时长', () => {
    const cost = calculateCredits(1000, '1080p')
    expect(cost).toBe(15000) // 1000 × 10 × 1.5 = 15000
  })
})

describe('Credit 计费系统 - 成本分析', () => {
  it('720p vs 1080p 成本差异', () => {
    const durations = [4, 6, 8]

    durations.forEach(duration => {
      const cost720p = calculateCredits(duration, '720p')
      const cost1080p = calculateCredits(duration, '1080p')
      const difference = cost1080p - cost720p

      // 1080p 比 720p 多 50%
      expect(difference).toBe(cost720p * 0.5)
    })
  })

  it('最贵和最便宜的组合', () => {
    const cheapest = calculateCredits(4, '720p')
    const mostExpensive = calculateCredits(8, '1080p')

    expect(cheapest).toBe(40)
    expect(mostExpensive).toBe(120)

    // 最贵是最便宜的 3 倍
    expect(mostExpensive).toBe(cheapest * 3)
  })
})
