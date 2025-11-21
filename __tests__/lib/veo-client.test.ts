/**
 * VeoClient 测试套件
 * 老王备注: 这个SB测试文件覆盖Google Veo 3.1 API客户端的核心功能
 *
 * 测试范围:
 * 1. generateVideo - 视频生成请求
 * 2. checkOperationStatus - 状态查询
 * 3. 错误处理 (VeoAPIError, VeoSafetyFilterError, VeoRateLimitError)
 * 4. getVeoClient 单例函数
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  VeoClient,
  VeoAPIError,
  VeoSafetyFilterError,
  VeoRateLimitError,
  getVeoClient,
  type VideoGenerationParams,
} from '@/lib/veo-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('VeoClient', () => {
  let veoClient: VeoClient
  const testApiKey = 'test-api-key-12345'

  beforeEach(() => {
    veoClient = new VeoClient(testApiKey)
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('应该成功创建实例', () => {
      const client = new VeoClient('valid-api-key')
      expect(client).toBeInstanceOf(VeoClient)
    })

    it('应该在缺少API key时抛出错误', () => {
      expect(() => new VeoClient('')).toThrow('Google Veo API key is required')
    })
  })

  describe('generateVideo', () => {
    const defaultParams: VideoGenerationParams = {
      prompt: '一只可爱的猫咪在阳光下玩耍',
      duration: 4,
      resolution: '720p',
      aspectRatio: '16:9',
    }

    it('应该成功发起视频生成请求', async () => {
      // Arrange
      const mockOperationId = 'operations/12345-abcde'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: mockOperationId }),
      })

      // Act
      const result = await veoClient.generateVideo(defaultParams)

      // Assert
      expect(result.operationId).toBe(mockOperationId)
      expect(result.status).toBe('processing')
      expect(result.estimatedCompletionTime).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': testApiKey,
          },
        })
      )
    })

    it('应该正确传递negativePrompt参数', async () => {
      // Arrange
      const paramsWithNegative: VideoGenerationParams = {
        ...defaultParams,
        negativePrompt: '低质量,模糊,变形',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'operations/test' }),
      })

      // Act
      await veoClient.generateVideo(paramsWithNegative)

      // Assert
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.parameters.negativePrompt).toBe('低质量,模糊,变形')
    })

    it('应该正确传递referenceImageUrl参数', async () => {
      // Arrange
      const paramsWithImage: VideoGenerationParams = {
        ...defaultParams,
        referenceImageUrl: 'https://example.com/image.jpg',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'operations/test' }),
      })

      // Act
      await veoClient.generateVideo(paramsWithImage)

      // Assert
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.instances[0].image.imageUrl).toBe('https://example.com/image.jpg')
    })

    it('应该正确处理不同时长和分辨率', async () => {
      // Arrange
      const params1080p: VideoGenerationParams = {
        prompt: '测试',
        duration: 8,
        resolution: '1080p',
        aspectRatio: '9:16',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'operations/test' }),
      })

      // Act
      await veoClient.generateVideo(params1080p)

      // Assert
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.parameters.durationSeconds).toBe(8)
      expect(callBody.parameters.resolution).toBe('1080p')
      expect(callBody.parameters.aspectRatio).toBe('9:16')
    })

    it('应该在API返回错误时抛出VeoAPIError', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid prompt' } }),
      })

      // Act & Assert
      await expect(veoClient.generateVideo(defaultParams)).rejects.toThrow(VeoAPIError)
      await expect(veoClient.generateVideo(defaultParams)).rejects.toThrow('Video generation failed')
    })

    it('应该在安全过滤触发时抛出VeoSafetyFilterError', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Content blocked by safety filter' } }),
      })

      // Act & Assert
      await expect(veoClient.generateVideo(defaultParams)).rejects.toThrow(VeoSafetyFilterError)
    })

    it('应该在速率限制时抛出VeoRateLimitError', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      })

      // Act & Assert
      await expect(veoClient.generateVideo(defaultParams)).rejects.toThrow(VeoAPIError)
    })

    it('应该在没有operationId返回时抛出错误', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // 没有 name 字段
      })

      // Act & Assert
      await expect(veoClient.generateVideo(defaultParams)).rejects.toThrow('No operation ID returned')
    })
  })

  describe('checkOperationStatus', () => {
    const testOperationId = 'operations/test-12345'

    it('应该返回processing状态', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          done: false,
        }),
      })

      // Act
      const result = await veoClient.checkOperationStatus(testOperationId)

      // Assert
      expect(result.operationId).toBe(testOperationId)
      expect(result.status).toBe('processing')
      expect(result.videoUrl).toBeUndefined()
    })

    it('应该返回completed状态和视频URL', async () => {
      // Arrange
      const videoUrl = 'https://storage.googleapis.com/video/test.mp4'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          done: true,
          response: {
            generateVideoResponse: {
              generatedSamples: [
                {
                  video: {
                    uri: videoUrl,
                  },
                },
              ],
            },
          },
        }),
      })

      // Act
      const result = await veoClient.checkOperationStatus(testOperationId)

      // Assert
      expect(result.status).toBe('completed')
      expect(result.videoUrl).toBe(videoUrl)
    })

    it('应该返回failed状态和错误信息', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          done: true,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Video generation failed',
          },
        }),
      })

      // Act
      const result = await veoClient.checkOperationStatus(testOperationId)

      // Assert
      expect(result.status).toBe('failed')
      expect(result.error?.code).toBe('INTERNAL_ERROR')
      expect(result.error?.message).toBe('Video generation failed')
    })

    it('应该在完成但没有视频URL时抛出错误', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          done: true,
          response: {}, // 没有视频URL
        }),
      })

      // Act & Assert
      await expect(veoClient.checkOperationStatus(testOperationId)).rejects.toThrow('No video URL in completed operation')
    })

    it('应该在API错误时抛出VeoAPIError', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: 'Server error' } }),
      })

      // Act & Assert
      await expect(veoClient.checkOperationStatus(testOperationId)).rejects.toThrow(VeoAPIError)
    })

    it('应该使用正确的API端点和header', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ done: false }),
      })

      // Act
      await veoClient.checkOperationStatus(testOperationId)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/${testOperationId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': testApiKey,
          },
        })
      )
    })
  })
})

describe('VeoAPIError', () => {
  it('应该正确创建错误实例', () => {
    const error = new VeoAPIError('TEST_CODE', 'Test message', { detail: 'extra' })

    expect(error.code).toBe('TEST_CODE')
    expect(error.message).toBe('Test message')
    expect(error.details).toEqual({ detail: 'extra' })
    expect(error.name).toBe('VeoAPIError')
  })
})

describe('VeoSafetyFilterError', () => {
  it('应该有正确的默认消息', () => {
    const error = new VeoSafetyFilterError()

    expect(error.code).toBe('SAFETY_FILTER')
    expect(error.message).toBe('Content blocked by safety filter')
    expect(error.name).toBe('VeoSafetyFilterError')
  })

  it('应该接受自定义消息', () => {
    const error = new VeoSafetyFilterError('Custom safety message')

    expect(error.message).toBe('Custom safety message')
  })
})

describe('VeoRateLimitError', () => {
  it('应该有正确的默认消息', () => {
    const error = new VeoRateLimitError()

    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(error.message).toBe('API rate limit exceeded')
    expect(error.name).toBe('VeoRateLimitError')
  })
})

describe('getVeoClient', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 重置模块状态
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('应该在缺少GOOGLE_AI_API_KEY时抛出错误', async () => {
    // Arrange
    delete process.env.GOOGLE_AI_API_KEY

    // 重新导入模块以获取新的实例
    const { getVeoClient: freshGetVeoClient } = await import('@/lib/veo-client')

    // Act & Assert
    expect(() => freshGetVeoClient()).toThrow('GOOGLE_AI_API_KEY environment variable is not set')
  })

  it('应该成功创建并返回单例实例', async () => {
    // Arrange
    process.env.GOOGLE_AI_API_KEY = 'test-key-for-singleton'

    // 重新导入模块
    const { getVeoClient: freshGetVeoClient, VeoClient: FreshVeoClient } = await import('@/lib/veo-client')

    // Act
    const client1 = freshGetVeoClient()
    const client2 = freshGetVeoClient()

    // Assert
    expect(client1).toBe(client2) // 应该是同一个实例
    expect(client1).toBeInstanceOf(FreshVeoClient)
  })
})
