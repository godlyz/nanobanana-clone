/**
 * 🔥 老王的案例展示类型定义
 * 用途: UGC推荐系统的TypeScript类型
 */

// 推荐状态
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

// 作品分类
export type ShowcaseCategory = 'portrait' | 'landscape' | 'product' | 'creative' | 'anime' | 'all'

// 推荐提交记录
export interface ShowcaseSubmission {
  id: string
  user_id: string
  generation_history_id: string
  image_index: number
  title: string
  description: string | null
  category: ShowcaseCategory
  tags: string[]
  status: SubmissionStatus
  similarity_score: number | null
  rejection_reason: string | null
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

// 公开展示作品
export interface ShowcaseItem {
  id: string
  submission_id: string
  creator_id: string
  title: string
  description: string | null
  category: ShowcaseCategory
  tags: string[]
  image_url: string
  thumbnail_url: string | null
  image_hash: string | null
  creator_name: string | null
  creator_avatar: string | null
  likes_count: number
  views_count: number
  featured: boolean
  featured_order: number | null
  milestone_100_rewarded: boolean
  similarity_checked: boolean
  created_at: string
  published_at: string
  updated_at: string
}

// 点赞记录
export interface ShowcaseLike {
  id: string
  showcase_id: string
  user_id: string
  created_at: string
}

// API请求：推荐提交
export interface SubmitShowcaseRequest {
  generation_history_id: string
  image_index: number
  title: string
  description?: string
  category: ShowcaseCategory
  tags?: string[]
}

// API响应：推荐提交
export interface SubmitShowcaseResponse {
  success: boolean
  data?: {
    submission_id: string
    status: SubmissionStatus
    message: string
  }
  error?: string
}

// API请求：点赞
export interface LikeShowcaseRequest {
  showcase_id: string
}

// API响应：点赞
export interface LikeShowcaseResponse {
  success: boolean
  data?: {
    liked: boolean // true=点赞成功，false=取消点赞
    likes_count: number
  }
  error?: string
}

// API响应：获取案例列表
export interface GetShowcaseListResponse {
  success: boolean
  data?: {
    items: ShowcaseItem[]
    total: number
    page: number
    per_page: number
  }
  error?: string
}

// 用户推荐统计
export interface UserSubmissionStats {
  total_submissions: number
  pending_submissions: number
  approved_submissions: number
  rejected_submissions: number
  total_likes: number
}

// ============================================
// 🔥 视频分享类型定义
// ============================================

// 媒体类型
export type MediaType = 'image' | 'video'

// 视频分类（可扩展）
export type VideoShowcaseCategory = 'creative' | 'portrait' | 'landscape' | 'product' | 'anime' | 'all'

// API请求：视频推荐提交
export interface SubmitVideoShowcaseRequest {
  video_generation_history_id: string
  title: string
  description?: string
  category: VideoShowcaseCategory
  tags?: string[]
}

// API响应：视频推荐提交
export interface SubmitVideoShowcaseResponse {
  success: boolean
  data?: {
    submission_id: string
    status: SubmissionStatus
    message: string
  }
  error?: string
}

// 视频展示项
export interface VideoShowcaseItem extends Omit<ShowcaseItem, 'image_url' | 'thumbnail_url'> {
  media_type: 'video'
  video_url: string
  thumbnail_url: string | null
  duration: number
  resolution: string
}

// ============================================
// 🔥 管理员审核API类型
// ============================================

// 扩展的提交记录（包含额外信息）
export interface ShowcaseSubmissionWithDetails extends ShowcaseSubmission {
  image_url: string
  creator_email: string
  creator_name: string
  users?: {
    id: string
    email: string
    user_metadata: Record<string, any>
  }
  generation_history?: {
    id: string
    generated_images: string[]
  }
}

// API响应：获取审核列表
export interface GetSubmissionsResponse {
  success: boolean
  data?: {
    submissions: ShowcaseSubmissionWithDetails[]
    total: number
    page: number
    per_page: number
  }
  error?: string
}

// API请求：审核操作
export interface ReviewSubmissionRequest {
  submission_id: string
  action: 'approve' | 'reject'
  rejection_reason?: string
  admin_notes?: string
}

// API响应：审核操作
export interface ReviewSubmissionResponse {
  success: boolean
  data?: {
    submission_id: string
    showcase_id?: string
    status: SubmissionStatus
    rejection_reason?: string
    message: string
  }
  error?: string
}
