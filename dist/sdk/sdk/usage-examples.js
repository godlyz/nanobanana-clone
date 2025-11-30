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
import { createGraphQLSDK } from './client';
/**
 * 示例 1: 创建 SDK 客户端（客户端使用）
 * 艹！大部分情况用 defaultSDK 就够了，别tm每次都创建新实例
 */
function example1_CreateSDK() {
    // 客户端使用（浏览器）
    const sdk = createGraphQLSDK({
        endpoint: '/api/graphql', // 相对路径（通过 Next.js API Routes）
        enableLogging: process.env.NODE_ENV === 'development',
    });
    return sdk;
}
/**
 * 示例 2: 创建 SDK 客户端（服务端使用）
 * 艹！服务端需要完整的 URL，别tm用相对路径
 */
function example2_CreateSDKForServer() {
    // 服务端使用（API Routes / Server Components）
    const sdk = createGraphQLSDK({
        endpoint: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/graphql`
            : 'http://localhost:3000/api/graphql',
        enableLogging: false, // 服务端不需要日志（已有服务端日志）
    });
    return sdk;
}
/**
 * 示例 3: 获取当前登录用户信息
 * 艹！这是最常用的查询，别tm写错了
 */
async function example3_GetMe() {
    const sdk = example1_CreateSDK();
    try {
        // ✅ 正确：使用 SDK 生成的方法（完美的类型提示）
        // 艹！方法名是 GetMe 而不是 GetCurrentUser
        const result = await sdk.api.GetMe();
        // 艹！注意：result 是完整的查询结果，me 在里面（不是 user）
        // 艹！result.me 可能是 undefined，让 TypeScript 自动推断类型
        const user = result.me;
        if (user) {
            console.log('当前用户:', {
                id: user.id,
                displayName: user.displayName, // 艹！User 类型没有 username，用 displayName
                email: user.email,
            });
        }
        else {
            console.log('未登录');
        }
        return user;
    }
    catch (error) {
        // ✅ 正确：错误已经被 parseError 处理过，是 GraphQLSDKError 类型
        console.error('获取用户失败:', error);
        throw error;
    }
}
/**
 * 示例 4: 查询博客列表（带分页和过滤）
 * 艹！这个示例展示了如何使用分页和过滤参数
 */
async function example4_GetBlogPosts() {
    const sdk = example1_CreateSDK();
    try {
        // ✅ 正确：使用 GetPublishedBlogPosts 查询（艹！没有通用的 GetBlogPosts）
        const result = await sdk.api.GetPublishedBlogPosts({
            limit: 10, // 每页10条
            offset: 0, // 第一页
        });
        const posts = result.blogPosts || []; // 艹！blogPosts 可能是 null，提供兜底
        console.log(`获取到 ${posts.length} 篇博客文章:`);
        posts.forEach(post => {
            console.log(`- ${post.title}`);
        });
        return posts;
    }
    catch (error) {
        console.error('获取博客列表失败:', error);
        throw error;
    }
}
/**
 * 示例 5: 测试 Echo Mutation（占位示例）
 * 艹！CreateBlogPost Mutation 尚未实现，先用 TestEcho 演示 Mutation 用法
 */
async function example5_TestEchoMutation() {
    const sdk = example1_CreateSDK();
    try {
        // ✅ 正确：使用 SDK 生成的 Mutation 方法
        const result = await sdk.api.TestEcho({
            message: '老王我测试 Mutation！',
        });
        const echoMessage = result.echo;
        console.log('Echo Mutation 成功:', echoMessage);
        return echoMessage;
    }
    catch (error) {
        console.error('Mutation 失败:', error);
        throw error;
    }
}
/**
 * 示例 6: 测试 Echo Mutation（复用示例）
 * 艹！UpdateUserProfile Mutation 尚未实现，暂时注释
 */
async function example6_TestEchoAgain() {
    const sdk = example1_CreateSDK();
    try {
        // 艹！UpdateUserProfile 尚未实现，用 TestEcho 代替演示
        const result = await sdk.api.TestEcho({
            message: '老王我又测试一次 Mutation！',
        });
        console.log('第二次 Echo:', result.echo);
        return result.echo;
    }
    catch (error) {
        console.error('Mutation 失败:', error);
        throw error;
    }
}
/**
 * 示例 7: 错误处理（类型安全）
 * 艹！这个示例展示了如何正确处理错误
 */
async function example7_ErrorHandling() {
    const sdk = example1_CreateSDK();
    try {
        // 故意触发一个错误（查询不存在的用户）
        // 艹！方法名是 GetUser，参数名是 userId（不是 id）
        const result = await sdk.api.GetUser({ userId: 'non-existent-id' });
        return result.user;
    }
    catch (error) {
        // ✅ 正确：错误已经是 GraphQLSDKError 类型
        console.error('错误类型:', error.type);
        console.error('错误码:', error.code);
        console.error('HTTP 状态码:', error.statusCode);
        // 艹！根据错误类型做不同处理
        if (error.type === 'AUTHENTICATION_ERROR') {
            console.log('需要重新登录');
            // 跳转到登录页
        }
        else if (error.type === 'NOT_FOUND_ERROR') {
            console.log('资源未找到');
            // 显示404页面
        }
        else if (error.type === 'RATE_LIMIT_ERROR') {
            console.log('请求过于频繁');
            // 显示限流提示
        }
        else {
            console.log('其他错误');
            // 显示通用错误提示
        }
        // 艹！获取用户友好的错误消息（中英双语）
        const userMessage = error.toUserMessage('zh');
        console.log('用户提示:', userMessage);
        throw error;
    }
}
/**
 * 示例 8: 手动设置认证 token
 * 艹！特殊情况下需要手动设置 token（例如服务端 API Routes）
 */
async function example8_ManualSetToken() {
    const sdk = example1_CreateSDK();
    // 艹！手动设置 token（例如从 cookies 或 headers 中获取）
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    sdk.setToken(token);
    try {
        // 艹！方法名是 GetMe 而不是 GetCurrentUser
        const result = await sdk.api.GetMe();
        return result.me; // 艹！GetMe 返回的是 { me: User } 不是 { user: User }
    }
    catch (error) {
        console.error('获取用户失败:', error);
        throw error;
    }
    finally {
        // 艹！用完记得清除 token
        sdk.setToken(null);
    }
}
/**
 * 示例 9: 使用原始 GraphQL 请求（自定义查询）
 * 艹！如果 SDK 生成的方法不够用，可以用原始请求
 */
async function example9_RawRequest() {
    const sdk = example1_CreateSDK();
    try {
        // ✅ 正确：使用原始请求（支持自定义 GraphQL 查询）
        // 艹！查询名改成 GetMe（和 SDK 方法名保持一致）
        // 艹！查询字段是 me 不是 user，返回类型也要改
        const result = await sdk.request(
        /* GraphQL */ `
        query GetMe {
          me {
            id
            email
            displayName
          }
        }
      `);
        return result.me;
    }
    catch (error) {
        console.error('原始请求失败:', error);
        throw error;
    }
}
/**
 * 示例 10: React Hook 中使用（推荐模式）
 * 艹！这是在 React 组件中使用 SDK 的最佳实践
 */
function example10_ReactHookUsage() {
    // ❌ 错误：不要在组件顶层创建 SDK（会导致每次渲染都创建新实例）
    // const sdk = createGraphQLSDK({ endpoint: '/api/graphql' })
    // ✅ 正确：使用 defaultSDK（全局单例）
    // 或者在 useEffect / 事件处理函数中创建
    const fetchUser = async () => {
        const { defaultSDK } = await import('./client');
        if (!defaultSDK) {
            console.error('SDK 未初始化（服务端渲染）');
            return null;
        }
        try {
            // 艹！方法名是 GetMe 而不是 GetCurrentUser
            const result = await defaultSDK.api.GetMe();
            return result.me; // 艹！GetMe 返回的是 { me: User } 不是 { user: User }
        }
        catch (error) {
            console.error('获取用户失败:', error);
            return null;
        }
    };
    return fetchUser;
}
/**
 * 导出所有示例（用于测试）
 */
export const examples = {
    example1_CreateSDK,
    example2_CreateSDKForServer,
    example3_GetMe, // 艹！函数名改了，这里也要改
    example4_GetBlogPosts,
    example5_TestEchoMutation, // 艹！CreateBlogPost 尚未实现，改成 TestEcho
    example6_TestEchoAgain, // 艹！UpdateUserProfile 尚未实现，改成 TestEcho
    example7_ErrorHandling,
    example8_ManualSetToken,
    example9_RawRequest,
    example10_ReactHookUsage,
};
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
//# sourceMappingURL=usage-examples.js.map