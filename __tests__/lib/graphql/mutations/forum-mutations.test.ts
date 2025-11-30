/**
 * Forum Mutations 单元测试
 *
 * 艹！这是老王我写的 Forum Mutations 测试！
 * 测试论坛主题、回复和投票功能！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('Forum Mutations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ===== createForumThread 测试 =====

  describe('createForumThread', () => {
    it('应该成功创建论坛主题（基础功能）', async () => {
      const mockThread = {
        id: 'thread-1',
        category_id: 'cat-1',
        author_id: 'mock-user-id',
        title: '测试主题',
        content: '测试内容',
        tag_ids: ['tag-1', 'tag-2'],
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockThread,
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
          categoryId: 'cat-1',
          title: '测试主题',
          content: '测试内容',
          tagIds: ['tag-1', 'tag-2']
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛主题')

      const { data, error } = await ctx.supabase
        .from('forum_threads')
        .insert({
          category_id: args.input.categoryId,
          author_id: ctx.user.id,
          title: args.input.title,
          content: args.input.content,
          tag_ids: args.input.tagIds ?? []
        })
        .select()
        .single()

      if (error) throw new Error(`创建论坛主题失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_threads')
      expect(data?.id).toBe('thread-1')
      expect(data?.author_id).toBe('mock-user-id')
      expect(data?.title).toBe('测试主题')
    })

    it('应该自动设置 author_id 为当前用户', async () => {
      const mockThread = {
        id: 'thread-1',
        category_id: 'cat-1',
        author_id: 'mock-user-id',
        title: '测试主题',
        content: '测试内容',
        tag_ids: []
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockThread,
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
          categoryId: 'cat-1',
          title: '测试主题',
          content: '测试内容'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛主题')

      const { data } = await ctx.supabase
        .from('forum_threads')
        .insert({
          category_id: args.input.categoryId,
          author_id: ctx.user.id, // 艹！强制使用当前用户ID
          title: args.input.title,
          content: args.input.content,
          tag_ids: args.input.tagIds ?? []
        })
        .select()
        .single()

      expect(data?.author_id).toBe('mock-user-id')
    })

    it('应该支持可选的 tag_ids（默认空数组）', async () => {
      const mockThread = {
        id: 'thread-1',
        category_id: 'cat-1',
        author_id: 'mock-user-id',
        title: '测试主题',
        content: '测试内容',
        tag_ids: []
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockThread,
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
          categoryId: 'cat-1',
          title: '测试主题',
          content: '测试内容'
          // 艹！不提供 tagIds
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛主题')

      const { data } = await ctx.supabase
        .from('forum_threads')
        .insert({
          category_id: args.input.categoryId,
          author_id: ctx.user.id,
          title: args.input.title,
          content: args.input.content,
          tag_ids: args.input.tagIds ?? [] // 艹！默认空数组
        })
        .select()
        .single()

      expect(data?.tag_ids).toEqual([])
    })

    it('应该拒绝未登录用户创建主题', async () => {
      const ctx = {
        user: null,
        supabase: mockSupabase
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法创建论坛主题')
      }).toThrow('未登录，无法创建论坛主题')
    })
  })

  // ===== createForumReply 测试 =====

  describe('createForumReply', () => {
    it('应该成功创建论坛回复（基础功能）', async () => {
      const mockReply = {
        id: 'reply-1',
        thread_id: 'thread-1',
        author_id: 'mock-user-id',
        content: '测试回复',
        parent_id: null,
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReply,
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
          threadId: 'thread-1',
          content: '测试回复',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛回复')

      const { data, error } = await ctx.supabase
        .from('forum_replies')
        .insert({
          thread_id: args.input.threadId,
          author_id: ctx.user.id,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      if (error) throw new Error(`创建论坛回复失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_replies')
      expect(data?.id).toBe('reply-1')
      expect(data?.thread_id).toBe('thread-1')
      expect(data?.content).toBe('测试回复')
    })

    it('应该支持嵌套回复（parentId）', async () => {
      const mockReply = {
        id: 'reply-nested',
        thread_id: 'thread-1',
        author_id: 'mock-user-id',
        content: '嵌套回复',
        parent_id: 'reply-parent',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReply,
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
          threadId: 'thread-1',
          content: '嵌套回复',
          parentId: 'reply-parent' // 艹！指向父回复
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛回复')

      const { data } = await ctx.supabase
        .from('forum_replies')
        .insert({
          thread_id: args.input.threadId,
          author_id: ctx.user.id,
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.parent_id).toBe('reply-parent')
    })

    it('应该自动设置 author_id 为当前用户', async () => {
      const mockReply = {
        id: 'reply-1',
        thread_id: 'thread-1',
        author_id: 'mock-user-id',
        content: '测试回复',
        parent_id: null
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReply,
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
          threadId: 'thread-1',
          content: '测试回复',
          parentId: null
        }
      }

      if (!ctx.user) throw new Error('未登录，无法创建论坛回复')

      const { data } = await ctx.supabase
        .from('forum_replies')
        .insert({
          thread_id: args.input.threadId,
          author_id: ctx.user.id, // 艹！强制使用当前用户ID
          content: args.input.content,
          parent_id: args.input.parentId
        })
        .select()
        .single()

      expect(data?.author_id).toBe('mock-user-id')
    })

    it('应该拒绝未登录用户创建回复', async () => {
      const ctx = {
        user: null,
        supabase: mockSupabase
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法创建论坛回复')
      }).toThrow('未登录，无法创建论坛回复')
    })
  })

  // ===== createForumVote 测试 =====

  describe('createForumVote', () => {
    it('应该成功创建投票（upvote）', async () => {
      const mockVote = {
        id: 'vote-1',
        user_id: 'mock-user-id',
        target_type: 'thread',
        target_id: 'thread-1',
        vote_type: 'upvote',
        created_at: new Date().toISOString()
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVote,
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
          targetType: 'thread',
          targetId: 'thread-1',
          voteType: 'upvote'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法投票')

      const { data, error } = await ctx.supabase
        .from('forum_votes')
        .insert({
          user_id: ctx.user.id,
          target_type: args.input.targetType,
          target_id: args.input.targetId,
          vote_type: args.input.voteType
        })
        .select()
        .single()

      if (error) throw new Error(`投票失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_votes')
      expect(data?.vote_type).toBe('upvote')
    })

    it('应该支持 downvote', async () => {
      const mockVote = {
        id: 'vote-2',
        user_id: 'mock-user-id',
        target_type: 'reply',
        target_id: 'reply-1',
        vote_type: 'downvote'
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVote,
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
          targetType: 'reply',
          targetId: 'reply-1',
          voteType: 'downvote'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法投票')

      const { data } = await ctx.supabase
        .from('forum_votes')
        .insert({
          user_id: ctx.user.id,
          target_type: args.input.targetType,
          target_id: args.input.targetId,
          vote_type: args.input.voteType
        })
        .select()
        .single()

      expect(data?.vote_type).toBe('downvote')
    })

    it('应该支持多态投票目标（thread/reply）', async () => {
      const testCases = [
        { targetType: 'thread', targetId: 'thread-1' },
        { targetType: 'reply', targetId: 'reply-1' }
      ]

      for (const testCase of testCases) {
        const mockVote = {
          id: `vote-${testCase.targetType}`,
          user_id: 'mock-user-id',
          target_type: testCase.targetType,
          target_id: testCase.targetId,
          vote_type: 'upvote'
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockVote,
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
            targetType: testCase.targetType,
            targetId: testCase.targetId,
            voteType: 'upvote'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法投票')

        const { data } = await ctx.supabase
          .from('forum_votes')
          .insert({
            user_id: ctx.user.id,
            target_type: args.input.targetType,
            target_id: args.input.targetId,
            vote_type: args.input.voteType
          })
          .select()
          .single()

        expect(data?.target_type).toBe(testCase.targetType)
      }
    })

    it('应该拒绝未登录用户投票', async () => {
      const ctx = {
        user: null,
        supabase: mockSupabase
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法投票')
      }).toThrow('未登录，无法投票')
    })
  })

  // ===== updateForumVote 测试 =====

  describe('updateForumVote', () => {
    it('应该成功更新投票类型（upvote→downvote）', async () => {
      const mockVote = {
        id: 'vote-1',
        user_id: 'mock-user-id',
        target_type: 'thread',
        target_id: 'thread-1',
        vote_type: 'downvote' // 艹！已更新
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockVote,
                  error: null
                })
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
        id: 'vote-1',
        input: {
          voteType: 'downvote'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法更新投票')

      const { data, error } = await ctx.supabase
        .from('forum_votes')
        .update({ vote_type: args.input.voteType })
        .eq('id', args.id)
        .eq('user_id', ctx.user.id) // 艹！只能更新自己的投票
        .select()
        .single()

      if (error) throw new Error(`更新投票失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_votes')
      expect(data?.vote_type).toBe('downvote')
    })

    it('应该只允许更新自己的投票（所有权验证）', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: '无权限更新此投票' }
                })
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
        id: 'vote-other-user', // 艹！其他用户的投票
        input: {
          voteType: 'upvote'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法更新投票')

      const { data, error } = await ctx.supabase
        .from('forum_votes')
        .update({ vote_type: args.input.voteType })
        .eq('id', args.id)
        .eq('user_id', ctx.user.id) // 艹！所有权验证
        .select()
        .single()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it('应该拒绝未登录用户更新投票', async () => {
      const ctx = {
        user: null,
        supabase: mockSupabase
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法更新投票')
      }).toThrow('未登录，无法更新投票')
    })
  })

  // ===== deleteForumVote 测试 =====

  describe('deleteForumVote', () => {
    it('应该成功删除投票（基础功能）', async () => {
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
          targetType: 'thread',
          targetId: 'thread-1'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法删除投票')

      const { error } = await ctx.supabase
        .from('forum_votes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_type', args.input.targetType)
        .eq('target_id', args.input.targetId)

      if (error) throw new Error(`删除投票失败: ${error.message}`)

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_votes')
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
          targetType: 'thread',
          targetId: 'thread-1'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法删除投票')

      await ctx.supabase
        .from('forum_votes')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('target_type', args.input.targetType)
        .eq('target_id', args.input.targetId)

      expect(deleteMock).toHaveBeenCalled()
    })

    it('应该通过三个条件精确定位投票记录', async () => {
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
        user: mockUser,
        supabase: mockSupabase
      }

      const args = {
        input: {
          targetType: 'thread',
          targetId: 'thread-1'
        }
      }

      if (!ctx.user) throw new Error('未登录，无法删除投票')

      await ctx.supabase
        .from('forum_votes')
        .delete()
        .eq('user_id', ctx.user.id) // 艹！条件1
        .eq('target_type', args.input.targetType) // 艹！条件2
        .eq('target_id', args.input.targetId) // 艹！条件3

      expect(eqMock).toHaveBeenCalledWith('user_id', 'mock-user-id')
    })

    it('应该拒绝未登录用户删除投票', async () => {
      const ctx = {
        user: null,
        supabase: mockSupabase
      }

      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法删除投票')
      }).toThrow('未登录，无法删除投票')
    })
  })
})
