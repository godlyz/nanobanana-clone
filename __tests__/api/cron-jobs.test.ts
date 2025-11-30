/**
 * Cron Jobs API 测试套件
 * 老王备注: 测试视频生成相关的两个Cron Job API
 *
 * 测试范围:
 * 1. poll-video-status - 状态轮询Cron
 * 2. download-video - 视频下载任务
 *
 * 这两个是Vercel Cron触发的内部API，需要CRON_SECRET认证
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/poll-video-status/route'
import { POST } from '@/app/api/cron/download-video/route'

// Mock dependencies
// Create a global mock for createServiceClient return value
let mockServiceClient: any

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockServiceClient,
}))

// Create a global mock for VideoService
const mockVideoService = {
  refundFailedTask: vi.fn(),
}

vi.mock('@/lib/video-service', () => ({
  getVideoService: () => mockVideoService,
}))

// Create a global mock for VeoClient
const mockVeoClient = {
  checkOperationStatus: vi.fn(),
}

vi.mock('@/lib/veo-client', () => ({
  getVeoClient: () => mockVeoClient,
}))

// Mock fetch for internal API calls and video downloads
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Cron Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks
    mockVeoClient.checkOperationStatus.mockClear()
    mockVideoService.refundFailedTask.mockClear()
    mockFetch.mockClear()

    // Set up service client mock
    mockServiceClient = {
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    }

    // Set environment variables
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-google-api-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('GET /api/cron/poll-video-status', () => {
    const createPollRequest = (secret?: string) => {
      return new NextRequest('http://localhost:3000/api/cron/poll-video-status', {
        headers: {
          'authorization': secret ? `Bearer ${secret}` : '',
        },
      })
    }

    it('应该在缺少CRON_SECRET时返回500', async () => {
      // Arrange
      vi.stubEnv('CRON_SECRET', '')

      // Act
      const response = await GET(createPollRequest())
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('CRON_SECRET_MISSING')
    })

    it('应该在CRON_SECRET错误时返回401', async () => {
      // Act
      const response = await GET(createPollRequest('wrong-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    it('应该在没有待处理任务时返回成功', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })
      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed_count).toBe(0)
    })

    it('应该成功处理完成的任务并触发下载', async () => {
      // Arrange
      const testTask = {
        id: 'task-123',
        user_id: 'user-123',
        operation_id: 'operations/test-123',
        status: 'processing',
        credit_cost: 40,
        created_at: new Date().toISOString(),
      }

      // Mock query pending tasks
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [testTask],
            error: null,
          }),
        }),
      })

      // Mock getVeoClient to return completed status
      mockVeoClient.checkOperationStatus.mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://storage.googleapis.com/video.mp4',
      })

      // Mock database update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTask.id },
          error: null,
        }),
      })

      // Mock fetch for download trigger
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.completed).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cron/download-video',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'authorization': 'Bearer test-cron-secret',
          }),
          body: expect.stringContaining('"task_id":"task-123"'),
        })
      )
    })

    it('应该正确处理失败的任务并退款', async () => {
      // Arrange
      const testTask = {
        id: 'task-456',
        user_id: 'user-456',
        operation_id: 'operations/test-456',
        status: 'processing',
        credit_cost: 60,
        created_at: new Date().toISOString(),
      }

      // Mock query pending tasks
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [testTask],
            error: null,
          }),
        }),
      })

      // Mock getVeoClient to return failed status
      mockVeoClient.checkOperationStatus.mockResolvedValue({
        status: 'failed',
        error: {
          code: 'SAFE_FILTER_VIOLATION',
          message: 'Content violates safety policy',
        },
      })

      // Mock database update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTask.id },
          error: null,
        }),
      })

      // Mock refund function
      mockVideoService.refundFailedTask = vi.fn().mockResolvedValue(true)

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results.failed).toBe(1)
      expect(mockVideoService.refundFailedTask).toHaveBeenCalledWith(
        'task-456',
        'user-456',
        60
      )
    })

    it('应该处理超时任务（超过10分钟）', async () => {
      // Arrange
      const createdAt = new Date(Date.now() - 15 * 60 * 1000) // 15分钟前
      const testTask = {
        id: 'task-timeout',
        user_id: 'user-timeout',
        operation_id: 'operations/timeout',
        status: 'processing',
        credit_cost: 40,
        created_at: createdAt.toISOString(),
      }

      // Mock query pending tasks
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [testTask],
            error: null,
          }),
        }),
      })

      // Mock getVeoClient to throw exception (API call fails)
      mockVeoClient.checkOperationStatus.mockRejectedValue(
        new Error('API_TIMEOUT')
      )

      // Mock database update for timeout
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTask.id },
          error: null,
        }),
      })

      // Mock refund function
      mockVideoService.refundFailedTask = vi.fn().mockResolvedValue(true)

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results.failed).toBe(1)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: 'TIMEOUT',
          error_message: expect.stringContaining('timeout'),
        })
      )
    })

    it('应该处理仍在处理中的任务', async () => {
      // Arrange
      const testTask = {
        id: 'task-processing',
        operation_id: 'operations/processing',
        status: 'processing',
        created_at: new Date().toISOString(),
      }

      // Mock query pending tasks
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [testTask],
            error: null,
          }),
        }),
      })

      // Mock getVeoClient to return processing status
      mockVeoClient.checkOperationStatus.mockResolvedValue({
        status: 'processing',
      })

      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results.still_processing).toBe(1)
    })

    it('应该在数据库查询错误时返回500', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      })
      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await GET(createPollRequest('test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('CRON_JOB_ERROR')
    })
  })

  describe('POST /api/cron/download-video', () => {
    const createDownloadRequest = (body: any, secret?: string) => {
      return new NextRequest('http://localhost:3000/api/cron/download-video', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'authorization': secret ? `Bearer ${secret}` : '',
        },
      })
    }

    it('应该在缺少task_id时返回400', async () => {
      // Act
      const response = await POST(createDownloadRequest({}, 'test-cron-secret'))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('MISSING_TASK_ID')
    })

    it('应该在CRON_SECRET错误时返回401', async () => {
      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'task-123' }, 'wrong-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    it('应该在任务不存在时返回404', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      })
      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'non-existent' }, 'test-cron-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('TASK_NOT_FOUND')
    })

    it('应该在任务状态不是downloading时返回400', async () => {
      // Arrange
      const testTask = {
        id: 'task-123',
        user_id: 'user-123',
        status: 'processing', // 错误状态
        google_video_url: 'https://storage.googleapis.com/video.mp4',
      }

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testTask,
            error: null,
          }),
        }),
      })
      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'task-123' }, 'test-cron-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('INVALID_STATUS')
    })

    it('应该在缺少临时视频URL时返回400', async () => {
      // Arrange
      const testTask = {
        id: 'task-123',
        user_id: 'user-123',
        status: 'downloading',
        google_video_url: null, // 缺少URL
      }

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testTask,
            error: null,
          }),
        }),
      })
      mockServiceClient.from.mockReturnValue({ select: mockSelect })

      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'task-123' }, 'test-cron-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('MISSING_VIDEO_URL')
    })

    it('应该成功下载视频并上传到Supabase Storage', async () => {
      // Arrange
      const testTask = {
        id: 'task-123',
        user_id: 'user-123',
        status: 'downloading',
        google_video_url: 'https://storage.googleapis.com/video.mp4',
      }

      // Mock task query
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testTask,
            error: null,
          }),
        }),
      })

      // Mock video download
      const videoBuffer = new ArrayBuffer(1024)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => videoBuffer,
      })

      // Mock storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user-123/task-123.mp4' },
        error: null,
      })

      // Mock public URL generation
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: {
          publicUrl: 'https://storage.supabase.co/videos/user-123/task-123.mp4',
        }
      })

      // Mock database update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTask.id },
          error: null,
        }),
      })

      // Configure mocks - the order matters!
      // First mock the storage.from calls
      mockServiceClient.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      // Then mock the database.from calls
      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      })

      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'task-123' }, 'test-cron-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task_id).toBe('task-123')
      expect(data.permanent_video_url).toContain('task-123.mp4')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/video.mp4',
        expect.objectContaining({
          headers: {
            'x-goog-api-key': 'test-google-api-key',
          },
        })
      )
      expect(mockUpload).toHaveBeenCalledWith(
        'user-123/task-123.mp4',
        expect.any(Blob),
        {
          contentType: 'video/mp4',
          upsert: true,
        }
      )
    })

    it('应该在视频下载失败时标记任务为失败', async () => {
      // Arrange
      const testTask = {
        id: 'task-123',
        user_id: 'user-123',
        status: 'downloading',
        google_video_url: 'https://storage.googleapis.com/video.mp4',
      }

      // Mock task query
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testTask,
            error: null,
          }),
        }),
      })

      // Mock failed video download
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      // Mock database update for failed status
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: testTask.id },
          error: null,
        }),
      })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      })

      // Act
      const response = await POST(
        createDownloadRequest({ task_id: 'task-123' }, 'test-cron-secret')
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('DOWNLOAD_JOB_ERROR')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_code: 'DOWNLOAD_ERROR',
        })
      )
    })
  })
})
