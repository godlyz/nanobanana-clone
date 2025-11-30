/**
 * 🔥 老王的排行榜系统类型定义
 * 用途: 定义排行榜相关的TypeScript类型
 * 老王警告: 排行榜是激励用户的核心，类型定义要准确！
 */

// =====================================================
// 1. 基础枚举和类型
// =====================================================

/** 排行榜类型 */
export type LeaderboardType =
  | 'creators'   // 创作者排行
  | 'works'      // 作品排行
  | 'videos'     // 视频排行

/** 排行榜排序字段 */
export type LeaderboardSortBy =
  | 'leaderboard_score'     // 综合积分
  | 'total_works'           // 作品数
  | 'total_videos'          // 视频数
  | 'total_likes_received'  // 点赞数
  | 'followers_count'       // 粉丝数
  | 'total_achievement_points' // 成就点数
  | 'weekly_likes'          // 周点赞
  | 'monthly_likes'         // 月点赞

/** 排行榜时间范围 */
export type LeaderboardPeriod =
  | 'all'     // 总榜
  | 'weekly'  // 周榜
  | 'monthly' // 月榜

/** 排行榜时间范围配置 */
export const LEADERBOARD_PERIOD_CONFIG: Record<LeaderboardPeriod, {
  label: string
  labelEn: string
  sortField: LeaderboardSortBy
}> = {
  all: {
    label: '总榜',
    labelEn: 'All Time',
    sortField: 'leaderboard_score'
  },
  weekly: {
    label: '周榜',
    labelEn: 'Weekly',
    sortField: 'weekly_likes'
  },
  monthly: {
    label: '月榜',
    labelEn: 'Monthly',
    sortField: 'monthly_likes'
  }
}

// =====================================================
// 2. 用户统计类型
// =====================================================

/** 用户统计数据 */
export interface UserStats {
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
  last_calculated_at: string | null
}

/** 用户简要信息（排行榜展示用） */
export interface LeaderboardUser {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

/** 排行榜条目（创作者） */
export interface LeaderboardCreatorEntry {
  rank: number
  user: LeaderboardUser
  stats: UserStats
  // 计算字段
  score: number
  change?: number  // 排名变化（+上升/-下降）
}

// =====================================================
// 3. 作品排行类型
// =====================================================

/** 作品排行条目 */
export interface LeaderboardWorkEntry {
  rank: number
  work: {
    id: string
    title: string | null
    thumbnail_url: string | null
    created_at: string
    type: 'image' | 'video'
  }
  author: LeaderboardUser
  stats: {
    likes_count: number
    comments_count: number
    views_count: number
  }
  score: number
}

// =====================================================
// 4. API请求/响应类型
// =====================================================

/** 获取创作者排行榜参数 */
export interface GetCreatorLeaderboardParams {
  period?: LeaderboardPeriod
  sort_by?: LeaderboardSortBy
  page?: number
  limit?: number
}

/** 获取作品排行榜参数 */
export interface GetWorkLeaderboardParams {
  type?: 'image' | 'video' | 'all'
  period?: LeaderboardPeriod
  page?: number
  limit?: number
}

/** 创作者排行榜响应 */
export interface CreatorLeaderboardResponse {
  success: boolean
  data: LeaderboardCreatorEntry[]
  period: LeaderboardPeriod
  sort_by: LeaderboardSortBy
  pagination: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
  // 当前用户排名（如果已登录）
  current_user_rank?: {
    rank: number
    score: number
    percentile: number  // 超过了多少%的用户
  }
}

/** 作品排行榜响应 */
export interface WorkLeaderboardResponse {
  success: boolean
  data: LeaderboardWorkEntry[]
  period: LeaderboardPeriod
  type: 'image' | 'video' | 'all'
  pagination: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
}

/** 用户排名响应 */
export interface UserRankResponse {
  success: boolean
  rank: number
  score: number
  total_users: number
  percentile: number
  period: LeaderboardPeriod
}

/** 用户统计响应 */
export interface UserStatsResponse {
  success: boolean
  data: UserStats | null
  message?: string
}

// =====================================================
// 5. 排行榜变化类型
// =====================================================

/** 排名变化信息 */
export interface RankChange {
  user_id: string
  previous_rank: number
  current_rank: number
  change: number  // 正数=上升，负数=下降
  period: LeaderboardPeriod
}

/** 排行榜更新事件 */
export interface LeaderboardUpdateEvent {
  type: 'leaderboard_update'
  period: LeaderboardPeriod
  top_movers: RankChange[]  // 变化最大的用户
  timestamp: string
}

// =====================================================
// 6. 排行榜徽章类型
// =====================================================

/** 排名徽章 */
export type RankBadge = 'gold' | 'silver' | 'bronze' | 'top10' | 'top100' | null

/** 获取排名徽章 */
export function getRankBadge(rank: number): RankBadge {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  if (rank <= 10) return 'top10'
  if (rank <= 100) return 'top100'
  return null
}

/** 排名徽章配置 */
export const RANK_BADGE_CONFIG: Record<Exclude<RankBadge, null>, {
  icon: string
  color: string
  bgColor: string
  label: string
  labelEn: string
}> = {
  gold: {
    icon: '🥇',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: '第一名',
    labelEn: '1st Place'
  },
  silver: {
    icon: '🥈',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: '第二名',
    labelEn: '2nd Place'
  },
  bronze: {
    icon: '🥉',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: '第三名',
    labelEn: '3rd Place'
  },
  top10: {
    icon: '🏅',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Top 10',
    labelEn: 'Top 10'
  },
  top100: {
    icon: '🎖️',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Top 100',
    labelEn: 'Top 100'
  }
}

// =====================================================
// 🔥 老王备注:
// 1. LeaderboardPeriod支持总榜/周榜/月榜
// 2. LeaderboardSortBy支持多种排序维度
// 3. LeaderboardCreatorEntry是创作者排行的核心类型
// 4. current_user_rank让用户知道自己的排名
// 5. getRankBadge根据排名返回对应的徽章
// 6. RANK_BADGE_CONFIG提供徽章样式配置
// =====================================================
