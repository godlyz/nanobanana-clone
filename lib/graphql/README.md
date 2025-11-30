# GraphQL SDK 使用指南

> 艹！这个SDK提供了类型安全的GraphQL客户端，支持查询、变更、订阅（Subscriptions）、Fragment复用和增强的错误处理。

## 目录

- [快速开始](#快速开始)
- [基础用法](#基础用法)
  - [查询（Queries）](#查询queries)
  - [变更（Mutations）](#变更mutations)
  - [订阅（Subscriptions）](#订阅subscriptions)
- [Fragment 复用](#fragment-复用)
- [错误处理](#错误处理)
- [React Hooks](#react-hooks)
- [高级用法](#高级用法)

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 生成 TypeScript 类型

```bash
# 导出 GraphQL Schema
pnpm export-schema

# 生成 TypeScript 类型和 Typed Document Nodes
pnpm codegen
```

### 3. 导入 SDK

```typescript
import { sdk } from '@/lib/graphql/sdk'

// 使用 SDK 发起查询
const { me } = await sdk.api.GetMe()
console.log('当前用户:', me)
```

---

## 基础用法

### 查询（Queries）

#### 获取当前用户

```typescript
import { sdk } from '@/lib/graphql/sdk'

const { me } = await sdk.api.GetMe()
console.log('用户信息:', me)
```

#### 获取博客文章列表

```typescript
const { blogPosts } = await sdk.api.GetPublishedBlogPosts({
  status: 'published',
  limit: 10,
  offset: 0,
})

blogPosts?.forEach(post => {
  console.log(post.title, post.author?.displayName)
})
```

#### 分页查询（使用 Cursor Pagination）

```typescript
const { blogPostsConnection } = await sdk.api.GetBlogPostsConnection({
  first: 10,
  after: null, // 首次加载为 null
})

console.log('文章列表:', blogPostsConnection?.edges)
console.log('分页信息:', blogPostsConnection?.pageInfo)

// 加载下一页
if (blogPostsConnection?.pageInfo?.hasNextPage) {
  const nextPage = await sdk.api.GetNextPageBlogPosts({
    first: 10,
    after: blogPostsConnection.pageInfo.endCursor,
  })
}
```

---

### 变更（Mutations）

#### 测试 Echo Mutation

```typescript
const { testEcho } = await sdk.api.TestEcho({
  message: 'Hello GraphQL!',
})

console.log('Echo 响应:', testEcho) // "Echo: Hello GraphQL!"
```

---

### 订阅（Subscriptions）

> ⚡️ Week 8 新增：实时推送支持，使用 Server-Sent Events (SSE)

#### 使用 React Hook 订阅新博客文章

```typescript
import { useNewBlogPost } from '@/lib/graphql/sdk'

function BlogFeed() {
  const { data, connected, error } = useNewBlogPost({
    immediate: true,      // 立即连接
    autoReconnect: true,  // 自动重连
    reconnectDelay: 3000, // 重连延迟（毫秒）
  })

  if (error) {
    return <div>连接错误: {error.message}</div>
  }

  if (!connected) {
    return <div>正在连接...</div>
  }

  return (
    <div>
      <h2>最新博客文章</h2>
      {data?.newBlogPost && (
        <article>
          <h3>{data.newBlogPost.title}</h3>
          <p>作者: {data.newBlogPost.author?.displayName}</p>
          <p>发布时间: {data.newBlogPost.publishedAt}</p>
        </article>
      )}
    </div>
  )
}
```

#### 使用通用 Subscription Hook

```typescript
import { useGraphQLSubscription } from '@/lib/graphql/sdk'

function CustomSubscription() {
  const { data, connected, error, reconnect, disconnect } = useGraphQLSubscription(
    'OnCurrentTime',
    `subscription OnCurrentTime { currentTime }`,
    {
      immediate: true,
      autoReconnect: true,
      reconnectDelay: 5000,
    }
  )

  return (
    <div>
      <p>服务器时间: {data?.currentTime}</p>
      <p>连接状态: {connected ? '✅ 已连接' : '❌ 未连接'}</p>
      {error && <p>错误: {error.message}</p>}
      <button onClick={reconnect}>重新连接</button>
      <button onClick={disconnect}>断开连接</button>
    </div>
  )
}
```

#### 可用的 Subscription Hooks

| Hook                        | 功能             | 参数                                  |
| --------------------------- | ---------------- | ------------------------------------- |
| `useGraphQLSubscription`    | 通用订阅 Hook    | `(name, query, options)`              |
| `useNewBlogPost`            | 订阅新博客文章   | `(options?)`                          |
| `useCurrentTime`            | 订阅服务器时间   | `(options?)`                          |

**Subscription Options:**

```typescript
interface UseGraphQLSubscriptionOptions {
  immediate?: boolean       // 立即连接（默认: true）
  autoReconnect?: boolean   // 自动重连（默认: true）
  reconnectDelay?: number   // 重连延迟（默认: 3000ms）
  deps?: any[]              // 依赖数组（用于 useEffect）
}
```

---

## Fragment 复用

> ✨ Week 8 优化：定义了常用的 Fragment，减少重复代码

### 可用的 Fragment

| Fragment               | 用途                         | 包含字段                                      |
| ---------------------- | ---------------------------- | --------------------------------------------- |
| `UserBasicInfo`        | 用户基本信息（简化版）       | id, email, displayName, avatarUrl             |
| `UserDetailInfo`       | 用户详细信息（完整版）       | 所有基本字段 + bio, location, 社交链接, 统计  |
| `BlogPostPreview`      | 博客文章预览（列表/卡片）    | id, title, slug, excerpt, 封面, 统计          |
| `BlogPostDetail`       | 博客文章详情（完整版）       | 所有预览字段 + content, SEO元数据, 完整统计   |

### 在查询中使用 Fragment

```graphql
# lib/graphql/queries/custom-query.graphql
query GetBlogPostsWithAuthor {
  blogPosts(status: "published", limit: 10) {
    ...BlogPostPreview
    author {
      ...UserBasicInfo
    }
  }
}
```

### Fragment 定义示例

```graphql
# UserBasicInfo - 用户基本信息
fragment UserBasicInfo on User {
  id
  email
  displayName
  avatarUrl
}

# UserDetailInfo - 用户详细信息
fragment UserDetailInfo on User {
  id
  email
  displayName
  avatarUrl
  bio
  location
  websiteUrl
  twitterHandle
  githubHandle
  followerCount
  followingCount
  postCount
  artworkCount
  totalLikes
}

# BlogPostPreview - 博客文章预览
fragment BlogPostPreview on BlogPost {
  id
  title
  slug
  excerpt
  coverImageUrl
  publishedAt
  viewCount
  likeCount
  commentCount
}

# BlogPostDetail - 博客文章详情
fragment BlogPostDetail on BlogPost {
  id
  title
  slug
  content
  excerpt
  coverImageUrl
  status
  publishedAt
  createdAt
  updatedAt
  viewCount
  likeCount
  commentCount
  isLiked
  metaTitle
  metaDescription
  metaKeywords
}
```

### 在 TypeScript 中使用 Fragment 类型

```typescript
import type {
  UserBasicInfoFragment,
  UserDetailInfoFragment,
  BlogPostPreviewFragment,
  BlogPostDetailFragment,
} from '@/lib/graphql/sdk'

// 使用 Fragment 类型
function UserCard({ user }: { user: UserBasicInfoFragment }) {
  return (
    <div>
      <img src={user.avatarUrl || ''} alt={user.displayName || ''} />
      <h3>{user.displayName}</h3>
      <p>{user.email}</p>
    </div>
  )
}

function UserProfile({ user }: { user: UserDetailInfoFragment }) {
  return (
    <div>
      <h2>{user.displayName}</h2>
      <p>{user.bio}</p>
      <p>地点: {user.location}</p>
      <p>关注者: {user.followerCount}</p>
      <p>文章数: {user.postCount}</p>
    </div>
  )
}
```

---

## 错误处理

> 🛡️ Week 8 增强：详细的错误分类、标准化错误码、国际化错误消息

### 错误类型

GraphQL SDK 提供了 15 种详细的错误类型：

| 错误类型                        | 说明               | HTTP 状态码 |
| ------------------------------- | ------------------ | ----------- |
| `NETWORK_ERROR`                 | 网络连接失败       | -           |
| `TIMEOUT_ERROR`                 | 请求超时           | -           |
| `AUTHENTICATION_ERROR`          | 身份验证失败       | 401         |
| `AUTHORIZATION_ERROR`           | 权限不足           | 403         |
| `BAD_REQUEST_ERROR`             | 请求参数错误       | 400         |
| `NOT_FOUND_ERROR`               | 资源未找到         | 404         |
| `CONFLICT_ERROR`                | 资源冲突           | 409         |
| `VALIDATION_ERROR`              | 数据验证失败       | 400         |
| `RATE_LIMIT_ERROR`              | 请求频率超限       | 429         |
| `SERVER_ERROR`                  | 服务器错误         | 500         |
| `INTERNAL_SERVER_ERROR`         | 服务器内部错误     | 500         |
| `SERVICE_UNAVAILABLE`           | 服务不可用         | 503         |
| `GRAPHQL_VALIDATION_ERROR`      | GraphQL 语法错误   | -           |
| `UNKNOWN_ERROR`                 | 未知错误           | -           |

### 标准化错误码

所有错误码遵循 `ERR_XXX_YYY` 格式：

| 错误码                     | 说明                 |
| -------------------------- | -------------------- |
| `ERR_NETWORK_FAILED`       | 网络连接失败         |
| `ERR_REQUEST_TIMEOUT`      | 请求超时             |
| `ERR_BAD_REQUEST`          | 请求参数错误         |
| `ERR_AUTH_UNAUTHORIZED`    | 身份验证失败         |
| `ERR_AUTH_FORBIDDEN`       | 权限不足             |
| `ERR_RESOURCE_NOT_FOUND`   | 资源未找到           |
| `ERR_RESOURCE_CONFLICT`    | 资源冲突             |
| `ERR_RATE_LIMIT_EXCEEDED`  | 请求频率超限         |
| `ERR_INTERNAL_SERVER`      | 服务器内部错误       |
| `ERR_SERVICE_UNAVAILABLE`  | 服务不可用           |
| `ERR_SERVER_ERROR`         | 服务器错误           |
| `ERR_UNKNOWN`              | 未知错误             |

### 捕获和处理错误

```typescript
import { sdk, GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk'

try {
  const { me } = await sdk.api.GetMe()
  console.log('用户信息:', me)
} catch (error) {
  if (error instanceof GraphQLSDKError) {
    // 获取错误详情
    console.error('错误类型:', error.type)
    console.error('错误码:', error.code)
    console.error('HTTP 状态码:', error.statusCode)
    console.error('错误详情:', error.details)
    console.error('时间戳:', error.timestamp)

    // 获取国际化错误消息（中文）
    const zhMessage = error.toUserMessage('zh')
    console.error('中文错误消息:', zhMessage)

    // 获取国际化错误消息（英文）
    const enMessage = error.toUserMessage('en')
    console.error('英文错误消息:', enMessage)

    // 根据错误类型执行不同的处理逻辑
    switch (error.type) {
      case GraphQLErrorType.AUTHENTICATION_ERROR:
        // 跳转到登录页
        window.location.href = '/login'
        break

      case GraphQLErrorType.AUTHORIZATION_ERROR:
        // 显示权限不足提示
        alert(error.toUserMessage('zh'))
        break

      case GraphQLErrorType.NETWORK_ERROR:
        // 显示网络错误提示
        alert('网络连接失败，请检查网络设置')
        break

      case GraphQLErrorType.RATE_LIMIT_ERROR:
        // 显示请求频率限制提示
        alert('请求过于频繁，请稍后再试')
        break

      default:
        // 显示通用错误提示
        alert(error.toUserMessage('zh'))
    }

    // 记录错误日志（JSON 格式）
    console.error('错误日志:', error.toJSON())
  } else {
    // 非 GraphQL SDK 错误
    console.error('未知错误:', error)
  }
}
```

### 在 React 组件中处理错误

```typescript
import { useState } from 'react'
import { sdk, GraphQLSDKError } from '@/lib/graphql/sdk'

function BlogList() {
  const [error, setError] = useState<GraphQLSDKError | null>(null)
  const [posts, setPosts] = useState([])

  const fetchPosts = async () => {
    try {
      const { blogPosts } = await sdk.api.GetPublishedBlogPosts({ limit: 10 })
      setPosts(blogPosts || [])
      setError(null)
    } catch (err) {
      if (err instanceof GraphQLSDKError) {
        setError(err)
      }
    }
  }

  return (
    <div>
      {error && (
        <div className="error-message">
          <p>错误码: {error.code}</p>
          <p>{error.toUserMessage('zh')}</p>
          <button onClick={fetchPosts}>重试</button>
        </div>
      )}
      {/* 文章列表 */}
    </div>
  )
}
```

---

## React Hooks

### 查询 Hooks

#### `useGraphQLQuery` - 通用查询 Hook

```typescript
import { useGraphQLQuery } from '@/lib/graphql/sdk'
import { GetMeDocument } from '@/lib/graphql/generated/documents'

function CurrentUserProfile() {
  const { data, loading, error, refetch } = useGraphQLQuery(GetMeDocument, {
    variables: {},
    enabled: true, // 立即执行查询
  })

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <div>
      <h2>{data?.me?.displayName}</h2>
      <p>{data?.me?.email}</p>
      <button onClick={refetch}>刷新</button>
    </div>
  )
}
```

#### `useCurrentUser` - 获取当前用户

```typescript
import { useCurrentUser } from '@/lib/graphql/sdk'

function UserInfo() {
  const { data, loading, error } = useCurrentUser()

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return <div>欢迎, {data?.displayName}!</div>
}
```

#### `useBlogPosts` - 获取博客文章列表

```typescript
import { useBlogPosts } from '@/lib/graphql/sdk'

function BlogList() {
  const { data, loading, error, refetch } = useBlogPosts({
    status: 'published',
    limit: 10,
  })

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <div>
      {data?.map(post => (
        <article key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </article>
      ))}
      <button onClick={refetch}>刷新</button>
    </div>
  )
}
```

### 变更 Hooks

#### `useGraphQLMutation` - 通用变更 Hook

```typescript
import { useGraphQLMutation } from '@/lib/graphql/sdk'
import { TestEchoDocument } from '@/lib/graphql/generated/documents'

function EchoTest() {
  const { mutate, loading, error } = useGraphQLMutation(TestEchoDocument)

  const handleEcho = async () => {
    const result = await mutate({ message: 'Hello!' })
    console.log('Echo 响应:', result?.testEcho)
  }

  return (
    <div>
      <button onClick={handleEcho} disabled={loading}>
        {loading ? '发送中...' : '发送 Echo'}
      </button>
      {error && <p>错误: {error.message}</p>}
    </div>
  )
}
```

#### `useEchoMutation` - Echo 测试变更

```typescript
import { useEchoMutation } from '@/lib/graphql/sdk'

function EchoButton() {
  const { mutate, loading } = useEchoMutation()

  const handleClick = async () => {
    const result = await mutate({ message: 'Test' })
    alert(result?.testEcho)
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      测试 Echo
    </button>
  )
}
```

---

## 高级用法

### 自定义 SDK 配置

```typescript
import { createGraphQLSDK } from '@/lib/graphql/sdk'

const customSDK = createGraphQLSDK({
  endpoint: 'https://api.example.com/graphql',
  token: 'your-auth-token',
  headers: {
    'X-Custom-Header': 'value',
  },
  enableLogging: true,
  retries: 3,
  retryDelay: 1000,
})

// 使用自定义 SDK
const { me } = await customSDK.api.GetMe()
```

### 设置认证 Token

```typescript
import { sdk } from '@/lib/graphql/sdk'

// 设置 token
sdk.setToken('your-auth-token')

// 清除 token
sdk.setToken(null)
```

### 设置自定义请求头

```typescript
sdk.setHeaders({
  'X-Custom-Header': 'value',
  'X-Request-ID': '123',
})
```

### 执行原始 GraphQL 请求

```typescript
import { sdk } from '@/lib/graphql/sdk'
import { gql } from 'graphql-request'

const query = gql`
  query CustomQuery {
    me {
      id
      email
    }
  }
`

const result = await sdk.request(query)
console.log(result)
```

---

## 文件结构

```
lib/graphql/
├── schema.ts                    # Pothos GraphQL Schema 定义
├── queries/                     # GraphQL 查询文件
│   ├── 01-basic-queries.graphql
│   ├── 02-user-queries.graphql
│   ├── 03-blog-queries.graphql
│   ├── 04-cursor-pagination.graphql
│   ├── 05-mutations.graphql
│   ├── 06-advanced-examples.graphql
│   └── 07-subscriptions.graphql # Week 8 新增
├── generated/                   # 自动生成的 TypeScript 代码
│   ├── types.ts                 # GraphQL 类型定义
│   └── documents.ts             # Typed Document Nodes
├── sdk/                         # SDK 核心代码
│   ├── client.ts                # GraphQL 客户端（增强错误处理）
│   ├── hooks.ts                 # React Hooks（包含 Subscription Hooks）
│   └── index.ts                 # 统一导出
├── codegen.yml                  # GraphQL Code Generator 配置
└── README.md                    # 本文档
```

---

## 开发命令

```bash
# 导出 GraphQL Schema
pnpm export-schema

# 生成 TypeScript 类型
pnpm codegen

# 监听模式（自动生成）
pnpm codegen:watch
```

---

## 技术栈

- **GraphQL 服务端**: [graphql-yoga](https://github.com/dotansimha/graphql-yoga) v5.16.2
- **Schema 构建器**: [Pothos GraphQL](https://pothos-graphql.dev/)
- **GraphQL 客户端**: [graphql-request](https://github.com/jasonkuhrt/graphql-request)
- **类型生成器**: [@graphql-codegen/cli](https://the-guild.dev/graphql/codegen)
- **订阅协议**: Server-Sent Events (SSE)
- **React 支持**: React 18+

---

## 最佳实践

### 1. 使用 Fragment 减少重复代码

```graphql
# ❌ 不推荐：重复定义字段
query GetPosts {
  blogPosts {
    id
    title
    excerpt
    author {
      id
      displayName
      avatarUrl
    }
  }
}

query GetPost {
  blogPost {
    id
    title
    excerpt
    author {
      id
      displayName
      avatarUrl
    }
  }
}

# ✅ 推荐：使用 Fragment
query GetPosts {
  blogPosts {
    ...BlogPostPreview
    author {
      ...UserBasicInfo
    }
  }
}

query GetPost {
  blogPost {
    ...BlogPostPreview
    author {
      ...UserBasicInfo
    }
  }
}
```

### 2. 正确处理错误

```typescript
// ❌ 不推荐：不处理错误
const { me } = await sdk.api.GetMe()

// ✅ 推荐：捕获并处理错误
try {
  const { me } = await sdk.api.GetMe()
  // 处理成功响应
} catch (error) {
  if (error instanceof GraphQLSDKError) {
    // 显示用户友好的错误消息
    alert(error.toUserMessage('zh'))
  }
}
```

### 3. 使用 TypeScript 类型

```typescript
// ❌ 不推荐：不使用类型
function UserCard({ user }: any) {
  return <div>{user.displayName}</div>
}

// ✅ 推荐：使用 Fragment 类型
import type { UserBasicInfoFragment } from '@/lib/graphql/sdk'

function UserCard({ user }: { user: UserBasicInfoFragment }) {
  return <div>{user.displayName}</div>
}
```

### 4. 订阅时使用自动重连

```typescript
// ❌ 不推荐：不自动重连
const { data } = useNewBlogPost({ autoReconnect: false })

// ✅ 推荐：启用自动重连
const { data } = useNewBlogPost({
  autoReconnect: true,
  reconnectDelay: 3000,
})
```

---

## 常见问题

### Q1: 如何更新 GraphQL Schema？

1. 修改 `lib/graphql/schema.ts`
2. 运行 `pnpm export-schema`
3. 运行 `pnpm codegen`

### Q2: 如何添加新的查询或变更？

1. 在 `lib/graphql/queries/` 中创建 `.graphql` 文件
2. 定义查询或变更
3. 运行 `pnpm codegen`
4. 在代码中导入并使用生成的 Document

### Q3: Subscription 连接失败怎么办？

- 检查 GraphQL 服务端是否支持 SSE
- 确认 `graphql-yoga` 版本 >= 5.0
- 检查浏览器是否支持 EventSource API
- 查看浏览器控制台的网络请求

### Q4: 如何切换错误消息语言？

```typescript
// 中文错误消息
const zhMessage = error.toUserMessage('zh')

// 英文错误消息
const enMessage = error.toUserMessage('en')
```

### Q5: 如何调试 GraphQL 请求？

```typescript
// 启用日志记录
const sdk = createGraphQLSDK({
  endpoint: '/api/graphql',
  enableLogging: true, // 在控制台打印请求和响应
})
```

---

## 更新日志

### Week 8 (2025-11-29)

#### ✨ 新增功能

- **GraphQL Subscriptions 支持**
  - 添加 `Subscription` 根类型
  - 实现 `newBlogPost` 和 `currentTime` 订阅
  - 使用 Server-Sent Events (SSE) 协议
  - 提供 `useGraphQLSubscription`, `useNewBlogPost`, `useCurrentTime` React Hooks
  - 支持自动重连和错误处理

- **Fragment 复用优化**
  - 新增 `UserDetailInfo` Fragment（完整用户信息）
  - 新增 `BlogPostDetail` Fragment（完整博客详情）
  - 增强 `BlogPostPreview` Fragment（添加 slug 和统计字段）
  - 保持 `UserBasicInfo` Fragment 不变

- **错误处理增强**
  - 扩展错误类型从 7 个到 15 个
  - 标准化错误码格式（ERR_XXX_YYY）
  - 新增错误详情字段（code, details, timestamp）
  - 实现 `toUserMessage(locale)` 方法支持中英双语
  - 优化错误检测逻辑（HTTP 状态码、GraphQL 错误消息）

#### 🔧 技术优化

- 改进 `GraphQLSDKError` 构造函数（使用 options 对象）
- 添加 `toJSON()` 方法用于错误日志记录
- 完善错误消息映射表（12 个错误码 + 14 个错误类型）

---

## 参考资料

- [GraphQL 官方文档](https://graphql.org/)
- [graphql-yoga 文档](https://the-guild.dev/graphql/yoga-server/docs)
- [Pothos GraphQL 文档](https://pothos-graphql.dev/)
- [GraphQL Code Generator 文档](https://the-guild.dev/graphql/codegen/docs/getting-started)
- [Server-Sent Events (SSE) 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

**艹！这个README涵盖了所有Week 8的新功能和优化，帮助开发者快速上手GraphQL SDK！**
