/**
 * GraphQL Subscriptions 使用示例
 * 艹！这个文件展示了如何在 React 组件中使用 Subscription Hooks
 *
 * 老王我提醒你：
 * 1. 这些组件必须标记为 'use client'（客户端组件）
 * 2. Subscription 会一直保持连接直到组件卸载
 * 3. 使用 React.memo 避免不必要的重新渲染
 * 4. 显示连接状态给用户（connected）
 */

'use client'

import * as React from 'react'
import {
  useNewBlogPostSubscription,
  useCurrentTimeSubscription,
  useSubscription,
} from './subscriptions'

/**
 * 示例 1: 订阅新博客文章（Toast 通知）
 * 艹！这个示例展示了最常见的使用场景：新内容通知
 */
export function NewBlogPostNotification() {
  const { data: newPost, connected, error } = useNewBlogPostSubscription()

  React.useEffect(() => {
    if (newPost) {
      // 艹！显示 Toast 通知（假设你有一个 toast 库）
      console.log('🎉 新文章发布:', newPost.title)

      // 实际项目中可以用 toast.success() 或 notification.show()
      // toast.success(`新文章发布：${newPost.title}`)
    }
  }, [newPost])

  // 艹！这个组件通常是隐藏的，只负责显示通知
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        <span className="text-sm text-gray-600">
          {connected ? '实时推送已连接' : '已断开'}
        </span>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          错误: {error.message}
        </div>
      )}

      {newPost && (
        <div className="mt-2">
          <div className="text-sm font-medium">{newPost.title}</div>
          <div className="text-xs text-gray-500">{newPost.author?.displayName}</div>
        </div>
      )}
    </div>
  )
}

/**
 * 示例 2: 订阅服务器时间（健康检查）
 * 艹！这个示例用于测试 Subscription 功能是否正常
 */
export function ServerTimeClock() {
  const { data: currentTime, connected } = useCurrentTimeSubscription()

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      <span className="text-sm text-gray-600">
        服务器时间: {currentTime || '加载中...'}
      </span>
    </div>
  )
}

/**
 * 示例 3: 订阅新博客文章（实时列表更新）
 * 艹！这个示例展示了如何实时更新文章列表
 */
export function BlogPostListWithSubscription() {
  const [posts, setPosts] = React.useState<any[]>([])
  const { data: newPost, connected } = useNewBlogPostSubscription()

  // 艹！当接收到新文章时，添加到列表顶部
  React.useEffect(() => {
    if (newPost) {
      setPosts((prevPosts) => {
        // 艹！检查文章是否已存在（避免重复）
        const exists = prevPosts.some((p) => p.id === newPost.id)
        if (exists) {
          return prevPosts
        }

        // 艹！将新文章添加到列表顶部
        return [newPost, ...prevPosts]
      })
    }
  }, [newPost])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">最新文章</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm text-gray-500">
            {connected ? '实时更新中' : '已断开'}
          </span>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-gray-500">暂无文章</div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id} className="border-b pb-4">
              <h3 className="font-medium">{post.title}</h3>
              <p className="text-sm text-gray-500">
                {post.author?.displayName} · {new Date(post.publishedAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * 示例 4: 自定义 Subscription（带错误处理）
 * 艹！这个示例展示了如何使用底层 API 创建自定义订阅
 */
export function CustomSubscriptionExample() {
  const { data, error, connected } = useSubscription('OnNewBlogPost', {
    // 艹！onData 被 Omit 排除了，不能传！数据通过返回值 data 获取
    onError: (err) => {
      console.error('Subscription 错误:', err)
    },
    onOpen: () => {
      console.log('Subscription 连接已建立')
    },
    onClose: () => {
      console.log('Subscription 连接已关闭')
    },
  })

  // 艹！使用 useEffect 监听 data 变化（替代 onData 回调）
  React.useEffect(() => {
    if (data) {
      console.log('接收到新文章:', data)
    }
  }, [data])

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        <span className="font-medium">
          {connected ? '已连接' : '未连接'}
        </span>
      </div>

      {error && (
        <div className="p-2 bg-red-50 text-red-600 rounded mb-2">
          错误: {error.message}
        </div>
      )}

      {data && (
        <div className="p-2 bg-blue-50 text-blue-600 rounded">
          最新数据: {JSON.stringify(data, null, 2)}
        </div>
      )}
    </div>
  )
}

/**
 * 示例 5: 手动管理 Subscription 生命周期
 * 艹！这个示例展示了如何手动控制订阅的启动和停止
 */
export function ManualSubscriptionControl() {
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [messages, setMessages] = React.useState<any[]>([])

  // 艹！仅在 isSubscribed 为 true 时创建订阅
  const { data, connected } = useNewBlogPostSubscription()

  React.useEffect(() => {
    if (data && isSubscribed) {
      setMessages((prev) => [...prev, data])
    }
  }, [data, isSubscribed])

  return (
    <div className="p-4 border rounded-lg">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setIsSubscribed(!isSubscribed)}
          className={`px-4 py-2 rounded ${
            isSubscribed
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {isSubscribed ? '停止订阅' : '开始订阅'}
        </button>

        {isSubscribed && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm">
              {connected ? '已连接' : '连接中...'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">接收到的消息 ({messages.length}):</h3>
        {messages.length === 0 ? (
          <div className="text-gray-500">暂无消息</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, idx) => (
              <li key={idx} className="p-2 bg-gray-50 rounded text-sm">
                {JSON.stringify(msg, null, 2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * 示例 6: 在 App 根组件中使用（全局通知）
 * 艹！这是最推荐的模式：在根组件启动订阅，整个应用共享
 */
export function AppWithSubscriptions({ children }: { children: React.ReactNode }) {
  const { data: newPost } = useNewBlogPostSubscription()

  React.useEffect(() => {
    if (newPost) {
      // 艹！显示全局通知
      console.log('🎉 全局通知：新文章发布!', newPost.title)

      // 实际项目中可以用 toast 或 notification
      // toast.success(`新文章：${newPost.title}`, {
      //   action: {
      //     label: '查看',
      //     onClick: () => router.push(`/blog/${newPost.slug}`)
      //   }
      // })
    }
  }, [newPost])

  return <>{children}</>
}

/**
 * 艹！老王我的使用建议：
 *
 * 1. **组件位置**：
 *    - 全局通知：在 App 根组件启动订阅
 *    - 页面特定：在对应页面组件启动订阅
 *    - 避免在多个组件同时订阅同一个数据
 *
 * 2. **性能优化**：
 *    - 使用 React.memo 避免不必要的重新渲染
 *    - 避免在 useEffect 中频繁操作 state
 *    - 使用函数式 setState 避免闭包陷阱
 *
 * 3. **用户体验**：
 *    - 显示连接状态（connected）
 *    - 显示错误信息（error）
 *    - 提供手动重连按钮
 *
 * 4. **错误处理**：
 *    - 始终提供 onError 回调
 *    - 记录错误到监控系统
 *    - 给用户友好的错误提示
 *
 * 5. **测试**：
 *    - 先用 useCurrentTimeSubscription 测试功能
 *    - 确认服务端 Subscription 正常工作
 *    - 测试网络断开重连场景
 */
