/**
 * 订阅取消 API 测试套件
 * 老王备注: 这个SB测试文件覆盖订阅取消的核心功能
 *
 * 测试范围:
 * 1. 成功取消活跃订阅
 * 2. 记录取消原因和用户反馈
 * 3. 未授权用户（未登录）
 * 4. 无订阅用户取消失败
 * 5. 已过期订阅取消失败
 * 6. 已取消订阅重复取消失败
 * 7. 数据库更新失败
 * 8. 内部错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/subscription/cancel/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('POST /api/subscription/cancel', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功取消活跃订阅（不提供原因和反馈）', async () => {
      // Arrange - 模拟已登录用户
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      })

      // 模拟活跃订阅（30天后到期）
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // Mock update 链式调用
      // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({}), // 🔥 不提供原因和反馈
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.currentPlan).toBe('pro')
      expect(data.currentPeriodEnd).toBe(futureDate.toISOString())
      expect(data.effectiveDate).toBe(futureDate.toISOString())
      expect(data.message).toContain('当前周期结束后生效')

      // 🔥 老王验证：检查数据库更新调用
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending_cancel',
          cancel_reason: null,
          cancel_feedback: null,
        })
      )
    })

    it('应该成功取消活跃订阅（提供原因和反馈）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-456' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_456',
          plan_tier: 'max',
          billing_cycle: 'yearly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))

      const reason = '价格太高'
      const feedback = '希望能有更多优惠活动'

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason,
          feedback,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 🔥 验证原因和反馈被记录
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending_cancel',
          cancel_reason: reason,
          cancel_feedback: feedback,
        })
      )
    })

    it('应该设置取消请求时间戳', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-789' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_789',
          plan_tier: 'basic',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不再使用',
        }),
      })

      const beforeRequest = new Date()
      const response = await POST(request)
      const afterRequest = new Date()
      const data = await response.json()

      expect(response.status).toBe(200)

      // 🔥 验证取消时间戳在合理范围内
      const cancelledAt = new Date(data.cancelledAt)
      expect(cancelledAt.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime())
      expect(cancelledAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime())

      // 验证数据库更新包含时间戳
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_requested_at: expect.any(String),
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('认证验证', () => {
    it('应该拒绝未登录用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不再使用',
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

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('取消验证', () => {
    it('应该拒绝无订阅用户取消', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅不存在')
    })

    it('应该拒绝已过期订阅取消', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      // 模拟10天前已过期的订阅
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: pastDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅已过期')
    })

    it('应该拒绝已取消订阅重复取消', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'cancelled', // 🔥 已取消状态
        }],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅已取消')
    })

    it('应该处理 RPC 调用失败', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('订阅不存在')
    })
  })

  describe('数据库操作', () => {
    it('应该处理数据库更新失败', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'max',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // Mock 数据库更新失败（两个 .eq() 调用）
      mockSupabase.eq = vi.fn(() => ({
        eq: vi.fn(() => ({
          error: new Error('Database update failed')
        }))
      }))

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('取消失败')
    })
  })

  describe('生效时间', () => {
    it('应该返回正确的生效时间（当前周期结束时间）', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date('2025-12-31T23:59:59Z')

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.currentPeriodEnd).toBe(futureDate.toISOString())
      expect(data.effectiveDate).toBe(futureDate.toISOString())
      expect(data.note).toContain('在此期间您可以继续使用订阅服务')
    })
  })

  describe('取消原因和反馈', () => {
    it('应该正确记录各种取消原因', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      const reasons = [
        '价格太高',
        '功能不满足需求',
        '使用频率降低',
        '找到更好的替代品',
        '其他原因',
      ]

      for (const reason of reasons) {
        vi.clearAllMocks()
        // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))

        const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
          method: 'POST',
          body: JSON.stringify({ reason }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            cancel_reason: reason,
          })
        )
      }
    })

    it('应该正确处理长反馈文本', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          id: 'sub_123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: futureDate.toISOString(),
          status: 'active',
        }],
        error: null,
      })

      // 🔥 Mock 两个 .eq() 调用
      mockSupabase.eq = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))

      const longFeedback = '这是一段很长的反馈文本，'.repeat(50) // 约1000字符

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '其他原因',
          feedback: longFeedback,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_feedback: longFeedback,
        })
      )
    })
  })

  describe('内部错误处理', () => {
    it('应该处理未预期的异常', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: '不想用了',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('服务器内部错误')
    })
  })
})
