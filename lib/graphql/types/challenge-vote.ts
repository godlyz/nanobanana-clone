/**
 * ChallengeVote Type - 挑战投票类型定义
 * 老王出品 - Pothos Code-first GraphQL Schema
 */

import { builder } from '../builder'

/**
 * ChallengeVote 对象类型
 */
export const ChallengeVote = builder.objectRef<{
  id: string
  challenge_id: string
  submission_id: string
  user_id: string
  ip_address: string | null
  user_agent: string | null
  is_suspicious: boolean
  voted_at: string
  revoked_at: string | null
}>('ChallengeVote').implement({
  description: '挑战投票记录',
  fields: (t) => ({
    id: t.exposeID('id', { description: '投票ID' }),
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
    submission: t.field({
      type: 'ChallengeSubmission',
      description: '投票的作品',
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
    user: t.field({
      type: 'User',
      description: '投票用户',
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
    isSuspicious: t.exposeBoolean('is_suspicious', { description: '是否标记为可疑投票' }),
    votedAt: t.string({
      description: '投票时间（ISO 8601）',
      resolve: (parent) => parent.voted_at
    }),
    revokedAt: t.string({
      description: '撤回时间（ISO 8601，NULL表示未撤回）',
      nullable: true,
      resolve: (parent) => parent.revoked_at
    }),
    isActive: t.boolean({
      description: '投票是否有效（未撤回）',
      resolve: (parent) => parent.revoked_at === null
    })
  })
})
