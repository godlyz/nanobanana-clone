/**
 * 订阅续订 API 测试套件
 * 老王备注: 这个SB测试文件覆盖订阅续订的核心功能
 *
 * 测试范围:
 * 1. 成功续订已到期订阅
 * 2. 成功续订7天内到期的订阅
 * 3. 检测并使用待降级计划续订
 * 4. 参数验证（无效参数）
 * 5. 未授权用户（未登录）
 * 6. 无订阅用户续订失败
 * 7. 提前续订失败（超过7天）
 * 8. 未配置产品ID错误
 * 9. Creem API 调用失败
 * 10. 内部错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/subscription/renew/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// 在模块加载前设置环境变量
vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890')
vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')
vi.stubEnv('CREEM_BASIC_YEARLY_PRODUCT_ID', 'prod_basic_yearly')
vi.stubEnv('CREEM_PRO_MONTHLY_PRODUCT_ID', 'prod_pro_monthly')
vi.stubEnv('CREEM_PRO_YEARLY_PRODUCT_ID', 'prod_pro_yearly')
vi.stubEnv('CREEM_MAX_MONTHLY_PRODUCT_ID', 'prod_max_monthly')
vi.stubEnv('CREEM_MAX_YEARLY_PRODUCT_ID', 'prod_max_yearly')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

describe('POST /api/subscription/renew', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      limit: vi.fn(() => mockSupabase),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功续订已过期订阅', async () => {
      // Arrange - 模拟已登录用户
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      })

      // 模拟已过期订阅（10天前过期）
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      // Mock select chain
      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      // 模拟 Creem API 成功响应
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.creem.io/session_renew_123',
          id: 'checkout_renew_123',
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/session_renew_123')
      expect(data.sessionId).toBe('checkout_renew_123')
      expect(data.plan).toBe('pro')
      expect(data.billingPeriod).toBe('monthly')
      expect(data.wasDowngraded).toBe(false)

      // 🔥 老王验证：检查 Creem API 调用
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.creem.io/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': expect.stringMatching(/^creem_test_/),
          }),
          body: expect.stringMatching(/"action":"renew"/),
        })
      )
    })

    it('应该成功续订7天内到期的订阅', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-456' } },
        error: null,
      })

      // 模拟5天后到期的订阅
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_456',
          plan_tier: 'basic',
          billing_cycle: 'yearly',
          expires_at: futureDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.creem.io/session',
          id: 'session_id',
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({}), // 🔥 不提供 billingPeriod，应使用原周期
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.billingPeriod).toBe('yearly') // 🔥 使用原周期
    })

    it('应该支持切换计费周期（从月付切换到年付）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-789' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_789',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'yearly', // 🔥 切换到年付
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.billingPeriod).toBe('yearly')
    })

    it('应该检测并使用待降级计划续订', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-999' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      // 🔥 老王测试：用户设置了降级到 basic 的计划
      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_999',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: 'basic', // 🔥 有待降级计划
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.plan).toBe('basic') // 🔥 应该使用降级后的计划
      expect(data.wasDowngraded).toBe(true)

      // 验证 Creem API 调用使用了降级后的计划
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.plan_tier).toBe('basic')
      expect(requestBody.metadata.previous_plan).toBe('pro')
    })
  })

  describe('参数验证', () => {
    it('应该拒绝无效的计费周期', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      // 🔥 老王修复：mock 订阅数据，让 API 能执行到参数验证步骤
      // （因为参数验证在查询订阅之后，所以必须 mock 订阅数据）
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1) // 已过期

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [{
                  id: 'sub_123',
                  plan_tier: 'pro',
                  billing_cycle: 'monthly',
                  expires_at: expiredDate.toISOString(),
                }],
                error: null,
              })),
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'invalid_period',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('参数错误')
    })
  })

  describe('认证验证', () => {
    it('应该拒绝未登录用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('未授权')
    })

    it('应该拒绝认证错误的请求', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('续订验证', () => {
    it('应该拒绝无订阅历史的用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅不存在')
    })

    it('应该拒绝提前续订（超过7天）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      // 模拟20天后到期的订阅
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('续订失败')
      expect(data.message).toContain('尚未到期')
    })

    it('应该处理数据库查询失败', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error('Database query failed'),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅不存在')
    })
  })

  describe('Creem API 调用', () => {
    it('应该处理 Creem API 错误响应', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid product ID',
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('创建支付会话失败')
    })

    it('应该处理 Creem API 网络错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('服务器内部错误')
    })
  })

  describe('Request ID 生成', () => {
    it('应该生成包含 renew 前缀的 request_id', async () => {
      const userId = 'test-user-456'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      mockSupabase.limit.mockResolvedValue({
        data: [{
          id: 'sub_456',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          downgrade_to_plan: null,
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      await POST(request)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.request_id).toMatch(new RegExp(`^renew_${userId}_\\d+$`))
      expect(requestBody.metadata.action).toBe('renew')
    })
  })
})
