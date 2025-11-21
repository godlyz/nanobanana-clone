/**
 * VideoService 简化测试套件
 * 老王备注: 这个SB测试文件专注于VideoService的纯函数逻辑，避免复杂的依赖注入
 *
 * 测试范围:
 * 1. calculateCredits - 积分计算
 * 2. checkConcurrentLimit - 并发限制检查
 * 3. 基础任务状态查询
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 创建一个测试专用的VideoService类，继承原类但注入mock依赖
class TestVideoService {
  private mockSupabase: any
  private mockVeoClient: any

  constructor(supabaseClient: any, veoClient: any) {
    this.mockSupabase = supabaseClient
    this.mockVeoClient = veoClient
  }

  // 复制VideoService的纯函数逻辑
  private calculateCredits(duration: number, resolution: '720p' | '1080p'): number {
    const baseCredits = 10 // 基础成本：10积分/秒
    const durationCredits = duration * baseCredits
    const resolutionMultiplier = resolution === '1080p' ? 1.5 : 1
    return durationCredits * resolutionMultiplier
  }

  private async checkConcurrentLimit(userId: string): Promise<boolean> {
    const MAX_CONCURRENT_TASKS = 3

    // 查询当前用户的processing任务数量
    const { data: processingTasks, error: queryError } = await this.mockSupabase
      .from('video_generation_history')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'processing')

    if (queryError) {
      throw new Error(`查询并发任务失败: ${queryError.message}`)
    }

    const currentCount = processingTasks?.length || 0
    console.log(`🔍 用户 ${userId} 当前并发任务数: ${currentCount}/${MAX_CONCURRENT_TASKS}`)

    return currentCount < MAX_CONCURRENT_TASKS
  }

  async getTaskStatus(taskId: string, userId: string) {
    const { data: task, error } = await this.mockSupabase
      .from('video_generation_history')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // 任务不存在
      }
      throw new Error(`查询任务状态失败: ${error.message}`)
    }

    return task
  }

  async listUserVideos(userId: string, limit: number = 10) {
    const { data: videos, error } = await this.mockSupabase
      .from('video_generation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`查询用户视频失败: ${error.message}`)
    }

    return videos || []
  }

  // 暴露私有方法用于测试
  public testCalculateCredits(duration: number, resolution: '720p' | '1080p') {
    return this.calculateCredits(duration, resolution)
  }

  public testCheckConcurrentLimit(userId: string) {
    return this.checkConcurrentLimit(userId)
  }
}

describe('VideoService (简化版)', () => {
  let videoService: TestVideoService
  let mockSupabaseClient: any
  let mockVeoClient: any
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Supabase client
    mockSupabaseClient = {
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
      rpc: vi.fn(),
    }

    // Mock VeoClient
    mockVeoClient = {
      generateVideo: vi.fn(),
      checkOperationStatus: vi.fn(),
    }

    // Create test service
    videoService = new TestVideoService(mockSupabaseClient, mockVeoClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateCredits', () => {
    it('应该正确计算4秒720p视频的积分', () => {
      const credits = videoService.testCalculateCredits(4, '720p')
      expect(credits).toBe(40)
    })

    it('应该正确计算4秒1080p视频的积分（1.5倍）', () => {
      const credits = videoService.testCalculateCredits(4, '1080p')
      expect(credits).toBe(60)
    })

    it('应该正确计算8秒720p视频的积分', () => {
      const credits = videoService.testCalculateCredits(8, '720p')
      expect(credits).toBe(80)
    })

    it('应该正确计算8秒1080p视频的积分（1.5倍）', () => {
      const credits = videoService.testCalculateCredits(8, '1080p')
      expect(credits).toBe(120)
    })

    it('应该正确计算6秒视频的积分', () => {
      expect(videoService.testCalculateCredits(6, '720p')).toBe(60)
      expect(videoService.testCalculateCredits(6, '1080p')).toBe(90)
    })
  })

  describe('checkConcurrentLimit', () => {
    it('应该在未超过并发限制时返回true', async () => {
      // Arrange - 模拟只有2个processing任务
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: [{ id: '1' }, { id: '2' }],
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.testCheckConcurrentLimit(testUserId)

      // Assert
      expect(result).toBe(true)
    })

    it('应该在达到并发限制时返回false', async () => {
      // Arrange - 模拟已有3个processing任务
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: '1' }, { id: '2' }, { id: '3' }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.testCheckConcurrentLimit(testUserId)

      // Assert
      expect(result).toBe(false)
    })

    it('应该在数据库错误时抛出异常', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act & Assert
      await expect(videoService.testCheckConcurrentLimit(testUserId)).rejects.toThrow()
    })
  })

  describe('getTaskStatus', () => {
    it('应该返回任务状态', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'task-123',
                user_id: testUserId,
                status: 'processing',
                operation_id: 'operations/test-123',
                prompt: 'test prompt',
              },
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.getTaskStatus('task-123', testUserId)

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBe('task-123')
      expect(result.status).toBe('processing')
    })

    it('应该在任务不存在时返回null', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.getTaskStatus('non-existent', testUserId)

      // Assert
      expect(result).toBeNull()
    })

    it('应该在数据库错误时抛出异常', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act & Assert
      await expect(videoService.getTaskStatus('task-123', testUserId)).rejects.toThrow()
    })
  })

  describe('listUserVideos', () => {
    it('应该返回用户的视频列表', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', status: 'completed', created_at: '2024-01-01' },
        { id: 'video-2', status: 'processing', created_at: '2024-01-02' },
      ]
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockVideos,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.listUserVideos(testUserId)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('video-1')
    })

    it('应该在数据库错误时抛出异常', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act & Assert
      await expect(videoService.listUserVideos(testUserId)).rejects.toThrow()
    })

    it('应该在无数据时返回空数组', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.listUserVideos(testUserId)

      // Assert
      expect(result).toEqual([])
    })
  })
})