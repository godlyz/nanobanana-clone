/**
 * Challenge Type - 挑战类型定义
 * 老王出品 - Pothos Code-first GraphQL Schema
 */

import { builder } from '../builder'

/**
 * 挑战状态枚举
 */
export const ChallengeStatus = builder.enumType('ChallengeStatus', {
  values: ['DRAFT', 'ACTIVE', 'VOTING', 'CLOSED'] as const,
  description: '挑战状态: DRAFT(草稿) | ACTIVE(进行中) | VOTING(投票中) | CLOSED(已结束)'
})

/**
 * 挑战分类枚举
 */
export const ChallengeCategory = builder.enumType('ChallengeCategory', {
  values: ['GENERAL', 'CREATIVE', 'TECHNICAL', 'ARTISTIC'] as const,
  description: '挑战分类: GENERAL(综合) | CREATIVE(创意) | TECHNICAL(技术) | ARTISTIC(艺术)'
})

/**
 * Challenge 对象类型
 */
export const Challenge = builder.objectRef<{
  id: string
  title: string
  description: string
  rules: string | null
  category: string
  cover_image_url: string | null
  prizes: any
  start_at: string
  end_at: string
  voting_ends_at: string
  status: string
  submission_count: number
  participant_count: number
  total_votes: number
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}>('Challenge').implement({
  description: '挑战',
  fields: (t) => ({
    id: t.exposeID('id', { description: '挑战ID' }),
    title: t.exposeString('title', { description: '挑战标题' }),
    description: t.exposeString('description', { description: '挑战描述' }),
    rules: t.string({
      description: '参赛规则（Markdown格式）',
      nullable: true,
      resolve: (parent) => parent.rules
    }),
    category: t.field({
      type: ChallengeCategory,
      description: '挑战分类',
      resolve: (parent) => parent.category.toUpperCase() as 'GENERAL' | 'CREATIVE' | 'TECHNICAL' | 'ARTISTIC'
    }),
    coverImageUrl: t.string({
      description: '封面图片URL',
      nullable: true,
      resolve: (parent) => parent.cover_image_url
    }),
    prizes: t.field({
      type: 'JSON',
      description: '奖励配置（JSON格式）',
      resolve: (parent) => parent.prizes
    }),
    startAt: t.string({
      description: '挑战开始时间（ISO 8601）',
      resolve: (parent) => parent.start_at
    }),
    endAt: t.string({
      description: '提交截止时间（ISO 8601）',
      resolve: (parent) => parent.end_at
    }),
    votingEndsAt: t.string({
      description: '投票截止时间（ISO 8601）',
      resolve: (parent) => parent.voting_ends_at
    }),
    status: t.field({
      type: ChallengeStatus,
      description: '挑战状态',
      resolve: (parent) => parent.status.toUpperCase() as 'DRAFT' | 'ACTIVE' | 'VOTING' | 'CLOSED'
    }),
    submissionCount: t.exposeInt('submission_count', { description: '提交数' }),
    participantCount: t.exposeInt('participant_count', { description: '参与人数' }),
    totalVotes: t.exposeInt('total_votes', { description: '总投票数' }),
    createdBy: t.field({
      type: 'User',
      description: '创建者（管理员）',
      nullable: true,
      resolve: async (parent, _args, ctx) => {
        if (!parent.created_by) return null

        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(parent.created_by)
        if (!authUser.user) return null

        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', parent.created_by)
          .single()

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),
    createdAt: t.string({
      description: '创建时间（ISO 8601）',
      resolve: (parent) => parent.created_at
    }),
    updatedAt: t.string({
      description: '更新时间（ISO 8601）',
      resolve: (parent) => parent.updated_at
    })
  })
})
