/**
 * 订阅升级 API 测试套件
 * 老王备注: 这个SB测试文件覆盖订阅升级的核心功能
 *
 * 测试范围:
 * 1. 成功升级到更高级别计划
 * 2. 无订阅用户"升级"（实际是新购买）
 * 3. 参数验证（缺少/无效参数）
 * 4. 未授权用户（未登录）
 * 5. 降级失败（目标计划不高于当前计划）
 * 6. 未配置产品ID错误
 * 7. Creem API 调用失败
 * 8. 内部错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/subscription/upgrade/route'
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

describe('POST /api/subscription/upgrade', () => {
  let mockSupabase: any

  beforeEach(() => {
    // 🔥 老王修复：完整的 Supabase mock 链
    const mockEqChain = {
      eq: vi.fn(() => mockEqChain),
      limit: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn(() => ({
        select: vi.fn(() => mockEqChain),
      })),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功升级 Basic 到 Pro 月付', async () => {
      // Arrange - 模拟已登录用户
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      })

      // 模拟当前订阅为 Basic Monthly
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30天后到期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      // 模拟 Creem API 成功响应
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.creem.io/session_upgrade_123',
          id: 'checkout_upgrade_123',
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/session_upgrade_123')
      expect(data.sessionId).toBe('checkout_upgrade_123')
      expect(data.currentPlan).toBe('basic')
      expect(data.targetPlan).toBe('pro')
      expect(data.billingPeriod).toBe('monthly')

      // 🔥 老王验证：检查 Creem API 调用
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.creem.io/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': expect.stringMatching(/^creem_test_/),
          }),
          body: expect.stringMatching(/"action":"upgrade"/),
        })
      )
    })

    it('应该允许无订阅用户"升级"到任何计划（新购买）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-456' } },
        error: null,
      })

      // 模拟无订阅
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.creem.io/session_new',
          id: 'checkout_new',
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'max',
          billingPeriod: 'yearly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentPlan).toBe('none')
      expect(data.targetPlan).toBe('max')
    })

    it('应该支持所有升级路径', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-789' } },
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session_id' }),
      } as Response)

      const upgradePaths = [
        { from: 'basic', to: 'pro' },
        { from: 'basic', to: 'max' },
        { from: 'pro', to: 'max' },
      ]

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      for (const path of upgradePaths) {
        vi.clearAllMocks()

        mockSupabase.rpc.mockResolvedValue({
          data: [{
            plan_tier: path.from,
            billing_cycle: 'monthly',
            expires_at: futureDate.toISOString(),
          }],
          error: null,
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
          method: 'POST',
          body: JSON.stringify({
            targetPlan: path.to,
            billingPeriod: 'monthly',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.currentPlan).toBe(path.from)
        expect(data.targetPlan).toBe(path.to)
      }
    })
  })

  describe('参数验证', () => {
    it('应该拒绝缺少 targetPlan 的请求', async () => {
      // 🔥 老王修复：即使是参数验证测试，也要 mock auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('参数错误')
    })

    it('应该拒绝缺少 billingPeriod 的请求', async () => {
      // 🔥 老王修复：即使是参数验证测试，也要 mock auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('参数错误')
    })

    it('应该拒绝无效的目标计划', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'invalid_plan',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('参数错误')
    })

    it('应该拒绝无效的计费周期', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
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

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
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

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('升级验证', () => {
    it('应该拒绝平级"升级"（目标计划等于当前计划）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('升级失败')
    })

    it('应该拒绝降级操作（目标计划低于当前计划）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'max',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('升级失败')
    })

    it('应该允许已过期订阅"升级"（实际是新购买）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10) // 10天前已过期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentPlan).toBe('none') // 🔥 已过期视为无订阅
    })
  })

  describe('Creem API 调用', () => {
    it('应该处理 Creem API 错误响应', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid product ID',
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
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

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
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
    it('应该生成包含 upgrade 前缀的 request_id', async () => {
      const userId = 'test-user-456'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      await POST(request)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.request_id).toMatch(new RegExp(`^upgrade_${userId}_\\d+$`))
      expect(requestBody.metadata.action).toBe('upgrade')
    })
  })

  // 🔥 老王新增：测试 adjustment_mode 和 remaining_seconds
  describe('调整模式 (adjustment_mode) 测试', () => {
    it('应该默认使用 immediate 模式', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-789' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15) // 15天后到期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
          // 🔥 不传 adjustmentMode，应该默认 immediate
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.adjustmentMode).toBe('immediate')

      // 🔥 验证 Creem metadata
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.adjustment_mode).toBe('immediate')
    })

    it('应该支持 scheduled 模式', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-scheduled' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'max',
          billingPeriod: 'yearly',
          adjustmentMode: 'scheduled',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.adjustmentMode).toBe('scheduled')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.adjustment_mode).toBe('scheduled')
    })

    it('应该拒绝无效的 adjustmentMode', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-invalid' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
          adjustmentMode: 'invalid_mode',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('无效的调整模式')
    })
  })

  // 🔥 老王新增：测试 remaining_seconds 计算
  describe('剩余时间 (remaining_seconds) 测试', () => {
    it('应该正确计算剩余秒数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-seconds' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10) // 10天后到期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.remainingSeconds).toBeGreaterThan(0)
      // 10天 = 864000秒，允许一定误差
      expect(data.remainingSeconds).toBeGreaterThan(860000)
      expect(data.remainingSeconds).toBeLessThan(870000)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.remaining_seconds).toBeDefined()
      expect(parseInt(requestBody.metadata.remaining_seconds)).toBeGreaterThan(0)
    })

    it('已过期订阅应该 remaining_seconds = 0', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-expired' } },
        error: null,
      })

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5) // 5天前已过期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.remainingSeconds).toBe(0)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.remaining_seconds).toBe('0')
    })
  })

  // 🔥 老王新增：测试双队列限制
  describe('双队列限制测试', () => {
    it('应该拒绝已有 pending 订阅时再次升级', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-pending' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      // 🔥 Mock pending 订阅存在（返回有数据的链）
      const mockEqChainWithData = {
        eq: vi.fn(() => mockEqChainWithData),
        limit: vi.fn(() => ({
          data: [{ id: 'pending-sub-123' }], // 🔥 有 pending 订阅
          error: null,
        })),
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => mockEqChainWithData),
      }))

      const request = new NextRequest('http://localhost:3000/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('操作受限')
      expect(data.message).toContain('已有待执行的套餐')
    })
  })
})
