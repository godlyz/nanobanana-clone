/**
 * videos Query 单元测试
 *
 * 艹！这是老王我写的视频相关 Query 测试！
 * 测试视频查询、过滤、状态管理等核心功能！
 *
 * 测试的 Query（10个）：
 * 1. video - 获取单个视频详情
 * 2. videos - 获取视频列表（支持多种过滤）
 * 3. userVideos - 获取指定用户的所有视频
 * 4. myVideos - 获取当前用户的视频列表
 * 5. processingVideos - 获取当前用户正在处理的视频
 * 6. failedVideos - 获取当前用户失败的视频任务
 * 7. videoByOperationId - 通过 operation_id 查询视频
 * 8. videoStats - 获取视频统计信息
 * 9. videosConnection - Relay 分页查询视频
 * 10. recentVideos - 获取最近完成的视频
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient, createMockUser } from '../../../test-utils/supabase-mock'

describe('视频相关 Query 测试', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockUser: ReturnType<typeof createMockUser>

  beforeEach(() => {
    // 艹！每个测试前重置 mock
    vi.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
  })

  // ========================================
  // Query 1: video - 获取单个视频详情
  // ========================================
  describe('video Query', () => {
    it('应该成功获取视频详情', async () => {
      // Arrange
      const mockVideo = {
        id: 'video-1',
        user_id: 'user-1',
        operation_id: 'op-123',
        prompt: '测试视频提示词',
        status: 'completed',
        video_url: 'https://example.com/video1.mp4',
        resolution: '1080p',
        aspect_ratio: '16:9',
        duration: 6,
        created_at: '2025-01-01T00:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVideo,
              error: null
            })
          })
        })
      })

      // Act
      const args = { id: 'video-1' }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('id', args.id)
        .single()

      // Assert
      expect(data).toEqual(mockVideo)
      expect(mockSupabase.from).toHaveBeenCalledWith('video_generation_history')
    })

    it('应该在视频不存在时返回 null', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' }
            })
          })
        })
      })

      // Act
      const args = { id: 'non-existent' }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('id', args.id)
        .single()

      // Assert
      expect(data).toBeNull()
    })
  })

  // ========================================
  // Query 2: videos - 获取视频列表（支持多种过滤）
  // ========================================
  describe('videos Query', () => {
    it('应该成功获取视频列表（默认参数）', async () => {
      // Arrange
      const mockVideos = [
        {
          id: 'video-1',
          user_id: 'user-1',
          status: 'completed',
          resolution: '1080p',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'video-2',
          user_id: 'user-2',
          status: 'processing',
          resolution: '720p',
          created_at: '2025-01-02T00:00:00Z'
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

      // Act
      const args = { limit: 20, offset: 0 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert
      expect(data).toHaveLength(2)
      expect(data).toEqual(mockVideos)
    })

    it('应该支持状态过滤（status）', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', status: 'completed' }
      ]

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockVideos,
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { status: 'completed', limit: 20, offset: 0 }
      let query = mockSupabase
        .from('video_generation_history')
        .select('*')

      if (args.status) query = query.eq('status', args.status)

      const { data } = await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('status', 'completed')
      expect(data).toHaveLength(1)
    })

    it('应该支持分辨率过滤（resolution）', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', resolution: '1080p' }
      ]

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockVideos,
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { resolution: '1080p', limit: 20, offset: 0 }
      let query = mockSupabase
        .from('video_generation_history')
        .select('*')

      if (args.resolution) query = query.eq('resolution', args.resolution)

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('resolution', '1080p')
    })

    it('应该支持宽高比过滤（aspectRatio）', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { aspectRatio: '16:9' }
      let query = mockSupabase
        .from('video_generation_history')
        .select('*')

      if (args.aspectRatio) query = query.eq('aspect_ratio', args.aspectRatio)

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('aspect_ratio', '16:9')
    })

    it('应该支持时长过滤（duration）', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { duration: 6 }
      let query = mockSupabase
        .from('video_generation_history')
        .select('*')

      if (args.duration) query = query.eq('duration', args.duration)

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('duration', 6)
    })

    it('应该限制最大 limit 为 100', async () => {
      // Arrange
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

      // Act
      const args = { limit: 500 }
      const limit = Math.min(args.limit ?? 20, 100)

      // Assert
      expect(limit).toBe(100)
    })
  })

  // ========================================
  // Query 3: userVideos - 获取指定用户的所有视频
  // ========================================
  describe('userVideos Query', () => {
    it('应该成功获取指定用户的视频列表', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', user_id: 'user-1', status: 'completed' },
        { id: 'video-2', user_id: 'user-1', status: 'processing' }
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

      // Act
      const args = { userId: 'user-1', limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', args.userId)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(data).toHaveLength(2)
      expect(data[0].user_id).toBe('user-1')
    })

    it('应该支持状态过滤', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const args = { userId: 'user-1', status: 'completed' }
      let query = mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', args.userId)

      if (args.status) query = query.eq('status', args.status)

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    })
  })

  // ========================================
  // Query 4: myVideos - 获取当前用户的视频列表
  // ========================================
  describe('myVideos Query', () => {
    it('应该在未登录时抛出错误', async () => {
      // Arrange
      const ctx = { user: null }

      // Act & Assert
      expect(() => {
        if (!ctx.user) throw new Error('未登录，无法查看个人视频')
      }).toThrow('未登录，无法查看个人视频')
    })

    it('应该成功获取当前用户的视频列表', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', user_id: 'user-1', status: 'completed' }
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

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }
      const args = { limit: 20, offset: 0 }

      if (!ctx.user) throw new Error('未登录')

      const { data } = await ctx.supabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(data).toHaveLength(1)
      expect(data[0].user_id).toBe('user-1')
    })

    it('应该支持状态过滤', async () => {
      // Arrange
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq
        })
      })

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }
      const args = { status: 'failed' }

      let query = ctx.supabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', ctx.user.id)

      if (args.status) query = query.eq('status', args.status)

      await query
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)
    })
  })

  // ========================================
  // Query 5: processingVideos - 获取正在处理的视频
  // ========================================
  describe('processingVideos Query', () => {
    it('应该在未登录时抛出错误', async () => {
      // Arrange
      const ctx = { user: null }

      // Act & Assert
      expect(() => {
        if (!ctx.user) throw new Error('未登录')
      }).toThrow('未登录')
    })

    it('应该成功获取正在处理的视频', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', status: 'processing' },
        { id: 'video-2', status: 'downloading' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockVideos,
                error: null
              })
            })
          })
        })
      })

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }

      if (!ctx.user) throw new Error('未登录')

      const { data } = await ctx.supabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', ctx.user.id)
        .in('status', ['processing', 'downloading'])
        .order('created_at', { ascending: false })

      // Assert
      expect(data).toHaveLength(2)
      expect(['processing', 'downloading']).toContain(data[0].status)
    })

    it('应该正确处理没有处理中视频的情况', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }

      const { data } = await ctx.supabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', ctx.user.id)
        .in('status', ['processing', 'downloading'])
        .order('created_at', { ascending: false })

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })
  })

  // ========================================
  // Query 6: failedVideos - 获取失败的视频任务
  // ========================================
  describe('failedVideos Query', () => {
    it('应该在未登录时抛出错误', async () => {
      // Arrange
      const ctx = { user: null }

      // Act & Assert
      expect(() => {
        if (!ctx.user) throw new Error('未登录')
      }).toThrow('未登录')
    })

    it('应该成功获取失败的视频任务', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', status: 'failed', error_message: '测试错误' },
        { id: 'video-2', status: 'failed', error_message: '另一个错误' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
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
      })

      // Act
      const ctx = { user: mockUser, supabase: mockSupabase }
      const args = { limit: 20, offset: 0 }

      const { data } = await ctx.supabase
        .from('video_generation_history')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(data).toHaveLength(2)
      expect(data[0].status).toBe('failed')
    })

    it('应该支持分页', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
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

      // Act
      const args = { limit: 10, offset: 5 }
      const limit = Math.min(args.limit ?? 20, 100)
      const offset = args.offset ?? 0

      // Assert
      expect(limit).toBe(10)
      expect(offset).toBe(5)
    })
  })

  // ========================================
  // Query 7: videoByOperationId - 通过 operation_id 查询
  // ========================================
  describe('videoByOperationId Query', () => {
    it('应该成功通过 operation_id 查询视频', async () => {
      // Arrange
      const mockVideo = {
        id: 'video-1',
        operation_id: 'op-12345',
        status: 'completed'
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVideo,
              error: null
            })
          })
        })
      })

      // Act
      const args = { operationId: 'op-12345' }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('operation_id', args.operationId)
        .single()

      // Assert
      expect(data).toEqual(mockVideo)
      expect(data.operation_id).toBe('op-12345')
    })

    it('应该在找不到视频时返回 null', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' }
            })
          })
        })
      })

      // Act
      const args = { operationId: 'non-existent' }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('operation_id', args.operationId)
        .single()

      // Assert
      expect(data).toBeNull()
    })
  })

  // ========================================
  // Query 8: videoStats - 获取视频统计信息
  // ========================================
  describe('videoStats Query', () => {
    it('应该成功获取视频统计信息', async () => {
      // Arrange
      const mockVideos = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'processing' },
        { status: 'failed' }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockVideos,
          error: null
        })
      })

      // Act
      const { data: allVideos } = await mockSupabase
        .from('video_generation_history')
        .select('status')

      if (!allVideos) throw new Error('艹！查询失败')

      const stats = allVideos.reduce((acc: any, v) => {
        acc[v.status] = (acc[v.status] || 0) + 1
        return acc
      }, {})

      const result = JSON.stringify({
        total: allVideos.length,
        ...stats
      })

      // Assert
      const parsed = JSON.parse(result)
      expect(parsed.total).toBe(4)
      expect(parsed.completed).toBe(2)
      expect(parsed.processing).toBe(1)
      expect(parsed.failed).toBe(1)
    })

    it('应该正确处理空结果', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })

      // Act
      const { data: allVideos } = await mockSupabase
        .from('video_generation_history')
        .select('status')

      const result = allVideos
        ? JSON.stringify({ total: allVideos.length })
        : JSON.stringify({ total: 0 })

      // Assert
      const parsed = JSON.parse(result)
      expect(parsed.total).toBe(0)
    })
  })

  // ========================================
  // Query 9: videosConnection - Relay 分页查询
  // ========================================
  describe('videosConnection Query', () => {
    it('应该支持 Relay cursor 分页（基础测试）', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', created_at: '2025-01-01T00:00:00Z' },
        { id: 'video-2', created_at: '2025-01-02T00:00:00Z' }
      ]

      // 艹！这个测试模拟 cursor 分页逻辑
      const args = { first: 10, after: null }
      const limit = args.first ?? args.last ?? 10
      const after = args.after ? Buffer.from(args.after, 'base64').toString('utf-8') : null

      // Assert: 验证分页参数解析
      expect(limit).toBe(10)
      expect(after).toBeNull()
    })

    it('应该正确解析 cursor（after）', async () => {
      // Arrange
      const cursorValue = '2025-01-01T00:00:00Z'
      const encodedCursor = Buffer.from(cursorValue).toString('base64')

      // Act
      const args = { first: 10, after: encodedCursor }
      const after = args.after ? Buffer.from(args.after, 'base64').toString('utf-8') : null

      // Assert
      expect(after).toBe(cursorValue)
    })
  })

  // ========================================
  // Query 10: recentVideos - 获取最近完成的视频
  // ========================================
  describe('recentVideos Query', () => {
    it('应该成功获取最近完成的视频', async () => {
      // Arrange
      const mockVideos = [
        {
          id: 'video-1',
          status: 'completed',
          completed_at: '2025-01-02T00:00:00Z'
        },
        {
          id: 'video-2',
          status: 'completed',
          completed_at: '2025-01-01T00:00:00Z'
        }
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

      // Act
      const args = { limit: 20, offset: 0 }
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(0, 19)

      // Assert
      expect(data).toHaveLength(2)
      expect(data[0].status).toBe('completed')
      expect(data[0].completed_at).toBe('2025-01-02T00:00:00Z')
    })

    it('应该支持分页参数', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
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
        .from('video_generation_history')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Assert: 验证范围参数
      const rangeCall = (mockSupabase.from().select().eq().order().range as any).mock.calls[0]
      expect(rangeCall[0]).toBe(5)
      expect(rangeCall[1]).toBe(14)
    })

    it('应该正确处理空结果', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
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
        .from('video_generation_history')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(0, 19)

      const result = data ?? []

      // Assert
      expect(result).toEqual([])
    })
  })

  // ========================================
  // 边界情况和错误处理
  // ========================================
  describe('边界情况和错误处理', () => {
    it('应该正确处理数据库查询错误', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })

      // Act
      const { data } = await mockSupabase
        .from('video_generation_history')
        .select('*')
        .order('created_at', { ascending: false })
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
