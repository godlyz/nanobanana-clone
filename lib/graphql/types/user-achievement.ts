/**
 * GraphQL UserAchievement Type
 *
 * 艹！这是老王我用 Pothos 定义的 UserAchievement 类型！
 * 用户成就解锁记录，对应数据库的 user_achievements 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * UserAchievement 对象类型
 *
 * 艹！这个类型记录用户解锁成就的信息！
 */
export const UserAchievementType = builder.objectRef<{
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  progress: number
  notified: boolean
}>('UserAchievement').implement({
  description: '用户成就类型（用户解锁成就的记录）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '记录唯一标识符（UUID）'
    }),

    userId: t.exposeID('user_id', {
      description: '用户ID（UUID）'
    }),

    achievementId: t.exposeID('achievement_id', {
      description: '成就ID（UUID）'
    }),

    unlockedAt: t.exposeString('unlocked_at', {
      description: '解锁时间（ISO 8601格式）'
    }),

    progress: t.exposeInt('progress', {
      description: '当前进度（未解锁时的进度值，解锁后为最终值）'
    }),

    notified: t.exposeBoolean('notified', {
      description: '是否已通知用户（用于成就解锁通知）'
    }),

    // 艹！关联字段：用户信息
    user: t.field({
      type: 'User',
      description: '解锁成就的用户',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！查询用户信息
        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(parent.user_id)
        if (!authUser.user) return null

        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', parent.user_id)
          .single()

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！关联字段：成就定义
    achievement: t.field({
      type: 'AchievementDefinition',
      description: '成就定义信息',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！查询成就定义
        const { data } = await ctx.supabase
          .from('achievements_definitions')
          .select('*')
          .eq('id', parent.achievement_id)
          .eq('is_active', true)
          .single()

        return data as any // 艹！Supabase 查询类型和 AchievementDefinition 不完全匹配，加断言
      }
    }),

    // 艹！计算字段：是否已解锁
    isUnlocked: t.boolean({
      description: '是否已解锁（有unlocked_at就是已解锁）',
      resolve: (parent) => !!parent.unlocked_at
    }),

    // 艹！计算字段：解锁天数
    daysUnlocked: t.int({
      description: '解锁天数（距离解锁已经过去多少天）',
      nullable: true,
      resolve: (parent) => {
        if (!parent.unlocked_at) return null

        const unlockedDate = new Date(parent.unlocked_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - unlockedDate.getTime())
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        return diffDays
      }
    }),

    // 艹！计算字段：是否是新解锁（3天内）
    isRecent: t.boolean({
      description: '是否是新解锁（3天内）',
      resolve: (parent) => {
        if (!parent.unlocked_at) return false

        const unlockedDate = new Date(parent.unlocked_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - unlockedDate.getTime())
        const diffDays = diffTime / (1000 * 60 * 60 * 24)

        return diffDays <= 3
      }
    })
  })
})
