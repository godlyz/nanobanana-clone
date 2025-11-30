/**
 * GraphQL SDK 客户端
 * 艹！这个文件封装了 GraphQL 客户端，提供类型安全的查询方法
 *
 * 主要功能：
 * - 自动注入认证 token
 * - 统一错误处理
 * - 请求重试机制
 * - 请求/响应拦截器
 * - 类型安全的方法封装
 */
import { GraphQLClient } from 'graphql-request';
import type { RequestDocument, Variables } from 'graphql-request';
/**
 * GraphQL 错误分类（Week 8增强：新增更细致的错误类型）
 */
export declare enum GraphQLErrorType {
    NETWORK_ERROR = "NETWORK_ERROR",// 网络错误
    TIMEOUT_ERROR = "TIMEOUT_ERROR",// 请求超时
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",// 认证错误（401）
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",// 授权错误（403）
    BAD_REQUEST_ERROR = "BAD_REQUEST_ERROR",// 请求错误（400）
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",// 资源未找到（404）
    CONFLICT_ERROR = "CONFLICT_ERROR",// 冲突错误（409）
    VALIDATION_ERROR = "VALIDATION_ERROR",// 验证错误（400）
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",// 速率限制错误（429）
    SERVER_ERROR = "SERVER_ERROR",// 服务器错误（500）
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",// 服务器内部错误（500）
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",// 服务不可用（503）
    GRAPHQL_VALIDATION_ERROR = "GRAPHQL_VALIDATION_ERROR",// GraphQL语法错误
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * GraphQL 错误类（Week 8增强：新增错误码和详细信息）
 */
export declare class GraphQLSDKError extends Error {
    /** 错误类型（分类） */
    type: GraphQLErrorType;
    /** HTTP 状态码 */
    statusCode?: number;
    /** 错误码（ERR_XXX_YYY 格式） */
    code?: string;
    /** 原始错误对象 */
    originalError?: Error;
    /** GraphQL 响应对象 */
    response?: any;
    /** 额外的错误详情（用于调试或显示） */
    details?: Record<string, any>;
    /** 时间戳 */
    timestamp: Date;
    constructor(message: string, type: GraphQLErrorType, options?: {
        statusCode?: number;
        code?: string;
        originalError?: Error;
        response?: any;
        details?: Record<string, any>;
    });
    /**
     * 艹！转换为 JSON 格式（用于日志记录）
     */
    toJSON(): {
        name: string;
        message: string;
        type: GraphQLErrorType;
        code: string | undefined;
        statusCode: number | undefined;
        details: Record<string, any> | undefined;
        timestamp: string;
    };
    /**
     * 艹！转换为用户友好的消息（支持中英双语）
     */
    toUserMessage(locale?: 'zh' | 'en'): string;
}
/**
 * SDK 配置选项
 */
export interface GraphQLSDKConfig {
    /** GraphQL API endpoint URL */
    endpoint: string;
    /** 认证 token（可选） */
    token?: string;
    /** 自定义请求头（可选） */
    headers?: Record<string, string>;
    /** 请求超时时间（毫秒，默认 30000） */
    timeout?: number;
    /** 是否启用重试（默认 true） */
    retry?: boolean;
    /** 最大重试次数（默认 3） */
    maxRetries?: number;
    /** 重试延迟（毫秒，默认 1000） */
    retryDelay?: number;
    /** 是否启用请求日志（默认 false） */
    enableLogging?: boolean;
}
/**
 * GraphQL SDK 客户端类
 * 艹！这个类封装了所有 GraphQL 操作，提供完美的类型安全
 */
export declare class GraphQLSDK {
    private client;
    private sdk;
    private config;
    constructor(config: GraphQLSDKConfig);
    /**
     * 构建请求头
     */
    private buildHeaders;
    /**
     * 艹！获取 GraphQL endpoint（供外部使用，比如 Subscription）
     */
    getEndpoint(): string;
    /**
     * 包装请求，添加重试和错误处理
     */
    private wrapRequest;
    /**
     * 解析错误（Week 8增强：使用新的错误码和详细错误类型）
     */
    private parseError;
    /**
     * 延迟函数
     */
    private delay;
    /**
     * 日志输出
     */
    private log;
    /**
     * 更新认证 token
     */
    setToken(token: string | null): void;
    /**
     * 更新请求头
     */
    setHeaders(headers: Record<string, string>): void;
    /**
     * 获取 SDK 实例
     * 艹！这个方法返回自动生成的 SDK，包含所有查询和变更方法
     */
    get api(): {
        TestHello(variables?: import("../generated/types").TestHelloQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").TestHelloQuery>;
        TestCurrentTime(variables?: import("../generated/types").TestCurrentTimeQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").TestCurrentTimeQuery>;
        TestCombined(variables?: import("../generated/types").TestCombinedQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").TestCombinedQuery>;
        GetMe(variables?: import(".").GetMeQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetMeQuery>;
        GetMeBasic(variables?: import("../generated/types").GetMeBasicQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").GetMeBasicQuery>;
        GetUser(variables: import(".").GetUserQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetUserQuery>;
        GetUserSocials(variables: import("../generated/types").GetUserSocialsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").GetUserSocialsQuery>;
        GetPublishedBlogPosts(variables?: import(".").GetPublishedBlogPostsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetPublishedBlogPostsQuery>;
        GetBlogPost(variables: import(".").GetBlogPostQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostQuery>;
        GetBlogPostsWithAuthor(variables?: import("../generated/types").GetBlogPostsWithAuthorQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostsWithAuthorQuery>;
        GetLatestBlogPosts(variables?: import("../generated/types").GetLatestBlogPostsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetLatestBlogPostsQuery>;
        GetDraftBlogPosts(variables?: import("../generated/types").GetDraftBlogPostsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetDraftBlogPostsQuery>;
        GetBlogPostsConnection(variables?: import(".").GetBlogPostsConnectionQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostsConnectionQuery>;
        GetNextPageBlogPosts(variables: import(".").GetNextPageBlogPostsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetNextPageBlogPostsQuery>;
        GetPreviousPageBlogPosts(variables: import(".").GetPreviousPageBlogPostsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetPreviousPageBlogPostsQuery>;
        GetBlogPostsByViewCount(variables?: import("../generated/types").GetBlogPostsByViewCountQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostsByViewCountQuery>;
        GetBlogPostsByLikeCount(variables?: import("../generated/types").GetBlogPostsByLikeCountQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostsByLikeCountQuery>;
        GetFullBlogPostsConnection(variables?: import(".").GetFullBlogPostsConnectionQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetFullBlogPostsConnectionQuery>;
        TestEcho(variables: import(".").TestEchoMutationVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").TestEchoMutation>;
        GetDashboardData(variables?: import("../generated/types").GetDashboardDataQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetDashboardDataQuery>;
        GetMultipleBlogPostLists(variables?: import("../generated/types").GetMultipleBlogPostListsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetMultipleBlogPostListsQuery>;
        GetBlogPostsWithFragments(variables?: import("../generated/types").GetBlogPostsWithFragmentsQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostsWithFragmentsQuery>;
        GetBlogPostWithFullAuthorInfo(variables: import(".").GetBlogPostWithFullAuthorInfoQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetBlogPostWithFullAuthorInfoQuery>;
        GetMultipleUsers(variables: import(".").GetMultipleUsersQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetMultipleUsersQuery>;
        GetConditionalData(variables?: import(".").GetConditionalDataQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetConditionalDataQuery>;
        GetOptimizedBlogPostList(variables?: import("../generated/types").GetOptimizedBlogPostListQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetOptimizedBlogPostListQuery>;
        GetDeepNestedData(variables?: import("../generated/types").GetDeepNestedDataQueryVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import(".").GetDeepNestedDataQuery>;
        OnNewBlogPost(variables?: import("../generated/types").OnNewBlogPostSubscriptionVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").OnNewBlogPostSubscription>;
        OnCurrentTime(variables?: import("../generated/types").OnCurrentTimeSubscriptionVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").OnCurrentTimeSubscription>;
        OnNewBlogPostSimple(variables?: import("../generated/types").OnNewBlogPostSimpleSubscriptionVariables, requestHeaders?: HeadersInit | undefined, signal?: RequestInit["signal"]): Promise<import("../generated/types").OnNewBlogPostSimpleSubscription>;
    };
    /**
     * 原始 GraphQL 客户端（用于自定义请求）
     */
    get rawClient(): GraphQLClient;
    /**
     * 执行原始 GraphQL 请求
     * 艹！graphql-request v7 的 API 变了，参数需要这样传
     */
    request<TData = any, TVariables extends Variables = Variables>(document: RequestDocument, variables?: TVariables): Promise<TData>;
}
/**
 * 创建 GraphQL SDK 实例（工厂函数）
 */
export declare function createGraphQLSDK(config: GraphQLSDKConfig): GraphQLSDK;
/**
 * 默认 SDK 实例（使用环境变量配置）
 */
export declare const defaultSDK: GraphQLSDK | null;
//# sourceMappingURL=client.d.ts.map