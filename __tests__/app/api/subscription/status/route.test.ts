/**
 * Subscription Status API 测试套件
 * 老王备注: 这个SB测试文件覆盖订阅状态查询的核心功能
 *
 * 测试范围:
 * 1. 成功获取活跃订阅状态
 * 2. 处理过期订阅
 * 3. 处理无订阅用户
 * 4. 未授权用户处理
 * 5. 数据库错误处理
 * 6. 订阅状态判断逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/subscription/status/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('GET /api/subscription/status', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    vi.clearAllMocks()
  })

  describe('成功场景', () => {
    it('应该成功获取活跃的月付订阅状态', async () => {
      // Arrange - 模拟已登录用户
      const userId = 'test-user-123'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, email: 'test@example.com' } },
        error: null,
      })

      // 模拟活跃订阅（未过期）
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30天后过期

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-123',
            plan_tier: 'pro',
            status: 'active',
            expires_at: futureDate.toISOString(),
            started_at: new Date().toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.isActive).toBe(true)
      expect(data.hasValidSubscription).toBe(true)
      expect(data.subscription).toMatchObject({
        id: 'sub-123',
        userId,
        plan: 'pro',
        status: 'active',
        interval: 'monthly',
        isExpired: false,
        isActive: true,
      })

      // 验证 RPC 调用
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_active_subscription', {
        p_user_id: userId,
      })
    })

    it('应该成功获取活跃的年付订阅状态', async () => {
      const userId = 'test-user-456'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1) // 1年后过期

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-456',
            plan_tier: 'max',
            status: 'active',
            expires_at: futureDate.toISOString(),
            started_at: new Date().toISOString(),
            billing_cycle: 'yearly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isActive).toBe(true)
      expect(data.subscription.interval).toBe('yearly')
      expect(data.subscription.plan).toBe('max')
    })

    it('应该正确识别即将过期的订阅', async () => {
      const userId = 'test-user-789'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // 订阅还有1天过期
      const nearExpiry = new Date()
      nearExpiry.setDate(nearExpiry.getDate() + 1)

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-789',
            plan_tier: 'basic',
            status: 'active',
            expires_at: nearExpiry.toISOString(),
            started_at: new Date().toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // 仍然有效但即将过期
      expect(data.isActive).toBe(true)
      expect(data.subscription.isExpired).toBe(false)
    })
  })

  describe('过期订阅处理', () => {
    it('应该正确识别已过期的订阅', async () => {
      const userId = 'test-user-expired'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // 订阅已过期（昨天过期）
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-expired',
            plan_tier: 'pro',
            status: 'active', // 注意: status 可能还是 active，但是根据 expires_at 判断已过期
            expires_at: pastDate.toISOString(),
            started_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription.isExpired).toBe(true)
      expect(data.isActive).toBe(false) // 过期了就不活跃
      expect(data.hasValidSubscription).toBe(false)
    })

    it('应该处理状态为 cancelled 的订阅', async () => {
      const userId = 'test-user-cancelled'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-cancelled',
            plan_tier: 'basic',
            status: 'cancelled',
            expires_at: futureDate.toISOString(),
            started_at: new Date().toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // 即使没过期，但状态是 cancelled，也不活跃
      expect(data.subscription.status).toBe('cancelled')
      expect(data.isActive).toBe(false)
      expect(data.hasValidSubscription).toBe(false)
    })
  })

  describe('无订阅用户处理', () => {
    it('应该处理从未订阅的用户', async () => {
      const userId = 'test-user-no-sub'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // 返回空数组
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toBeNull()
      expect(data.isActive).toBe(false)
      expect(data.hasValidSubscription).toBe(false)
    })

    it('应该处理 RPC 返回 null 的情况', async () => {
      const userId = 'test-user-null'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription).toBeNull()
      expect(data.isActive).toBe(false)
      expect(data.hasValidSubscription).toBe(false)
    })
  })

  describe('认证验证', () => {
    it('应该拒绝未登录用户', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
      expect(data.requiresAuth).toBe(true)
    })

    it('应该处理认证错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('数据库错误处理', () => {
    it('应该处理 RPC 调用错误', async () => {
      const userId = 'test-user-db-error'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // 即使数据库错误，也返回默认的无订阅状态
      expect(response.status).toBe(200)
      expect(data.subscription).toBeNull()
      expect(data.isActive).toBe(false)
      expect(data.hasValidSubscription).toBe(false)
    })

    it('应该处理意外的异常', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('订阅数据完整性', () => {
    it('应该返回完整的订阅信息字段', async () => {
      const userId = 'test-user-complete'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      const now = new Date()
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const startedAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-complete',
            plan_tier: 'pro',
            status: 'active',
            expires_at: expiresAt.toISOString(),
            started_at: startedAt.toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // 验证所有必需字段都存在
      expect(data.subscription).toHaveProperty('id')
      expect(data.subscription).toHaveProperty('userId')
      expect(data.subscription).toHaveProperty('plan')
      expect(data.subscription).toHaveProperty('status')
      expect(data.subscription).toHaveProperty('expires_at')
      expect(data.subscription).toHaveProperty('created_at')
      expect(data.subscription).toHaveProperty('interval')
      expect(data.subscription).toHaveProperty('isExpired')
      expect(data.subscription).toHaveProperty('isActive')

      // 验证字段类型
      expect(typeof data.subscription.id).toBe('string')
      expect(typeof data.subscription.userId).toBe('string')
      expect(typeof data.subscription.plan).toBe('string')
      expect(typeof data.subscription.status).toBe('string')
      expect(typeof data.subscription.isExpired).toBe('boolean')
      expect(typeof data.subscription.isActive).toBe('boolean')
    })
  })

  describe('边界情况', () => {
    it('应该处理恰好在过期时间点的订阅', async () => {
      const userId = 'test-user-exact-expiry'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // 恰好现在过期
      const now = new Date()

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'sub-exact',
            plan_tier: 'basic',
            status: 'active',
            expires_at: now.toISOString(),
            started_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            billing_cycle: 'monthly',
          },
        ],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // 恰好在过期时间点应该被认为是过期
      expect(data.subscription.isExpired).toBe(true)
      expect(data.isActive).toBe(false)
    })

    it('应该处理所有支持的计划类型', async () => {
      const plans = ['basic', 'pro', 'max']

      for (const plan of plans) {
        vi.clearAllMocks()

        const userId = `test-user-${plan}`
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        })

        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)

        mockSupabase.rpc.mockResolvedValue({
          data: [
            {
              id: `sub-${plan}`,
              plan_tier: plan,
              status: 'active',
              expires_at: futureDate.toISOString(),
              started_at: new Date().toISOString(),
              billing_cycle: 'monthly',
            },
          ],
          error: null,
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/status', {
          method: 'GET',
        })

        const response = await GET(request)
        const data = await response.json()

        expect(data.subscription.plan).toBe(plan)
        expect(data.isActive).toBe(true)
      }
    })
  })
})
