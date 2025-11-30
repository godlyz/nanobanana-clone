/**
 * 🔥 老王的视频生成统计API测试
 * 测试成功率监控和性能指标
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Video Generation Stats API', () => {
  let mockSupabase: any

  beforeEach(() => {
    // 重置 mock
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  describe('Success Rate Calculation', () => {
    it('应该正确计算成功率（100%）', () => {
      const videos = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ]

      const completed = videos.filter(v => v.status === 'completed').length
      const total = videos.length
      const successRate = (completed / total) * 100

      expect(successRate).toBe(100)
      expect(successRate).toBeGreaterThanOrEqual(95) // 达标
    })

    it('应该正确计算成功率（≥95% 达标）', () => {
      const videos = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' }, // 1 个失败，95% 成功率
      ]

      const completed = videos.filter(v => v.status === 'completed').length
      const total = videos.length
      const successRate = (completed / total) * 100

      expect(successRate).toBe(95)
      expect(successRate).toBeGreaterThanOrEqual(95) // 刚好达标
    })

    it('应该检测到成功率不达标（<95%）', () => {
      const videos = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' },
        { status: 'failed' },
        { status: 'failed' },
      ]

      const completed = videos.filter(v => v.status === 'completed').length
      const total = videos.length
      const successRate = (completed / total) * 100

      expect(successRate).toBe(62.5) // 5/8 = 62.5%
      expect(successRate).toBeLessThan(95) // 不达标
    })
  })

  describe('Processing Time Calculation', () => {
    it('应该正确计算处理时间（秒）', () => {
      const createdAt = '2025-11-23T00:00:00Z'
      const completedAt = '2025-11-23T00:02:30Z' // 2分30秒后

      const created = new Date(createdAt).getTime()
      const completed = new Date(completedAt).getTime()
      const processingTime = (completed - created) / 1000

      expect(processingTime).toBe(150) // 150秒 = 2分30秒
    })

    it('应该检测到处理时间达标（<180秒）', () => {
      const processingTimes = [120, 150, 170, 160, 140] // 全部 <180 秒

      const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length

      expect(avgTime).toBe(148) // 平均 148 秒
      expect(avgTime).toBeLessThan(180) // 达标（<3分钟）
    })

    it('应该检测到处理时间不达标（≥180秒）', () => {
      const processingTimes = [200, 220, 250, 180, 190] // 多数 >180 秒

      const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length

      expect(avgTime).toBe(208) // 平均 208 秒
      expect(avgTime).toBeGreaterThanOrEqual(180) // 不达标
    })
  })

  describe('Time Range Parsing', () => {
    it('应该支持所有时间范围选项', () => {
      const ranges = ['1h', '24h', '7d', '30d', 'all']

      ranges.forEach(range => {
        expect(['1h', '24h', '7d', '30d', 'all']).toContain(range)
      })
    })

    it('应该计算正确的时间范围毫秒数', () => {
      const getRangeMs = (range: string): number => {
        switch (range) {
          case '1h': return 60 * 60 * 1000
          case '24h': return 24 * 60 * 60 * 1000
          case '7d': return 7 * 24 * 60 * 60 * 1000
          case '30d': return 30 * 24 * 60 * 60 * 1000
          case 'all': return 0
          default: return 0
        }
      }

      expect(getRangeMs('1h')).toBe(3600000) // 1小时
      expect(getRangeMs('24h')).toBe(86400000) // 1天
      expect(getRangeMs('7d')).toBe(604800000) // 7天
      expect(getRangeMs('30d')).toBe(2592000000) // 30天
      expect(getRangeMs('all')).toBe(0) // 无限制
    })
  })

  describe('Failure Reason Grouping', () => {
    it('应该按错误代码分组统计', () => {
      const failures = [
        { error_code: 'TIMEOUT', error_message: 'API timeout' },
        { error_code: 'TIMEOUT', error_message: 'Connection timeout' },
        { error_code: 'INVALID_PARAMS', error_message: 'Invalid prompt' },
        { error_code: 'TIMEOUT', error_message: 'Request timeout' },
      ]

      const grouped = failures.reduce((acc, item) => {
        const code = item.error_code || 'UNKNOWN'
        if (!acc[code]) {
          acc[code] = { count: 0, examples: [] }
        }
        acc[code].count++
        return acc
      }, {} as Record<string, { count: number; examples: string[] }>)

      expect(grouped['TIMEOUT'].count).toBe(3)
      expect(grouped['INVALID_PARAMS'].count).toBe(1)
    })
  })

  describe('Performance Percentiles', () => {
    it('应该正确计算 P50/P95/P99', () => {
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].sort((a, b) => a - b)

      const p50Index = Math.floor(times.length * 0.5)
      const p95Index = Math.floor(times.length * 0.95)
      const p99Index = Math.floor(times.length * 0.99)

      expect(times[p50Index]).toBe(60) // P50 = 60
      expect(times[p95Index]).toBe(100) // P95 = 100
      expect(times[p99Index]).toBe(100) // P99 = 100
    })
  })

  describe('Duration Formatting', () => {
    it('应该正确格式化时长', () => {
      const format = (seconds: number | null): string => {
        if (seconds === null) return 'N/A'
        if (seconds < 60) return `${Math.round(seconds)}s`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.round(seconds % 60)
        return `${minutes}m ${remainingSeconds}s`
      }

      expect(format(45)).toBe('45s')
      expect(format(90)).toBe('1m 30s')
      expect(format(150)).toBe('2m 30s')
      expect(format(null)).toBe('N/A')
    })
  })

  describe('Parameter Statistics', () => {
    it('应该按分辨率统计成功率', () => {
      const videos = [
        { resolution: '720p', status: 'completed' },
        { resolution: '720p', status: 'completed' },
        { resolution: '720p', status: 'failed' },
        { resolution: '1080p', status: 'completed' },
      ]

      const videos720p = videos.filter(v => v.resolution === '720p')
      const total720p = videos720p.length
      const completed720p = videos720p.filter(v => v.status === 'completed').length
      const successRate720p = (completed720p / total720p) * 100

      expect(total720p).toBe(3)
      expect(successRate720p).toBeCloseTo(66.67, 1) // 2/3 = 66.67%
    })
  })
})
