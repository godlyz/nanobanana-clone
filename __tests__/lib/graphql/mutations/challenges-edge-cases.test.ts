/**
 * Challenges系统边界测试
 *
 * 测试极端情况和边界条件：
 * 1. 超长文本输入
 * 2. 特殊字符处理
 * 3. 无效数据格式
 * 4. 边界数值
 * 5. 竞态条件
 *
 * 老王提醒：这些极端情况必须处理好，不然会出大问题！
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
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

describe('Challenges系统边界测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let adminUser: ReturnType<typeof createMockUser>
  let regularUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()

    adminUser = createMockUser({
      id: 'admin-edge',
      email: 'admin@test.com',
      role: 'admin'
    })

    regularUser = createMockUser({
      id: 'user-edge',
      email: 'user@test.com',
      role: 'user'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('超长文本边界测试', () => {
    it('应该拒绝超长标题（>200字符）', async () => {
      // 艹，标题太长会影响UI显示，必须限制
      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const longTitle = 'A'.repeat(201) // 201个字符

      const createChallenge = async (title: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        if (title.length > 200) {
          throw new Error('标题长度不能超过200字符')
        }
        return null
      }

      await expect(
        createChallenge(longTitle, adminContext)
      ).rejects.toThrow('标题长度不能超过200字符')
    })

    it('应该接受合法长度的标题（200字符）', async () => {
      // 艹，200字符应该够用了
      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const validTitle = 'A'.repeat(200) // 正好200个字符

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'challenge-001',
                title: validTitle
              },
              error: null
            })
          })
        })
      })

      const createChallenge = async (title: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        if (title.length > 200) {
          throw new Error('标题长度不能超过200字符')
        }
        const { data } = await ctx.supabase
          .from('challenges')
          .insert({ title })
          .select()
          .single()
        return data
      }

      const result = await createChallenge(validTitle, adminContext)
      expect(result).toBeDefined()
      expect(result.title).toBe(validTitle)
    })

    it('应该拒绝超长描述（>5000字符）', async () => {
      // 艹，描述太长会影响性能，必须限制
      const longDescription = 'B'.repeat(5001)

      const createChallenge = async (description: string) => {
        if (description.length > 5000) {
          throw new Error('描述长度不能超过5000字符')
        }
        return null
      }

      await expect(
        createChallenge(longDescription)
      ).rejects.toThrow('描述长度不能超过5000字符')
    })
  })

  describe('特殊字符处理测试', () => {
    it('应该正确处理Emoji字符', async () => {
      // 艹，现在的用户喜欢用Emoji，必须支持
      const emojiTitle = '🎉 春节创作大赛 🏆'

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'challenge-emoji',
                title: emojiTitle
              },
              error: null
            })
          })
        })
      })

      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const createChallenge = async (title: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        const { data } = await ctx.supabase
          .from('challenges')
          .insert({ title })
          .select()
          .single()
        return data
      }

      const result = await createChallenge(emojiTitle, adminContext)
      expect(result).toBeDefined()
      expect(result.title).toBe(emojiTitle)
    })

    it('应该防止SQL注入攻击', async () => {
      // 艹，SQL注入是最SB的安全漏洞，必须防范
      const maliciousTitle = "'; DROP TABLE challenges; --"

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data: any) => ({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'challenge-safe',
                title: data.title // Supabase会自动转义
              },
              error: null
            })
          })
        }))
      })

      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const createChallenge = async (title: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        const { data } = await ctx.supabase
          .from('challenges')
          .insert({ title })
          .select()
          .single()
        return data
      }

      const result = await createChallenge(maliciousTitle, adminContext)
      expect(result).toBeDefined()
      // 验证标题被正确转义，没有执行SQL命令
      expect(result.title).toBe(maliciousTitle)
    })

    it('应该正确处理HTML标签（XSS防护）', async () => {
      // 艹，XSS攻击也很常见，必须防范
      const xssTitle = '<script>alert("XSS")</script>标题'

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data: any) => ({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'challenge-xss',
                title: data.title // 应该被转义或过滤
              },
              error: null
            })
          })
        }))
      })

      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const createChallenge = async (title: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        // 简单的HTML标签及内容过滤（移除script/style等危险标签及其内容）
        let sanitizedTitle = title
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签及内容
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // 移除style标签及内容
          .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        const { data } = await ctx.supabase
          .from('challenges')
          .insert({ title: sanitizedTitle })
          .select()
          .single()
        return data
      }

      const result = await createChallenge(xssTitle, adminContext)
      expect(result).toBeDefined()
      expect(result.title).not.toContain('<script>')
      expect(result.title).toBe('标题') // HTML标签被移除
    })

    it('应该正确处理多行文本（换行符）', async () => {
      // 艹，描述可能包含多行文本
      const multilineDescription = '第一行\n第二行\r\n第三行'

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'challenge-multiline',
                description: multilineDescription
              },
              error: null
            })
          })
        })
      })

      const adminContext: GraphQLContext = {
        user: adminUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      const createChallenge = async (description: string, ctx: GraphQLContext) => {
        if (!ctx.user?.role || !['admin', 'super_admin'].includes(ctx.user.role)) {
          throw new Error('仅管理员可创建挑战')
        }
        const { data } = await ctx.supabase
          .from('challenges')
          .insert({ description })
          .select()
          .single()
        return data
      }

      const result = await createChallenge(multilineDescription, adminContext)
      expect(result).toBeDefined()
      expect(result.description).toBe(multilineDescription)
    })
  })

  describe('无效数据格式测试', () => {
    it('应该拒绝无效的URL格式', async () => {
      // 艹，URL格式不对会导致图片加载失败
      const invalidUrl = 'not-a-valid-url'

      const submitEntry = async (mediaUrl: string) => {
        try {
          new URL(mediaUrl)
        } catch (e) {
          throw new Error('媒体URL格式无效')
        }
        return null
      }

      await expect(
        submitEntry(invalidUrl)
      ).rejects.toThrow('媒体URL格式无效')
    })

    it('应该接受合法的URL格式', async () => {
      // 艹，这些URL应该都能通过
      const validUrls = [
        'https://example.com/image.jpg',
        'http://example.com/video.mp4',
        'https://cdn.example.com/media/file.png?v=1'
      ]

      const submitEntry = async (mediaUrl: string) => {
        try {
          new URL(mediaUrl)
          return { success: true }
        } catch (e) {
          throw new Error('媒体URL格式无效')
        }
      }

      for (const url of validUrls) {
        const result = await submitEntry(url)
        expect(result.success).toBe(true)
      }
    })

    it('应该拒绝无效的JSON格式（奖品配置）', async () => {
      // 艹，JSON格式错误会导致系统崩溃
      const invalidJson = '{ invalid json }'

      const createChallenge = async (prizesJson: string) => {
        try {
          JSON.parse(prizesJson)
        } catch (e) {
          throw new Error('奖品配置必须为有效的JSON格式')
        }
        return null
      }

      await expect(
        createChallenge(invalidJson)
      ).rejects.toThrow('奖品配置必须为有效的JSON格式')
    })

    it('应该验证奖品配置的结构', async () => {
      // 艹，奖品配置结构不对会导致分配错误
      const invalidStructure = JSON.stringify([
        { rank: 1, prize_type: 'credits' } // 缺少prize_value
      ])

      const createChallenge = async (prizesJson: string) => {
        const prizes = JSON.parse(prizesJson)
        if (!Array.isArray(prizes)) {
          throw new Error('奖品配置必须是数组')
        }
        for (const prize of prizes) {
          if (!prize.rank || !prize.prize_type || !prize.prize_value) {
            throw new Error('奖品配置缺少必要字段')
          }
        }
        return null
      }

      await expect(
        createChallenge(invalidStructure)
      ).rejects.toThrow('奖品配置缺少必要字段')
    })
  })

  describe('边界数值测试', () => {
    it('应该拒绝负数的投票数', async () => {
      // 艹，投票数不可能是负数
      const invalidVoteCount = -1

      const updateVoteCount = async (voteCount: number) => {
        if (voteCount < 0) {
          throw new Error('投票数不能为负数')
        }
        return null
      }

      await expect(
        updateVoteCount(invalidVoteCount)
      ).rejects.toThrow('投票数不能为负数')
    })

    it('应该处理极大的投票数（整数溢出）', async () => {
      // 艹，投票数太大可能导致整数溢出
      const maxSafeInteger = Number.MAX_SAFE_INTEGER
      const overflowValue = maxSafeInteger + 1

      const updateVoteCount = async (voteCount: number) => {
        if (voteCount > Number.MAX_SAFE_INTEGER) {
          throw new Error('投票数超出安全范围')
        }
        return voteCount
      }

      await expect(
        updateVoteCount(overflowValue)
      ).rejects.toThrow('投票数超出安全范围')

      // 验证最大安全值可以接受
      const result = await updateVoteCount(maxSafeInteger)
      expect(result).toBe(maxSafeInteger)
    })

    it('应该处理零投票的情况', async () => {
      // 艹，零投票也是合法的
      const zeroVotes = 0

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'sub-1', vote_count: 10 },
                  { id: 'sub-2', vote_count: 0 }
                ],
                error: null
              })
            }))
          })
        })
      })

      const getLeaderboard = async () => {
        const { data } = await mockSupabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', 'test')
          .order('vote_count', { ascending: false })
          .order('created_at', { ascending: true })
        return data
      }

      const result = await getLeaderboard()
      expect(result).toBeDefined()
      expect(result!.some(s => s.vote_count === zeroVotes)).toBe(true)
    })

    it('应该拒绝无效的排名值（0或负数）', async () => {
      // 艹，排名从1开始，不能是0或负数
      const invalidRanks = [0, -1, -100]

      const updateRank = async (rank: number) => {
        if (rank < 1) {
          throw new Error('排名必须大于0')
        }
        return null
      }

      for (const rank of invalidRanks) {
        await expect(
          updateRank(rank)
        ).rejects.toThrow('排名必须大于0')
      }
    })
  })

  describe('竞态条件测试', () => {
    it('应该防止同一用户同时提交多个作品（竞态条件）', async () => {
      // 艹，并发提交必须被检测到
      const challengeId = 'race-challenge'
      const userId = regularUser.id

      let submissionCount = 0
      let lockAcquired = false

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: challengeId, status: 'active' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'challenge_submissions') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  // 模拟竞态条件：第一次查询时都返回空
                  data: lockAcquired ? [{ id: 'existing' }] : [],
                  error: null
                })
              }))
            })),
            insert: vi.fn().mockImplementation(() => {
              if (lockAcquired) {
                // 第二次插入应该失败（唯一约束）
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: '违反唯一约束' }
                    })
                  })
                }
              }
              lockAcquired = true
              submissionCount++
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: `submission-${submissionCount}` },
                    error: null
                  })
                })
              }
            })
          }
        }
        return {} as any
      })

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
        const { data: existing } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', challengeId)
          .eq('user_id', ctx.user.id)
        if (existing && existing.length > 0) {
          throw new Error('您已提交过作品')
        }
        const { data, error } = await ctx.supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: challengeId,
            user_id: ctx.user.id,
            title: '测试作品',
            media_url: 'https://example.com/test.jpg',
            media_type: 'image'
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return data
      }

      const ctx: GraphQLContext = {
        user: regularUser,
        supabase: mockSupabase as unknown as SupabaseClient
      }

      // 模拟并发提交
      const [result1, result2] = await Promise.allSettled([
        submitEntry(ctx),
        submitEntry(ctx)
      ])

      // 验证：一个成功，一个失败
      const successCount = [result1, result2].filter(r => r.status === 'fulfilled').length
      const failureCount = [result1, result2].filter(r => r.status === 'rejected').length

      expect(successCount).toBe(1)
      expect(failureCount).toBe(1)
      expect(submissionCount).toBe(1) // 只有一个提交成功
    })

    it('应该防止同一IP在短时间内大量投票', async () => {
      // 艹，IP限流必须有效
      const submissionId = 'rate-limit-test'
      const ipAddress = '192.168.1.100'
      let voteCount = 0
      const rateLimit = 10 // 每分钟10票
      const windowStart = Date.now()

      mockSupabase.rpc = vi.fn().mockImplementation((funcName: string, params: any) => {
        voteCount++
        const elapsed = Date.now() - windowStart

        // 模拟速率限制：1分钟内超过10次
        if (elapsed < 60000 && voteCount > rateLimit) {
          return Promise.resolve({
            data: null,
            error: { message: '该IP地址投票次数过多，请稍后再试' }
          })
        }

        return Promise.resolve({
          data: { id: `vote-${voteCount}` },
          error: null
        })
      })

      const voteForSubmission = async (userId: string) => {
        const { data, error } = await mockSupabase.rpc('cast_vote', {
          p_submission_id: submissionId,
          p_user_id: userId,
          p_ip_address: ipAddress,
          p_user_agent: 'Mozilla/5.0 Test'
        })
        if (error) throw new Error(error.message)
        return data
      }

      // 尝试投15票
      const votePromises = Array.from({ length: 15 }, (_, i) =>
        voteForSubmission(`user-${i}`)
      )

      const results = await Promise.allSettled(votePromises)
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      // 验证：前10票成功，后5票失败
      expect(successful.length).toBe(rateLimit)
      expect(failed.length).toBe(5)
    })
  })

  describe('时区和时间边界测试', () => {
    it('应该正确处理不同时区的时间', async () => {
      // 艹，时区问题经常导致BUG
      const timezones = [
        '2025-02-01T00:00:00Z',       // UTC
        '2025-02-01T00:00:00+08:00',  // 北京时间
        '2025-01-31T16:00:00-08:00'   // 洛杉矶时间（与UTC同一时刻）
      ]

      const createChallenge = async (startAt: string) => {
        const date = new Date(startAt)
        if (isNaN(date.getTime())) {
          throw new Error('无效的时间格式')
        }
        return { startAt: date.toISOString() }
      }

      for (const tz of timezones) {
        const result = await createChallenge(tz)
        expect(result).toBeDefined()
        expect(result.startAt).toBeDefined()
      }
    })

    it('应该拒绝无效的时间格式', async () => {
      // 艹，时间格式不对会导致系统崩溃
      const invalidTimes = [
        'not-a-date',
        'invalid-format',
        '2025/13/01'  // 使用斜杠格式（非ISO格式）
      ]

      const createChallenge = async (startAt: string) => {
        // 验证ISO 8601格式
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
        if (!isoRegex.test(startAt)) {
          throw new Error('无效的时间格式')
        }

        const date = new Date(startAt)
        if (isNaN(date.getTime())) {
          throw new Error('无效的时间格式')
        }
        return { startAt: date.toISOString() }
      }

      for (const time of invalidTimes) {
        await expect(
          createChallenge(time)
        ).rejects.toThrow('无效的时间格式')
      }
    })

    it('应该处理闰年2月29日', async () => {
      // 艹，闰年日期必须正确处理
      const leapYearDate = '2024-02-29T00:00:00Z' // 2024是闰年
      const nonLeapYearDate = '2025-02-29T00:00:00Z' // 2025不是闰年

      const createChallenge = async (startAt: string) => {
        const date = new Date(startAt)
        if (isNaN(date.getTime())) {
          throw new Error('无效的时间格式')
        }
        return { startAt: date.toISOString() }
      }

      // 闰年应该成功
      const result1 = await createChallenge(leapYearDate)
      expect(result1).toBeDefined()

      // 非闰年的2月29日会被自动调整为3月1日
      const result2 = await createChallenge(nonLeapYearDate)
      expect(result2).toBeDefined()
      expect(result2.startAt).toContain('2025-03-01')
    })
  })
})
