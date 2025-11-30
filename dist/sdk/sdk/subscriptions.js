/**
 * GraphQL Subscriptions 客户端
 * 艹！这是老王我搞的实时推送功能，基于 Server-Sent Events (SSE)
 *
 * 技术实现：
 * - 使用浏览器原生 EventSource API
 * - 支持自动重连（EventSource 自带）
 * - 支持错误处理和状态监听
 * - 完全类型安全（基于生成的类型）
 *
 * 使用示例：
 * ```typescript
 * import { createSubscription } from '@/lib/graphql/sdk/subscriptions'
 *
 * const subscription = createSubscription('OnNewBlogPost', {
 *   onData: (data) => console.log('新文章:', data),
 *   onError: (error) => console.error('错误:', error),
 * })
 *
 * // 取消订阅
 * subscription.unsubscribe()
 * ```
 */
/**
 * 创建 GraphQL Subscription
 * 艹！这个函数创建一个实时订阅连接
 *
 * @param operationName - GraphQL Subscription 操作名称（例如："OnNewBlogPost"）
 * @param options - 订阅配置选项
 * @returns Subscription 实例
 */
export function createSubscription(operationName, options) {
    const { onData, onError, onOpen, onClose, endpoint = '/api/graphql', token, } = options;
    // 艹！构建 GraphQL Subscription 查询
    const query = `subscription ${operationName} { ${toCamelCase(operationName.replace('On', ''))} }`;
    // 艹！构建 SSE URL（使用 GraphQL SSE 协议）
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('query', query);
    // 艹！如果有 token，添加到 URL
    if (token) {
        url.searchParams.set('token', token);
    }
    // 艹！创建 EventSource 连接
    const eventSource = new EventSource(url.toString());
    // 艹！监听消息事件（服务端推送的数据）
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onData(data);
        }
        catch (error) {
            console.error('[GraphQL Subscription] 解析数据失败:', error);
            onError?.(error);
        }
    };
    // 艹！监听打开事件（连接建立）
    eventSource.onopen = () => {
        console.log(`[GraphQL Subscription] ${operationName} 连接已建立`);
        onOpen?.();
    };
    // 艹！监听错误事件（网络错误/服务端错误）
    eventSource.onerror = (event) => {
        console.error(`[GraphQL Subscription] ${operationName} 连接错误:`, event);
        const error = new Error(`Subscription ${operationName} 连接失败`);
        onError?.(error);
        // 艹！如果连接关闭，触发 onClose 回调
        if (eventSource.readyState === EventSource.CLOSED) {
            onClose?.();
        }
    };
    // 艹！返回 Subscription 实例
    return {
        unsubscribe: () => {
            console.log(`[GraphQL Subscription] ${operationName} 取消订阅`);
            eventSource.close();
            onClose?.();
        },
        getReadyState: () => eventSource.readyState,
        eventSource,
    };
}
/**
 * 艹！辅助函数：将 PascalCase 转换为 camelCase
 * 例如："OnNewBlogPost" -> "newBlogPost"
 */
function toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}
/**
 * React Hook: 订阅 GraphQL Subscription
 * 艹！这个 Hook 自动处理订阅的生命周期
 *
 * @param operationName - GraphQL Subscription 操作名称
 * @param options - 订阅配置选项（不包含 onData）
 * @returns { data, error, connected } - 订阅状态
 *
 * @example
 * ```typescript
 * const { data, error, connected } = useSubscription('OnNewBlogPost')
 *
 * if (connected) {
 *   console.log('已连接')
 * }
 *
 * if (data) {
 *   console.log('新文章:', data)
 * }
 * ```
 */
export function useSubscription(operationName, options = {}) {
    // 艹！这个 Hook 只能在客户端组件中使用
    if (typeof window === 'undefined') {
        throw new Error('useSubscription 只能在客户端组件中使用');
    }
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [connected, setConnected] = React.useState(false);
    React.useEffect(() => {
        // 艹！创建订阅
        const subscription = createSubscription(operationName, {
            ...options,
            onData: (newData) => {
                setData(newData);
                setError(null);
            },
            onError: (err) => {
                setError(err);
                options.onError?.(err);
            },
            onOpen: () => {
                setConnected(true);
                options.onOpen?.();
            },
            onClose: () => {
                setConnected(false);
                options.onClose?.();
            },
        });
        // 艹！组件卸载时取消订阅
        return () => {
            subscription.unsubscribe();
        };
    }, [operationName]); // 艹！operationName 变化时重新订阅
    return {
        /** 最新接收到的数据 */
        data,
        /** 错误信息 */
        error,
        /** 是否已连接 */
        connected,
    };
}
// 艹！React 需要导入（用于 Hook）
import * as React from 'react';
/**
 * 快捷 Hook: 订阅新博客文章
 * 艹！这是最常用的订阅，别tm每次都写一遍
 *
 * @example
 * ```typescript
 * const { data: newPost, connected } = useNewBlogPostSubscription()
 *
 * useEffect(() => {
 *   if (newPost) {
 *     toast.success(`新文章发布：${newPost.title}`)
 *   }
 * }, [newPost])
 * ```
 */
export function useNewBlogPostSubscription(options = {}) {
    return useSubscription('OnNewBlogPost', options);
}
/**
 * 快捷 Hook: 订阅服务器时间（测试用）
 * 艹！这个订阅用于测试 Subscription 功能是否正常
 *
 * @example
 * ```typescript
 * const { data: currentTime, connected } = useCurrentTimeSubscription()
 *
 * return <div>服务器时间: {currentTime}</div>
 * ```
 */
export function useCurrentTimeSubscription(options = {}) {
    return useSubscription('OnCurrentTime', options);
}
/**
 * 艹！老王我的使用建议：
 *
 * 1. **客户端组件**：
 *    - 使用 useSubscription Hook（自动处理生命周期）
 *    - 组件卸载时会自动取消订阅
 *    - 不要tm手动管理订阅
 *
 * 2. **服务端组件**：
 *    - SSE 只能在客户端使用
 *    - 服务端组件不支持 Subscription
 *    - 别tm在服务端组件里用这个
 *
 * 3. **性能优化**：
 *    - EventSource 自动重连，不需要手动处理
 *    - 避免在同一个页面创建多个相同的订阅
 *    - 使用 React.memo 避免不必要的重新渲染
 *
 * 4. **错误处理**：
 *    - 始终提供 onError 回调
 *    - 网络错误会自动重连
 *    - 显示连接状态给用户（connected）
 *
 * 5. **认证**：
 *    - 如果需要认证，传 token 参数
 *    - Token 会通过 URL 参数传递
 *    - 生产环境建议用 Header 传 token（需要服务端支持）
 */
//# sourceMappingURL=subscriptions.js.map