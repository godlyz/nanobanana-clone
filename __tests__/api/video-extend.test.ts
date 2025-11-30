/**
 * Video Extension API 集成测试
 * 老王备注: 这个SB测试文件专门测试视频延长功能的API集成
 *
 * 测试范围:
 * 1. /api/video/extend 端点 - 正常流程和错误处理
 * 2. 参数验证 - source_video_id, prompt, person_generation
 * 3. 业务逻辑 - 720p限制、148秒限制、积分扣除
 * 4. 数据库操作 - extend-video记录创建、关联关系
 * 5. 错误场景 - 无效视频ID、积分不足、地区限制
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createClient } from '@/lib/supabase/client'

// 🔥 老王修复：Mock Next.js headers和cookies（服务端createClient需要）
const mockCookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
}

const mockHeaderStore = {
  get: vi.fn(() => null), // 默认没有Authorization header
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
  headers: vi.fn(() => Promise.resolve(mockHeaderStore)),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { id: 'test-task-id' },
          error: null
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// 🔥 老王修复：Mock服务端Supabase客户端（API用的是这个！）
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated'
          }
        },
        error: null
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-task-id' },
            error: null
          }))
        }))
      }))
    }))
  }))
}))

describe('/api/video/extend Integration Tests', () => {
  const API_URL = 'http://localhost:3000/api/video/extend'
  let authToken: string

  beforeAll(async () => {
    // 🔥 老王修复：生成真实的Supabase JWT token（使用service role key）
    // 这是集成测试，需要真实token才能通过API认证
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 尝试创建测试用户（如果已存在则使用现有用户）
    let userId: string
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: 'test@example.com',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    })

    if (createError) {
      if (createError.message.includes('already been registered')) {
        // 用户已存在，获取用户列表找到这个用户
        const { data: users, error: listError } = await adminClient.auth.admin.listUsers()
        if (listError || !users) {
          console.error('❌ 获取用户列表失败:', listError)
          throw listError
        }
        const existingUser = users.users.find((u: any) => u.email === 'test@example.com')
        if (!existingUser) {
          throw new Error('找不到测试用户')
        }
        userId = existingUser.id
        console.log('✅ 使用已存在的测试用户，用户ID:', userId)
      } else {
        console.error('❌ 创建测试用户失败:', createError)
        throw createError
      }
    } else {
      userId = createData.user.id
      console.log('✅ 创建新测试用户，用户ID:', userId)
    }

    // 🔥 老王修复：使用service role key直接生成session token
    // 使用auth.admin.generateLink只能生成magic link，不能直接得到access token
    // 正确方法：使用signInWithPassword或者直接构造JWT

    // 方法1：为测试用户设置密码，然后登录获取token
    const testPassword = 'Test123!@#Test123!@#' // 复杂密码避免冲突

    // 更新用户密码（如果是新建用户）或设置密码（如果是已存在用户）
    await adminClient.auth.admin.updateUserById(userId, {
      password: testPassword
    })

    // 用普通客户端登录获取真实token
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: testPassword
    })

    if (signInError || !signInData.session) {
      console.error('❌ 登录失败:', signInError)
      throw signInError || new Error('登录失败，session为空')
    }

    // 提取access token（这才是真实的JWT！）
    authToken = signInData.session.access_token

    console.log('✅ 生成测试token成功，token长度:', authToken.length)
    console.log('✅ 测试用户ID:', signInData.user.id)

    // Mock getUser返回模拟用户（这个mock现在只影响客户端代码，不影响API）
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      },
      error: null
    })
  })

  describe('正常流程测试', () => {
    it('应该成功创建视频延长任务', async () => {
      // Mock源视频查询
      const mockSourceVideo = {
        id: 'source-video-id',
        user_id: 'test-user-id',
        generation_mode: 'text-to-video',
        resolution: '720p',
        duration_seconds: 10,
        gemini_video_uri: 'gs://bucket/video.mp4',
        status: 'completed'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: mockSourceVideo,
              error: null
            }))
          }))
        }))
      })

      // Mock延长任务创建
      const mockExtendTask = {
        id: 'extend-task-id',
        user_id: 'test-user-id',
        generation_mode: 'extend-video',
        source_video_id: 'source-video-id',
        prompt: '原提示词，继续生成7秒',
        person_generation: 'allow_adult',
        status: 'pending',
        task_id: 'gemini-task-id'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: mockExtendTask,
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续这个场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()

      expect(result).toMatchObject({
        task_id: 'extend-task-id',
        message: expect.stringContaining('视频延长任务创建成功'),
        credit_cost: 40
      })
    })

    it('应该使用默认person_generation值（allow_adult）', async () => {
      // Mock源视频查询
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '720p',
                duration_seconds: 5,
                gemini_video_uri: 'gs://bucket/video.mp4'
              },
              error: null
            }))
          }))
        }))
      })

      // Mock任务创建
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'extend-task-id' },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景'
        // 不提供 person_generation
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(true)
      // 验证insert调用时使用了默认值allow_adult
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          person_generation: 'allow_adult'
        })
      )
    })
  })

  describe('参数验证测试', () => {
    it('应该拒绝缺少source_video_id的请求', async () => {
      const requestBody = {
        prompt: '继续场景'
        // 缺少 source_video_id
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'MISSING_SOURCE_VIDEO_ID'
        })
      })
    })

    it('应该拒绝缺少prompt的请求', async () => {
      const requestBody = {
        source_video_id: 'source-video-id'
        // 缺少 prompt
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'MISSING_PROMPT'
        })
      })
    })

    it('应该拒绝无效的person_generation值', async () => {
      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'invalid_value'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'INVALID_PERSON_GENERATION'
        })
      })
    })
  })

  describe('业务逻辑验证测试', () => {
    it('应该拒绝1080p分辨率的源视频', async () => {
      // Mock 1080p源视频
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '1080p', // 1080p分辨率
                duration_seconds: 10,
                gemini_video_uri: 'gs://bucket/video.mp4'
              },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'EXTENSION_NOT_SUPPORTED_FOR_1080P'
        })
      })
    })

    it('应该拒绝超过148秒限制的源视频', async () => {
      // Mock 超长源视频（142秒，延长后149秒）
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '720p',
                duration_seconds: 142, // 142 + 7 = 149 > 148
                gemini_video_uri: 'gs://bucket/video.mp4'
              },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'EXTENSION_EXCEEDS_LIMIT'
        })
      })
    })

    it('应该拒绝没有gemini_video_uri的源视频', async () => {
      // Mock 没有gemini_video_uri的源视频
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '720p',
                duration_seconds: 10
                // gemini_video_uri 缺失
              },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'EXTENSION_NOT_SUPPORTED'
        })
      })
    })
  })

  describe('权限和安全测试', () => {
    it('应该拒绝用户操作他人的视频', async () => {
      // Mock 属于其他用户的源视频
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'other-user-id', // 不同的用户ID
                resolution: '720p',
                duration_seconds: 10,
                gemini_video_uri: 'gs://bucket/video.mp4'
              },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      const result = await response.json()

      expect(result).toMatchObject({
        error: expect.objectContaining({
          code: 'VIDEO_NOT_FOUND'
        })
      })
    })

    it('应该拒绝未认证的请求', async () => {
      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // 没有Authorization头
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('数据库集成测试', () => {
    it('应该正确创建extend-video记录', async () => {
      // Mock源视频查询
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '720p',
                duration_seconds: 10,
                gemini_video_uri: 'gs://bucket/video.mp4',
                prompt: '原始提示词'
              },
              error: null
            }))
          }))
        }))
      })

      // Mock数据库插入操作
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'extend-task-id',
              generation_mode: 'extend-video',
              source_video_id: 'source-video-id'
            },
            error: null
          }))
        }))
      }))
      mockSupabase.from.mockReturnValueOnce({
        insert: mockInsert
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      // 验证插入调用包含正确的字段
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          generation_mode: 'extend-video',
          source_video_id: 'source-video-id',
          prompt: expect.stringContaining('原始提示词'),
          resolution: '720p',
          duration: 7, // 固定7秒延长
          person_generation: 'allow_adult',
          credit_cost: 40
        })
      )
    })
  })

  describe('积分系统测试', () => {
    it('应该正确扣除40积分（延长固定费用）', async () => {
      // Mock源视频查询
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'source-video-id',
                user_id: 'test-user-id',
                resolution: '720p',
                duration_seconds: 10,
                gemini_video_uri: 'gs://bucket/video.mp4'
              },
              error: null
            }))
          }))
        }))
      })

      // Mock任务创建
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'extend-task-id' },
              error: null
            }))
          }))
        }))
      })

      const requestBody = {
        source_video_id: 'source-video-id',
        prompt: '继续场景',
        person_generation: 'allow_adult'
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()

      expect(result.credit_cost).toBe(40) // 延长固定40积分
    })
  })
})