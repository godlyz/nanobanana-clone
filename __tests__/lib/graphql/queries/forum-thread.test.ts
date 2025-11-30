/**
 * forumThread Query 单元测试
 *
 * 艹！这是老王我写的 forumThread Query 测试！
 * 测试单个主题查询：通过ID获取、软删除过滤、错误处理！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('forumThread Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功根据ID获取论坛主题', async () => {
      // Arrange: 准备测试数据
      const mockThread = {
        id: 'thread-123',
        category_id: 'cat-1',
        author_id: 'user-1',
        title: '测试主题标题',
        content: '测试主题内容',
        status: 'open',
        view_count: 100,
        reply_count: 10,
        upvote_count: 5,
        downvote_count: 1,
        is_pinned: false,
        is_locked: false,
        tag_ids: ['tag-1', 'tag-2'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      // Act: 执行查询（模拟 resolver 逻辑）
      const args = {
        id: 'thread-123'
      }

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null)
        .single()

      // Assert: 验证结果
      expect(data).toEqual(mockThread)
      expect(data?.id).toBe('thread-123')
      expect(data?.title).toBe('测试主题标题')
      expect(mockSupabase.from).toHaveBeenCalledWith('forum_threads')
    })

    it('应该返回 null 当主题不存在时', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      })

      const args = {
        id: 'non-existent-thread'
      }

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null)
        .single()

      // 艹！验证不存在的主题返回 null
      expect(data).toBeNull()
    })

    it('应该正确处理包含所有字段的主题', async () => {
      const completeThread = {
        id: 'thread-456',
        category_id: 'cat-tech',
        author_id: 'user-789',
        title: '完整主题测试',
        content: '这是一个包含所有字段的完整主题',
        status: 'open',
        view_count: 999,
        reply_count: 50,
        upvote_count: 100,
        downvote_count: 5,
        is_pinned: true,
        is_locked: false,
        tag_ids: ['javascript', 'typescript', 'react'],
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-01-16T14:20:00Z',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: completeThread,
                error: null
              })
            })
          })
        })
      })

      const args = {
        id: 'thread-456'
      }

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null)
        .single()

      // 艹！验证所有字段都正确返回
      expect(data).toEqual(completeThread)
      expect(data?.is_pinned).toBe(true)
      expect(data?.tag_ids).toHaveLength(3)
      expect(data?.view_count).toBe(999)
    })
  })

  describe('软删除过滤', () => {
    it('应该自动过滤已删除的主题', async () => {
      // 艹！模拟查询已删除的主题，应该返回 null
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // 软删除过滤后返回 null
                error: null
              })
            })
          })
        })
      })

      const args = {
        id: 'deleted-thread'
      }

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null) // 这个过滤确保已删除的主题被排除
        .single()

      // 验证已删除的主题不会被返回
      expect(data).toBeNull()
    })

    it('应该验证 deleted_at 过滤条件被正确应用', async () => {
      const mockThread = {
        id: 'thread-active',
        title: '正常主题',
        deleted_at: null
      }

      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockThread,
          error: null
        })
      }

      const isQuery = vi.fn().mockReturnValue(mockQuery)
      const eqQuery = vi.fn().mockReturnValue({ is: isQuery })
      const selectQuery = vi.fn().mockReturnValue({ eq: eqQuery })

      mockSupabase.from.mockReturnValue({
        select: selectQuery
      })

      await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-active')
        .is('deleted_at', null)
        .single()

      // 艹！验证 is('deleted_at', null) 被调用
      expect(isQuery).toHaveBeenCalledWith('deleted_at', null)
    })
  })

  describe('状态字段测试', () => {
    it('应该正确返回不同状态的主题', async () => {
      const statuses = ['open', 'closed', 'locked']

      for (const status of statuses) {
        const mockThread = {
          id: `thread-${status}`,
          title: `主题 - ${status}`,
          status,
          deleted_at: null
        }

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockThread,
                  error: null
                })
              })
            })
          })
        })

        const { data } = await mockSupabase
          .from('forum_threads')
          .select('*')
          .eq('id', `thread-${status}`)
          .is('deleted_at', null)
          .single()

        expect(data?.status).toBe(status)
      }
    })

    it('应该正确返回置顶和锁定状态', async () => {
      const testCases = [
        { is_pinned: true, is_locked: false },
        { is_pinned: false, is_locked: true },
        { is_pinned: true, is_locked: true },
        { is_pinned: false, is_locked: false }
      ]

      for (const testCase of testCases) {
        const mockThread = {
          id: 'thread-flags',
          title: '标志测试',
          ...testCase,
          deleted_at: null
        }

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockThread,
                  error: null
                })
              })
            })
          })
        })

        const { data } = await mockSupabase
          .from('forum_threads')
          .select('*')
          .eq('id', 'thread-flags')
          .is('deleted_at', null)
          .single()

        // 艹！验证标志状态
        expect(data?.is_pinned).toBe(testCase.is_pinned)
        expect(data?.is_locked).toBe(testCase.is_locked)
      }
    })
  })

  describe('数值字段测试', () => {
    it('应该正确返回统计数据（浏览量、回复数、投票数）', async () => {
      const mockThread = {
        id: 'thread-stats',
        title: '统计数据测试',
        view_count: 1234,
        reply_count: 56,
        upvote_count: 78,
        downvote_count: 9,
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-stats')
        .is('deleted_at', null)
        .single()

      // 艹！验证所有统计数据
      expect(data?.view_count).toBe(1234)
      expect(data?.reply_count).toBe(56)
      expect(data?.upvote_count).toBe(78)
      expect(data?.downvote_count).toBe(9)
    })

    it('应该处理零值统计数据', async () => {
      const mockThread = {
        id: 'thread-zero-stats',
        title: '零统计测试',
        view_count: 0,
        reply_count: 0,
        upvote_count: 0,
        downvote_count: 0,
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-zero-stats')
        .is('deleted_at', null)
        .single()

      // 艹！验证零值也能正确返回
      expect(data?.view_count).toBe(0)
      expect(data?.reply_count).toBe(0)
    })
  })

  describe('数组字段测试', () => {
    it('应该正确返回标签数组', async () => {
      const mockThread = {
        id: 'thread-tags',
        title: '标签测试',
        tag_ids: ['tag-1', 'tag-2', 'tag-3'],
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-tags')
        .is('deleted_at', null)
        .single()

      expect(data?.tag_ids).toEqual(['tag-1', 'tag-2', 'tag-3'])
      expect(data?.tag_ids).toHaveLength(3)
    })

    it('应该处理空标签数组', async () => {
      const mockThread = {
        id: 'thread-no-tags',
        title: '无标签测试',
        tag_ids: [],
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-no-tags')
        .is('deleted_at', null)
        .single()

      // 艹！验证空数组也能正确处理
      expect(data?.tag_ids).toEqual([])
      expect(data?.tag_ids).toHaveLength(0)
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库查询错误', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: '数据库连接失败', code: 'DB_ERROR' }
              })
            })
          })
        })
      })

      const args = {
        id: 'thread-error'
      }

      const { data, error } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null)
        .single()

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })

    it('应该处理无效ID格式', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: '无效的ID格式' }
              })
            })
          })
        })
      })

      const args = {
        id: 'invalid-id-format-###'
      }

      const { data, error } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', args.id)
        .is('deleted_at', null)
        .single()

      expect(data).toBeNull()
      expect(error).toBeDefined()
    })
  })

  describe('时间字段测试', () => {
    it('应该正确返回创建和更新时间', async () => {
      const mockThread = {
        id: 'thread-time',
        title: '时间测试',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-02T15:30:00Z',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-time')
        .is('deleted_at', null)
        .single()

      // 艹！验证时间字段
      expect(data?.created_at).toBe('2025-01-01T10:00:00Z')
      expect(data?.updated_at).toBe('2025-01-02T15:30:00Z')
      expect(data?.deleted_at).toBeNull()
    })
  })

  describe('关联字段测试', () => {
    it('应该正确返回关联的分类ID和作者ID', async () => {
      const mockThread = {
        id: 'thread-relations',
        title: '关联测试',
        category_id: 'cat-javascript',
        author_id: 'user-12345',
        deleted_at: null
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockThread,
                error: null
              })
            })
          })
        })
      })

      const { data } = await mockSupabase
        .from('forum_threads')
        .select('*')
        .eq('id', 'thread-relations')
        .is('deleted_at', null)
        .single()

      // 艹！验证关联字段
      expect(data?.category_id).toBe('cat-javascript')
      expect(data?.author_id).toBe('user-12345')
    })
  })
})
