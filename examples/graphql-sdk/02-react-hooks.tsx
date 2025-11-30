/**
 * GraphQL SDK React Hooks 使用示例
 * 艹！这个文件展示了如何在 React 组件中使用 GraphQL SDK Hooks
 *
 * 适用场景：
 * - Next.js 客户端组件
 * - React 应用
 * - 需要自动管理加载状态和错误处理的场景
 */

'use client'

import React from 'react'
import {
  useCurrentUser,
  useBlogPosts,
  useBlogPost,
  useEchoMutation,
  useGraphQLQuery,
  useGraphQLMutation,
} from '@/lib/graphql/sdk/hooks'

/**
 * 示例 1: 获取当前用户
 */
export function Example1_CurrentUser() {
  const { data: currentUser, loading, error, refetch } = useCurrentUser()

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!currentUser) return <div>未登录</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">当前用户</h2>
      <p>ID: {currentUser.id}</p>
      <p>Email: {currentUser.email}</p>
      <p>显示名称: {currentUser.displayName}</p>
      <button onClick={refetch} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        刷新
      </button>
    </div>
  )
}

/**
 * 示例 2: 获取博客文章列表（带轮询）
 */
export function Example2_BlogPosts() {
  const {
    data: blogPosts,
    loading,
    error,
  } = useBlogPosts(
    { limit: 10, offset: 0 },
    { pollInterval: 5000 } // 每 5 秒自动刷新
  )

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!blogPosts || blogPosts.length === 0) return <div>暂无文章</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">博客文章列表（自动刷新）</h2>
      <p className="text-sm text-gray-500">每 5 秒自动刷新</p>
      <ul className="mt-4 space-y-2">
        {blogPosts.map((post) => (
          <li key={post.id} className="p-2 bg-gray-50 rounded">
            <h3 className="font-semibold">{post.title}</h3>
            <p className="text-sm text-gray-600">
              作者: {post.author?.displayName} | 浏览: {post.viewCount} | 点赞: {post.likeCount}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 示例 3: 获取单个博客文章（带条件加载）
 */
export function Example3_SinglePost({ postId }: { postId: string | null }) {
  const { data: post, loading, error } = useBlogPost(postId)

  if (!postId) return <div>请选择文章</div>
  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!post) return <div>文章不存在</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">{post.title}</h2>
      <p className="text-sm text-gray-600 mt-2">
        作者: {post.author?.displayName} | 发布时间: {post.publishedAt}
      </p>
      <p className="mt-4">{post.content}</p>
      <div className="mt-4 flex gap-4 text-sm text-gray-600">
        <span>浏览: {post.viewCount}</span>
        <span>点赞: {post.likeCount}</span>
        <span>评论: {post.commentCount}</span>
      </div>
    </div>
  )
}

/**
 * 示例 4: Echo Mutation（测试用）
 */
export function Example4_EchoMutation() {
  const { execute: echo, loading, data, error } = useEchoMutation()
  const [message, setMessage] = React.useState('')

  const handleEcho = async () => {
    if (!message.trim()) return
    await echo({ message })
  }

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">Echo Mutation 测试</h2>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleEcho}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {loading ? '发送中...' : '发送'}
        </button>
      </div>
      {data && <p className="mt-2 text-green-600">✅ 响应: {data}</p>}
      {error && <p className="mt-2 text-red-600">❌ 错误: {error.message}</p>}
    </div>
  )
}

/**
 * 示例 5: 自定义 Query Hook（带依赖项追踪）
 */
export function Example5_CustomQuery({ userId }: { userId: string }) {
  const {
    data: user,
    loading,
    error,
    refetch,
  } = useGraphQLQuery(
    'GetUser',
    async (sdk) => {
      const result = await sdk.api.GetUser({ userId })
      return result.user
    },
    { deps: [userId] } // userId 变化时重新查询
  )

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!user) return <div>用户不存在</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">用户详情</h2>
      <p>ID: {user.id}</p>
      <p>Email: {user.email}</p>
      <p>显示名称: {user.displayName}</p>
      <button onClick={refetch} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        刷新
      </button>
    </div>
  )
}

/**
 * 示例 6: 自定义 Mutation Hook
 */
export function Example6_CustomMutation() {
  const {
    execute: updateUser,
    loading,
    data,
    error,
    reset,
  } = useGraphQLMutation(
    async (sdk, variables: { userId: string; displayName: string }) => {
      // 这里假设有一个 UpdateUser mutation
      // 实际项目中需要先在 schema 中定义并生成类型
      return { success: true, message: '更新成功' }
    }
  )

  const [displayName, setDisplayName] = React.useState('')

  const handleUpdate = async () => {
    if (!displayName.trim()) return
    await updateUser({ userId: 'user-123', displayName })
  }

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">更新用户信息</h2>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="新的显示名称"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>
      {data && <p className="mt-2 text-green-600">✅ {JSON.stringify(data)}</p>}
      {error && <p className="mt-2 text-red-600">❌ 错误: {error.message}</p>}
      {(data || error) && (
        <button onClick={reset} className="mt-2 px-4 py-2 bg-gray-500 text-white rounded">
          重置
        </button>
      )}
    </div>
  )
}

/**
 * 示例 7: 手动设置数据（乐观更新）
 */
export function Example7_OptimisticUpdate() {
  const { data: currentUser, loading, error, setData } = useCurrentUser()
  const [newDisplayName, setNewDisplayName] = React.useState('')

  const handleOptimisticUpdate = () => {
    if (!currentUser || !newDisplayName.trim()) return

    // 乐观更新：立即更新 UI
    setData({
      ...currentUser,
      displayName: newDisplayName,
    })

    // 实际项目中，这里应该发送 mutation 请求
    // 如果失败，需要回滚数据
  }

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!currentUser) return <div>未登录</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">乐观更新示例</h2>
      <p className="mt-2">当前显示名称: {currentUser.displayName}</p>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
          placeholder="新的显示名称"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleOptimisticUpdate}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          乐观更新
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        ⚠️ 这只是 UI 更新，实际项目中需要发送 mutation 请求
      </p>
    </div>
  )
}

/**
 * 示例 8: 禁用立即执行
 */
export function Example8_ManualExecution() {
  const { data, loading, error, refetch } = useCurrentUser({
    immediate: false, // 禁用立即执行
  })

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">手动执行查询</h2>
      <button
        onClick={refetch}
        disabled={loading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {loading ? '加载中...' : '点击加载数据'}
      </button>
      {data && (
        <div className="mt-4">
          <p>用户: {data.email}</p>
          <p>显示名称: {data.displayName}</p>
        </div>
      )}
      {error && <p className="mt-2 text-red-600">❌ 错误: {error.message}</p>}
    </div>
  )
}

/**
 * 示例 9: 分页加载
 */
export function Example9_Pagination() {
  const [page, setPage] = React.useState(0)
  const pageSize = 5

  const {
    data: blogPosts,
    loading,
    error,
  } = useBlogPosts({
    limit: pageSize,
    offset: page * pageSize,
  })

  if (error) return <div>错误: {error.message}</div>

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">分页加载示例</h2>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {blogPosts?.map((post) => (
              <li key={post.id} className="p-2 bg-gray-50 rounded">
                <h3 className="font-semibold">{post.title}</h3>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-300"
            >
              上一页
            </button>
            <span className="px-4 py-2">第 {page + 1} 页</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!blogPosts || blogPosts.length < pageSize || loading}
              className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-300"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 示例 10: 综合示例 - 博客文章管理器
 */
export function Example10_BlogManager() {
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null)

  const {
    data: blogPosts,
    loading: postsLoading,
    error: postsError,
  } = useBlogPosts({ limit: 5, offset: 0 })

  const {
    data: selectedPost,
    loading: postLoading,
    error: postError,
  } = useBlogPost(selectedPostId)

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">博客文章管理器</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* 文章列表 */}
        <div>
          <h3 className="font-semibold">文章列表</h3>
          {postsLoading ? (
            <div>加载中...</div>
          ) : postsError ? (
            <div>错误: {postsError.message}</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {blogPosts?.map((post) => (
                <li
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className={`p-2 cursor-pointer rounded ${
                    selectedPostId === post.id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {post.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 文章详情 */}
        <div>
          <h3 className="font-semibold">文章详情</h3>
          {!selectedPostId ? (
            <p className="mt-2 text-gray-500">请选择文章</p>
          ) : postLoading ? (
            <div>加载中...</div>
          ) : postError ? (
            <div>错误: {postError.message}</div>
          ) : selectedPost ? (
            <div className="mt-2">
              <h4 className="font-semibold">{selectedPost.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                作者: {selectedPost.author?.displayName}
              </p>
              <p className="mt-2 text-sm">{selectedPost.content}</p>
            </div>
          ) : (
            <div>文章不存在</div>
          )}
        </div>
      </div>
    </div>
  )
}
