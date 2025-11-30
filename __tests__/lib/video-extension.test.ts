/**
 * Video Extension 业务逻辑测试
 * 老王备注: 这个SB测试文件专门测试视频延长功能的核心业务逻辑
 *
 * 测试范围:
 * 1. VideoService.extendVideoTask - 延长任务创建逻辑
 * 2. 参数验证 - 源视频检查、延长限制验证
 * 3. 数据库操作 - extend-video记录创建、关联关系
 * 4. 业务规则 - 720p限制、148秒限制、积分扣除
 * 5. 错误处理 - 无效视频、权限检查、地区限制
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VideoService } from '@/lib/video-service'
import { validateVideoParameters, getAllowedPersonGenerationOptions, canExtendVideo } from '@/lib/video-parameter-validator'

// 🔥 老王修复：创建完整的 Supabase mock chain
const createMockQueryBuilder = (mockData: any = { data: null, error: null, count: 0 }) => {
  const mockChain: any = {}

  // 所有链式方法（返回this）
  const chainMethods = ['select', 'eq', 'in', 'gt', 'lt', 'gte', 'lte', 'neq', 'ilike', 'is', 'not', 'or', 'order', 'limit', 'range', 'insert', 'update', 'upsert', 'delete']
  chainMethods.forEach(method => {
    mockChain[method] = vi.fn(() => mockChain)
  })

  // 终止方法（返回Promise）
  mockChain.single = vi.fn().mockResolvedValue(mockData)
  mockChain.maybeSingle = vi.fn().mockResolvedValue(mockData)

  // then方法
  mockChain.then = vi.fn((onFulfilled: any) => Promise.resolve(mockData).then(onFulfilled))

  return mockChain
}

// 创建全局 mock supabase client
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
const mockVeoClient = {
  extendVideo: vi.fn().mockResolvedValue({
    task_id: 'gemini-extend-task-id',
    status: 'processing'
  })
}

// Mock credit service
const mockCreditService = {
  deductCredits: vi.fn().mockResolvedValue({ success: true, credits: 40 }),
  refundCredits: vi.fn().mockResolvedValue({ success: true, credits: 40 })
}

describe('VideoExtension 业务逻辑测试', () => {
  let videoService: VideoService
  const testUserId = 'test-user-id'
  const testSourceVideoId = 'source-video-id'

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks()

    // 创建VideoService实例并注入mock
    videoService = new VideoService(mockSupabaseClient, mockVeoClient as any, mockCreditService)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extendVideoTask - 核心延长功能', () => {
    it('应该成功创建延长任务', async () => {
      // Mock源视频查询
      const mockSourceVideo = {
        id: testSourceVideoId,
        user_id: testUserId,
        generation_mode: 'text-to-video',
        resolution: '720p',
        duration_seconds: 10,
        gemini_video_uri: 'gs://bucket/video.mp4',
        prompt: '原始场景描述',
        status: 'completed'
      }

      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: mockSourceVideo,
        error: null
      }))

      // Mock延长任务创建
      const mockExtendTask = {
        id: 'extend-task-id',
        generation_mode: 'extend-video',
        source_video_id: testSourceVideoId,
        status: 'pending'
      }

      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: mockExtendTask,
        error: null
      }))

      const result = await videoService.extendVideoTask(
        testUserId,
        testSourceVideoId,
        '继续这个场景',
        'allow_adult'
      )

      expect(result).toMatchObject({
        success: true,
        task_id: 'extend-task-id',
        credit_cost: 40,
        message: expect.stringContaining('视频延长任务创建成功')
      })

      // 验证数据库操作
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('video_generation_history')
      expect(mockVeoClient.extendVideo).toHaveBeenCalledWith(
        'gs://bucket/video.mp4',
        expect.stringContaining('原始场景描述'),
        expect.stringContaining('继续这个场景'),
        'allow_adult'
      )
    })

    it('应该使用默认person_generation值（allow_adult）', async () => {
      // Mock源视频查询
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 5,
          gemini_video_uri: 'gs://bucket/video.mp4'
        },
        error: null
      }))

      // Mock任务创建
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: { id: 'extend-task-id' },
        error: null
      }))

      const result = await videoService.extendVideoTask(
        testUserId,
        testSourceVideoId,
        '继续场景'
        // 不提供 person_generation
      )

      expect(result.success).toBe(true)
      expect(mockVeoClient.extendVideo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('继续场景'),
        'allow_adult' // 默认值
      )
    })
  })

  describe('源视频验证', () => {
    it('应该拒绝不存在的源视频', async () => {
      // Mock源视频不存在
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: null,
        error: { message: 'No rows returned' }
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('源视频不存在')

      expect(mockVeoClient.extendVideo).not.toHaveBeenCalled()
    })

    it('应该拒绝属于其他用户的源视频', async () => {
      // Mock属于其他用户的源视频
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: 'other-user-id', // 不同的用户ID
          resolution: '720p',
          duration_seconds: 10,
          gemini_video_uri: 'gs://bucket/video.mp4'
        },
        error: null
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('源视频不存在')
    })

    it('应该拒绝未完成的源视频', async () => {
      // Mock处理中的源视频
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 10,
          gemini_video_uri: 'gs://bucket/video.mp4',
          status: 'processing' // 处理中状态
        },
        error: null
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('只能延长已完成的视频')
    })
  })

  describe('延长限制验证', () => {
    it('应该拒绝1080p分辨率的源视频', async () => {
      // Mock 1080p源视频
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '1080p', // 1080p分辨率
          duration_seconds: 10,
          gemini_video_uri: 'gs://bucket/video.mp4',
          status: 'completed'
        },
        error: null
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('视频延长仅支持720p分辨率的视频')
    })

    it('应该拒绝超过148秒限制的源视频', async () => {
      // Mock 超长源视频（142秒，延长后149秒）
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 142, // 142 + 7 = 149 > 148
          gemini_video_uri: 'gs://bucket/video.mp4',
          status: 'completed'
        },
        error: null
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('视频延长后总时长将超过148秒上限')
    })

    it('应该拒绝没有gemini_video_uri的源视频', async () => {
      // Mock 没有gemini_video_uri的源视频
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 10,
          // gemini_video_uri 缺失
          status: 'completed'
        },
        error: null
      }))

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('该视频不支持延长功能')
    })
  })

  describe('数据库操作验证', () => {
    it('应该正确创建extend-video记录', async () => {
      // Mock源视频查询
      const mockSourceVideo = {
        id: testSourceVideoId,
        user_id: testUserId,
        generation_mode: 'text-to-video',
        resolution: '720p',
        duration_seconds: 10,
        gemini_video_uri: 'gs://bucket/video.mp4',
        prompt: '原始提示词',
        negative_prompt: '原始负面提示词',
        aspect_ratio: '16:9',
        status: 'completed'
      }

      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: mockSourceVideo,
        error: null
      }))

      // Mock数据库插入操作
      const mockInsert = vi.fn().mockReturnValue(createMockQueryBuilder({
        data: {
          id: 'extend-task-id',
          generation_mode: 'extend-video',
          source_video_id: testSourceVideoId
        },
        error: null
      }))
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: mockInsert
      })

      await videoService.extendVideoTask(
        testUserId,
        testSourceVideoId,
        '继续场景',
        'allow_adult'
      )

      // 验证插入调用包含正确的字段
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          generation_mode: 'extend-video',
          source_video_id: testSourceVideoId,
          prompt: expect.stringContaining('原始提示词'),
          negative_prompt: mockSourceVideo.negative_prompt,
          aspect_ratio: mockSourceVideo.aspect_ratio,
          resolution: '720p',
          duration: 7, // 固定7秒延长
          person_generation: 'allow_adult',
          credit_cost: 40,
          status: 'pending'
        })
      )
    })
  })

  describe('积分系统验证', () => {
    it('应该正确扣除40积分（延长固定费用）', async () => {
      // Mock源视频查询
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 10,
          gemini_video_uri: 'gs://bucket/video.mp4',
          status: 'completed'
        },
        error: null
      }))

      // Mock任务创建
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: { id: 'extend-task-id' },
        error: null
      }))

      const result = await videoService.extendVideoTask(
        testUserId,
        testSourceVideoId,
        '继续场景',
        'allow_adult'
      )

      expect(result.credit_cost).toBe(40) // 延长固定40积分
      expect(mockCreditService.deductCredits).toHaveBeenCalledWith(testUserId, 40)
    })

    it('积分扣除失败时应该抛出错误', async () => {
      // Mock源视频查询
      mockSupabaseClient.from.mockReturnValueOnce(createMockQueryBuilder({
        data: {
          id: testSourceVideoId,
          user_id: testUserId,
          resolution: '720p',
          duration_seconds: 10,
          gemini_video_uri: 'gs://bucket/video.mp4',
          status: 'completed'
        },
        error: null
      }))

      // Mock积分扣除失败
      mockCreditService.deductCredits.mockResolvedValue({
        success: false,
        error: 'Insufficient credits'
      })

      await expect(
        videoService.extendVideoTask(testUserId, testSourceVideoId, '继续场景', 'allow_adult')
      ).rejects.toThrow('Insufficient credits')

      // 验证没有创建任务
      expect(mockVeoClient.extendVideo).not.toHaveBeenCalled()
    })
  })
})

describe('参数验证器扩展测试', () => {
  describe('getAllowedPersonGenerationOptions - extend-video模式', () => {
    it('extend-video + 非限制地区：应返回全部3个选项', () => {
      const options = getAllowedPersonGenerationOptions('extend-video', 'CN')
      expect(options).toEqual(['allow_all', 'allow_adult', 'dont_allow'])
    })

    it('extend-video + EU地区：应排除allow_all', () => {
      const options = getAllowedPersonGenerationOptions('extend-video', 'EU')
      expect(options).toEqual(['allow_adult', 'dont_allow'])
    })
  })

  describe('canExtendVideo - 延长资格检查', () => {
    it('应该返回true：所有条件满足', () => {
      const result = canExtendVideo('completed', '720p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(true)
    })

    it('应该返回true：141秒视频（延长后148秒，恰好达到上限）', () => {
      const result = canExtendVideo('completed', '720p', 141, 'gs://bucket/video.mp4')
      expect(result).toBe(true)
    })

    it('应该返回false：状态为processing', () => {
      const result = canExtendVideo('processing', '720p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：分辨率为1080p', () => {
      const result = canExtendVideo('completed', '1080p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：时长142秒（延长后超过148秒）', () => {
      const result = canExtendVideo('completed', '720p', 142, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：gemini_video_uri为null', () => {
      const result = canExtendVideo('completed', '720p', 4, null)
      expect(result).toBe(false)
    })
  })
})