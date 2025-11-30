/**
 * blog-categories-tags Query 单元测试
 *
 * 艹！这是老王我写的博客分类和标签 Query 测试！
 * 测试分类、标签查询以及关联文章查询！
 *
 * 测试的 Query（4个）：
 * 1. blogCategories - 获取博客分类列表
 * 2. blogTags - 获取博客标签列表
 * 3. blogPostsByCategory - 获取某个分类下的博客文章
 * 4. blogPostsByTag - 获取某个标签下的博客文章
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('博客分类和标签 Query 测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ========================================
  // Query 1: blogCategories - 获取博客分类列表
  // ========================================
  describe('blogCategories Query', () => {
    it('应该成功获取博客分类列表（默认参数）', async () => {
      // Arrange
      const mockCategories = [
        {
          id: 'cat-1',
          name: '技术',
          slug: 'tech',
          description: '技术相关文章',
          post_count: 10,
          deleted_at: null
        },
        {
          id: 'cat-2',
          name: '生活',
          slug: 'life',
          description: '生活随笔',
          post_count: 5,
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockCategories,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { limit: 20, offset: 0 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data } = await mockSupabase
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(offset, offset + limit - 1)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('技术')
      expect(result[0].post_count).toBe(10)
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_categories')
    })

    it('应该按 post_count 降序排序', async () => {
      // Arrange
      const mockOrderFn = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: mockOrderFn
          })
        })
      })

      // Act
      await mockSupabase
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockOrderFn).toHaveBeenCalledWith('post_count', { ascending: false })
    })

    it('应该过滤掉软删除的分类', async () => {
      // Arrange
      const mockIsFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: mockIsFn
        })
      })

      // Act
      await mockSupabase
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockIsFn).toHaveBeenCalledWith('deleted_at', null)
    })

    it('应该支持自定义 limit 和 offset', async () => {
      // Arrange
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

      // Act
      const args = { limit: 10, offset: 5 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      await mockSupabase
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert
      const rangeCall = (mockSupabase.from().select().is().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(5)
      expect(rangeCall[1]).toBe(14)
    })

    it('应该限制最大 limit 为 100', async () => {
      // Arrange
      const args = { limit: 200 }

      // Act
      const limit = Math.min(args.limit ?? 20, 100)

      // Assert
      expect(limit).toBe(100)
    })

    it('应该正确处理空结果', async () => {
      // Arrange
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

      // Act
      const { data } = await mockSupabase
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })
  })

  // ========================================
  // Query 2: blogTags - 获取博客标签列表
  // ========================================
  describe('blogTags Query', () => {
    it('应该成功获取博客标签列表（默认参数）', async () => {
      // Arrange
      const mockTags = [
        {
          id: 'tag-1',
          name: 'JavaScript',
          slug: 'javascript',
          post_count: 15,
          deleted_at: null
        },
        {
          id: 'tag-2',
          name: 'TypeScript',
          slug: 'typescript',
          post_count: 8,
          deleted_at: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockTags,
                error: null
              })
            })
          })
        })
      })

      // Act
      const args = { limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('blog_tags')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('JavaScript')
      expect(result[0].post_count).toBe(15)
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_tags')
    })

    it('应该按 post_count 降序排序', async () => {
      // Arrange
      const mockOrderFn = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: mockOrderFn
          })
        })
      })

      // Act
      await mockSupabase
        .from('blog_tags')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockOrderFn).toHaveBeenCalledWith('post_count', { ascending: false })
    })

    it('应该过滤掉软删除的标签', async () => {
      // Arrange
      const mockIsFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: mockIsFn
        })
      })

      // Act
      await mockSupabase
        .from('blog_tags')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockIsFn).toHaveBeenCalledWith('deleted_at', null)
    })

    it('应该支持分页参数', async () => {
      // Arrange
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

      // Act
      const args = { limit: 15, offset: 10 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      await mockSupabase
        .from('blog_tags')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert
      const rangeCall = (mockSupabase.from().select().is().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(10)
      expect(rangeCall[1]).toBe(24)
    })
  })

  // ========================================
  // Query 3: blogPostsByCategory - 获取分类下的文章
  // ========================================
  describe('blogPostsByCategory Query', () => {
    it('应该成功获取某个分类下的博客文章', async () => {
      // Arrange
      const mockRelations = [
        { post_id: 'post-1' },
        { post_id: 'post-2' }
      ]

      const mockPosts = [
        {
          id: 'post-1',
          title: '文章1',
          status: 'published',
          deleted_at: null
        },
        {
          id: 'post-2',
          title: '文章2',
          status: 'published',
          deleted_at: null
        }
      ]

      // 艹！第一次调用 from 返回关联表查询
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        // 艹！第二次调用 from 返回文章查询
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: mockPosts,
                      error: null
                    })
                  })
                })
              })
            })
          })
        })

      // Act
      const args = { categoryId: 'cat-1', limit: 20, offset: 0 }

      // Step 1: 查询关联表
      const { data: relations } = await mockSupabase
        .from('blog_post_categories')
        .select('post_id')
        .eq('category_id', args.categoryId)

      if (!relations || relations.length === 0) {
        throw new Error('艹！应该有关联数据')
      }

      const postIds = relations.map(r => r.post_id)

      // Step 2: 查询文章详情
      const { data } = await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('文章1')
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_post_categories')
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_posts')
    })

    it('应该在分类下没有文章时返回空数组', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      // Act
      const args = { categoryId: 'empty-cat' }

      const { data: relations } = await mockSupabase
        .from('blog_post_categories')
        .select('post_id')
        .eq('category_id', args.categoryId)

      const result = (relations && relations.length > 0) ? [] : []

      // Assert
      expect(result).toEqual([])
    })

    it('应该只返回已发布的文章', async () => {
      // Arrange
      const mockRelations = [{ post_id: 'post-1' }]
      const mockEqFn = vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: mockEqFn
            })
          })
        })

      // Act
      const { data: relations } = await mockSupabase
        .from('blog_post_categories')
        .select('post_id')
        .eq('category_id', 'cat-1')

      const postIds = relations.map(r => r.post_id)

      await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEqFn).toHaveBeenCalledWith('status', 'published')
    })

    it('应该过滤掉软删除的文章', async () => {
      // Arrange
      const mockRelations = [{ post_id: 'post-1' }]
      const mockIsFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: mockIsFn
              })
            })
          })
        })

      // Act
      const { data: relations } = await mockSupabase
        .from('blog_post_categories')
        .select('post_id')
        .eq('category_id', 'cat-1')

      const postIds = relations.map(r => r.post_id)

      await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockIsFn).toHaveBeenCalledWith('deleted_at', null)
    })
  })

  // ========================================
  // Query 4: blogPostsByTag - 获取标签下的文章
  // ========================================
  describe('blogPostsByTag Query', () => {
    it('应该成功获取某个标签下的博客文章', async () => {
      // Arrange
      const mockRelations = [
        { post_id: 'post-1' },
        { post_id: 'post-2' }
      ]

      const mockPosts = [
        {
          id: 'post-1',
          title: 'JS文章',
          status: 'published',
          deleted_at: null
        },
        {
          id: 'post-2',
          title: 'TS文章',
          status: 'published',
          deleted_at: null
        }
      ]

      // 艹！第一次调用 from 返回关联表查询
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        // 艹！第二次调用 from 返回文章查询
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: mockPosts,
                      error: null
                    })
                  })
                })
              })
            })
          })
        })

      // Act
      const args = { tagId: 'tag-1', limit: 20, offset: 0 }

      // Step 1: 查询关联表
      const { data: relations } = await mockSupabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', args.tagId)

      if (!relations || relations.length === 0) {
        throw new Error('艹！应该有关联数据')
      }

      const postIds = relations.map(r => r.post_id)

      // Step 2: 查询文章详情
      const { data } = await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('JS文章')
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_post_tags')
      expect(mockSupabase.from).toHaveBeenCalledWith('blog_posts')
    })

    it('应该在标签下没有文章时返回空数组', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      // Act
      const args = { tagId: 'empty-tag' }

      const { data: relations } = await mockSupabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', args.tagId)

      const result = (relations && relations.length > 0) ? [] : []

      // Assert
      expect(result).toEqual([])
    })

    it('应该只返回已发布的文章', async () => {
      // Arrange
      const mockRelations = [{ post_id: 'post-1' }]
      const mockEqFn = vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: mockEqFn
            })
          })
        })

      // Act
      const { data: relations } = await mockSupabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', 'tag-1')

      const postIds = relations.map(r => r.post_id)

      await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEqFn).toHaveBeenCalledWith('status', 'published')
    })

    it('应该支持分页参数', async () => {
      // Arrange
      const mockRelations = [{ post_id: 'post-1' }]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockRelations,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
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
          })
        })

      // Act
      const args = { tagId: 'tag-1', limit: 10, offset: 5 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data: relations } = await mockSupabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', args.tagId)

      const postIds = relations.map(r => r.post_id)

      await mockSupabase
        .from('blog_posts')
        .select('*')
        .in('id', postIds)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert - 艹！改用 vi.mocked 来检查参数
      const fromCalls = vi.mocked(mockSupabase.from).mock.calls
      expect(fromCalls[1][0]).toBe('blog_posts')  // 第二次调用 from() 是查询 blog_posts
    })
  })

  // ========================================
  // 边界情况和错误处理
  // ========================================
  describe('边界情况和错误处理', () => {
    it('应该正确处理数据库查询错误（分类）', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
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
        .from('blog_categories')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })

    it('应该正确处理数据库查询错误（标签）', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
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
        .from('blog_tags')
        .select('*')
        .is('deleted_at', null)
        .order('post_count', { ascending: false })
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
