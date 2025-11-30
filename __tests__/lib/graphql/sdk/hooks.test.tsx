/**
 * GraphQL SDK React Hooks 单元测试
 * 艹！这个测试文件覆盖了 React Hooks 的核心功能
 *
 * 测试覆盖：
 * - useGraphQLQuery 基础功能
 * - useGraphQLQuery 轮询功能
 * - useGraphQLQuery 依赖项追踪
 * - useGraphQLMutation 基础功能
 * - 便捷 Hooks（useCurrentUser, useBlogPosts 等）
 * - 组件卸载时的清理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useGraphQLQuery,
  useGraphQLMutation,
  useCurrentUser,
  useBlogPosts,
  useBlogPost,
  useEchoMutation,
} from '@/lib/graphql/sdk/hooks'
import { GraphQLSDK, GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk/client'

// Mock SDK
vi.mock('@/lib/graphql/sdk/client', () => ({
  sdk: {
    api: {
      GetMe: vi.fn(),
      GetPublishedBlogPosts: vi.fn(),
      GetBlogPost: vi.fn(),
      TestEcho: vi.fn(),
    },
  },
  GraphQLSDKError: class GraphQLSDKError extends Error {
    type: string
    statusCode?: number
    constructor(message: string, type: string, statusCode?: number) {
      super(message)
      this.type = type
      this.statusCode = statusCode
    }
  },
  GraphQLErrorType: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  },
}))

describe('GraphQL SDK React Hooks', () => {
  let mockSdk: any

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    mockSdk = require('@/lib/graphql/sdk/client').sdk
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('useGraphQLQuery - 基础功能', () => {
    it('应该成功执行查询并返回数据', async () => {
      const mockData = { id: 'user-1', email: 'test@example.com' }
      mockSdk.api.GetMe.mockResolvedValue({ me: mockData })

      const { result } = renderHook(() =>
        useGraphQLQuery('GetMe', async (sdk) => {
          const res = await sdk.api.GetMe()
          return res.me
        })
      )

      // 初始状态
      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()

      // 等待查询完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证结果
      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
    })

    it('应该处理查询错误', async () => {
      const mockError = new Error('Query failed')
      mockSdk.api.GetMe.mockRejectedValue(mockError)

      const { result } = renderHook(() =>
        useGraphQLQuery('GetMe', async (sdk) => {
          const res = await sdk.api.GetMe()
          return res.me
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeDefined()
    })

    it('应该支持禁用立即执行', () => {
      mockSdk.api.GetMe.mockResolvedValue({ me: { id: 'user-1' } })

      const { result } = renderHook(() =>
        useGraphQLQuery(
          'GetMe',
          async (sdk) => {
            const res = await sdk.api.GetMe()
            return res.me
          },
          { immediate: false }
        )
      )

      // 不应该立即执行
      expect(result.current.loading).toBe(false)
      expect(mockSdk.api.GetMe).not.toHaveBeenCalled()
    })

    it('应该支持手动 refetch', async () => {
      let callCount = 0
      mockSdk.api.GetMe.mockImplementation(async () => {
        callCount++
        return { me: { id: `user-${callCount}` } }
      })

      const { result } = renderHook(() =>
        useGraphQLQuery('GetMe', async (sdk) => {
          const res = await sdk.api.GetMe()
          return res.me
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual({ id: 'user-1' })

      // 手动 refetch
      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 'user-2' })
      })

      expect(callCount).toBe(2)
    })

    it('应该支持手动设置数据', async () => {
      mockSdk.api.GetMe.mockResolvedValue({ me: { id: 'user-1' } })

      const { result } = renderHook(() =>
        useGraphQLQuery('GetMe', async (sdk) => {
          const res = await sdk.api.GetMe()
          return res.me
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 手动设置数据
      act(() => {
        result.current.setData({ id: 'user-manual', email: 'manual@example.com' })
      })

      expect(result.current.data).toEqual({
        id: 'user-manual',
        email: 'manual@example.com',
      })
    })
  })

  describe('useGraphQLQuery - 轮询功能', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该支持轮询查询', async () => {
      let callCount = 0
      mockSdk.api.GetMe.mockImplementation(async () => {
        callCount++
        return { me: { id: `user-${callCount}` } }
      })

      const { result } = renderHook(() =>
        useGraphQLQuery(
          'GetMe',
          async (sdk) => {
            const res = await sdk.api.GetMe()
            return res.me
          },
          { pollInterval: 1000 }
        )
      )

      // 初始调用
      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // 等待 1 秒（第一次轮询）
      vi.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(callCount).toBe(2)
      })

      // 再等待 1 秒（第二次轮询）
      vi.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(callCount).toBe(3)
      })
    })

    it('应该在组件卸载时停止轮询', async () => {
      let callCount = 0
      mockSdk.api.GetMe.mockImplementation(async () => {
        callCount++
        return { me: { id: `user-${callCount}` } }
      })

      const { unmount } = renderHook(() =>
        useGraphQLQuery(
          'GetMe',
          async (sdk) => {
            const res = await sdk.api.GetMe()
            return res.me
          },
          { pollInterval: 1000 }
        )
      )

      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // 卸载组件
      unmount()

      // 等待 1 秒，不应该再有新的调用
      vi.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(callCount).toBe(1) // 仍然是 1
      })
    })
  })

  describe('useGraphQLQuery - 依赖项追踪', () => {
    it('应该在依赖项变化时重新查询', async () => {
      let callCount = 0
      mockSdk.api.GetMe.mockImplementation(async () => {
        callCount++
        return { me: { id: `user-${callCount}` } }
      })

      const { result, rerender } = renderHook(
        ({ userId }) =>
          useGraphQLQuery(
            'GetMe',
            async (sdk) => {
              const res = await sdk.api.GetMe()
              return res.me
            },
            { deps: [userId] }
          ),
        { initialProps: { userId: 'user-1' } }
      )

      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // 改变依赖项
      rerender({ userId: 'user-2' })

      await waitFor(() => {
        expect(callCount).toBe(2)
      })
    })
  })

  describe('useGraphQLMutation - 基础功能', () => {
    it('应该成功执行 mutation', async () => {
      const mockResult = 'Echo: Hello'
      mockSdk.api.TestEcho.mockResolvedValue({ echo: mockResult })

      const { result } = renderHook(() =>
        useGraphQLMutation(async (sdk, variables: { message: string }) => {
          const res = await sdk.api.TestEcho(variables)
          return res.echo
        })
      )

      // 初始状态
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()

      // 执行 mutation
      let mutationResult: string
      await act(async () => {
        mutationResult = await result.current.execute({ message: 'Hello' })
      })

      // 验证结果
      expect(mutationResult!).toBe(mockResult)
      expect(result.current.data).toBe(mockResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('应该处理 mutation 错误', async () => {
      const mockError = new Error('Mutation failed')
      mockSdk.api.TestEcho.mockRejectedValue(mockError)

      const { result } = renderHook(() =>
        useGraphQLMutation(async (sdk, variables: { message: string }) => {
          const res = await sdk.api.TestEcho(variables)
          return res.echo
        })
      )

      // 执行 mutation
      try {
        await act(async () => {
          await result.current.execute({ message: 'Hello' })
        })
      } catch (error) {
        // 错误被抛出
      }

      // 验证错误状态
      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeDefined()
    })

    it('应该支持重置状态', async () => {
      mockSdk.api.TestEcho.mockResolvedValue({ echo: 'Echo: Hello' })

      const { result } = renderHook(() =>
        useGraphQLMutation(async (sdk, variables: { message: string }) => {
          const res = await sdk.api.TestEcho(variables)
          return res.echo
        })
      )

      // 执行 mutation
      await act(async () => {
        await result.current.execute({ message: 'Hello' })
      })

      expect(result.current.data).toBeDefined()

      // 重置状态
      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('便捷 Hooks', () => {
    it('useCurrentUser 应该获取当前用户', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' }
      mockSdk.api.GetMe.mockResolvedValue({ me: mockUser })

      const { result } = renderHook(() => useCurrentUser())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockUser)
    })

    it('useBlogPosts 应该获取博客文章列表', async () => {
      const mockPosts = [
        { id: 'post-1', title: 'Post 1' },
        { id: 'post-2', title: 'Post 2' },
      ]
      mockSdk.api.GetPublishedBlogPosts.mockResolvedValue({
        blogPosts: mockPosts,
      })

      const { result } = renderHook(() =>
        useBlogPosts({ limit: 10, offset: 0 })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockPosts)
    })

    it('useBlogPost 应该获取单个博客文章', async () => {
      const mockPost = { id: 'post-1', title: 'Post 1' }
      mockSdk.api.GetBlogPost.mockResolvedValue({ blogPost: mockPost })

      const { result } = renderHook(() => useBlogPost('post-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockPost)
    })

    it('useBlogPost 应该在 postId 为 null 时返回 null', async () => {
      const { result } = renderHook(() => useBlogPost(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toBeNull()
      expect(mockSdk.api.GetBlogPost).not.toHaveBeenCalled()
    })

    it('useEchoMutation 应该执行 echo mutation', async () => {
      mockSdk.api.TestEcho.mockResolvedValue({ echo: 'Echo: Hello' })

      const { result } = renderHook(() => useEchoMutation())

      await act(async () => {
        await result.current.execute({ message: 'Hello' })
      })

      expect(result.current.data).toBe('Echo: Hello')
    })
  })

  describe('组件卸载时的清理', () => {
    it('应该在组件卸载时停止更新状态', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSdk.api.GetMe.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ me: { id: 'user-1' } }), 1000)
          })
      )

      const { result, unmount } = renderHook(() =>
        useGraphQLQuery('GetMe', async (sdk) => {
          const res = await sdk.api.GetMe()
          return res.me
        })
      )

      expect(result.current.loading).toBe(true)

      // 立即卸载组件
      unmount()

      // 等待查询完成（但组件已卸载）
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 不应该有 "setState on unmounted component" 警告
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
