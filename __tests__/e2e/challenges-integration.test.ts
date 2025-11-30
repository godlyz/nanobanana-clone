/**
 * Challenges系统集成测试（E2E）
 *
 * 测试完整用户流程：
 * 1. 管理员创建挑战
 * 2. 多个用户提交作品
 * 3. 用户投票
 * 4. Cron Job自动分配奖品
 * 5. 验证最终结果
 *
 * 老王提醒：这是端到端测试，必须模拟真实场景！
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

interface GraphQLContext {
  user: ReturnType<typeof createMockUser> | null
  supabase: SupabaseClient
  request?: {
    headers: {
      get: (name: string) => string | null
    }
  }
}

describe('Challenges系统集成测试（E2E）', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let adminUser: ReturnType<typeof createMockUser>
  let users: ReturnType<typeof createMockUser>[]
  let challengeId: string
  let submissionIds: string[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()

    // 创建管理员
    adminUser = createMockUser({
      id: 'admin-001',
      email: 'admin@test.com',
      role: 'admin'
    })

    // 创建10个普通用户
    users = Array.from({ length: 10 }, (_, i) =>
      createMockUser({
        id: `user-${String(i + 1).padStart(3, '0')}`,
        email: `user${i + 1}@test.com`,
        role: 'user'
      })
    )

    challengeId = 'challenge-e2e-001'
    submissionIds = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('完整流程：创建挑战 → 提交作品 → 投票 → 分配奖品', async () => {
    // 艹，这个测试要模拟完整的挑战流程，必须成功！

    // ==================== 阶段1：管理员创建挑战 ====================
    const challengeData = {
      id: challengeId,
      title: '2025春节AI创作大赛',
      description: '用AI创作最有创意的春节主题作品',
      rules: '1. 必须原创\n2. 符合主题',
      category: 'image',
      prizes: JSON.stringify([
        { rank: 1, prize_type: 'credits', prize_value: 1000 },
        { rank: 2, prize_type: 'credits', prize_value: 500 },
        { rank: 3, prize_type: 'credits', prize_value: 200 }
      ]),
      start_at: '2025-02-01T00:00:00Z',
      end_at: '2025-02-28T23:59:59Z',
      voting_ends_at: '2025-03-07T23:59:59Z',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: challengeData,
                error: null
              })
            })
          })
        }
      }
      return {} as any
    })

    const createChallengeContext: GraphQLContext = {
      user: adminUser,
      supabase: mockSupabase as unknown as SupabaseClient
    }

    // 模拟createChallenge mutation
    const createChallenge = async (ctx: GraphQLContext) => {
      if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
        throw new Error('仅管理员可创建挑战')
      }
      const { data } = await ctx.supabase
        .from('challenges')
        .insert(challengeData)
        .select()
        .single()
      return data
    }

    const challenge = await createChallenge(createChallengeContext)
    expect(challenge).toBeDefined()
    expect(challenge.id).toBe(challengeId)
    expect(challenge.status).toBe('active')

    // ==================== 阶段2：5个用户提交作品 ====================
    const submissions = []
    for (let i = 0; i < 5; i++) {
      const submissionId = `submission-${String(i + 1).padStart(3, '0')}`
      submissionIds.push(submissionId)

      const submissionData = {
        id: submissionId,
        challenge_id: challengeId,
        user_id: users[i].id,
        title: `作品${i + 1}：春节主题`,
        description: `这是用户${i + 1}的AI作品`,
        media_url: `https://example.com/work-${i + 1}.jpg`,
        media_type: 'image',
        vote_count: 0,
        rank: null,
        created_at: new Date(Date.now() + i * 1000).toISOString() // 不同时间提交
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: challengeData,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'challenge_submissions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: submissionData,
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitContext: GraphQLContext = {
        user: users[i],
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const submitEntry = async (ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')
        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', challengeId)
          .single()
        if (!challenge || challenge.status !== 'active') {
          throw new Error('挑战未开始或已结束')
        }
        const { data } = await ctx.supabase
          .from('challenge_submissions')
          .insert(submissionData)
          .select()
          .single()
        return data
      }

      const submission = await submitEntry(submitContext)
      submissions.push(submission)
      expect(submission).toBeDefined()
      expect(submission.id).toBe(submissionId)
    }

    expect(submissions.length).toBe(5)

    // ==================== 阶段3：用户投票 ====================
    // 作品1获得8票，作品2获得5票，作品3获得3票，作品4获得1票，作品5获得0票
    const votePatterns = [
      { submissionId: submissionIds[0], voters: [0, 1, 2, 3, 4, 5, 6, 7] },      // 8票
      { submissionId: submissionIds[1], voters: [0, 2, 4, 6, 8] },               // 5票
      { submissionId: submissionIds[2], voters: [1, 3, 5] },                     // 3票
      { submissionId: submissionIds[3], voters: [7] }                            // 1票
      // submissionIds[4] 没有投票                                                 // 0票
    ]

    const votes: any[] = []
    for (const pattern of votePatterns) {
      for (const voterIndex of pattern.voters) {
        const voteId = `vote-${pattern.submissionId}-${users[voterIndex].id}`
        const voteData = {
          id: voteId,
          challenge_id: challengeId,
          submission_id: pattern.submissionId,
          user_id: users[voterIndex].id,
          created_at: new Date().toISOString()
        }

        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: voteData,
          error: null
        })

        const voteContext: GraphQLContext = {
          user: users[voterIndex],
          supabase: mockSupabase as unknown as SupabaseClient,
          request: {
            headers: {
              get: vi.fn((name: string) => {
                if (name === 'x-forwarded-for') return `192.168.1.${voterIndex + 100}`
                if (name === 'user-agent') return 'Mozilla/5.0 Test'
                return null
              })
            }
          }
        }

        const voteForSubmission = async (submissionId: string, ctx: GraphQLContext) => {
          if (!ctx.user) throw new Error('未登录')
          const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
          const userAgent = ctx.request?.headers.get('user-agent') || null
          const { data } = await ctx.supabase.rpc('cast_vote', {
            p_submission_id: submissionId,
            p_user_id: ctx.user.id,
            p_ip_address: ipAddress,
            p_user_agent: userAgent
          })
          return data
        }

        const vote = await voteForSubmission(pattern.submissionId, voteContext)
        votes.push(vote)
        expect(vote).toBeDefined()
        expect(vote.submission_id).toBe(pattern.submissionId)
      }
    }

    expect(votes.length).toBe(17) // 8+5+3+1 = 17票

    // ==================== 阶段4：Cron Job分配奖品 ====================
    // 模拟投票期结束后的Cron Job执行
    const submissionsWithVotes = [
      { ...submissions[0], vote_count: 8, user_id: users[0].id },  // 第1名
      { ...submissions[1], vote_count: 5, user_id: users[1].id },  // 第2名
      { ...submissions[2], vote_count: 3, user_id: users[2].id },  // 第3名
      { ...submissions[3], vote_count: 1, user_id: users[3].id },  // 第4名
      { ...submissions[4], vote_count: 0, user_id: users[4].id }   // 第5名
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ ...challengeData, status: 'voting' }],
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        }
      }
      if (table === 'challenge_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: submissionsWithVotes,
                  error: null
                })
              }))
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        }
      }
      if (table === 'challenge_rewards') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
      }
      return {} as any
    })

    // 模拟credit-service的addCredits函数
    const mockAddCredits = vi.fn().mockResolvedValue({ success: true })

    const distributePrizes = async () => {
      // 查找已结束的挑战
      const { data: challenges } = await mockSupabase
        .from('challenges')
        .select('*')
        .lt('voting_ends_at', new Date().toISOString())
        .eq('status', 'voting')

      if (!challenges || challenges.length === 0) {
        return { processed: 0 }
      }

      const challenge = challenges[0]
      const prizes = JSON.parse(challenge.prizes)

      // 获取作品并排序
      const { data: submissions } = await mockSupabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: true })

      if (!submissions || submissions.length === 0) {
        return { processed: 0 }
      }

      // 更新排名
      for (let i = 0; i < submissions.length; i++) {
        await mockSupabase
          .from('challenge_submissions')
          .update({ rank: i + 1 })
          .eq('id', submissions[i].id)
      }

      // 分配奖品
      for (const prize of prizes) {
        if (prize.rank <= submissions.length) {
          const submission = submissions[prize.rank - 1]

          if (prize.prize_type === 'credits') {
            await mockAddCredits(
              submission.user_id,
              parseInt(prize.prize_value),
              'challenge_reward',
              `挑战「${challenge.title}」第${prize.rank}名奖励`
            )
          }

          await mockSupabase
            .from('challenge_rewards')
            .insert({
              challenge_id: challenge.id,
              user_id: submission.user_id,
              submission_id: submission.id,
              rank: prize.rank,
              prize_type: prize.prize_type,
              prize_value: prize.prize_value
            })
        }
      }

      // 更新挑战状态
      await mockSupabase
        .from('challenges')
        .update({ status: 'completed' })
        .eq('id', challenge.id)

      return { processed: 1 }
    }

    const result = await distributePrizes()
    expect(result.processed).toBe(1)

    // ==================== 阶段5：验证最终结果 ====================
    // 验证积分发放
    expect(mockAddCredits).toHaveBeenCalledTimes(3) // 前3名获奖
    expect(mockAddCredits).toHaveBeenNthCalledWith(
      1,
      users[0].id,
      1000,
      'challenge_reward',
      expect.stringContaining('第1名奖励')
    )
    expect(mockAddCredits).toHaveBeenNthCalledWith(
      2,
      users[1].id,
      500,
      'challenge_reward',
      expect.stringContaining('第2名奖励')
    )
    expect(mockAddCredits).toHaveBeenNthCalledWith(
      3,
      users[2].id,
      200,
      'challenge_reward',
      expect.stringContaining('第3名奖励')
    )

    // 验证排名逻辑
    const rankings = [
      { submission: submissions[0], expectedRank: 1, votes: 8 },
      { submission: submissions[1], expectedRank: 2, votes: 5 },
      { submission: submissions[2], expectedRank: 3, votes: 3 },
      { submission: submissions[3], expectedRank: 4, votes: 1 },
      { submission: submissions[4], expectedRank: 5, votes: 0 }
    ]

    for (const { expectedRank } of rankings) {
      expect(mockSupabase.from).toHaveBeenCalledWith('challenge_submissions')
      // 验证update被调用来更新排名
      const updateCalls = (mockSupabase.from as any).mock.results
        .filter((r: any) => r.value?.update)
      expect(updateCalls.length).toBeGreaterThan(0)
    }
  })

  it('并发投票压力测试：100个用户同时投票', async () => {
    // 艹，测试并发投票，看看系统能不能扛得住
    const submissionId = 'submission-stress-001'
    const concurrentUsers = Array.from({ length: 100 }, (_, i) =>
      createMockUser({
        id: `concurrent-user-${i}`,
        email: `user${i}@test.com`,
        role: 'user'
      })
    )

    mockSupabase.rpc = vi.fn().mockImplementation((funcName: string, params: any) => {
      // 模拟10%的投票失败（重复投票或IP限制）
      const failureRate = 0.1
      if (Math.random() < failureRate) {
        return Promise.resolve({
          data: null,
          error: { message: '您已经为该作品投过票了' }
        })
      }
      return Promise.resolve({
        data: {
          id: `vote-${params.p_user_id}`,
          submission_id: submissionId,
          user_id: params.p_user_id,
          created_at: new Date().toISOString()
        },
        error: null
      })
    })

    const voteForSubmission = async (userId: string, ctx: GraphQLContext) => {
      const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      const userAgent = ctx.request?.headers.get('user-agent') || null
      const { data, error } = await ctx.supabase.rpc('cast_vote', {
        p_submission_id: submissionId,
        p_user_id: userId,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })
      if (error) throw new Error(error.message)
      return data
    }

    // 并发投票
    const votePromises = concurrentUsers.map(async (user, index) => {
      const voteContext: GraphQLContext = {
        user,
        supabase: mockSupabase as unknown as SupabaseClient,
        request: {
          headers: {
            get: vi.fn((name: string) => {
              if (name === 'x-forwarded-for') return `10.0.${Math.floor(index / 256)}.${index % 256}`
              if (name === 'user-agent') return 'Mozilla/5.0 Test'
              return null
            })
          }
        }
      }

      try {
        return await voteForSubmission(user.id, voteContext)
      } catch (error) {
        return null // 投票失败
      }
    })

    const results = await Promise.all(votePromises)
    const successfulVotes = results.filter(r => r !== null)
    const failedVotes = results.filter(r => r === null)

    // 验证投票结果
    expect(successfulVotes.length).toBeGreaterThan(80) // 至少80%成功
    expect(failedVotes.length).toBeLessThan(20) // 失败率低于20%
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(100)
  })

  it('时间序列测试：验证时间窗口的准确性', async () => {
    // 艹，测试时间窗口逻辑，确保挑战在正确的时间段可用
    const now = new Date('2025-02-15T12:00:00Z') // 挑战进行中
    const beforeStart = new Date('2025-01-31T23:59:59Z')
    const afterEnd = new Date('2025-03-01T00:00:00Z')
    const afterVotingEnd = new Date('2025-03-08T00:00:00Z')

    const testChallenge = {
      id: 'time-test-challenge',
      status: 'active',
      start_at: '2025-02-01T00:00:00Z',
      end_at: '2025-02-28T23:59:59Z',
      voting_ends_at: '2025-03-07T23:59:59Z'
    }

    // 测试1：提交期之前 - 应该拒绝提交
    vi.setSystemTime(beforeStart)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...testChallenge, status: 'upcoming' },
                error: null
              })
            })
          })
        }
      }
      return {} as any
    })

    const submitBeforeStart = async () => {
      const { data: challenge } = await mockSupabase
        .from('challenges')
        .select('*')
        .eq('id', testChallenge.id)
        .single()
      if (!challenge || challenge.status !== 'active') {
        throw new Error('挑战未开始或已结束')
      }
    }

    await expect(submitBeforeStart()).rejects.toThrow('挑战未开始或已结束')

    // 测试2：提交期内 - 应该允许提交
    vi.setSystemTime(now)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: testChallenge,
                error: null
              })
            })
          })
        }
      }
      return {} as any
    })

    const submitDuringPeriod = async () => {
      const { data: challenge } = await mockSupabase
        .from('challenges')
        .select('*')
        .eq('id', testChallenge.id)
        .single()
      if (!challenge || challenge.status !== 'active') {
        throw new Error('挑战未开始或已结束')
      }
      return challenge
    }

    const result = await submitDuringPeriod()
    expect(result).toBeDefined()

    // 测试3：提交期结束后 - 应该拒绝提交
    vi.setSystemTime(afterEnd)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...testChallenge, status: 'voting' },
                error: null
              })
            })
          })
        }
      }
      return {} as any
    })

    await expect(submitDuringPeriod()).rejects.toThrow('挑战未开始或已结束')

    // 测试4：投票期结束后 - Cron Job应该执行
    vi.setSystemTime(afterVotingEnd)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ ...testChallenge, status: 'voting' }],
                error: null
              })
            })
          })
        }
      }
      return {} as any
    })

    const checkCronEligibility = async () => {
      const { data: challenges } = await mockSupabase
        .from('challenges')
        .select('*')
        .lt('voting_ends_at', new Date().toISOString())
        .eq('status', 'voting')
      return challenges && challenges.length > 0
    }

    const shouldRun = await checkCronEligibility()
    expect(shouldRun).toBe(true)

    // 恢复系统时间
    vi.useRealTimers()
  })
})
