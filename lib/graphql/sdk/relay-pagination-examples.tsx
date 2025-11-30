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

'use client'

import * as React from 'react'
import {
  useBlogPostsInfiniteScroll,
  useScrollToBottom,
  useIntersectionObserver,
} from './relay-pagination'

/**
 * 示例 1: 基础无限滚动（使用 window.scroll）
 * 艹！这是最简单的实现方式
 */
export function BasicInfiniteScrollExample() {
  const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll()

  // 艹！滚动到底部时加载更多
  useScrollToBottom(200, () => {
    if (hasNext && !loading) {
      loadMore()
    }
  })

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        加载失败: {error.message}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">博客文章列表</h2>

      {/* 文章列表 */}
      <div className="space-y-4">
        {data.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-500">{post.excerpt}</p>
            <div className="mt-2 text-xs text-gray-400">
              {post.viewCount} 次浏览 · {post.likeCount} 个赞
            </div>
          </div>
        ))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="mt-4 text-center text-gray-500">
          加载中...
        </div>
      )}

      {/* 没有更多数据 */}
      {!hasNext && data.length > 0 && (
        <div className="mt-4 text-center text-gray-400">
          没有更多文章了
        </div>
      )}
    </div>
  )
}

/**
 * 示例 2: 使用 IntersectionObserver（性能更好）
 * 艹！这个方案比监听 window.scroll 性能更好
 */
export function IntersectionObserverInfiniteScrollExample() {
  const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll()

  // 艹！使用 IntersectionObserver 触发加载
  const loadMoreRef = useIntersectionObserver(() => {
    if (hasNext && !loading) {
      loadMore()
    }
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">博客文章列表（IntersectionObserver）</h2>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded mb-4">
          {error.message}
        </div>
      )}

      {/* 文章列表 */}
      <div className="space-y-4">
        {data.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-500">{post.excerpt}</p>
          </div>
        ))}
      </div>

      {/* 加载触发元素（绑定 ref） */}
      {hasNext && (
        <div ref={loadMoreRef} className="mt-4 py-8 text-center">
          {loading ? (
            <div className="text-gray-500">加载中...</div>
          ) : (
            <div className="text-gray-400">滚动加载更多</div>
          )}
        </div>
      )}

      {/* 没有更多数据 */}
      {!hasNext && data.length > 0 && (
        <div className="mt-4 text-center text-gray-400">
          已加载全部文章
        </div>
      )}
    </div>
  )
}

/**
 * 示例 3: 带刷新功能的无限滚动
 * 艹！这个示例展示了如何添加刷新按钮
 */
export function InfiniteScrollWithRefreshExample() {
  const {
    data,
    loading,
    hasNext,
    loadMore,
    refresh,
    error,
    isInitialLoading,
  } = useBlogPostsInfiniteScroll()

  const loadMoreRef = useIntersectionObserver(() => {
    if (hasNext && !loading) {
      loadMore()
    }
  })

  // 艹！刷新数据
  const handleRefresh = async () => {
    await refresh()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">博客文章列表</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          {error.message}
          <button
            onClick={handleRefresh}
            className="ml-4 underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 初次加载状态 */}
      {isInitialLoading ? (
        <div className="py-12 text-center text-gray-500">
          正在加载文章...
        </div>
      ) : (
        <>
          {/* 文章列表 */}
          <div className="space-y-4">
            {data.map((post) => (
              <div key={post.id} className="p-4 border rounded-lg hover:shadow-md transition">
                <h3 className="font-medium text-lg">{post.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{post.excerpt}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>👁 {post.viewCount} 浏览</span>
                  <span>❤️ {post.likeCount} 点赞</span>
                  <span>💬 {post.commentCount} 评论</span>
                </div>
              </div>
            ))}
          </div>

          {/* 加载触发元素 */}
          {hasNext && (
            <div ref={loadMoreRef} className="mt-4 py-8 text-center">
              {loading && <div className="text-gray-500">加载更多...</div>}
            </div>
          )}

          {/* 没有更多数据 */}
          {!hasNext && data.length > 0 && (
            <div className="mt-4 text-center text-gray-400">
              🎉 已加载全部 {data.length} 篇文章
            </div>
          )}

          {/* 空状态 */}
          {!loading && data.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              暂无文章
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 示例 4: 手动加载模式（点击加载更多）
 * 艹！这个示例不使用无限滚动，而是手动点击加载
 */
export function ManualLoadMoreExample() {
  const { data, loading, hasNext, loadMore, error } = useBlogPostsInfiniteScroll(
    {}, // 艹！第一个参数是 variables (空对象表示使用默认值)
    { immediate: true } // 艹！第二个参数是 options，immediate 属于 options
  )

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">博客文章列表（手动加载）</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
          {error.message}
        </div>
      )}

      {/* 文章列表 */}
      <div className="space-y-4">
        {data.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-500">{post.excerpt}</p>
          </div>
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasNext && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 没有更多数据 */}
      {!hasNext && data.length > 0 && (
        <div className="mt-6 text-center text-gray-400">
          已加载全部文章
        </div>
      )}
    </div>
  )
}

/**
 * 示例 5: 骨架屏加载状态
 * 艹！这个示例展示了如何添加骨架屏（Skeleton）
 */
export function SkeletonLoadingExample() {
  const { data, loading, hasNext, loadMore, isInitialLoading } = useBlogPostsInfiniteScroll()

  const loadMoreRef = useIntersectionObserver(() => {
    if (hasNext && !loading) {
      loadMore()
    }
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">博客文章列表（骨架屏）</h2>

      <div className="space-y-4">
        {/* 实际数据 */}
        {data.map((post) => (
          <div key={post.id} className="p-4 border rounded-lg">
            <h3 className="font-medium">{post.title}</h3>
            <p className="text-sm text-gray-500">{post.excerpt}</p>
          </div>
        ))}

        {/* 骨架屏（首次加载） */}
        {isInitialLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
              </div>
            ))}
          </>
        )}

        {/* 骨架屏（加载更多） */}
        {loading && !isInitialLoading && (
          <div className="p-4 border rounded-lg animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        )}
      </div>

      {/* 加载触发元素 */}
      {hasNext && !isInitialLoading && (
        <div ref={loadMoreRef} className="mt-4 py-4" />
      )}

      {/* 没有更多数据 */}
      {!hasNext && data.length > 0 && (
        <div className="mt-4 text-center text-gray-400">
          已加载全部文章
        </div>
      )}
    </div>
  )
}

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
