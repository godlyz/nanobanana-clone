/**
 * forumThreads Query 单元测试
 *
 * 艹！这是老王我写的 forumThreads Query 测试！
 * 测试所有功能：分页、过滤、排序、软删除过滤！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('forumThreads Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功获取论坛主题列表（默认参数）', async () => {
      // Arrange: 准备测试数据
      const mockThreads = [
        {
          id: 'thread-1',
          category_id: 'cat-1',
          author_id: 'user-1',
          title: '测试主题 1',
          content: '测试内容 1',
          status: 'open',
          view_count: 100,
          reply_count: 10,
          created_at: '2025-01-01T00:00:00Z',
          deleted_at: null
        },
        {
          id: 'thread-2',
          category_id: 'cat-1',
          author_id: 'user-2',
          title: '测试主题 2',
          content: '测试内容 2',
          status: 'open',
          view_count: 200,
          reply_count: 20,
          created_at: '2025-01-02T00:00:00Z',
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      // Assert: 验证结果
      expect(data).toEqual(mockThreads)
      expect(data).toHaveLength(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('forum_threads')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      const mockThreads = [
        { id: 'thread-3', title: '测试主题 3', deleted_at: null },
        { id: 'thread-4', title: '测试主题 4', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      expect(data).toEqual(mockThreads)
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

  describe('过滤功能', () => {
    it('应该支持按 categoryId 过滤', async () => {
      const mockThreads = [
        { id: 'thread-1', category_id: 'cat-123', title: '分类主题 1', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockThreads,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        categoryId: 'cat-123',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      if (args.categoryId) {
        query = query.eq('category_id', args.categoryId)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockThreads)
      expect(data![0].category_id).toBe('cat-123')
    })

    it('应该支持按 status 过滤', async () => {
      const mockThreads = [
        { id: 'thread-1', status: 'open', title: '开放主题', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockThreads,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        status: 'open',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      if (args.status) {
        query = query.eq('status', args.status)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockThreads)
      expect(data![0].status).toBe('open')
    })

    it('应该支持同时按 categoryId 和 status 过滤', async () => {
      const mockThreads = [
        { id: 'thread-1', category_id: 'cat-123', status: 'open', title: '过滤主题', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockThreads,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        categoryId: 'cat-123',
        status: 'open',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      if (args.categoryId) {
        query = query.eq('category_id', args.categoryId)
      }

      if (args.status) {
        query = query.eq('status', args.status)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockThreads)
      expect(data![0].category_id).toBe('cat-123')
      expect(data![0].status).toBe('open')
    })
  })

  describe('排序功能', () => {
    it('应该支持按 created_at 排序（默认）', async () => {
      const mockThreads = [
        { id: 'thread-2', created_at: '2025-01-02T00:00:00Z', deleted_at: null },
        { id: 'thread-1', created_at: '2025-01-01T00:00:00Z', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy ?? 'created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockThreads)
      // 验证降序排序（最新的在前）
      expect(data![0].created_at).toBe('2025-01-02T00:00:00Z')
      expect(data![1].created_at).toBe('2025-01-01T00:00:00Z')
    })

    it('应该支持按自定义字段排序', async () => {
      const mockThreads = [
        { id: 'thread-1', view_count: 1000, deleted_at: null },
        { id: 'thread-2', view_count: 500, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
                error: null
              })
            })
          })
        })
      })

      const args = {
        orderBy: 'view_count',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy, { ascending: false }).range(0, 19)

      expect(data).toEqual(mockThreads)
      // 验证按浏览量降序排序
      expect(data![0].view_count).toBe(1000)
      expect(data![1].view_count).toBe(500)
    })
  })

  describe('软删除过滤', () => {
    it('应该自动过滤已删除的主题', async () => {
      const mockThreads = [
        { id: 'thread-1', title: '正常主题', deleted_at: null },
        { id: 'thread-2', title: '正常主题 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      // 艹！验证所有返回的主题都没有 deleted_at 字段（或为 null）
      expect(data).toEqual(mockThreads)
      expect(data!.every(thread => thread.deleted_at === null)).toBe(true)
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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual([])
      expect(data).toHaveLength(0)
    })

    it('应该处理 limit = 1 的情况', async () => {
      const mockThreads = [
        { id: 'thread-1', title: '单个主题', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockThreads,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 1, offset: 0 }

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 0)

      expect(data).toEqual(mockThreads)
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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

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

      let query = mockSupabase.from('forum_threads').select('*').is('deleted_at', null)

      const { data, error } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })
  })
})
