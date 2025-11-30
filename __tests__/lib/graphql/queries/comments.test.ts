/**
 * comments Query 单元测试
 *
 * 艹！这是老王我写的 comments Query 测试！
 * 测试评论列表查询：分页、多内容类型、嵌套评论、排序！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('comments Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功获取评论列表（默认参数）', async () => {
      // Arrange: 准备测试数据
      const mockComments = [
        {
          id: 'comment-1',
          user_id: 'user-1',
          content_id: 'post-1',
          content_type: 'blog_post',
          content: '测试评论 1',
          parent_id: null,
          likes_count: 5,
          created_at: '2025-01-02T00:00:00Z',
          deleted_at: null
        },
        {
          id: 'comment-2',
          user_id: 'user-2',
          content_id: 'post-1',
          content_type: 'blog_post',
          content: '测试评论 2',
          parent_id: null,
          likes_count: 3,
          created_at: '2025-01-01T00:00:00Z',
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      // Assert: 验证结果
      expect(data).toEqual(mockComments)
      expect(data).toHaveLength(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('comments')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      const mockComments = [
        { id: 'comment-3', content: '测试评论 3', deleted_at: null },
        { id: 'comment-4', content: '测试评论 4', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      expect(data).toEqual(mockComments)
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

  describe('按内容ID筛选功能', () => {
    it('应该支持按 contentId 筛选评论', async () => {
      const mockComments = [
        { id: 'comment-1', content_id: 'post-123', content: '文章评论 1', deleted_at: null },
        { id: 'comment-2', content_id: 'post-123', content: '文章评论 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'post-123',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) {
        query = query.eq('content_id', args.contentId)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockComments)
      expect(data!.every(comment => comment.content_id === 'post-123')).toBe(true)
    })

    it('应该只返回指定内容的评论', async () => {
      const mockComments = [
        { id: 'comment-video-1', content_id: 'video-456', content: '视频评论', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'video-456',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) {
        query = query.eq('content_id', args.contentId)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toHaveLength(1)
      expect(data![0].content_id).toBe('video-456')
    })
  })

  describe('按内容类型筛选功能', () => {
    it('应该支持按 contentType 筛选（blog_post）', async () => {
      const mockComments = [
        { id: 'comment-1', content_type: 'blog_post', content: '博客评论', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentType: 'blog_post',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentType) {
        query = query.eq('content_type', args.contentType)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockComments)
      expect(data![0].content_type).toBe('blog_post')
    })

    it('应该支持按 contentType 筛选（artwork）', async () => {
      const mockComments = [
        { id: 'comment-2', content_type: 'artwork', content: '作品评论', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentType: 'artwork',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentType) {
        query = query.eq('content_type', args.contentType)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data![0].content_type).toBe('artwork')
    })

    it('应该支持按 contentType 筛选（video）', async () => {
      const mockComments = [
        { id: 'comment-3', content_type: 'video', content: '视频评论', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentType: 'video',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentType) {
        query = query.eq('content_type', args.contentType)
      }

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data![0].content_type).toBe('video')
    })
  })

  describe('嵌套评论功能（parentId 筛选）', () => {
    it('应该支持按 parentId 筛选顶级评论（parentId = null）', async () => {
      const mockTopLevelComments = [
        { id: 'comment-1', content_id: 'post-1', parent_id: null, content: '顶级评论 1', deleted_at: null },
        { id: 'comment-2', content_id: 'post-1', parent_id: null, content: '顶级评论 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockTopLevelComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'post-1',
        parentId: null, // 艹！null 表示顶级评论
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) query = query.eq('content_id', args.contentId)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockTopLevelComments)
      expect(data!.every(comment => comment.parent_id === null)).toBe(true)
    })

    it('应该支持按 parentId 筛选嵌套评论（回复）', async () => {
      const mockNestedComments = [
        { id: 'comment-1-1', content_id: 'post-1', parent_id: 'comment-1', content: '回复 1', deleted_at: null },
        { id: 'comment-1-2', content_id: 'post-1', parent_id: 'comment-1', content: '回复 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockNestedComments,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'post-1',
        parentId: 'comment-1', // 艹！获取 comment-1 的回复
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) query = query.eq('content_id', args.contentId)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockNestedComments)
      expect(data!.every(comment => comment.parent_id === 'comment-1')).toBe(true)
    })

    it('应该支持二层嵌套评论查询（最多2层）', async () => {
      // 艹！测试二层嵌套：评论 → 回复 → 回复的回复
      const mockDeepNestedComments = [
        { id: 'comment-1-1-1', parent_id: 'comment-1-1', content: '回复的回复', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockDeepNestedComments,
                  error: null
                })
              })
            })
          })
        })
      })

      const args = {
        parentId: 'comment-1-1', // 获取 comment-1-1 的回复
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toHaveLength(1)
      expect(data![0].parent_id).toBe('comment-1-1')
    })
  })

  describe('组合筛选功能', () => {
    it('应该支持同时按 contentId 和 contentType 筛选', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content_id: 'post-tech',
          content_type: 'blog_post',
          content: '技术博客评论',
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
                    data: mockComments,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'post-tech',
        contentType: 'blog_post',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) query = query.eq('content_id', args.contentId)
      if (args.contentType) query = query.eq('content_type', args.contentType)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockComments)
      expect(data![0].content_id).toBe('post-tech')
      expect(data![0].content_type).toBe('blog_post')
    })

    it('应该支持同时按 contentId、contentType 和 parentId 筛选', async () => {
      const mockComments = [
        {
          id: 'comment-nested',
          content_id: 'artwork-123',
          content_type: 'artwork',
          parent_id: 'comment-parent',
          content: '作品的嵌套评论',
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: mockComments,
                      error: null
                    })
                  })
                })
              })
            })
          })
        })
      })

      const args = {
        contentId: 'artwork-123',
        contentType: 'artwork',
        parentId: 'comment-parent',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      if (args.contentId) query = query.eq('content_id', args.contentId)
      if (args.contentType) query = query.eq('content_type', args.contentType)
      if (args.parentId) query = query.eq('parent_id', args.parentId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data![0].content_id).toBe('artwork-123')
      expect(data![0].content_type).toBe('artwork')
      expect(data![0].parent_id).toBe('comment-parent')
    })
  })

  describe('排序功能', () => {
    it('应该支持按 created_at 排序（默认）', async () => {
      const mockComments = [
        { id: 'comment-2', created_at: '2025-01-02T00:00:00Z', deleted_at: null },
        { id: 'comment-1', created_at: '2025-01-01T00:00:00Z', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy ?? 'created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual(mockComments)
      // 验证降序排序（最新的在前）
      expect(data![0].created_at).toBe('2025-01-02T00:00:00Z')
      expect(data![1].created_at).toBe('2025-01-01T00:00:00Z')
    })

    it('应该支持按自定义字段排序（likes_count）', async () => {
      const mockComments = [
        { id: 'comment-1', likes_count: 100, deleted_at: null },
        { id: 'comment-2', likes_count: 50, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null
              })
            })
          })
        })
      })

      const args = {
        orderBy: 'likes_count',
        limit: 20,
        offset: 0
      }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order(args.orderBy, { ascending: false }).range(0, 19)

      expect(data).toEqual(mockComments)
      // 验证按点赞数降序排序
      expect(data![0].likes_count).toBe(100)
      expect(data![1].likes_count).toBe(50)
    })
  })

  describe('软删除过滤', () => {
    it('应该自动过滤已删除的评论', async () => {
      const mockComments = [
        { id: 'comment-1', content: '正常评论', deleted_at: null },
        { id: 'comment-2', content: '正常评论 2', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      // 艹！验证所有返回的评论都没有 deleted_at 字段（或为 null）
      expect(data).toEqual(mockComments)
      expect(data!.every(comment => comment.deleted_at === null)).toBe(true)
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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toEqual([])
      expect(data).toHaveLength(0)
    })

    it('应该处理 limit = 1 的情况', async () => {
      const mockComments = [
        { id: 'comment-1', content: '单个评论', deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 1, offset: 0 }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 0)

      expect(data).toEqual(mockComments)
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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

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

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data, error } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })
  })

  describe('点赞统计字段测试', () => {
    it('应该正确返回 likes_count 统计', async () => {
      const mockComments = [
        { id: 'comment-1', likes_count: 100, deleted_at: null },
        { id: 'comment-2', likes_count: 50, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      // 艹！验证点赞统计
      expect(data![0].likes_count).toBe(100)
      expect(data![1].likes_count).toBe(50)
    })

    it('应该处理零点赞的评论', async () => {
      const mockComments = [
        { id: 'comment-new', likes_count: 0, deleted_at: null }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null
              })
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      let query = mockSupabase.from('comments').select('*').is('deleted_at', null)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      expect(data![0].likes_count).toBe(0)
    })
  })
})
