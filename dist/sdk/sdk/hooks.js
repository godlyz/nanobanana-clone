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
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { defaultSDK as sdk } from './client'; // 艹！client.ts 导出的是 defaultSDK
/**
 * GraphQL Query Hook
 * 艹！这个 Hook 封装了 GraphQL 查询，提供加载状态、错误处理和自动重试
 *
 * @param queryName 查询名称（用于日志）
 * @param queryFn 查询函数
 * @param options 配置选项
 */
export function useGraphQLQuery(queryName, queryFn, options = {}) {
    const { immediate = true, pollInterval, deps = [], cancelOnUnmount = true, } = options;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);
    const pollTimerRef = useRef(null);
    // 执行查询
    const executeQuery = useCallback(async () => {
        if (!sdk) {
            console.error('[useGraphQLQuery] SDK 未初始化');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const result = await queryFn(sdk);
            if (isMountedRef.current) {
                setData(result);
                setLoading(false);
            }
        }
        catch (err) {
            if (isMountedRef.current) {
                setError(err);
                setLoading(false);
            }
            console.error(`[useGraphQLQuery] ${queryName} 失败:`, err);
        }
    }, [queryName, queryFn]);
    // 重新获取数据
    const refetch = useCallback(async () => {
        await executeQuery();
    }, [executeQuery]);
    // 设置轮询
    useEffect(() => {
        if (pollInterval && pollInterval > 0) {
            pollTimerRef.current = setInterval(() => {
                executeQuery();
            }, pollInterval);
            return () => {
                if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                }
            };
        }
    }, [pollInterval, executeQuery]);
    // 依赖项变化时重新查询
    useEffect(() => {
        if (immediate) {
            executeQuery();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, ...deps]);
    // 组件卸载时清理
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (cancelOnUnmount && pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [cancelOnUnmount]);
    return {
        data,
        loading,
        error,
        refetch,
        setData,
    };
}
/**
 * GraphQL Mutation Hook
 * 艹！这个 Hook 封装了 GraphQL 变更操作，提供加载状态和错误处理
 *
 * @param mutationFn mutation 函数
 */
export function useGraphQLMutation(mutationFn) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);
    // 执行 mutation
    const execute = useCallback(async (variables) => {
        if (!sdk) {
            throw new Error('SDK 未初始化');
        }
        try {
            setLoading(true);
            setError(null);
            const result = await mutationFn(sdk, variables);
            if (isMountedRef.current) {
                setData(result);
                setLoading(false);
            }
            return result;
        }
        catch (err) {
            if (isMountedRef.current) {
                setError(err);
                setLoading(false);
            }
            throw err;
        }
    }, [mutationFn]);
    // 重置状态
    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);
    // 组件卸载时清理
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    return {
        execute,
        loading,
        error,
        data,
        reset,
    };
}
/**
 * 获取当前用户 Hook
 * 艹！这个 Hook 是 useGraphQLQuery 的快捷方式，专门用于获取当前用户
 */
export function useCurrentUser(options) {
    return useGraphQLQuery('GetMe', async (sdk) => {
        const result = await sdk.api.GetMe();
        return result.me;
    }, options);
}
/**
 * 获取博客文章列表 Hook
 */
export function useBlogPosts(variables, options) {
    return useGraphQLQuery('GetPublishedBlogPosts', async (sdk) => {
        const result = await sdk.api.GetPublishedBlogPosts({
            limit: variables?.limit,
            offset: variables?.offset,
        });
        return result.blogPosts;
    }, { ...options, deps: [variables?.limit, variables?.offset, variables?.status] });
}
/**
 * 获取单个博客文章 Hook
 */
export function useBlogPost(postId, options) {
    return useGraphQLQuery('GetBlogPost', async (sdk) => {
        if (!postId)
            return null;
        const result = await sdk.api.GetBlogPost({ id: postId });
        return result.blogPost;
    }, { ...options, immediate: !!postId, deps: [postId] });
}
/**
 * Echo Mutation Hook（测试用）
 */
export function useEchoMutation() {
    return useGraphQLMutation(async (sdk, variables) => {
        const result = await sdk.api.TestEcho(variables);
        return result.echo;
    });
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
export function useGraphQLSubscription(subscriptionName, query, options = {}) {
    const { immediate = true, autoReconnect = true, reconnectDelay = 3000, deps = [], } = options;
    const [data, setData] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    /**
     * 艹！连接 SSE（Server-Sent Events）
     */
    const connect = useCallback(() => {
        // 艹！清理旧连接
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        // 艹！清除重连定时器
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        try {
            // 艹！SDK 必须存在，不然没法连接
            if (!sdk) {
                throw new Error('SDK 未初始化，无法建立 Subscription 连接');
            }
            // 艹！构建 SSE URL（graphql-yoga 使用 GET 请求 + query 参数）
            const endpoint = sdk.getEndpoint() || '/api/graphql';
            const url = new URL(endpoint, window.location.origin);
            url.searchParams.set('query', query);
            // 创建 EventSource 连接
            const eventSource = new EventSource(url.toString(), {
                withCredentials: true, // 艹！发送 Cookie 认证
            });
            eventSourceRef.current = eventSource;
            // 艹！监听连接打开事件
            eventSource.onopen = () => {
                console.log(`[GraphQL Subscription] ${subscriptionName} 连接成功`);
                setConnected(true);
                setError(null);
            };
            // 艹！监听消息推送
            eventSource.onmessage = (event) => {
                try {
                    const result = JSON.parse(event.data);
                    // 艹！检查 GraphQL 错误
                    if (result.errors) {
                        const errorMessage = result.errors.map((err) => err.message).join(', ');
                        throw new Error(errorMessage);
                    }
                    // 艹！提取订阅数据
                    if (result.data) {
                        console.log(`[GraphQL Subscription] ${subscriptionName} 收到数据:`, result.data);
                        setData(result.data);
                    }
                }
                catch (err) {
                    console.error(`[GraphQL Subscription] ${subscriptionName} 解析数据失败:`, err);
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            };
            // 艹！监听错误事件
            eventSource.onerror = (event) => {
                console.error(`[GraphQL Subscription] ${subscriptionName} 连接错误:`, event);
                setConnected(false);
                setError(new Error(`Subscription connection error: ${subscriptionName}`));
                // 艹！自动重连
                if (autoReconnect) {
                    console.log(`[GraphQL Subscription] ${subscriptionName} 将在 ${reconnectDelay}ms 后重连...`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectDelay);
                }
            };
        }
        catch (err) {
            console.error(`[GraphQL Subscription] ${subscriptionName} 创建连接失败:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setConnected(false);
        }
    }, [subscriptionName, query, autoReconnect, reconnectDelay]);
    /**
     * 艹！断开连接
     */
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            console.log(`[GraphQL Subscription] ${subscriptionName} 主动断开连接`);
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setConnected(false);
    }, [subscriptionName]);
    /**
     * 艹！手动重新连接
     */
    const reconnect = useCallback(() => {
        disconnect();
        connect();
    }, [connect, disconnect]);
    // 艹！立即连接或依赖变化时重新连接
    useEffect(() => {
        if (immediate) {
            connect();
        }
        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, ...deps]);
    return {
        data,
        connected,
        error,
        reconnect,
        disconnect,
    };
}
/**
 * 艹！订阅新博客文章 Hook（简化版）
 * 使用预定义的 Subscription 查询
 */
export function useNewBlogPost(options) {
    return useGraphQLSubscription('OnNewBlogPost', `subscription OnNewBlogPost {
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
    }`, options);
}
/**
 * 艹！订阅服务器时间 Hook（测试用）
 * 每秒推送当前时间，用于测试 Subscription 功能
 */
export function useCurrentTime(options) {
    return useGraphQLSubscription('OnCurrentTime', `subscription OnCurrentTime {
      currentTime
    }`, options);
}
//# sourceMappingURL=hooks.js.map