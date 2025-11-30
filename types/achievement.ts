/**
 * 🔥 老王的成就系统类型定义
 * 用途: 定义成就相关的TypeScript类型
 * 老王警告: 类型定义要严格，别tm搞出any来！
 */

// =====================================================
// 1. 基础枚举和类型
// =====================================================

/** 成就等级 */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

/** 成就条件类型 */
export type AchievementConditionType =
  | 'works_count'        // 作品数量
  | 'videos_count'       // 视频数量
  | 'likes_received'     // 收到点赞数
  | 'comments_count'     // 评论数量
  | 'followers_count'    // 粉丝数量
  | 'achievement_points' // 成就点数

/** 成就等级配置 */
export const ACHIEVEMENT_TIER_CONFIG: Record<AchievementTier, {
  color: string
  bgColor: string
  borderColor: string
  label: string
  labelEn: string
}> = {
  bronze: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    label: '青铜',
    labelEn: 'Bronze'
  },
  silver: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: '白银',
    labelEn: 'Silver'
  },
  gold: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    label: '黄金',
    labelEn: 'Gold'
  },
  platinum: {
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-400',
    label: '铂金',
    labelEn: 'Platinum'
  },
  diamond: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
    label: '钻石',
    labelEn: 'Diamond'
  }
}

// =====================================================
// 2. 成就定义类型
// =====================================================

/** 成就定义 */
export interface AchievementDefinition {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  badge_icon: string | null
  condition_type: AchievementConditionType
  condition_value: number
  tier: AchievementTier
  points: number
  is_hidden: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** 用户成就记录 */
export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  progress: number
  notified: boolean
}

/** 带成就定义的用户成就 */
export interface UserAchievementWithDefinition extends UserAchievement {
  achievement: AchievementDefinition
}

/** 成就进度信息（未解锁成就） */
export interface AchievementProgress {
  achievement: AchievementDefinition
  current_value: number
  target_value: number
  progress_percent: number
  is_unlocked: boolean
  unlocked_at?: string
}

// =====================================================
// 3. API请求/响应类型
// =====================================================

/** 获取成就列表参数 */
export interface ListAchievementsParams {
  tier?: AchievementTier
  condition_type?: AchievementConditionType
  include_hidden?: boolean
}

/** 获取用户成就参数 */
export interface ListUserAchievementsParams {
  user_id?: string  // 不传则获取当前用户
  page?: number
  limit?: number
}

/** 成就列表响应 */
export interface AchievementsListResponse {
  success: boolean
  data: AchievementDefinition[]
  total: number
}

/** 用户成就列表响应 */
export interface UserAchievementsListResponse {
  success: boolean
  data: UserAchievementWithDefinition[]
  stats: {
    total_achievements: number
    total_points: number
    unlocked_count: number
    completion_percent: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
}

/** 成就进度响应 */
export interface AchievementProgressResponse {
  success: boolean
  data: AchievementProgress[]
  stats: {
    unlocked_count: number
    total_count: number
    total_points: number
  }
}

/** 解锁成就响应 */
export interface UnlockAchievementResponse {
  success: boolean
  achievement?: UserAchievementWithDefinition
  message?: string
  error?: string
}

/** 检查成就响应 */
export interface CheckAchievementsResponse {
  success: boolean
  newly_unlocked: UserAchievementWithDefinition[]
  message?: string
}

// =====================================================
// 4. 成就通知类型
// =====================================================

/** 成就解锁通知数据 */
export interface AchievementUnlockNotification {
  type: 'achievement_unlock'
  achievement_id: string
  achievement_name: string
  achievement_icon: string
  tier: AchievementTier
  points: number
  unlocked_at: string
}

// =====================================================
// 🔥 老王备注:
// 1. AchievementTier定义5个成就等级
// 2. AchievementConditionType定义成就触发条件类型
// 3. ACHIEVEMENT_TIER_CONFIG提供等级的样式配置
// 4. UserAchievementWithDefinition是前端最常用的类型
// 5. AchievementProgress用于展示未解锁成就的进度
// =====================================================
