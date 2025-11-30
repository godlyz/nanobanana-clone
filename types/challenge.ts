/**
 * 🔥 老王的 Challenges 系统类型定义
 * 用途: 定义挑战/竞赛相关的TypeScript类型
 * 老王警告: 类型定义要严格，别tm搞出any来！
 */

// =====================================================
// 1. 基础枚举和类型
// =====================================================

/** 挑战状态 */
export type ChallengeStatus =
  | 'draft'      // 草稿（未发布）
  | 'active'     // 活跃中（接受提交）
  | 'voting'     // 投票中（不再接受新提交）
  | 'ended'      // 已结束（投票截止）
  | 'cancelled'  // 已取消

/** 挑战分类 */
export type ChallengeCategory =
  | 'photo_editing'    // 图片编辑
  | 'video_creation'   // 视频创作
  | 'ai_art'          // AI艺术
  | 'creative_coding' // 创意编程
  | 'mixed_media'     // 混合媒体
  | 'other'           // 其他

/** 媒体类型 */
export type MediaType =
  | 'image'     // 图片
  | 'video'     // 视频
  | 'audio'     // 音频
  | 'document'  // 文档
  | 'code'      // 代码

/** 奖励状态 */
export type RewardStatus =
  | 'pending'      // 待发放
  | 'distributed'  // 已发放
  | 'failed'       // 发放失败

// =====================================================
// 2. 数据库表类型
// =====================================================

/** 挑战表（challenges） */
export interface Challenge {
  id: string
  title: string
  description: string
  category: ChallengeCategory
  cover_image_url: string | null
  creator_id: string
  status: ChallengeStatus
  start_date: string
  submission_deadline: string
  voting_deadline: string
  max_submissions_per_user: number
  min_votes_required: number
  prizes: Record<string, any> | null  // JSON 格式的奖品配置
  rules: string | null
  total_submissions: number
  total_votes: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** 挑战提交表（challenge_submissions） */
export interface ChallengeSubmission {
  id: string
  challenge_id: string
  user_id: string
  title: string
  description: string | null
  media_type: MediaType
  media_url: string
  thumbnail_url: string | null
  vote_count: number
  rank: number | null
  is_winner: boolean
  submitted_at: string
  deleted_at: string | null
}

/** 挑战投票表（challenge_votes） */
export interface ChallengeVote {
  id: string
  challenge_id: string
  submission_id: string
  user_id: string
  voter_ip: string | null
  created_at: string
}

/** 挑战奖励表（challenge_rewards） */
export interface ChallengeReward {
  id: string
  challenge_id: string
  submission_id: string
  user_id: string
  rank: number
  reward_type: string
  reward_amount: number | null
  reward_description: string | null
  status: RewardStatus
  distributed_at: string | null
  created_at: string
}

// =====================================================
// 3. API 请求/响应类型
// =====================================================

/** 创建挑战请求 */
export interface CreateChallengeRequest {
  title: string
  description: string
  category: ChallengeCategory
  cover_image_url?: string
  start_date: string
  submission_deadline: string
  voting_deadline: string
  max_submissions_per_user?: number
  min_votes_required?: number
  prizes?: Record<string, any>
  rules?: string
}

/** 更新挑战请求 */
export interface UpdateChallengeRequest {
  title?: string
  description?: string
  category?: ChallengeCategory
  cover_image_url?: string
  status?: ChallengeStatus
  start_date?: string
  submission_deadline?: string
  voting_deadline?: string
  max_submissions_per_user?: number
  min_votes_required?: number
  prizes?: Record<string, any>
  rules?: string
}

/** 提交作品请求 */
export interface SubmitChallengeEntryRequest {
  challenge_id: string
  title: string
  description?: string
  media_type: MediaType
  media_url: string
  thumbnail_url?: string
}

/** 投票请求 */
export interface CastVoteRequest {
  submission_id: string
}

/** 挑战列表响应 */
export interface ChallengesListResponse {
  challenges: Challenge[]
  total_count: number
  page: number
  page_size: number
}

/** 提交列表响应 */
export interface SubmissionsListResponse {
  submissions: ChallengeSubmission[]
  total_count: number
  page: number
  page_size: number
}

/** 奖励分配响应 */
export interface RewardDistributionResponse {
  challenge_id: string
  total_rewards: number
  distributed_rewards: number
  failed_rewards: number
  errors: string[]
}

// =====================================================
// 4. 统计和分析类型
// =====================================================

/** 挑战统计数据 */
export interface ChallengeStatistics {
  challenge_id: string
  total_submissions: number
  total_votes: number
  unique_voters: number
  average_votes_per_submission: number
  submission_completion_rate: number
  voting_participation_rate: number
}

/** 排行榜条目 */
export interface ChallengeLeaderboardEntry {
  rank: number
  submission: ChallengeSubmission
  user_id: string
  vote_count: number
  is_winner: boolean
}

/** 用户参与统计 */
export interface UserChallengeParticipation {
  user_id: string
  total_challenges_joined: number
  total_submissions: number
  total_votes_received: number
  total_wins: number
  total_rewards_earned: number
}
