/**
 * ChallengeReward Type - 挑战奖励类型定义
 * 老王出品 - Pothos Code-first GraphQL Schema
 */

import { builder } from '../builder'

/**
 * 奖励发放状态枚举
 */
export const RewardStatus = builder.enumType('RewardStatus', {
  values: ['PENDING', 'AWARDED', 'FAILED'] as const,
  description: '奖励发放状态: PENDING(待发放) | AWARDED(已发放) | FAILED(发放失败)'
})

/**
 * ChallengeReward 对象类型
 */
export const ChallengeReward = builder.objectRef<{
  id: string
  challenge_id: string
  user_id: string
  submission_id: string
  rank: number
  credits_awarded: number
  badge_awarded: string | null
  status: string
  error_message: string | null
  awarded_at: string
}>('ChallengeReward').implement({
  description: '挑战奖励记录',
  fields: (t) => ({
    id: t.exposeID('id', { description: '奖励ID' }),
    challenge: t.field({
      type: 'Challenge',
      description: '所属挑战',
      resolve: async (parent, _args, ctx) => {
        const { data } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', parent.challenge_id)
          .is('deleted_at', null)
          .single()

        return data as any // Supabase 查询类型和 Challenge 不完全匹配，加断言
      }
    }),
    user: t.field({
      type: 'User',
      description: '获奖用户',
      resolve: async (parent, _args, ctx) => {
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
    submission: t.field({
      type: 'ChallengeSubmission',
      description: '获奖作品',
      resolve: async (parent, _args, ctx) => {
        const { data } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('id', parent.submission_id)
          .is('deleted_at', null)
          .single()

        return data as any // Supabase 查询类型和 ChallengeSubmission 不完全匹配，加断言
      }
    }),
    rank: t.exposeInt('rank', { description: '获奖排名' }),
    creditsAwarded: t.exposeInt('credits_awarded', { description: '发放的积分' }),
    badgeAwarded: t.string({
      description: '发放的徽章ID',
      nullable: true,
      resolve: (parent) => parent.badge_awarded
    }),
    status: t.field({
      type: RewardStatus,
      description: '发放状态',
      resolve: (parent) => parent.status.toUpperCase() as 'PENDING' | 'AWARDED' | 'FAILED'
    }),
    errorMessage: t.string({
      description: '错误信息（发放失败时）',
      nullable: true,
      resolve: (parent) => parent.error_message
    }),
    awardedAt: t.string({
      description: '发放时间（ISO 8601）',
      resolve: (parent) => parent.awarded_at
    })
  })
})
