/**
 * GraphQL SDK 使用示例
 * 艹！这个文件展示了如何正确使用 GraphQL SDK
 *
 * 老王我提醒你：
 * 1. SDK 已经自动处理认证，不要tm手动加token
 * 2. SDK 已经自动处理重试，不要tm自己重试
 * 3. SDK 已经有完整的类型提示，别tm不看类型乱写
 * 4. SDK 已经有完整的错误处理，别tm吃掉错误
 */
import type { User } from '../generated/types';
/**
 * 示例 1: 创建 SDK 客户端（客户端使用）
 * 艹！大部分情况用 defaultSDK 就够了，别tm每次都创建新实例
 */
declare function example1_CreateSDK(): import("./client").GraphQLSDK;
/**
 * 示例 2: 创建 SDK 客户端（服务端使用）
 * 艹！服务端需要完整的 URL，别tm用相对路径
 */
declare function example2_CreateSDKForServer(): import("./client").GraphQLSDK;
/**
 * 示例 3: 获取当前登录用户信息
 * 艹！这是最常用的查询，别tm写错了
 */
declare function example3_GetMe(): Promise<{
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
 * 示例 4: 查询博客列表（带分页和过滤）
 * 艹！这个示例展示了如何使用分页和过滤参数
 */
declare function example4_GetBlogPosts(): Promise<{
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
}[]>;
/**
 * 示例 5: 测试 Echo Mutation（占位示例）
 * 艹！CreateBlogPost Mutation 尚未实现，先用 TestEcho 演示 Mutation 用法
 */
declare function example5_TestEchoMutation(): Promise<string | null | undefined>;
/**
 * 示例 6: 测试 Echo Mutation（复用示例）
 * 艹！UpdateUserProfile Mutation 尚未实现，暂时注释
 */
declare function example6_TestEchoAgain(): Promise<string | null | undefined>;
/**
 * 示例 7: 错误处理（类型安全）
 * 艹！这个示例展示了如何正确处理错误
 */
declare function example7_ErrorHandling(): Promise<{
    __typename?: "User";
    id?: string | null;
    email?: string | null;
    createdAt?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    followerCount?: number | null;
    followingCount?: number | null;
    postCount?: number | null;
    artworkCount?: number | null;
} | null | undefined>;
/**
 * 示例 8: 手动设置认证 token
 * 艹！特殊情况下需要手动设置 token（例如服务端 API Routes）
 */
declare function example8_ManualSetToken(): Promise<{
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
 * 示例 9: 使用原始 GraphQL 请求（自定义查询）
 * 艹！如果 SDK 生成的方法不够用，可以用原始请求
 */
declare function example9_RawRequest(): Promise<User | null>;
/**
 * 示例 10: React Hook 中使用（推荐模式）
 * 艹！这是在 React 组件中使用 SDK 的最佳实践
 */
declare function example10_ReactHookUsage(): () => Promise<{
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
 * 导出所有示例（用于测试）
 */
export declare const examples: {
    example1_CreateSDK: typeof example1_CreateSDK;
    example2_CreateSDKForServer: typeof example2_CreateSDKForServer;
    example3_GetMe: typeof example3_GetMe;
    example4_GetBlogPosts: typeof example4_GetBlogPosts;
    example5_TestEchoMutation: typeof example5_TestEchoMutation;
    example6_TestEchoAgain: typeof example6_TestEchoAgain;
    example7_ErrorHandling: typeof example7_ErrorHandling;
    example8_ManualSetToken: typeof example8_ManualSetToken;
    example9_RawRequest: typeof example9_RawRequest;
    example10_ReactHookUsage: typeof example10_ReactHookUsage;
};
export {};
/**
 * 艹！老王我的使用建议：
 *
 * 1. 客户端组件（浏览器）：
 *    - 使用 defaultSDK（全局单例）
 *    - SDK 会自动从 Supabase 获取 token
 *    - 不需要手动处理认证
 *
 * 2. 服务端组件 / API Routes：
 *    - 创建新的 SDK 实例
 *    - 使用完整的 URL（不要用相对路径）
 *    - 手动从 cookies/headers 获取 token 并设置
 *
 * 3. 错误处理：
 *    - 使用 try-catch 包裹所有 API 调用
 *    - 错误类型是 GraphQLSDKError（有完整的类型信息）
 *    - 使用 error.type 判断错误类型
 *    - 使用 error.toUserMessage() 获取国际化消息
 *
 * 4. 类型安全：
 *    - 所有 API 方法都有完整的类型提示
 *    - 输入参数会自动验证类型
 *    - 返回值类型完全准确
 *    - 别tm忽略 TypeScript 错误
 *
 * 5. 性能优化：
 *    - defaultSDK 是单例，不会重复创建
 *    - SDK 有自动重试机制（网络错误/超时）
 *    - SDK 有请求日志（开发环境）
 */
//# sourceMappingURL=usage-examples.d.ts.map