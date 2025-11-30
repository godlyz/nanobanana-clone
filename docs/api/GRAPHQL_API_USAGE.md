# GraphQL API 使用指南

> **作者**: 老王（暴躁技术流）
> **最后更新**: 2025-11-29
> **API 版本**: v1.0
> **GraphQL Endpoint**: `/api/graphql`

---

## 📋 目录

1. [快速开始](#快速开始)
2. [认证方式](#认证方式)
3. [常用查询模式](#常用查询模式)
4. [常用 Mutation 操作](#常用-mutation-操作)
5. [订阅（Subscriptions）](#订阅subscriptions)
6. [错误处理](#错误处理)
7. [Rate Limiting 说明](#rate-limiting-说明)
8. [最佳实践](#最佳实践)
9. [代码示例](#代码示例)

---

## 快速开始

### GraphQL Playground（开发环境）

**访问地址**: `http://localhost:3000/graphql-playground`

**特性**:
- ✅ 交互式查询编辑器
- ✅ 自动补全和语法高亮
- ✅ Schema 文档浏览器
- ✅ 历史查询记录

**测试查询（Hello World）**:

```graphql
query HelloWorld {
  hello
  currentTime
}
```

**预期响应**:

```json
{
  "data": {
    "hello": "艹！老王的 GraphQL API 欢迎你！",
    "currentTime": "2025-11-29T12:00:00.000Z"
  }
}
```

---

## 认证方式

GraphQL API 使用 **Supabase Auth** 进行认证，支持以下两种方式：

### 1. Session Cookie（推荐方式）

前端登录后，Supabase 会自动设置 `httpOnly` cookie，GraphQL 请求会自动携带该 cookie。

**JavaScript 示例**:

```javascript
// 使用 fetch API（浏览器环境）
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 重要：携带 cookies
  body: JSON.stringify({
    query: `
      query GetCurrentUser {
        me {
          id
          email
          user_profile {
            username
            display_name
          }
        }
      }
    `
  })
})

const { data, errors } = await response.json()
```

### 2. Authorization Header

适用于服务端或 API 客户端。

**cURL 示例**:

```bash
curl -X POST https://your-domain.com/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "query": "{ me { id email } }"
  }'
```

**JavaScript 示例**:

```javascript
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`, // Supabase access token
  },
  body: JSON.stringify({
    query: `{ me { id email } }`
  })
})
```

**Python 示例**:

```python
import requests

url = 'https://your-domain.com/api/graphql'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {access_token}'
}
query = '''
query GetCurrentUser {
  me {
    id
    email
  }
}
'''

response = requests.post(url, json={'query': query}, headers=headers)
data = response.json()
```

---

## 常用查询模式

### 1. 获取当前登录用户信息

```graphql
query GetCurrentUser {
  me {
    id
    email
    user_profile {
      username
      display_name
      bio
      avatar_url
      followers_count
      following_count
    }
  }
}
```

**响应示例**:

```json
{
  "data": {
    "me": {
      "id": "user-uuid-123",
      "email": "user@example.com",
      "user_profile": {
        "username": "laowang",
        "display_name": "老王",
        "bio": "披着文化外衣的痞子流氓，专业代码修复工",
        "avatar_url": "https://example.com/avatar.jpg",
        "followers_count": 100,
        "following_count": 50
      }
    }
  }
}
```

### 2. 博客文章列表（含作者信息）

```graphql
query GetBlogPosts {
  blogPosts(status: "published", limit: 10, offset: 0) {
    id
    title
    excerpt
    featured_image_url
    created_at
    updated_at
    view_count
    like_count
    author {
      id
      user_profile {
        username
        display_name
        avatar_url
      }
    }
  }
}
```

**JavaScript 完整示例**:

```javascript
async function fetchBlogPosts() {
  const query = `
    query GetBlogPosts($status: String!, $limit: Int!, $offset: Int!) {
      blogPosts(status: $status, limit: $limit, offset: $offset) {
        id
        title
        excerpt
        featured_image_url
        created_at
        author {
          user_profile {
            username
            display_name
          }
        }
      }
    }
  `

  const variables = {
    status: 'published',
    limit: 10,
    offset: 0
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables })
  })

  const { data, errors } = await response.json()

  if (errors) {
    console.error('GraphQL Errors:', errors)
    return null
  }

  return data.blogPosts
}
```

### 3. 单个博客文章详情（含评论）

```graphql
query GetBlogPost($id: ID!) {
  blogPost(id: $id) {
    id
    title
    content
    excerpt
    featured_image_url
    created_at
    view_count
    like_count
    author {
      id
      user_profile {
        username
        display_name
        avatar_url
      }
    }
  }

  comments(targetId: $id, targetType: "blog_post", limit: 20) {
    id
    content
    created_at
    author {
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

### 4. 论坛主题列表（含投票统计）

```graphql
query GetForumThreads {
  forumThreads(
    categoryId: "general",
    limit: 20,
    offset: 0,
    sortBy: "hot"
  ) {
    id
    title
    content
    is_pinned
    is_featured
    upvote_count
    downvote_count
    reply_count
    created_at
    author {
      id
      user_profile {
        username
        display_name
        avatar_url
      }
    }
  }
}
```

### 5. 排行榜查询

```graphql
query GetLeaderboard {
  leaderboard(timeframe: "weekly", limit: 10) {
    rank
    user {
      id
      user_profile {
        username
        display_name
        avatar_url
      }
    }
    total_points
    achievements_count
  }
}
```

---

## 常用 Mutation 操作

### 1. 创建博客文章

```graphql
mutation CreateBlogPost($input: CreateBlogPostInput!) {
  createBlogPost(input: $input) {
    id
    title
    slug
    status
    created_at
  }
}
```

**Variables**:

```json
{
  "input": {
    "title": "我的第一篇博客",
    "content": "这是我的第一篇博客内容...",
    "excerpt": "简短摘要",
    "status": "draft",
    "featured_image_url": "https://example.com/image.jpg"
  }
}
```

**JavaScript 完整示例**:

```javascript
async function createBlogPost(postData) {
  const mutation = `
    mutation CreateBlogPost($input: CreateBlogPostInput!) {
      createBlogPost(input: $input) {
        id
        title
        slug
        status
        created_at
      }
    }
  `

  const variables = {
    input: {
      title: postData.title,
      content: postData.content,
      excerpt: postData.excerpt,
      status: 'draft',
      featured_image_url: postData.image
    }
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // 需要认证
    body: JSON.stringify({ mutation, variables })
  })

  const { data, errors } = await response.json()

  if (errors) {
    console.error('Failed to create post:', errors)
    return null
  }

  return data.createBlogPost
}
```

### 2. 更新博客文章

```graphql
mutation UpdateBlogPost($id: ID!, $input: UpdateBlogPostInput!) {
  updateBlogPost(id: $id, input: $input) {
    id
    title
    status
    updated_at
  }
}
```

**Variables**:

```json
{
  "id": "post-uuid-123",
  "input": {
    "title": "更新后的标题",
    "status": "published"
  }
}
```

### 3. 点赞操作

```graphql
# 点赞
mutation LikePost($targetId: ID!, $targetType: String!) {
  createLike(input: {
    targetId: $targetId,
    targetType: $targetType
  }) {
    id
    created_at
  }
}

# 取消点赞
mutation UnlikePost($targetId: ID!, $targetType: String!) {
  deleteLike(input: {
    targetId: $targetId,
    targetType: $targetType
  })
}
```

**JavaScript 示例**:

```javascript
// 点赞
async function likePost(postId) {
  const mutation = `
    mutation LikePost($targetId: ID!, $targetType: String!) {
      createLike(input: {
        targetId: $targetId,
        targetType: $targetType
      }) {
        id
        created_at
      }
    }
  `

  const variables = {
    targetId: postId,
    targetType: 'blog_post'
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query: mutation, variables })
  })

  return response.json()
}

// 取消点赞
async function unlikePost(postId) {
  const mutation = `
    mutation UnlikePost($targetId: ID!, $targetType: String!) {
      deleteLike(input: {
        targetId: $targetId,
        targetType: $targetType
      })
    }
  `

  const variables = {
    targetId: postId,
    targetType: 'blog_post'
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query: mutation, variables })
  })

  return response.json()
}
```

### 4. 关注/取消关注用户

```graphql
# 关注用户
mutation FollowUser($userId: ID!) {
  createFollow(input: {
    followingId: $userId
  }) {
    id
    created_at
  }
}

# 取消关注
mutation UnfollowUser($userId: ID!) {
  deleteFollow(input: {
    followingId: $userId
  })
}
```

### 5. 创建评论

```graphql
mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) {
    id
    content
    created_at
    author {
      user_profile {
        username
      }
    }
  }
}
```

**Variables**:

```json
{
  "input": {
    "targetId": "post-uuid-123",
    "targetType": "blog_post",
    "content": "这篇文章写得真好！"
  }
}
```

### 6. 创建论坛主题

```graphql
mutation CreateForumThread($input: CreateForumThreadInput!) {
  createForumThread(input: $input) {
    id
    title
    slug
    created_at
  }
}
```

**Variables**:

```json
{
  "input": {
    "categoryId": "general",
    "title": "如何使用 GraphQL API？",
    "content": "请问 GraphQL API 的最佳实践是什么？",
    "tags": ["graphql", "api", "best-practice"]
  }
}
```

### 7. 论坛投票

```graphql
# 投票（赞成票 vote_type: 1, 反对票 vote_type: -1）
mutation VoteThread($input: CreateForumVoteInput!) {
  createForumVote(input: $input) {
    id
    vote_type
    created_at
  }
}
```

**Variables**:

```json
{
  "input": {
    "threadId": "thread-uuid-123",
    "voteType": 1
  }
}
```

---

## 订阅（Subscriptions）

### 1. 订阅新博客文章

```graphql
subscription OnNewBlogPost {
  newBlogPost {
    id
    title
    excerpt
    created_at
    author {
      user_profile {
        username
      }
    }
  }
}
```

**JavaScript WebSocket 示例**:

```javascript
import { createClient } from 'graphql-ws'

const wsClient = createClient({
  url: 'wss://your-domain.com/api/graphql',
  connectionParams: {
    authorization: `Bearer ${accessToken}`
  }
})

// 订阅新博客文章
const unsubscribe = wsClient.subscribe(
  {
    query: `
      subscription OnNewBlogPost {
        newBlogPost {
          id
          title
          author {
            user_profile {
              username
            }
          }
        }
      }
    `
  },
  {
    next: (data) => {
      console.log('新博客文章发布:', data)
    },
    error: (error) => {
      console.error('订阅错误:', error)
    },
    complete: () => {
      console.log('订阅完成')
    }
  }
)

// 取消订阅
// unsubscribe()
```

### 2. 实时时间更新（测试用）

```graphql
subscription CurrentTime {
  currentTime
}
```

---

## 错误处理

### 错误响应格式

GraphQL 错误遵循标准格式：

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded. You are limited to 100 requests per minute.",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["me"],
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED"
      }
    }
  ],
  "data": null
}
```

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|-------|------|---------|
| `UNAUTHENTICATED` | 未登录或 token 过期 | 重新登录获取新 token |
| `FORBIDDEN` | 无权限访问资源 | 检查用户权限或资源所有权 |
| `RATE_LIMIT_EXCEEDED` | 超出请求速率限制 | 等待 60 秒或升级订阅层级 |
| `QUERY_TOO_COMPLEX` | 查询复杂度超限 | 简化查询，减少嵌套层级 |
| `BAD_USER_INPUT` | 输入参数验证失败 | 检查参数类型和格式 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 联系技术支持 |

### JavaScript 错误处理最佳实践

```javascript
async function safeGraphQLRequest(query, variables = {}) {
  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const { data, errors } = await response.json()

    if (errors) {
      // 处理 GraphQL 错误
      const firstError = errors[0]

      switch (firstError.extensions?.code) {
        case 'UNAUTHENTICATED':
          console.error('用户未登录，跳转到登录页')
          window.location.href = '/login'
          break

        case 'RATE_LIMIT_EXCEEDED':
          console.error('请求过于频繁，请稍后再试')
          alert('请求过于频繁，请等待 60 秒')
          break

        case 'FORBIDDEN':
          console.error('无权限访问该资源')
          alert('您没有权限执行此操作')
          break

        default:
          console.error('GraphQL Error:', firstError.message)
          alert(`错误: ${firstError.message}`)
      }

      return null
    }

    return data
  } catch (error) {
    console.error('Network Error:', error)
    alert('网络错误，请检查网络连接')
    return null
  }
}
```

---

## Rate Limiting 说明

### 订阅层级速率限制

| 订阅层级 | 每分钟请求数 | 最大查询复杂度 | 适用场景 |
|---------|------------|--------------|---------|
| Free    | 100        | 1000         | 个人博客、小型应用 |
| Basic   | 500        | 1000         | 中型应用、团队协作 |
| Pro     | 1000       | 1000         | 商业应用、高流量 |
| Max     | 10000      | 1000         | 企业级应用、API 集成 |

### 如何避免 Rate Limiting

**1. 使用查询批处理（Batching）**:

```graphql
# ❌ 错误：多次单独查询
query GetPost1 { blogPost(id: "1") { title } }
query GetPost2 { blogPost(id: "2") { title } }
query GetPost3 { blogPost(id: "3") { title } }

# ✅ 正确：批量查询（使用别名）
query GetMultiplePosts {
  post1: blogPost(id: "1") { title }
  post2: blogPost(id: "2") { title }
  post3: blogPost(id: "3") { title }
}
```

**2. 使用字段选择（避免过度查询）**:

```graphql
# ❌ 错误：查询所有字段
query GetBlogPosts {
  blogPosts(limit: 10) {
    id
    title
    content          # 大字段，可能不需要
    excerpt
    featured_image_url
    created_at
    updated_at
    view_count
    like_count
    comment_count
    author {
      id
      email
      user_profile {
        username
        display_name
        bio
        avatar_url
        followers_count
        following_count
      }
    }
  }
}

# ✅ 正确：只查询需要的字段
query GetBlogPosts {
  blogPosts(limit: 10) {
    id
    title
    excerpt
    created_at
    author {
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

**3. 使用客户端缓存**:

```javascript
// 使用 Apollo Client 缓存
import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          blogPosts: {
            // 缓存策略：先返回缓存，后台刷新
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            }
          }
        }
      }
    }
  })
})
```

**4. 监控 Rate Limit 响应头**:

```javascript
async function fetchWithRateLimitMonitoring(query, variables) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables })
  })

  // 检查剩余请求次数（如果 API 提供）
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const reset = response.headers.get('X-RateLimit-Reset')

  if (remaining && parseInt(remaining) < 10) {
    console.warn(`⚠️ 剩余请求次数: ${remaining}，重置时间: ${new Date(parseInt(reset) * 1000)}`)
  }

  return response.json()
}
```

---

## 最佳实践

### 1. 使用 Fragments 提高可维护性

```graphql
# 定义 Fragment
fragment UserBasicInfo on User {
  id
  user_profile {
    username
    display_name
    avatar_url
  }
}

# 在多个查询中复用
query GetBlogPosts {
  blogPosts(limit: 10) {
    id
    title
    author {
      ...UserBasicInfo
    }
  }
}

query GetForumThreads {
  forumThreads(limit: 10) {
    id
    title
    author {
      ...UserBasicInfo
    }
  }
}
```

### 2. 使用 Variables 避免字符串拼接

```javascript
// ❌ 错误：字符串拼接（SQL 注入风险）
const query = `
  query {
    user(id: "${userId}") {
      email
    }
  }
`

// ✅ 正确：使用 Variables
const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      email
    }
  }
`

const variables = { id: userId }
```

### 3. 优化查询性能

```graphql
# ❌ 错误：N+1 查询问题
query GetBlogPosts {
  blogPosts(limit: 100) {
    id
    title
    author {        # 每个 post 都会触发一次数据库查询
      user_profile {
        username
      }
    }
  }
}

# ✅ 正确：使用 DataLoader（已内置）
# GraphQL API 已经使用 DataLoader 自动优化
# 100 个 post 只会触发 2-3 次数据库查询
```

### 4. 错误处理策略

```javascript
// 使用 try-catch + 错误分类
async function robustGraphQLRequest(query, variables) {
  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables })
    })

    const { data, errors } = await response.json()

    if (errors) {
      // 分类处理
      const authErrors = errors.filter(e => e.extensions?.code === 'UNAUTHENTICATED')
      const validationErrors = errors.filter(e => e.extensions?.code === 'BAD_USER_INPUT')
      const rateLimitErrors = errors.filter(e => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')

      if (authErrors.length > 0) {
        // 认证错误 -> 跳转登录页
        window.location.href = '/login'
        return null
      }

      if (validationErrors.length > 0) {
        // 验证错误 -> 显示表单错误
        return { errors: validationErrors, data: null }
      }

      if (rateLimitErrors.length > 0) {
        // 速率限制 -> 延迟重试
        await new Promise(resolve => setTimeout(resolve, 60000))
        return robustGraphQLRequest(query, variables) // 递归重试
      }

      // 其他错误
      console.error('GraphQL Errors:', errors)
      return { errors, data: null }
    }

    return { data, errors: null }
  } catch (error) {
    console.error('Network Error:', error)
    throw error
  }
}
```

### 5. 分页查询模式

```graphql
# Offset-based 分页（简单场景）
query GetBlogPosts($limit: Int!, $offset: Int!) {
  blogPosts(limit: $limit, offset: $offset) {
    id
    title
  }
}

# Variables:
# { "limit": 20, "offset": 0 }  # 第 1 页
# { "limit": 20, "offset": 20 } # 第 2 页
```

```javascript
// JavaScript 分页实现
async function fetchBlogPostsPage(page, pageSize = 20) {
  const offset = (page - 1) * pageSize

  const query = `
    query GetBlogPosts($limit: Int!, $offset: Int!) {
      blogPosts(limit: $limit, offset: $offset) {
        id
        title
        excerpt
        created_at
      }
    }
  `

  const variables = { limit: pageSize, offset }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables })
  })

  const { data } = await response.json()
  return data.blogPosts
}

// 使用示例
const page1 = await fetchBlogPostsPage(1)  // 第 1 页
const page2 = await fetchBlogPostsPage(2)  // 第 2 页
```

---

## 代码示例

### React 完整示例（使用 Apollo Client）

```javascript
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, useMutation, gql } from '@apollo/client'

// 1. 创建 Apollo Client
const client = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
  credentials: 'include', // 携带 cookies
})

// 2. 定义 GraphQL Queries
const GET_BLOG_POSTS = gql`
  query GetBlogPosts($limit: Int!, $offset: Int!) {
    blogPosts(limit: $limit, offset: $offset, status: "published") {
      id
      title
      excerpt
      featured_image_url
      created_at
      author {
        user_profile {
          username
          display_name
          avatar_url
        }
      }
    }
  }
`

const CREATE_BLOG_POST = gql`
  mutation CreateBlogPost($input: CreateBlogPostInput!) {
    createBlogPost(input: $input) {
      id
      title
      slug
      status
    }
  }
`

// 3. React 组件：博客列表
function BlogPostList() {
  const { loading, error, data, fetchMore } = useQuery(GET_BLOG_POSTS, {
    variables: { limit: 10, offset: 0 }
  })

  if (loading) return <p>加载中...</p>
  if (error) return <p>错误: {error.message}</p>

  return (
    <div>
      <h1>博客文章列表</h1>
      {data.blogPosts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <small>作者: {post.author.user_profile.display_name}</small>
        </article>
      ))}

      <button onClick={() => fetchMore({
        variables: { offset: data.blogPosts.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            ...prev,
            blogPosts: [...prev.blogPosts, ...fetchMoreResult.blogPosts]
          }
        }
      })}>
        加载更多
      </button>
    </div>
  )
}

// 4. React 组件：创建博客文章
function CreateBlogPostForm() {
  const [createPost, { loading, error }] = useMutation(CREATE_BLOG_POST, {
    // 创建成功后刷新列表
    refetchQueries: [{ query: GET_BLOG_POSTS, variables: { limit: 10, offset: 0 } }]
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    try {
      await createPost({
        variables: {
          input: {
            title: formData.get('title'),
            content: formData.get('content'),
            excerpt: formData.get('excerpt'),
            status: 'draft'
          }
        }
      })
      alert('博客文章创建成功！')
    } catch (err) {
      console.error('创建失败:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="标题" required />
      <textarea name="content" placeholder="内容" required />
      <input name="excerpt" placeholder="摘要" />
      <button type="submit" disabled={loading}>
        {loading ? '创建中...' : '创建博客'}
      </button>
      {error && <p>错误: {error.message}</p>}
    </form>
  )
}

// 5. App 组件
function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <CreateBlogPostForm />
        <BlogPostList />
      </div>
    </ApolloProvider>
  )
}

export default App
```

### Python 完整示例（使用 gql 库）

```python
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport

# 1. 创建 GraphQL Client
transport = RequestsHTTPTransport(
    url='https://your-domain.com/api/graphql',
    headers={
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
    }
)

client = Client(transport=transport, fetch_schema_from_transport=True)

# 2. 查询博客文章
query = gql('''
query GetBlogPosts($limit: Int!, $offset: Int!) {
  blogPosts(limit: $limit, offset: $offset, status: "published") {
    id
    title
    excerpt
    created_at
    author {
      user_profile {
        username
        display_name
      }
    }
  }
}
''')

variables = {"limit": 10, "offset": 0}
result = client.execute(query, variable_values=variables)

print(f"获取到 {len(result['blogPosts'])} 篇博客文章")
for post in result['blogPosts']:
    print(f"- {post['title']} (作者: {post['author']['user_profile']['display_name']})")

# 3. 创建博客文章
mutation = gql('''
mutation CreateBlogPost($input: CreateBlogPostInput!) {
  createBlogPost(input: $input) {
    id
    title
    slug
    status
  }
}
''')

variables = {
    "input": {
        "title": "我的第一篇博客",
        "content": "这是我的第一篇博客内容...",
        "excerpt": "简短摘要",
        "status": "draft"
    }
}

result = client.execute(mutation, variable_values=variables)
print(f"博客文章创建成功！ID: {result['createBlogPost']['id']}")
```

---

## 附录：完整 Schema 参考

### Queries (12 个)

| Query | 参数 | 返回类型 | 说明 |
|-------|------|---------|------|
| `hello` | - | `String!` | 测试查询 |
| `currentTime` | - | `String!` | 服务器当前时间 |
| `me` | - | `User` | 当前登录用户 |
| `user` | `id: ID!` | `User` | 根据 ID 获取用户 |
| `blogPosts` | `status: String, limit: Int, offset: Int` | `[BlogPost!]!` | 博客文章列表 |
| `blogPost` | `id: ID!` | `BlogPost` | 单个博客文章 |
| `forumThreads` | `categoryId: ID, limit: Int, offset: Int, sortBy: String` | `[ForumThread!]!` | 论坛主题列表 |
| `forumThread` | `id: ID!` | `ForumThread` | 单个论坛主题 |
| `forumReplies` | `threadId: ID!, limit: Int, offset: Int` | `[ForumReply!]!` | 论坛回复列表 |
| `comments` | `targetId: ID!, targetType: String!, limit: Int, offset: Int` | `[Comment!]!` | 评论列表 |
| `artworks` | `artworkType: String!, limit: Int, offset: Int` | `[Artwork!]!` | 作品列表 |
| `leaderboard` | `timeframe: String!, limit: Int` | `[LeaderboardEntry!]!` | 排行榜 |

### Mutations (14 个)

| Mutation | 参数 | 返回类型 | 说明 |
|----------|------|---------|------|
| `echo` | `message: String!` | `String!` | 测试 Mutation |
| `createBlogPost` | `input: CreateBlogPostInput!` | `BlogPost!` | 创建博客文章 |
| `updateBlogPost` | `id: ID!, input: UpdateBlogPostInput!` | `BlogPost!` | 更新博客文章 |
| `deleteBlogPost` | `id: ID!` | `Boolean!` | 删除博客文章 |
| `createComment` | `input: CreateCommentInput!` | `Comment!` | 创建评论 |
| `createLike` | `input: CreateLikeInput!` | `Like!` | 点赞 |
| `deleteLike` | `input: DeleteLikeInput!` | `Boolean!` | 取消点赞 |
| `createFollow` | `input: CreateFollowInput!` | `Follow!` | 关注用户 |
| `deleteFollow` | `input: DeleteFollowInput!` | `Boolean!` | 取消关注 |
| `createForumThread` | `input: CreateForumThreadInput!` | `ForumThread!` | 创建论坛主题 |
| `createForumReply` | `input: CreateForumReplyInput!` | `ForumReply!` | 创建论坛回复 |
| `createForumVote` | `input: CreateForumVoteInput!` | `ForumVote!` | 投票 |
| `updateForumVote` | `id: ID!, input: UpdateForumVoteInput!` | `ForumVote!` | 更新投票 |
| `deleteForumVote` | `id: ID!` | `Boolean!` | 删除投票 |

### Subscriptions (2 个)

| Subscription | 参数 | 返回类型 | 说明 |
|-------------|------|---------|------|
| `newBlogPost` | - | `BlogPost!` | 订阅新博客文章 |
| `currentTime` | - | `String!` | 实时时间更新（测试用） |

---

## 相关文档

- [GraphQL Week 32 Day 1-2 Schema Design Report](../GRAPHQL_WEEK32_DAY1-2_SCHEMA_DESIGN_REPORT.md)
- [GraphQL Week 32 Day 3-4 Query & Mutation Report](../GRAPHQL_WEEK32_DAY3-4_QUERY_MUTATION_REPORT.md)
- [GraphQL Week 32 Day 5-6 Testing Report](../GRAPHQL_WEEK32_DAY5-6_TESTING_REPORT.md)
- [ADR-004: GraphQL API Implementation](../docs/adr/20251128-graphql-api-implementation.md)
- [PROJECTWIKI.md - Section 6.8 GraphQL API](../PROJECTWIKI.md#68-graphql-api)

---

**💬 联系支持**: 如有问题，请提交 Issue 或联系技术支持团队。

**📝 文档维护**: 本文档由老王（暴躁技术流）编写，遵循 KISS/DRY/SOLID 原则！艹，代码和文档都得规范！
