/**
 * Pothos Global Type Augmentation
 *
 * 艹！这个文件是老王我创建的 Pothos 全局类型声明！
 * 必须声明所有 GraphQL 对象类型，这样 TypeScript 才能识别字符串引用！
 *
 * 参考: https://pothos-graphql.dev/docs/guide/schema-builder#defining-types
 */

import type { UserProfile } from '@/types/profile'
import type { BlogPost as BlogPostType, BlogCategory, BlogTag } from '@/types/blog'
import type { ForumCategory, ForumThread, ForumReply, ForumVote } from '@/types/forum'
import type { AchievementDefinition, UserAchievement } from '@/types/achievement'
import type { LeaderboardWorkEntry } from '@/types/leaderboard'
import type { Challenge, ChallengeSubmission, ChallengeVote, ChallengeReward } from '@/types/challenge'
import type { Comment } from '@/types/comment'
import type { Notification } from '@/types/notification'

// 艹！定义 Objects 接口（所有 GraphQL 对象类型的 Shape）
export interface Objects {
  // 用户相关
  User: {
    id: string
    email: string | null
    user_profile: UserProfile | null
  }
  UserProfile: UserProfile
  Follow: {
    follower_id: string
    following_id: string
    created_at: string
  }

  // 作品相关
  Artwork: {
    id: string
    user_id: string
    title: string
    description: string | null
    image_url: string
    prompt: string | null
    created_at: string
    updated_at: string
  }
  Video: {
    id: string
    user_id: string
    title: string
    description: string | null
    video_url: string
    thumbnail_url: string | null
    prompt: string | null
    created_at: string
    updated_at: string
  }

  // 评论和点赞
  Comment: Comment
  Like: {
    id: string
    user_id: string
    target_type: string
    target_id: string
    created_at: string
  }

  // 博客系统
  BlogPost: BlogPostType
  BlogCategory: BlogCategory
  BlogTag: BlogTag

  // 论坛系统
  ForumCategory: ForumCategory
  ForumThread: ForumThread
  ForumReply: ForumReply
  ForumVote: ForumVote

  // 成就和排行榜
  Achievement: AchievementDefinition
  AchievementDefinition: AchievementDefinition
  UserAchievement: UserAchievement
  Leaderboard: {
    user_id: string
    total_works: number
    total_videos: number
    total_likes_received: number
    total_comments_received: number
    total_views: number
    followers_count: number
    following_count: number
    achievements_count: number
    total_achievement_points: number
    leaderboard_score: number
    weekly_likes: number
    monthly_likes: number
    weekly_works: number
    monthly_works: number
    created_at: string
    updated_at: string
    last_calculated_at?: string | null
  }
  LeaderboardEntry: LeaderboardWorkEntry

  // Challenges 系统（挑战/竞赛功能）
  Challenge: Challenge
  ChallengeSubmission: ChallengeSubmission
  ChallengeVote: ChallengeVote
  ChallengeReward: ChallengeReward

  // 通知
  Notification: Notification

  // 分页 PageInfo（Relay Cursor Pagination）
  PageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor: string | null
    endCursor: string | null
  }
}
