/**
 * Relay Cursor-based 分页 Hooks
 * 艹！这是老王我搞的无限滚动分页功能，基于 Relay Connection 标准
 *
 * 技术实现：
 * - 基于 Relay Cursor Pagination 规范
 * - 支持向前翻页（prev）和向后翻页（next）
 * - 支持无限滚动（Infinite Scroll）
 * - 完全类型安全（基于生成的类型）
 *
 * 使用示例：
 * ```typescript
 * import { useInfiniteScrollPagination } from '@/lib/graphql/sdk/relay-pagination'
 *
 * const { data, loading, hasNext, loadMore } = useInfiniteScrollPagination({
 *   queryFn: async (sdk, cursor) => {
 *     const result = await sdk.api.GetBlogPostsConnection({ after: cursor })
 *     return result.blogPostsConnection
 *   },
 *   pageSize: 10,
 * })
 *
 * // 滚动到底部时加载更多
 * if (hasNext && !loading) {
 *   loadMore()
 * }
 * ```
 */
import * as React from 'react';
import { defaultSDK } from './client';
/**
 * React Hook: 无限滚动分页
 * 艹！这是最常用的 Hook，用于实现无限滚动
 *
 * @param options - 分页配置选项
 * @returns 分页结果
 */
export function useInfiniteScrollPagination(options) {
    const { queryFn, pageSize = 10, immediate = true, onError, onLoad } = options;
    // 艹！状态管理
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [hasNext, setHasNext] = React.useState(false);
    const [hasPrev, setHasPrev] = React.useState(false);
    const [endCursor, setEndCursor] = React.useState(null);
    const [startCursor, setStartCursor] = React.useState(null);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    /**
     * 加载数据（通用函数）
     * 艹！cursor 为 null 表示首次加载
     */
    const fetchData = React.useCallback(async (cursor, append = false) => {
        if (!defaultSDK) {
            console.error('[Relay Pagination] defaultSDK 未初始化（服务端渲染？）');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // 艹！调用查询函数
            const connection = await queryFn(defaultSDK, cursor);
            // 艹！提取 nodes
            const nodes = connection.edges.map((edge) => edge.node);
            // 艹！更新数据（追加或替换）
            setData((prevData) => (append ? [...prevData, ...nodes] : nodes));
            // 艹！更新分页信息
            setHasNext(connection.pageInfo.hasNextPage);
            setHasPrev(connection.pageInfo.hasPreviousPage);
            setEndCursor(connection.pageInfo.endCursor);
            setStartCursor(connection.pageInfo.startCursor);
            // 艹！触发回调
            onLoad?.(nodes);
            setIsInitialLoading(false);
        }
        catch (err) {
            const error = err;
            setError(error);
            onError?.(error);
            console.error('[Relay Pagination] 加载失败:', error);
        }
        finally {
            setLoading(false);
        }
    }, [queryFn, onLoad, onError]);
    /**
     * 加载更多（下一页）
     */
    const loadMore = React.useCallback(async () => {
        if (!hasNext || loading) {
            return;
        }
        await fetchData(endCursor, true); // append = true
    }, [hasNext, loading, endCursor, fetchData]);
    /**
     * 加载上一页
     */
    const loadPrevious = React.useCallback(async () => {
        if (!hasPrev || loading) {
            return;
        }
        // 艹！加载上一页比较复杂，需要反转数据顺序
        // 暂时不实现，除非你真的需要双向滚动
        console.warn('[Relay Pagination] loadPrevious 暂未实现');
    }, [hasPrev, loading]);
    /**
     * 刷新数据
     */
    const refresh = React.useCallback(async () => {
        await fetchData(null, false); // cursor = null, append = false
    }, [fetchData]);
    /**
     * 艹！首次加载
     */
    React.useEffect(() => {
        if (immediate) {
            fetchData(null, false);
        }
    }, []); // 艹！只在组件挂载时执行一次
    return {
        data,
        loading,
        error,
        hasNext,
        hasPrev,
        endCursor,
        startCursor,
        loadMore,
        loadPrevious,
        refresh,
        isInitialLoading,
    };
}
/**
 * 快捷 Hook: 博客文章无限滚动
 * 艹！这是最常用的场景，别tm每次都写一遍
 *
 * @param variables - 查询变量（可选）
 * @param options - 额外配置（可选）
 * @returns 分页结果
 */
export function useBlogPostsInfiniteScroll(variables, options) {
    return useInfiniteScrollPagination({
        queryFn: async (sdk, cursor) => {
            const result = await sdk.api.GetFullBlogPostsConnection({
                after: cursor,
                first: variables?.first || 10,
                status: variables?.status || 'PUBLISHED',
            });
            // 艹！blogPostsConnection 可能为 null/undefined，返回空对象兜底
            const connection = result.blogPostsConnection || {
                edges: [],
                pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: null,
                    endCursor: null,
                },
            };
            // 艹！GraphQL 生成的类型和 RelayConnection 不完全匹配，加个类型断言
            return connection;
        },
        pageSize: variables?.first || 10,
        ...options,
    });
}
/**
 * React Hook: 滚动到底部检测
 * 艹！这个 Hook 用于检测用户是否滚动到底部
 *
 * @param threshold - 距离底部多少像素时触发（默认 200px）
 * @param callback - 滚动到底部时的回调函数
 *
 * @example
 * ```typescript
 * const { data, loadMore, hasNext } = useBlogPostsInfiniteScroll()
 *
 * useScrollToBottom(200, () => {
 *   if (hasNext) {
 *     loadMore()
 *   }
 * })
 * ```
 */
export function useScrollToBottom(threshold = 200, callback) {
    React.useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            // 艹！计算距离底部的距离
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;
            if (distanceToBottom < threshold) {
                callback();
            }
        };
        // 艹！添加滚动监听
        window.addEventListener('scroll', handleScroll);
        // 艹！清理函数
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [threshold, callback]);
}
/**
 * React Hook: IntersectionObserver 无限滚动
 * 艹！这个 Hook 使用 IntersectionObserver API，性能更好
 *
 * @param callback - 触发加载的回调函数
 * @returns ref - 绑定到加载触发元素的 ref
 *
 * @example
 * ```typescript
 * const { data, loadMore, hasNext } = useBlogPostsInfiniteScroll()
 *
 * const loadMoreRef = useIntersectionObserver(() => {
 *   if (hasNext) {
 *     loadMore()
 *   }
 * })
 *
 * // 在组件末尾添加一个触发元素
 * <div ref={loadMoreRef}>加载更多...</div>
 * ```
 */
export function useIntersectionObserver(callback) {
    const observerRef = React.useRef(null);
    React.useEffect(() => {
        const element = observerRef.current;
        if (!element) {
            return;
        }
        // 艹！创建 IntersectionObserver 实例
        const observer = new IntersectionObserver((entries) => {
            // 艹！如果元素进入视口，触发回调
            if (entries[0].isIntersecting) {
                callback();
            }
        }, {
            root: null, // 使用 viewport 作为根元素
            rootMargin: '0px',
            threshold: 0.1, // 10% 可见时触发
        });
        // 艹！开始观察
        observer.observe(element);
        // 艹！清理函数
        return () => {
            observer.unobserve(element);
            observer.disconnect();
        };
    }, [callback]);
    return observerRef;
}
/**
 * 艹！老王我的使用建议：
 *
 * 1. **选择合适的触发方式**：
 *    - 简单场景：使用 useScrollToBottom（监听 window.scroll）
 *    - 性能优化：使用 useIntersectionObserver（更高效）
 *    - 复杂场景：自己实现触发逻辑
 *
 * 2. **防止重复加载**：
 *    - 检查 loading 状态（避免连续触发）
 *    - 检查 hasNext（避免无限循环）
 *    - 使用防抖（debounce）优化滚动事件
 *
 * 3. **用户体验**：
 *    - 显示"加载中"状态（loading spinner）
 *    - 显示"没有更多数据"提示（hasNext = false）
 *    - 提供"刷新"按钮（调用 refresh）
 *
 * 4. **性能优化**：
 *    - 使用 React.memo 避免不必要的重新渲染
 *    - 使用虚拟滚动（如 react-window）处理大数据量
 *    - 合理设置 pageSize（太小会频繁请求，太大会卡顿）
 *
 * 5. **错误处理**：
 *    - 始终提供 onError 回调
 *    - 显示错误提示给用户
 *    - 提供"重试"按钮（调用 refresh）
 */
//# sourceMappingURL=relay-pagination.js.map