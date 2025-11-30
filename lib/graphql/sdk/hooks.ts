/**
 * GraphQL SDK React Hooks
 * 艹！这个文件提供了 React Hooks 封装，让组件中使用 GraphQL 更方便
 *
 * @example
 * ```typescript
 * import { useGraphQLQuery, useGraphQLMutation } from '@/lib/graphql/sdk/hooks'
 *
 * function MyComponent() {
 *   const { data, loading, error, refetch } = useGraphQLQuery(
 *     'GetMe',
 *     async (sdk) => sdk.api.GetMe()
 *   )
 *
 *   const { execute: echo, loading: echoLoading } = useGraphQLMutation(
 *     async (sdk, variables) => sdk.api.TestEcho(variables)
 *   )
 *
 *   return ...
 * }
 * ```
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { defaultSDK as sdk, GraphQLSDK, GraphQLSDKError } from './client' // 艹！client.ts 导出的是 defaultSDK

/**
 * Query Hook 返回类型
 */
export interface UseGraphQLQueryResult<TData> {
  /** 查询数据 */
  data: TData | null

  /** 加载状态 */
  loading: boolean

  /** 错误信息 */
  error: GraphQLSDKError | null

  /** 重新获取数据 */
  refetch: () => Promise<void>

  /** 手动设置数据 */
  setData: (data: TData | null) => void
}

/**
 * Mutation Hook 返回类型
 */
export interface UseGraphQLMutationResult<TData, TVariables> {
  /** 执行 mutation */
  execute: (variables?: TVariables) => Promise<TData>

  /** 加载状态 */
  loading: boolean

  /** 错误信息 */
  error: GraphQLSDKError | null

  /** mutation 结果数据 */
  data: TData | null

  /** 重置状态 */
  reset: () => void
}

/**
 * Query Hook 配置
 */
export interface UseGraphQLQueryOptions {
  /** 是否立即执行查询（默认 true） */
  immediate?: boolean

  /** 轮询间隔（毫秒，0 或 undefined 表示不轮询） */
  pollInterval?: number

  /** 依赖项数组（变化时重新查询） */
  deps?: any[]

  /** 是否在组件卸载时取消请求（默认 true） */
  cancelOnUnmount?: boolean
}

/**
 * GraphQL Query Hook
 * 艹！这个 Hook 封装了 GraphQL 查询，提供加载状态、错误处理和自动重试
 *
 * @param queryName 查询名称（用于日志）
 * @param queryFn 查询函数
 * @param options 配置选项
 */
export function useGraphQLQuery<TData>(
  queryName: string,
  queryFn: (sdk: GraphQLSDK) => Promise<TData>,
  options: UseGraphQLQueryOptions = {}
): UseGraphQLQueryResult<TData> {
  const {
    immediate = true,
    pollInterval,
    deps = [],
    cancelOnUnmount = true,
  } = options

  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<GraphQLSDKError | null>(null)

  const isMountedRef = useRef(true)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 执行查询
  const executeQuery = useCallback(async () => {
    if (!sdk) {
      console.error('[useGraphQLQuery] SDK 未初始化')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await queryFn(sdk)

      if (isMountedRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as GraphQLSDKError)
        setLoading(false)
      }
      console.error(`[useGraphQLQuery] ${queryName} 失败:`, err)
    }
  }, [queryName, queryFn])

  // 重新获取数据
  const refetch = useCallback(async () => {
    await executeQuery()
  }, [executeQuery])

  // 设置轮询
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        executeQuery()
      }, pollInterval)

      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }
    }
  }, [pollInterval, executeQuery])

  // 依赖项变化时重新查询
  useEffect(() => {
    if (immediate) {
      executeQuery()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (cancelOnUnmount && pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [cancelOnUnmount])

  return {
    data,
    loading,
    error,
    refetch,
    setData,
  }
}

/**
 * GraphQL Mutation Hook
 * 艹！这个 Hook 封装了 GraphQL 变更操作，提供加载状态和错误处理
 *
 * @param mutationFn mutation 函数
 */
export function useGraphQLMutation<TData, TVariables = void>(
  mutationFn: (sdk: GraphQLSDK, variables: TVariables) => Promise<TData>
): UseGraphQLMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GraphQLSDKError | null>(null)

  const isMountedRef = useRef(true)

  // 执行 mutation
  const execute = useCallback(
    async (variables?: TVariables): Promise<TData> => {
      if (!sdk) {
        throw new Error('SDK 未初始化')
      }

      try {
        setLoading(true)
        setError(null)

        const result = await mutationFn(sdk, variables as TVariables)

        if (isMountedRef.current) {
          setData(result)
          setLoading(false)
        }

        return result
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as GraphQLSDKError)
          setLoading(false)
        }
        throw err
      }
    },
    [mutationFn]
  )

  // 重置状态
  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    execute,
    loading,
    error,
    data,
    reset,
  }
}

/**
 * 获取当前用户 Hook
 * 艹！这个 Hook 是 useGraphQLQuery 的快捷方式，专门用于获取当前用户
 */
export function useCurrentUser(options?: UseGraphQLQueryOptions) {
  return useGraphQLQuery(
    'GetMe',
    async (sdk) => {
      const result = await sdk.api.GetMe()
      return result.me
    },
    options
  )
}

/**
 * 获取博客文章列表 Hook
 */
export function useBlogPosts(
  variables?: { limit?: number; offset?: number; status?: string },
  options?: UseGraphQLQueryOptions
) {
  return useGraphQLQuery(
    'GetPublishedBlogPosts',
    async (sdk) => {
      const result = await sdk.api.GetPublishedBlogPosts({
        limit: variables?.limit,
        offset: variables?.offset,
      })
      return result.blogPosts
    },
    { ...options, deps: [variables?.limit, variables?.offset, variables?.status] }
  )
}

/**
 * 获取单个博客文章 Hook
 */
export function useBlogPost(postId: string | null, options?: UseGraphQLQueryOptions) {
  return useGraphQLQuery(
    'GetBlogPost',
    async (sdk) => {
      if (!postId) return null
      const result = await sdk.api.GetBlogPost({ id: postId })
      return result.blogPost
    },
    { ...options, immediate: !!postId, deps: [postId] }
  )
}

/**
 * Echo Mutation Hook（测试用）
 */
export function useEchoMutation() {
  return useGraphQLMutation(async (sdk, variables: { message: string }) => {
    const result = await sdk.api.TestEcho(variables)
    return result.echo
  })
}

// 艹！Week 8新增：GraphQL Subscription Hook（实时推送）

/**
 * Subscription Hook 返回类型
 */
export interface UseGraphQLSubscriptionResult<TData> {
  /** 订阅数据（最新推送的数据） */
  data: TData | null

  /** 连接状态 */
  connected: boolean

  /** 错误信息 */
  error: Error | null

  /** 手动重新连接 */
  reconnect: () => void

  /** 手动断开连接 */
  disconnect: () => void
}

/**
 * Subscription Hook 配置
 */
export interface UseGraphQLSubscriptionOptions {
  /** 是否立即连接（默认 true） */
  immediate?: boolean

  /** 自动重连（默认 true） */
  autoReconnect?: boolean

  /** 重连延迟（毫秒，默认 3000） */
  reconnectDelay?: number

  /** 依赖项数组（变化时重新订阅） */
  deps?: any[]
}

/**
 * GraphQL Subscription Hook
 * 艹！这个 Hook 封装了 GraphQL Subscription，使用 Server-Sent Events (SSE) 实现实时推送
 *
 * @param subscriptionName 订阅名称（用于日志）
 * @param query GraphQL Subscription 查询字符串
 * @param options 配置选项
 *
 * @example
 * ```typescript
 * // 订阅新文章
 * const { data: newPost, connected } = useGraphQLSubscription(
 *   'OnNewBlogPost',
 *   `subscription { newBlogPost { id title } }`,
 *   { immediate: true }
 * )
 *
 * // 订阅服务器时间（测试用）
 * const { data: currentTime, connected } = useGraphQLSubscription(
 *   'OnCurrentTime',
 *   `subscription { currentTime }`,
 *   { immediate: true }
 * )
 * ```
 */
export function useGraphQLSubscription<TData = any>(
  subscriptionName: string,
  query: string,
  options: UseGraphQLSubscriptionOptions = {}
): UseGraphQLSubscriptionResult<TData> {
  const {
    immediate = true,
    autoReconnect = true,
    reconnectDelay = 3000,
    deps = [],
  } = options

  const [data, setData] = useState<TData | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 艹！连接 SSE（Server-Sent Events）
   */
  const connect = useCallback(() => {
    // 艹！清理旧连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // 艹！清除重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      // 艹！SDK 必须存在，不然没法连接
      if (!sdk) {
        throw new Error('SDK 未初始化，无法建立 Subscription 连接')
      }

      // 艹！构建 SSE URL（graphql-yoga 使用 GET 请求 + query 参数）
      const endpoint = sdk.getEndpoint() || '/api/graphql'
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set('query', query)

      // 创建 EventSource 连接
      const eventSource = new EventSource(url.toString(), {
        withCredentials: true, // 艹！发送 Cookie 认证
      })

      eventSourceRef.current = eventSource

      // 艹！监听连接打开事件
      eventSource.onopen = () => {
        console.log(`[GraphQL Subscription] ${subscriptionName} 连接成功`)
        setConnected(true)
        setError(null)
      }

      // 艹！监听消息推送
      eventSource.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data)

          // 艹！检查 GraphQL 错误
          if (result.errors) {
            const errorMessage = result.errors.map((err: any) => err.message).join(', ')
            throw new Error(errorMessage)
          }

          // 艹！提取订阅数据
          if (result.data) {
            console.log(`[GraphQL Subscription] ${subscriptionName} 收到数据:`, result.data)
            setData(result.data as TData)
          }
        } catch (err) {
          console.error(`[GraphQL Subscription] ${subscriptionName} 解析数据失败:`, err)
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      }

      // 艹！监听错误事件
      eventSource.onerror = (event) => {
        console.error(`[GraphQL Subscription] ${subscriptionName} 连接错误:`, event)
        setConnected(false)
        setError(new Error(`Subscription connection error: ${subscriptionName}`))

        // 艹！自动重连
        if (autoReconnect) {
          console.log(`[GraphQL Subscription] ${subscriptionName} 将在 ${reconnectDelay}ms 后重连...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      }
    } catch (err) {
      console.error(`[GraphQL Subscription] ${subscriptionName} 创建连接失败:`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setConnected(false)
    }
  }, [subscriptionName, query, autoReconnect, reconnectDelay])

  /**
   * 艹！断开连接
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log(`[GraphQL Subscription] ${subscriptionName} 主动断开连接`)
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setConnected(false)
  }, [subscriptionName])

  /**
   * 艹！手动重新连接
   */
  const reconnect = useCallback(() => {
    disconnect()
    connect()
  }, [connect, disconnect])

  // 艹！立即连接或依赖变化时重新连接
  useEffect(() => {
    if (immediate) {
      connect()
    }

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps])

  return {
    data,
    connected,
    error,
    reconnect,
    disconnect,
  }
}

/**
 * 艹！订阅新博客文章 Hook（简化版）
 * 使用预定义的 Subscription 查询
 */
export function useNewBlogPost(options?: UseGraphQLSubscriptionOptions) {
  return useGraphQLSubscription(
    'OnNewBlogPost',
    `subscription OnNewBlogPost {
      newBlogPost {
        id
        title
        slug
        excerpt
        coverImageUrl
        publishedAt
        author {
          displayName
          avatarUrl
        }
      }
    }`,
    options
  )
}

/**
 * 艹！订阅服务器时间 Hook（测试用）
 * 每秒推送当前时间，用于测试 Subscription 功能
 */
export function useCurrentTime(options?: UseGraphQLSubscriptionOptions) {
  return useGraphQLSubscription(
    'OnCurrentTime',
    `subscription OnCurrentTime {
      currentTime
    }`,
    options
  )
}
