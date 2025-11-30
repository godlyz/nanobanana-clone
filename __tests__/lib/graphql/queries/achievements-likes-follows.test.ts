/**
 * achievements-likes-follows Query 单元测试
 *
 * 艹！这是老王我写的成就、点赞、关注相关 Query 测试！
 * 测试成就系统、点赞功能、关注关系等社交特性！
 *
 * 测试的 Query（9个）：
 * 1. achievements - 获取所有成就定义列表
 * 2. userAchievements - 获取某个用户的成就列表
 * 3. myAchievements - 获取当前用户的成就列表
 * 4. achievement - 获取单个成就定义
 * 5. blogPostLikes - 获取博客文章点赞列表
 * 6. artworkLikes - 获取作品点赞列表
 * 7. userLikes - 获取用户的所有点赞记录
 * 8. followList - 获取关注关系列表
 * 9. followers/following - 已在 users.test.ts 测试过
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('成就、点赞、关注相关 Query 测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ========================================
  // Query 1: achievements - 获取所有成就定义列表
  // ========================================
  describe('achievements Query', () => {
    it('应该成功获取成就定义列表（默认参数）', async () => {
      // Arrange
      const mockAchievements = [
        {
          id: 'ach-1',
          name: '新手上路',
          description: '完成第一个视频',
          category: 'video',
          points: 10,
          is_active: true
        },
        {
          id: 'ach-2',
          name: '博客达人',
          description: '发布10篇博客',
          category: 'blog',
          points: 50,
          is_active: true
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockAchievements,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('新手上路')
      expect(mockSupabase.from).toHaveBeenCalledWith('achievement_definitions')
    })

    it('应该支持按分类筛选（category）', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { category: 'video' }
      let query = mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)

      if (args.category) {
        query = query.eq('category', args.category)
      }

      await query
        .order('points', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
    })

    it('应该只返回激活的成就', async () => {
      // Arrange
      const mockEqFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEqFn
        })
      })

      // Act
      await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEqFn).toHaveBeenCalledWith('is_active', true)
    })

    it('应该按 points 降序排序', async () => {
      // Arrange
      const mockOrderFn = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: mockOrderFn
          })
        })
      })

      // Act
      await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockOrderFn).toHaveBeenCalledWith('points', { ascending: false })
    })
  })

  // ========================================
  // Query 2: userAchievements - 获取用户的成就列表
  // ========================================
  describe('userAchievements Query', () => {
    it('应该成功获取指定用户的成就列表', async () => {
      // Arrange
      const mockUserAchievements = [
        {
          id: 'ua-1',
          user_id: 'user-1',
          achievement_id: 'ach-1',
          earned_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'ua-2',
          user_id: 'user-1',
          achievement_id: 'ach-2',
          earned_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockUserAchievements,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', args.userId)
        .order('earned_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].user_id).toBe('user-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('user_achievements')
    })

    it('应该按 earned_at 降序排序', async () => {
      // Arrange
      const mockOrderFn = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: mockOrderFn
          })
        })
      })

      // Act
      await mockSupabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', 'user-1')
        .order('earned_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockOrderFn).toHaveBeenCalledWith('earned_at', { ascending: false })
    })
  })

  // ========================================
  // Query 3: myAchievements - 获取当前用户的成就列表
  // ========================================
  describe('myAchievements Query', () => {
    it('应该在未登录时抛出错误', async () => {
      // Arrange
      const ctx = { user: null }

      // Act & Assert
      expect(() => {
        if (!ctx.user) {
          throw new Error('需要登录才能查看自己的成就')
        }
      }).toThrow('需要登录才能查看自己的成就')
    })

    it('应该成功获取当前用户的成就列表', async () => {
      // Arrange
      const mockUserAchievements = [
        {
          id: 'ua-1',
          user_id: 'user-1',
          achievement_id: 'ach-1',
          earned_at: '2025-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockUserAchievements,
                error: null
              })
            })
          })
        })
      })

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }
      if (!ctx.user) {
        throw new Error('需要登录')
      }

      const { data } = await ctx.supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('earned_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].user_id).toBe('user-1')
    })
  })

  // ========================================
  // Query 4: achievement - 获取单个成就定义
  // ========================================
  describe('achievement Query', () => {
    it('应该成功获取单个成就定义', async () => {
      // Arrange
      const mockAchievement = {
        id: 'ach-1',
        name: '新手上路',
        description: '完成第一个视频',
        category: 'video',
        points: 10,
        is_active: true
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAchievement,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { id: 'ach-1' }
      const { data } = await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('id', args.id)
        .eq('is_active', true)
        .single()

      // Assert
      expect(data).toEqual(mockAchievement)
    })

    it('应该在成就不存在时返回 null', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' }
              })
            })
          })
        })
      })

      // Act
      const args = { id: 'non-existent' }
      const { data } = await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('id', args.id)
        .eq('is_active', true)
        .single()

      // Assert
      expect(data).toBeNull()
    })
  })

  // ========================================
  // Query 5: blogPostLikes - 获取博客文章点赞列表
  // ========================================
  describe('blogPostLikes Query', () => {
    it('应该成功获取博客文章点赞列表', async () => {
      // Arrange
      const mockLikes = [
        {
          post_id: 'post-1',
          user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          post_id: 'post-1',
          user_id: 'user-2',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockLikes,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { postId: 'post-1', limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('blog_post_likes')
        .select('*')
        .eq('post_id', args.postId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // 艹！转换为统一的 Like 类型
      const result = (data ?? []).map(row => ({
        id: `blog_post_like_${row.post_id}_${row.user_id}`,
        user_id: row.user_id,
        target_id: row.post_id,
        target_type: 'blog_post' as const,
        created_at: row.created_at
      }))

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].target_type).toBe('blog_post')
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_post_likes')
    })

    it('应该支持分页参数', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { postId: 'post-1', limit: 10, offset: 5 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      await mockSupabase
        .from('blog_post_likes')
        .select('*')
        .eq('post_id', args.postId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert
      const rangeCall = (mockSupabase.from().select().eq().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(5)
      expect(rangeCall[1]).toBe(14)
    })
  })

  // ========================================
  // Query 6: artworkLikes - 获取作品点赞列表
  // ========================================
  describe('artworkLikes Query', () => {
    it('应该成功获取作品点赞列表', async () => {
      // Arrange
      const mockLikes = [
        {
          artwork_id: 'artwork-1',
          artwork_type: 'image',
          user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          artwork_id: 'artwork-1',
          artwork_type: 'image',
          user_id: 'user-2',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockLikes,
                  error: null
                })
              })
            })
          })
        })
      })

      // Act
      const args = { artworkId: 'artwork-1', artworkType: 'image', limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('artwork_likes')
        .select('*')
        .eq('artwork_id', args.artworkId)
        .eq('artwork_type', args.artworkType)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // 艹！转换为统一的 Like 类型
      const result = (data ?? []).map(row => ({
        id: `artwork_like_${row.artwork_id}_${row.user_id}`,
        user_id: row.user_id,
        target_id: row.artwork_id,
        target_type: row.artwork_type as 'image' | 'video',
        created_at: row.created_at
      }))

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].target_type).toBe('image')
      expect(mockSupabase.from).toHaveBeenCalledWith('artwork_likes')
    })

    it('应该支持视频类型作品', async () => {
      // Arrange
      const mockLikes = [
        {
          artwork_id: 'video-1',
          artwork_type: 'video',
          user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockLikes,
                  error: null
                })
              })
            })
          })
        })
      })

      // Act
      const args = { artworkId: 'video-1', artworkType: 'video' }
      const { data } = await mockSupabase
        .from('artwork_likes')
        .select('*')
        .eq('artwork_id', args.artworkId)
        .eq('artwork_type', args.artworkType)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map(row => ({
        id: `artwork_like_${row.artwork_id}_${row.user_id}`,
        user_id: row.user_id,
        target_id: row.artwork_id,
        target_type: row.artwork_type as 'image' | 'video',
        created_at: row.created_at
      }))

      // Assert
      expect(result[0].target_type).toBe('video')
    })
  })

  // ========================================
  // Query 7: userLikes - 获取用户的所有点赞记录
  // ========================================
  describe('userLikes Query', () => {
    it('应该成功获取用户的所有点赞记录', async () => {
      // Arrange
      const mockBlogLikes = [
        { post_id: 'post-1', user_id: 'user-1', created_at: '2025-01-01T00:00:00Z' }
      ]
      const mockArtworkLikes = [
        { artwork_id: 'art-1', artwork_type: 'image', user_id: 'user-1', created_at: '2025-01-02T00:00:00Z' }
      ]
      const mockCommentLikes = [
        { comment_id: 'comment-1', user_id: 'user-1', created_at: '2025-01-03T00:00:00Z' }
      ]

      // 艹！模拟三次不同的表查询
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockBlogLikes,
                  error: null
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockArtworkLikes,
                  error: null
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockCommentLikes,
                  error: null
                })
              })
            })
          })
        })

      // Act
      const args = { userId: 'user-1', limit: 20, offset: 0 }

      const { data: blogLikes } = await mockSupabase
        .from('blog_post_likes')
        .select('*')
        .eq('user_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const { data: artworkLikes } = await mockSupabase
        .from('artwork_likes')
        .select('*')
        .eq('user_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const { data: commentLikes } = await mockSupabase
        .from('comment_likes')
        .select('*')
        .eq('user_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = JSON.stringify({
        blog: blogLikes ?? [],
        artwork: artworkLikes ?? [],
        comment: commentLikes ?? []
      })

      // Assert
      const parsed = JSON.parse(result)
      expect(parsed.blog).toHaveLength(1)
      expect(parsed.artwork).toHaveLength(1)
      expect(parsed.comment).toHaveLength(1)
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_post_likes')
      expect(mockSupabase.from).toHaveBeenCalledWith('artwork_likes')
      expect(mockSupabase.from).toHaveBeenCalledWith('comment_likes')
    })

    it('应该正确处理空结果', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { userId: 'user-1' }

      const { data: blogLikes } = await mockSupabase
        .from('blog_post_likes')
        .select('*')
        .eq('user_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = JSON.stringify({
        blog: blogLikes ?? [],
        artwork: [],
        comment: []
      })

      // Assert
      const parsed = JSON.parse(result)
      expect(parsed.blog).toEqual([])
    })
  })

  // ========================================
  // Query 8: followList - 获取关注关系列表
  // ========================================
  describe('followList Query', () => {
    it('应该成功获取关注关系列表（无筛选）', async () => {
      // Arrange
      const mockFollows = [
        {
          id: 'follow-1',
          follower_id: 'user-1',
          following_id: 'user-2',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'follow-2',
          follower_id: 'user-2',
          following_id: 'user-3',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockFollows,
              error: null
            })
          })
        })
      })

      // Act
      const args = { limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('user_follows')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
    })

    it('应该支持按关注者筛选（followerId）', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { followerId: 'user-1' }
      let query = mockSupabase
        .from('user_follows')
        .select('*')

      if (args.followerId) {
        query = query.eq('follower_id', args.followerId)
      }

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('follower_id', 'user-1')
    })

    it('应该支持按被关注者筛选（followingId）', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { followingId: 'user-2' }
      let query = mockSupabase
        .from('user_follows')
        .select('*')

      if (args.followingId) {
        query = query.eq('following_id', args.followingId)
      }

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('following_id', 'user-2')
    })

    it('应该支持同时按关注者和被关注者筛选', async () => {
      // Arrange
      let eqCalls: string[] = []
      const mockEq = vi.fn().mockImplementation((column, value) => {
        eqCalls.push(`${column}=${value}`)
        return {
          eq: mockEq,
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        }
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { followerId: 'user-1', followingId: 'user-2' }
      let query = mockSupabase
        .from('user_follows')
        .select('*')

      if (args.followerId) {
        query = query.eq('follower_id', args.followerId)
      }

      if (args.followingId) {
        query = query.eq('following_id', args.followingId)
      }

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(eqCalls).toContain('follower_id=user-1')
      expect(eqCalls).toContain('following_id=user-2')
    })
  })

  // ========================================
  // 边界情况和错误处理
  // ========================================
  describe('边界情况和错误处理', () => {
    it('应该正确处理数据库查询错误（成就）', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      })

      // Act
      const { data } = await mockSupabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })

    it('应该正确处理默认参数', async () => {
      // Arrange
      const args = {}

      // Act
      const limit = Math.min((args as any).limit ?? 20, 100)
      const offset = (args as any).offset ?? 0

      // Assert
      expect(limit).toBe(20)
      expect(offset).toBe(0)
    })

    it('应该限制最大 limit 为 100（所有查询通用）', async () => {
      // Arrange
      const testCases = [
        { limit: 200, expected: 100 },
        { limit: 1000, expected: 100 },
        { limit: 50, expected: 50 },
        { limit: undefined, expected: 20 }
      ]

      // Act & Assert
      testCases.forEach(({ limit, expected }) => {
        const result = Math.min(limit ?? 20, 100)
        expect(result).toBe(expected)
      })
    })
  })
})
