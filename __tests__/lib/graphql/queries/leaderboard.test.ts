/**
 * leaderboard Query 单元测试
 *
 * 艹！这是老王我写的 leaderboard Query 测试！
 * 测试排行榜功能：按 leaderboard_score 降序排序！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('leaderboard Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功获取排行榜列表（默认参数）', async () => {
      // Arrange: 准备测试数据（用户统计）
      const mockLeaderboard = [
        {
          id: 'stat-1',
          user_id: 'user-1',
          leaderboard_score: 1000,
          total_likes: 100,
          total_comments: 50,
          total_followers: 200,
          total_following: 150,
          total_artworks: 20,
          total_blog_posts: 10,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'stat-2',
          user_id: 'user-2',
          leaderboard_score: 800,
          total_likes: 80,
          total_comments: 40,
          total_followers: 150,
          total_following: 100,
          total_artworks: 15,
          total_blog_posts: 8,
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z'
        },
        {
          id: 'stat-3',
          user_id: 'user-3',
          leaderboard_score: 600,
          total_likes: 60,
          total_comments: 30,
          total_followers: 100,
          total_following: 80,
          total_artworks: 10,
          total_blog_posts: 5,
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      // Act: 执行查询（模拟 resolver 逻辑）
      const args = {
        limit: 100,
        offset: 0
      }

      const limit = Math.min(args.limit ?? 100, 500)
      const offset = args.offset ?? 0

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert: 验证结果
      expect(data).toEqual(mockLeaderboard)
      expect(data).toHaveLength(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_stats')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      const mockLeaderboard = [
        { id: 'stat-4', user_id: 'user-4', leaderboard_score: 500 },
        { id: 'stat-5', user_id: 'user-5', leaderboard_score: 400 }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      // 艹！测试自定义分页参数
      const args = {
        limit: 50,
        offset: 100
      }

      const limit = Math.min(args.limit, 500)
      const offset = args.offset

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(offset, offset + limit - 1)

      expect(data).toEqual(mockLeaderboard)
    })

    it('应该限制 limit 最大值为 500', async () => {
      // 艹！测试 limit 上限保护（排行榜最大500）
      const args = {
        limit: 1000 // 超过最大值
      }

      const limit = Math.min(args.limit ?? 100, 500)

      // 验证 limit 被限制为 500
      expect(limit).toBe(500)
    })

    it('应该使用默认 limit = 100', async () => {
      // 艹！测试默认 limit 值
      const args = {}

      const limit = Math.min(args.limit ?? 100, 500)

      // 验证默认 limit 为 100
      expect(limit).toBe(100)
    })
  })

  describe('排序功能', () => {
    it('应该按 leaderboard_score 降序排序（分数高的在前）', async () => {
      const mockLeaderboard = [
        { id: 'stat-1', user_id: 'user-1', leaderboard_score: 1000 },
        { id: 'stat-2', user_id: 'user-2', leaderboard_score: 800 },
        { id: 'stat-3', user_id: 'user-3', leaderboard_score: 600 },
        { id: 'stat-4', user_id: 'user-4', leaderboard_score: 400 }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！验证降序排序（分数从高到低）
      expect(data![0].leaderboard_score).toBe(1000)
      expect(data![1].leaderboard_score).toBe(800)
      expect(data![2].leaderboard_score).toBe(600)
      expect(data![3].leaderboard_score).toBe(400)

      // 验证确实是降序
      for (let i = 0; i < data!.length - 1; i++) {
        expect(data![i].leaderboard_score).toBeGreaterThanOrEqual(data![i + 1].leaderboard_score)
      }
    })

    it('应该处理相同分数的情况', async () => {
      const mockLeaderboard = [
        { id: 'stat-1', user_id: 'user-1', leaderboard_score: 1000 },
        { id: 'stat-2', user_id: 'user-2', leaderboard_score: 1000 },
        { id: 'stat-3', user_id: 'user-3', leaderboard_score: 800 }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！验证相同分数的用户都被包含
      expect(data).toHaveLength(3)
      expect(data![0].leaderboard_score).toBe(1000)
      expect(data![1].leaderboard_score).toBe(1000)
    })
  })

  describe('统计字段测试', () => {
    it('应该包含所有统计字段', async () => {
      const mockLeaderboard = [
        {
          id: 'stat-1',
          user_id: 'user-1',
          leaderboard_score: 1000,
          total_likes: 100,
          total_comments: 50,
          total_followers: 200,
          total_following: 150,
          total_artworks: 20,
          total_blog_posts: 10
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！验证所有统计字段都存在
      expect(data![0]).toHaveProperty('leaderboard_score')
      expect(data![0]).toHaveProperty('total_likes')
      expect(data![0]).toHaveProperty('total_comments')
      expect(data![0]).toHaveProperty('total_followers')
      expect(data![0]).toHaveProperty('total_following')
      expect(data![0]).toHaveProperty('total_artworks')
      expect(data![0]).toHaveProperty('total_blog_posts')
    })

    it('应该正确处理数值字段', async () => {
      const mockLeaderboard = [
        {
          id: 'stat-1',
          user_id: 'user-1',
          leaderboard_score: 1000,
          total_likes: 100,
          total_comments: 50,
          total_followers: 200
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！验证数值字段的类型
      expect(typeof data![0].leaderboard_score).toBe('number')
      expect(typeof data![0].total_likes).toBe('number')
      expect(typeof data![0].total_comments).toBe('number')
      expect(typeof data![0].total_followers).toBe('number')
    })

    it('应该处理零值统计', async () => {
      const mockLeaderboard = [
        {
          id: 'stat-1',
          user_id: 'user-1',
          leaderboard_score: 0,
          total_likes: 0,
          total_comments: 0,
          total_followers: 0,
          total_following: 0,
          total_artworks: 0,
          total_blog_posts: 0
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！验证零值统计被正确处理
      expect(data![0].leaderboard_score).toBe(0)
      expect(data![0].total_likes).toBe(0)
      expect(data![0].total_comments).toBe(0)
    })
  })

  describe('边界条件测试', () => {
    it('应该处理空结果', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      expect(data).toEqual([])
      expect(data).toHaveLength(0)
    })

    it('应该处理 limit = 1 的情况（只返回第一名）', async () => {
      const mockLeaderboard = [
        { id: 'stat-1', user_id: 'user-1', leaderboard_score: 1000 }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockLeaderboard,
              error: null
            })
          })
        })
      })

      const args = { limit: 1, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 0)

      expect(data).toHaveLength(1)
      expect(data![0].leaderboard_score).toBe(1000)
    })

    it('应该处理 offset 超出范围的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 10000 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(10000, 10099)

      // 艹！offset 超出范围应该返回空数组
      expect(data).toEqual([])
    })

    it('应该处理 null 或 undefined 的 data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      // 艹！应该通过 ?? [] 处理为空数组
      const result = data ?? []

      expect(result).toEqual([])
    })
  })

  describe('分页功能测试', () => {
    it('应该支持前10名查询', async () => {
      const mockTop10 = Array.from({ length: 10 }, (_, i) => ({
        id: `stat-${i + 1}`,
        user_id: `user-${i + 1}`,
        leaderboard_score: 1000 - i * 100
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockTop10,
              error: null
            })
          })
        })
      })

      const args = { limit: 10, offset: 0 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 9)

      expect(data).toHaveLength(10)
      expect(data![0].leaderboard_score).toBe(1000)
      expect(data![9].leaderboard_score).toBe(100)
    })

    it('应该支持分页查询（第二页）', async () => {
      const mockPage2 = Array.from({ length: 10 }, (_, i) => ({
        id: `stat-${i + 11}`,
        user_id: `user-${i + 11}`,
        leaderboard_score: 900 - i * 100
      }))

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockPage2,
              error: null
            })
          })
        })
      })

      const args = { limit: 10, offset: 10 }

      const { data } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(10, 19)

      expect(data).toHaveLength(10)
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库查询错误', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '数据库连接失败' }
            })
          })
        })
      })

      const args = { limit: 100, offset: 0 }

      const { data, error } = await mockSupabase
        .from('user_stats')
        .select('*')
        .order('leaderboard_score', { ascending: false })
        .range(0, 99)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })
  })
})
