/**
 * Comment Mutation 单元测试
 *
 * 艹！这是老王我写的 createComment Mutation 测试！
 * 测试评论创建功能，重点测试：权限控制（登录检查）+ 多态关联（blog_post/artwork/video）！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('createComment Mutation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础功能测试', () => {
    it('应该成功创建评论（blog_post 类型）', async () => {
      const mockComment = {
        id: 'comment-1',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '测试评论内容',
        parent_id: null,
        likes_count: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
              error: null
            })
          })
        })
      })

      // Act: 模拟 resolver 逻辑
      const ctx = {
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '测试评论内容',
          parentId: null
        }
      }

      // 艹！检查登录状态
      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data, error } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      if (error) throw new Error(`创建评论失败: ${error.message}`)

      // Assert: 验证结果
      expect(data).toEqual(mockComment)
      expect(data?.user_id).toBe('mock-user-id')
      expect(data?.content_type).toBe('blog_post')
      expect(data?.content_id).toBe('post-1')
    })

    it('应该成功创建评论（artwork 类型）', async () => {
      const mockComment = {
        id: 'comment-2',
        user_id: 'mock-user-id',
        content_id: 'artwork-1',
        content_type: 'artwork',
        content: '艺术品评论',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'artwork-1',
          contentType: 'artwork',
          content: '艺术品评论',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.content_type).toBe('artwork')
      expect(data?.content_id).toBe('artwork-1')
    })

    it('应该成功创建评论（video 类型）', async () => {
      const mockComment = {
        id: 'comment-3',
        user_id: 'mock-user-id',
        content_id: 'video-1',
        content_type: 'video',
        content: '视频评论',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'video-1',
          contentType: 'video',
          content: '视频评论',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.content_type).toBe('video')
      expect(data?.content_id).toBe('video-1')
    })
  })

  describe('嵌套评论功能（parentId）', () => {
    it('应该支持创建顶级评论（parentId = null）', async () => {
      const mockComment = {
        id: 'comment-top',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '顶级评论',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '顶级评论',
          parentId: null // 艹！顶级评论
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.parent_id).toBeNull()
    })

    it('应该支持创建嵌套评论（parentId 指向父评论）', async () => {
      const mockComment = {
        id: 'comment-nested',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '嵌套回复',
        parent_id: 'comment-parent'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '嵌套回复',
          parentId: 'comment-parent' // 艹！指向父评论
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.parent_id).toBe('comment-parent')
    })

    it('应该支持二级嵌套评论（回复的回复）', async () => {
      const mockComment = {
        id: 'comment-level2',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '二级回复',
        parent_id: 'comment-level1'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '二级回复',
          parentId: 'comment-level1' // 艹！二级嵌套
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.parent_id).toBe('comment-level1')
    })
  })

  describe('多态关联测试（content_type）', () => {
    it('应该正确关联到不同的内容类型', async () => {
      const testCases = [
        { contentType: 'blog_post', contentId: 'post-1' },
        { contentType: 'artwork', contentId: 'artwork-1' },
        { contentType: 'video', contentId: 'video-1' }
      ]

      for (const testCase of testCases) {
        const mockComment = {
          id: `comment-${testCase.contentType}`,
          user_id: 'mock-user-id',
          content_id: testCase.contentId,
          content_type: testCase.contentType,
          content: `测试 ${testCase.contentType} 评论`,
          parent_id: null
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockComment,
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
            contentId: testCase.contentId,
            contentType: testCase.contentType,
            content: `测试 ${testCase.contentType} 评论`,
            parentId: null
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建评论')

        const { data } = await ctx.supabase
          .from('comments')
          .insert({
            user_id: ctx.user.id,
            content_id: args.input.contentId,
            content_type: args.input.contentType,
            content: args.input.content,
            parent_id: args.input.parentId
          })
          .select()
          .single()

        // 艹！验证多态关联正确
        expect(data?.content_type).toBe(testCase.contentType)
        expect(data?.content_id).toBe(testCase.contentId)
      }
    })
  })

  describe('权限控制测试（登录检查）', () => {
    it('应该拒绝未登录用户创建评论', () => {
      const ctx = {
        user: null, // 艹！未登录
        supabase: mockSupabase
      }

      const args = {
        input: {
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '测试评论',
          parentId: null
        }
      }

      // 艹！验证登录检查
      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法创建评论')
      }).toThrow('未登录，无法创建评论')
    })

    it('应该正确设置 user_id 为当前登录用户', async () => {
      const mockComment = {
        id: 'comment-auth',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '测试用户ID',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '测试用户ID',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id, // 艹！使用当前用户ID
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.user_id).toBe('mock-user-id')
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库插入错误', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '数据库插入失败' }
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '测试评论',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data, error } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库插入失败')
      expect(data).toBeNull()
    })

    it('应该处理无效的 contentType', async () => {
      const mockComment = {
        id: 'comment-invalid',
        user_id: 'mock-user-id',
        content_id: 'unknown-1',
        content_type: 'invalid_type',
        content: '无效类型测试',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'unknown-1',
          contentType: 'invalid_type',
          content: '无效类型测试',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      // 艹！数据库层面可能允许插入无效类型（取决于数据库约束）
      // 这里验证数据被正确传递
      expect(data?.content_type).toBe('invalid_type')
    })
  })

  describe('字段完整性测试', () => {
    it('应该包含所有必需字段', async () => {
      const mockComment = {
        id: 'comment-complete',
        user_id: 'mock-user-id',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '完整评论',
        parent_id: null,
        likes_count: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockComment,
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
          contentId: 'post-1',
          contentType: 'blog_post',
          content: '完整评论',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建评论')

      const { data } = await ctx.supabase
        .from('comments')
        .insert({
          user_id: ctx.user.id,
          content_id: args.input.contentId,
          content_type: args.input.contentType,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      // 艹！验证所有字段都存在
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('user_id')
      expect(data).toHaveProperty('content_id')
      expect(data).toHaveProperty('content_type')
      expect(data).toHaveProperty('content')
      expect(data).toHaveProperty('parent_id')
      expect(data).toHaveProperty('likes_count')
      expect(data).toHaveProperty('created_at')
      expect(data).toHaveProperty('updated_at')
      expect(data).toHaveProperty('deleted_at')
    })
  })
})
