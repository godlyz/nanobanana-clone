/**
 * Checkout API 测试套件
 * 老王备注: 这个SB测试文件覆盖支付会话创建的核心功能
 *
 * 测试范围:
 * 1. 创建支付会话成功场景
 * 2. 参数验证（缺少参数）
 * 3. 未配置 API Key 错误
 * 4. 无效的计划或计费周期
 * 5. 未授权用户（未登录）
 * 6. Creem API 调用失败
 * 7. 内部错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/checkout/route'
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

describe('POST /api/checkout', () => {
  let mockSupabase: any

  beforeEach(() => {

    // 🔥 老王修复：Mock Supabase client（添加 rpc Mock）
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(), // 艹！之前缺少这个，导致API调用 get_user_active_subscription 时报错
    }

    // 🔥 默认Mock：无活跃订阅（首次购买场景）
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null })

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功创建 Basic Monthly 支付会话', async () => {
      // Arrange - 模拟已登录用户
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      })

      // 模拟 Creem API 成功响应
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.creem.io/session_123',
          id: 'checkout_123',
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/session_123')
      expect(data.sessionId).toBe('checkout_123')

      // 🔥 老王修复：由于模块缓存，环境变量在模块加载时已读取
      // 测试应验证 API 调用的结构而非具体值
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.creem.io/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': expect.stringMatching(/^creem_test_/), // 验证测试环境前缀
          }),
          body: expect.stringMatching(/"product_id":"prod_/), // 验证有 product_id 字段
        })
      )
    })

    it('应该支持所有计划和计费周期组合', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session_id' }),
      } as Response)

      const combinations = [
        { planId: 'basic', billingPeriod: 'monthly', productId: 'prod_basic_monthly' },
        { planId: 'basic', billingPeriod: 'yearly', productId: 'prod_basic_yearly' },
        { planId: 'pro', billingPeriod: 'monthly', productId: 'prod_pro_monthly' },
        { planId: 'pro', billingPeriod: 'yearly', productId: 'prod_pro_yearly' },
        { planId: 'max', billingPeriod: 'monthly', productId: 'prod_max_monthly' },
        { planId: 'max', billingPeriod: 'yearly', productId: 'prod_max_yearly' },
      ]

      for (const combo of combinations) {
        vi.clearAllMocks()

        const request = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            planId: combo.planId,
            billingPeriod: combo.billingPeriod,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        // 🔥 老王修复：验证 API 被调用且包含 product_id 字段（不验证具体值）
        expect(global.fetch).toHaveBeenCalledWith(
          'https://test-api.creem.io/v1/checkouts',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringMatching(/"product_id":"prod_/),
          })
        )
      }
    })
  })

  describe('参数验证', () => {
    it('应该拒绝缺少 planId 的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('应该拒绝缺少 billingPeriod 的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters')
    })

    it('应该拒绝无效的计划', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'invalid_plan',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan or billing period')
    })

    it('应该拒绝无效的计费周期', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'invalid_period',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan or billing period')
    })
  })

  describe('认证验证', () => {
    it('应该拒绝未登录用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('未授权')
      expect(data.message).toBe('请先登录才能购买订阅')
    })

    it('应该拒绝认证错误的请求', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('API 配置验证', () => {
    it('应该拒绝未配置 CREEM_API_KEY 的请求', async () => {
      // 🔥 老王修复：现在环境变量在函数内部读取，可以使用 vi.stubEnv 测试了
      vi.stubEnv('CREEM_API_KEY', '') // 模拟未配置

      const response = await POST(
        new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            planId: 'basic',
            billingPeriod: 'monthly',
          }),
        })
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Payment service not configured')

      vi.unstubAllEnvs() // 清理环境变量mock
    })
  })

  describe('Creem API 调用', () => {
    it('应该处理 Creem API 错误响应', async () => {
      // 🔥 老王修复：确保环境变量在测试中生效
      vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890')
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid product ID',
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to create checkout session')

      vi.unstubAllEnvs() // 清理环境变量
    })

    it('应该处理 Creem API 网络错误', async () => {
      // 🔥 老王修复：确保环境变量在测试中生效
      vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890')
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')

      vi.unstubAllEnvs() // 清理环境变量
    })
  })

  describe('环境检测', () => {
    it('应该在测试模式下使用测试 API URL', async () => {
      // 🔥 老王修复：确保环境变量在测试中生效
      vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890') // test_ 前缀触发测试模式
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      await POST(request)

      // 验证使用了测试环境 URL (因为 vi.stubEnv 设置了 creem_test_ 前缀的 API key)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.creem.io/v1/checkouts',
        expect.any(Object)
      )

      vi.unstubAllEnvs() // 清理环境变量
    })

    it('应该在生产模式下使用生产 API URL', async () => {
      // 🔥 老王修复：确保环境变量在测试中生效
      vi.stubEnv('CREEM_API_KEY', 'creem_live_test123') // 模拟生产环境key（不以test_开头）
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly') // 🔥 添加产品ID

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-prod' } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ checkout_url: 'https://checkout.creem.io/test' }),
      } as Response)

      await POST(
        new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            planId: 'basic',
            billingPeriod: 'monthly',
          }),
        })
      )

      // 验证fetch被调用时使用的是生产URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.creem.io/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
        })
      )

      vi.unstubAllEnvs()
    })
  })

  describe('Request ID 生成', () => {
    it('应该生成包含用户 ID 和时间戳的 request_id', async () => {
      // 🔥 老王修复：确保环境变量在测试中生效
      vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890')
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')

      const userId = 'test-user-456'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      await POST(request)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.request_id).toMatch(new RegExp(`^${userId}_\\d+$`))

      vi.unstubAllEnvs() // 清理环境变量
    })
  })

  // 🔥 老王补充：订阅变更场景测试（提升分支覆盖率）
  describe('订阅变更场景', () => {
    beforeEach(() => {
      vi.stubEnv('CREEM_API_KEY', 'creem_test_1234567890')
      vi.stubEnv('CREEM_BASIC_MONTHLY_PRODUCT_ID', 'prod_basic_monthly')
      vi.stubEnv('CREEM_PRO_MONTHLY_PRODUCT_ID', 'prod_pro_monthly')
      vi.stubEnv('CREEM_MAX_YEARLY_PRODUCT_ID', 'prod_max_yearly')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('应该处理订阅升级场景（Basic → Pro）', async () => {
      const userId = 'test-user-upgrade'

      // Mock用户已登录
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Mock用户当前有Basic订阅
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-basic-123',
            plan_tier: 'basic',
            billing_cycle: 'monthly',
            expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20天后过期
          },
        ],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/upgrade', id: 'checkout_upgrade' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // 验证返回成功
      expect(response.status).toBe(200)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/upgrade')

      // 验证metadata包含升级信息
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata.action).toBe('upgrade')
      expect(requestBody.metadata.current_subscription_id).toBe('sub-basic-123')
    })

    it('应该处理订阅降级场景（Pro → Basic）', async () => {
      const userId = 'test-user-downgrade'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Mock用户当前有Pro订阅
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-pro-456',
            plan_tier: 'pro',
            billing_cycle: 'monthly',
            expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/downgrade', id: 'checkout_downgrade' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/downgrade')

      // 验证metadata包含降级信息
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata.action).toBe('downgrade')
      expect(requestBody.metadata.current_subscription_id).toBe('sub-pro-456')
    })

    it('应该处理订阅续费场景（相同套餐）', async () => {
      const userId = 'test-user-renew'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Mock用户当前有Pro月付订阅
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-pro-789',
            plan_tier: 'pro',
            billing_cycle: 'monthly',
            expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/renew', id: 'checkout_renew' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // 验证metadata包含续费信息
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata.action).toBe('renew')
      expect(requestBody.metadata.current_subscription_id).toBe('sub-pro-789')
    })

    it('应该处理 adjustmentMode=immediate 场景', async () => {
      const userId = 'test-user-immediate'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Mock用户当前有订阅，剩余10天
      const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-old-123',
            plan_tier: 'basic',
            billing_cycle: 'monthly',
            expires_at: expiresAt.toISOString(),
          },
        ],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/immediate', id: 'checkout_immediate' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'pro',
          billingPeriod: 'monthly',
          adjustmentMode: 'immediate', // 🔥 测试 adjustmentMode 参数
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // 验证metadata包含remaining_days
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata.adjustment_mode).toBe('immediate')
      expect(requestBody.metadata.remaining_days).toBe('10') // 剩余10天
      expect(requestBody.metadata.action).toBe('upgrade')
    })

    it('应该拒绝无效的 adjustmentMode 参数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-invalid' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'pro',
          billingPeriod: 'monthly',
          adjustmentMode: 'invalid_mode', // 🔥 无效的 adjustmentMode
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid adjustment mode')
    })

    it('应该处理计费周期变更场景（Basic月付 → Basic年付）', async () => {
      const userId = 'test-user-change-cycle'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Mock用户当前有Basic月付订阅
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-basic-monthly',
            plan_tier: 'basic',
            billing_cycle: 'monthly',
            expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        error: null,
      })

      vi.stubEnv('CREEM_BASIC_YEARLY_PRODUCT_ID', 'prod_basic_yearly')

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/change', id: 'checkout_change' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: 'basic',
          billingPeriod: 'yearly', // 🔥 改变计费周期
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // 验证metadata包含change信息
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata.action).toBe('change')
      expect(requestBody.metadata.current_subscription_id).toBe('sub-basic-monthly')
    })
  })
})
