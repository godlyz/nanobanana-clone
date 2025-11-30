/**
 * 🔥 老王测试：lib/supabase/server.ts - Supabase 服务端客户端创建
 *
 * 测试目标：
 * - 正常创建 Supabase 客户端
 * - 环境变量验证（缺失、占位符）
 * - Cookies 操作（getAll, setAll）
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Next.js cookies and headers
const mockCookieStore = {
  getAll: vi.fn(),
  set: vi.fn(),
}

const mockHeaderStore = {
  get: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
  headers: vi.fn(() => Promise.resolve(mockHeaderStore)),
}))

// Mock @supabase/ssr
const mockCreateServerClient = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: any[]) => mockCreateServerClient(...args),
}))

// Import after mocks are set up
import { createClient } from '@/lib/supabase/server'

describe('🔥 老王测试：lib/supabase/server', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 重置环境变量
    process.env = { ...originalEnv }

    // 设置默认有效的环境变量
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-1234567890'

    // 设置默认 mock 行为
    mockCookieStore.getAll.mockReturnValue([
      { name: 'test-cookie', value: 'test-value' }
    ])
    mockHeaderStore.get.mockReturnValue(undefined) // 默认没有Authorization header
    mockCreateServerClient.mockReturnValue({ mock: 'supabase-client' })
  })

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv
  })

  describe('正常流程', () => {
    it('应该成功创建 Supabase 客户端', async () => {
      const client = await createClient()

      // 验证 createServerClient 被正确调用
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key-1234567890',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )

      // 验证返回的客户端
      expect(client).toEqual({ mock: 'supabase-client' })
    })

    it('应该正确处理 cookies.getAll()', async () => {
      await createClient()

      // 获取传给 createServerClient 的配置
      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies

      // 调用 getAll 方法
      const cookies = cookiesConfig.getAll()

      // 验证调用了 mockCookieStore.getAll
      expect(mockCookieStore.getAll).toHaveBeenCalled()
      expect(cookies).toEqual([{ name: 'test-cookie', value: 'test-value' }])
    })

    it('应该正确处理 cookies.setAll() - 成功情况', async () => {
      await createClient()

      // 获取传给 createServerClient 的配置
      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies

      // 准备测试数据
      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: { path: '/' } },
        { name: 'cookie2', value: 'value2', options: { path: '/api' } },
      ]

      // 调用 setAll 方法
      cookiesConfig.setAll(cookiesToSet)

      // 验证每个 cookie 都被设置
      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie1', 'value1', { path: '/' })
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie2', 'value2', { path: '/api' })
    })

    it('应该正确处理 cookies.setAll() - 异常情况（Server Component）', async () => {
      // Mock set 方法抛出异常（模拟 Server Component 场景）
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component')
      })

      await createClient()

      // 获取传给 createServerClient 的配置
      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies

      // 准备测试数据
      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: { path: '/' } },
      ]

      // 调用 setAll 方法（应该捕获异常，不抛出）
      expect(() => cookiesConfig.setAll(cookiesToSet)).not.toThrow()

      // 验证 set 被调用（即使抛出异常）
      expect(mockCookieStore.set).toHaveBeenCalled()
    })
  })

  describe('环境变量验证', () => {
    it('应该在缺少 NEXT_PUBLIC_SUPABASE_URL 时抛出错误', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file. See SUPABASE_SETUP.md for instructions.'
      )
    })

    it('应该在缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY 时抛出错误', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured'
      )
    })

    it('应该在 NEXT_PUBLIC_SUPABASE_URL 包含占位符时抛出错误', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your_supabase_url.supabase.co'

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured'
      )
    })

    it('应该在 NEXT_PUBLIC_SUPABASE_ANON_KEY 包含占位符时抛出错误', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your_supabase_anon_key'

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured'
      )
    })

    it('应该在两个环境变量都缺失时抛出错误', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured'
      )
    })

    it('应该在两个环境变量都是占位符时抛出错误', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your_supabase_url.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your_supabase_anon_key'

      await expect(createClient()).rejects.toThrow(
        'Supabase is not configured'
      )
    })
  })

  describe('边界情况', () => {
    it('应该处理空的 cookies 数组', async () => {
      mockCookieStore.getAll.mockReturnValue([])

      await createClient()

      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies
      const cookies = cookiesConfig.getAll()

      expect(cookies).toEqual([])
    })

    it('应该处理包含多个 cookies 的情况', async () => {
      const multipleCookies = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
        { name: 'cookie3', value: 'value3' },
      ]
      mockCookieStore.getAll.mockReturnValue(multipleCookies)

      await createClient()

      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies
      const cookies = cookiesConfig.getAll()

      expect(cookies).toEqual(multipleCookies)
      expect(cookies).toHaveLength(3)
    })

    it('应该处理 setAll 接收空数组的情况', async () => {
      await createClient()

      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies

      // 调用 setAll 方法并传入空数组
      cookiesConfig.setAll([])

      // 验证 set 没有被调用
      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('应该处理 cookie options 为 undefined 的情况', async () => {
      await createClient()

      const callArgs = mockCreateServerClient.mock.calls[0]
      const cookiesConfig = callArgs[2].cookies

      // 准备测试数据（没有 options）
      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: undefined },
      ]

      // 调用 setAll 方法
      cookiesConfig.setAll(cookiesToSet)

      // 验证 set 被正确调用
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie1', 'value1', undefined)
    })
  })

  describe('集成场景', () => {
    it('应该在多次调用时每次创建新的客户端', async () => {
      // 第一次调用
      mockCreateServerClient.mockReturnValueOnce({ instance: 1 })
      const client1 = await createClient()

      // 第二次调用
      mockCreateServerClient.mockReturnValueOnce({ instance: 2 })
      const client2 = await createClient()

      // 验证两次都调用了 createServerClient
      expect(mockCreateServerClient).toHaveBeenCalledTimes(2)

      // 验证返回了不同的客户端实例
      expect(client1).toEqual({ instance: 1 })
      expect(client2).toEqual({ instance: 2 })
    })

    it('应该使用实际的环境变量值', async () => {
      const customUrl = 'https://custom-project.supabase.co'
      const customKey = 'custom-anon-key-abcdef123456'

      process.env.NEXT_PUBLIC_SUPABASE_URL = customUrl
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = customKey

      await createClient()

      // 验证使用了正确的环境变量
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        customUrl,
        customKey,
        expect.any(Object)
      )
    })
  })
})
