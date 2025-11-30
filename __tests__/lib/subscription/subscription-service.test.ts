/**
 * 🧪 老王的订阅服务层集成测试
 * 目标：验证数据库调用的正确性（使用 Mock Client）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getActiveSubscription,
  cancelSubscription,
  getFifoPackage,
  getSubscriptionExpiresAt,
  freezeCreditPackage,
} from '@/lib/subscription/subscription-service'

describe('订阅服务层测试', () => {
  let mockClient: SupabaseClient

  beforeEach(() => {
    // 重置 Mock Client
    mockClient = {} as SupabaseClient
  })

  describe('getActiveSubscription', () => {
    it('应该成功获取活跃订阅', async () => {
      const mockData = [
        {
          id: 'sub-123',
          plan_tier: 'pro',
          billing_cycle: 'monthly',
          expires_at: '2025-12-31T00:00:00Z',
          status: 'active',
        },
      ]

      mockClient.rpc = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await getActiveSubscription(mockClient, 'user-abc')

      expect(result).toEqual(mockData[0])
      expect(mockClient.rpc).toHaveBeenCalledWith('get_user_active_subscription', {
        p_user_id: 'user-abc',
      })
    })

    it('应该处理没有活跃订阅的情况', async () => {
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await getActiveSubscription(mockClient, 'user-no-sub')

      expect(result).toBeNull()
    })

    it('应该处理数据库查询失败', async () => {
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getActiveSubscription(mockClient, 'user-error')).rejects.toThrow(
        'Failed to get active subscription: Database error'
      )
    })
  })

  describe('cancelSubscription', () => {
    it('应该成功取消订阅', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      // 最后一个 eq() 返回 Promise
      mockFrom.eq = vi.fn().mockImplementation((column: string, value: any) => {
        if (column === 'user_id') {
          return Promise.resolve({ error: null })
        }
        return mockFrom
      })

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await cancelSubscription(
        mockClient,
        'sub-123',
        'user-abc',
        '2026-01-31T00:00:00Z'
      )

      expect(mockClient.from).toHaveBeenCalledWith('user_subscriptions')
      expect(mockFrom.update).toHaveBeenCalledWith({
        status: 'cancelled',
        expires_at: '2026-01-31T00:00:00Z',
        updated_at: expect.any(String),
      })
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'sub-123')
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-abc')
    })

    it('应该处理更新失败', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string) => {
          if (column === 'user_id') {
            return Promise.resolve({ error: { message: 'Update failed' } })
          }
          return mockFrom
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await expect(
        cancelSubscription(mockClient, 'sub-123', 'user-abc', '2026-01-31T00:00:00Z')
      ).rejects.toThrow('Failed to cancel subscription: Update failed')
    })
  })

  describe('getFifoPackage', () => {
    it('应该成功查询FIFO积分包', async () => {
      const mockPackage = {
        id: 'pkg-123',
        amount: 500,
        remaining_amount: 300,
        expires_at: '2025-12-31T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      }

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockPackage],
          error: null,
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      const result = await getFifoPackage(mockClient, 'user-abc', 'sub-123')

      expect(result).toEqual(mockPackage)
      expect(mockClient.from).toHaveBeenCalledWith('credit_transactions')
      expect(mockFrom.select).toHaveBeenCalledWith(
        'id, amount, remaining_amount, expires_at, created_at'
      )
      expect(mockFrom.eq).toHaveBeenCalledWith('user_id', 'user-abc')
      expect(mockFrom.eq).toHaveBeenCalledWith('related_entity_id', 'sub-123')
      expect(mockFrom.eq).toHaveBeenCalledWith('transaction_type', 'subscription_refill')
      expect(mockFrom.gt).toHaveBeenCalledWith('amount', 0)
      expect(mockFrom.gt).toHaveBeenCalledWith('remaining_amount', 0)
      expect(mockFrom.or).toHaveBeenCalledWith('is_frozen.is.null,is_frozen.eq.false')
      expect(mockFrom.order).toHaveBeenCalledWith('expires_at', { ascending: true })
      expect(mockFrom.limit).toHaveBeenCalledWith(1)
    })

    it('应该处理没有找到积分包的情况', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      const result = await getFifoPackage(mockClient, 'user-no-pkg', 'sub-123')

      expect(result).toBeNull()
    })

    it('应该处理查询失败', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await expect(
        getFifoPackage(mockClient, 'user-error', 'sub-123')
      ).rejects.toThrow('Failed to get FIFO package: Query failed')
    })
  })

  describe('getSubscriptionExpiresAt', () => {
    it('应该成功获取订阅到期时间', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { expires_at: '2025-12-31T00:00:00Z' },
          error: null,
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      const result = await getSubscriptionExpiresAt(mockClient, 'sub-123')

      expect(result).toBe('2025-12-31T00:00:00Z')
      expect(mockClient.from).toHaveBeenCalledWith('user_subscriptions')
      expect(mockFrom.select).toHaveBeenCalledWith('expires_at')
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'sub-123')
      expect(mockFrom.single).toHaveBeenCalled()
    })

    it('应该处理查询失败', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await expect(getSubscriptionExpiresAt(mockClient, 'sub-not-found')).rejects.toThrow(
        'Failed to get subscription expires_at: Not found'
      )
    })
  })

  describe('freezeCreditPackage', () => {
    it('应该成功冻结积分包', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await freezeCreditPackage(
        mockClient,
        'pkg-123',
        '2025-03-01T00:00:00Z',
        28512000,
        '2026-01-25T00:00:00Z',
        '2025-11-27T00:00:00Z',
        'downgrade to basic monthly'
      )

      expect(mockClient.from).toHaveBeenCalledWith('credit_transactions')
      expect(mockFrom.update).toHaveBeenCalledWith({
        is_frozen: true,
        frozen_until: '2025-03-01T00:00:00Z',
        frozen_remaining_seconds: 28512000,
        original_expires_at: '2025-11-27T00:00:00Z',
        expires_at: '2026-01-25T00:00:00Z',
        frozen_reason: 'downgrade to basic monthly',
      })
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'pkg-123')
    })

    it('应该处理更新失败', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockFrom)

      await expect(
        freezeCreditPackage(
          mockClient,
          'pkg-123',
          '2025-03-01T00:00:00Z',
          28512000,
          '2026-01-25T00:00:00Z',
          '2025-11-27T00:00:00Z',
          'downgrade to basic monthly'
        )
      ).rejects.toThrow('Failed to freeze credit package: Update failed')
    })
  })
})
