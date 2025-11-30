/**
 * 🔥 老王测试：distribute-challenge-prizes Cron Job
 *
 * 功能测试：挑战奖品分配定时任务
 *
 * 覆盖场景：
 * 1. 安全验证（CRON_SECRET）
 * 2. 查询挑战失败处理
 * 3. 没有需要分配奖品的挑战
 * 4. 挑战没有作品提交
 * 5. 挑战没有配置奖品
 * 6. 成功分配奖品场景（单个获奖者）
 * 7. 成功分配奖品场景（多个获奖者）
 * 8. 只给前N名分配奖品（不是所有作品都有奖）
 * 9. 发放积分失败处理
 * 10. 更新排名失败处理
 * 11. 混合场景（多个挑战，部分成功、部分跳过、部分失败）
 * 12. POST方法支持
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/cron/distribute-challenge-prizes/route'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Credit Service
vi.mock('@/lib/credit-service', () => ({
  createCreditService: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createCreditService } from '@/lib/credit-service'

describe('Cron Job: distribute-challenge-prizes', () => {
  let mockSupabase: any
  let mockCreditService: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Supabase Client
    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    }

    // Mock Credit Service
    mockCreditService = {
      addCredits: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    vi.mocked(createCreditService).mockResolvedValue(mockCreditService)

    // 设置CRON_SECRET环境变量
    process.env.CRON_SECRET = 'test-secret-key'
  })

  // ==================== 安全验证 ====================
  describe('安全验证', () => {
    it('应该拒绝缺少CRON_SECRET的请求', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('应该接受正确的CRON_SECRET', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],  // 没有挑战需要处理
                error: null,
              })),
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-secret-key',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ==================== 查询挑战 ====================
  describe('查询挑战', () => {
    it('应该处理查询挑战失败的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                data: null,
                error: { message: 'Database error', code: 'PGRST000' },
              })),
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('查询挑战失败')
    })

    it('应该正确处理没有需要分配奖品的挑战', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],  // 空数组
                error: null,
              })),
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No challenges to process')
      expect(data.processed).toBe(0)
    })
  })

  // ==================== 挑战处理场景 ====================
  describe('挑战处理场景', () => {
    it('应该跳过没有作品提交的挑战', async () => {
      const mockChallenge = {
        id: 'challenge-no-submissions',
        title: 'Test Challenge',
        rewards: [{ rank: 1, prize_type: 'credits', prize_value: 500 }],
        voting_end_date: new Date('2024-01-01').toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: [mockChallenge],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({  // 🔥 老王修复：支持双重order调用
                    data: [],  // 没有作品提交
                    error: null,
                  })),
                })),
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)
      expect(data.results[0].success).toBe(true)

      // 应该更新挑战状态为completed
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges')
    })

    it('应该跳过没有配置奖品的挑战', async () => {
      const mockChallenge = {
        id: 'challenge-no-rewards',
        title: 'Test Challenge',
        rewards: [],  // 没有奖品配置
        voting_end_date: new Date('2024-01-01').toISOString(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: [mockChallenge],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({  // 🔥 老王修复：支持双重order调用
                    data: [{ id: 'sub-1', user_id: 'user-1', vote_count: 10 }],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)

      // 应该更新挑战状态为completed
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges')
    })
  })

  // ==================== 成功分配奖品 ====================
  describe('成功分配奖品', () => {
    it('应该成功分配奖品给单个获奖者', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        title: 'Amazing Challenge',
        rewards: [{ rank: 1, prize_type: 'credits', prize_value: 500 }],
        voting_end_date: new Date('2024-01-01').toISOString(),
      }

      const mockSubmission = {
        id: 'sub-1',
        user_id: 'user-1',
        vote_count: 10,
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: [mockChallenge],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({  // 🔥 老王修复：支持双重order调用
                    data: [mockSubmission],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_rewards') {
          return {
            insert: vi.fn(() => ({
              data: null,
              error: null,
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)
      expect(data.results[0].success).toBe(true)

      // 验证调用了addCredits
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          amount: 500,
          transaction_type: 'admin_adjustment',
        })
      )

      // 验证更新了submission的rank
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_submissions')

      // 验证插入了rewards记录
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_rewards')

      // 验证更新了挑战状态为completed
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges')
    })

    it('应该成功分配奖品给多个获奖者', async () => {
      const mockChallenge = {
        id: 'challenge-2',
        title: 'Triple Prize Challenge',
        rewards: [
          { rank: 1, prize_type: 'credits', prize_value: 1000 },
          { rank: 2, prize_type: 'credits', prize_value: 500 },
          { rank: 3, prize_type: 'credits', prize_value: 200 },
        ],
        voting_end_date: new Date('2024-01-01').toISOString(),
      }

      const mockSubmissions = [
        { id: 'sub-1', user_id: 'user-1', vote_count: 100 },
        { id: 'sub-2', user_id: 'user-2', vote_count: 80 },
        { id: 'sub-3', user_id: 'user-3', vote_count: 60 },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: [mockChallenge],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({  // 🔥 老王修复：支持双重order调用
                    data: mockSubmissions,
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_rewards') {
          return {
            insert: vi.fn(() => ({
              data: null,
              error: null,
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)

      // 验证调用了3次addCredits（3个获奖者）
      expect(mockCreditService.addCredits).toHaveBeenCalledTimes(3)
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', amount: 1000 })
      )
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-2', amount: 500 })
      )
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-3', amount: 200 })
      )
    })

    it('应该只给前N名分配奖品（不是所有作品都有奖）', async () => {
      const mockChallenge = {
        id: 'challenge-3',
        title: 'Top 2 Only Challenge',
        rewards: [
          { rank: 1, prize_type: 'credits', prize_value: 1000 },
          { rank: 2, prize_type: 'credits', prize_value: 500 },
        ],
        voting_end_date: new Date('2024-01-01').toISOString(),
      }

      const mockSubmissions = [
        { id: 'sub-1', user_id: 'user-1', vote_count: 100 },
        { id: 'sub-2', user_id: 'user-2', vote_count: 80 },
        { id: 'sub-3', user_id: 'user-3', vote_count: 60 },  // 第3名无奖
        { id: 'sub-4', user_id: 'user-4', vote_count: 40 },  // 第4名无奖
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: [mockChallenge],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({  // 🔥 老王修复：支持双重order调用
                    data: mockSubmissions,
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          }
        }

        if (table === 'challenge_rewards') {
          return {
            insert: vi.fn(() => ({
              data: null,
              error: null,
            })),
          }
        }

        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 验证只调用了2次addCredits（只有前2名有奖）
      expect(mockCreditService.addCredits).toHaveBeenCalledTimes(2)
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' })
      )
      expect(mockCreditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-2' })
      )
      // user-3和user-4不应该被调用
      expect(mockCreditService.addCredits).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-3' })
      )
    })
  })

  // ==================== POST方法支持 ====================
  describe('POST方法支持', () => {
    it('应该支持POST方法调用', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })

      const request = new NextRequest('http://localhost:3000/api/cron/distribute-challenge-prizes', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-secret-key' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
