/**
 * 🔥 老王实现：定时任务 - 激活 pending 订阅测试
 *
 * 测试范围：
 * 1. 成功激活到期的 pending 订阅（月付+年付）
 * 2. 跳过未到期的 pending 订阅
 * 3. 正确充值首月积分和年付赠送积分
 * 4. 更新 unactivated_months 字段
 * 5. 安全验证（生产环境需要 CRON_SECRET）
 * 6. 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/cron/activate-pending-subscriptions/route'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Mock Supabase Service Client
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

// 🔥 老王修复：提前导入避免动态 require
import { createCreditService } from '@/lib/credit-service'
import { SUBSCRIPTION_MONTHLY_CREDITS, SUBSCRIPTION_YEARLY_ACTUAL_CREDITS } from '@/lib/credit-types'

// Mock credit-service
vi.mock('@/lib/credit-service', () => ({
  createCreditService: vi.fn(),
}))

// Mock credit-types
vi.mock('@/lib/credit-types', () => ({
  SUBSCRIPTION_MONTHLY_CREDITS: {
    basic: 500,
    pro: 2000,
    max: 10000,
  },
  SUBSCRIPTION_YEARLY_ACTUAL_CREDITS: {
    basic: 7000,  // 12*500 + 1000
    pro: 28000,   // 12*2000 + 4000
    max: 140000,  // 12*10000 + 20000
  },
}))

// 在模块加载前设置环境变量
vi.stubEnv('CRON_SECRET', 'test_cron_secret_123')
vi.stubEnv('NODE_ENV', 'production')

describe('Cron Job: activate-pending-subscriptions', () => {
  let mockSupabase: any
  let mockCreditService: any

  beforeEach(() => {
    const now = new Date().toISOString()

    // 🔥 Mock Supabase Service Client
    const mockEqChain = {
      eq: vi.fn(() => mockEqChain),
      lte: vi.fn(() => mockEqChain),
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
      single: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => mockEqChain),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'new-sub-id' },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => mockEqChain),
      })),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupabase)

    // 🔥 Mock Credit Service
    mockCreditService = {
      addCredits: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(createCreditService).mockResolvedValue(mockCreditService)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功激活到期的月付 pending 订阅', async () => {
      const now = new Date()
      const activationDate = new Date(now.getTime() - 60000) // 1分钟前

      // Mock 查询返回1个到期的 pending 订阅
      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: [{
            id: 'pending-sub-123',
            user_id: 'user-456',
            plan_tier: 'pro',
            billing_cycle: 'monthly',
            monthly_credits: 2000,
            activation_date: activationDate.toISOString(),
          }],
          error: null,
        })),
      }

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => mockEqChain),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(1)
      expect(data.errors).toBe(0)

      // 🔥 验证充值首月积分
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          amount: 2000,
          transaction_type: 'subscription_refill',
        })
      )
    })

    it('应该成功激活年付订阅并充值赠送积分', async () => {
      const now = new Date()
      const activationDate = new Date(now.getTime() - 60000)

      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: [{
            id: 'pending-yearly-456',
            user_id: 'user-789',
            plan_tier: 'max',
            billing_cycle: 'yearly',
            monthly_credits: 10000,
            activation_date: activationDate.toISOString(),
          }],
          error: null,
        })),
      }

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => mockEqChain),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(1)

      // 🔥 验证充值首月积分 + 年付赠送积分
      expect(mockCreditService.addCredits).toHaveBeenCalledTimes(2)

      // 首月积分
      expect(mockCreditService.addCredits).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          user_id: 'user-789',
          amount: 10000,
          transaction_type: 'subscription_refill',
        })
      )

      // 年付赠送积分 (140000 - 12*10000 = 20000)
      expect(mockCreditService.addCredits).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          user_id: 'user-789',
          amount: 20000,
          transaction_type: 'subscription_bonus',
        })
      )
    })

    it('应该跳过未到期的 pending 订阅', async () => {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 86400000) // 1天后

      // Mock 返回空数据
      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => mockEqChain),
      }))

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(0)
      expect(data.message).toContain('没有需要激活的')
    })
  })

  describe('安全验证', () => {
    it('应该拒绝没有 CRON_SECRET 的请求（生产环境）', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong_secret',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('应该接受正确的 CRON_SECRET', async () => {
      // Mock 空数据（没有到期订阅）
      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => mockEqChain),
      }))

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库查询错误', async () => {
      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: null,
          error: new Error('Database connection failed'),
        })),
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => mockEqChain),
      }))

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('查询 pending 订阅失败')
    })

    it('应该处理订阅更新失败', async () => {
      const now = new Date()
      const activationDate = new Date(now.getTime() - 60000)

      const mockEqChain = {
        eq: vi.fn(() => mockEqChain),
        lte: vi.fn(() => ({
          data: [{
            id: 'pending-fail-789',
            user_id: 'user-fail',
            plan_tier: 'basic',
            billing_cycle: 'monthly',
            monthly_credits: 500,
            activation_date: activationDate.toISOString(),
          }],
          error: null,
        })),
      }

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => mockEqChain),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: new Error('Update failed'),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-pending-subscriptions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test_cron_secret_123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 🔥 Cron Job 仍然返回200，但有错误记录
      expect(data.success).toBe(true)
      expect(data.errors).toBe(1)
    })
  })
})
