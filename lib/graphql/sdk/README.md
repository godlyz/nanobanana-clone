# GraphQL TypeScript SDK

**艹！这是老王精心打造的 GraphQL TypeScript SDK，提供完美的类型安全和开发体验！**

---

## 📦 特性

- ✅ **完全类型安全** - 基于 GraphQL Schema 自动生成 TypeScript 类型
- ✅ **自动错误处理** - 统一的错误分类和重试机制
- ✅ **认证支持** - 自动注入 Bearer Token
- ✅ **请求重试** - 网络错误自动重试（可配置）
- ✅ **React Hooks** - 开箱即用的 React Hooks 封装
- ✅ **轮询支持** - 自动轮询查询数据
- ✅ **请求日志** - 开发模式下自动打印请求日志
- ✅ **取消请求** - 组件卸载时自动取消请求

---

## 🚀 快速开始

### 安装依赖

SDK 已经内置在项目中，无需额外安装。

### 基础使用（Node.js / API 路由）

```typescript
import { createGraphQLSDK } from '@/lib/graphql/sdk'

// 创建 SDK 实例
const sdk = createGraphQLSDK({
  endpoint: 'http://localhost:3000/api/graphql',
  token: 'your-auth-token', // 可选
  enableLogging: true,       // 开发模式启用日志
})

// 获取当前用户
const { me } = await sdk.api.GetMe()
console.log(me?.email)

// 获取博客文章列表
const { blogPosts } = await sdk.api.GetPublishedBlogPosts({
  limit: 10,
  offset: 0,
})
console.log(blogPosts?.length)

// Echo Mutation（测试）
const { echo } = await sdk.api.TestEcho({ message: 'Hello!' })
console.log(echo) // "Echo: Hello!"
```

### React Hooks 使用（客户端组件）

```typescript
'use client'

import { useCurrentUser, useBlogPosts, useEchoMutation } from '@/lib/graphql/sdk/hooks'

function MyComponent() {
  // 获取当前用户（自动执行）
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

## 📖 API 参考

### `createGraphQLSDK(config)`

创建 GraphQL SDK 实例。

**参数：**

```typescript
interface GraphQLSDKConfig {
  /** GraphQL API endpoint URL */
  endpoint: string

  /** 认证 token（可选） */
  token?: string

  /** 自定义请求头（可选） */
  headers?: Record<string, string>

  /** 请求超时时间（毫秒，默认 30000） */
  timeout?: number

  /** 是否启用重试（默认 true） */
  retry?: boolean

  /** 最大重试次数（默认 3） */
  maxRetries?: number

  /** 重试延迟（毫秒，默认 1000） */
  retryDelay?: number

  /** 是否启用请求日志（默认 false） */
  enableLogging?: boolean
}
```

**返回值：**

```typescript
class GraphQLSDK {
  /** 自动生成的 SDK API */
  api: {
    GetMe(): Promise<GetMeQuery>
    GetUser(variables: GetUserQueryVariables): Promise<GetUserQuery>
    GetPublishedBlogPosts(variables?: GetPublishedBlogPostsQueryVariables): Promise<GetPublishedBlogPostsQuery>
    GetBlogPost(variables: GetBlogPostQueryVariables): Promise<GetBlogPostQuery>
    TestEcho(variables: TestEchoMutationVariables): Promise<TestEchoMutation>
    // ... 更多方法
  }

  /** 更新认证 token */
  setToken(token: string | null): void

  /** 更新请求头 */
  setHeaders(headers: Record<string, string>): void

  /** 原始 GraphQL 客户端 */
  rawClient: GraphQLClient

  /** 执行原始 GraphQL 请求 */
  request<TData, TVariables>(document: RequestDocument, variables?: TVariables): Promise<TData>
}
```

---

### `useGraphQLQuery(queryName, queryFn, options)`

React Hook 用于执行 GraphQL 查询。

**参数：**

- `queryName`: 查询名称（用于日志）
- `queryFn`: 查询函数 `(sdk: GraphQLSDK) => Promise<TData>`
- `options`: 配置选项

```typescript
interface UseGraphQLQueryOptions {
  /** 是否立即执行查询（默认 true） */
  immediate?: boolean

  /** 轮询间隔（毫秒，0 或 undefined 表示不轮询） */
  pollInterval?: number

  /** 依赖项数组（变化时重新查询） */
  deps?: any[]

  /** 是否在组件卸载时取消请求（默认 true） */
  cancelOnUnmount?: boolean
}
```

**返回值：**

```typescript
interface UseGraphQLQueryResult<TData> {
  /** 查询数据 */
  data: TData | null

  /** 加载状态 */
  loading: boolean

  /** 错误信息 */
  error: GraphQLSDKError | null

  /** 重新获取数据 */
  refetch: () => Promise<void>

  /** 手动设置数据 */
  setData: (data: TData | null) => void
}
```

**示例：**

```typescript
const { data, loading, error, refetch } = useGraphQLQuery(
  'GetUser',
  async (sdk) => {
    const result = await sdk.api.GetUser({ userId: 'user-123' })
    return result.user
  },
  { deps: ['user-123'] } // 依赖项变化时重新查询
)
```

---

### `useGraphQLMutation(mutationFn)`

React Hook 用于执行 GraphQL Mutation。

**参数：**

- `mutationFn`: Mutation 函数 `(sdk: GraphQLSDK, variables: TVariables) => Promise<TData>`

**返回值：**

```typescript
interface UseGraphQLMutationResult<TData, TVariables> {
  /** 执行 mutation */
  execute: (variables?: TVariables) => Promise<TData>

  /** 加载状态 */
  loading: boolean

  /** 错误信息 */
  error: GraphQLSDKError | null

  /** mutation 结果数据 */
  data: TData | null

  /** 重置状态 */
  reset: () => void
}
```

**示例：**

```typescript
const { execute: updateUser, loading, error } = useGraphQLMutation(
  async (sdk, variables: { userId: string; name: string }) => {
    const result = await sdk.api.UpdateUser(variables)
    return result.updateUser
  }
)

// 调用 mutation
await updateUser({ userId: 'user-123', name: 'New Name' })
```

---

### 快捷 Hooks

#### `useCurrentUser(options?)`

获取当前登录用户。

```typescript
const { data: currentUser, loading, error } = useCurrentUser()
```

#### `useBlogPosts(variables?, options?)`

获取博客文章列表。

```typescript
const { data: blogPosts, loading } = useBlogPosts(
  { limit: 10, offset: 0 },
  { pollInterval: 5000 }
)
```

#### `useBlogPost(postId, options?)`

获取单个博客文章。

```typescript
const { data: post, loading } = useBlogPost('post-123')
```

#### `useEchoMutation()`

Echo Mutation（测试用）。

```typescript
const { execute: echo, data } = useEchoMutation()
await echo({ message: 'Hello!' })
```

---

## 🐛 错误处理

SDK 提供了统一的错误处理机制。

### 错误类型

```typescript
enum GraphQLErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',               // 网络错误
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // 认证错误（401）
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',   // 授权错误（403）
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',         // 速率限制错误（429）
  VALIDATION_ERROR = 'VALIDATION_ERROR',         // 验证错误（400）
  SERVER_ERROR = 'SERVER_ERROR',                 // 服务器错误（500+）
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',               // 未知错误
}
```

### 捕获错误

```typescript
try {
  const { me } = await sdk.api.GetMe()
} catch (error) {
  if (error instanceof GraphQLSDKError) {
    console.error('错误类型:', error.type)
    console.error('错误信息:', error.message)
    console.error('状态码:', error.statusCode)
    console.error('原始错误:', error.originalError)

    // 根据错误类型处理
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

---

## ⚙️ 高级功能

### 更新认证 Token

```typescript
// 登录后更新 token
sdk.setToken('new-auth-token')

// 登出时清除 token
sdk.setToken(null)
```

### 更新请求头

```typescript
sdk.setHeaders({
  'X-Custom-Header': 'value',
  'X-Request-ID': 'unique-id',
})
```

### 执行原始 GraphQL 请求

```typescript
import { gql } from 'graphql-tag'

const query = gql`
  query CustomQuery {
    customField
  }
`

const result = await sdk.request(query)
```

### 禁用重试

```typescript
const sdk = createGraphQLSDK({
  endpoint: '/api/graphql',
  retry: false, // 禁用重试
})
```

### 自定义重试策略

```typescript
const sdk = createGraphQLSDK({
  endpoint: '/api/graphql',
  maxRetries: 5,        // 最多重试 5 次
  retryDelay: 2000,     // 每次重试延迟 2 秒
})
```

---

## 📝 TypeScript 类型

所有查询和 Mutation 都有完整的 TypeScript 类型支持。

### 导入类型

```typescript
import type {
  GetMeQuery,
  GetUserQuery,
  GetUserQueryVariables,
  User,
  BlogPost,
} from '@/lib/graphql/sdk'
```

### 使用类型

```typescript
function handleUser(user: User) {
  console.log(user.email, user.displayName)
}

async function fetchUser(userId: string): Promise<User | null> {
  const result: GetUserQuery = await sdk.api.GetUser({ userId })
  return result.user
}
```

---

## 🔍 调试

### 启用请求日志

```typescript
const sdk = createGraphQLSDK({
  endpoint: '/api/graphql',
  enableLogging: true, // 开发模式下启用日志
})
```

日志输出示例：

```
[GraphQL SDK] GraphQL SDK 初始化成功 { endpoint: '/api/graphql' }
[GraphQL SDK] 执行 Query GetMe (尝试 1/3)
[GraphQL SDK] Query GetMe 成功 { me: { id: 'user-123', email: 'user@example.com' } }
```

---

## ⚠️ 注意事项

1. **客户端组件** - React Hooks 只能在客户端组件中使用（`'use client'`）
2. **默认 SDK 实例** - `defaultSDK` 仅在浏览器环境中可用，服务器端需创建新实例
3. **认证 Token** - Token 存储在客户端内存中，页面刷新后会丢失
4. **错误处理** - 始终捕获 GraphQL 错误并根据类型进行处理
5. **轮询清理** - 组件卸载时会自动清理轮询定时器

---

## 📚 相关文档

- [GraphQL API 文档](../../../docs/GRAPHQL_API.md)
- [GraphQL Queries 示例](../queries/README.md)
- [GraphQL Generated Types](../generated/README.md)
- [GraphQL Playground](/graphql-playground)

---

**艹！有问题就翻文档，别瞎猜！享受类型安全的快感吧！**
