/**
 * 🔥 老王测试：用户登录 API 测试
 * 测试范围：
 * - 参数验证
 * - Turnstile 图形验证码
 * - 登录限流保护
 * - 邮箱/用户名登录
 * - 密码验证
 * - 会话创建
 * - 登录日志记录
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/auth/login/route'

// Mock 所有依赖模块
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  RateLimitAction: {
    LOGIN_ATTEMPT: 'LOGIN_ATTEMPT'
  }
}))

vi.mock('@/lib/session-manager', () => ({
  createSession: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

import { createServiceClient } from '@/lib/supabase/service'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSession } from '@/lib/session-manager'

describe('🔥 老王测试：/api/auth/login - 用户登录 API', () => {
  // 创建 mock 的 Supabase Service 客户端
  const createMockServiceClient = () => {
    return {
      auth: {
        admin: {
          listUsers: vi.fn(),
        },
        signInWithPassword: vi.fn(),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // 默认 mock 返回值
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true, valid: true })
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 5, resetAt: new Date() })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('健康检查', () => {
    it('应该返回 API 运行状态', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('User login API is running')
      expect(data.version).toBe('1.0.0')
    })
  })

  describe('参数验证', () => {
    it('应该拒绝缺少 identifier 的请求 (400)', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('缺少必填参数')
    })

    it('应该拒绝缺少 password 的请求 (400)', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('缺少必填参数')
    })

    it('应该拒绝缺少 turnstileToken 的请求 (400)', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('缺少必填参数')
    })
  })

  describe('Turnstile 验证', () => {
    it('应该拒绝 Turnstile 验证失败的请求（测试默认错误消息）', async () => {
      // 🔥 老王新增：测试 reason 为 undefined 时使用默认消息（覆盖 Line 56 分支）
      vi.mocked(verifyTurnstileToken).mockResolvedValue({
        success: false,
        valid: false,
        reason: undefined // ← 覆盖 || 默认值分支
      })

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'invalid_token'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      // 🔥 老王修改：验证使用了默认错误消息
      expect(data.error).toBe('图形验证失败，请刷新页面重试')
    })

    it('应该通过有效的 Turnstile token', async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true, valid: true })

      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: { users: [] },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'valid_token'
        })
      })

      await POST(request)

      expect(verifyTurnstileToken).toHaveBeenCalledWith('valid_token', '127.0.0.1')
    })
  })

  describe('限流保护', () => {
    it('应该拒绝超过限流的请求（测试默认错误消息） (429)', async () => {
      // 🔥 老王新增：测试 reason 为 undefined 时使用默认消息（覆盖 Line 73 分支）
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: false,
        remaining: 0,
        reason: undefined, // ← 覆盖 || 默认值分支
        resetAt: new Date()
      })

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('登录尝试过于频繁')
      expect(data.resetAt).toBeDefined()
    })

    it('应该检查登录限流', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: { users: [] },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      await POST(request)

      expect(checkRateLimit).toHaveBeenCalledWith(
        'LOGIN_ATTEMPT',
        '127.0.0.1'
      )
    })
  })

  describe('用户查找', () => {
    it('应该支持邮箱登录（测试 providers 不是数组的情况，覆盖 Line 138 else 分支）', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            // 🔥 老王修改：providers 设为 null，覆盖 Array.isArray(...) false 分支
            app_metadata: { providers: null }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('test@example.com')
    })

    it('应该支持用户名登录（测试 username 不是 string 时使用 email 前缀，覆盖 Line 226 else 分支）', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            // 🔥 老王修改：username 设为 undefined，覆盖 typeof ... === 'string' false 分支
            user_metadata: { username: undefined }, // ← 使用 email.split('@')[0] 作为默认用户名
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com', // 🔥 老王修改：改为邮箱登录（因为 username 为 undefined）
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // 🔥 老王修改：验证 username 使用了 email 前缀 'test'（email.split('@')[0]）
      expect(data.user.username).toBe('test')
    })

    it('应该拒绝不存在的用户 (401)', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: { users: [] },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'nonexistent@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('应该处理获取用户列表失败的情况 (500)', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Database error' }
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('服务器错误，请稍后重试')
    })

    it('🔥 老王新增：应该处理 usersResult.users 为 null 的情况（覆盖 Line 105 else 分支）', async () => {
      const mockSupabase = createMockServiceClient()
      // 模拟 listUsers 返回 users: null
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: { users: null },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // 应该返回用户不存在错误
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })
  })

  describe('密码验证', () => {
    it('应该拒绝密码错误的登录 (401)', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: { user: null, session: null },
        error: { message: 'Invalid password' }
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'wrong_password',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('应该使用 Supabase 验证密码', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'correct_password',
          turnstileToken: 'token_123'
        })
      })

      await POST(request)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'correct_password'
      })
    })
  })

  describe('会话创建', () => {
    it('应该创建用户会话', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      await POST(request)

      expect(createSession).toHaveBeenCalledWith(
        'user_123',
        'test@example.com',
        '127.0.0.1',
        expect.any(String),
        true
      )
    })

    it('应该处理会话创建失败 (500)', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('登录失败，请稍后重试')
    })
  })

  describe('登录成功响应', () => {
    it('应该返回完整的登录信息', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_123',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          }
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        message: '登录成功',
        session: {
          token: 'session_token_123',
          expiresAt: expect.any(String)
        },
        supabaseSession: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          token_type: 'bearer'
        },
        user: {
          id: 'user_123',
          email: 'test@example.com',
          username: 'testuser'
        }
      })
    })

    it('🔥 老王新增：应该支持纯用户名登录（覆盖 Line 106 else 分支）', async () => {
    const mockSupabase = createMockServiceClient()

    // 模拟用户列表查询
    mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
      data: {
        users: [{
          id: 'user_123',
          email: 'test@example.com',
          user_metadata: { username: 'testuser' }, // ← 用户名
          app_metadata: { providers: ['email'] }
        }]
      },
      error: null
    }))

    // 模拟密码验证成功
    mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
      data: {
        user: { id: 'user_123', email: 'test@example.com' },
        session: { access_token: 'token_123', refresh_token: 'refresh_123' }
      },
      error: null
    }))

    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true, valid: true })
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 4, resetAt: new Date() })
    vi.mocked(createSession).mockResolvedValue({ sessionToken: 'session_123', expiresAt: new Date().toISOString() } as any)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'testuser', // 🔥 老王重点：纯用户名，不含 @，触发 Line 106 else 分支
        password: 'password123',
        turnstileToken: 'token_123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.username).toBe('testuser')

    // 验证用户名查找逻辑被调用
    expect(mockSupabase.auth.admin.listUsers).toHaveBeenCalled()
  })

  it('🔥 老王新增：应该拒绝用户名不存在的登录请求（覆盖 Line 110 false 分支）', async () => {
    const mockSupabase = createMockServiceClient()

    // 模拟用户列表查询 - 用户名不匹配
    mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
      data: {
        users: [{
          id: 'user_123',
          email: 'test@example.com',
          user_metadata: { username: 'otheruser' }, // ← 不同的用户名
          app_metadata: { providers: ['email'] }
        }]
      },
      error: null
    }))

    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true, valid: true })
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 4, resetAt: new Date() })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'nonexistentuser', // 🔥 老王重点：用户名不存在，触发 Line 110 false 分支
        password: 'password123',
        turnstileToken: 'token_123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('用户名或密码错误')

    // 验证用户名查找逻辑被调用
    expect(mockSupabase.auth.admin.listUsers).toHaveBeenCalled()
  })

  it('🔥 老王新增：应该处理 session 为 null 的情况（覆盖 Line 216 else 分支）', async () => {
      const mockSupabase = createMockServiceClient()
      mockSupabase.auth.admin.listUsers = vi.fn(() => Promise.resolve({
        data: {
          users: [{
            id: 'user_123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' },
            app_metadata: { providers: ['email'] }
          }]
        },
        error: null
      }))
      // 🔥 老王修改：返回 session: null，覆盖三元运算符 else 分支
      mockSupabase.auth.signInWithPassword = vi.fn(() => Promise.resolve({
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          session: null // ← 覆盖 authData.session ? {...} : null 的 null 分支
        },
        error: null
      }))
      vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any)

      vi.mocked(createSession).mockResolvedValue({
        sessionToken: 'session_token_123',
        expiresAt: new Date().toISOString()
      } as any)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // 验证 supabaseSession 为 null
      expect(data.supabaseSession).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.user).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('应该处理未预期的异常 (500)', async () => {
      vi.mocked(verifyTurnstileToken).mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'password123',
          turnstileToken: 'token_123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('服务器错误，请稍后重试')
    })
  })
})
