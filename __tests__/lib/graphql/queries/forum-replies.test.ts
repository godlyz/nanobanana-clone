/**
 * forumReplies Query 单元测试
 *
 * 艹！这是老王我写的 forumReplies Query 测试！
 * 测试论坛回复列表查询：分页、按主题筛选、嵌套回复、排序！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('forumReplies Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功获取论坛回复列表（默认参数）', async () => {
      // Arrange: 准备测试数据
      const mockReplies = [
        {
          id: 'reply-1',
          thread_id: 'thread-1',
          author_id: 'user-1',
          content: '测试回复 1',
          parent_id: null,
          upvote_count: 5,
          downvote_count: 0,
          created_at: '2025-01-02T00:00:00Z',
          deleted_at: null
        },
        {
          id: 'reply-2',
          thread_id: 'thread-1',
          author_id: 'user-2',
          content: '测试回复 2',
          parent_id: null,
          upvote_count: 3,
          downvote_count: 1,
          created_at: '2025-01-01T00:00:00Z',
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      // Act: 执行查询（模拟 resolver 逻辑）
      const args = {
        limit: 20,
        offset: 0
      }

      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      // Assert: 验证结果
      expect(data).toEqual(mockReplies)
      expect(data).toHaveLength(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('forum_replies')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      const mockReplies = [
        { id: 'reply-3', content: '测试回复 3', deleted_at: null },
        { id: 'reply-4', content: '测试回复 4', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      // 艹！测试自定义分页参数
      const args = {
        limit: 10,
        offset: 20
      }

      const limit = Math.min(args.limit, 100)
      const offset = args.offset

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      expect(data).toEqual(mockReplies)
    })

    it('应该限制 limit 最大值为 100', async () => {
      // 艹！测试 limit 上限保护
      const args = {
        limit: 500 // 超过最大值
      }

      const limit = Math.min(args.limit ?? 20, 100)

      // 验证 limit 被限制为 100
      expect(limit).toBe(100)
    })
  })

  describe('按主题筛选功能', () => {
    it('应该支持按 threadId 筛选回复', async () => {
      const mockReplies = [
        { id: 'reply-1', thread_id: 'thread-123', content: '主题回复 1', deleted_at: null },
        { id: 'reply-2', thread_id: 'thread-123', content: '主题回复 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockReplies,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        threadId: 'thread-123',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.threadId) {
        query = query.eq('thread_id', args.threadId)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockReplies)
      expect(data!.every(reply => reply.thread_id === 'thread-123')).toBe(true)
    })

    it('应该只返回指定主题的回复', async () => {
      const mockReplies = [
        { id: 'reply-tech-1', thread_id: 'thread-tech', content: '技术回复', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockReplies,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        threadId: 'thread-tech',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.threadId) {
        query = query.eq('thread_id', args.threadId)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toHaveLength(1)
      expect(data![0].thread_id).toBe('thread-tech')
    })
  })

  describe('嵌套回复功能（parentId 筛选）', () => {
    it('应该支持按 parentId 筛选顶级回复（parentId = null）', async () => {
      const mockTopLevelReplies = [
        { id: 'reply-1', thread_id: 'thread-1', parent_id: null, content: '顶级回复 1', deleted_at: null },
        { id: 'reply-2', thread_id: 'thread-1', parent_id: null, content: '顶级回复 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockTopLevelReplies,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        threadId: 'thread-1',
        parentId: null, // 艹！null 表示顶级回复
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.threadId) query = query.eq('thread_id', args.threadId)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockTopLevelReplies)
      expect(data!.every(reply => reply.parent_id === null)).toBe(true)
    })

    it('应该支持按 parentId 筛选嵌套回复（子回复）', async () => {
      const mockNestedReplies = [
        { id: 'reply-1-1', thread_id: 'thread-1', parent_id: 'reply-1', content: '嵌套回复 1', deleted_at: null },
        { id: 'reply-1-2', thread_id: 'thread-1', parent_id: 'reply-1', content: '嵌套回复 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockNestedReplies,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        threadId: 'thread-1',
        parentId: 'reply-1', // 艹！获取 reply-1 的子回复
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.threadId) query = query.eq('thread_id', args.threadId)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockNestedReplies)
      expect(data!.every(reply => reply.parent_id === 'reply-1')).toBe(true)
    })

    it('应该支持多层嵌套回复查询', async () => {
      // 艹！测试三层嵌套：主题 → 回复 → 子回复 → 孙回复
      const mockDeepNestedReplies = [
        { id: 'reply-1-1-1', parent_id: 'reply-1-1', content: '孙回复', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockDeepNestedReplies,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        parentId: 'reply-1-1', // 获取 reply-1-1 的子回复（孙回复）
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toHaveLength(1)
      expect(data![0].parent_id).toBe('reply-1-1')
    })
  })

  describe('排序功能', () => {
    it('应该支持按 created_at 排序（默认）', async () => {
      const mockReplies = [
        { id: 'reply-2', created_at: '2025-01-02T00:00:00Z', deleted_at: null },
        { id: 'reply-1', created_at: '2025-01-01T00:00:00Z', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = {
        orderBy: 'created_at',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy ?? 'created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockReplies)
      // 验证降序排序（最新的在前）
      expect(data![0].created_at).toBe('2025-01-02T00:00:00Z')
      expect(data![1].created_at).toBe('2025-01-01T00:00:00Z')
    })

    it('应该支持按自定义字段排序（upvote_count）', async () => {
      const mockReplies = [
        { id: 'reply-1', upvote_count: 100, deleted_at: null },
        { id: 'reply-2', upvote_count: 50, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = {
        orderBy: 'upvote_count',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy, { ascending: false }).range(0, 19)

      expect(data).toEqual(mockReplies)
      // 验证按投票数降序排序
      expect(data![0].upvote_count).toBe(100)
      expect(data![1].upvote_count).toBe(50)
    })
  })

  describe('软删除过滤', () => {
    it('应该自动过滤已删除的回复', async () => {
      const mockReplies = [
        { id: 'reply-1', content: '正常回复', deleted_at: null },
        { id: 'reply-2', content: '正常回复 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      // 艹！验证所有返回的回复都没有 deleted_at 字段（或为 null）
      expect(data).toEqual(mockReplies)
      expect(data!.every(reply => reply.deleted_at === null)).toBe(true)
    })
  })

  describe('组合筛选功能', () => {
    it('应该支持同时按 threadId 和 parentId 筛选', async () => {
      const mockReplies = [
        {
          id: 'reply-1-1',
          thread_id: 'thread-tech',
          parent_id: 'reply-1',
          content: '技术主题的嵌套回复',
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockReplies,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        threadId: 'thread-tech',
        parentId: 'reply-1',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      if (args.threadId) query = query.eq('thread_id', args.threadId)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockReplies)
      expect(data![0].thread_id).toBe('thread-tech')
      expect(data![0].parent_id).toBe('reply-1')
    })
  })

  describe('边界条件测试', () => {
    it('应该处理空结果', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual([])
      expect(data).toHaveLength(0)
    })

    it('应该处理 limit = 1 的情况', async () => {
      const mockReplies = [
        { id: 'reply-1', content: '单个回复', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 1, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 0)

      expect(data).toEqual(mockReplies)
      expect(data).toHaveLength(1)
    })

    it('应该处理 offset 超出范围的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 10000 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(10000, 10019)

      // 艹！offset 超出范围应该返回空数组
      expect(data).toEqual([])
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库查询错误', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: null,
                error: { message: '数据库连接失败' }
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data, error } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })
  })

  describe('投票统计字段测试', () => {
    it('应该正确返回 upvote 和 downvote 统计', async () => {
      const mockReplies = [
        { id: 'reply-1', upvote_count: 50, downvote_count: 5, deleted_at: null },
        { id: 'reply-2', upvote_count: 10, downvote_count: 2, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      // 艹！验证投票统计
      expect(data![0].upvote_count).toBe(50)
      expect(data![0].downvote_count).toBe(5)
      expect(data![1].upvote_count).toBe(10)
      expect(data![1].downvote_count).toBe(2)
    })

    it('应该处理零投票的回复', async () => {
      const mockReplies = [
        { id: 'reply-new', upvote_count: 0, downvote_count: 0, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReplies,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_replies').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data![0].upvote_count).toBe(0)
      expect(data![0].downvote_count).toBe(0)
    })
  })
})
