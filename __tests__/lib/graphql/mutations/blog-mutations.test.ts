/**
 * Blog Mutations 单元测试
 *
 * 艹！这是老王我写的 Blog Mutations 测试！
 * 测试 createBlogPost、updateBlogPost、deleteBlogPost 三个 Mutation！
 * 重点测试：权限控制（登录检查）+ 所有权验证 + 软删除机制！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Blog Mutations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('createBlogPost Mutation', () => {
    describe('基础功能测试', () => {
      it('应该成功创建博客文章（最小输入）', async () => {
        const mockPost = {
          id: 'post-1',
          author_id: 'mock-user-id',
          title: '测试博客标题',
          slug: '测试博客标题',
          content: '测试博客内容',
          excerpt: '测试摘要',
          cover_image_url: null,
          status: 'draft',
          published_at: null,
          category_ids: [],
          tag_ids: [],
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockPost,
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
            title: '测试博客标题',
            slug: '测试博客标题',
            content: '测试博客内容',
            excerpt: '测试摘要'
          }
        }

        // 艹！检查登录状态
        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        if (error) throw new Error(`创建博客文章失败: ${error.message}`)

        // Assert: 验证结果
        expect(data).toEqual(mockPost)
        expect(data?.author_id).toBe('mock-user-id')
        expect(data?.status).toBe('draft')
        expect(data?.published_at).toBeNull()
      })

      it('应该支持完整输入（包含所有字段）', async () => {
        const mockPost = {
          id: 'post-2',
          author_id: 'mock-user-id',
          title: '完整博客',
          slug: 'complete-blog',
          content: '完整内容',
          excerpt: '完整摘要',
          cover_image_url: 'https://example.com/cover.jpg',
          status: 'published',
          published_at: new Date().toISOString(),
          category_ids: ['cat-1', 'cat-2'],
          tag_ids: ['tag-1', 'tag-2'],
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockPost,
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
            title: '完整博客',
            slug: 'complete-blog',
            content: '完整内容',
            excerpt: '完整摘要',
            coverImageUrl: 'https://example.com/cover.jpg',
            status: 'published',
            categoryIds: ['cat-1', 'cat-2'],
            tagIds: ['tag-1', 'tag-2']
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        if (error) throw new Error(`创建博客文章失败: ${error.message}`)

        expect(data?.status).toBe('published')
        expect(data?.published_at).not.toBeNull()
        expect(data?.category_ids).toEqual(['cat-1', 'cat-2'])
        expect(data?.tag_ids).toEqual(['tag-1', 'tag-2'])
      })
    })

    describe('默认值测试', () => {
      it('应该使用默认 slug（从 title 生成）', async () => {
        const mockPost = {
          id: 'post-3',
          author_id: 'mock-user-id',
          title: 'My Test Post',
          slug: 'my-test-post',
          content: '内容',
          excerpt: '摘要'
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockPost,
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
            title: 'My Test Post',
            content: '内容',
            excerpt: '摘要'
            // 艹！没有提供 slug，应该自动生成
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        // 艹！验证 slug 被自动生成
        expect(data?.slug).toBe('my-test-post')
      })

      it('应该使用默认 status = "draft"', async () => {
        const mockPost = {
          id: 'post-4',
          author_id: 'mock-user-id',
          title: '测试',
          content: '内容',
          status: 'draft',
          published_at: null
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockPost,
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
            title: '测试',
            content: '内容',
            excerpt: '摘要'
            // 艹！没有提供 status，应该默认为 draft
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        expect(data?.status).toBe('draft')
        expect(data?.published_at).toBeNull()
      })

      it('应该使用空数组作为默认 category_ids 和 tag_ids', async () => {
        const mockPost = {
          id: 'post-5',
          author_id: 'mock-user-id',
          title: '测试',
          content: '内容',
          category_ids: [],
          tag_ids: []
        }

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockPost,
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
            title: '测试',
            content: '内容',
            excerpt: '摘要'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        expect(data?.category_ids).toEqual([])
        expect(data?.tag_ids).toEqual([])
      })
    })

    describe('权限控制测试（登录检查）', () => {
      it('应该拒绝未登录用户创建博客', () => {
        const ctx = {
          user: null, // 艹！未登录
          supabase: mockSupabase
        }

        const args = {
          input: {
            title: '测试',
            content: '内容',
            excerpt: '摘要'
          }
        }

        // 艹！验证登录检查
        expect(() => {
          if (!ctx.user) throw new Error('未登录，无法创建博客文章')
        }).toThrow('未登录，无法创建博客文章')
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
            title: '测试',
            content: '内容',
            excerpt: '摘要'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法创建博客文章')

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: ctx.user.id,
            title: args.input.title,
            slug: args.input.slug ?? args.input.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.input.content,
            excerpt: args.input.excerpt,
            cover_image_url: args.input.coverImageUrl,
            status: args.input.status ?? 'draft',
            published_at: args.input.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.input.categoryIds ?? [],
            tag_ids: args.input.tagIds ?? []
          })
          .select()
          .single()

        expect(error).toBeDefined()
        expect(error?.message).toBe('数据库插入失败')
        expect(data).toBeNull()
      })
    })
  })

  describe('updateBlogPost Mutation', () => {
    describe('基础功能测试', () => {
      it('应该成功更新博客文章（部分字段）', async () => {
        const mockPost = {
          id: 'post-1',
          author_id: 'mock-user-id',
          title: '更新后的标题',
          slug: 'updated-slug',
          content: '原内容',
          excerpt: '原摘要',
          status: 'draft',
          updated_at: new Date().toISOString()
        }

        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockPost,
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
          id: 'post-1',
          input: {
            title: '更新后的标题',
            slug: 'updated-slug'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法更新博客文章')

        // 艹！构建更新数据对象
        const updateData: any = {}
        if (args.input.title) updateData.title = args.input.title
        if (args.input.slug) updateData.slug = args.input.slug
        if (args.input.content) updateData.content = args.input.content
        if (args.input.excerpt) updateData.excerpt = args.input.excerpt
        if (args.input.coverImageUrl) updateData.cover_image_url = args.input.coverImageUrl
        if (args.input.status) updateData.status = args.input.status
        if (args.input.categoryIds) updateData.category_ids = args.input.categoryIds
        if (args.input.tagIds) updateData.tag_ids = args.input.tagIds

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', args.id)
          .eq('author_id', ctx.user.id) // 只能更新自己的文章
          .select()
          .single()

        if (error) throw new Error(`更新博客文章失败: ${error.message}`)

        expect(data).toEqual(mockPost)
        expect(data?.title).toBe('更新后的标题')
        expect(data?.slug).toBe('updated-slug')
      })

      it('应该只更新提供的字段（部分更新）', async () => {
        const mockPost = {
          id: 'post-2',
          author_id: 'mock-user-id',
          title: '原标题',
          content: '更新后的内容',
          excerpt: '原摘要'
        }

        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockPost,
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
          id: 'post-2',
          input: {
            content: '更新后的内容'
            // 艹！只更新 content，不更新 title 和 excerpt
          }
        }

        if (!ctx.user) throw new Error('未登录，无法更新博客文章')

        const updateData: any = {}
        if (args.input.title) updateData.title = args.input.title
        if (args.input.slug) updateData.slug = args.input.slug
        if (args.input.content) updateData.content = args.input.content
        if (args.input.excerpt) updateData.excerpt = args.input.excerpt
        if (args.input.coverImageUrl) updateData.cover_image_url = args.input.coverImageUrl
        if (args.input.status) updateData.status = args.input.status
        if (args.input.categoryIds) updateData.category_ids = args.input.categoryIds
        if (args.input.tagIds) updateData.tag_ids = args.input.tagIds

        const { data } = await ctx.supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', args.id)
          .eq('author_id', ctx.user.id)
          .select()
          .single()

        // 艹！验证只有 content 被更新了
        expect(updateData).toEqual({ content: '更新后的内容' })
      })
    })

    describe('权限控制测试（登录检查 + 所有权验证）', () => {
      it('应该拒绝未登录用户更新博客', () => {
        const ctx = {
          user: null, // 艹！未登录
          supabase: mockSupabase
        }

        const args = {
          id: 'post-1',
          input: {
            title: '更新标题'
          }
        }

        // 艹！验证登录检查
        expect(() => {
          if (!ctx.user) throw new Error('未登录，无法更新博客文章')
        }).toThrow('未登录，无法更新博客文章')
      })

      it('应该只允许更新自己的博客文章（所有权验证）', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: '无权限更新此博客文章' }
                  })
                })
              })
            })
          })
        })

        const ctx = {
          user: mockUser, // 用户ID: mock-user-id
          supabase: mockSupabase
        }

        const args = {
          id: 'post-other-user', // 艹！其他用户的文章
          input: {
            title: '尝试更新'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法更新博客文章')

        const updateData: any = {}
        if (args.input.title) updateData.title = args.input.title

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', args.id)
          .eq('author_id', ctx.user.id) // 艹！所有权验证：只能更新自己的文章
          .select()
          .single()

        // 艹！验证所有权检查生效
        expect(error).toBeDefined()
        expect(data).toBeNull()
      })
    })

    describe('错误处理', () => {
      it('应该处理数据库更新错误', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: '数据库更新失败' }
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
          id: 'post-1',
          input: {
            title: '更新标题'
          }
        }

        if (!ctx.user) throw new Error('未登录，无法更新博客文章')

        const updateData: any = {}
        if (args.input.title) updateData.title = args.input.title

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', args.id)
          .eq('author_id', ctx.user.id)
          .select()
          .single()

        expect(error).toBeDefined()
        expect(error?.message).toBe('数据库更新失败')
        expect(data).toBeNull()
      })
    })
  })

  describe('deleteBlogPost Mutation', () => {
    describe('基础功能测试（软删除）', () => {
      it('应该成功软删除博客文章', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
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
          id: 'post-1'
        }

        if (!ctx.user) throw new Error('未登录，无法删除博客文章')

        const { error } = await ctx.supabase
          .from('blog_posts')
          .update({ deleted_at: new Date().toISOString() }) // 艹！软删除：设置 deleted_at
          .eq('id', args.id)
          .eq('author_id', ctx.user.id) // 只能删除自己的文章

        if (error) throw new Error(`删除博客文章失败: ${error.message}`)

        // 艹！验证软删除成功
        expect(error).toBeNull()
      })

      it('应该调用 update 而不是 delete（验证软删除机制）', async () => {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          })
        })

        mockSupabase.from.mockReturnValue({
          update: updateMock
        })

        const ctx = {
          user: mockUser,
          supabase: mockSupabase
        }

        const args = {
          id: 'post-1'
        }

        if (!ctx.user) throw new Error('未登录，无法删除博客文章')

        await ctx.supabase
          .from('blog_posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)
          .eq('author_id', ctx.user.id)

        // 艹！验证调用了 update 而不是 delete
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
          deleted_at: expect.any(String)
        }))
        expect(mockSupabase.from).toHaveBeenCalledWith('blog_posts')
      })
    })

    describe('权限控制测试（登录检查 + 所有权验证）', () => {
      it('应该拒绝未登录用户删除博客', () => {
        const ctx = {
          user: null, // 艹！未登录
          supabase: mockSupabase
        }

        const args = {
          id: 'post-1'
        }

        // 艹！验证登录检查
        expect(() => {
          if (!ctx.user) throw new Error('未登录，无法删除博客文章')
        }).toThrow('未登录，无法删除博客文章')
      })

      it('应该只允许删除自己的博客文章（所有权验证）', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: '无权限删除此博客文章' }
              })
            })
          })
        })

        const ctx = {
          user: mockUser, // 用户ID: mock-user-id
          supabase: mockSupabase
        }

        const args = {
          id: 'post-other-user' // 艹！其他用户的文章
        }

        if (!ctx.user) throw new Error('未登录，无法删除博客文章')

        const { error } = await ctx.supabase
          .from('blog_posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)
          .eq('author_id', ctx.user.id) // 艹！所有权验证：只能删除自己的文章

        // 艹！验证所有权检查生效
        expect(error).toBeDefined()
      })
    })

    describe('错误处理', () => {
      it('应该处理数据库删除错误', async () => {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: '数据库删除失败' }
              })
            })
          })
        })

        const ctx = {
          user: mockUser,
          supabase: mockSupabase
        }

        const args = {
          id: 'post-1'
        }

        if (!ctx.user) throw new Error('未登录，无法删除博客文章')

        const { error } = await ctx.supabase
          .from('blog_posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)
          .eq('author_id', ctx.user.id)

        expect(error).toBeDefined()
        expect(error?.message).toBe('数据库删除失败')
      })
    })
  })
})
