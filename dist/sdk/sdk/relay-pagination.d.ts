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
import type { GraphQLSDK } from './client';
/**
 * Relay Connection 接口（标准）
 * 艹！这是 Relay 规范定义的 Connection 结构
 */
export interface RelayConnection<TNode = any> {
    edges: Array<{
        cursor: string;
        node: TNode;
    }>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
    };
}
/**
 * 无限滚动分页配置
 */
export interface InfiniteScrollPaginationOptions<TNode = any> {
    /**
     * 查询函数
     * 艹！这个函数接收 SDK 和 cursor，返回 Connection 对象
     *
     * @param sdk - GraphQL SDK 实例
     * @param cursor - 游标（首次加载时为 null）
     * @returns RelayConnection 对象
     */
    queryFn: (sdk: GraphQLSDK, cursor: string | null) => Promise<RelayConnection<TNode>>;
    /**
     * 每页数据量
     * 艹！默认 10 条
     */
    pageSize?: number;
    /**
     * 是否立即加载第一页
     * 艹！默认 true
     */
    immediate?: boolean;
    /**
     * 错误回调
     * 艹！加载失败时调用
     */
    onError?: (error: Error) => void;
    /**
     * 加载成功回调
     * 艹！每次加载成功后调用
     */
    onLoad?: (data: TNode[]) => void;
}
/**
 * 无限滚动分页结果
 */
export interface InfiniteScrollPaginationResult<TNode = any> {
    /**
     * 所有已加载的数据（扁平化后的 nodes）
     * 艹！这个数组会随着加载更多而增长
     */
    data: TNode[];
    /**
     * 加载状态
     * 艹！true = 正在加载中
     */
    loading: boolean;
    /**
     * 错误信息
     */
    error: Error | null;
    /**
     * 是否还有下一页
     * 艹！true = 可以继续加载更多
     */
    hasNext: boolean;
    /**
     * 是否还有上一页
     * 艹！true = 可以加载上一页（不常用）
     */
    hasPrev: boolean;
    /**
     * 当前页的 endCursor
     * 艹！用于加载下一页
     */
    endCursor: string | null;
    /**
     * 当前页的 startCursor
     * 艹！用于加载上一页（不常用）
     */
    startCursor: string | null;
    /**
     * 加载更多（下一页）
     * 艹！滚动到底部时调用这个函数
     */
    loadMore: () => Promise<void>;
    /**
     * 加载上一页
     * 艹！不常用，除非你需要双向滚动
     */
    loadPrevious: () => Promise<void>;
    /**
     * 重新加载（清空数据重新开始）
     * 艹！用于刷新数据
     */
    refresh: () => Promise<void>;
    /**
     * 是否是初次加载
     * 艹！true = 首次加载还未完成
     */
    isInitialLoading: boolean;
}
/**
 * React Hook: 无限滚动分页
 * 艹！这是最常用的 Hook，用于实现无限滚动
 *
 * @param options - 分页配置选项
 * @returns 分页结果
 */
export declare function useInfiniteScrollPagination<TNode = any>(options: InfiniteScrollPaginationOptions<TNode>): InfiniteScrollPaginationResult<TNode>;
/**
 * 快捷 Hook: 博客文章无限滚动
 * 艹！这是最常用的场景，别tm每次都写一遍
 *
 * @param variables - 查询变量（可选）
 * @param options - 额外配置（可选）
 * @returns 分页结果
 */
export declare function useBlogPostsInfiniteScroll(variables?: {
    status?: string;
    first?: number;
}, options?: Partial<InfiniteScrollPaginationOptions<any>>): InfiniteScrollPaginationResult<any>;
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
export declare function useScrollToBottom(threshold: number | undefined, callback: () => void): void;
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
export declare function useIntersectionObserver(callback: () => void): React.RefObject<HTMLDivElement>;
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
//# sourceMappingURL=relay-pagination.d.ts.map