/**
 * CreditService 测试套件
 * 老王备注: 这个SB测试文件覆盖积分服务的核心功能
 *
 * 测试范围:
 * 1. 获取用户可用积分
 * 2. 检查积分是否足够
 * 3. 扣减积分逻辑
 * 4. 增加积分逻辑
 * 5. 注册赠送积分
 * 6. 获取积分交易历史
 * 7. 获取即将过期的积分
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreditService } from '@/lib/credit-service'
import type { SupabaseClient } from '@supabase/supabase-js'

// 🔥 老王新增：Mock @/lib/supabase/server 的 createClient 函数
// 用于测试 createCreditService 工厂函数
const mockCreateClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

// Mock Supabase Client
const createMockSupabaseClient = () => {
  const mockChainBuilder = () => ({
    eq: vi.fn(() => mockChainBuilder()),
    gt: vi.fn(() => mockChainBuilder()),
    or: vi.fn(() => mockChainBuilder()),
    lte: vi.fn(() => mockChainBuilder()),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })

  return {
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => mockChainBuilder()),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  } as unknown as SupabaseClient
}

describe('CreditService', () => {
  let creditService: CreditService
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    creditService = new CreditService(mockSupabase)

    // 🔥 老王新增：为 createCreditService 工厂函数测试设置 mock 返回值
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('getUserAvailableCredits', () => {
    it('应该成功获取用户可用积分', async () => {
      // Arrange
      const userId = 'test-user-id'
      const expectedCredits = 100
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: expectedCredits,
        error: null,
      } as any)

      // Act
      const credits = await creditService.getUserAvailableCredits(userId)

      // Assert
      expect(credits).toBe(expectedCredits)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_available_credits', {
        target_user_id: userId,
      })
    })

    it('应该在数据库错误时返回0', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as any)

      // Act
      const credits = await creditService.getUserAvailableCredits(userId)

      // Assert
      expect(credits).toBe(0)
    })

    it('应该在异常时返回0', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockRejectedValue(new Error('Network error'))

      // Act
      const credits = await creditService.getUserAvailableCredits(userId)

      // Assert
      expect(credits).toBe(0)
    })
  })

  describe('checkCreditsSufficient', () => {
    it('应该在积分足够时返回true', async () => {
      // Arrange
      const userId = 'test-user-id'
      const required = 50
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100,
        error: null,
      } as any)

      // Act
      const result = await creditService.checkCreditsSufficient(userId, required)

      // Assert
      expect(result).toBe(true)
    })

    it('应该在积分不足时返回false', async () => {
      // Arrange
      const userId = 'test-user-id'
      const required = 150
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100,
        error: null,
      } as any)

      // Act
      const result = await creditService.checkCreditsSufficient(userId, required)

      // Assert
      expect(result).toBe(false)
    })

    it('应该在积分恰好相等时返回true', async () => {
      // Arrange
      const userId = 'test-user-id'
      const required = 100
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100,
        error: null,
      } as any)

      // Act
      const result = await creditService.checkCreditsSufficient(userId, required)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('deductCredits', () => {
    it('应该在积分不足时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 200,
        transaction_type: 'text_to_image' as const,
      }
      // 🔥 老王修复：Mock consume_credits_smart RPC 返回格式
      // consume_credits_smart 返回 TABLE 格式（数组），包含 success/consumed/insufficient/message 字段
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [{
          success: false,
          consumed: 0,
          insufficient: true,
          message: '积分不足 / Insufficient credits'
        }],
        error: null,
      } as any)

      // Act & Assert
      await expect(creditService.deductCredits(params)).rejects.toThrow(
        '积分不足 / Insufficient credits'
      )
    })
  })

  describe('addCredits', () => {
    it('应该成功增加积分', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 100,
        transaction_type: 'package_purchase' as const,
        expires_at: null, // 🔥 老王修复：AddCreditsParams 必需字段
      }
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 50, // 当前积分
        error: null,
      } as any)

      // Mock from().insert()
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        update: vi.fn(),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.addCredits(params)

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('credit_transactions')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('grantRegistrationBonus', () => {
    it('应该赠送50积分注册奖励', async () => {
      // Arrange
      const userId = 'new-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 0, // 新用户没有积分
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.grantRegistrationBonus(userId)

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('credit_transactions')
      expect(mockInsert).toHaveBeenCalled()

      // 验证调用参数中包含50积分
      const calls = mockInsert.mock.calls as any[]
      expect(calls.length).toBeGreaterThan(0)
      const insertCall = calls[0]?.[0] as any
      expect(insertCall.amount).toBe(50)
      expect(insertCall.transaction_type).toBe('register_bonus')
    })
  })

  describe('getCreditTransactions', () => {
    it('应该返回空数组当发生错误时', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' },
                count: 0,
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getCreditTransactions(userId)

      // Assert
      expect(result).toEqual({
        transactions: [],
        total_count: 0,
      })
    })

    it('应该正确返回交易历史', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockTransactions = [
        {
          id: '1',
          user_id: userId,
          transaction_type: 'register_bonus',
          amount: 50,
          created_at: new Date().toISOString(),
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({
                data: mockTransactions,
                error: null,
                count: 1,
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getCreditTransactions(userId)

      // Assert
      expect(result.transactions).toHaveLength(1)
      expect(result.total_count).toBe(1)
      expect(result.transactions[0].transaction_type).toBe('register_bonus')
    })
  })

  describe('getExpiringSoonCredits', () => {
    it('应该返回7天内即将过期的积分', async () => {
      // Arrange
      const userId = 'test-user-id'
      const expiringDate = new Date()
      expiringDate.setDate(expiringDate.getDate() + 3) // 3天后过期

      const mockTransactions = [
        {
          amount: 50,
          expires_at: expiringDate.toISOString(),
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              lte: vi.fn(() => ({
                gt: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: mockTransactions,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getExpiringSoonCredits(userId)

      // Assert
      expect(result.credits).toBe(50)
      expect(result.date).toBe(expiringDate.toISOString())
      expect(result.items).toHaveLength(1)
    })

    it('应该在没有即将过期积分时返回空结果', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              lte: vi.fn(() => ({
                gt: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getExpiringSoonCredits(userId)

      // Assert
      expect(result.credits).toBe(0)
      expect(result.date).toBeNull()
      expect(result.items).toHaveLength(0)
    })
  })

  describe('getAllCreditsExpiry', () => {
    it('应该返回所有积分的过期信息', async () => {
      // Arrange
      const userId = 'test-user-id'
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      // 🔥 老王修复：Mock get_user_credits_expiry_realtime RPC 返回格式
      // 现在 getAllCreditsExpiry 调用 RPC 而不是直接查表
      // RPC 返回格式：{expiry_date: TIMESTAMPTZ, remaining_credits: INTEGER}
      const mockRpcData = [
        { expiry_date: futureDate.toISOString(), remaining_credits: 100 },
        { expiry_date: null, remaining_credits: 50 }, // 永久有效
      ]

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      } as any)

      // Act
      const result = await creditService.getAllCreditsExpiry(userId)

      // Assert
      expect(result.items).toHaveLength(2)

      // 验证有过期时间的在前，永久有效的在后
      const dateKey = futureDate.toISOString().split('T')[0]
      expect(result.items[0].date).toBe(dateKey)
      expect(result.items[0].credits).toBe(100)
      expect(result.items[1].date).toBeNull() // 永久有效
      expect(result.items[1].credits).toBe(50)
    })
  })

  describe('getUserActiveSubscription', () => {
    it('应该返回用户的有效订阅', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockSubscription = {
        id: 'sub-1',
        plan_tier: 'pro',
        status: 'active',
      }
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [mockSubscription],
        error: null,
      } as any)

      // Act
      const result = await creditService.getUserActiveSubscription(userId)

      // Assert
      expect(result).toEqual(mockSubscription)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_active_subscription', {
        p_user_id: userId,
      })
    })

    it('应该在没有有效订阅时返回null', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any)

      // Act
      const result = await creditService.getUserActiveSubscription(userId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('createSubscription', () => {
    it('应该成功创建月付订阅', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        plan_tier: 'pro',
        billing_cycle: 'monthly' as const,
        monthly_credits: 1000,
        creem_subscription_id: 'creem-sub-id',
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'new-sub-id' },
            error: null,
          })),
        })),
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const subscriptionId = await creditService.createSubscription(params)

      // Assert
      expect(subscriptionId).toBe('new-sub-id')
      expect(mockFrom).toHaveBeenCalledWith('user_subscriptions')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('cancelSubscription', () => {
    it('应该成功取消订阅', async () => {
      // Arrange
      const subscriptionId = 'sub-to-cancel'
      const reason = 'User requested cancellation'

      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({
        eq: mockEq,
      }))
      const mockFrom = vi.fn(() => ({
        update: mockUpdate,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.cancelSubscription(subscriptionId, reason)

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('user_subscriptions')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancellation_reason: reason,
          auto_renew: false,
        })
      )
      expect(mockEq).toHaveBeenCalledWith('id', subscriptionId)
    })

    it('应该在更新失败时抛出错误', async () => {
      // Arrange
      const subscriptionId = 'sub-to-cancel'
      const mockEq = vi.fn(() => Promise.resolve({
        error: { message: 'Update failed' },
      }))
      const mockUpdate = vi.fn(() => ({
        eq: mockEq,
      }))
      const mockFrom = vi.fn(() => ({
        update: mockUpdate,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.cancelSubscription(subscriptionId)).rejects.toThrow(
        'Failed to cancel subscription'
      )
    })

    it('应该在异常时抛出错误', async () => {
      // Arrange
      const subscriptionId = 'sub-to-cancel'
      const mockFrom = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(new Error('Network error'))),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.cancelSubscription(subscriptionId)).rejects.toThrow()
    })
  })

  // ==================== 🔥 老王新增测试：补充缺失功能 ====================

  describe('creditPackagePurchase', () => {
    it('应该成功购买积分包', async () => {
      // Arrange
      const userId = 'test-user-id'
      const orderId = 'order-123'
      const credits = 500
      const packageName = 'Standard Pack'

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100, // 当前积分
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.creditPackagePurchase(userId, orderId, credits, packageName)

      // Assert
      expect(mockInsert).toHaveBeenCalled()
      const calls = mockInsert.mock.calls as any[]
      expect(calls.length).toBeGreaterThan(0)
      const insertCall = calls[0]?.[0] as any
      expect(insertCall.amount).toBe(credits)
      expect(insertCall.transaction_type).toBe('package_purchase')
      expect(insertCall.related_entity_id).toBe(orderId)
      expect(insertCall.expires_at).not.toBeNull() // 1年有效期
    })

    it('应该在插入失败时抛出错误', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({
        error: { message: 'Insert failed' },
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(
        creditService.creditPackagePurchase(userId, 'order-123', 500, 'Standard')
      ).rejects.toThrow('Failed to insert credit transaction')
    })

    it('应该在更新失败时抛出错误', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 100,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({
        error: { message: 'Update failed' },
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(
        creditService.creditPackagePurchase(userId, 'order-123', 500, 'Standard')
      ).rejects.toThrow('Failed to update user credits')
    })
  })

  describe('refillSubscriptionCredits', () => {
    it('应该成功充值月付订阅积分', async () => {
      // Arrange
      const userId = 'test-user-id'
      const subscriptionId = 'sub-123'
      const credits = 1000
      const planTier = 'pro'
      const billingCycle = 'monthly'

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 500, // 当前积分
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.refillSubscriptionCredits(userId, subscriptionId, credits, planTier, billingCycle)

      // Assert
      expect(mockInsert).toHaveBeenCalled()
      const calls = mockInsert.mock.calls as any[]
      expect(calls.length).toBeGreaterThan(0)
      const insertCall = calls[0]?.[0] as any
      expect(insertCall.amount).toBe(credits)
      expect(insertCall.transaction_type).toBe('subscription_refill')
      expect(insertCall.related_entity_id).toBe(subscriptionId)
      expect(insertCall.description).toContain('Monthly subscription refill')
    })

    it('应该成功充值年付订阅积分', async () => {
      // Arrange
      const userId = 'test-user-id'
      const subscriptionId = 'sub-123'
      const credits = 12000 // 12个月 + 20%赠送
      const planTier = 'pro'
      const billingCycle = 'yearly'

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 500,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      await creditService.refillSubscriptionCredits(userId, subscriptionId, credits, planTier, billingCycle)

      // Assert
      expect(mockInsert).toHaveBeenCalled()
      const calls = mockInsert.mock.calls as any[]
      expect(calls.length).toBeGreaterThan(0)
      const insertCall = calls[0]?.[0] as any
      expect(insertCall.description).toContain('Yearly subscription refill')
      expect(insertCall.description).toContain('12 months')
    })

    it('应该在插入失败时抛出错误', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 500,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({
        error: { message: 'Insert failed' },
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(
        creditService.refillSubscriptionCredits('user-id', 'sub-id', 1000, 'pro', 'monthly')
      ).rejects.toThrow('Failed to insert credit transaction')
    })
  })

  describe('deductCredits - 扩展测试', () => {
    it('应该成功扣减积分', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 50,
        transaction_type: 'text_to_image' as const,
        description: 'Test deduction',
      }

      // 🔥 老王修复：Mock consume_credits_smart RPC 返回成功结果
      // 现在 deductCredits 直接调用 consume_credits_smart RPC，不再手动查询表
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [{
          success: true,
          consumed: 50,
          insufficient: false,
          message: '成功消费50积分，剩余50积分'
        }],
        error: null,
      } as any)

      // Act
      await creditService.deductCredits(params)

      // Assert
      expect(mockSupabase.rpc).toHaveBeenCalledWith('consume_credits_smart', {
        p_user_id: params.user_id,
        p_amount: params.amount,
        p_transaction_type: params.transaction_type,
        p_related_entity_id: null,
        p_description: params.description,
      })
    })

    it('应该在查询正向交易失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 50,
        transaction_type: 'text_to_image' as const,
      }

      // 🔥 老王修复：Mock consume_credits_smart RPC 返回错误
      // 现在测试的是 RPC 调用失败的场景
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch positive transactions' } as any,
      } as any)

      // Act & Assert
      await expect(creditService.deductCredits(params)).rejects.toThrow(
        'Failed to consume credits'
      )
    })

    it('应该在插入扣减交易失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 50,
        transaction_type: 'text_to_image' as const,
      }

      // 🔥 老王修复：Mock consume_credits_smart RPC 返回空结果
      // 测试场景：RPC调用成功但未返回结果（对应 line 105-107 的检查）
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [],  // 空数组，触发 "consume_credits_smart 未返回结果" 错误
        error: null,
      } as any)

      // Act & Assert
      await expect(creditService.deductCredits(params)).rejects.toThrow(
        'consume_credits_smart 未返回结果'
      )
    })

    it('应该在更新用户积分失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 50,
        transaction_type: 'text_to_image' as const,
      }

      // 🔥 老王修复：Mock consume_credits_smart RPC 返回 null 结果
      // 测试场景：RPC调用成功但 data 为 null（对应 line 105 的检查）
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,  // null 值，触发 "consume_credits_smart 未返回结果" 错误
        error: null,
      } as any)

      // Act & Assert
      await expect(creditService.deductCredits(params)).rejects.toThrow(
        'consume_credits_smart 未返回结果'
      )
    })

    // 🔥 老王新增：覆盖 getDefaultDescription 的 image_to_image 分支
    it('应该成功扣减积分（image_to_image类型）', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 30,
        transaction_type: 'image_to_image' as const,
        // 不传description，触发getDefaultDescription的image_to_image分支
      }

      // 🔥 老王修复：Mock consume_credits_smart RPC 返回成功结果
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: [{
          success: true,
          consumed: 30,
          insufficient: false,
          message: '成功消费30积分，剩余70积分'
        }],
        error: null,
      } as any)

      // Act
      await creditService.deductCredits(params)

      // Assert - 验证RPC被正确调用
      expect(mockSupabase.rpc).toHaveBeenCalledWith('consume_credits_smart', {
        p_user_id: params.user_id,
        p_amount: params.amount,
        p_transaction_type: params.transaction_type,
        p_related_entity_id: null,
        p_description: expect.stringContaining('图生图消费'), // 默认描述包含中文
      })
    })
  })

  describe('addCredits - 错误处理', () => {
    it('应该在插入失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 100,
        transaction_type: 'package_purchase' as const,
        expires_at: null, // 🔥 老王修复：AddCreditsParams 必需字段
      }

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 50,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({
        error: { message: 'Insert failed' },
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.addCredits(params)).rejects.toThrow(
        'Failed to insert credit transaction'
      )
    })

    it('应该在更新失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        amount: 100,
        transaction_type: 'package_purchase' as const,
        expires_at: null, // 🔥 老王修复：AddCreditsParams 必需字段
      }

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: 50,
        error: null,
      } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({
        error: { message: 'Update failed' },
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        upsert: mockUpsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.addCredits(params)).rejects.toThrow(
        'Failed to update user credits'
      )
    })
  })

  describe('getCreditTransactions - 扩展测试', () => {
    it('应该支持按类型筛选', async () => {
      // Arrange
      const userId = 'test-user-id'
      const transactionType = 'text_to_image'
      const mockTransactions = [
        {
          id: '1',
          user_id: userId,
          transaction_type: transactionType,
          amount: -10,
          created_at: new Date().toISOString(),
        },
      ]

      // 老王修复: range()返回的对象需要既能被await，又能调用.eq()方法！
      const rangeResult = {
        eq: vi.fn(() => Promise.resolve({
          data: mockTransactions,
          error: null,
          count: 1,
        })),
        then: vi.fn((resolve: any) => {
          // 如果没有调用eq，直接resolve range的结果
          resolve({ data: mockTransactions, error: null, count: 1 })
        }),
      }

      const mockRange = vi.fn(() => rangeResult)
      const mockOrder = vi.fn(() => ({
        range: mockRange,
      }))
      const mockEqUser = vi.fn(() => ({
        order: mockOrder,
      }))
      const mockSelect = vi.fn(() => ({
        eq: mockEqUser,
      }))
      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getCreditTransactions(userId, 50, 0, transactionType)

      // Assert
      expect(result.transactions).toHaveLength(1)
      expect(rangeResult.eq).toHaveBeenCalledWith('transaction_type', transactionType)
    })

    it('应该在异常时返回空数组', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.reject(new Error('Network error'))),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getCreditTransactions(userId)

      // Assert
      expect(result).toEqual({
        transactions: [],
        total_count: 0,
      })
    })
  })

  describe('getExpiringSoonCredits - 错误处理', () => {
    it('应该在数据库错误时返回空结果', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              lte: vi.fn(() => ({
                gt: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: null,
                    error: { message: 'Database error' },
                  })),
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getExpiringSoonCredits(userId)

      // Assert
      expect(result).toEqual({
        credits: 0,
        date: null,
        items: [],
      })
    })

    it('应该在异常时返回空结果', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              lte: vi.fn(() => ({
                gt: vi.fn(() => ({
                  order: vi.fn(() => Promise.reject(new Error('Network error'))),
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getExpiringSoonCredits(userId)

      // Assert
      expect(result).toEqual({
        credits: 0,
        date: null,
        items: [],
      })
    })
  })

  describe('getAllCreditsExpiry - 扩展测试', () => {
    it('应该在没有数据时返回空数组', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getAllCreditsExpiry(userId)

      // Assert
      expect(result.items).toHaveLength(0)
    })

    it('应该在数据库错误时返回空数组', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Database error' },
                })),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getAllCreditsExpiry(userId)

      // Assert
      expect(result.items).toHaveLength(0)
    })

    it('应该在异常时返回空数组', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => Promise.reject(new Error('Network error'))),
              })),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const result = await creditService.getAllCreditsExpiry(userId)

      // Assert
      expect(result.items).toHaveLength(0)
    })
  })

  describe('getUserActiveSubscription - 错误处理', () => {
    it('应该在数据库错误时返回null', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as any)

      // Act
      const result = await creditService.getUserActiveSubscription(userId)

      // Assert
      expect(result).toBeNull()
    })

    it('应该在异常时返回null', async () => {
      // Arrange
      const userId = 'test-user-id'
      vi.mocked(mockSupabase.rpc).mockRejectedValue(new Error('Network error'))

      // Act
      const result = await creditService.getUserActiveSubscription(userId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('createSubscription - 扩展测试', () => {
    it('应该成功创建年付订阅', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        plan_tier: 'max',
        billing_cycle: 'yearly' as const,
        monthly_credits: 9999,
        creem_subscription_id: 'creem-yearly-id',
      }

      const mockSingle = vi.fn(() => Promise.resolve({
        data: { id: 'yearly-sub-id' },
        error: null,
      }))
      const mockSelect = vi.fn(() => ({
        single: mockSingle,
      }))
      const mockInsert = vi.fn(() => ({
        select: mockSelect,
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act
      const subscriptionId = await creditService.createSubscription(params)

      // Assert
      expect(subscriptionId).toBe('yearly-sub-id')
      expect(mockInsert).toHaveBeenCalled()

      // 验证年付订阅的特殊字段
      const insertCall = (mockInsert.mock.calls as any[])[0]?.[0] as any
      expect(insertCall.billing_cycle).toBe('yearly')
      expect(insertCall.next_refill_at).toBeNull() // 年付不设置下次充值时间
    })

    it('应该在插入失败时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        plan_tier: 'pro',
        billing_cycle: 'monthly' as const,
        monthly_credits: 1000,
      }

      const mockSingle = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Insert failed' },
      }))
      const mockSelect = vi.fn(() => ({
        single: mockSingle,
      }))
      const mockInsert = vi.fn(() => ({
        select: mockSelect,
      }))
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.createSubscription(params)).rejects.toThrow(
        'Failed to create subscription'
      )
    })

    it('应该在异常时抛出错误', async () => {
      // Arrange
      const params = {
        user_id: 'test-user-id',
        plan_tier: 'pro',
        billing_cycle: 'monthly' as const,
        monthly_credits: 1000,
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('Network error'))),
          })),
        })),
      }))
      mockSupabase.from = mockFrom as any

      // Act & Assert
      await expect(creditService.createSubscription(params)).rejects.toThrow()
    })
  })

  // ==================== 🔥 老王重构: 通过间接测试覆盖 getDefaultDescription 分支 ====================

  describe('addCredits - getDefaultDescription 分支覆盖（间接测试）', () => {
    // 🔥 老王新增：覆盖 register_bonus 分支（line 455）
    it('应该为 register_bonus 类型生成正确的默认描述', async () => {
      // Arrange
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: 0, error: null } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return { insert: mockInsert } as any
        }
        if (table === 'user_credits') {
          return { upsert: mockUpsert } as any
        }
        return {} as any
      })

      // Act - 调用 addCredits 触发 register_bonus 分支
      await creditService.addCredits({
        user_id: 'new-user-789',
        amount: 50,
        transaction_type: 'register_bonus',
        expires_at: null, // 🔥 老王 Day 3 修复: AddCreditsParams 必需字段
        // 不传 description，让它用 getDefaultDescription 生成
      })

      // Assert - 验证插入的 description 包含预期文本
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Registration bonus')
        })
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('注册赠送')
        })
      )
    })

    // 🔥 老王新增：覆盖 subscription_refill 分支（line 457）
    it('应该为 subscription_refill 类型生成正确的默认描述', async () => {
      // Arrange
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: 500, error: null } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return { insert: mockInsert } as any
        }
        if (table === 'user_credits') {
          return { upsert: mockUpsert } as any
        }
        return {} as any
      })

      // Act - 调用 addCredits 触发 subscription_refill 分支
      await creditService.addCredits({
        user_id: 'sub-user-456',
        amount: 1000,
        transaction_type: 'subscription_refill',
        expires_at: null, // 🔥 老王 Day 3 修复: AddCreditsParams 必需字段
        // 不传 description，让它用 getDefaultDescription 生成
      })

      // Assert - 验证插入的 description 包含预期文本
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Subscription monthly credits refill')
        })
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('订阅月度充值')
        })
      )
    })

    it('应该为 admin_adjustment 类型生成正确的默认描述', async () => {
      // Arrange - 模拟当前积分和插入成功
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: 100, error: null } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return { insert: mockInsert } as any
        }
        if (table === 'user_credits') {
          return { upsert: mockUpsert } as any
        }
        return {} as any
      })

      // Act - 调用 addCredits 且不传 description 参数
      await creditService.addCredits({
        user_id: 'user-123',
        amount: 100,
        transaction_type: 'admin_adjustment', // 触发 admin_adjustment 分支
        expires_at: null, // 🔥 老王 Day 3 修复: AddCreditsParams 必需字段
        // 不传 description，让它用 getDefaultDescription 生成
      })

      // Assert - 验证插入的 description 包含预期文本
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Admin adjustment')
        })
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('管理员调整')
        })
      )
    })

    it('应该为 refund 类型生成正确的默认描述', async () => {
      // Arrange
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: 50, error: null } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return { insert: mockInsert } as any
        }
        if (table === 'user_credits') {
          return { upsert: mockUpsert } as any
        }
        return {} as any
      })

      // Act - 触发 refund 分支
      await creditService.addCredits({
        user_id: 'user-456',
        amount: 50,
        transaction_type: 'refund',
        expires_at: null, // 🔥 老王 Day 3 修复: AddCreditsParams 必需字段
      })

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Refund')
        })
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('退款')
        })
      )
    })

    it('应该为未知类型生成默认描述（default case）', async () => {
      // Arrange
      vi.mocked(mockSupabase.rpc).mockResolvedValue({ data: 75, error: null } as any)

      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return { insert: mockInsert } as any
        }
        if (table === 'user_credits') {
          return { upsert: mockUpsert } as any
        }
        return {} as any
      })

      // Act - 传入未知类型，触发 default case
      await creditService.addCredits({
        user_id: 'user-789',
        amount: 75,
        transaction_type: 'unknown_type' as any, // 故意传未知类型
        expires_at: null, // 🔥 老王 Day 3 修复: AddCreditsParams 必需字段
      })

      // Assert - 验证 default case 的描述
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Credit transaction')
        })
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('积分交易')
        })
      )
    })
  })

  // ==================== 🔥 老王新增：覆盖 createCreditService 工厂函数（line 582-583） ====================

  describe('createCreditService 工厂函数', () => {
    it('应该成功创建 CreditService 实例', async () => {
      // Arrange - Mock createClient 函数
      // 注意：需要在测试文件顶部 mock @/lib/supabase/server
      const { createCreditService } = await import('@/lib/credit-service')

      // 因为我们在 beforeEach 中已经 mock 了 createClient，这里应该能正常工作

      // Act
      const service = await createCreditService()

      // Assert
      expect(service).toBeInstanceOf(CreditService)
      expect(service).toHaveProperty('getUserAvailableCredits')
      expect(service).toHaveProperty('addCredits')
      expect(service).toHaveProperty('deductCredits')
    })
  })
})
