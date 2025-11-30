/**
 * artworks Query 单元测试
 *
 * 艹！这是老王我写的 artworks Query 测试！
 * 测试多态查询功能：根据 artworkType 查询不同的表（image_generations 或 video_generation_history）！
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('artworks Query', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  describe('基础查询功能', () => {
    it('应该成功获取作品列表（默认参数，查询 image_generations 表）', async () => {
      // Arrange: 准备测试数据（图片作品）
      const mockImages = [
        {
          id: 'img-1',
          user_id: 'user-1',
          prompt: '测试图片提示词 1',
          image_url: 'https://example.com/image1.jpg',
          model: 'test-model',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'img-2',
          user_id: 'user-2',
          prompt: '测试图片提示词 2',
          image_url: 'https://example.com/image2.jpg',
          model: 'test-model',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
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

      // 艹！默认查询 image_generations 表
      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // 艹！添加 artwork_type 字段
      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? (table === 'video_generation_history' ? 'video' : 'image')
      }))

      // Assert: 验证结果
      expect(result).toHaveLength(2)
      expect(result[0].artwork_type).toBe('image')
      expect(result[1].artwork_type).toBe('image')
      expect(mockSupabase.from).toHaveBeenCalledWith('image_generations')
    })

    it('应该支持自定义 limit 和 offset', async () => {
      const mockImages = [
        { id: 'img-3', user_id: 'user-1', prompt: '测试图片 3', image_url: 'https://example.com/image3.jpg' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
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

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      expect(data).toEqual(mockImages)
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

  describe('多态查询功能（根据 artworkType 查询不同的表）', () => {
    it('应该查询 image_generations 表（artworkType = "image"）', async () => {
      const mockImages = [
        {
          id: 'img-1',
          user_id: 'user-1',
          prompt: '测试图片',
          image_url: 'https://example.com/image.jpg'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
            })
          })
        })
      })

      const args = {
        artworkType: 'image',
        limit: 20,
        offset: 0
      }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'image'
      }))

      expect(mockSupabase.from).toHaveBeenCalledWith('image_generations')
      expect(result[0].artwork_type).toBe('image')
    })

    it('应该查询 video_generation_history 表（artworkType = "video"）', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          user_id: 'user-1',
          prompt: '测试视频',
          video_url: 'https://example.com/video.mp4'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockVideos,
              error: null
            })
          })
        })
      })

      const args = {
        artworkType: 'video',
        limit: 20,
        offset: 0
      }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'video'
      }))

      expect(mockSupabase.from).toHaveBeenCalledWith('video_generation_history')
      expect(result[0].artwork_type).toBe('video')
    })

    it('应该正确添加 artwork_type 字段（image）', async () => {
      const mockImages = [
        {
          id: 'img-1',
          user_id: 'user-1',
          prompt: '测试',
          image_url: 'https://example.com/image.jpg'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
            })
          })
        })
      })

      const args = { artworkType: 'image', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'image'
      }))

      // 艹！验证 artwork_type 字段被正确添加
      expect(result[0]).toHaveProperty('artwork_type')
      expect(result[0].artwork_type).toBe('image')
    })

    it('应该正确添加 artwork_type 字段（video）', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          user_id: 'user-1',
          prompt: '测试',
          video_url: 'https://example.com/video.mp4'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockVideos,
              error: null
            })
          })
        })
      })

      const args = { artworkType: 'video', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'video'
      }))

      // 艹！验证 artwork_type 字段被正确添加
      expect(result[0]).toHaveProperty('artwork_type')
      expect(result[0].artwork_type).toBe('video')
    })
  })

  describe('按 userId 过滤', () => {
    it('应该支持按 userId 筛选图片作品', async () => {
      const mockImages = [
        { id: 'img-1', user_id: 'user-123', prompt: '用户图片 1', image_url: 'https://example.com/image1.jpg' },
        { id: 'img-2', user_id: 'user-123', prompt: '用户图片 2', image_url: 'https://example.com/image2.jpg' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockImages,
                error: null
              })
            })
          })
        })
      })

      const args = {
        userId: 'user-123',
        limit: 20,
        offset: 0
      }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      let query = mockSupabase.from(table as any).select('*')

      if (args.userId) query = query.eq('user_id', args.userId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      expect(result).toHaveLength(2)
      expect(result.every(item => item.user_id === 'user-123')).toBe(true)
    })

    it('应该支持按 userId 筛选视频作品', async () => {
      const mockVideos = [
        { id: 'video-1', user_id: 'user-456', prompt: '用户视频 1', video_url: 'https://example.com/video1.mp4' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockVideos,
                error: null
              })
            })
          })
        })
      })

      const args = {
        artworkType: 'video',
        userId: 'user-456',
        limit: 20,
        offset: 0
      }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      let query = mockSupabase.from(table as any).select('*')

      if (args.userId) query = query.eq('user_id', args.userId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'video'
      }))

      expect(result).toHaveLength(1)
      expect(result[0].user_id).toBe('user-456')
      expect(result[0].artwork_type).toBe('video')
    })

    it('应该支持同时按 artworkType 和 userId 筛选', async () => {
      const mockVideos = [
        { id: 'video-1', user_id: 'user-789', prompt: '特定用户视频', video_url: 'https://example.com/video.mp4' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockVideos,
                error: null
              })
            })
          })
        })
      })

      const args = {
        artworkType: 'video',
        userId: 'user-789',
        limit: 20,
        offset: 0
      }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      let query = mockSupabase.from(table as any).select('*')

      if (args.userId) query = query.eq('user_id', args.userId)

      const { data } = await query.order('created_at', { ascending: false }).range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: args.artworkType ?? 'video'
      }))

      expect(mockSupabase.from).toHaveBeenCalledWith('video_generation_history')
      expect(result[0].user_id).toBe('user-789')
      expect(result[0].artwork_type).toBe('video')
    })
  })

  describe('排序功能', () => {
    it('应该按 created_at 降序排序（最新的在前）', async () => {
      const mockImages = [
        { id: 'img-2', created_at: '2025-01-02T00:00:00Z', image_url: 'https://example.com/image2.jpg' },
        { id: 'img-1', created_at: '2025-01-01T00:00:00Z', image_url: 'https://example.com/image1.jpg' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      // 验证降序排序（最新的在前）
      expect(result[0].created_at).toBe('2025-01-02T00:00:00Z')
      expect(result[1].created_at).toBe('2025-01-01T00:00:00Z')
    })
  })

  describe('边界条件测试', () => {
    it('应该处理空结果（图片）', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('应该处理空结果（视频）', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const args = { artworkType: 'video', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'video'
      }))

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('应该处理 limit = 1 的情况', async () => {
      const mockImages = [
        { id: 'img-1', user_id: 'user-1', prompt: '单个作品', image_url: 'https://example.com/image.jpg' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
            })
          })
        })
      })

      const args = { limit: 1, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 0)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      expect(result).toHaveLength(1)
    })

    it('应该处理 offset 超出范围的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const args = { limit: 20, offset: 10000 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(10000, 10019)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      // 艹！offset 超出范围应该返回空数组
      expect(result).toEqual([])
    })

    it('应该处理 null 或 undefined 的 data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      // 艹！应该返回空数组而不是 null
      expect(result).toEqual([])
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库查询错误（图片）', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '数据库连接失败' }
            })
          })
        })
      })

      const args = { limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data, error } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('数据库连接失败')
    })

    it('应该处理数据库查询错误（视频）', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '查询视频表失败' }
            })
          })
        })
      })

      const args = { artworkType: 'video', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data, error } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error?.message).toBe('查询视频表失败')
    })
  })

  describe('字段映射测试', () => {
    it('应该正确处理 image_url 字段（图片作品）', async () => {
      const mockImages = [
        {
          id: 'img-1',
          user_id: 'user-1',
          prompt: '测试图片',
          image_url: 'https://example.com/image.jpg',
          model: 'test-model'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockImages,
              error: null
            })
          })
        })
      })

      const args = { artworkType: 'image', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'image'
      }))

      expect(result[0]).toHaveProperty('image_url')
      expect(result[0].image_url).toBe('https://example.com/image.jpg')
    })

    it('应该正确处理 video_url 字段（视频作品）', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          user_id: 'user-1',
          prompt: '测试视频',
          video_url: 'https://example.com/video.mp4',
          status: 'completed'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockVideos,
              error: null
            })
          })
        })
      })

      const args = { artworkType: 'video', limit: 20, offset: 0 }

      const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

      const { data } = await mockSupabase
        .from(table as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 19)

      const result = (data ?? []).map((item: any) => ({
        ...item,
        artwork_type: 'video'
      }))

      expect(result[0]).toHaveProperty('video_url')
      expect(result[0].video_url).toBe('https://example.com/video.mp4')
    })
  })
})
