# GraphQL SDK 使用示例

**艹！这个目录包含了 GraphQL SDK 的完整使用示例，涵盖 Node.js 和 React 两种环境！**

---

## 📁 文件列表

- **`01-basic-nodejs.ts`** - Node.js / API 路由使用示例（10 个示例）
- **`02-react-hooks.tsx`** - React Hooks 使用示例（10 个组件示例）

---

## 🚀 Node.js / API 路由示例

文件: `01-basic-nodejs.ts`

### 示例列表

1. **获取当前用户** - 基础查询示例
2. **获取博客文章列表** - 带分页参数的查询
3. **获取单个博客文章详情** - 根据 ID 查询
4. **Echo Mutation** - 测试 Mutation 操作
5. **错误处理示例** - 完整的错误分类和处理
6. **更新认证 Token** - 动态更新 Token
7. **自定义请求头** - 添加自定义请求头
8. **禁用重试** - 禁用请求重试机制
9. **自定义重试策略** - 配置重试次数和延迟
10. **执行原始 GraphQL 请求** - 使用原始查询字符串

### 运行示例

```bash
# 运行所有示例
pnpm ts-node examples/graphql-sdk/01-basic-nodejs.ts

# 或者在代码中导入单个示例函数
import { example1_GetCurrentUser } from '@/examples/graphql-sdk/01-basic-nodejs'

await example1_GetCurrentUser()
```

### 核心代码片段

```typescript
import { createGraphQLSDK, GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk'

// 创建 SDK 实例
const sdk = createGraphQLSDK({
  endpoint: 'http://localhost:3000/api/graphql',
  token: 'your-auth-token',
  enableLogging: true,
})

// 获取当前用户
try {
  const { me } = await sdk.api.GetMe()
  console.log('当前用户:', me)
} catch (error) {
  if (error instanceof GraphQLSDKError) {
    console.error('错误类型:', error.type)
    console.error('错误信息:', error.message)
  }
}
```

---

## ⚛️ React Hooks 示例

文件: `02-react-hooks.tsx`

### 组件列表

1. **Example1_CurrentUser** - 获取当前用户
2. **Example2_BlogPosts** - 获取博客文章列表（带轮询）
3. **Example3_SinglePost** - 获取单个博客文章（带条件加载）
4. **Example4_EchoMutation** - Echo Mutation 测试
5. **Example5_CustomQuery** - 自定义 Query Hook（带依赖项追踪）
6. **Example6_CustomMutation** - 自定义 Mutation Hook
7. **Example7_OptimisticUpdate** - 手动设置数据（乐观更新）
8. **Example8_ManualExecution** - 禁用立即执行
9. **Example9_Pagination** - 分页加载
10. **Example10_BlogManager** - 综合示例 - 博客文章管理器

### 使用方法

```tsx
'use client'

import { Example1_CurrentUser, Example2_BlogPosts } from '@/examples/graphql-sdk/02-react-hooks'

export default function MyPage() {
  return (
    <div>
      <Example1_CurrentUser />
      <Example2_BlogPosts />
    </div>
  )
}
```

### 核心代码片段

```tsx
'use client'

import { useCurrentUser, useBlogPosts, useEchoMutation } from '@/lib/graphql/sdk/hooks'

export function MyComponent() {
  // 获取当前用户
  const { data: currentUser, loading, error, refetch } = useCurrentUser()

  // 获取博客文章（带轮询）
  const { data: blogPosts } = useBlogPosts(
    { limit: 10, offset: 0 },
    { pollInterval: 5000 } // 每 5 秒自动刷新
  )

  // Echo Mutation
  const { execute: echo, loading: echoLoading, data: echoData } = useEchoMutation()

  const handleEcho = async () => {
    await echo({ message: 'Hello GraphQL!' })
  }

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <div>
      <h1>当前用户: {currentUser?.email}</h1>
      <h2>博客文章: {blogPosts?.length} 篇</h2>

      <button onClick={handleEcho} disabled={echoLoading}>
        测试 Echo
      </button>
      {echoData && <p>{echoData}</p>}
    </div>
  )
}
```

---

## 📖 常见使用场景

### 场景 1: Next.js API 路由中使用 SDK

```typescript
// app/api/my-endpoint/route.ts
import { createGraphQLSDK } from '@/lib/graphql/sdk'

export async function GET() {
  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  const { blogPosts } = await sdk.api.GetPublishedBlogPosts({ limit: 10 })

  return Response.json({ posts: blogPosts })
}
```

### 场景 2: React 组件中使用 Hooks

```tsx
'use client'

import { useBlogPosts } from '@/lib/graphql/sdk/hooks'

export function BlogList() {
  const { data: posts, loading, error } = useBlogPosts({ limit: 10, offset: 0 })

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <ul>
      {posts?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### 场景 3: 带认证的请求

```typescript
import { createGraphQLSDK } from '@/lib/graphql/sdk'

const sdk = createGraphQLSDK({
  endpoint: '/api/graphql',
  token: 'user-auth-token', // 从登录获取
})

// 登录后更新 token
sdk.setToken(newToken)

// 登出时清除 token
sdk.setToken(null)
```

### 场景 4: 错误处理

```typescript
import { GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk'

try {
  const { me } = await sdk.api.GetMe()
} catch (error) {
  if (error instanceof GraphQLSDKError) {
    switch (error.type) {
      case GraphQLErrorType.AUTHENTICATION_ERROR:
        // 跳转到登录页
        window.location.href = '/login'
        break
      case GraphQLErrorType.NETWORK_ERROR:
        // 显示网络错误提示
        alert('网络连接失败，请检查网络设置')
        break
      default:
        alert(error.message)
    }
  }
}
```

### 场景 5: 轮询查询

```tsx
'use client'

import { useBlogPosts } from '@/lib/graphql/sdk/hooks'

export function LiveBlogList() {
  const { data: posts } = useBlogPosts(
    { limit: 10, offset: 0 },
    { pollInterval: 5000 } // 每 5 秒自动刷新
  )

  return (
    <div>
      <p>实时更新的博客列表（每 5 秒刷新）</p>
      <ul>
        {posts?.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### 场景 6: 依赖项追踪

```tsx
'use client'

import { useGraphQLQuery } from '@/lib/graphql/sdk/hooks'

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading } = useGraphQLQuery(
    'GetUser',
    async (sdk) => {
      const result = await sdk.api.GetUser({ userId })
      return result.user
    },
    { deps: [userId] } // userId 变化时重新查询
  )

  if (loading) return <div>加载中...</div>

  return <div>{user?.displayName}</div>
}
```

### 场景 7: 手动触发查询

```tsx
'use client'

import { useCurrentUser } from '@/lib/graphql/sdk/hooks'

export function ManualFetch() {
  const { data, loading, refetch } = useCurrentUser({
    immediate: false, // 禁用立即执行
  })

  return (
    <div>
      <button onClick={refetch} disabled={loading}>
        {loading ? '加载中...' : '点击加载数据'}
      </button>
      {data && <p>用户: {data.email}</p>}
    </div>
  )
}
```

---

## 🔧 配置选项

### SDK 配置

```typescript
const sdk = createGraphQLSDK({
  // 必填: GraphQL API endpoint
  endpoint: '/api/graphql',

  // 可选: 认证 token
  token: 'your-auth-token',

  // 可选: 自定义请求头
  headers: {
    'X-Custom-Header': 'value',
  },

  // 可选: 请求超时时间（毫秒，默认 30000）
  timeout: 10000,

  // 可选: 是否启用重试（默认 true）
  retry: true,

  // 可选: 最大重试次数（默认 3）
  maxRetries: 5,

  // 可选: 重试延迟（毫秒，默认 1000）
  retryDelay: 2000,

  // 可选: 是否启用请求日志（默认 false）
  enableLogging: true,
})
```

### Query Hook 配置

```typescript
useGraphQLQuery(queryName, queryFn, {
  // 可选: 是否立即执行查询（默认 true）
  immediate: true,

  // 可选: 轮询间隔（毫秒，0 或 undefined 表示不轮询）
  pollInterval: 5000,

  // 可选: 依赖项数组（变化时重新查询）
  deps: ['user-123'],

  // 可选: 是否在组件卸载时取消请求（默认 true）
  cancelOnUnmount: true,
})
```

---

## ⚠️ 注意事项

1. **客户端组件标识** - React Hooks 只能在客户端组件中使用（`'use client'`）
2. **默认 SDK 实例** - `defaultSDK` 仅在浏览器环境中可用，服务器端需创建新实例
3. **认证 Token** - Token 存储在客户端内存中，页面刷新后会丢失
4. **错误处理** - 始终捕获 GraphQL 错误并根据类型进行处理
5. **轮询清理** - 组件卸载时会自动清理轮询定时器

---

## 📚 相关文档

- [GraphQL SDK API 文档](../../lib/graphql/sdk/README.md)
- [GraphQL API 文档](../../docs/GRAPHQL_API.md)
- [GraphQL Queries 示例](../../lib/graphql/queries/README.md)
- [GraphQL Playground](/graphql-playground)

---

**艹！有问题就翻文档，别瞎猜！享受类型安全的快感吧！**
