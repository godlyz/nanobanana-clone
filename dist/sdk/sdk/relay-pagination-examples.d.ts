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
/**
 * 示例 1: 基础无限滚动（使用 window.scroll）
 * 艹！这是最简单的实现方式
 */
export declare function BasicInfiniteScrollExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 2: 使用 IntersectionObserver（性能更好）
 * 艹！这个方案比监听 window.scroll 性能更好
 */
export declare function IntersectionObserverInfiniteScrollExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 3: 带刷新功能的无限滚动
 * 艹！这个示例展示了如何添加刷新按钮
 */
export declare function InfiniteScrollWithRefreshExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 4: 手动加载模式（点击加载更多）
 * 艹！这个示例不使用无限滚动，而是手动点击加载
 */
export declare function ManualLoadMoreExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 5: 骨架屏加载状态
 * 艹！这个示例展示了如何添加骨架屏（Skeleton）
 */
export declare function SkeletonLoadingExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 艹！老王我的使用建议：
 *
 * 1. **选择合适的触发方式**：
 *    - 自动滚动：IntersectionObserverInfiniteScrollExample（推荐）
 *    - 手动点击：ManualLoadMoreExample（用户控制）
 *    - 简单场景：BasicInfiniteScrollExample（够用）
 *
 * 2. **加载状态优化**：
 *    - 使用骨架屏（Skeleton）替代 Loading 文字
 *    - 首次加载和加载更多用不同的 Loading 状态
 *    - 避免闪烁（使用 CSS transition）
 *
 * 3. **性能优化**：
 *    - 使用 React.memo 包裹列表项组件
 *    - 使用虚拟滚动（大数据量场景）
 *    - 合理设置 pageSize（10-20 条）
 *
 * 4. **用户体验**：
 *    - 显示加载进度（已加载 X / 总共 Y）
 *    - 提供刷新按钮
 *    - 显示"没有更多数据"提示
 *    - 错误时提供重试按钮
 *
 * 5. **移动端适配**：
 *    - 降低触发阈值（threshold = 100px）
 *    - 使用更大的点击区域
 *    - 避免与页面滚动冲突
 */
//# sourceMappingURL=relay-pagination-examples.d.ts.map