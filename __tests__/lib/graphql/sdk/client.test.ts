/**
 * GraphQL SDK Client 单元测试
 * 艹！这个测试文件覆盖了 SDK 客户端的核心功能
 *
 * 测试覆盖：
 * - SDK 实例创建
 * - 配置选项
 * - 错误分类和处理
 * - 请求重试机制
 * - Token 和 Headers 更新
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GraphQLSDK, createGraphQLSDK, GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk/client'

// Mock GraphQL Client
vi.mock('graphql-request', () => ({
  GraphQLClient: vi.fn().mockImplementation((endpoint, config) => ({
    request: vi.fn(),
    setHeader: vi.fn(),
    endpoint,
    config,
  })),
}))

describe('GraphQLSDK Client', () => {
  describe('SDK 实例创建', () => {
    it('应该成功创建 SDK 实例（默认配置）', () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
      })

      expect(sdk).toBeInstanceOf(GraphQLSDK)
      expect(sdk.rawClient).toBeDefined()
      expect(sdk.api).toBeDefined()
    })

    it('应该成功创建 SDK 实例（完整配置）', () => {
      const sdk = createGraphQLSDK({
        endpoint: 'http://localhost:3000/api/graphql',
        token: 'test-token',
        headers: { 'X-Custom-Header': 'value' },
        timeout: 10000,
        retry: true,
        maxRetries: 5,
        retryDelay: 2000,
        enableLogging: false,
      })

      expect(sdk).toBeInstanceOf(GraphQLSDK)
    })

    it('应该在浏览器环境中创建默认 SDK 实例', () => {
      // Note: defaultSDK 仅在浏览器环境中可用
      // 这个测试在 Node 环境中会返回 null
      const { defaultSDK } = require('@/lib/graphql/sdk/client')

      if (typeof window !== 'undefined') {
        expect(defaultSDK).toBeInstanceOf(GraphQLSDK)
      } else {
        expect(defaultSDK).toBeNull()
      }
    })
  })

  describe('配置选项', () => {
    it('应该使用默认配置值', () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
      })

      // 通过反射访问私有配置（仅用于测试）
      const config = (sdk as any).config

      expect(config.timeout).toBe(30000)
      expect(config.retry).toBe(true)
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelay).toBe(1000)
      expect(config.enableLogging).toBe(false)
    })

    it('应该覆盖默认配置', () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        timeout: 5000,
        maxRetries: 1,
        enableLogging: true,
      })

      const config = (sdk as any).config

      expect(config.timeout).toBe(5000)
      expect(config.maxRetries).toBe(1)
      expect(config.enableLogging).toBe(true)
    })
  })

  describe('错误分类', () => {
    let sdk: GraphQLSDK

    beforeEach(() => {
      sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        retry: false, // 禁用重试以便测试错误处理
      })
    })

    it('应该识别网络错误', () => {
      const error = new Error('fetch failed')
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.NETWORK_ERROR)
      expect(parsed.message).toContain('网络连接失败')
    })

    it('应该识别认证错误（GraphQL 响应）', () => {
      const error = {
        response: {
          errors: [{ message: 'Unauthorized' }],
        },
      }
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.AUTHENTICATION_ERROR)
      expect(parsed.statusCode).toBe(401)
    })

    it('应该识别授权错误（GraphQL 响应）', () => {
      const error = {
        response: {
          errors: [{ message: 'Forbidden' }],
        },
      }
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.AUTHORIZATION_ERROR)
      expect(parsed.statusCode).toBe(403)
    })

    it('应该识别速率限制错误', () => {
      const error = {
        response: {
          errors: [{ message: 'Rate limit exceeded' }],
        },
      }
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.RATE_LIMIT_ERROR)
      expect(parsed.statusCode).toBe(429)
    })

    it('应该识别验证错误', () => {
      const error = {
        response: {
          errors: [{ message: 'Validation error: Invalid input' }],
        },
      }
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.VALIDATION_ERROR)
      expect(parsed.statusCode).toBe(400)
    })

    it('应该识别服务器错误（HTTP 状态码）', () => {
      const error = { status: 500 }
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.SERVER_ERROR)
      expect(parsed.statusCode).toBe(500)
    })

    it('应该识别未知错误', () => {
      const error = new Error('Some unknown error')
      const parsed = (sdk as any).parseError(error)

      expect(parsed).toBeInstanceOf(GraphQLSDKError)
      expect(parsed.type).toBe(GraphQLErrorType.UNKNOWN_ERROR)
      expect(parsed.message).toBe('Some unknown error')
    })
  })

  describe('请求重试机制', () => {
    it('应该在网络错误时重试请求', async () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        retry: true,
        maxRetries: 3,
        retryDelay: 100, // 快速重试以加快测试
      })

      let attemptCount = 0
      const mockAction = vi.fn(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('fetch failed')
        }
        return { data: 'success' }
      })

      // 通过反射调用私有方法（仅用于测试）
      const result = await (sdk as any).wrapRequest(
        mockAction,
        'TestQuery',
        'Query'
      )

      expect(attemptCount).toBe(3)
      expect(result).toEqual({ data: 'success' })
    })

    it('应该在认证错误时不重试', async () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        retry: true,
        maxRetries: 3,
      })

      let attemptCount = 0
      const mockAction = vi.fn(async () => {
        attemptCount++
        throw {
          response: {
            errors: [{ message: 'Unauthorized' }],
          },
        }
      })

      try {
        await (sdk as any).wrapRequest(mockAction, 'TestQuery', 'Query')
      } catch (error) {
        expect(attemptCount).toBe(1) // 只尝试一次
        expect((error as GraphQLSDKError).type).toBe(
          GraphQLErrorType.AUTHENTICATION_ERROR
        )
      }
    })

    it('应该在达到最大重试次数后抛出错误', async () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        retry: true,
        maxRetries: 2,
        retryDelay: 50,
      })

      let attemptCount = 0
      const mockAction = vi.fn(async () => {
        attemptCount++
        throw new Error('fetch failed')
      })

      try {
        await (sdk as any).wrapRequest(mockAction, 'TestQuery', 'Query')
      } catch (error) {
        expect(attemptCount).toBe(2)
        expect((error as GraphQLSDKError).type).toBe(
          GraphQLErrorType.NETWORK_ERROR
        )
      }
    })

    it('应该在禁用重试时不重试', async () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        retry: false,
      })

      let attemptCount = 0
      const mockAction = vi.fn(async () => {
        attemptCount++
        throw new Error('fetch failed')
      })

      try {
        await (sdk as any).wrapRequest(mockAction, 'TestQuery', 'Query')
      } catch (error) {
        expect(attemptCount).toBe(1)
      }
    })
  })

  describe('Token 和 Headers 管理', () => {
    let sdk: GraphQLSDK

    beforeEach(() => {
      sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
      })
    })

    it('应该成功更新认证 token', () => {
      sdk.setToken('new-token')

      // 验证 setHeader 被调用
      expect(sdk.rawClient.setHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer new-token'
      )
    })

    it('应该成功清除认证 token', () => {
      sdk.setToken(null)

      expect(sdk.rawClient.setHeader).toHaveBeenCalledWith('Authorization', '')
    })

    it('应该成功更新自定义请求头', () => {
      sdk.setHeaders({
        'X-Custom-Header-1': 'value1',
        'X-Custom-Header-2': 'value2',
      })

      expect(sdk.rawClient.setHeader).toHaveBeenCalledWith(
        'X-Custom-Header-1',
        'value1'
      )
      expect(sdk.rawClient.setHeader).toHaveBeenCalledWith(
        'X-Custom-Header-2',
        'value2'
      )
    })
  })

  describe('日志功能', () => {
    it('应该在启用日志时输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        enableLogging: true,
      })

      // 调用私有 log 方法
      ;(sdk as any).log('Test message', { data: 'test' })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GraphQL SDK] Test message',
        { data: 'test' }
      )

      consoleSpy.mockRestore()
    })

    it('应该在禁用日志时不输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
        enableLogging: false,
      })

      ;(sdk as any).log('Test message', { data: 'test' })

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('延迟函数', () => {
    it('应该正确延迟指定的毫秒数', async () => {
      const sdk = createGraphQLSDK({
        endpoint: '/api/graphql',
      })

      const startTime = Date.now()
      await (sdk as any).delay(100)
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThanOrEqual(90) // 允许一些时间误差
    })
  })
})
