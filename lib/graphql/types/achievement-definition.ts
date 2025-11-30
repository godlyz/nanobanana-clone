/**
 * GraphQL AchievementDefinition Type
 *
 * 艹！这是老王我用 Pothos 定义的 AchievementDefinition 类型！
 * 成就定义系统，对应数据库的 achievements_definitions 表！
 */

import { builder } from '../builder'

/**
 * 成就等级枚举
 *
 * 艹！这5个等级从低到高：bronze -> silver -> gold -> platinum -> diamond
 */
export const AchievementTierEnum = builder.enumType('AchievementTier', {
  values: {
    BRONZE: { value: 'bronze', description: '青铜成就' },
    SILVER: { value: 'silver', description: '白银成就' },
    GOLD: { value: 'gold', description: '黄金成就' },
    PLATINUM: { value: 'platinum', description: '铂金成就' },
    DIAMOND: { value: 'diamond', description: '钻石成就' }
  } as const
})

/**
 * 成就条件类型枚举
 *
 * 艹！这些条件类型定义了成就的触发条件！
 */
export const AchievementConditionTypeEnum = builder.enumType('AchievementConditionType', {
  values: {
    WORKS_COUNT: { value: 'works_count', description: '作品数量' },
    VIDEOS_COUNT: { value: 'videos_count', description: '视频数量' },
    LIKES_RECEIVED: { value: 'likes_received', description: '收到的点赞数' },
    FOLLOWERS_COUNT: { value: 'followers_count', description: '粉丝数量' },
    COMMENTS_COUNT: { value: 'comments_count', description: '评论数量' },
    ACHIEVEMENT_POINTS: { value: 'achievement_points', description: '成就点数' }
  } as const
})

/**
 * AchievementDefinition 对象类型
 *
 * 艹！这个类型定义了成就的元数据和解锁条件！
 */
export const AchievementDefinitionType = builder.objectRef<{
  id: string
  name: string
  name_en?: string | null
  description?: string | null
  description_en?: string | null
  badge_icon?: string | null
  condition_type: string
  condition_value: number
  tier: string
  points: number
  is_hidden: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}>('AchievementDefinition').implement({
  description: '成就定义类型（定义成就的元数据和解锁条件）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '成就唯一标识符（UUID）'
    }),

    name: t.exposeString('name', {
      description: '成就名称（中文）'
    }),

    nameEn: t.string({
      description: '成就名称（英文）',
      nullable: true,
      resolve: (parent) => parent.name_en ?? null
    }),

    description: t.string({
      description: '成就描述（中文）',
      nullable: true,
      resolve: (parent) => parent.description ?? null
    }),

    descriptionEn: t.string({
      description: '成就描述（英文）',
      nullable: true,
      resolve: (parent) => parent.description_en ?? null
    }),

    badgeIcon: t.string({
      description: '徽章图标（emoji或URL）',
      nullable: true,
      resolve: (parent) => parent.badge_icon ?? null
    }),

    // 成就条件
    conditionType: t.field({
      type: AchievementConditionTypeEnum,
      description: '条件类型',
      resolve: (parent) => parent.condition_type as any
    }),

    conditionValue: t.exposeInt('condition_value', {
      description: '条件值（达到多少触发）'
    }),

    // 成就等级和奖励
    tier: t.field({
      type: AchievementTierEnum,
      description: '成就等级（bronze/silver/gold/platinum/diamond）',
      resolve: (parent) => parent.tier as any
    }),

    points: t.exposeInt('points', {
      description: '成就点数（解锁后获得的点数）'
    }),

    // 显示控制
    isHidden: t.exposeBoolean('is_hidden', {
      description: '是否隐藏成就（达成前不显示）'
    }),

    isActive: t.exposeBoolean('is_active', {
      description: '是否启用（false表示已废弃）'
    }),

    sortOrder: t.exposeInt('sort_order', {
      description: '排序权重（越小越靠前）'
    }),

    // 时间戳
    createdAt: t.exposeString('created_at', {
      description: '创建时间（ISO 8601格式）'
    }),

    updatedAt: t.exposeString('updated_at', {
      description: '更新时间（ISO 8601格式）'
    }),

    // 艹！计算字段：成就难度等级（基于条件值）
    difficultyLevel: t.string({
      description: '成就难度等级（easy/medium/hard/extreme）',
      resolve: (parent) => {
        // 艹！简单的难度判断逻辑
        if (parent.condition_value <= 10) return 'easy'
        if (parent.condition_value <= 100) return 'medium'
        if (parent.condition_value <= 1000) return 'hard'
        return 'extreme'
      }
    })
  })
})
