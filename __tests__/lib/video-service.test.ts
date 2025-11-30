/**
 * VideoService 测试套件
 * 老王备注: 这个SB测试文件覆盖视频生成业务逻辑的核心功能
 *
 * 测试范围:
 * 1. createVideoTask - 创建视频任务（含积分扣除）
 * 2. getTaskStatus - 获取任务状态
 * 3. listUserVideos - 列出用户视频
 * 4. downloadAndStoreVideo - 下载存储视频
 * 5. refundFailedGeneration / refundFailedTask - 退款逻辑
 * 6. calculateCredits - 积分计算
 * 7. checkConcurrentLimit - 并发限制检查
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VideoService } from '@/lib/video-service'
import { VeoClient } from '@/lib/veo-client'

// 🔥 老王修复：创建完整的 Supabase mock chain（所有方法均返回this实现链式，最后通过single/maybeSingle/then执行Promise）
const createMockQueryBuilder = (mockData: any = { data: null, error: null, count: 0 }) => {
  const mockChain: any = {}

  // 所有链式方法（返回this）
  const chainMethods = ['select', 'eq', 'in', 'gt', 'lt', 'gte', 'lte', 'neq', 'ilike', 'is', 'not', 'or', 'order', 'limit', 'range', 'insert', 'update', 'upsert', 'delete']
  chainMethods.forEach(method => {
    mockChain[method] = vi.fn(() => mockChain) // 关键：返回自身，实现链式调用
  })

  // 终止方法（返回Promise）
  mockChain.single = vi.fn().mockResolvedValue(mockData)
  mockChain.maybeSingle = vi.fn().mockResolvedValue(mockData)

  // then方法（让链式对象变成thenable，支持await）
  mockChain.then = vi.fn((onFulfilled: any) => Promise.resolve(mockData).then(onFulfilled))

  return mockChain
}

// 创建全局 mock supabase client（默认返回空数据，每个测试可以覆盖）
const mockSupabaseClient: any = {
  from: vi.fn((table: string) => createMockQueryBuilder()),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/video.mp4' } }),
    })),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}

// Mock VeoClient
vi.mock('@/lib/veo-client', () => ({
  VeoClient: vi.fn().mockImplementation(() => ({
    generateVideo: vi.fn(),
    checkOperationStatus: vi.fn(),
  })),
  getVeoClient: vi.fn(),
}))

// Mock CreditService
vi.mock('@/lib/credit-service', () => ({
  CreditService: vi.fn().mockImplementation(() => ({
    deductCredits: vi.fn().mockResolvedValue(undefined), // 🔥 老王修复：deductCredits 返回 Promise<void>
    getUserAvailableCredits: vi.fn().mockResolvedValue(100),
    addCredits: vi.fn().mockResolvedValue(undefined), // 🔥 老王修复：addCredits 返回 Promise<void>
    validateVideoTransaction: vi.fn().mockResolvedValue({ valid: true }), // 🔥 老王修复：返回 { valid: boolean }
  })),
}))

// Mock fetch for video download
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('VideoService', () => {
  let videoService: VideoService
  let mockVeoClient: any
  let mockCreditService: any
  const testUserId = 'test-user-123'

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock VeoClient instance
    mockVeoClient = {
      generateVideo: vi.fn(),
      checkOperationStatus: vi.fn(),
    }

    // Create mock CreditService instance
    mockCreditService = {
      deductCredits: vi.fn().mockResolvedValue(undefined),
      getUserAvailableCredits: vi.fn().mockResolvedValue(100),
      addCredits: vi.fn().mockResolvedValue(undefined),
      validateVideoTransaction: vi.fn().mockResolvedValue({ valid: true }),
    }

    // 🔥 老王核心修复：直接通过构造函数注入所有 mock 依赖（依赖注入模式）
    videoService = new VideoService(
      mockSupabaseClient as any,
      mockVeoClient as any,
      mockCreditService as any
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateCredits', () => {
    it('应该正确计算4秒720p视频的积分', () => {
      // 4s * 10 credits/s = 40 credits
      const credits = (videoService as any).calculateCredits(4, '720p')
      expect(credits).toBe(40)
    })

    it('应该正确计算4秒1080p视频的积分（1.5倍）', () => {
      // 4s * 10 credits/s * 1.5 = 60 credits
      const credits = (videoService as any).calculateCredits(4, '1080p')
      expect(credits).toBe(60)
    })

    it('应该正确计算8秒720p视频的积分', () => {
      // 8s * 10 credits/s = 80 credits
      const credits = (videoService as any).calculateCredits(8, '720p')
      expect(credits).toBe(80)
    })

    it('应该正确计算8秒1080p视频的积分（1.5倍）', () => {
      // 8s * 10 credits/s * 1.5 = 120 credits
      const credits = (videoService as any).calculateCredits(8, '1080p')
      expect(credits).toBe(120)
    })

    it('应该正确计算6秒视频的积分', () => {
      // 6s * 10 = 60 (720p), 6s * 10 * 1.5 = 90 (1080p)
      expect((videoService as any).calculateCredits(6, '720p')).toBe(60)
      expect((videoService as any).calculateCredits(6, '1080p')).toBe(90)
    })
  })

  describe('getConcurrentLimitByPlan', () => {
    it('应该为 Basic 套餐返回并发限制 1', async () => {
      // Arrange - 模拟 Basic 套餐用户
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'basic' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const limit = await (videoService as any).getConcurrentLimitByPlan(testUserId)

      // Assert
      expect(limit).toBe(1)
    })

    it('应该为 Pro 套餐返回并发限制 2', async () => {
      // Arrange - 模拟 Pro 套餐用户
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'pro' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const limit = await (videoService as any).getConcurrentLimitByPlan(testUserId)

      // Assert
      expect(limit).toBe(2)
    })

    it('应该为 Max 套餐返回并发限制 3', async () => {
      // Arrange - 模拟 Max 套餐用户
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'max' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const limit = await (videoService as any).getConcurrentLimitByPlan(testUserId)

      // Assert
      expect(limit).toBe(3)
    })

    it('应该为无有效订阅的用户返回默认并发限制 1', async () => {
      // Arrange - 模拟无订阅用户
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // 无订阅
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const limit = await (videoService as any).getConcurrentLimitByPlan(testUserId)

      // Assert
      expect(limit).toBe(1)
    })

    it('应该为未知套餐类型返回默认并发限制 1', async () => {
      // Arrange - 模拟未知套餐类型
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'unknown-plan' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const limit = await (videoService as any).getConcurrentLimitByPlan(testUserId)

      // Assert
      expect(limit).toBe(1)
    })
  })

  describe('checkConcurrentLimit', () => {
    it('应该在未超过并发限制时返回 canCreate=true', async () => {
      // Arrange - 模拟只有1个processing任务，Basic用户（limit=1）
      const mockSelectCount = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
            count: 0, // 当前0个任务
          }),
        }),
      })

      const mockSelectSubscription = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'basic' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return { select: mockSelectCount }
        }
        if (table === 'user_subscriptions') {
          return { select: mockSelectSubscription }
        }
        return {}
      })

      // Act
      const result = await (videoService as any).checkConcurrentLimit(testUserId)

      // Assert
      expect(result).toEqual({
        canCreate: true,
        limit: 1,
        current: 0,
      })
    })

    it('应该在达到并发限制时返回 canCreate=false', async () => {
      // Arrange - 模拟已有3个processing任务，Max用户（limit=3）
      const mockSelectCount = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
            count: 3, // 当前3个任务
          }),
        }),
      })

      const mockSelectSubscription = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'max' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return { select: mockSelectCount }
        }
        if (table === 'user_subscriptions') {
          return { select: mockSelectSubscription }
        }
        return {}
      })

      // Act
      const result = await (videoService as any).checkConcurrentLimit(testUserId)

      // Assert
      expect(result).toEqual({
        canCreate: false,
        limit: 3,
        current: 3,
      })
    })

    it('应该在数据库错误时抛出异常', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act & Assert
      await expect((videoService as any).checkConcurrentLimit(testUserId)).rejects.toThrow()
    })

    it('应该为 Pro 用户正确返回 limit=2', async () => {
      // Arrange - Pro用户，当前1个任务
      const mockSelectCount = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
            count: 1,
          }),
        }),
      })

      const mockSelectSubscription = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'pro' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return { select: mockSelectCount }
        }
        if (table === 'user_subscriptions') {
          return { select: mockSelectSubscription }
        }
        return {}
      })

      // Act
      const result = await (videoService as any).checkConcurrentLimit(testUserId)

      // Assert
      expect(result).toEqual({
        canCreate: true,
        limit: 2,
        current: 1,
      })
    })
  })

  describe('createVideoTask', () => {
    const defaultParams = {
      userId: testUserId,
      prompt: '一只可爱的猫咪在阳光下玩耍',
      duration: 4 as const,
      resolution: '720p' as const,
      aspectRatio: '16:9' as const,
      generationMode: 'text-to-video' as const, // 🔥 老王修复：参数名是 generationMode 不是 mode
    }

    beforeEach(() => {
      // 🔥 老王修复：并发限制检查需要查询两个表
      // 1) video_generation_history: 查询进行中任务数
      const mockSelectConcurrent = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      })

      // 2) user_subscriptions: 查询用户套餐等级
      const mockSelectSubscription = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'basic' }, // 默认basic套餐，限制1个
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      // 🔥 老王修复：默认 mock creditService.deductCredits 成功（积分足够）
      ;(videoService as any).creditService.deductCredits = vi.fn().mockResolvedValue(undefined)

      // 默认mock：VeoClient成功
      mockVeoClient.generateVideo.mockResolvedValue({
        operationId: 'operations/test-123',
        status: 'processing',
        estimatedCompletionTime: new Date().toISOString(),
      })

      // 默认mock：数据库插入成功
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'task-123',
              user_id: testUserId,
              status: 'processing',
              operation_id: 'operations/test-123',
            },
            error: null,
          }),
        }),
      })

      // 🔥 关键修复：正确处理两个表的查询
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return {
            select: mockSelectConcurrent,
            insert: mockInsert,
          }
        }
        if (table === 'user_subscriptions') {
          return { select: mockSelectSubscription }
        }
        return { select: mockSelectConcurrent }
      })
    })

    it('应该成功创建视频任务', async () => {
      // Act
      const result = await videoService.createVideoTask(defaultParams)

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBe('task-123')
      expect(mockVeoClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: defaultParams.prompt,
          duration: defaultParams.duration,
          resolution: defaultParams.resolution,
          aspectRatio: defaultParams.aspectRatio,
        })
      )
    })

    it('应该在并发限制超过时抛出错误', async () => {
      // 🔥 老王修复：正确模拟并发限制达到（basic套餐限制1个，当前已有1个）
      // 1) video_generation_history: count=1 (已有1个进行中任务)
      const mockSelectConcurrent = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: '1' }],
            error: null,
            count: 1, // 已有1个任务进行中
          }),
        }),
      })

      // 2) user_subscriptions: basic套餐 (限制1个)
      const mockSelectSubscription = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { plan_tier: 'basic' }, // basic限制1个
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return { select: mockSelectConcurrent }
        }
        if (table === 'user_subscriptions') {
          return { select: mockSelectSubscription }
        }
        return {}
      })

      // Act & Assert - 检查错误消息包含关键字
      await expect(videoService.createVideoTask(defaultParams)).rejects.toThrow(/CONCURRENT_LIMIT_EXCEEDED|并发/)
    })

    it('应该在积分不足时抛出错误', async () => {
      // 🔥 老王修复：mock creditService.deductCredits 抛出积分不足错误
      ;(videoService as any).creditService.deductCredits = vi
        .fn()
        .mockRejectedValue(new Error('INSUFFICIENT_CREDITS: 积分不足，无法创建视频生成任务'))

      // Act & Assert
      await expect(videoService.createVideoTask(defaultParams)).rejects.toThrow(/INSUFFICIENT_CREDITS|积分不足/)
    })

    it('应该正确传递negativePrompt参数', async () => {
      // Arrange
      const paramsWithNegative = {
        ...defaultParams,
        negativePrompt: '低质量,模糊',
      }

      // Act
      await videoService.createVideoTask(paramsWithNegative)

      // Assert
      expect(mockVeoClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          negativePrompt: '低质量,模糊',
        })
      )
    })

    it('应该正确传递referenceImageUrl参数', async () => {
      // 🔥 老王修复：referenceImageUrl 只在 reference-images 模式下传递
      // Arrange - 需要指定 generationMode 为 'reference-images' 并传递 referenceImages 数组
      const paramsWithImage = {
        ...defaultParams,
        generationMode: 'reference-images' as const, // 🔥 参数名是 generationMode
        referenceImages: ['https://example.com/image.jpg'],
        referenceImageSources: ['url'],
      }

      // Act
      await videoService.createVideoTask(paramsWithImage)

      // Assert - 检查 VeoClient 收到的参数包含第一张参考图片
      expect(mockVeoClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceImageUrl: 'https://example.com/image.jpg',
        })
      )
    })
  })

  describe('getTaskStatus', () => {
    it('应该返回任务状态', async () => {
      // 🔥 老王修复：getTaskStatus chain 是 .select().eq().single()，只有一个 .eq()
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
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
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act - 🔥 老王修复：getTaskStatus 只有一个参数 taskId
      const result = await videoService.getTaskStatus('task-123')

      // Assert
      expect(result).toBeDefined()
      expect(result!.id).toBe('task-123')
      expect(result!.status).toBe('processing')
    })

    it('应该在任务不存在时返回null', async () => {
      // 🔥 老王修复：chain 是 .select().eq().single()，只有一个 .eq()
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act - 🔥 老王修复：只传一个参数 taskId
      const result = await videoService.getTaskStatus('non-existent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('listUserVideos', () => {
    it('应该返回用户的视频列表', async () => {
      // Arrange
      const mockVideos = [
        { id: 'video-1', status: 'completed', created_at: '2024-01-01' },
        { id: 'video-2', status: 'processing', created_at: '2024-01-02' },
      ]
      // 🔥 老王修复：添加缺失的 .range() 方法
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockVideos,
              error: null,
              count: 2,
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const result = await videoService.listUserVideos(testUserId)

      // Assert
      expect(result.tasks).toHaveLength(2)
      expect(result.tasks[0].id).toBe('video-1')
      expect(result.total).toBe(2)
    })

    it('应该在数据库错误时抛出异常', async () => {
      // Arrange
      // 🔥 老王修复：添加缺失的 .range() 方法
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      // Act & Assert
      await expect(videoService.listUserVideos(testUserId)).rejects.toThrow('DATABASE_ERROR')
    })
  })

  describe('downloadAndStoreVideo', () => {
    const testTaskId = 'task-123'
    const testVideoUrl = 'https://storage.googleapis.com/video/test.mp4'

    it('应该成功下载并存储视频', async () => {
      // 🔥 老王修复：downloadAndStoreVideo 签名是 (taskId, googleUrl)，返回 {success, permanentUrl?, error?}
      // Arrange - mock fetch
      const mockVideoBuffer = new ArrayBuffer(1024)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockVideoBuffer,
      })

      // Mock getTaskStatus: 返回任务信息（用于构建存储路径）
      // 🔥 老王修复：getTaskStatus chain 是 .select().eq().single()，不是 .eq().eq()
      const mockSelectTask = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: testTaskId,
              user_id: testUserId,
            },
            error: null,
          }),
        }),
      })

      // Mock database update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTaskId },
          error: null,
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return {
            select: mockSelectTask,
            update: mockUpdate,
          }
        }
        return {}
      })

      // Mock storage operations
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `${testUserId}/${testTaskId}.mp4` },
        error: null,
      })
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: `https://example.com/videos/${testUserId}/${testTaskId}.mp4` },
      })
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      // Act
      const result = await videoService.downloadAndStoreVideo(testTaskId, testVideoUrl)

      // Assert
      expect(result.success).toBe(true)
      expect(result.permanentUrl).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(testVideoUrl)
      expect(mockUpload).toHaveBeenCalled()
    })

    it('应该在下载失败时返回失败结果', async () => {
      // 🔥 老王修复：不抛错，返回 {success: false, error}
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      // Act
      const result = await videoService.downloadAndStoreVideo(testTaskId, testVideoUrl)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('DOWNLOAD_FAILED')
    })

    it('应该在存储上传失败时返回失败结果', async () => {
      // 🔥 老王修复：不抛错，返回 {success: false, error}
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1024),
      })

      // Mock getTaskStatus
      // 🔥 老王修复：getTaskStatus chain 是 .select().eq().single()
      const mockSelectTask = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: testTaskId,
              user_id: testUserId,
            },
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelectTask })

      // Mock storage upload failure
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
      })

      // Act
      const result = await videoService.downloadAndStoreVideo(testTaskId, testVideoUrl)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('UPLOAD_FAILED')
    })
  })

  describe('refundFailedGeneration', () => {
    it('应该成功退款失败的生成', async () => {
      // 🔥 老王修复：refundFailedGeneration 是 Promise<void>，不返回值
      // Arrange
      const mockTask = {
        id: 'task-123',
        user_id: testUserId,
        credit_cost: 40,
        status: 'failed',
      }

      // 1) Mock getTaskStatus: video_generation_history.select().eq().single()
      // 🔥 老王修复：getTaskStatus chain 是 .select().eq().single()，不是 .eq().eq().single()
      const mockSelectTask = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTask,
            error: null,
          }),
        }),
      })

      // 2) Mock existingRefund check: credit_transactions.select().eq().ilike().maybeSingle()
      const mockSelectCredit = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null, // 没有已存在的退款记录
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'video_generation_history') {
          return { select: mockSelectTask }
        }
        if (table === 'credit_transactions') {
          return { select: mockSelectCredit }
        }
        return {}
      })

      // 🔥 老王修复：refundFailedGeneration 内部调用 refundCredits，而 refundCredits 调用 creditService.addCredits
      ;(videoService as any).creditService.addCredits = vi.fn().mockResolvedValue(undefined)

      // Act
      await videoService.refundFailedGeneration('task-123')

      // Assert - 验证退款函数被调用（检查 addCredits，不是 refund）
      expect((videoService as any).creditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          amount: 40,
          transaction_type: 'video_refund',
          description: expect.stringContaining('task-123')
        })
      )
    })

    it('应该在任务不存在时抛出TASK_NOT_FOUND', async () => {
      // 🔥 老王修复：实际代码会throw Error，不是返回false
      // Arrange - getTaskStatus chain: .select().eq().single()
      const mockSelectTask = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelectTask })

      // Act & Assert
      await expect(videoService.refundFailedGeneration('non-existent')).rejects.toThrow('TASK_NOT_FOUND')
    })
  })

  describe('refundFailedTask', () => {
    it('应该成功退款失败的任务', async () => {
      // 🔥 老王修复：refundFailedTask 是 Promise<void>，参数是 (taskId, userId, creditAmount)
      // Arrange
      const taskId = 'task-123'
      const creditAmount = 60

      // Mock creditService.validateVideoTransaction - 验证通过
      ;(videoService as any).creditService.validateVideoTransaction = vi.fn().mockResolvedValue({
        valid: true,
      })

      // Mock creditService.addCredits - 执行退款
      ;(videoService as any).creditService.addCredits = vi.fn().mockResolvedValue(undefined)

      // Act
      await videoService.refundFailedTask(taskId, testUserId, creditAmount)

      // Assert - 验证调用正确
      expect((videoService as any).creditService.validateVideoTransaction).toHaveBeenCalledWith(
        testUserId,
        'video_refund',
        taskId
      )
      expect((videoService as any).creditService.addCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          amount: creditAmount,
          transaction_type: 'video_refund',
          expires_at: null,
          related_entity_id: taskId,
        })
      )
    })

    it('应该在已退款时抛出DUPLICATE_REFUND错误', async () => {
      // 🔥 老王修复：验证失败时会抛出错误，不是返回false
      // Arrange
      const taskId = 'task-123'
      const creditAmount = 60

      // Mock creditService.validateVideoTransaction - 验证失败（已退款）
      ;(videoService as any).creditService.validateVideoTransaction = vi.fn().mockResolvedValue({
        valid: false,
        reason: 'DUPLICATE_REFUND',
      })

      // Mock creditService.addCredits - 不应被调用
      ;(videoService as any).creditService.addCredits = vi.fn()

      // Act & Assert
      await expect(
        videoService.refundFailedTask(taskId, testUserId, creditAmount)
      ).rejects.toThrow('DUPLICATE_REFUND')

      // 验证 addCredits 未被调用
      expect((videoService as any).creditService.addCredits).not.toHaveBeenCalled()
    })
  })
})

describe('VideoService Integration Scenarios', () => {
  let videoService: VideoService
  let mockVeoClient: any
  let mockCreditService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockVeoClient = {
      generateVideo: vi.fn(),
      checkOperationStatus: vi.fn(),
    }

    // 🔥 老王修复：Integration test也需要mock creditService
    mockCreditService = {
      deductCredits: vi.fn().mockResolvedValue(undefined),
      addCredits: vi.fn().mockResolvedValue(undefined),
      refund: vi.fn().mockResolvedValue(undefined),
      validateVideoTransaction: vi.fn().mockResolvedValue({ valid: true }),
    }

    videoService = new VideoService(mockSupabaseClient as any, mockVeoClient, mockCreditService)
  })

  it('应该处理完整的视频生成流程', async () => {
    // 这是一个集成场景测试
    // 1. 创建任务 -> 2. 轮询状态 -> 3. 下载存储

    // Step 1: 创建任务的mock
    const taskId = 'integration-task-123'
    const operationId = 'operations/integration-123'

    // 🔥 老王修复：使用完整的 createMockQueryBuilder，支持所有链式方法
    // 并发检查通过（count=0）
    const mockConcurrentCheck = createMockQueryBuilder({ data: null, error: null, count: 0 })

    // 积分充足
    mockSupabaseClient.rpc.mockResolvedValue({
      data: 200,
      error: null,
    })

    // VeoClient返回operationId
    mockVeoClient.generateVideo.mockResolvedValue({
      operationId,
      status: 'processing',
    })

    // 数据库插入成功
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: taskId,
            user_id: 'test-user',
            status: 'processing',
            operation_id: operationId,
          },
          error: null,
        }),
      }),
    })

    // 用户订阅查询（返回 basic 套餐）
    const mockSubscriptionQuery = createMockQueryBuilder({
      data: { plan_tier: 'basic' },
      error: null
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'video_generation_history') {
        return {
          ...mockConcurrentCheck, // 包含所有链式方法
          insert: mockInsert,
        }
      }
      if (table === 'user_subscriptions') {
        return mockSubscriptionQuery
      }
      return mockConcurrentCheck
    })

    // Act - 创建任务
    const task = await videoService.createVideoTask({
      userId: 'test-user',
      prompt: '集成测试视频',
      duration: 4,
      resolution: '720p',
      aspectRatio: '16:9',
      mode: 'text-to-video',
    })

    // Assert
    expect(task).toBeDefined()
    expect(task.id).toBe(taskId)
    expect(mockVeoClient.generateVideo).toHaveBeenCalled()
  })
})
