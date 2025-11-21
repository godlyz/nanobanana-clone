/**
 * 🧪 老王的 Upgrade/Downgrade Handler 端到端测试
 * 目标：验证2阶段流程的正确性（Prepare + Freeze）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  handleUpgradeDowngradePrepare,
  handleCreditFreeze,
} from '@/lib/subscription/upgrade-downgrade'

describe('Upgrade/Downgrade Handler 端到端测试', () => {
  let mockClient: SupabaseClient
  let mockCreditService: any

  beforeEach(() => {
    // Mock Supabase Client
    mockClient = {} as SupabaseClient

    // Mock Credit Service
    mockCreditService = {
      createSubscription: vi.fn().mockResolvedValue('new-sub-456'),
    }
  })

  describe('成功场景', () => {
    it('应该成功处理降级（分2阶段：Prepare + Freeze）', async () => {
      // Mock RPC: getActiveSubscription
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'old-sub-123',
            plan_tier: 'pro',
            billing_cycle: 'yearly',
            expires_at: '2025-11-27T00:00:00Z',
            status: 'active',
          },
        ],
        error: null,
      })

      // Mock from('user_subscriptions').update(): cancelSubscription
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string) => {
          if (column === 'user_id') {
            return Promise.resolve({ error: null })
          }
          return mockUpdateChain
        }),
      }

      // Mock from('credit_transactions').select(): getFifoPackage
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'frozen-pkg-789',
              amount: 1920,
              remaining_amount: 1820,
              expires_at: '2025-11-27T00:00:00Z',
              created_at: '2025-01-01T00:00:00Z',
            },
          ],
          error: null,
        }),
      }

      // Mock from('user_subscriptions').select().eq().single(): getSubscriptionExpiresAt
      const mockExpiresAtChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { expires_at: '2025-03-01T00:00:00Z' },
          error: null,
        }),
      }

      // Mock from('credit_transactions').update().eq(): freezeCreditPackage
      const mockFreezeChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      // 根据表名返回不同的 mock
      mockClient.from = vi.fn((tableName: string) => {
        if (tableName === 'user_subscriptions') {
          // 第一次调用是cancelSubscription的update
          // 第二次调用是getSubscriptionExpiresAt的select
          const callCount = vi.mocked(mockClient.from).mock.calls.filter(
            (call) => call[0] === 'user_subscriptions'
          ).length
          return callCount === 1 ? mockUpdateChain : mockExpiresAtChain
        }
        if (tableName === 'credit_transactions') {
          // 第一次调用是getFifoPackage的select
          // 第二次调用是freezeCreditPackage的update
          const callCount = vi.mocked(mockClient.from).mock.calls.filter(
            (call) => call[0] === 'credit_transactions'
          ).length
          return callCount === 1 ? mockSelectChain : mockFreezeChain
        }
        return mockUpdateChain
      })

      // 执行Phase 1: Prepare（准备阶段）
      const prepareResult = await handleUpgradeDowngradePrepare(mockClient, mockCreditService, {
        userId: 'user-abc',
        planTier: 'basic',
        billingCycle: 'monthly',
        monthlyCredits: 150,
        creemSubscriptionId: 'creem-sub-999',
        action: 'downgrade',
      })

      // 验证Prepare结果
      expect(prepareResult.newSubscriptionId).toBe('new-sub-456')
      expect(prepareResult.oldSubscriptionId).toBe('old-sub-123')
      expect(prepareResult.fifoPackage).toEqual({
        id: 'frozen-pkg-789',
        amount: 1920,
        remaining_amount: 1820,
        expires_at: '2025-11-27T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      })

      // ⚠️ 中间应该执行充值逻辑（这里省略，由route.ts负责）

      // 执行Phase 2: Freeze（冻结阶段）
      const freezeResult = await handleCreditFreeze(
        mockClient,
        prepareResult,
        'downgrade',
        'basic',
        'monthly'
      )

      // 验证Freeze结果
      expect(freezeResult.frozen).toBe(true)
      expect(freezeResult.packageId).toBe('frozen-pkg-789')

      // 验证调用顺序
      expect(mockClient.rpc).toHaveBeenCalledWith('get_user_active_subscription', {
        p_user_id: 'user-abc',
      })

      expect(mockCreditService.createSubscription).toHaveBeenCalledWith({
        user_id: 'user-abc',
        plan_tier: 'basic',
        billing_cycle: 'monthly',
        monthly_credits: 150,
        creem_subscription_id: 'creem-sub-999',
      })
    })

    it('应该成功处理升级（没有积分需要冻结）', async () => {
      // Mock RPC: getActiveSubscription
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'old-sub-123',
            plan_tier: 'basic',
            billing_cycle: 'monthly',
            expires_at: '2025-06-15T00:00:00Z',
            status: 'active',
          },
        ],
        error: null,
      })

      // Mock update chain
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string) => {
          if (column === 'user_id') {
            return Promise.resolve({ error: null })
          }
          return mockUpdateChain
        }),
      }

      // Mock select chain: 没有FIFO包
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [], // 没有找到积分包
          error: null,
        }),
      }

      mockClient.from = vi.fn((tableName: string) => {
        if (tableName === 'user_subscriptions') {
          return mockUpdateChain
        }
        if (tableName === 'credit_transactions') {
          return mockSelectChain
        }
        return mockUpdateChain
      })

      // 执行Phase 1: Prepare
      const prepareResult = await handleUpgradeDowngradePrepare(mockClient, mockCreditService, {
        userId: 'user-xyz',
        planTier: 'pro',
        billingCycle: 'yearly',
        monthlyCredits: 500,
        creemSubscriptionId: null,
        action: 'upgrade',
      })

      // 🔥 老王修复：getFifoPackage返回null，但upgrade-downgrade.ts:139转换为undefined
      expect(prepareResult.fifoPackage).toBeUndefined()

      // 执行Phase 2: Freeze
      const freezeResult = await handleCreditFreeze(
        mockClient,
        prepareResult,
        'upgrade',
        'pro',
        'yearly'
      )

      // 验证Freeze结果：没有冻结
      expect(freezeResult.frozen).toBe(false)
      expect(freezeResult.packageId).toBeUndefined()
    })
  })

  describe('错误处理', () => {
    it('应该处理没有活跃订阅的情况', async () => {
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      await expect(
        handleUpgradeDowngradePrepare(mockClient, mockCreditService, {
          userId: 'user-no-sub',
          planTier: 'pro',
          billingCycle: 'monthly',
          monthlyCredits: 500,
          creemSubscriptionId: null,
          action: 'upgrade',
        })
      ).rejects.toThrow('No active subscription found for user user-no-sub')
    })

    it('应该处理取消订阅失败', async () => {
      mockClient.rpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'old-sub-123',
            plan_tier: 'pro',
            billing_cycle: 'monthly',
            expires_at: '2025-06-15T00:00:00Z',
            status: 'active',
          },
        ],
        error: null,
      })

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((column: string) => {
          if (column === 'user_id') {
            return Promise.resolve({ error: { message: 'Update failed' } })
          }
          return mockUpdateChain
        }),
      }

      mockClient.from = vi.fn().mockReturnValue(mockUpdateChain)

      await expect(
        handleUpgradeDowngradePrepare(mockClient, mockCreditService, {
          userId: 'user-error',
          planTier: 'basic',
          billingCycle: 'monthly',
          monthlyCredits: 150,
          creemSubscriptionId: null,
          action: 'downgrade',
        })
      ).rejects.toThrow('Failed to cancel subscription: Update failed')
    })
  })
})
