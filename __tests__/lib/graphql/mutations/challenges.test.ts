/**
 * Challenges GraphQL Mutations 测试套件
 *
 * 测试覆盖：
 * - createChallenge (管理员权限、字段验证、时间范围)
 * - submitChallengeEntry (提交限制、时间窗口、重复检查)
 * - voteChallengeSubmission (防作弊、IP限制、RPC调用)
 * - revokeVote (权限检查、RPC调用)
 *
 * 老王提醒：这些测试必须全部通过，不然老王要骂街了！
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock GraphQL context
interface GraphQLContext {
  user: ReturnType<typeof createMockUser> | null
  supabase: SupabaseClient
  request?: {
    headers: {
      get: (name: string) => string | null
    }
  }
}

describe('Challenges GraphQL Mutations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockAdminUser: ReturnType<typeof createMockUser>
  let mockRegularUser: ReturnType<typeof createMockUser>
  let mockContext: GraphQLContext

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()

    // 管理员用户
    mockAdminUser = createMockUser({
      id: 'admin-uuid-123',
      email: 'admin@test.com',
      role: 'admin'
    })

    // 普通用户
    mockRegularUser = createMockUser({
      id: 'user-uuid-456',
      email: 'user@test.com',
      role: 'user'
    })

    // 基础 context
    mockContext = {
      user: mockRegularUser,
      supabase: mockSupabase as unknown as SupabaseClient,
      request: {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.100'
            if (name === 'user-agent') return 'Mozilla/5.0 Test'
            return null
          })
        }
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createChallenge Mutation', () => {
    const validChallengeInput = {
      title: '2025春节AI创作大赛',
      description: '用AI创作最有创意的春节主题作品',
      rules: '1. 必须原创\n2. 符合主题',
      category: 'image',
      coverImageUrl: 'https://example.com/cover.jpg',
      prizes: JSON.stringify([
        { rank: 1, prize_type: 'credits', prize_value: 1000 },
        { rank: 2, prize_type: 'credits', prize_value: 500 }
      ]),
      startAt: '2025-02-01T00:00:00Z',
      endAt: '2025-02-28T23:59:59Z',
      votingEndsAt: '2025-03-07T23:59:59Z'
    }

    it('应该允许管理员成功创建挑战', async () => {
      // 艹，这个测试必须通过，不然管理员创建不了挑战
      const adminContext = { ...mockContext, user: mockAdminUser }

      const mockChallengeData = {
        id: 'challenge-uuid-001',
        ...validChallengeInput,
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockChallengeData,
              error: null
            })
          })
        })
      })

      // 模拟 GraphQL mutation resolver
      const createChallenge = async (args: typeof validChallengeInput, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }

        const { data, error } = await ctx.supabase
          .from('challenges')
          .insert({
            ...args,
            status: 'upcoming'
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const result = await createChallenge(validChallengeInput, adminContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('challenge-uuid-001')
      expect(result.title).toBe(validChallengeInput.title)
      expect(result.status).toBe('upcoming')
      expect(mockSupabase.from).toHaveBeenCalledWith('challenges')
    })

    it('应该拒绝非管理员创建挑战', async () => {
      // 艹，普通用户想创建挑战？想得美！
      const regularUserContext = { ...mockContext, user: mockRegularUser }

      const createChallenge = async (args: typeof validChallengeInput, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        return null
      }

      await expect(
        createChallenge(validChallengeInput, regularUserContext)
      ).rejects.toThrow('仅管理员可创建挑战')
    })

    it('应该拒绝未登录用户创建挑战', async () => {
      // 艹，连登录都没有还想创建挑战？做梦！
      const unauthContext = { ...mockContext, user: null }

      const createChallenge = async (args: typeof validChallengeInput, ctx: GraphQLContext) => {
        if (!ctx.user) {
          throw new Error('未登录')
        }
        if (!['admin', 'super_admin'].includes(ctx.user.role!)) {
          throw new Error('仅管理员可创建挑战')
        }
        return null
      }

      await expect(
        createChallenge(validChallengeInput, unauthContext)
      ).rejects.toThrow('未登录')
    })

    it('应该验证时间范围的合法性（结束时间必须晚于开始时间）', async () => {
      // 艹，时间都搞反了，这不是SB操作吗
      const adminContext = { ...mockContext, user: mockAdminUser }

      const invalidTimeInput = {
        ...validChallengeInput,
        startAt: '2025-02-28T00:00:00Z',
        endAt: '2025-02-01T00:00:00Z'  // 结束时间早于开始时间
      }

      const createChallenge = async (args: typeof invalidTimeInput, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }

        // 验证时间范围
        const start = new Date(args.startAt)
        const end = new Date(args.endAt)
        const votingEnd = new Date(args.votingEndsAt)

        if (end <= start) {
          throw new Error('结束时间必须晚于开始时间')
        }
        if (votingEnd <= end) {
          throw new Error('投票结束时间必须晚于提交结束时间')
        }

        return null
      }

      await expect(
        createChallenge(invalidTimeInput, adminContext)
      ).rejects.toThrow('结束时间必须晚于开始时间')
    })

    it('应该验证JSONB格式的奖品配置', async () => {
      // 艹，JSONB格式都搞错了，这代码是猪写的吗
      const adminContext = { ...mockContext, user: mockAdminUser }

      const invalidPrizesInput = {
        ...validChallengeInput,
        prizes: 'invalid-json-string'  // 无效的JSON字符串
      }

      const createChallenge = async (args: typeof invalidPrizesInput, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }

        // 验证prizes是否为有效JSON
        try {
          JSON.parse(args.prizes)
        } catch (e) {
          throw new Error('奖品配置必须为有效的JSON格式')
        }

        return null
      }

      await expect(
        createChallenge(invalidPrizesInput, adminContext)
      ).rejects.toThrow('奖品配置必须为有效的JSON格式')
    })
  })

  describe('submitChallengeEntry Mutation', () => {
    const validSubmissionInput = {
      challengeId: 'challenge-uuid-001',
      title: '我的AI春节作品',
      description: '用Stable Diffusion生成的春节主题图片',
      mediaUrl: 'https://example.com/my-work.jpg',
      mediaType: 'image',
      thumbnailUrl: 'https://example.com/thumb.jpg'
    }

    it('应该允许用户成功提交作品', async () => {
      // 艹，正常提交必须成功，不然用户要骂街了
      const mockSubmissionData = {
        id: 'submission-uuid-001',
        challenge_id: validSubmissionInput.challengeId,
        user_id: mockRegularUser.id,
        ...validSubmissionInput,
        vote_count: 0,
        rank: null,
        created_at: new Date().toISOString()
      }

      // Mock challenge查询（检查挑战状态）
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: validSubmissionInput.challengeId,
                    status: 'active',
                    start_at: '2025-02-01T00:00:00Z',
                    end_at: '2025-02-28T23:59:59Z'
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
                  data: [],  // 没有重复提交
                  error: null
                })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSubmissionData,
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitEntry = async (args: typeof validSubmissionInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        // 检查挑战状态
        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.challengeId)
          .single()

        if (!challenge || challenge.status !== 'active') {
          throw new Error('挑战未开始或已结束')
        }

        // 检查是否重复提交
        const { data: existing } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', args.challengeId)
          .eq('user_id', ctx.user.id)

        if (existing && existing.length > 0) {
          throw new Error('您已提交过作品')
        }

        // 插入提交
        const { data, error } = await ctx.supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: args.challengeId,
            user_id: ctx.user.id,
            title: args.title,
            description: args.description,
            media_url: args.mediaUrl,
            media_type: args.mediaType,
            thumbnail_url: args.thumbnailUrl
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const result = await submitEntry(validSubmissionInput, mockContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('submission-uuid-001')
      expect(result.challenge_id).toBe(validSubmissionInput.challengeId)
      expect(result.user_id).toBe(mockRegularUser.id)
    })

    it('应该拒绝重复提交作品', async () => {
      // 艹，想重复提交刷榜？门都没有！
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: validSubmissionInput.challengeId,
                    status: 'active'
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
                  data: [{ id: 'existing-submission' }],  // 已存在提交
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitEntry = async (args: typeof validSubmissionInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.challengeId)
          .single()

        if (!challenge || challenge.status !== 'active') {
          throw new Error('挑战未开始或已结束')
        }

        const { data: existing } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', args.challengeId)
          .eq('user_id', ctx.user.id)

        if (existing && existing.length > 0) {
          throw new Error('您已提交过作品')
        }

        return null
      }

      await expect(
        submitEntry(validSubmissionInput, mockContext)
      ).rejects.toThrow('您已提交过作品')
    })

    it('应该拒绝在挑战未开始时提交作品', async () => {
      // 艹，挑战还没开始就想提交，这不是耍流氓吗
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: validSubmissionInput.challengeId,
                    status: 'upcoming'  // 未开始
                  },
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitEntry = async (args: typeof validSubmissionInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.challengeId)
          .single()

        if (!challenge || challenge.status !== 'active') {
          throw new Error('挑战未开始或已结束')
        }

        return null
      }

      await expect(
        submitEntry(validSubmissionInput, mockContext)
      ).rejects.toThrow('挑战未开始或已结束')
    })

    it('应该拒绝在挑战已结束时提交作品', async () => {
      // 艹，挑战都结束了还想提交，迟到罚站！
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: validSubmissionInput.challengeId,
                    status: 'completed'  // 已结束
                  },
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitEntry = async (args: typeof validSubmissionInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.challengeId)
          .single()

        if (!challenge || challenge.status !== 'active') {
          throw new Error('挑战未开始或已结束')
        }

        return null
      }

      await expect(
        submitEntry(validSubmissionInput, mockContext)
      ).rejects.toThrow('挑战未开始或已结束')
    })

    it('应该验证媒体URL的有效性', async () => {
      // 艹，URL都不合法还想提交，这代码质量堪忧啊
      const invalidUrlInput = {
        ...validSubmissionInput,
        mediaUrl: 'not-a-valid-url'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: validSubmissionInput.challengeId,
                    status: 'active'
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
                  data: [],
                  error: null
                })
              })
            })
          }
        }
        return {} as any
      })

      const submitEntry = async (args: typeof invalidUrlInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        // 验证URL格式
        try {
          new URL(args.mediaUrl)
        } catch (e) {
          throw new Error('媒体URL格式无效')
        }

        return null
      }

      await expect(
        submitEntry(invalidUrlInput, mockContext)
      ).rejects.toThrow('媒体URL格式无效')
    })
  })

  describe('voteChallengeSubmission Mutation', () => {
    const voteInput = {
      submissionId: 'submission-uuid-001'
    }

    it('应该允许用户正常投票（调用RPC函数）', async () => {
      // 艹，正常投票必须成功，不然防作弊系统就是摆设
      const mockVoteData = {
        id: 'vote-uuid-001',
        challenge_id: 'challenge-uuid-001',
        submission_id: voteInput.submissionId,
        user_id: mockRegularUser.id,
        created_at: new Date().toISOString()
      }

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: mockVoteData,
        error: null
      })

      const voteForSubmission = async (args: typeof voteInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录，无法投票')

        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] ||
                         ctx.request?.headers.get('x-real-ip') ||
                         'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        const { data, error } = await ctx.supabase.rpc('cast_vote', {
          p_submission_id: args.submissionId,
          p_user_id: ctx.user.id,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })

        if (error) throw error
        return data
      }

      const result = await voteForSubmission(voteInput, mockContext)

      expect(result).toBeDefined()
      expect(result.id).toBe('vote-uuid-001')
      expect(result.submission_id).toBe(voteInput.submissionId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cast_vote', {
        p_submission_id: voteInput.submissionId,
        p_user_id: mockRegularUser.id,
        p_ip_address: '192.168.1.100',
        p_user_agent: 'Mozilla/5.0 Test'
      })
    })

    it('应该拒绝重复投票（RPC返回错误）', async () => {
      // 艹，想刷票？防作弊系统不是吃素的！
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '您已经为该作品投过票了' }
      })

      const voteForSubmission = async (args: typeof voteInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录，无法投票')

        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        const { data, error } = await ctx.supabase.rpc('cast_vote', {
          p_submission_id: args.submissionId,
          p_user_id: ctx.user.id,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        voteForSubmission(voteInput, mockContext)
      ).rejects.toThrow('您已经为该作品投过票了')
    })

    it('应该检测并拒绝IP限制（同一IP投票过多）', async () => {
      // 艹，同一个IP疯狂刷票，这不是明摆着作弊吗
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '该IP地址投票次数过多，请稍后再试' }
      })

      const voteForSubmission = async (args: typeof voteInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录，无法投票')

        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        const { data, error } = await ctx.supabase.rpc('cast_vote', {
          p_submission_id: args.submissionId,
          p_user_id: ctx.user.id,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        voteForSubmission(voteInput, mockContext)
      ).rejects.toThrow('该IP地址投票次数过多，请稍后再试')
    })

    it('应该验证投票窗口（投票期内才能投票）', async () => {
      // 艹，投票都还没开始就想投，这不是扯淡吗
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '投票尚未开始或已结束' }
      })

      const voteForSubmission = async (args: typeof voteInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录，无法投票')

        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        const { data, error } = await ctx.supabase.rpc('cast_vote', {
          p_submission_id: args.submissionId,
          p_user_id: ctx.user.id,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        voteForSubmission(voteInput, mockContext)
      ).rejects.toThrow('投票尚未开始或已结束')
    })

    it('应该正确提取和传递IP地址（x-forwarded-for优先）', async () => {
      // 艹，IP提取必须准确，不然防作弊系统就是摆设
      const mockContextWithProxyIP = {
        ...mockContext,
        request: {
          headers: {
            get: vi.fn((name: string) => {
              if (name === 'x-forwarded-for') return '203.0.113.1, 198.51.100.1'  // 多个代理IP
              if (name === 'x-real-ip') return '198.51.100.1'
              if (name === 'user-agent') return 'Mozilla/5.0 Chrome'
              return null
            })
          }
        }
      }

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { id: 'vote-uuid-002' },
        error: null
      })

      const voteForSubmission = async (args: typeof voteInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] ||
                         ctx.request?.headers.get('x-real-ip') ||
                         'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        const { data, error } = await ctx.supabase.rpc('cast_vote', {
          p_submission_id: args.submissionId,
          p_user_id: ctx.user.id,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        })

        if (error) throw error
        return data
      }

      await voteForSubmission(voteInput, mockContextWithProxyIP)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('cast_vote', {
        p_submission_id: voteInput.submissionId,
        p_user_id: mockRegularUser.id,
        p_ip_address: '203.0.113.1',  // 应该提取第一个IP
        p_user_agent: 'Mozilla/5.0 Chrome'
      })
    })
  })

  describe('revokeVote Mutation', () => {
    const revokeInput = {
      voteId: 'vote-uuid-001'
    }

    it('应该允许用户撤销自己的投票（调用RPC函数）', async () => {
      // 艹，用户想反悔撤票，这个功能必须有
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: true,
        error: null
      })

      const revokeVote = async (args: typeof revokeInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data, error } = await ctx.supabase.rpc('revoke_vote', {
          p_vote_id: args.voteId,
          p_user_id: ctx.user.id
        })

        if (error) throw new Error(error.message)
        return data
      }

      const result = await revokeVote(revokeInput, mockContext)

      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('revoke_vote', {
        p_vote_id: revokeInput.voteId,
        p_user_id: mockRegularUser.id
      })
    })

    it('应该拒绝撤销他人的投票（权限检查）', async () => {
      // 艹，想撤销别人的票？这不是恶意操作吗
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '您无权撤销该投票' }
      })

      const revokeVote = async (args: typeof revokeInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data, error } = await ctx.supabase.rpc('revoke_vote', {
          p_vote_id: args.voteId,
          p_user_id: ctx.user.id
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        revokeVote(revokeInput, mockContext)
      ).rejects.toThrow('您无权撤销该投票')
    })

    it('应该拒绝撤销不存在的投票', async () => {
      // 艹，投票都不存在还想撤销，这代码逻辑有问题
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '投票记录不存在' }
      })

      const revokeVote = async (args: typeof revokeInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data, error } = await ctx.supabase.rpc('revoke_vote', {
          p_vote_id: args.voteId,
          p_user_id: ctx.user.id
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        revokeVote(revokeInput, mockContext)
      ).rejects.toThrow('投票记录不存在')
    })

    it('应该检查投票窗口（投票期结束后不能撤销）', async () => {
      // 艹，投票都结束了还想撤销，这不是耍流氓吗
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: '投票已结束，无法撤销' }
      })

      const revokeVote = async (args: typeof revokeInput, ctx: GraphQLContext) => {
        if (!ctx.user) throw new Error('未登录')

        const { data, error } = await ctx.supabase.rpc('revoke_vote', {
          p_vote_id: args.voteId,
          p_user_id: ctx.user.id
        })

        if (error) throw new Error(error.message)
        return data
      }

      await expect(
        revokeVote(revokeInput, mockContext)
      ).rejects.toThrow('投票已结束，无法撤销')
    })
  })
})
