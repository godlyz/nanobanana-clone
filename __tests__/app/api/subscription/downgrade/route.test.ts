/**
 * 🔥 老王实现：订阅降级 API 自动化测试（V2重构版 - 统一Creem支付）
 *
 * 测试范围：
 * 1. 用户认证（需要登录）
 * 2. 参数验证（targetPlan, billingPeriod, adjustmentMode）
 * 3. 降级层级验证（只能降到更低层级）
 * 4. 当前订阅状态检查（有效订阅、未过期）
 * 5. adjustment_mode（默认immediate，支持scheduled）
 * 6. remaining_seconds 计算（剩余秒数）
 * 7. 双重队列限制（拒绝已有pending订阅时再降级）
 * 8. Creem checkout session 创建
 *
 * @author 老王（暴躁技术流）
 * @date 2025-11-21
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/subscription/downgrade/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('POST /api/subscription/downgrade', () => {
  let mockSupabase: any

  beforeEach(() => {
    // 🔥 完整的 Supabase mock 链（参考升级API测试）
    const mockEqChain = {
      eq: vi.fn(() => mockEqChain),  // Self-referencing for chaining
      limit: vi.fn(() => ({
        data: null,  // 默认：没有 pending 订阅
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
    vi.clearAllMocks()
  })

  describe('用户认证', () => {
    it('应该拒绝未登录用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('未授权')
    })
  })

  describe('参数验证', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null,
      })
    })

    it('应该拒绝缺少 targetPlan 参数', async () => {
      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
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
      expect(data.message).toContain('缺少必需参数')
    })

    it('应该拒绝无效的 targetPlan', async () => {
      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'invalid',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('无效的目标计划')
    })

    it('应该拒绝无效的 billingPeriod', async () => {
      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('无效的计费周期')
    })

    it('应该拒绝无效的 adjustmentMode', async () => {
      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
          adjustmentMode: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('无效的调整模式')
    })
  })

  describe('降级层级验证', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-level' } },
        error: null,
      })
    })

    it('应该拒绝降级到相同层级', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro', // 🔥 相同层级
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('降级失败')
      expect(data.message).toContain('不高于目标计划')
    })

    it('应该拒绝从 basic 降级到 pro（升级）', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro', // 🔥 这是升级，不是降级
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('不高于目标计划')
    })

    it('应该允许从 max 降级到 pro', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'max',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro', // 🔥 max -> pro 是合法降级
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentPlan).toBe('max')
      expect(data.targetPlan).toBe('pro')
    })

    it('应该允许从 pro 降级到 basic', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic', // 🔥 pro -> basic 是合法降级
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentPlan).toBe('pro')
      expect(data.targetPlan).toBe('basic')
    })
  })

  describe('当前订阅状态检查', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-status' } },
        error: null,
      })
    })

    it('应该拒绝没有活跃订阅的用户', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('降级失败')
      expect(data.message).toContain('没有活跃的订阅')
    })

    it('应该拒绝已过期的订阅', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5) // 5天前过期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('降级失败')
      expect(data.message).toContain('当前订阅已过期')
    })
  })

  describe('adjustment_mode 和 remaining_seconds', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-mode' } },
        error: null,
      })
    })

    it('应该默认使用 immediate 模式', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
          // 🔥 不传 adjustmentMode，应该默认 immediate
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.adjustmentMode).toBe('immediate')

      // 🔥 验证 Creem metadata
      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.adjustment_mode).toBe('immediate')
      expect(requestBody.metadata.action).toBe('downgrade')
    })

    it('应该支持 scheduled 模式', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'max',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'pro',
          billingPeriod: 'yearly',
          adjustmentMode: 'scheduled', // 🔥 使用 scheduled 模式
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.adjustmentMode).toBe('scheduled')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)
      expect(requestBody.metadata.adjustment_mode).toBe('scheduled')
    })

    it('应该正确计算剩余秒数', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10) // 10天后到期

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
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
  })

  describe('双重队列限制', () => {
    it('应该拒绝已有 pending 订阅时再次降级', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-pending' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'max',
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

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
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

  describe('Creem checkout session 创建', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-checkout' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
        }],
        error: null,
      })
    })

    it('应该成功创建 Creem checkout session', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session123', id: 'session123' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.checkoutUrl).toBe('https://checkout.creem.io/session123')
      expect(data.sessionId).toBe('session123')
      expect(data.currentPlan).toBe('pro')
      expect(data.targetPlan).toBe('basic')
    })

    it('应该在 metadata 中包含所有必需信息', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.creem.io/session', id: 'session' }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'yearly',
          adjustmentMode: 'scheduled',
        }),
      })

      await POST(request)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]?.body as string)

      expect(requestBody.metadata).toMatchObject({
        type: 'subscription',
        user_id: 'test-user-checkout',
        plan_tier: 'basic',
        billing_cycle: 'yearly',
        previous_plan: 'pro',
        previous_billing_cycle: 'monthly',
        action: 'downgrade',
        adjustment_mode: 'scheduled',
      })
      expect(requestBody.metadata.previous_expires_at).toBeDefined()
      expect(requestBody.metadata.remaining_seconds).toBeDefined()
    })

    it('应该处理 Creem API 失败', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Creem API Error',
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          targetPlan: 'basic',
          billingPeriod: 'monthly',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('创建支付会话失败')
    })
  })
})
