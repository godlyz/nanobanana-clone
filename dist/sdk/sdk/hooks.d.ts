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
import { GraphQLSDK, GraphQLSDKError } from './client';
/**
 * Query Hook 返回类型
 */
export interface UseGraphQLQueryResult<TData> {
    /** 查询数据 */
    data: TData | null;
    /** 加载状态 */
    loading: boolean;
    /** 错误信息 */
    error: GraphQLSDKError | null;
    /** 重新获取数据 */
    refetch: () => Promise<void>;
    /** 手动设置数据 */
    setData: (data: TData | null) => void;
}
/**
 * Mutation Hook 返回类型
 */
export interface UseGraphQLMutationResult<TData, TVariables> {
    /** 执行 mutation */
    execute: (variables?: TVariables) => Promise<TData>;
    /** 加载状态 */
    loading: boolean;
    /** 错误信息 */
    error: GraphQLSDKError | null;
    /** mutation 结果数据 */
    data: TData | null;
    /** 重置状态 */
    reset: () => void;
}
/**
 * Query Hook 配置
 */
export interface UseGraphQLQueryOptions {
    /** 是否立即执行查询（默认 true） */
    immediate?: boolean;
    /** 轮询间隔（毫秒，0 或 undefined 表示不轮询） */
    pollInterval?: number;
    /** 依赖项数组（变化时重新查询） */
    deps?: any[];
    /** 是否在组件卸载时取消请求（默认 true） */
    cancelOnUnmount?: boolean;
}
/**
 * GraphQL Query Hook
 * 艹！这个 Hook 封装了 GraphQL 查询，提供加载状态、错误处理和自动重试
 *
 * @param queryName 查询名称（用于日志）
 * @param queryFn 查询函数
 * @param options 配置选项
 */
export declare function useGraphQLQuery<TData>(queryName: string, queryFn: (sdk: GraphQLSDK) => Promise<TData>, options?: UseGraphQLQueryOptions): UseGraphQLQueryResult<TData>;
/**
 * GraphQL Mutation Hook
 * 艹！这个 Hook 封装了 GraphQL 变更操作，提供加载状态和错误处理
 *
 * @param mutationFn mutation 函数
 */
export declare function useGraphQLMutation<TData, TVariables = void>(mutationFn: (sdk: GraphQLSDK, variables: TVariables) => Promise<TData>): UseGraphQLMutationResult<TData, TVariables>;
/**
 * 获取当前用户 Hook
 * 艹！这个 Hook 是 useGraphQLQuery 的快捷方式，专门用于获取当前用户
 */
export declare function useCurrentUser(options?: UseGraphQLQueryOptions): UseGraphQLQueryResult<{
    __typename?: "User";
    id?: string | null;
    email?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    location?: string | null;
    websiteUrl?: string | null;
    twitterHandle?: string | null;
    githubHandle?: string | null;
    instagramHandle?: string | null;
    followerCount?: number | null;
    followingCount?: number | null;
    postCount?: number | null;
    artworkCount?: number | null;
    totalLikes?: number | null;
} | null | undefined>;
/**
 * 获取博客文章列表 Hook
 */
export declare function useBlogPosts(variables?: {
    limit?: number;
    offset?: number;
    status?: string;
}, options?: UseGraphQLQueryOptions): UseGraphQLQueryResult<{
    __typename?: "BlogPost";
    id?: string | null;
    title?: string | null;
    excerpt?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
    viewCount?: number | null;
    likeCount?: number | null;
    commentCount?: number | null;
    author?: {
        __typename?: "User";
        id?: string | null;
        displayName?: string | null;
        avatarUrl?: string | null;
    } | null;
}[] | null | undefined>;
/**
 * 获取单个博客文章 Hook
 */
export declare function useBlogPost(postId: string | null, options?: UseGraphQLQueryOptions): UseGraphQLQueryResult<{
    __typename?: "BlogPost";
    id?: string | null;
    title?: string | null;
    slug?: string | null;
    content?: string | null;
    excerpt?: string | null;
    coverImageUrl?: string | null;
    status?: import("../generated/types").BlogPostStatus | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    viewCount?: number | null;
    likeCount?: number | null;
    commentCount?: number | null;
    isLiked?: boolean | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    author?: {
        __typename?: "User";
        id?: string | null;
        email?: string | null;
        displayName?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
    } | null;
} | null | undefined>;
/**
 * Echo Mutation Hook（测试用）
 */
export declare function useEchoMutation(): UseGraphQLMutationResult<string | null | undefined, {
    message: string;
}>;
/**
 * Subscription Hook 返回类型
 */
export interface UseGraphQLSubscriptionResult<TData> {
    /** 订阅数据（最新推送的数据） */
    data: TData | null;
    /** 连接状态 */
    connected: boolean;
    /** 错误信息 */
    error: Error | null;
    /** 手动重新连接 */
    reconnect: () => void;
    /** 手动断开连接 */
    disconnect: () => void;
}
/**
 * Subscription Hook 配置
 */
export interface UseGraphQLSubscriptionOptions {
    /** 是否立即连接（默认 true） */
    immediate?: boolean;
    /** 自动重连（默认 true） */
    autoReconnect?: boolean;
    /** 重连延迟（毫秒，默认 3000） */
    reconnectDelay?: number;
    /** 依赖项数组（变化时重新订阅） */
    deps?: any[];
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
export declare function useGraphQLSubscription<TData = any>(subscriptionName: string, query: string, options?: UseGraphQLSubscriptionOptions): UseGraphQLSubscriptionResult<TData>;
/**
 * 艹！订阅新博客文章 Hook（简化版）
 * 使用预定义的 Subscription 查询
 */
export declare function useNewBlogPost(options?: UseGraphQLSubscriptionOptions): UseGraphQLSubscriptionResult<any>;
/**
 * 艹！订阅服务器时间 Hook（测试用）
 * 每秒推送当前时间，用于测试 Subscription 功能
 */
export declare function useCurrentTime(options?: UseGraphQLSubscriptionOptions): UseGraphQLSubscriptionResult<any>;
//# sourceMappingURL=hooks.d.ts.map