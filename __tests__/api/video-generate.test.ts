/**
 * Video Generate API 测试套件
 * 老王备注: 测试 /api/video/generate 端点的所有场景
 *
 * 测试范围:
 * 1. 参数验证 - prompt, aspect_ratio, resolution, duration, generation_mode
 * 2. 模式特定验证 - reference-images, first-last-frame, text-to-video
 * 3. 成功场景 - 任务创建成功
 * 4. 错误处理 - 并发限制、积分不足、API错误
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/video/generate/route'

// Mock withAuth - 跳过认证，直接传递user
vi.mock('@/lib/api-auth', () => ({
  withAuth: (handler: Function) => {
    return async (request: NextRequest) => {
      const mockUser = { id: 'test-user-123', email: 'test@example.com' }
      return handler(request, mockUser)
    }
  },
}))

// Mock VideoService
const mockCreateVideoTask = vi.fn()
vi.mock('@/lib/video-service', () => ({
  getVideoService: () => ({
    createVideoTask: mockCreateVideoTask,
  }),
}))

describe('POST /api/video/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to create request
  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/video/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('Parameter Validation', () => {
    it('应该在缺少prompt时返回400', async () => {
      const request = createRequest({
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('MISSING_PROMPT')
      expect(data.error.message).toContain('prompt')
    })

    it('应该在prompt为空字符串时返回400', async () => {
      const request = createRequest({
        prompt: '   ',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('应该在aspect_ratio无效时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '4:3', // 无效
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_ASPECT_RATIO')
      expect(data.error.field).toBe('aspectRatio')
    })

    it('应该在resolution无效时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '4K', // 无效
        duration: 4,
        generation_mode: 'text-to-video',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_RESOLUTION')
      expect(data.error.field).toBe('resolution')
    })

    it('应该在duration无效时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 10, // 无效
        generation_mode: 'text-to-video',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_DURATION')
      expect(data.error.field).toBe('duration')
    })

    it('应该在generation_mode无效时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'invalid-mode', // 无效
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_GENERATION_MODE')
      expect(data.error.field).toBe('generationMode')
    })
  })

  describe('Mode-Specific Validation', () => {
    it('应该在reference-images模式缺少reference_images时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8, // reference-images模式强制8秒
        generation_mode: 'reference-images',
        // 缺少 reference_images
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_REFERENCE_IMAGES')
    })

    it('应该在reference-images模式有超过3张图片时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8, // reference-images模式强制8秒
        generation_mode: 'reference-images',
        reference_images: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg'], // 超过3张
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_REFERENCE_IMAGES')
      expect(data.error.message).toContain('1-3')
    })

    it('应该在reference-images模式有frame_url时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8, // reference-images模式强制8秒
        generation_mode: 'reference-images',
        reference_images: ['img1.jpg'],
        first_frame_url: 'frame.jpg', // 不应该有
      })

      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('CONFLICTING_FIELDS')
    })

    it('应该在first-last-frame模式缺少frame_url时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8, // first-last-frame模式强制8秒
        generation_mode: 'first-last-frame',
        first_frame_url: 'first.jpg',
        // 缺少 last_frame_url
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('MISSING_FRAME_URLS')
      expect(data.error.message).toContain('last_frame_url')
    })

    it('应该在first-last-frame模式有reference_images时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8, // first-last-frame模式强制8秒
        generation_mode: 'first-last-frame',
        first_frame_url: 'first.jpg',
        last_frame_url: 'last.jpg',
        reference_images: ['ref.jpg'], // 不应该有
      })

      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('CONFLICTING_FIELDS')
    })

    it('应该在text-to-video模式有图片字段时返回400', async () => {
      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
        reference_images: ['ref.jpg'], // 不应该有
      })

      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('CONFLICTING_FIELDS')
    })
  })

  describe('Success Scenarios', () => {
    it('应该成功创建text-to-video任务', async () => {
      // Arrange
      mockCreateVideoTask.mockResolvedValue({
        id: 'task-123',
        operationId: 'operations/test-123',
        status: 'processing',
        creditCost: 40,
      })

      const request = createRequest({
        prompt: '一只可爱的猫咪在阳光下玩耍',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task_id).toBe('task-123')
      expect(data.operation_id).toBe('operations/test-123')
      expect(data.credit_cost).toBe(40)
    })

    it('应该成功创建reference-images任务', async () => {
      // Arrange
      mockCreateVideoTask.mockResolvedValue({
        id: 'task-456',
        operationId: 'operations/test-456',
        status: 'processing',
        creditCost: 60,
      })

      const request = createRequest({
        prompt: '参考图片风格视频',
        aspect_ratio: '16:9', // reference-images模式强制16:9
        resolution: '1080p',
        duration: 8, // reference-images模式强制8秒
        generation_mode: 'reference-images',
        reference_images: ['https://example.com/ref1.jpg', 'https://example.com/ref2.jpg'],
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task_id).toBe('task-456')
    })

    it('应该成功创建first-last-frame任务', async () => {
      // Arrange
      mockCreateVideoTask.mockResolvedValue({
        id: 'task-789',
        operationId: 'operations/test-789',
        status: 'processing',
        creditCost: 80,
      })

      const request = createRequest({
        prompt: '从第一帧到最后一帧的过渡',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 8,
        generation_mode: 'first-last-frame',
        first_frame_url: 'https://example.com/first.jpg',
        last_frame_url: 'https://example.com/last.jpg',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task_id).toBe('task-789')
    })

    it('应该正确传递negative_prompt参数', async () => {
      // Arrange
      mockCreateVideoTask.mockResolvedValue({
        id: 'task-neg',
        operationId: 'operations/test-neg',
        status: 'processing',
        creditCost: 40,
      })

      const request = createRequest({
        prompt: '测试提示词',
        negative_prompt: '低质量,模糊,变形',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      await POST(request)

      // Assert
      expect(mockCreateVideoTask).toHaveBeenCalledWith(
        expect.objectContaining({
          negativePrompt: '低质量,模糊,变形',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('应该在并发限制超过时返回429', async () => {
      // Arrange
      mockCreateVideoTask.mockRejectedValue(
        new Error('CONCURRENT_LIMIT_EXCEEDED: Maximum concurrent tasks reached')
      )

      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(429)
      expect(data.error).toBe('CONCURRENT_LIMIT_EXCEEDED')
    })

    it('应该在积分不足时返回402', async () => {
      // Arrange
      mockCreateVideoTask.mockRejectedValue(
        new Error('INSUFFICIENT_CREDITS: Not enough credits')
      )

      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(402)
      expect(data.error).toBe('INSUFFICIENT_CREDITS')
    })

    it('应该在VEO API错误时返回503', async () => {
      // Arrange
      mockCreateVideoTask.mockRejectedValue(
        new Error('VEO_API_ERROR: Google Veo API failed')
      )

      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(503)
      expect(data.error).toBe('VEO_API_ERROR')
    })

    it('应该在数据库错误时返回500', async () => {
      // Arrange
      mockCreateVideoTask.mockRejectedValue(
        new Error('DATABASE_ERROR: Database connection failed')
      )

      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('DATABASE_ERROR')
    })

    it('应该在未知错误时返回500', async () => {
      // Arrange
      mockCreateVideoTask.mockRejectedValue(new Error('Unknown error'))

      const request = createRequest({
        prompt: 'test prompt',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: 4,
        generation_mode: 'text-to-video',
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('INTERNAL_SERVER_ERROR')
    })
  })
})
