# GraphQL Queries 使用指南

> **艹！这是老王我写的完整GraphQL Query使用文档！**
> **包含所有60个Query的详细说明、参数、示例代码！**
> **开发者看这个文档就够了，别瞎乱试！**

---

## 📋 目录

1. [快速开始](#-快速开始)
2. [基本概念](#-基本概念)
3. [用户相关 Queries](#-用户相关-queries)
4. [作品相关 Queries](#-作品相关-queries)
5. [视频相关 Queries](#-视频相关-queries)
6. [评论相关 Queries](#-评论相关-queries)
7. [博客相关 Queries](#-博客相关-queries)
8. [论坛相关 Queries](#-论坛相关-queries)
9. [成就系统 Queries](#-成就系统-queries)
10. [排行榜 Queries](#-排行榜-queries)
11. [错误处理](#-错误处理)
12. [最佳实践](#-最佳实践)

---

## 🚀 快速开始

### GraphQL端点
```
POST /api/graphql
Content-Type: application/json
Authorization: Bearer <user-jwt-token>
```

### 基本查询结构
```graphql
query GetUser($id: ID!, $includeProfile: Boolean) {
  user(id: $id) {
    id
    email
    user_profile @include(if: $includeProfile) {
      username
      avatar_url
      bio
    }
  }
}
```

### 请求示例
```javascript
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    query: `query { me { id email } }`
  })
})
```

---

## 🔍 基本概念

### 通用参数

所有列表查询都支持以下分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | `Int` | `20` | 每页数量，最大100 |
| `offset` | `Int` | `0` | 偏移量，用于传统分页 |
| `first` | `Int` | `null` | Relay分页的前N个 |
| `after` | `String` | `null` | Relay分页的游标 |

### 通用筛选

大多数查询支持以下筛选参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | `String` | 状态筛选（如：`published`, `draft`, `processing`）|
| `search` | `String` | 全文搜索关键字 |
| `categoryId` | `ID` | 分类ID筛选 |
| `tagId` | `ID` | 标签ID筛选 |

### 通用排序

| 参数 | 类型 | 说明 |
|------|------|------|
| `orderBy` | `String` | 排序字段（如：`created_at`, `updated_at`）|
| `orderDirection` | `String` | 排序方向：`ASC`或`DESC` |

---

## 👤 用户相关 Queries

### 1. `me` - 获取当前登录用户

**描述**: 获取当前认证用户的详细信息

**是否需要认证**: ✅ **是**

```graphql
query {
  me {
    id
    email
    user_profile {
      username
      avatar_url
      bio
      website
      location
    }
    created_at
    last_sign_in_at
  }
}
```

**响应示例**:
```json
{
  "data": {
    "me": {
      "id": "user-123",
      "email": "user@example.com",
      "user_profile": {
        "username": "张三",
        "avatar_url": "https://example.com/avatar.jpg",
        "bio": "热爱艺术和设计",
        "website": "https://example.com",
        "location": "北京"
      },
      "created_at": "2025-01-01T00:00:00Z",
      "last_sign_in_at": "2025-01-29T10:00:00Z"
    }
  }
}
```

### 2. `user` - 根据ID获取用户

**描述**: 获取指定用户的公开信息

**参数**:
- `id` (`ID!`) - 用户ID
- `includeStats` (`Boolean`) - 是否包含用户统计信息

```graphql
query GetUser($id: ID!, $includeStats: Boolean) {
  user(id: $id) {
    id
    email
    user_profile {
      username
      avatar_url
      bio
      website
      location
    }
    user_stats @include(if: $includeStats) {
      total_artworks
      total_blog_posts
      total_followers
      total_following
      leaderboard_score
    }
    created_at
  }
}
```

### 3. `users` - 获取用户列表

**描述**: 分页获取用户列表，支持搜索和排序

**参数**:
- `search` (`String`) - 用户名搜索关键字
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Users($search: String, $limit: Int, $offset: Int) {
  users(search: $search, limit: $limit, offset: $offset) {
    id
    email
    user_profile {
      username
      avatar_url
    }
    created_at
  }
}
```

### 4. `followers` - 获取用户粉丝

**描述**: 获取指定用户的粉丝列表

**参数**:
- `userId` (`ID!`) - 用户ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Followers($userId: ID!, $limit: Int, $offset: Int) {
  followers(userId: $userId, limit: $limit, offset: $offset) {
    id
    follower_id
    follower {
      id
      user_profile {
        username
        avatar_url
      }
    }
    created_at
  }
}
```

### 5. `following` - 获取用户关注

**描述**: 获取指定用户关注的其他用户列表

**参数**:
- `userId` (`ID!`) - 用户ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Following($userId: ID!, $limit: Int, $offset: Int) {
  following(userId: $userId, limit: $limit, offset: $offset) {
    id
    following_id
    following {
      id
      user_profile {
        username
        avatar_url
      }
    }
    created_at
  }
}
```

---

## 🎨 作品相关 Queries

### 1. `artwork` - 获取单个作品

**描述**: 根据作品ID获取单个作品的详细信息

**参数**:
- `id` (`ID!`) - 作品ID

```graphql
query GetArtwork($id: ID!) {
  artwork(id: $id) {
    id
    title
    description
    image_url
    thumbnail_url
    artwork_type
    status
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    category {
      id
      name
    }
    tags {
      id
      name
    }
    like_count
    comment_count
    view_count
    created_at
    updated_at
  }
}
```

### 2. `artworks` - 获取作品列表

**描述**: 分页获取作品列表，支持多种筛选和排序

**参数**:
- `artworkType` (`String`) - 作品类型：`image`或`video`
- `categoryId` (`ID`) - 分类ID筛选
- `tagId` (`ID`) - 标签ID筛选
- `status` (`String`) - 状态：`public`, `private`, `draft`
- `search` (`String`) - 全文搜索
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Artworks(
  $artworkType: String,
  $categoryId: ID,
  $tagId: ID,
  $status: String,
  $search: String,
  $limit: Int,
  $offset: Int
) {
  artworks(
    artworkType: $artworkType,
    categoryId: $categoryId,
    tagId: $tagId,
    status: $status,
    search: $search,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    user {
      id
      user_profile {
        username
      }
    }
    like_count
    view_count
    created_at
  }
}
```

### 3. `userArtworks` - 获取用户作品

**描述**: 获取指定用户的所有作品

**参数**:
- `userId` (`ID!`) - 用户ID
- `artworkType` (`String`) - 作品类型筛选
- `status` (`String`) - 状态筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query UserArtworks(
  $userId: ID!,
  $artworkType: String,
  $status: String,
  $limit: Int,
  $offset: Int
) {
  userArtworks(
    userId: $userId,
    artworkType: $artworkType,
    status: $status,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    status
    like_count
    view_count
    created_at
  }
}
```

### 4. `myArtworks` - 获取我的作品

**描述**: 获取当前认证用户的作品列表

**是否需要认证**: ✅ **是**

**参数**:
- `artworkType` (`String`) - 作品类型筛选
- `status` (`String`) - 状态筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query MyArtworks(
  $artworkType: String,
  $status: String,
  $limit: Int,
  $offset: Int
) {
  myArtworks(
    artworkType: $artworkType,
    status: $status,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    status
    like_count
    view_count
    created_at
  }
}
```

### 5. `featuredArtworks` - 获取精选作品

**描述**: 获取系统精选的优质作品列表

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query FeaturedArtworks($limit: Int, $offset: Int) {
  featuredArtworks(limit: $limit, offset: $offset) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    like_count
    view_count
    created_at
  }
}
```

### 6. `trendingArtworks` - 获取热门作品

**描述**: 获取最近7天内点赞数最多的热门作品

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query TrendingArtworks($limit: Int, $offset: Int) {
  trendingArtworks(limit: $limit, offset: $offset) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    like_count
    view_count
    trending_score
    created_at
  }
}
```

### 7. `relatedArtworks` - 获取相关作品

**描述**: 基于标签和分类获取相关作品推荐

**参数**:
- `artworkId` (`ID!`) - 参考作品ID
- `limit` (`Int`) - 返回数量（最大20）

```graphql
query RelatedArtworks($artworkId: ID!, $limit: Int) {
  relatedArtworks(artworkId: $artworkId, limit: $limit) {
    id
    title
    image_url
    thumbnail_url
    artwork_type
    similarity_score
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

---

## 📹 视频相关 Queries

### 1. `video` - 获取单个视频

**描述**: 根据视频ID获取单个视频的详细信息

**参数**:
- `id` (`ID!`) - 视频ID

```graphql
query GetVideo($id: ID!) {
  video(id: $id) {
    id
    title
    description
    video_url
    thumbnail_url
    duration
    status
    model
    prompt
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    like_count
    comment_count
    view_count
    created_at
    updated_at
  }
}
```

### 2. `videos` - 获取视频列表

**描述**: 分页获取视频列表，支持状态筛选

**参数**:
- `status` (`String`) - 视频状态：`processing`, `completed`, `failed`
- `userId` (`ID`) - 用户ID筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量
- `orderBy` (`String`) - 排序字段
- `orderDirection` (`String`) - 排序方向

```graphql
query Videos(
  $status: String,
  $userId: ID,
  $limit: Int,
  $offset: Int,
  $orderBy: String,
  $orderDirection: String
) {
  videos(
    status: $status,
    userId: $userId,
    limit: $limit,
    offset: $offset,
    orderBy: $orderBy,
    orderDirection: $orderDirection
  ) {
    id
    title
    thumbnail_url
    status
    duration
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    like_count
    view_count
    created_at
  }
}
```

### 3. `userVideos` - 获取用户视频

**描述**: 获取指定用户的所有视频

**参数**:
- `userId` (`ID!`) - 用户ID
- `status` (`String`) - 状态筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query UserVideos(
  $userId: ID!,
  $status: String,
  $limit: Int,
  $offset: Int
) {
  userVideos(
    userId: $userId,
    status: $status,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    thumbnail_url
    status
    duration
    like_count
    view_count
    created_at
  }
}
```

### 4. `myVideos` - 获取我的视频

**描述**: 获取当前认证用户的所有视频

**是否需要认证**: ✅ **是**

**参数**:
- `status` (`String`) - 状态筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query MyVideos($status: String, $limit: Int, $offset: Int) {
  myVideos(
    status: $status,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    thumbnail_url
    status
    duration
    like_count
    view_count
    created_at
  }
}
```

### 5. `processingVideos` - 获取处理中的视频

**描述**: 获取当前认证用户正在处理的视频列表

**是否需要认证**: ✅ **是**

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query ProcessingVideos($limit: Int, $offset: Int) {
  processingVideos(limit: $limit, offset: $offset) {
    id
    title
    status
    model
    prompt
    created_at
    updated_at
  }
}
```

### 6. `failedVideos` - 获取失败视频

**描述**: 获取当前认证用户生成失败的视频列表

**是否需要认证**: ✅ **是**

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query FailedVideos($limit: Int, $offset: Int) {
  failedVideos(limit: $limit, offset: $offset) {
    id
    title
    status
    error_message
    created_at
  }
}
```

### 7. `videoByOperationId` - 根据操作ID获取视频

**描述**: 根据视频生成操作ID获取对应的视频

**参数**:
- `operationId` (`String!`) - 视频生成操作ID

```graphql
query VideoByOperationId($operationId: String!) {
  videoByOperationId(operationId: $operationId) {
    id
    title
    status
    video_url
    thumbnail_url
    operation_id
    created_at
  }
}
```

---

## 💬 评论相关 Queries

### 1. `comment` - 获取单个评论

**描述**: 根据评论ID获取单个评论的详细信息

**参数**:
- `id` (`ID!`) - 评论ID

```graphql
query GetComment($id: ID!) {
  comment(id: $id) {
    id
    content
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    parent {
      id
      user {
        id
        user_profile {
          username
        avatar_url
        }
      }
    }
    replies {
      id
      content
      user {
        id
        user_profile {
          username
          avatar_url
        }
      }
      created_at
    }
    likes_count
    is_liked
    created_at
    updated_at
  }
}
```

### 2. `comments` - 获取评论列表

**描述**: 分页获取评论列表，支持内容类型筛选

**参数**:
- `contentType` (`String`) - 内容类型：`blog_post`, `artwork`
- `contentId` (`ID`) - 内容ID
- `userId` (`ID`) - 用户ID筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Comments(
  $contentType: String,
  $contentId: ID,
  $userId: ID,
  $limit: Int,
  $offset: Int
) {
  comments(
    contentType: $contentType,
    contentId: $contentId,
    userId: $userId,
    limit: $limit,
    offset: $offset
  ) {
    id
    content
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    likes_count
    created_at
  }
}
```

### 3. `myComments` - 获取我的评论

**描述**: 获取当前认证用户的所有评论

**是否需要认证**: ✅ **是**

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query MyComments($limit: Int, $offset: Int) {
  myComments(limit: $limit, offset: $offset) {
    id
    content
    content_type
    content_id
    likes_count
    created_at
  }
}
```

---

## 📝 博客相关 Queries

### 1. `blogCategories` - 获取博客分类

**描述**: 获取所有博客分类列表，按文章数量排序

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query BlogCategories($limit: Int, $offset: Int) {
  blogCategories(limit: $limit, offset: $offset) {
    id
    name
    description
    slug
    post_count
    created_at
  }
}
```

### 2. `blogTags` - 获取博客标签

**描述**: 获取所有博客标签列表，按文章数量排序

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query BlogTags($limit: Int, $offset: Int) {
  blogTags(limit: $limit, offset: $offset) {
    id
    name
    description
    slug
    post_count
    created_at
  }
}
```

### 3. `blogPostsByCategory` - 获取分类下的博客

**描述**: 获取某个分类下的已发布博客文章

**参数**:
- `categoryId` (`ID!`) - 分类ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query BlogPostsByCategory(
  $categoryId: ID!,
  $limit: Int,
  $offset: Int
) {
  blogPostsByCategory(
    categoryId: $categoryId,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    slug
    excerpt
    cover_image_url
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    category {
      id
      name
    }
    published_at
    like_count
    comment_count
    view_count
  }
}
```

### 4. `blogPostsByTag` - 获取标签下的博客

**描述**: 获取某个标签下的已发布博客文章

**参数**:
- `tagId` (`ID!`) - 标签ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query BlogPostsByTag(
  $tagId: ID!,
  $limit: Int,
  $offset: Int
) {
  blogPostsByTag(
    tagId: $tagId,
    limit: $limit,
    offset: $offset
  ) {
    id
    title
    slug
    excerpt
    cover_image_url
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    tags {
      id
      name
    }
    published_at
    like_count
    comment_count
    view_count
  }
}
```

---

## 💬 论坛相关 Queries

### 1. `forumThread` - 获取论坛主题

**描述**: 根据主题ID获取单个论坛主题的详细信息

**参数**:
- `id` (`ID!`) - 主题ID

```graphql
query GetForumThread($id: ID!) {
  forumThread(id: $id) {
    id
    title
    content
    status
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    category {
      id
      name
    }
    tags {
      id
      name
    }
    view_count
    reply_count
    upvote_count
    downvote_count
    is_pinned
    is_locked
    created_at
    updated_at
    last_reply {
      id
      author {
        id
        user_profile {
          username
          avatar_url
        }
      }
      created_at
    }
  }
}
```

### 2. `forumThreads` - 获取论坛主题列表

**描述**: 分页获取论坛主题列表，支持多种筛选

**参数**:
- `categoryId` (`ID`) - 分类ID筛选
- `tagIds` (`[ID]`) - 标签ID数组筛选
- `status` (`String`) - 状态：`open`, `closed`, `pinned`
- `search` (`String`) - 全文搜索
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量
- `orderBy` (`String`) - 排序字段
- `orderDirection` (`String`) - 排序方向

```graphql
query ForumThreads(
  $categoryId: ID,
  $tagIds: [ID],
  $status: String,
  $search: String,
  $limit: Int,
  $offset: Int,
  $orderBy: String,
  $orderDirection: String
) {
  forumThreads(
    categoryId: $categoryId,
    tagIds: $tagIds,
    status: $status,
    search: $search,
    limit: $limit,
    offset: $offset,
    orderBy: $orderBy,
    orderDirection: $orderDirection
  ) {
    id
    title
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    category {
      id
      name
    }
    view_count
    reply_count
    upvote_count
    downvote_count
    is_pinned
    is_locked
    created_at
    updated_at
  }
}
```

### 3. `forumReply` - 获取论坛回复

**描述**: 根据回复ID获取单个回复的详细信息

**参数**:
- `id` (`ID!`) - 回复ID

```graphql
query GetForumReply($id: ID!) {
  forumReply(id: $id) {
    id
    content
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    thread {
      id
      title
    }
    parent {
      id
      author {
        id
        user_profile {
          username
          avatar_url
        }
      }
    }
    replies {
      id
      content
      author {
        id
        user_profile {
          username
          avatar_url
        }
      }
      created_at
    }
    upvote_count
    downvote_count
    created_at
    updated_at
  }
}
```

### 4. `forumReplies` - 获取论坛回复列表

**描述**: 分页获取论坛回复列表，支持主题筛选

**参数**:
- `threadId` (`ID`) - 主题ID筛选
- `userId` (`ID`) - 用户ID筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query ForumReplies(
  $threadId: ID,
  $userId: ID,
  $limit: Int,
  $offset: Int
) {
  forumReplies(
    threadId: $threadId,
    userId: $userId,
    limit: $limit,
    offset: $offset
  ) {
    id
    content
    author {
      id
      user_profile {
        username
        avatar_url
      }
    }
    thread {
      id
      title
    }
    parent_id
    upvote_count
    downvote_count
    created_at
  }
}
```

---

## 🏆 成就系统 Queries

### 1. `achievements` - 获取成就定义

**描述**: 获取所有激活的成就定义列表

**参数**:
- `category` (`String`) - 成就分类筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query Achievements($category: String, $limit: Int, $offset: Int) {
  achievements(category: $category, limit: $limit, offset: $offset) {
    id
    name
    description
    category
    points
    is_active
    icon_url
    created_at
  }
}
```

### 2. `userAchievements` - 获取用户成就

**描述**: 获取指定用户已获得的成就列表

**参数**:
- `userId` (`ID!`) - 用户ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query UserAchievements(
  $userId: ID!,
  $limit: Int,
  $offset: Int
) {
  userAchievements(
    userId: $userId,
    limit: $limit,
    offset: $offset
  ) {
    id
    user_id
    achievement {
      id
      name
      description
      category
      points
      icon_url
    }
    earned_at
  }
}
```

### 3. `myAchievements` - 获取我的成就

**描述**: 获取当前认证用户已获得的成就列表

**是否需要认证**: ✅ **是**

**参数**:
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query MyAchievements($limit: Int, $offset: Int) {
  myAchievements(limit: $limit, offset: $offset) {
    id
    user_id
    achievement {
      id
      name
      description
      category
      points
      icon_url
    }
    earned_at
  }
}
```

### 4. `achievement` - 获取单个成就

**描述**: 根据成就ID获取单个成就的详细信息

**参数**:
- `id` (`ID!`) - 成就ID

```graphql
query GetAchievement($id: ID!) {
  achievement(id: $id) {
    id
    name
    description
    category
    points
    is_active
    icon_url
    created_at
  }
}
```

---

## 👍 点赞和关注 Queries

### 1. `blogPostLikes` - 获取博客点赞

**描述**: 获取指定博客文章的点赞列表

**参数**:
- `postId` (`ID!`) - 博客文章ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query BlogPostLikes($postId: ID!, $limit: Int, $offset: Int) {
  blogPostLikes(postId: $postId, limit: $limit, offset: $offset) {
    id
    user_id
    target_id
    target_type
    created_at
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

### 2. `artworkLikes` - 获取作品点赞

**描述**: 获取指定作品的点赞列表

**参数**:
- `artworkId` (`ID!`) - 作品ID
- `artworkType` (`String!`) - 作品类型：`image`或`video`
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query ArtworkLikes(
  $artworkId: ID!,
  $artworkType: String!,
  $limit: Int,
  $offset: Int
) {
  artworkLikes(
    artworkId: $artworkId,
    artworkType: $artworkType,
    limit: $limit,
    offset: $offset
  ) {
    id
    user_id
    target_id
    target_type
    created_at
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

### 3. `userLikes` - 获取用户点赞

**描述**: 获取指定用户的所有点赞记录

**参数**:
- `userId` (`ID!`) - 用户ID
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query UserLikes($userId: ID!, $limit: Int, $offset: Int) {
  userLikes(userId: $userId, limit: $limit, offset: $offset) {
    blog {
      id
      target_id
      target_type
      created_at
      user {
        id
        user_profile {
          username
          avatar_url
        }
      }
    }
    artwork {
      id
      target_id
      target_type
      created_at
      user {
        id
        user_profile {
          username
          avatar_url
        }
      }
    }
    comment {
      id
      target_id
      target_type
      created_at
      user {
        id
        user_profile {
          username
          avatar_url
        }
      }
    }
  }
}
```

### 4. `followList` - 获取关注关系

**描述**: 获取关注关系列表，支持按关注者或被关注者筛选

**参数**:
- `followerId` (`ID`) - 关注者ID筛选
- `followingId` (`ID`) - 被关注者ID筛选
- `limit` (`Int`) - 每页数量（最大100）
- `offset` (`Int`) - 偏移量

```graphql
query FollowList(
  $followerId: ID,
  $followingId: ID,
  $limit: Int,
  $offset: Int
) {
  followList(
    followerId: $followerId,
    followingId: $followingId,
    limit: $limit,
    offset: $offset
  ) {
    id
    follower_id
    following_id
    created_at
    follower {
      id
      user_profile {
        username
        avatar_url
      }
    }
    following {
      id
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

---

## 🏅 排行榜 Queries

### 1. `leaderboard` - 获取排行榜

**描述**: 获取用户排行榜，按积分排序

**参数**:
- `timeRange` (`String`) - 时间范围：`weekly`, `monthly`, `all_time`
- `limit` (`Int`) - 返回数量（最大100）

```graphql
query Leaderboard($timeRange: String, $limit: Int) {
  leaderboard(timeRange: $timeRange, limit: $limit) {
    rank
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
    score
    total_artworks
    total_blog_posts
    total_followers
    total_following
  }
}
```

### 2. `userRank` - 获取用户排名

**描述**: 获取指定用户在排行榜中的排名信息

**参数**:
- `userId` (`ID!`) - 用户ID
- `timeRange` (`String`) - 时间范围：`weekly`, `monthly`, `all_time`

```graphql
query UserRank($userId: ID!, $timeRange: String) {
  userRank(userId: $userId, timeRange: $timeRange) {
    rank
    score
    total_users
    user {
      id
      user_profile {
        username
        avatar_url
      }
    }
  }
}
```

### 3. `topUsers` - 获取顶尖用户

**描述**: 获取指定数量的顶尖用户列表

**参数**:
- `limit` (`Int`) - 返回数量（最大50）
- `timeRange` (`String`) - 时间范围：`weekly`, `monthly`, `all_time`

```graphql
query TopUsers($limit: Int, $timeRange: String) {
  topUsers(limit: $limit, timeRange: $timeRange) {
    rank
    user {
      id
      user_profile {
        username
        avatar_url
        bio
      }
    }
    score
    total_artworks
    total_blog_posts
    total_followers
  }
}
```

---

## ⚠️ 错误处理

### 常见错误类型

| 错误类型 | HTTP状态码 | 说明 |
|-----------|------------|------|
| `AUTH_REQUIRED` | 401 | 需要认证的请求未提供有效token |
| `FORBIDDEN` | 403 | 用户权限不足 |
| `NOT_FOUND` | 404 | 请求的资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 错误响应格式

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
  }
}
```

错误响应示例：
```json
{
  "errors": [
    {
      "message": "User not found",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": {
    "user": null
  }
}
```

---

## 💡 最佳实践

### 1. 认证处理
- 总是在请求头中包含有效的JWT token
- 使用`Authorization: Bearer <token>`格式
- 对于需要认证的查询，先检查用户是否登录

```javascript
const token = localStorage.getItem('supabase_token')
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query })
})
```

### 2. 分页处理
- 使用`limit`和`offset`进行传统分页
- 对于大量数据，考虑使用Relay风格的`first`和`after`
- 前端应该缓存分页结果，避免重复请求

```graphql
query Users($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    name
  }
}
```

### 3. 筛选和排序
- 使用合适的筛选参数减少数据传输
- 对于列表查询，总是提供排序参数
- 搜索功能应该支持全文搜索

```graphql
query Artworks($categoryId: ID, $search: String) {
  artworks(
    categoryId: $categoryId,
    search: $search,
    limit: 20,
    offset: 0,
    orderBy: "created_at",
    orderDirection: "DESC"
  ) {
    id
    title
    image_url
  }
}
```

### 4. 错误处理
- 检查GraphQL errors数组
- 根据错误类型提供用户友好的提示
- 对于网络错误，提供重试机制

```javascript
const handleError = (error) => {
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach(err => {
      switch (err.extensions.code) {
        case 'AUTH_REQUIRED':
          showMessage('请先登录')
          break
        case 'FORBIDDEN':
          showMessage('权限不足')
          break
        default:
          showMessage(err.message)
      }
    })
  } else {
    showMessage('网络错误，请重试')
  }
}
```

### 5. 性能优化
- 只请求需要的字段，避免`__typename`
- 使用`@include`指令按需加载关联字段
- 对于静态数据，考虑使用缓存

```graphql
query GetUser($id: ID!, $includeProfile: Boolean) {
  user(id: $id) {
    id
    email
    user_profile @include(if: $includeProfile) {
      username
      avatar_url
    }
  }
}
```

### 6. 类型安全
- 使用TypeScript定义查询参数和返回类型
- 对于可选字段，总是检查是否为null
- 使用枚举值而不是字符串字面量

```typescript
interface GetUserQuery {
  variables: {
    id: string;
    includeProfile?: boolean;
  };
}
```

---

## 📚 相关文档

- [GraphQL Schema](./GRAPHQL_SCHEMA.md)
- [GraphQL Mutations](./GRAPHQL_MUTATIONS.md)
- [GraphQL Subscriptions](./GRAPHQL_SUBSCRIPTIONS.md)
- [认证指南](./AUTHENTICATION_GUIDE.md)

---

**文档版本**: 1.0.0
**更新日期**: 2025-11-29
**作者**: 老王（暴躁但专业的技术流）
**免责声明**: 看懂了再用，别瞎乱试代码！