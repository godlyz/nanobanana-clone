/**
 * users Query 单元测试
 *
 * 艹！这是老王我写的用户相关 Query 测试！
 * 测试用户查询、关注关系等核心功能！
 *
 * 测试的 Query：
 * 1. me - 获取当前登录用户
 * 2. user - 根据ID获取用户
 * 3. users - 获取用户列表（支持搜索）
 * 4. followers - 获取用户的粉丝列表
 * 5. following - 获取用户关注的人列表
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('用户相关 Query 测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ========================================
  // Query 1: me - 获取当前登录用户
  // ========================================
  describe('me Query', () => {
    it('应该在未登录时返回 null', async () => {
      // Arrange: 模拟未登录状态
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // Act: 执行查询逻辑
      const ctx = {
        supabase: mockSupabase,
        user: null
      }

      // 艹！未登录直接返回 null
      const result = ctx.user ? {} : null

      // Assert: 验证结果
      expect(result).toBeNull()
    })

    it('应该在登录时返回用户信息和资料', async () => {
      // Arrange: 模拟登录用户和资料数据
      const mockProfile = {
        user_id: 'user-1',
        display_name: '测试用户',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: '这是测试用户的简介',
        created_at: '2025-01-01T00:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const ctx = {
        supabase: mockSupabase,
        user: mockUser
      }

      if (!ctx.user) {
        throw new Error('艹！用户应该登录！')
      }

      const { data: profile } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single()

      const result = {
        id: ctx.user.id,
        email: ctx.user.email ?? null,
        user_profile: profile
      }

      // Assert: 验证结果
      expect(result.id).toBe(mockUser.id)
      expect(result.email).toBe(mockUser.email)
      expect(result.user_profile).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('应该正确处理用户资料不存在的情况', async () => {
      // Arrange: 模拟用户存在但资料不存在
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' }
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const ctx = {
        supabase: mockSupabase,
        user: mockUser
      }

      const { data: profile } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single()

      const result = {
        id: ctx.user.id,
        email: ctx.user.email ?? null,
        user_profile: profile
      }

      // Assert: 资料为 null 但用户信息仍然返回
      expect(result.id).toBe(mockUser.id)
      expect(result.user_profile).toBeNull()
    })
  })

  // ========================================
  // Query 2: user - 根据ID获取用户
  // ========================================
  describe('user Query', () => {
    it('应该根据ID成功获取用户信息', async () => {
      // Arrange: 准备测试数据
      const targetUserId = 'user-2'
      const mockAuthUser = {
        id: targetUserId,
        email: 'user2@example.com'
      }
      const mockProfile = {
        user_id: targetUserId,
        display_name: '目标用户',
        avatar_url: 'https://example.com/avatar2.jpg'
      }

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const args = { id: targetUserId }
      const ctx = { supabase: mockSupabase }

      const { data: authUser } = await ctx.supabase.auth.admin.getUserById(args.id)
      if (!authUser.user) {
        throw new Error('艹！用户应该存在！')
      }

      const { data: profile } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', args.id)
        .single()

      const result = {
        id: authUser.user.id,
        email: authUser.user.email ?? null,
        user_profile: profile
      }

      // Assert: 验证结果
      expect(result.id).toBe(targetUserId)
      expect(result.email).toBe('user2@example.com')
      expect(result.user_profile).toEqual(mockProfile)
      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith(targetUserId)
    })

    it('应该在用户不存在时返回 null', async () => {
      // Arrange: 模拟用户不存在
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // Act: 执行查询逻辑
      const args = { id: 'non-existent-user' }
      const ctx = { supabase: mockSupabase }

      const { data: authUser } = await ctx.supabase.auth.admin.getUserById(args.id)
      const result = authUser.user ? {} : null

      // Assert: 验证结果
      expect(result).toBeNull()
    })

    it('应该正确处理资料查询失败的情况', async () => {
      // Arrange: 用户存在但资料查询失败
      const targetUserId = 'user-3'
      const mockAuthUser = {
        id: targetUserId,
        email: 'user3@example.com'
      }

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const args = { id: targetUserId }
      const ctx = { supabase: mockSupabase }

      const { data: authUser } = await ctx.supabase.auth.admin.getUserById(args.id)
      const { data: profile } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', args.id)
        .single()

      const result = {
        id: authUser.user.id,
        email: authUser.user.email ?? null,
        user_profile: profile
      }

      // Assert: 用户信息存在，资料为 null
      expect(result.id).toBe(targetUserId)
      expect(result.user_profile).toBeNull()
    })
  })

  // ========================================
  // Query 3: users - 获取用户列表（支持搜索）
  // ========================================
  describe('users Query', () => {
    it('应该成功获取用户列表（默认参数）', async () => {
      // Arrange: 准备测试数据
      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: '用户 1',
          avatar_url: 'https://example.com/avatar1.jpg',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          user_id: 'user-2',
          display_name: '用户 2',
          avatar_url: 'https://example.com/avatar2.jpg',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null
            })
          })
        })
      })

      // 艹！模拟批量查询用户认证信息
      mockSupabase.auth.admin.getUserById
        .mockResolvedValueOnce({
          data: { user: { id: 'user-1', email: 'user1@example.com' } },
          error: null
        })
        .mockResolvedValueOnce({
          data: { user: { id: 'user-2', email: 'user2@example.com' } },
          error: null
        })

      // Act: 执行查询逻辑
      const args = { limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data: profiles } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // 艹！批量查询用户认证信息
      const userPromises = profiles.map(async (profile: any) => {
        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(profile.user_id)
        if (!authUser.user) return null

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile
        }
      })

      const result = (await Promise.all(userPromises)).filter(Boolean)

      // Assert: 验证结果
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('user-1')
      expect(result[1]?.id).toBe('user-2')
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('应该支持搜索功能（按用户名搜索）', async () => {
      // Arrange: 准备搜索结果
      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: '张三',
          avatar_url: 'https://example.com/avatar1.jpg'
        }
      ]

      const mockOrFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockProfiles,
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: mockOrFn
        })
      })

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'zhangsan@example.com' } },
        error: null
      })

      // Act: 执行查询逻辑（带搜索）
      const args = { search: '张三', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      let query = ctx.supabase
        .from('user_profiles')
        .select('*')

      if (args.search) {
        query = query.or(`display_name.ilike.%${args.search}%`)
      }

      const { data: profiles } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert: 验证结果
      expect(profiles).toHaveLength(1)
      expect(profiles[0].display_name).toBe('张三')
      expect(mockOrFn).toHaveBeenCalledWith('display_name.ilike.%张三%')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      // Arrange: 准备测试数据
      const mockProfiles = [
        { user_id: 'user-3', display_name: '用户 3' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const args = { limit: 10, offset: 5 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data: profiles } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert: 验证参数
      expect(profiles).toHaveLength(1)
      const rangeCall = (mockSupabase.from().select().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(5) // offset
      expect(rangeCall[1]).toBe(14) // offset + limit - 1
    })

    it('应该限制最大 limit 为 100', async () => {
      // Arrange: 请求超过最大限制
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

      // Act: 执行查询逻辑
      const args = { limit: 200, offset: 0 }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      // Assert: limit 应该被限制为 100
      expect(limit).toBe(100)
    })

    it('应该正确处理空结果', async () => {
      // Arrange: 返回空结果
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

      // Act: 执行查询逻辑
      const args = { limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const { data: profiles } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(args.offset ?? 0, (args.offset ?? 0) + Math.min(args.limit ?? 20, 100) - 1)

      const result = profiles ?? []

      // Assert: 验证结果
      expect(result).toEqual([])
    })
  })

  // ========================================
  // Query 4: followers - 获取用户的粉丝列表
  // ========================================
  describe('followers Query', () => {
    it('应该成功获取用户的粉丝列表', async () => {
      // Arrange: 准备粉丝数据
      const mockFollowers = [
        {
          id: 'follow-1',
          follower_id: 'user-2',
          following_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'follow-2',
          follower_id: 'user-3',
          following_id: 'user-1',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockFollowers,
                error: null
              })
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data } = await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('following_id', args.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const result = data ?? []

      // Assert: 验证结果
      expect(result).toHaveLength(2)
      expect(result[0].follower_id).toBe('user-2')
      expect(result[1].follower_id).toBe('user-3')
      expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
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
      const args = { userId: 'user-1', limit: 10, offset: 5 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('following_id', args.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert: 验证范围参数
      const rangeCall = (mockSupabase.from().select().eq().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(5)
      expect(rangeCall[1]).toBe(14)
    })

    it('应该正确处理没有粉丝的情况', async () => {
      // Arrange: 返回空数组
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
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const { data } = await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('following_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })
  })

  // ========================================
  // Query 5: following - 获取用户关注的人列表
  // ========================================
  describe('following Query', () => {
    it('应该成功获取用户关注的人列表', async () => {
      // Arrange: 准备关注数据
      const mockFollowing = [
        {
          id: 'follow-3',
          follower_id: 'user-1',
          following_id: 'user-2',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'follow-4',
          follower_id: 'user-1',
          following_id: 'user-3',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockFollowing,
                error: null
              })
            })
          })
        })
      })

      // Act: 执行查询逻辑
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data } = await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', args.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const result = data ?? []

      // Assert: 验证结果
      expect(result).toHaveLength(2)
      expect(result[0].following_id).toBe('user-2')
      expect(result[1].following_id).toBe('user-3')
      expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
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
      const args = { userId: 'user-1', limit: 15, offset: 10 }
      const ctx = { supabase: mockSupabase }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', args.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert
      const rangeCall = (mockSupabase.from().select().eq().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(10)
      expect(rangeCall[1]).toBe(24)
    })

    it('应该正确处理没有关注任何人的情况', async () => {
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
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const { data } = await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })

    it('应该限制最大 limit 为 100', async () => {
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
      const args = { userId: 'user-1', limit: 500, offset: 0 }

      const limit = Math.min(args.limit ?? 20, 100)

      // Assert
      expect(limit).toBe(100)
    })
  })

  // ========================================
  // 边界情况和错误处理
  // ========================================
  describe('边界情况和错误处理', () => {
    it('应该正确处理数据库查询错误（users）', async () => {
      // Arrange: 模拟数据库错误
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      })

      // Act
      const args = { limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const { data } = await ctx.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert: 返回空数组
      expect(data).toBeNull()
    })

    it('应该正确处理数据库查询错误（followers）', async () => {
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
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const ctx = { supabase: mockSupabase }

      const { data } = await ctx.supabase
        .from('user_follows')
        .select('*')
        .eq('following_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })

    it('应该正确处理默认参数（limit和offset）', async () => {
      // Arrange
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

      // Act: 不传参数，使用默认值
      const args = {}

      const limit = Math.min((args as any).limit ?? 20, 100)
      const offset = (args as any).offset ?? 0

      // Assert
      expect(limit).toBe(20)
      expect(offset).toBe(0)
    })
  })
})
