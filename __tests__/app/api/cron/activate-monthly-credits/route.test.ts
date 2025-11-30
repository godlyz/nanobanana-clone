/**
 * 🔥 老王测试：activate-monthly-credits Cron Job
 *
 * 功能测试：年付订阅未激活月份自动激活
 *
 * 覆盖场景：
 * 1. 安全验证（CRON_SECRET）
 * 2. 查询订阅失败处理
 * 3. 没有需要激活的订阅
 * 4. 跳过场景（没有积分记录、积分未到期）
 * 5. 成功激活场景（积分快过期，自动激活下一个月）
 * 6. 查询积分失败处理
 * 7. 更新未激活月份失败处理
 * 8. 混合场景（部分成功、部分跳过、部分失败）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/cron/activate-monthly-credits/route'

// Mock Supabase
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

// Mock Credit Service
vi.mock('@/lib/credit-service', () => ({
  createCreditService: vi.fn(),
}))

// Mock Credit Types
vi.mock('@/lib/credit-types', () => ({
  SUBSCRIPTION_MONTHLY_CREDITS: {
    basic: 100,
    pro: 500,
    max: 2000,
  },
}))

import { createServiceClient } from '@/lib/supabase/service'
import { createCreditService } from '@/lib/credit-service'

describe('Cron Job: activate-monthly-credits', () => {
  let mockSupabase: any
  let mockCreditService: any
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()

    // 默认开发环境（跳过认证）
    process.env.NODE_ENV = 'development'

    // Mock Supabase Client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    }

    // Mock Credit Service
    mockCreditService = {
      addCredits: vi.fn().mockResolvedValue({ success: true }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupabase)
    vi.mocked(createCreditService).mockResolvedValue(mockCreditService)
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  // ==================== 安全验证 ====================
  describe('安全验证', () => {
    it('生产环境应该拒绝缺少CRON_SECRET的请求', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'test-secret-key'

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('生产环境应该接受正确的CRON_SECRET', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'test-secret-key'

      // Mock没有订阅需要激活
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('开发环境应该允许不带CRON_SECRET的请求', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.CRON_SECRET

      // Mock没有订阅需要激活
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ==================== 查询订阅 ====================
  describe('查询订阅', () => {
    it('应该处理查询订阅失败的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: null,
              error: { message: 'Database error', code: 'PGRST000' },
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('查询订阅失败')
    })

    it('应该正确处理没有需要激活的订阅', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: [],  // 空数组
              error: null,
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('没有需要激活的订阅')
      expect(data.activated).toBe(0)
    })

    it('应该正确处理 subscriptions 为 null 的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: null,  // null
              error: null,
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('没有需要激活的订阅')
    })
  })

  // ==================== 积分查询和跳过场景 ====================
  describe('积分查询和跳过场景', () => {
    it('应该跳过没有积分记录的订阅', async () => {
      const mockSubscription = {
        id: 'sub-no-credits',
        user_id: 'user-123',
        plan_tier: 'pro',
        status: 'active',
        unactivated_months: 5,
      }

      // Mock查询订阅返回1个订阅
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: [mockSubscription],
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: any) => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      not: vi.fn(() => ({
                        order: vi.fn(() => ({
                          limit: vi.fn(() => ({
                            data: [],  // 没有积分记录
                            error: null,
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(0)
      expect(data.skipped).toBe(1)
      expect(data.results[0].status).toBe('skipped')
      expect(data.results[0].reason).toBe('没有积分记录')
    })

    it('应该跳过积分未到期的订阅（剩余>3天）', async () => {
      const mockSubscription = {
        id: 'sub-not-expiring',
        user_id: 'user-456',
        plan_tier: 'pro',
        status: 'active',
        unactivated_months: 5,
      }

      // 积分还有10天过期
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: [mockSubscription],
                  error: null,
                })),
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      not: vi.fn(() => ({
                        order: vi.fn(() => ({
                          limit: vi.fn(() => ({
                            data: [{ expires_at: futureDate.toISOString() }],
                            error: null,
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(0)
      expect(data.skipped).toBe(1)
      expect(data.results[0].status).toBe('skipped')
      expect(data.results[0].reason).toContain('天')
    })

    it('应该处理查询积分失败的情况', async () => {
      const mockSubscription = {
        id: 'sub-credits-error',
        user_id: 'user-error',
        plan_tier: 'pro',
        status: 'active',
        unactivated_months: 5,
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: [mockSubscription],
                  error: null,
                })),
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      not: vi.fn(() => ({
                        order: vi.fn(() => ({
                          limit: vi.fn(() => ({
                            data: null,
                            error: { message: 'Credits query error', code: 'PGRST000' },
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.errors).toBe(1)
      expect(data.results[0].status).toBe('error')
    })
  })

  // ==================== 成功激活场景 ====================
  describe('成功激活场景', () => {
    it('应该成功激活积分即将过期的订阅（剩余≤3天）', async () => {
      const mockSubscription = {
        id: 'sub-expiring',
        user_id: 'user-789',
        plan_tier: 'pro',
        status: 'active',
        unactivated_months: 5,
      }

      // 积分还有2天过期
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + 2)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: [mockSubscription],
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      not: vi.fn(() => ({
                        order: vi.fn(() => ({
                          limit: vi.fn(() => ({
                            data: [{ expires_at: expiringDate.toISOString() }],
                            error: null,
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(1)
      expect(data.results[0].status).toBe('activated')
      expect(data.results[0].creditsAdded).toBe(500)  // Pro套餐500积分
      expect(data.results[0].unactivatedMonths).toBe(4)  // 5 - 1 = 4

      // 验证调用了addCredits
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-789',
          amount: 500,
          transaction_type: 'subscription_refill',
        })
      )

      // 验证更新了未激活月份
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
    })

    it('应该处理更新未激活月份失败的情况', async () => {
      const mockSubscription = {
        id: 'sub-update-error',
        user_id: 'user-update-error',
        plan_tier: 'basic',
        status: 'active',
        unactivated_months: 3,
      }

      // 积分还有1天过期
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + 1)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: [mockSubscription],
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: { message: 'Update error', code: 'PGRST000' },
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      not: vi.fn(() => ({
                        order: vi.fn(() => ({
                          limit: vi.fn(() => ({
                            data: [{ expires_at: expiringDate.toISOString() }],
                            error: null,
                          })),
                        })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.errors).toBe(1)
      expect(data.results[0].status).toBe('error')
    })
  })

  // ==================== 混合场景 ====================
  describe('混合场景', () => {
    it('应该正确处理混合结果（部分激活、部分跳过、部分失败）', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-activate',
          user_id: 'user-activate',
          plan_tier: 'max',
          status: 'active',
          unactivated_months: 10,
        },
        {
          id: 'sub-skip',
          user_id: 'user-skip',
          plan_tier: 'pro',
          status: 'active',
          unactivated_months: 5,
        },
        {
          id: 'sub-error',
          user_id: 'user-error',
          plan_tier: 'basic',
          status: 'active',
          unactivated_months: 3,
        },
      ]

      // sub-activate: 积分2天后过期（需要激活）
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + 2)

      // sub-skip: 积分10天后过期（跳过）
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  data: mockSubscriptions,
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'credit_transactions') {
          return {
            select: vi.fn((columns: string) => ({
              eq: vi.fn((field: string, value: any) => {
                const chain = {
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gt: vi.fn(() => ({
                        not: vi.fn(() => ({
                          order: vi.fn(() => ({
                            limit: vi.fn(() => {
                              // 根据user_id返回不同的结果
                              if (value === 'user-activate') {
                                return { data: [{ expires_at: expiringDate.toISOString() }], error: null }
                              }
                              if (value === 'user-skip') {
                                return { data: [{ expires_at: futureDate.toISOString() }], error: null }
                              }
                              if (value === 'user-error') {
                                return { data: null, error: { message: 'Query error', code: 'PGRST000' } }
                              }
                              return { data: [], error: null }
                            }),
                          })),
                        })),
                      })),
                    })),
                  })),
                }
                return chain
              }),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.activated).toBe(1)  // sub-activate
      expect(data.skipped).toBe(1)   // sub-skip
      expect(data.errors).toBe(1)    // sub-error

      // 验证结果
      const activatedResult = data.results.find((r: any) => r.status === 'activated')
      expect(activatedResult.creditsAdded).toBe(2000)  // Max套餐2000积分

      const skippedResult = data.results.find((r: any) => r.status === 'skipped')
      expect(skippedResult.reason).toContain('天')

      const errorResult = data.results.find((r: any) => r.status === 'error')
      expect(errorResult.error).toBeDefined()
    })
  })

  // ==================== POST方法支持 ====================
  describe('POST方法支持', () => {
    it('应该支持POST方法调用', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ==================== 异常处理 ====================
  describe('异常处理', () => {
    it('应该处理顶层catch异常', async () => {
      // Mock抛出异常
      vi.mocked(createServiceClient).mockImplementation(() => {
        throw new Error('Service client initialization failed')
      })

      const request = new NextRequest('http://localhost:3000/api/cron/activate-monthly-credits')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('定时任务失败')
      expect(data.message).toContain('Service client initialization failed')
    })
  })
})
