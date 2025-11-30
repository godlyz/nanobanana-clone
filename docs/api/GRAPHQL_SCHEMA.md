# Nano Banana GraphQL API Schema 设计文档

**版本**: 1.0.0
**最后更新**: 2025-11-24
**作者**: 老王

---

## 📖 目录

1. [概述](#概述)
2. [认证机制](#认证机制)
3. [Schema定义](#schema定义)
4. [Query操作](#query操作)
5. [Mutation操作](#mutation操作)
6. [Subscription操作](#subscription操作)
7. [类型定义](#类型定义)
8. [错误处理](#错误处理)
9. [分页规范](#分页规范)
10. [实现路线图](#实现路线图)

---

## 概述

### 设计目标

- **统一入口**: 单一GraphQL端点 `/api/graphql`
- **类型安全**: 完整的TypeScript类型生成
- **高性能**: 支持DataLoader批量查询，避免N+1问题
- **实时订阅**: WebSocket支持视频生成进度推送
- **向后兼容**: 保留现有REST API，GraphQL作为增强层

### 核心功能覆盖

| 模块 | REST端点 | GraphQL Query/Mutation |
|------|----------|------------------------|
| 视频生成 | `/api/video/generate` | `generateVideo` mutation |
| 视频延长 | `/api/video/extend` | `extendVideo` mutation |
| 视频状态 | `/api/v1/video/status/:id` | `videoStatus` query |
| 用户认证 | `/api/auth/*` | `me`, `login`, `register` |
| 积分系统 | `/api/credits/*` | `credits`, `consumeCredits` |
| 成就系统 | `/api/achievements/*` | `achievements`, `userAchievements` |
| 评论系统 | `/api/comments/*` | `comments`, `addComment` |
| 用户档案 | `/api/profile/*` | `profile`, `updateProfile` |

---

## 认证机制

### Bearer Token认证

```graphql
# HTTP Header
Authorization: Bearer <access_token>
```

### API Key认证（开发者）

```graphql
# HTTP Header
X-API-Key: <developer_api_key>
```

### 认证指令

```graphql
directive @auth(requires: Role = USER) on FIELD_DEFINITION
directive @rateLimit(limit: Int!, window: Int!) on FIELD_DEFINITION

enum Role {
  USER
  DEVELOPER
  ADMIN
}
```

---

## Schema定义

### 完整Schema文件

```graphql
# ===========================================
# Nano Banana GraphQL Schema v1.0.0
# ===========================================

# ============= 标量类型 =============
scalar DateTime
scalar JSON
scalar Upload

# ============= 枚举类型 =============
enum VideoResolution {
  HD_720P
  FHD_1080P
}

enum VideoAspectRatio {
  RATIO_16_9
  RATIO_9_16
  RATIO_1_1
}

enum VideoStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum SubscriptionTier {
  FREE
  BASIC
  PRO
  MAX
}

enum AchievementCategory {
  CREATION
  SOCIAL
  MILESTONE
}

enum CommentSortOrder {
  NEWEST
  OLDEST
  MOST_LIKED
}

# ============= 接口定义 =============
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# ============= 用户相关类型 =============
type User implements Node & Timestamped {
  id: ID!
  email: String!
  username: String!
  displayName: String
  avatar: String
  bio: String

  # 统计信息
  followerCount: Int!
  followingCount: Int!
  videoCount: Int!
  totalLikes: Int!

  # 关联数据
  subscription: Subscription
  credits: Credits!
  achievements: [UserAchievement!]!
  videos(first: Int, after: String): VideoConnection!

  # 时间戳
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Credits {
  balance: Int!
  totalEarned: Int!
  totalSpent: Int!
  monthlyAllowance: Int!
  lastRefreshAt: DateTime
}

type Subscription {
  tier: SubscriptionTier!
  status: String!
  startDate: DateTime!
  endDate: DateTime
  autoRenew: Boolean!
}

# ============= 视频相关类型 =============
type Video implements Node & Timestamped {
  id: ID!
  taskId: String!
  prompt: String!
  negativePrompt: String

  # 视频参数
  resolution: VideoResolution!
  aspectRatio: VideoAspectRatio!
  duration: Int!
  fps: Int!

  # 状态和结果
  status: VideoStatus!
  progress: Int
  videoUrl: String
  thumbnailUrl: String

  # 元数据
  creditsCost: Int!
  generationTime: Int
  errorMessage: String

  # 关联数据
  author: User!
  comments(first: Int, after: String, orderBy: CommentSortOrder): CommentConnection!
  likeCount: Int!
  isLikedByMe: Boolean!

  # 延长相关
  isExtended: Boolean!
  parentVideoId: ID
  childVideos: [Video!]!

  # 时间戳
  createdAt: DateTime!
  updatedAt: DateTime!
}

type VideoGenerationResult {
  taskId: String!
  status: VideoStatus!
  estimatedTime: Int
  creditsCharged: Int!
}

type VideoExtendResult {
  taskId: String!
  status: VideoStatus!
  newDuration: Int!
  creditsCharged: Int!
}

# ============= 成就相关类型 =============
type Achievement implements Node {
  id: ID!
  name: String!
  description: String!
  category: AchievementCategory!
  icon: String!
  points: Int!
  requirement: Int!
  isSecret: Boolean!
}

type UserAchievement {
  achievement: Achievement!
  progress: Int!
  unlockedAt: DateTime
  isUnlocked: Boolean!
}

# ============= 评论相关类型 =============
type Comment implements Node & Timestamped {
  id: ID!
  content: String!
  author: User!
  video: Video!

  # 回复
  parentId: ID
  replies(first: Int, after: String): CommentConnection!
  replyCount: Int!

  # 互动
  likeCount: Int!
  isLikedByMe: Boolean!

  # 时间戳
  createdAt: DateTime!
  updatedAt: DateTime!
}

# ============= 分页类型 =============
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
  totalCount: Int!
}

type VideoConnection {
  edges: [VideoEdge!]!
  pageInfo: PageInfo!
}

type VideoEdge {
  node: Video!
  cursor: String!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
}

type CommentEdge {
  node: Comment!
  cursor: String!
}

type AchievementConnection {
  edges: [AchievementEdge!]!
  pageInfo: PageInfo!
}

type AchievementEdge {
  node: Achievement!
  cursor: String!
}

# ============= 输入类型 =============
input VideoGenerateInput {
  prompt: String!
  negativePrompt: String
  resolution: VideoResolution = HD_720P
  aspectRatio: VideoAspectRatio = RATIO_16_9
  duration: Int = 5
  fps: Int = 24
  seed: Int
  referenceImage: Upload
}

input VideoExtendInput {
  videoId: ID!
  duration: Int = 7
}

input CommentInput {
  videoId: ID!
  content: String!
  parentId: ID
}

input ProfileUpdateInput {
  displayName: String
  bio: String
  avatar: Upload
}

input PaginationInput {
  first: Int = 20
  after: String
}

# ============= 查询根类型 =============
type Query {
  # 当前用户
  me: User @auth

  # 用户查询
  user(id: ID!): User
  userByUsername(username: String!): User

  # 视频查询
  video(id: ID!): Video
  videoByTaskId(taskId: String!): Video
  videoStatus(taskId: String!): VideoStatus! @auth

  # 视频列表
  videos(
    first: Int = 20
    after: String
    authorId: ID
    status: VideoStatus
  ): VideoConnection!

  myVideos(
    first: Int = 20
    after: String
    status: VideoStatus
  ): VideoConnection! @auth

  # Feed
  feed(first: Int = 20, after: String): VideoConnection! @auth
  explore(first: Int = 20, after: String): VideoConnection!

  # 成就
  achievements(category: AchievementCategory): [Achievement!]!
  myAchievements: [UserAchievement!]! @auth

  # 评论
  comments(
    videoId: ID!
    first: Int = 20
    after: String
    orderBy: CommentSortOrder = NEWEST
  ): CommentConnection!

  # 积分
  myCredits: Credits! @auth
  creditHistory(first: Int = 20, after: String): CreditTransactionConnection! @auth

  # 排行榜
  leaderboard(
    type: LeaderboardType!
    period: LeaderboardPeriod!
    first: Int = 10
  ): [LeaderboardEntry!]!
}

# ============= 变更根类型 =============
type Mutation {
  # 认证
  login(email: String!, password: String!): AuthPayload!
  register(email: String!, password: String!, username: String!): AuthPayload!
  logout: Boolean! @auth
  refreshToken(refreshToken: String!): AuthPayload!

  # 视频生成
  generateVideo(input: VideoGenerateInput!): VideoGenerationResult! @auth @rateLimit(limit: 10, window: 60)
  extendVideo(input: VideoExtendInput!): VideoExtendResult! @auth @rateLimit(limit: 5, window: 60)
  deleteVideo(id: ID!): Boolean! @auth

  # 评论
  addComment(input: CommentInput!): Comment! @auth
  updateComment(id: ID!, content: String!): Comment! @auth
  deleteComment(id: ID!): Boolean! @auth
  likeComment(id: ID!): Comment! @auth
  unlikeComment(id: ID!): Comment! @auth

  # 视频互动
  likeVideo(id: ID!): Video! @auth
  unlikeVideo(id: ID!): Video! @auth

  # 用户关系
  followUser(id: ID!): User! @auth
  unfollowUser(id: ID!): User! @auth

  # 档案更新
  updateProfile(input: ProfileUpdateInput!): User! @auth

  # 积分操作
  consumeCredits(amount: Int!, reason: String!): Credits! @auth

  # GDPR
  exportMyData: String! @auth
  deleteMyAccount(confirmation: String!): Boolean! @auth
}

# ============= 订阅根类型 =============
type Subscription {
  # 视频生成进度
  videoProgress(taskId: String!): VideoProgressEvent! @auth

  # 新评论通知
  newComment(videoId: ID!): Comment!

  # 通知
  notifications: Notification! @auth
}

# ============= 订阅事件类型 =============
type VideoProgressEvent {
  taskId: String!
  status: VideoStatus!
  progress: Int!
  message: String
  videoUrl: String
  error: String
}

type Notification {
  id: ID!
  type: NotificationType!
  message: String!
  data: JSON
  createdAt: DateTime!
}

enum NotificationType {
  VIDEO_COMPLETED
  VIDEO_FAILED
  NEW_FOLLOWER
  NEW_LIKE
  NEW_COMMENT
  ACHIEVEMENT_UNLOCKED
}

# ============= 认证载荷 =============
type AuthPayload {
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
  user: User!
}

# ============= 积分交易 =============
type CreditTransaction implements Node & Timestamped {
  id: ID!
  amount: Int!
  balance: Int!
  type: CreditTransactionType!
  description: String!
  referenceId: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum CreditTransactionType {
  PURCHASE
  SUBSCRIPTION
  CONSUMPTION
  REFUND
  BONUS
  REFERRAL
}

type CreditTransactionConnection {
  edges: [CreditTransactionEdge!]!
  pageInfo: PageInfo!
}

type CreditTransactionEdge {
  node: CreditTransaction!
  cursor: String!
}

# ============= 排行榜 =============
type LeaderboardEntry {
  rank: Int!
  user: User!
  score: Int!
  change: Int
}

enum LeaderboardType {
  CREATORS
  LIKES
  FOLLOWERS
}

enum LeaderboardPeriod {
  DAILY
  WEEKLY
  MONTHLY
  ALL_TIME
}
```

---

## Query操作

### 示例查询

#### 获取当前用户信息

```graphql
query GetMe {
  me {
    id
    username
    displayName
    avatar
    credits {
      balance
      monthlyAllowance
    }
    subscription {
      tier
      endDate
    }
    achievements {
      achievement {
        name
        icon
      }
      isUnlocked
    }
  }
}
```

#### 获取视频详情

```graphql
query GetVideo($id: ID!) {
  video(id: $id) {
    id
    prompt
    resolution
    duration
    status
    videoUrl
    thumbnailUrl
    author {
      username
      avatar
    }
    likeCount
    isLikedByMe
    comments(first: 10) {
      edges {
        node {
          id
          content
          author {
            username
          }
          likeCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

#### 获取视频列表（分页）

```graphql
query GetVideos($first: Int!, $after: String) {
  videos(first: $first, after: $after, status: COMPLETED) {
    edges {
      node {
        id
        prompt
        thumbnailUrl
        duration
        author {
          username
        }
        likeCount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
```

---

## Mutation操作

### 示例变更

#### 生成视频

```graphql
mutation GenerateVideo($input: VideoGenerateInput!) {
  generateVideo(input: $input) {
    taskId
    status
    estimatedTime
    creditsCharged
  }
}

# Variables
{
  "input": {
    "prompt": "一只可爱的橙色小猫在阳光下打盹",
    "resolution": "HD_720P",
    "aspectRatio": "RATIO_16_9",
    "duration": 5
  }
}
```

#### 延长视频

```graphql
mutation ExtendVideo($input: VideoExtendInput!) {
  extendVideo(input: $input) {
    taskId
    status
    newDuration
    creditsCharged
  }
}

# Variables
{
  "input": {
    "videoId": "video_123",
    "duration": 7
  }
}
```

#### 添加评论

```graphql
mutation AddComment($input: CommentInput!) {
  addComment(input: $input) {
    id
    content
    author {
      username
    }
    createdAt
  }
}
```

---

## Subscription操作

### 视频生成进度订阅

```graphql
subscription WatchVideoProgress($taskId: String!) {
  videoProgress(taskId: $taskId) {
    taskId
    status
    progress
    message
    videoUrl
    error
  }
}
```

### 通知订阅

```graphql
subscription WatchNotifications {
  notifications {
    id
    type
    message
    data
    createdAt
  }
}
```

---

## 错误处理

### 错误格式

```json
{
  "errors": [
    {
      "message": "积分不足",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["generateVideo"],
      "extensions": {
        "code": "INSUFFICIENT_CREDITS",
        "requiredCredits": 20,
        "availableCredits": 10
      }
    }
  ],
  "data": null
}
```

### 错误码定义

| 错误码 | 描述 | HTTP状态 |
|--------|------|----------|
| `UNAUTHENTICATED` | 未登录或Token过期 | 401 |
| `FORBIDDEN` | 权限不足 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `VALIDATION_ERROR` | 输入验证失败 | 400 |
| `INSUFFICIENT_CREDITS` | 积分不足 | 402 |
| `RATE_LIMITED` | 请求频率超限 | 429 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 分页规范

### Relay Cursor Connections

遵循 [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)

```graphql
# 请求
query {
  videos(first: 10, after: "cursor_xyz") {
    edges {
      node { id }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
      totalCount
    }
  }
}
```

### 游标编码

```typescript
// 游标格式: base64(type:id:timestamp)
const cursor = Buffer.from(`video:123:1700000000`).toString('base64');
```

---

## 实现路线图

### Phase 1: 核心Schema（Week 1）

- [x] Schema设计文档
- [ ] 基础类型定义
- [ ] 用户认证Query/Mutation
- [ ] 视频CRUD操作

### Phase 2: 高级功能（Week 2）

- [ ] 分页和游标实现
- [ ] DataLoader批量查询
- [ ] 订阅WebSocket
- [ ] 错误处理中间件

### Phase 3: 优化和测试（Week 3）

- [ ] 查询复杂度限制
- [ ] 持久化查询
- [ ] E2E测试
- [ ] 性能基准测试

### Phase 4: 文档和SDK（Week 4）

- [ ] GraphQL Playground配置
- [ ] TypeScript类型生成
- [ ] SDK代码生成
- [ ] API文档发布

---

## 技术栈建议

| 组件 | 推荐方案 | 备选方案 |
|------|----------|----------|
| GraphQL服务器 | `graphql-yoga` | `apollo-server` |
| Schema定义 | `pothos` (Code-first) | `nexus`, `typegraphql` |
| 数据加载 | `dataloader` | - |
| 订阅 | `graphql-ws` | `subscriptions-transport-ws` |
| 类型生成 | `graphql-codegen` | - |
| 验证 | `envelop` plugins | `graphql-shield` |

---

**文档维护**: 老王
**最后更新**: 2025-11-24
