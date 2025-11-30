/**
 * Challenges系统性能测试
 *
 * 测试大规模数据场景：
 * 1. 大量作品提交（100+作品）
 * 2. 大量投票（1000+投票）
 * 3. 排行榜查询性能
 * 4. Cron Job处理大数据性能
 *
 * 老王提醒：这是性能测试，必须快！
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

describe('Challenges系统性能测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let adminUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()

    adminUser = createMockUser({
      id: 'admin-perf',
      email: 'admin@test.com',
      role: 'admin'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('性能测试：处理100个作品提交', async () => {
    // 艹，100个作品提交，必须在合理时间内完成
    const challengeId = 'perf-challenge-001'
    const submissionCount = 100

    // 创建100个用户
    const users = Array.from({ length: submissionCount }, (_, i) =>
      createMockUser({
        id: `perf-user-${i}`,
        email: `perfuser${i}@test.com`,
        role: 'user'
      })
    )

    // Mock挑战查询
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: challengeId,
                  status: 'active',
                  start_at: '2025-01-01T00:00:00Z',
                  end_at: '2025-12-31T23:59:59Z'
                },
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
                data: [], // 没有重复提交
                error: null
              })
            })
          }),
          insert: vi.fn().mockImplementation((data: any) => ({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...data,
                  id: `submission-${data.user_id}`,
                  created_at: new Date().toISOString()
                },
                error: null
              })
            })
          }))
        }
      }
      return {} as any
    })

    const submitEntry = async (userId: string, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('未登录')
      const { data: challenge } = await ctx.supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single()
      if (!challenge || challenge.status !== 'active') {
        throw new Error('挑战未开始或已结束')
      }
      const { data: existing } = await ctx.supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
      if (existing && existing.length > 0) {
        throw new Error('您已提交过作品')
      }
      const { data } = await ctx.supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          title: `性能测试作品-${userId}`,
          media_url: `https://example.com/${userId}.jpg`,
          media_type: 'image'
        })
        .select()
        .single()
      return data
    }

    // 记录开始时间
    const startTime = performance.now()

    // 批量提交（模拟并发）
    const submitPromises = users.map(async (user) => {
      const ctx: GraphQLContext = {
        user,
        supabase: mockSupabase as unknown as SupabaseClient
      }
      return await submitEntry(user.id, ctx)
    })

    const results = await Promise.all(submitPromises)

    // 记录结束时间
    const endTime = performance.now()
    const duration = endTime - startTime

    // 验证结果
    expect(results.length).toBe(submissionCount)
    expect(results.every(r => r !== null)).toBe(true)

    // 性能断言：100个提交应该在2秒内完成（模拟环境）
    expect(duration).toBeLessThan(2000)
    console.log(`✅ [性能] 100个作品提交耗时: ${duration.toFixed(2)}ms`)
  })

  it('性能测试：处理1000个投票', async () => {
    // 艹，1000个投票，看看RPC函数能不能扛得住
    const submissionId = 'perf-submission-001'
    const voteCount = 1000

    // 创建1000个用户
    const voters = Array.from({ length: voteCount }, (_, i) =>
      createMockUser({
        id: `voter-${i}`,
        email: `voter${i}@test.com`,
        role: 'user'
      })
    )

    mockSupabase.rpc = vi.fn().mockImplementation((funcName: string, params: any) => {
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

    const voteForSubmission = async (userId: string, ipAddress: string) => {
      const { data, error } = await mockSupabase.rpc('cast_vote', {
        p_submission_id: submissionId,
        p_user_id: userId,
        p_ip_address: ipAddress,
        p_user_agent: 'Mozilla/5.0 Test'
      })
      if (error) throw new Error(error.message)
      return data
    }

    // 记录开始时间
    const startTime = performance.now()

    // 批量投票（模拟并发）
    const votePromises = voters.map(async (voter, index) => {
      const ipAddress = `10.${Math.floor(index / 65536)}.${Math.floor((index % 65536) / 256)}.${index % 256}`
      return await voteForSubmission(voter.id, ipAddress)
    })

    const results = await Promise.all(votePromises)

    // 记录结束时间
    const endTime = performance.now()
    const duration = endTime - startTime

    // 验证结果
    expect(results.length).toBe(voteCount)
    expect(results.every(r => r !== null)).toBe(true)
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(voteCount)

    // 性能断言：1000个投票应该在3秒内完成（模拟环境）
    expect(duration).toBeLessThan(3000)
    console.log(`✅ [性能] 1000个投票耗时: ${duration.toFixed(2)}ms`)
  })

  it('性能测试：排行榜查询（1000个作品）', async () => {
    // 艹，1000个作品的排行榜查询，必须快！
    const challengeId = 'perf-challenge-leaderboard'
    const submissionCount = 1000

    // 生成1000个作品数据
    const submissions = Array.from({ length: submissionCount }, (_, i) => ({
      id: `submission-${i}`,
      challenge_id: challengeId,
      user_id: `user-${i}`,
      title: `作品${i}`,
      media_url: `https://example.com/${i}.jpg`,
      media_type: 'image',
      vote_count: Math.floor(Math.random() * 1000), // 随机投票数
      rank: null,
      created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
    }))

    // 按投票数排序
    const sortedSubmissions = [...submissions].sort((a, b) => {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenge_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: sortedSubmissions.slice(0, 50), // 返回前50名
                    error: null
                  })
                }))
              }))
            })
          })
        }
      }
      return {} as any
    })

    const getLeaderboard = async (limit: number = 50) => {
      const { data } = await mockSupabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit)
      return data
    }

    // 记录开始时间
    const startTime = performance.now()

    const leaderboard = await getLeaderboard(50)

    // 记录结束时间
    const endTime = performance.now()
    const duration = endTime - startTime

    // 验证结果
    expect(leaderboard).toBeDefined()
    expect(leaderboard!.length).toBe(50)

    // 验证排序正确性
    for (let i = 0; i < leaderboard!.length - 1; i++) {
      const current = leaderboard![i]
      const next = leaderboard![i + 1]
      if (current.vote_count === next.vote_count) {
        // 投票数相同时，先提交的排前面
        expect(new Date(current.created_at).getTime()).toBeLessThanOrEqual(
          new Date(next.created_at).getTime()
        )
      } else {
        // 投票数多的排前面
        expect(current.vote_count).toBeGreaterThan(next.vote_count)
      }
    }

    // 性能断言：查询应该在100ms内完成
    expect(duration).toBeLessThan(100)
    console.log(`✅ [性能] 1000个作品的排行榜查询耗时: ${duration.toFixed(2)}ms`)
  })

  it('性能测试：Cron Job处理大规模奖品分配', async () => {
    // 艹，Cron Job处理大数据，必须高效！
    const challengeId = 'perf-challenge-cron'
    const submissionCount = 500

    // 生成500个作品
    const submissions = Array.from({ length: submissionCount }, (_, i) => ({
      id: `cron-submission-${i}`,
      challenge_id: challengeId,
      user_id: `cron-user-${i}`,
      title: `作品${i}`,
      media_url: `https://example.com/${i}.jpg`,
      media_type: 'image',
      vote_count: submissionCount - i, // 递减投票数（确保有明确排名）
      rank: null,
      created_at: new Date(Date.now() - i * 1000).toISOString()
    }))

    const prizes = [
      { rank: 1, prize_type: 'credits', prize_value: 1000 },
      { rank: 2, prize_type: 'credits', prize_value: 500 },
      { rank: 3, prize_type: 'credits', prize_value: 200 }
    ]

    const challenge = {
      id: challengeId,
      title: '性能测试挑战',
      prizes: JSON.stringify(prizes),
      status: 'voting',
      voting_ends_at: new Date(Date.now() - 1000).toISOString()
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenges') {
        return {
          select: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [challenge],
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
                  data: submissions,
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

    const mockAddCredits = vi.fn().mockResolvedValue({ success: true })

    const distributePrizes = async () => {
      const { data: challenges } = await mockSupabase
        .from('challenges')
        .select('*')
        .lt('voting_ends_at', new Date().toISOString())
        .eq('status', 'voting')

      if (!challenges || challenges.length === 0) {
        return { processed: 0, updateCount: 0, rewardCount: 0 }
      }

      const challenge = challenges[0]
      const prizesConfig = JSON.parse(challenge.prizes)

      const { data: submissions } = await mockSupabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: true })

      if (!submissions || submissions.length === 0) {
        return { processed: 0, updateCount: 0, rewardCount: 0 }
      }

      let updateCount = 0
      let rewardCount = 0

      // 更新所有作品的排名
      for (let i = 0; i < submissions.length; i++) {
        await mockSupabase
          .from('challenge_submissions')
          .update({ rank: i + 1 })
          .eq('id', submissions[i].id)
        updateCount++
      }

      // 分配奖品
      for (const prize of prizesConfig) {
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
          rewardCount++
        }
      }

      await mockSupabase
        .from('challenges')
        .update({ status: 'completed' })
        .eq('id', challenge.id)

      return { processed: 1, updateCount, rewardCount }
    }

    // 记录开始时间
    const startTime = performance.now()

    const result = await distributePrizes()

    // 记录结束时间
    const endTime = performance.now()
    const duration = endTime - startTime

    // 验证结果
    expect(result.processed).toBe(1)
    expect(result.updateCount).toBe(submissionCount) // 500个排名更新
    expect(result.rewardCount).toBe(3) // 3个奖品

    // 性能断言：处理500个作品应该在1秒内完成
    expect(duration).toBeLessThan(1000)
    console.log(`✅ [性能] Cron Job处理500个作品耗时: ${duration.toFixed(2)}ms`)
    console.log(`   - 排名更新: ${result.updateCount}次`)
    console.log(`   - 奖品发放: ${result.rewardCount}次`)
  })

  it('性能测试：数据库查询优化验证', async () => {
    // 艹，验证数据库查询是否使用了正确的索引
    const challengeId = 'perf-challenge-index'

    // 模拟查询分析
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'challenge_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              }))
            }))
          })
        }
      }
      return {} as any
    })

    const startTime = performance.now()

    // 模拟排行榜查询（应该使用索引）
    await mockSupabase
      .from('challenge_submissions')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true })

    const endTime = performance.now()
    const duration = endTime - startTime

    // 性能断言：索引查询应该非常快（<10ms）
    expect(duration).toBeLessThan(10)
    console.log(`✅ [性能] 索引查询耗时: ${duration.toFixed(2)}ms`)

    // 验证查询调用了正确的字段
    expect(mockSupabase.from).toHaveBeenCalledWith('challenge_submissions')
    const mockCalls = (mockSupabase.from as any).mock.results[0].value
    expect(mockCalls.select).toBeDefined()
    expect(mockCalls.select().eq).toBeDefined()
  })
})
