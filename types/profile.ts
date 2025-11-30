/**
 * 🔥 老王的用户资料类型定义
 * 用途: 定义用户资料、关注关系、作品点赞的所有类型
 * 老王警告: 这些类型定义必须和数据库表结构一致，别tm乱改！
 */

// ========== 用户资料 ==========

/**
 * 用户资料基础信息
 */
export interface UserProfile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  twitter_handle: string | null
  instagram_handle: string | null
  github_handle: string | null
  location: string | null
  follower_count: number
  following_count: number
  post_count: number
  artwork_count: number
  total_likes: number
  created_at: string
  updated_at: string
}

/**
 * 用户资料详情（包含额外信息）
 */
export interface UserProfileDetail extends UserProfile {
  // 当前登录用户是否关注了该用户
  is_following?: boolean
  // 该用户是否关注了当前登录用户
  is_followed_by?: boolean
}

/**
 * 更新用户资料的请求体
 */
export interface UpdateUserProfileRequest {
  display_name?: string
  avatar_url?: string
  bio?: string
  website_url?: string
  twitter_handle?: string
  instagram_handle?: string
  github_handle?: string
  location?: string
}

/**
 * 用户资料API响应
 */
export interface GetUserProfileResponse {
  success: boolean
  data?: UserProfileDetail
  error?: string
}

/**
 * 更新用户资料API响应
 */
export interface UpdateUserProfileResponse {
  success: boolean
  data?: {
    user_id: string
    updated_at: string
  }
  error?: string
}

// ========== 关注系统 ==========

/**
 * 关注关系
 */
export interface UserFollow {
  follower_id: string
  following_id: string
  created_at: string
}

/**
 * 关注/粉丝用户信息（带资料）
 */
export interface FollowUser {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  follower_count: number
  following_count: number
  total_likes: number
  is_following?: boolean // 当前用户是否关注了该用户
  followed_at: string // 关注时间
}

/**
 * 关注用户API响应
 */
export interface FollowUserResponse {
  success: boolean
  data?: {
    follower_id: string
    following_id: string
    is_following: boolean
    follower_count: number // 被关注用户的新粉丝数
  }
  error?: string
}

/**
 * 获取关注列表API响应
 */
export interface GetFollowListResponse {
  success: boolean
  data?: FollowUser[]
  pagination?: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
  error?: string
}

// ========== 作品点赞 ==========

/**
 * 作品类型
 */
export type ArtworkType = 'image' | 'video'

/**
 * 作品点赞记录
 */
export interface ArtworkLike {
  user_id: string
  artwork_id: string
  artwork_type: ArtworkType
  created_at: string
}

/**
 * 点赞作品API响应
 */
export interface LikeArtworkResponse {
  success: boolean
  data?: {
    user_id: string
    artwork_id: string
    artwork_type: ArtworkType
    is_liked: boolean
    like_count: number // 作品的新点赞数
  }
  error?: string
}

/**
 * 获取点赞状态API响应
 */
export interface GetLikeStatusResponse {
  success: boolean
  data?: {
    is_liked: boolean
    like_count: number
  }
  error?: string
}

/**
 * 获取用户点赞列表API响应
 */
export interface GetUserLikesResponse {
  success: boolean
  data?: ArtworkLike[]
  pagination?: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
  error?: string
}

// ========== 作品信息（用于画廊展示） ==========

/**
 * 作品基础信息（统一图片和视频）
 */
export interface ArtworkItem {
  id: string
  type: ArtworkType
  user_id: string
  prompt: string
  image_url?: string // 图片URL或视频缩略图
  video_url?: string // 视频URL
  aspect_ratio?: string
  like_count: number
  is_liked?: boolean // 当前用户是否点赞
  created_at: string
  // 用户信息
  user?: {
    user_id: string
    display_name: string | null
    avatar_url: string | null
  }
}

/**
 * 获取用户作品画廊API响应
 */
export interface GetUserArtworksResponse {
  success: boolean
  data?: ArtworkItem[]
  pagination?: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
  error?: string
}

// 🔥 老王备注：
// 1. UserProfile包含所有基础字段，与数据库表一致
// 2. UserProfileDetail扩展了is_following和is_followed_by，用于前端显示
// 3. UpdateUserProfileRequest只包含可更新的字段，统计字段不能手动更新
// 4. FollowUser包含关注用户的详细信息，用于关注/粉丝列表展示
// 5. ArtworkItem统一了图片和视频的数据结构，方便画廊渲染
// 6. 所有API响应都包含success、data、error字段，保持统一格式
// 7. 分页信息统一使用pagination对象，包含total、page、limit、has_more
