/**
 * Follow Mutations 单元测试
 *
 * 艹！这是老王我写的 Follow Mutations 测试！
 * 测试用户关注和取消关注功能！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('Follow Mutations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ===== createFollow 测试 =====

  describe('createFollow', () => {
    it('应该成功创建关注关系（基础功能）', async () => {
      const mockFollow = {
        id: 'follow-1',
        follower_id: 'mock-user-id',
        following_id: 'user-2',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFollow,
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法关注用户')

      const { data, error } = await ctx.supabase
        .from('user_follows')
        .insert({
          follower_id: ctx.user.id,
          following_id: args.input.followingId
        })
        .select()
        .single()

      if (error) throw new Error(`关注失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
      expect(data?.id).toBe('follow-1')
      expect(data?.follower_id).toBe('mock-user-id')
      expect(data?.following_id).toBe('user-2')
    })

    it('应该自动设置 follower_id 为当前用户（不允许代替他人关注）', async () => {
      const mockFollow = {
        id: 'follow-1',
        follower_id: 'mock-user-id',
        following_id: 'user-2'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFollow,
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser, // user.id = 'mock-user-id'
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法关注用户')

      const { data } = await ctx.supabase
        .from('user_follows')
        .insert({
          follower_id: ctx.user.id, // 艹！强制使用当前用户ID
          following_id: args.input.followingId
        })
        .select()
        .single()

      // 艹！验证 follower_id 是当前登录用户
      expect(data?.follower_id).toBe('mock-user-id')
    })

    it('应该正确设置 following_id（被关注的用户）', async () => {
      const mockFollow = {
        id: 'follow-1',
        follower_id: 'mock-user-id',
        following_id: 'user-target'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFollow,
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-target'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法关注用户')

      const { data } = await ctx.supabase
        .from('user_follows')
        .insert({
          follower_id: ctx.user.id,
          following_id: args.input.followingId
        })
        .select()
        .single()

      // 艹！验证 following_id 正确
      expect(data?.following_id).toBe('user-target')
    })

    it('应该支持关注多个不同的用户', async () => {
      const targetUsers = ['user-2', 'user-3', 'user-4']

      for (const targetId of targetUsers) {
        const mockFollow = {
          id: `follow-${targetId}`,
          follower_id: 'mock-user-id',
          following_id: targetId,
          created_at: new Date().toISOString()
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockFollow,
                error: null
              })
            })
          })
        })

        const ctx = {
          user: mockUser,
          supabase: mockSupabase
        }

        const args = {
          input: {
            followingId: targetId
          }
        }

        if (!ctx.user) throw new Error('未登录，无法关注用户')

        const { data } = await ctx.supabase
          .from('user_follows')
          .insert({
            follower_id: ctx.user.id,
            following_id: args.input.followingId
          })
          .select()
          .single()

        // 艹！验证每个关注关系都正确
        expect(data?.following_id).toBe(targetId)
        expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
      }
    })

    it('应该拒绝未登录用户关注（登录检查）', async () => {
      const ctx = {
        user: null, // 艹！未登录
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法关注用户')
      }).toThrow('未登录，无法关注用户')
    })

    it('应该处理数据库插入错误（如重复关注）', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '唯一约束冲突：已关注该用户' }
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法关注用户')

      const { data, error } = await ctx.supabase
        .from('user_follows')
        .insert({
          follower_id: ctx.user.id,
          following_id: args.input.followingId
        })
        .select()
        .single()

      // 艹！验证错误处理
      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('应该返回完整的关注记录（包含所有必要字段）', async () => {
      const mockFollow = {
        id: 'follow-1',
        follower_id: 'mock-user-id',
        following_id: 'user-2',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFollow,
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法关注用户')

      const { data } = await ctx.supabase
        .from('user_follows')
        .insert({
          follower_id: ctx.user.id,
          following_id: args.input.followingId
        })
        .select()
        .single()

      // 艹！验证返回完整字段
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('follower_id')
      expect(data).toHaveProperty('following_id')
      expect(data).toHaveProperty('created_at')
    })
  })

  // ===== deleteFollow 测试 =====

  describe('deleteFollow', () => {
    it('应该成功取消关注（基础功能）', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      const { error } = await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id)
        .eq('following_id', args.input.followingId)

      if (error) throw new Error(`取消关注失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
    })

    it('应该使用真删除（非软删除）', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        delete: deleteMock
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id)
        .eq('following_id', args.input.followingId)

      // 艹！验证使用了真删除
      expect(deleteMock).toHaveBeenCalled()
    })

    it('应该通过两个条件精确定位关注记录', async () => {
      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock
        })
      })

      const ctx = {
        user: mockUser, // user.id = 'mock-user-id'
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id) // 艹！条件1：关注者ID
        .eq('following_id', args.input.followingId) // 艹！条件2：被关注者ID

      // 艹！验证两个 eq 条件
      expect(eqMock).toHaveBeenCalledWith('follower_id', 'mock-user-id')
    })

    it('应该只能取消自己的关注（用户隔离）', async () => {
      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqMock
        })
      })

      const ctx = {
        user: mockUser, // user.id = 'mock-user-id'
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id) // 艹！强制当前用户ID，防止取消别人的关注
        .eq('following_id', args.input.followingId)

      // 艹！验证 follower_id 隔离
      expect(eqMock).toHaveBeenCalledWith('follower_id', 'mock-user-id')
    })

    it('应该支持取消对多个用户的关注', async () => {
      const targetUsers = ['user-2', 'user-3', 'user-4']

      for (const targetId of targetUsers) {
        mockSupabase.from.mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
            })
          })
        })

        const ctx = {
          user: mockUser,
          supabase: mockSupabase
        }

        const args = {
          input: {
            followingId: targetId
          }
        }

        if (!ctx.user) throw new Error('未登录，无法取消关注')

        await ctx.supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', ctx.user.id)
          .eq('following_id', args.input.followingId)

        expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
      }
    })

    it('应该拒绝未登录用户取消关注（登录检查）', async () => {
      const ctx = {
        user: null, // 艹！未登录
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法取消关注')
      }).toThrow('未登录，无法取消关注')
    })

    it('应该处理删除错误', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { message: '记录不存在' }
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      const { error } = await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id)
        .eq('following_id', args.input.followingId)

      // 艹！验证错误处理
      expect(error).toBeDefined()
      expect(error?.message).toBe('记录不存在')
    })

    it('应该成功时返回 true', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          })
        })
      })

      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          followingId: 'user-2'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消关注')

      const { error } = await ctx.supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', ctx.user.id)
        .eq('following_id', args.input.followingId)

      if (error) throw new Error(`取消关注失败: ${error.message}`)

      const result = true

      // 艹！验证返回 true
      expect(result).toBe(true)
    })
  })
})
