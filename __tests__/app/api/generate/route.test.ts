/**
 * 🔥 老王测试：图像生成 API 测试
 * 测试范围：
 * - 认证和授权检查
 * - 积分校验和扣减
 * - LLM 配置加载（数据库 + 环境变量降级）
 * - Google Gemini API 调用（文生图 + 图生图）
 * - 批量生成
 * - 历史记录保存
 * - 错误处理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/generate/route'

// 🔥 在模块加载前设置环境变量
vi.stubEnv('GOOGLE_AI_API_KEY', 'google_ai_test_key_1234567890')

// Mock 所有依赖模块
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}))

// Mock CreditService - 使用 vi.fn() 创建可配置的构造函数
vi.mock('@/lib/credit-service', () => {
  const MockCreditService = vi.fn()
  return {
    CreditService: MockCreditService,
    createCreditService: vi.fn(),
  }
})

vi.mock('@/lib/llm-config-loader', () => ({
  llmConfigLoader: {
    getImageGenerationConfig: vi.fn(),
  },
  getFallbackImageGenerationConfig: vi.fn(),
}))

vi.mock('@/lib/id-generator', () => ({
  generateShortId: vi.fn(() => 'test_id_123'),
}))

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GoogleGenAI } from '@google/genai'
import { CreditService } from '@/lib/credit-service'
import { llmConfigLoader, getFallbackImageGenerationConfig } from '@/lib/llm-config-loader'

describe('🔥 老王测试：/api/generate - 图像生成 API', () => {
  // 🔥 全局共享的 mock CreditService 实例（可以被测试修改）
  const mockCreditServiceInstance = {
    checkCreditsSufficient: vi.fn(() => Promise.resolve(true)),
    getUserAvailableCredits: vi.fn(() => Promise.resolve(100)),
    deductCredits: vi.fn(() => Promise.resolve()),
  }

  // 创建 mock 的 Supabase 客户端
  const createMockSupabaseClient = () => {
    return {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'history_123' },
              error: null
            }))
          }))
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ error: null })),
          getPublicUrl: vi.fn(() => ({
            data: { publicUrl: 'https://storage.example.com/test.png' }
          }))
        }))
      }
    }
  }

  // 创建 mock 的 Google AI 客户端
  const createMockGoogleAI = () => {
    return {
      models: {
        generateContent: vi.fn(() => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: 'base64_encoded_image_data_test_1234567890'
                }
              }]
            },
            finishReason: 'STOP',
            safetyRatings: []
          }],
          text: ''
        }))
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // 🔥 重置 mock CreditService 实例方法为默认值
    mockCreditServiceInstance.checkCreditsSufficient = vi.fn(() => Promise.resolve(true))
    mockCreditServiceInstance.getUserAvailableCredits = vi.fn(() => Promise.resolve(100))
    mockCreditServiceInstance.deductCredits = vi.fn(() => Promise.resolve())

    // 🔥 配置 CreditService mock 返回全局共享实例（必须用 function 而不是箭头函数）
    vi.mocked(CreditService).mockImplementation(function() {
      return mockCreditServiceInstance
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('认证和授权', () => {
    it('应该拒绝未认证用户 (401)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: null },
        error: new Error('未认证')
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('未授权')
    })

    it('应该拒绝认证失败的用户 (401)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: null },
        error: { message: 'Token expired' }
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.details).toContain('请先登录')
    })
  })

  describe('积分校验', () => {
    it('应该拒绝积分不足的用户 (402)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)

      mockCreditServiceInstance.checkCreditsSufficient = vi.fn(() => Promise.resolve(false))
      mockCreditServiceInstance.getUserAvailableCredits = vi.fn(() => Promise.resolve(5))

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: [],
          batchCount: 1
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.success).toBe(false)
      expect(data.error).toBe('积分不足')
      expect(data.required_credits).toBe(1) // TEXT_TO_IMAGE = 1 (根据 credit-types.ts)
      expect(data.available_credits).toBe(5)
    })

    it('应该正确计算批量生成的积分需求', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)

      mockCreditServiceInstance.checkCreditsSufficient = vi.fn(() => Promise.resolve(false))
      mockCreditServiceInstance.getUserAvailableCredits = vi.fn(() => Promise.resolve(20))

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: [],
          batchCount: 5 // 5张图片
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.required_credits).toBe(5) // 5 * 1 = 5 (TEXT_TO_IMAGE = 1)
      expect(data.batch_count).toBe(5)
      expect(data.credits_per_image).toBe(1) // TEXT_TO_IMAGE = 1
    })

    it('应该限制批量数量在 1-9 之间', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)

      mockCreditServiceInstance.checkCreditsSufficient = vi.fn(() => Promise.resolve(false))

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: [],
          batchCount: 999 // 超出范围
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.batch_count).toBe(9) // 被限制为最大值 9
      expect(data.required_credits).toBe(9) // 9 * 1 = 9 (TEXT_TO_IMAGE = 1)
    })
  })

  describe('参数验证', () => {
    it('应该拒绝缺少 prompt 的请求 (400)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          images: []
          // prompt 缺失
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    it('应该拒绝 images 不是数组的请求 (400)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: 'not_an_array' // 类型错误
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('LLM 配置加载', () => {
    it('应该优先从数据库加载配置', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'db_api_key_123',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: []
        })
      })

      await POST(request)

      expect(llmConfigLoader.getImageGenerationConfig).toHaveBeenCalled()
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'db_api_key_123' })
    })

    it('应该在数据库配置不可用时降级到环境变量', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      // 数据库配置返回 null
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(null)

      // 环境变量降级配置
      const fallbackConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'google_ai_test_key_1234567890',
        api_url: 'https://generativelanguage.googleapis.com'
      }
      vi.mocked(getFallbackImageGenerationConfig).mockReturnValue(fallbackConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: []
        })
      })

      await POST(request)

      expect(getFallbackImageGenerationConfig).toHaveBeenCalled()
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'google_ai_test_key_1234567890' })
    })

    it('应该在配置完全缺失时返回错误 (500)', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      // 数据库和环境变量都没有配置
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(null)
      vi.mocked(getFallbackImageGenerationConfig).mockReturnValue(null)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试提示词',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('图像生成配置缺失')
    })
  })

  describe('图像生成 - 文生图', () => {
    it('应该成功生成单张文生图', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '一只可爱的猫咪',
          images: [], // 无参考图
          batchCount: 1
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('batch')
      expect(data.batch_count).toBe(1)
      expect(data.generated_count).toBe(1)
      expect(data.images).toHaveLength(1)
      expect(data.images[0]).toContain('data:image/png;base64,')
      expect(data.generation_type).toBe('text_to_image')
      expect(data.credits_used).toBe(1) // TEXT_TO_IMAGE = 1
      expect(data.credits_per_image).toBe(1) // TEXT_TO_IMAGE = 1
    })

    it('应该成功批量生成多张文生图', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '一只可爱的猫咪',
          images: [],
          batchCount: 3 // 生成3张
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.batch_count).toBe(3)
      expect(data.generated_count).toBe(3)
      expect(data.images).toHaveLength(3)
      expect(data.credits_used).toBe(3) // 3 * 1 = 3 (TEXT_TO_IMAGE = 1, batchCount = 3)
      expect(mockAI.models.generateContent).toHaveBeenCalledTimes(3)
    })

    it('应该支持自定义宽高比', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '一只可爱的猫咪',
          images: [],
          aspectRatio: '16:9' // 宽高比
        })
      })

      await POST(request)

      expect(mockAI.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            imageConfig: {
              aspectRatio: '16:9'
            }
          }
        })
      )
    })
  })

  describe('图像生成 - 图生图', () => {
    it('应该成功生成单张图生图', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '把猫咪变成狗狗',
          images: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='], // 有参考图
          batchCount: 1
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.generation_type).toBe('image_to_image')
      expect(data.credits_used).toBe(2) // IMAGE_TO_IMAGE = 2
      expect(data.credits_per_image).toBe(2) // IMAGE_TO_IMAGE = 2
    })

    it('应该正确处理 data URL 格式的参考图', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试',
          images: ['data:image/png;base64,iVBORw0KGgoAAAANS'], // PNG 格式
        })
      })

      await POST(request)

      expect(mockAI.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              inlineData: expect.objectContaining({
                mimeType: 'image/png',
                data: 'iVBORw0KGgoAAAANS'
              })
            })
          ])
        })
      )
    })

    it('应该支持多张参考图', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '融合两只猫咪',
          images: [
            'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
            'data:image/jpeg;base64,/9j/5BBRTlaMSh=='
          ]
        })
      })

      await POST(request)

      const calls = vi.mocked(mockAI.models.generateContent).mock.calls as any[]
      expect(calls.length).toBeGreaterThan(0)
      const callArgs = calls[0]?.[0] as any
      expect(callArgs.contents).toHaveLength(3) // text + 2 images
    })
  })

  describe('历史记录保存', () => {
    it('应该保存生成历史到数据库和 Storage', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试历史记录',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.history_record_id).toBe('history_123')
      expect(mockServiceSupabase.storage.from).toHaveBeenCalledWith('generation-history')
      expect(mockServiceSupabase.from).toHaveBeenCalledWith('generation_history')
    })

    it('应该在历史记录中包含工具类型', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'history_456' },
            error: null
          }))
        }))
      }))
      mockServiceSupabase.from = vi.fn(() => ({
        insert: mockInsert
      })) as any
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试工具类型',
          images: [],
          toolType: 'background-remover'
        })
      })

      await POST(request)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_type: 'background-remover'
        })
      )
    })
  })

  describe('积分扣减', () => {
    it('应该在成功生成后扣减积分', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试积分扣减',
          images: [],
          batchCount: 2
        })
      })

      await POST(request)

      expect(mockCreditServiceInstance.deductCredits).toHaveBeenCalledWith({
        user_id: 'user_123',
        amount: 2, // 2 * 1 = 2 (TEXT_TO_IMAGE = 1, batchCount = 2)
        transaction_type: 'text_to_image',
        related_entity_id: 'history_123',
        description: expect.stringContaining('2张图片')
      })
    })

    it('应该处理积分扣减失败的情况', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)

      mockCreditServiceInstance.deductCredits = vi.fn(() => Promise.reject(new Error('扣减失败')))

      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试',
          images: []
        })
      })

      // 即使扣减失败，也应该返回成功（已经生成图片了）
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该处理 Google AI API 调用失败', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = {
        models: {
          generateContent: vi.fn(() => Promise.reject(new Error('API quota exceeded')))
        }
      }
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试API失败',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate image')
      expect(data.details).toContain('API quota exceeded')
    })

    it('应该处理所有图片生成失败的情况', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = {
        models: {
          generateContent: vi.fn(() => Promise.resolve({
            candidates: [{
              content: {
                parts: [{ text: '无法生成图片' }] // 只有文本，没有图片
              }
            }]
          }))
        }
      }
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试图片生成失败',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('图像生成失败')
      expect(data.generated_count).toBe(0)
    })

    it('应该处理图片上传失败的情况', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.auth.getUser = vi.fn(() => Promise.resolve({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null
      }))
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockServiceSupabase = createMockSupabaseClient()
      // Mock 上传失败
      mockServiceSupabase.storage = {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ error: new Error('Upload failed') })),
          getPublicUrl: vi.fn(() => ({
            data: { publicUrl: 'https://storage.example.com/test.png' }
          }))
        }))
      } as any
      // Mock 数据库插入返回 null
      mockServiceSupabase.from = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: new Error('Insert failed')
            }))
          }))
        }))
      })) as any
      vi.mocked(createServiceClient).mockReturnValue(mockServiceSupabase as any)


      const mockAI = createMockGoogleAI()
      vi.mocked(GoogleGenAI).mockImplementation(function() { return mockAI as any })

      const mockConfig = {
        provider: 'google' as const,
        service_type: 'image_generation' as const,
        model_name: 'gemini-2.0-flash-exp',
        api_key: 'test_key',
        api_url: 'https://api.example.com'
      }
      vi.mocked(llmConfigLoader.getImageGenerationConfig).mockResolvedValue(mockConfig)

      const request = new NextRequest('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '测试上传失败',
          images: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // 即使上传失败，也应该返回生成成功（图片数据在响应中）
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.history_record_id).toBeNull() // 历史记录保存失败
    })
  })
})
