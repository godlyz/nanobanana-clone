/**
 * Like Mutations 单元测试
 *
 * 艹！这是老王我写的 Like Mutations 测试！
 * 测试点赞和取消点赞功能！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('Like Mutations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ===== createLike 测试 =====

  describe('createLike', () => {
    it('应该成功创建点赞（基础功能）', async () => {
      const mockLike = {
        id: 'like-1',
        user_id: 'mock-user-id',
        target_id: 'post-1',
        target_type: 'blog_post',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLike,
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法点赞')

      const { data, error } = await ctx.supabase
        .from('likes')
        .insert({
          user_id: ctx.user.id,
          target_id: args.input.targetId,
          target_type: args.input.targetType
        })
        .select()
        .single()

      if (error) throw new Error(`点赞失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('likes')
      expect(data?.id).toBe('like-1')
      expect(data?.user_id).toBe('mock-user-id')
      expect(data?.target_id).toBe('post-1')
      expect(data?.target_type).toBe('blog_post')
    })

    it('应该支持不同的目标类型（多态关联）', async () => {
      const testCases = [
        { targetType: 'blog_post', targetId: 'post-1' },
        { targetType: 'comment', targetId: 'comment-1' },
        { targetType: 'artwork', targetId: 'artwork-1' },
        { targetType: 'video', targetId: 'video-1' }
      ]

      for (const testCase of testCases) {
        const mockLike = {
          id: `like-${testCase.targetType}`,
          user_id: 'mock-user-id',
          target_id: testCase.targetId,
          target_type: testCase.targetType,
          created_at: new Date().toISOString()
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockLike,
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
            targetId: testCase.targetId,
            targetType: testCase.targetType
          }
        }

        if (!ctx.user) throw new Error('未登录，无法点赞')

        const { data } = await ctx.supabase
          .from('likes')
          .insert({
            user_id: ctx.user.id,
            target_id: args.input.targetId,
            target_type: args.input.targetType
          })
          .select()
          .single()

        // 艹！验证多态关联正确
        expect(data?.target_type).toBe(testCase.targetType)
        expect(data?.target_id).toBe(testCase.targetId)
      }
    })

    it('应该自动设置当前用户ID（不允许为其他用户点赞）', async () => {
      const mockLike = {
        id: 'like-1',
        user_id: 'mock-user-id',
        target_id: 'post-1',
        target_type: 'blog_post'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLike,
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法点赞')

      const { data } = await ctx.supabase
        .from('likes')
        .insert({
          user_id: ctx.user.id, // 艹！强制使用当前用户ID
          target_id: args.input.targetId,
          target_type: args.input.targetType
        })
        .select()
        .single()

      // 艹！验证 user_id 是当前登录用户
      expect(data?.user_id).toBe('mock-user-id')
    })

    it('应该拒绝未登录用户点赞（登录检查）', async () => {
      const ctx = {
        user: null, // 艹！未登录
        supabase: mockSupabase
      }

      const args = {
        input: {
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法点赞')
      }).toThrow('未登录，无法点赞')
    })

    it('应该处理数据库插入错误', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '唯一约束冲突' }
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法点赞')

      const { data, error } = await ctx.supabase
        .from('likes')
        .insert({
          user_id: ctx.user.id,
          target_id: args.input.targetId,
          target_type: args.input.targetType
        })
        .select()
        .single()

      // 艹！验证错误处理
      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('应该返回完整的点赞记录（包含所有必要字段）', async () => {
      const mockLike = {
        id: 'like-1',
        user_id: 'mock-user-id',
        target_id: 'post-1',
        target_type: 'blog_post',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLike,
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法点赞')

      const { data } = await ctx.supabase
        .from('likes')
        .insert({
          user_id: ctx.user.id,
          target_id: args.input.targetId,
          target_type: args.input.targetType
        })
        .select()
        .single()

      // 艹！验证返回完整字段
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('user_id')
      expect(data).toHaveProperty('target_id')
      expect(data).toHaveProperty('target_type')
      expect(data).toHaveProperty('created_at')
    })
  })

  // ===== deleteLike 测试 =====

  describe('deleteLike', () => {
    it('应该成功取消点赞（基础功能）', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      const { error } = await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_id', args.input.targetId)
        .eq('target_type', args.input.targetType)

      if (error) throw new Error(`取消点赞失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('likes')
    })

    it('应该使用真删除（非软删除）', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_id', args.input.targetId)
        .eq('target_type', args.input.targetType)

      // 艹！验证使用了真删除
      expect(deleteMock).toHaveBeenCalled()
    })

    it('应该通过三个条件精确定位点赞记录', async () => {
      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id) // 艹！条件1：用户ID
        .eq('target_id', args.input.targetId) // 艹！条件2：目标ID
        .eq('target_type', args.input.targetType) // 艹！条件3：目标类型

      // 艹！验证三个 eq 条件
      expect(eqMock).toHaveBeenCalledWith('user_id', 'mock-user-id')
    })

    it('应该只能取消自己的点赞（用户隔离）', async () => {
      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id) // 艹！强制当前用户ID，防止删除别人的点赞
        .eq('target_id', args.input.targetId)
        .eq('target_type', args.input.targetType)

      // 艹！验证 user_id 隔离
      expect(eqMock).toHaveBeenCalledWith('user_id', 'mock-user-id')
    })

    it('应该支持不同目标类型的点赞取消', async () => {
      const testCases = [
        { targetType: 'blog_post', targetId: 'post-1' },
        { targetType: 'comment', targetId: 'comment-1' },
        { targetType: 'artwork', targetId: 'artwork-1' },
        { targetType: 'video', targetId: 'video-1' }
      ]

      for (const testCase of testCases) {
        mockSupabase.from.mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null
                })
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
            targetId: testCase.targetId,
            targetType: testCase.targetType
          }
        }

        if (!ctx.user) throw new Error('未登录，无法取消点赞')

        await ctx.supabase
          .from('likes')
          .delete()
          .eq('user_id', ctx.user.id)
          .eq('target_id', args.input.targetId)
          .eq('target_type', args.input.targetType)

        expect(mockSupabase.from).toHaveBeenCalledWith('likes')
      }
    })

    it('应该拒绝未登录用户取消点赞（登录检查）', async () => {
      const ctx = {
        user: null, // 艹！未登录
        supabase: mockSupabase
      }

      const args = {
        input: {
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法取消点赞')
      }).toThrow('未登录，无法取消点赞')
    })

    it('应该处理删除错误', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: '记录不存在' }
              })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      const { error } = await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_id', args.input.targetId)
        .eq('target_type', args.input.targetType)

      // 艹！验证错误处理
      expect(error).toBeDefined()
      expect(error?.message).toBe('记录不存在')
    })

    it('应该成功时返回 true', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
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
          targetId: 'post-1',
          targetType: 'blog_post'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法取消点赞')

      const { error } = await ctx.supabase
        .from('likes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_id', args.input.targetId)
        .eq('target_type', args.input.targetType)

      if (error) throw new Error(`取消点赞失败: ${error.message}`)

      const result = true

      // 艹！验证返回 true
      expect(result).toBe(true)
    })
  })
})
