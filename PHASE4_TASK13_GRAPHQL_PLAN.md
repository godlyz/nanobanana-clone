# 🚀 Phase 4 Task 13: GraphQL API开发计划

**任务周期**: Week 32-34（预计3周）
**开始日期**: TBD
**负责人**: 开发团队
**优先级**: P1 (Phase 4第三优先级任务)

---

## 📋 任务概述

### 目标 (Objectives)
- 构建完整的GraphQL API，作为REST API的灵活替代方案
- 提供开发者友好的数据查询接口
- 支持第三方应用集成
- 提升API性能和开发体验

### 核心价值
- **灵活查询**: 客户端按需获取数据，避免over-fetching/under-fetching
- **开发体验**: 强类型schema + 自动文档 + GraphQL Playground
- **生态扩展**: 支持第三方开发者构建应用
- **性能优化**: DataLoader批量查询 + 缓存机制

---

## 🎯 功能需求

### 1. GraphQL Schema设计

#### 核心实体 (Core Entities)

```graphql
# ============================================
# User & Profile
# ============================================
type User {
  id: ID!
  email: String!
  profile: UserProfile
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserProfile {
  userId: ID!
  username: String
  displayName: String
  bio: String
  avatarUrl: String
  website: String
  location: String
  role: UserRole!
  credits: Int!
  subscriptionPlan: SubscriptionPlan
  stats: UserStats
  artworks: [Artwork!]!
  followers: [User!]!
  following: [User!]!
  achievements: [Achievement!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  MODERATOR
  ADMIN
}

enum SubscriptionPlan {
  FREE
  BASIC_MONTHLY
  BASIC_YEARLY
  PRO_MONTHLY
  PRO_YEARLY
  MAX_MONTHLY
  MAX_YEARLY
}

type UserStats {
  artworkCount: Int!
  videoCount: Int!
  followerCount: Int!
  followingCount: Int!
  totalLikes: Int!
  totalViews: Int!
}

# ============================================
# Artwork & Generation
# ============================================
type Artwork {
  id: ID!
  user: User!
  title: String
  description: String
  imageUrl: String!
  thumbnailUrl: String
  prompt: String
  negativePrompt: String
  metadata: ArtworkMetadata
  privacy: PrivacyLevel!
  likes: [Like!]!
  likeCount: Int!
  views: Int!
  comments: [Comment!]!
  tags: [Tag!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ArtworkMetadata {
  width: Int
  height: Int
  model: String
  seed: Int
  steps: Int
  cfgScale: Float
  sampler: String
}

enum PrivacyLevel {
  PUBLIC
  PRIVATE
  UNLISTED
}

# ============================================
# Video Generation
# ============================================
type Video {
  id: ID!
  user: User!
  title: String
  description: String
  videoUrl: String!
  thumbnailUrl: String
  prompt: String
  duration: Int
  status: VideoStatus!
  progress: Int
  metadata: VideoMetadata
  privacy: PrivacyLevel!
  likes: [Like!]!
  likeCount: Int!
  views: Int!
  comments: [Comment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum VideoStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

type VideoMetadata {
  width: Int
  height: Int
  fps: Int
  model: String
}

# ============================================
# Social Features
# ============================================
type Comment {
  id: ID!
  user: User!
  content: String!
  targetType: CommentTargetType!
  targetId: ID!
  parentComment: Comment
  replies: [Comment!]!
  likes: [Like!]!
  likeCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum CommentTargetType {
  ARTWORK
  VIDEO
  BLOG_POST
  FORUM_THREAD
}

type Like {
  id: ID!
  user: User!
  targetType: LikeTargetType!
  targetId: ID!
  createdAt: DateTime!
}

enum LikeTargetType {
  ARTWORK
  VIDEO
  COMMENT
  BLOG_POST
  FORUM_THREAD
}

type Follow {
  id: ID!
  follower: User!
  following: User!
  createdAt: DateTime!
}

# ============================================
# Blog System
# ============================================
type BlogPost {
  id: ID!
  author: User!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  featuredImage: String
  category: BlogCategory
  tags: [Tag!]!
  status: PostStatus!
  likes: [Like!]!
  likeCount: Int!
  views: Int!
  comments: [Comment!]!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type BlogCategory {
  id: ID!
  name: String!
  slug: String!
  posts: [BlogPost!]!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type Tag {
  id: ID!
  name: String!
  slug: String!
  usageCount: Int!
}

# ============================================
# Forum System
# ============================================
type ForumThread {
  id: ID!
  author: User!
  category: ForumCategory!
  title: String!
  content: String!
  isPinned: Boolean!
  isFeatured: Boolean!
  isLocked: Boolean!
  tags: [Tag!]!
  replies: [ForumReply!]!
  replyCount: Int!
  viewCount: Int!
  upvoteCount: Int!
  downvoteCount: Int!
  lastReplyAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ForumCategory {
  id: ID!
  name: String!
  nameEn: String
  slug: String!
  description: String
  threads: [ForumThread!]!
  threadCount: Int!
}

type ForumReply {
  id: ID!
  thread: ForumThread!
  author: User!
  content: String!
  parentReply: ForumReply
  replies: [ForumReply!]!
  upvoteCount: Int!
  downvoteCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# ============================================
# Challenge System
# ============================================
type Challenge {
  id: ID!
  title: String!
  description: String!
  type: ChallengeType!
  startDate: DateTime!
  endDate: DateTime!
  votingEndDate: DateTime!
  status: ChallengeStatus!
  bannerImageUrl: String
  rules: String
  prizeCredits: Int
  prizeFeatures: JSON
  submissions: [ChallengeSubmission!]!
  submissionCount: Int!
  participantCount: Int!
  winners: [ChallengeSubmission!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ChallengeType {
  CREATIVE
  TECHNICAL
  THEMED
  SPEED
}

enum ChallengeStatus {
  DRAFT
  ACTIVE
  VOTING
  JUDGING
  COMPLETED
  CANCELLED
}

type ChallengeSubmission {
  id: ID!
  challenge: Challenge!
  user: User!
  title: String!
  description: String
  imageUrl: String
  videoUrl: String
  voteCount: Int!
  rank: Int
  isWinner: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# ============================================
# Leaderboard & Achievements
# ============================================
type LeaderboardEntry {
  user: User!
  rank: Int!
  score: Int!
  period: LeaderboardPeriod!
}

enum LeaderboardPeriod {
  DAILY
  WEEKLY
  MONTHLY
  ALL_TIME
}

type Achievement {
  id: ID!
  name: String!
  description: String!
  icon: String!
  rarity: AchievementRarity!
  unlockedBy: [User!]!
  unlockedCount: Int!
}

enum AchievementRarity {
  COMMON
  RARE
  EPIC
  LEGENDARY
}

# ============================================
# Notification System
# ============================================
type Notification {
  id: ID!
  user: User!
  type: NotificationType!
  title: String!
  message: String!
  actionUrl: String
  isRead: Boolean!
  createdAt: DateTime!
}

enum NotificationType {
  NEW_FOLLOWER
  NEW_COMMENT
  NEW_LIKE
  CHALLENGE_RESULT
  ACHIEVEMENT_UNLOCKED
  SYSTEM_ANNOUNCEMENT
}

# ============================================
# Subscription & Credits
# ============================================
type Subscription {
  id: ID!
  user: User!
  plan: SubscriptionPlan!
  status: SubscriptionStatus!
  currentPeriodStart: DateTime!
  currentPeriodEnd: DateTime!
  cancelAtPeriodEnd: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

type CreditTransaction {
  id: ID!
  user: User!
  amount: Int!
  type: CreditTransactionType!
  description: String
  relatedId: String
  createdAt: DateTime!
}

enum CreditTransactionType {
  PURCHASE
  REWARD
  USAGE
  REFUND
  ADMIN_ADJUSTMENT
}

# ============================================
# Scalar Types
# ============================================
scalar DateTime
scalar JSON
```

#### Query设计 (Read Operations)

```graphql
type Query {
  # ============================================
  # User Queries
  # ============================================
  me: User
  user(id: ID!): User
  users(
    limit: Int = 20
    offset: Int = 0
    role: UserRole
    searchQuery: String
  ): UserConnection!

  # ============================================
  # Artwork Queries
  # ============================================
  artwork(id: ID!): Artwork
  artworks(
    limit: Int = 20
    offset: Int = 0
    userId: ID
    privacy: PrivacyLevel
    tags: [String!]
    sortBy: ArtworkSortBy = CREATED_AT
  ): ArtworkConnection!

  # ============================================
  # Video Queries
  # ============================================
  video(id: ID!): Video
  videos(
    limit: Int = 20
    offset: Int = 0
    userId: ID
    status: VideoStatus
    sortBy: VideoSortBy = CREATED_AT
  ): VideoConnection!

  # ============================================
  # Blog Queries
  # ============================================
  blogPost(slug: String!): BlogPost
  blogPosts(
    limit: Int = 20
    offset: Int = 0
    categorySlug: String
    tags: [String!]
    status: PostStatus = PUBLISHED
    sortBy: PostSortBy = PUBLISHED_AT
  ): BlogPostConnection!
  blogCategories: [BlogCategory!]!

  # ============================================
  # Forum Queries
  # ============================================
  forumThread(id: ID!): ForumThread
  forumThreads(
    limit: Int = 20
    offset: Int = 0
    categoryId: ID
    tags: [String!]
    sortBy: ThreadSortBy = LATEST
  ): ForumThreadConnection!
  forumCategories: [ForumCategory!]!
  searchForumThreads(query: String!, limit: Int = 20): [ForumThread!]!

  # ============================================
  # Challenge Queries
  # ============================================
  challenge(id: ID!): Challenge
  challenges(
    limit: Int = 20
    offset: Int = 0
    status: ChallengeStatus
    sortBy: ChallengeSortBy = START_DATE
  ): ChallengeConnection!
  challengeLeaderboard(challengeId: ID!, limit: Int = 100): [ChallengeSubmission!]!

  # ============================================
  # Social Queries
  # ============================================
  comments(
    targetType: CommentTargetType!
    targetId: ID!
    limit: Int = 20
    offset: Int = 0
  ): CommentConnection!
  followers(userId: ID!, limit: Int = 20, offset: Int = 0): UserConnection!
  following(userId: ID!, limit: Int = 20, offset: Int = 0): UserConnection!

  # ============================================
  # Leaderboard & Achievements
  # ============================================
  leaderboard(
    period: LeaderboardPeriod = WEEKLY
    limit: Int = 100
  ): [LeaderboardEntry!]!
  achievements: [Achievement!]!
  userAchievements(userId: ID!): [Achievement!]!

  # ============================================
  # Notifications
  # ============================================
  notifications(
    limit: Int = 20
    offset: Int = 0
    isRead: Boolean
  ): NotificationConnection!
  unreadNotificationCount: Int!

  # ============================================
  # Subscription & Credits
  # ============================================
  mySubscription: Subscription
  myCreditBalance: Int!
  myCreditTransactions(
    limit: Int = 20
    offset: Int = 0
  ): CreditTransactionConnection!
}

# ============================================
# Connection Types (Pagination)
# ============================================
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type ArtworkConnection {
  edges: [ArtworkEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ArtworkEdge {
  node: Artwork!
  cursor: String!
}

type VideoConnection {
  edges: [VideoEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type VideoEdge {
  node: Video!
  cursor: String!
}

type BlogPostConnection {
  edges: [BlogPostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type BlogPostEdge {
  node: BlogPost!
  cursor: String!
}

type ForumThreadConnection {
  edges: [ForumThreadEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ForumThreadEdge {
  node: ForumThread!
  cursor: String!
}

type ChallengeConnection {
  edges: [ChallengeEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ChallengeEdge {
  node: Challenge!
  cursor: String!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CommentEdge {
  node: Comment!
  cursor: String!
}

type NotificationConnection {
  edges: [NotificationEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type NotificationEdge {
  node: Notification!
  cursor: String!
}

type CreditTransactionConnection {
  edges: [CreditTransactionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CreditTransactionEdge {
  node: CreditTransaction!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# ============================================
# Sort Enums
# ============================================
enum ArtworkSortBy {
  CREATED_AT
  UPDATED_AT
  LIKES
  VIEWS
}

enum VideoSortBy {
  CREATED_AT
  UPDATED_AT
  LIKES
  VIEWS
}

enum PostSortBy {
  PUBLISHED_AT
  CREATED_AT
  LIKES
  VIEWS
}

enum ThreadSortBy {
  LATEST
  HOT
  TOP
  UNANSWERED
}

enum ChallengeSortBy {
  START_DATE
  END_DATE
  SUBMISSION_COUNT
}
```

#### Mutation设计 (Write Operations)

```graphql
type Mutation {
  # ============================================
  # User Mutations
  # ============================================
  updateProfile(input: UpdateProfileInput!): UserProfile!
  deleteAccount: Boolean!

  # ============================================
  # Artwork Mutations
  # ============================================
  createArtwork(input: CreateArtworkInput!): Artwork!
  updateArtwork(id: ID!, input: UpdateArtworkInput!): Artwork!
  deleteArtwork(id: ID!): Boolean!

  # ============================================
  # Video Mutations
  # ============================================
  createVideo(input: CreateVideoInput!): Video!
  updateVideo(id: ID!, input: UpdateVideoInput!): Video!
  deleteVideo(id: ID!): Boolean!

  # ============================================
  # Blog Mutations
  # ============================================
  createBlogPost(input: CreateBlogPostInput!): BlogPost!
  updateBlogPost(id: ID!, input: UpdateBlogPostInput!): BlogPost!
  deleteBlogPost(id: ID!): Boolean!
  publishBlogPost(id: ID!): BlogPost!

  # ============================================
  # Forum Mutations
  # ============================================
  createForumThread(input: CreateForumThreadInput!): ForumThread!
  updateForumThread(id: ID!, input: UpdateForumThreadInput!): ForumThread!
  deleteForumThread(id: ID!): Boolean!
  createForumReply(input: CreateForumReplyInput!): ForumReply!
  updateForumReply(id: ID!, input: UpdateForumReplyInput!): ForumReply!
  deleteForumReply(id: ID!): Boolean!
  voteForumThread(threadId: ID!, voteType: VoteType!): ForumThread!
  voteForumReply(replyId: ID!, voteType: VoteType!): ForumReply!

  # ============================================
  # Challenge Mutations
  # ============================================
  createChallenge(input: CreateChallengeInput!): Challenge! # Admin only
  updateChallenge(id: ID!, input: UpdateChallengeInput!): Challenge! # Admin only
  deleteChallenge(id: ID!): Boolean! # Admin only
  submitToChallenge(input: SubmitToChallengeInput!): ChallengeSubmission!
  voteSubmission(submissionId: ID!): ChallengeSubmission!

  # ============================================
  # Social Mutations
  # ============================================
  createComment(input: CreateCommentInput!): Comment!
  updateComment(id: ID!, input: UpdateCommentInput!): Comment!
  deleteComment(id: ID!): Boolean!
  likeTarget(targetType: LikeTargetType!, targetId: ID!): Like!
  unlikeTarget(targetType: LikeTargetType!, targetId: ID!): Boolean!
  followUser(userId: ID!): Follow!
  unfollowUser(userId: ID!): Boolean!

  # ============================================
  # Notification Mutations
  # ============================================
  markNotificationAsRead(id: ID!): Notification!
  markAllNotificationsAsRead: Boolean!
  deleteNotification(id: ID!): Boolean!
}

enum VoteType {
  UPVOTE
  DOWNVOTE
}

# ============================================
# Input Types
# ============================================
input UpdateProfileInput {
  username: String
  displayName: String
  bio: String
  avatarUrl: String
  website: String
  location: String
}

input CreateArtworkInput {
  title: String
  description: String
  imageUrl: String!
  prompt: String
  negativePrompt: String
  metadata: ArtworkMetadataInput
  privacy: PrivacyLevel!
  tags: [String!]
}

input ArtworkMetadataInput {
  width: Int
  height: Int
  model: String
  seed: Int
  steps: Int
  cfgScale: Float
  sampler: String
}

input UpdateArtworkInput {
  title: String
  description: String
  privacy: PrivacyLevel
  tags: [String!]
}

input CreateVideoInput {
  title: String
  description: String
  prompt: String!
  privacy: PrivacyLevel!
}

input UpdateVideoInput {
  title: String
  description: String
  privacy: PrivacyLevel
}

input CreateBlogPostInput {
  title: String!
  content: String!
  excerpt: String
  featuredImage: String
  categoryId: ID
  tags: [String!]
  status: PostStatus
}

input UpdateBlogPostInput {
  title: String
  content: String
  excerpt: String
  featuredImage: String
  categoryId: ID
  tags: [String!]
  status: PostStatus
}

input CreateForumThreadInput {
  categoryId: ID!
  title: String!
  content: String!
  tags: [String!]
}

input UpdateForumThreadInput {
  title: String
  content: String
  tags: [String!]
}

input CreateForumReplyInput {
  threadId: ID!
  content: String!
  parentReplyId: ID
}

input UpdateForumReplyInput {
  content: String!
}

input CreateChallengeInput {
  title: String!
  description: String!
  type: ChallengeType!
  startDate: DateTime!
  endDate: DateTime!
  votingEndDate: DateTime!
  bannerImageUrl: String
  rules: String
  prizeCredits: Int
  prizeFeatures: JSON
}

input UpdateChallengeInput {
  title: String
  description: String
  bannerImageUrl: String
  rules: String
  prizeCredits: Int
  prizeFeatures: JSON
}

input SubmitToChallengeInput {
  challengeId: ID!
  title: String!
  description: String
  imageUrl: String
  videoUrl: String
}

input CreateCommentInput {
  targetType: CommentTargetType!
  targetId: ID!
  content: String!
  parentCommentId: ID
}

input UpdateCommentInput {
  content: String!
}
```

### 2. 技术实现

#### 技术栈选择

```typescript
// 核心框架
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { makeExecutableSchema } from '@graphql-tools/schema'

// DataLoader（批量查询优化）
import DataLoader from 'dataloader'

// 认证
import { createServerClient } from '@supabase/ssr'

// 类型生成
import { GraphQLCodegenConfig } from '@graphql-codegen/cli'
```

#### DataLoader实现（N+1问题解决）

```typescript
// lib/graphql/dataloaders.ts
import DataLoader from 'dataloader'

export function createDataLoaders(supabase: SupabaseClient) {
  return {
    // 批量加载用户
    userLoader: new DataLoader(async (userIds: readonly string[]) => {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds as string[])

      const userMap = new Map(users?.map(u => [u.user_id, u]))
      return userIds.map(id => userMap.get(id) || null)
    }),

    // 批量加载作品
    artworkLoader: new DataLoader(async (artworkIds: readonly string[]) => {
      const { data: artworks } = await supabase
        .from('generation_records')
        .select('*')
        .in('id', artworkIds as string[])

      const artworkMap = new Map(artworks?.map(a => [a.id, a]))
      return artworkIds.map(id => artworkMap.get(id) || null)
    }),

    // 批量加载点赞数
    likeCountLoader: new DataLoader(async (keys: readonly { targetType: string; targetId: string }[]) => {
      const { data: likeCounts } = await supabase.rpc('batch_get_like_counts', {
        targets: keys as any
      })

      const countMap = new Map(likeCounts?.map(c => [`${c.target_type}:${c.target_id}`, c.count]))
      return keys.map(key => countMap.get(`${key.targetType}:${key.targetId}`) || 0)
    }),

    // 更多DataLoaders...
  }
}
```

#### Resolver实现

```typescript
// lib/graphql/resolvers.ts
export const resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      const { user } = context
      if (!user) return null

      const { data } = await context.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return data
    },

    artwork: async (_parent, { id }, context) => {
      return context.dataloaders.artworkLoader.load(id)
    },

    artworks: async (_parent, { limit, offset, userId, privacy, tags, sortBy }, context) => {
      let query = context.supabase
        .from('generation_records')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)

      if (userId) query = query.eq('user_id', userId)
      if (privacy) query = query.eq('privacy', privacy)
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags)
      }

      switch (sortBy) {
        case 'LIKES':
          query = query.order('like_count', { ascending: false })
          break
        case 'VIEWS':
          query = query.order('view_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data: artworks, count } = await query

      return {
        edges: artworks?.map(artwork => ({
          node: artwork,
          cursor: Buffer.from(artwork.id).toString('base64')
        })) || [],
        pageInfo: {
          hasNextPage: (offset + limit) < (count || 0),
          hasPreviousPage: offset > 0,
          startCursor: artworks?.[0]?.id ? Buffer.from(artworks[0].id).toString('base64') : null,
          endCursor: artworks?.[artworks.length - 1]?.id ? Buffer.from(artworks[artworks.length - 1].id).toString('base64') : null
        },
        totalCount: count || 0
      }
    },

    // 更多Query resolvers...
  },

  Mutation: {
    createArtwork: async (_parent, { input }, context) => {
      const { user } = context
      if (!user) throw new Error('Unauthorized')

      const { data: artwork, error } = await context.supabase
        .from('generation_records')
        .insert({
          user_id: user.id,
          ...input
        })
        .select()
        .single()

      if (error) throw error
      return artwork
    },

    likeTarget: async (_parent, { targetType, targetId }, context) => {
      const { user } = context
      if (!user) throw new Error('Unauthorized')

      const { data: like, error } = await context.supabase
        .from('artwork_likes')
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId
        })
        .select()
        .single()

      if (error) throw error

      // 使DataLoader缓存失效
      context.dataloaders.likeCountLoader.clear({ targetType, targetId })

      return like
    },

    // 更多Mutation resolvers...
  },

  // Field resolvers
  User: {
    profile: async (parent, _args, context) => {
      return context.dataloaders.userLoader.load(parent.id)
    },
    artworks: async (parent, _args, context) => {
      const { data } = await context.supabase
        .from('generation_records')
        .select('*')
        .eq('user_id', parent.id)

      return data || []
    }
  },

  Artwork: {
    user: async (parent, _args, context) => {
      return context.dataloaders.userLoader.load(parent.user_id)
    },
    likeCount: async (parent, _args, context) => {
      return context.dataloaders.likeCountLoader.load({
        targetType: 'artwork',
        targetId: parent.id
      })
    }
  },

  // 更多field resolvers...
}
```

#### Apollo Server设置

```typescript
// app/api/graphql/route.ts
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { createDataLoaders } from '@/lib/graphql/dataloaders'
import { createServerClient } from '@/lib/supabase/server'

const schema = makeExecutableSchema({ typeDefs, resolvers })

const apolloServer = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    // Performance monitoring
    {
      async requestDidStart() {
        const start = Date.now()
        return {
          async willSendResponse() {
            const elapsed = Date.now() - start
            console.log(`GraphQL request took ${elapsed}ms`)
          }
        }
      }
    }
  ]
})

const handler = startServerAndCreateNextHandler(apolloServer, {
  context: async (req, res) => {
    const supabase = createServerClient(req, res)
    const { data: { user } } = await supabase.auth.getUser()

    return {
      req,
      res,
      supabase,
      user,
      dataloaders: createDataLoaders(supabase)
    }
  }
})

export { handler as GET, handler as POST }
```

### 3. 认证与授权

#### JWT Token验证

```typescript
// lib/graphql/auth.ts
export async function verifyGraphQLToken(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')

  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error) return null
  return user
}
```

#### 权限检查

```typescript
// lib/graphql/permissions.ts
export function requireAuth(context: Context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    })
  }
}

export function requireAdmin(context: Context) {
  requireAuth(context)

  const userRole = context.user?.role
  if (userRole !== 'admin') {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' }
    })
  }
}

export function requireModerator(context: Context) {
  requireAuth(context)

  const userRole = context.user?.role
  if (!['admin', 'moderator'].includes(userRole)) {
    throw new GraphQLError('Moderator access required', {
      extensions: { code: 'FORBIDDEN' }
    })
  }
}
```

### 4. Rate Limiting

```typescript
// lib/graphql/rate-limiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

const rateLimiters = {
  free: new RateLimiterMemory({
    points: 100, // 100 queries
    duration: 60, // per minute
  }),
  paid: new RateLimiterMemory({
    points: 1000, // 1000 queries
    duration: 60, // per minute
  }),
}

export async function checkRateLimit(userId: string, isPaid: boolean) {
  const limiter = isPaid ? rateLimiters.paid : rateLimiters.free

  try {
    await limiter.consume(userId)
  } catch (error) {
    throw new GraphQLError('Rate limit exceeded', {
      extensions: { code: 'RATE_LIMIT_EXCEEDED' }
    })
  }
}
```

### 5. GraphQL Playground

```typescript
// app/graphql-playground/page.tsx
'use client'

import { ApolloSandbox } from '@apollo/sandbox/react'

export default function GraphQLPlayground() {
  return (
    <div className="h-screen">
      <ApolloSandbox
        initialEndpoint="/api/graphql"
        includeCookies={true}
      />
    </div>
  )
}
```

---

## 📊 测试计划

### 单元测试

```typescript
// __tests__/graphql/queries.test.ts
describe('GraphQL Queries', () => {
  test('me query returns current user')
  test('artworks query supports pagination')
  test('artworks query supports filtering by tags')
  test('artworks query supports sorting by likes/views')
  test('unauthorized access returns null for protected fields')
})

// __tests__/graphql/mutations.test.ts
describe('GraphQL Mutations', () => {
  test('createArtwork requires authentication')
  test('createArtwork creates artwork with valid input')
  test('likeTarget increments like count')
  test('unlikeTarget decrements like count')
  test('admin mutations require admin role')
})

// __tests__/graphql/dataloaders.test.ts
describe('DataLoaders', () => {
  test('userLoader batches user queries')
  test('artworkLoader batches artwork queries')
  test('likeCountLoader batches like count queries')
})
```

### 性能测试

```
- Query响应时间 <200ms (P95)
- Mutation响应时间 <500ms (P95)
- 并发1000请求无超时
- DataLoader批量查询减少DB查询90%+
```

---

## ✅ 验收标准

### 功能验收
- [ ] GraphQL endpoint operational at `/api/graphql`
- [ ] Schema覆盖所有核心实体（User, Artwork, Video, Blog, Forum, Challenge）
- [ ] Query和Mutation支持所有CRUD操作
- [ ] JWT token认证正常工作
- [ ] Rate limiting按计划执行（Free: 100/min, Paid: 1000/min）
- [ ] GraphQL Playground可访问（`/graphql-playground`）
- [ ] 自动生成的文档完整准确

### 性能验收
- [ ] 95%的Query <200ms
- [ ] 95%的Mutation <500ms
- [ ] DataLoader批量查询减少DB查询90%+
- [ ] 支持1000+并发用户

### 质量验收
- [ ] 测试覆盖率 ≥70%
- [ ] 所有Query和Mutation有测试
- [ ] 无安全漏洞（SQL注入、XSS、未授权访问）

### 开发者体验验收
- [ ] Schema文档自动生成
- [ ] TypeScript类型自动生成
- [ ] GraphQL Playground示例查询
- [ ] 错误消息清晰易懂

---

## 📅 开发时间线

### Week 32（第1周）
**Day 1-2: Schema设计与类型生成**
- [ ] 设计完整GraphQL Schema
- [ ] 配置GraphQL Codegen
- [ ] 生成TypeScript类型

**Day 3-5: Query Resolvers**
- [ ] 实现User/Profile Queries
- [ ] 实现Artwork/Video Queries
- [ ] 实现Blog/Forum Queries

### Week 33（第2周）
**Day 1-2: Mutation Resolvers**
- [ ] 实现创建/更新/删除Mutations
- [ ] 实现Social Mutations (Like/Comment/Follow)
- [ ] 实现Challenge Mutations

**Day 3-5: DataLoader与性能优化**
- [ ] 实现DataLoaders（User, Artwork, Like Count等）
- [ ] 优化查询性能
- [ ] 添加缓存机制

### Week 34（第3周）
**Day 1-2: 认证、授权与Rate Limiting**
- [ ] 实现JWT认证
- [ ] 实现权限检查（requireAuth, requireAdmin）
- [ ] 实现Rate Limiting

**Day 3-4: GraphQL Playground与文档**
- [ ] 配置GraphQL Playground
- [ ] 生成API文档
- [ ] 编写示例查询

**Day 5: 测试与部署**
- [ ] 编写单元测试和性能测试
- [ ] 部署到生产环境
- [ ] 验收测试

---

## 🚀 部署清单

### 环境变量
```bash
# GraphQL配置
GRAPHQL_ENDPOINT=/api/graphql
GRAPHQL_PLAYGROUND_ENABLED=true # 仅开发环境

# Rate Limiting
GRAPHQL_RATE_LIMIT_FREE=100
GRAPHQL_RATE_LIMIT_PAID=1000
```

### 依赖安装
```bash
pnpm add @apollo/server @as-integrations/next graphql @graphql-tools/schema dataloader
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers
```

### GraphQL Codegen配置
```yaml
# codegen.yml
schema: "./lib/graphql/schema.graphql"
generates:
  ./lib/graphql/generated.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      contextType: ./context#Context
      mappers:
        User: @/lib/types#User
        Artwork: @/lib/types#Artwork
        Video: @/lib/types#Video
```

---

## 📝 风险与缓解

### 风险1: 复杂查询性能问题
**缓解措施**:
- 使用DataLoader批量查询
- 设置查询深度限制（最多5层嵌套）
- 添加查询复杂度分析

### 风险2: Rate Limiting绕过
**缓解措施**:
- 基于User ID而非IP限流
- 多层限流（全局+用户级）
- 监控异常查询模式

### 风险3: Schema变更兼容性
**缓解措施**:
- 使用Deprecation而非Breaking Changes
- 版本化Schema（v1, v2）
- 提前通知第三方开发者

---

## 🎉 成功指标

### 技术指标
- ✅ Schema覆盖100%核心实体
- ✅ 50+ Query/Mutation实现
- ✅ P95响应时间 <200ms
- ✅ 测试覆盖率 ≥70%

### 业务指标
- ✅ 50+ third-party apps using GraphQL
- ✅ 1M+ queries/month
- ✅ Zero security incidents
- ✅ Developer satisfaction >4.5/5

---

**文档版本**: v1.0
**创建日期**: 2025-11-27
**作者**: 老王（AI开发助手）

---

**🔥 老王评语**: 艹！这个GraphQL API设计得tm专业！完整的Schema、DataLoader批量查询、JWT认证、Rate Limiting、GraphQL Playground！这要是做出来，第三方开发者绝对爱死了！💪💪💪
