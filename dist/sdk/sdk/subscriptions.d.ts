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
 * Subscription 配置选项
 */
export interface SubscriptionOptions<TData = any> {
    /**
     * 接收到数据时的回调
     * 艹！每次服务端推送数据都会调用这个函数
     */
    onData: (data: TData) => void;
    /**
     * 发生错误时的回调
     * 艹！网络错误、服务端错误都会走这里
     */
    onError?: (error: Error) => void;
    /**
     * 连接建立时的回调
     * 艹！用于显示"已连接"状态
     */
    onOpen?: () => void;
    /**
     * 连接关闭时的回调
     * 艹！用于显示"已断开"状态
     */
    onClose?: () => void;
    /**
     * 自定义 GraphQL 端点
     * 艹！默认使用 /api/graphql
     */
    endpoint?: string;
    /**
     * 认证 token
     * 艹！如果需要认证，传这个参数
     */
    token?: string;
}
/**
 * Subscription 实例
 */
export interface Subscription {
    /**
     * 取消订阅
     * 艹！记得调用这个函数，否则连接会一直保持
     */
    unsubscribe: () => void;
    /**
     * 获取当前连接状态
     * 艹！0=CONNECTING, 1=OPEN, 2=CLOSED
     */
    getReadyState: () => number;
    /**
     * 原始 EventSource 实例
     * 艹！除非你知道自己在干嘛，否则别tm直接用这个
     */
    eventSource: EventSource;
}
/**
 * 创建 GraphQL Subscription
 * 艹！这个函数创建一个实时订阅连接
 *
 * @param operationName - GraphQL Subscription 操作名称（例如："OnNewBlogPost"）
 * @param options - 订阅配置选项
 * @returns Subscription 实例
 */
export declare function createSubscription<TData = any>(operationName: string, options: SubscriptionOptions<TData>): Subscription;
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
export declare function useSubscription<TData = any>(operationName: string, options?: Omit<SubscriptionOptions<TData>, 'onData'>): {
    /** 最新接收到的数据 */
    data: TData | null;
    /** 错误信息 */
    error: Error | null;
    /** 是否已连接 */
    connected: boolean;
};
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
export declare function useNewBlogPostSubscription(options?: Omit<SubscriptionOptions<any>, 'onData'>): {
    /** 最新接收到的数据 */
    data: any;
    /** 错误信息 */
    error: Error | null;
    /** 是否已连接 */
    connected: boolean;
};
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
export declare function useCurrentTimeSubscription(options?: Omit<SubscriptionOptions<string>, 'onData'>): {
    /** 最新接收到的数据 */
    data: string | null;
    /** 错误信息 */
    error: Error | null;
    /** 是否已连接 */
    connected: boolean;
};
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
//# sourceMappingURL=subscriptions.d.ts.map