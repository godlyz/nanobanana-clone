/**
 * Relay Cursor-based 分页使用示例
 * 艹！这个文件展示了如何在 React 组件中使用无限滚动分页
 *
 * 老王我提醒你：
 * 1. 这些组件必须标记为 'use client'（客户端组件）
 * 2. 使用 useScrollToBottom 或 useIntersectionObserver 触发加载
 * 3. 始终检查 hasNext 和 loading 状态
 * 4. 提供友好的加载状态提示
 */
'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useBlogPostsInfiniteScroll, useScrollToBottom, useIntersectionObserver, } from './relay-pagination';
/**
 * 示例 1: 基础无限滚动（使用 window.scroll）
 * 艹！这是最简单的实现方式
 */
export function BasicInfiniteScrollExample() {
    const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll();
    // 艹！滚动到底部时加载更多
    useScrollToBottom(200, () => {
        if (hasNext && !loading) {
            loadMore();
        }
    });
    if (error) {
        return (_jsxs("div", { className: "p-4 bg-red-50 text-red-600 rounded", children: ["\u52A0\u8F7D\u5931\u8D25: ", error.message] }));
    }
    return (_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "\u535A\u5BA2\u6587\u7AE0\u5217\u8868" }), _jsx("div", { className: "space-y-4", children: data.map((post) => (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h3", { className: "font-medium", children: post.title }), _jsx("p", { className: "text-sm text-gray-500", children: post.excerpt }), _jsxs("div", { className: "mt-2 text-xs text-gray-400", children: [post.viewCount, " \u6B21\u6D4F\u89C8 \u00B7 ", post.likeCount, " \u4E2A\u8D5E"] })] }, post.id))) }), loading && (_jsx("div", { className: "mt-4 text-center text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })), !hasNext && data.length > 0 && (_jsx("div", { className: "mt-4 text-center text-gray-400", children: "\u6CA1\u6709\u66F4\u591A\u6587\u7AE0\u4E86" }))] }));
}
/**
 * 示例 2: 使用 IntersectionObserver（性能更好）
 * 艹！这个方案比监听 window.scroll 性能更好
 */
export function IntersectionObserverInfiniteScrollExample() {
    const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll();
    // 艹！使用 IntersectionObserver 触发加载
    const loadMoreRef = useIntersectionObserver(() => {
        if (hasNext && !loading) {
            loadMore();
        }
    });
    return (_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "\u535A\u5BA2\u6587\u7AE0\u5217\u8868\uFF08IntersectionObserver\uFF09" }), error && (_jsx("div", { className: "p-4 bg-red-50 text-red-600 rounded mb-4", children: error.message })), _jsx("div", { className: "space-y-4", children: data.map((post) => (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h3", { className: "font-medium", children: post.title }), _jsx("p", { className: "text-sm text-gray-500", children: post.excerpt })] }, post.id))) }), hasNext && (_jsx("div", { ref: loadMoreRef, className: "mt-4 py-8 text-center", children: loading ? (_jsx("div", { className: "text-gray-500", children: "\u52A0\u8F7D\u4E2D..." })) : (_jsx("div", { className: "text-gray-400", children: "\u6EDA\u52A8\u52A0\u8F7D\u66F4\u591A" })) })), !hasNext && data.length > 0 && (_jsx("div", { className: "mt-4 text-center text-gray-400", children: "\u5DF2\u52A0\u8F7D\u5168\u90E8\u6587\u7AE0" }))] }));
}
/**
 * 示例 3: 带刷新功能的无限滚动
 * 艹！这个示例展示了如何添加刷新按钮
 */
export function InfiniteScrollWithRefreshExample() {
    const { data, loading, hasNext, loadMore, refresh, error, isInitialLoading, } = useBlogPostsInfiniteScroll();
    const loadMoreRef = useIntersectionObserver(() => {
        if (hasNext && !loading) {
            loadMore();
        }
    });
    // 艹！刷新数据
    const handleRefresh = async () => {
        await refresh();
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-2xl font-bold", children: "\u535A\u5BA2\u6587\u7AE0\u5217\u8868" }), _jsx("button", { onClick: handleRefresh, disabled: loading, className: "px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50", children: loading ? '刷新中...' : '刷新' })] }), error && (_jsxs("div", { className: "mb-4 p-4 bg-red-50 text-red-600 rounded", children: [error.message, _jsx("button", { onClick: handleRefresh, className: "ml-4 underline", children: "\u91CD\u8BD5" })] })), isInitialLoading ? (_jsx("div", { className: "py-12 text-center text-gray-500", children: "\u6B63\u5728\u52A0\u8F7D\u6587\u7AE0..." })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-4", children: data.map((post) => (_jsxs("div", { className: "p-4 border rounded-lg hover:shadow-md transition", children: [_jsx("h3", { className: "font-medium text-lg", children: post.title }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: post.excerpt }), _jsxs("div", { className: "mt-3 flex items-center gap-4 text-xs text-gray-500", children: [_jsxs("span", { children: ["\uD83D\uDC41 ", post.viewCount, " \u6D4F\u89C8"] }), _jsxs("span", { children: ["\u2764\uFE0F ", post.likeCount, " \u70B9\u8D5E"] }), _jsxs("span", { children: ["\uD83D\uDCAC ", post.commentCount, " \u8BC4\u8BBA"] })] })] }, post.id))) }), hasNext && (_jsx("div", { ref: loadMoreRef, className: "mt-4 py-8 text-center", children: loading && _jsx("div", { className: "text-gray-500", children: "\u52A0\u8F7D\u66F4\u591A..." }) })), !hasNext && data.length > 0 && (_jsxs("div", { className: "mt-4 text-center text-gray-400", children: ["\uD83C\uDF89 \u5DF2\u52A0\u8F7D\u5168\u90E8 ", data.length, " \u7BC7\u6587\u7AE0"] })), !loading && data.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-500", children: "\u6682\u65E0\u6587\u7AE0" }))] }))] }));
}
/**
 * 示例 4: 手动加载模式（点击加载更多）
 * 艹！这个示例不使用无限滚动，而是手动点击加载
 */
export function ManualLoadMoreExample() {
    const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll({}, // 艹！第一个参数是 variables (空对象表示使用默认值)
    { immediate: true } // 艹！第二个参数是 options，immediate 属于 options
    );
    return (_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "\u535A\u5BA2\u6587\u7AE0\u5217\u8868\uFF08\u624B\u52A8\u52A0\u8F7D\uFF09" }), error && (_jsx("div", { className: "mb-4 p-4 bg-red-50 text-red-600 rounded", children: error.message })), _jsx("div", { className: "space-y-4", children: data.map((post) => (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h3", { className: "font-medium", children: post.title }), _jsx("p", { className: "text-sm text-gray-500", children: post.excerpt })] }, post.id))) }), hasNext && (_jsx("div", { className: "mt-6 text-center", children: _jsx("button", { onClick: loadMore, disabled: loading, className: "px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition", children: loading ? '加载中...' : '加载更多' }) })), !hasNext && data.length > 0 && (_jsx("div", { className: "mt-6 text-center text-gray-400", children: "\u5DF2\u52A0\u8F7D\u5168\u90E8\u6587\u7AE0" }))] }));
}
/**
 * 示例 5: 骨架屏加载状态
 * 艹！这个示例展示了如何添加骨架屏（Skeleton）
 */
export function SkeletonLoadingExample() {
    const { data, loading, hasNext, loadMore, isInitialLoading } = useBlogPostsInfiniteScroll();
    const loadMoreRef = useIntersectionObserver(() => {
        if (hasNext && !loading) {
            loadMore();
        }
    });
    return (_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "\u535A\u5BA2\u6587\u7AE0\u5217\u8868\uFF08\u9AA8\u67B6\u5C4F\uFF09" }), _jsxs("div", { className: "space-y-4", children: [data.map((post) => (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h3", { className: "font-medium", children: post.title }), _jsx("p", { className: "text-sm text-gray-500", children: post.excerpt })] }, post.id))), isInitialLoading && (_jsx(_Fragment, { children: [1, 2, 3].map((i) => (_jsxs("div", { className: "p-4 border rounded-lg animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 rounded w-3/4 mb-2" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-full" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-2/3 mt-2" })] }, i))) })), loading && !isInitialLoading && (_jsxs("div", { className: "p-4 border rounded-lg animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 rounded w-3/4 mb-2" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-full" })] }))] }), hasNext && !isInitialLoading && (_jsx("div", { ref: loadMoreRef, className: "mt-4 py-4" })), !hasNext && data.length > 0 && (_jsx("div", { className: "mt-4 text-center text-gray-400", children: "\u5DF2\u52A0\u8F7D\u5168\u90E8\u6587\u7AE0" }))] }));
}
//# sourceMappingURL=relay-pagination-examples.js.map