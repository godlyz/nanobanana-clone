/**
 * Credits API 测试工具类
 * 艹！这个工具类提供完整的Mock链，避免漏掉API需要的查询
 */

export interface MockCreditTransaction {
  id: string
  user_id: string
  amount: number
  remaining_amount?: number
  description?: string
  transaction_type?: string
  created_at: string
  related_entity_id?: string | null
  related_entity_type?: string | null
  expires_at?: string | null
  is_frozen?: boolean
  frozen_until?: string | null
}

export interface MockSubscription {
  id: string
  user_id: string
  plan_tier: string
  started_at: string
}

export interface MockGenerationRecord {
  id: string
  generation_type: string
  tool_type: string | null
}

/**
 * 创建完整的Credits API Mock链
 * 艹！这个函数返回一个完整的Supabase from Mock，包含所有需要的查询
 */
export function createCreditsAPIMock(
  transactions: MockCreditTransaction[],
  frozenPackages: MockCreditTransaction[] = [],
  subscriptions: MockSubscription[] = [],
  generationRecords: MockGenerationRecord[] = []
) {
  return vi.fn((table: string) => {
    // 🔥 credit_transactions 表的查询链
    if (table === 'credit_transactions') {
      return {
        select: vi.fn((columns?: string) => {
          // 🔥 分支1: 查询所有交易记录 (select('*'))
          if (columns === '*') {
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: transactions,
                  error: null
                }))
              }))
            }
          }

          // 🔥 分支2: 查询冻结积分包 (select('id, amount, ...'))
          if (columns?.includes('frozen_until')) {
            return {
              eq: vi.fn((field: string, value: any) => {
                // 第1个eq: user_id
                if (field === 'user_id') {
                  return {
                    eq: vi.fn((field2: string, value2: any) => {
                      // 第2个eq: is_frozen
                      if (field2 === 'is_frozen') {
                        return {
                          gt: vi.fn(() => Promise.resolve({
                            data: frozenPackages,
                            error: null
                          }))
                        }
                      }
                      return { gt: vi.fn(() => Promise.resolve({ data: [], error: null })) }
                    })
                  }
                }
                return {
                  eq: vi.fn(() => ({
                    gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
                  }))
                }
              })
            }
          }

          // 🔥 默认返回空
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        })
      }
    }

    // 🔥 user_subscriptions 表的查询链
    if (table === 'user_subscriptions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: subscriptions,
              error: null
            }))
          }))
        }))
      }
    }

    // 🔥 generation_history 表的查询链
    if (table === 'generation_history') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({
            data: generationRecords,
            error: null
          }))
        }))
      }
    }

    // 🔥 未知表，返回空查询
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }
  }) as any
}

/**
 * 创建Mock的CreditService
 */
export function createMockCreditService(
  availableCredits: number = 100,
  expiringSoon: any = { credits: 0, date: null, items: [] },
  allExpiry: any = { items: [] }
) {
  return {
    getUserAvailableCredits: vi.fn(() => Promise.resolve(availableCredits)),
    getExpiringSoonCredits: vi.fn(() => Promise.resolve(expiringSoon)),
    getAllCreditsExpiry: vi.fn(() => Promise.resolve(allExpiry)),
  }
}

// 艹！导入vitest的vi
import { vi } from 'vitest'
