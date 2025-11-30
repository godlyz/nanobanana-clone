/**
 * ChallengeSubmission Type - 挑战作品提交类型定义
 * 老王出品 - Pothos Code-first GraphQL Schema
 */

import { builder } from '../builder'

/**
 * 媒体类型枚举
 */
export const MediaType = builder.enumType('MediaType', {
  values: ['IMAGE', 'VIDEO'] as const,
  description: '媒体类型: IMAGE(图片) | VIDEO(视频)'
})

/**
 * ChallengeSubmission 对象类型
 */
export const ChallengeSubmission = builder.objectRef<{
  id: string
  challenge_id: string
  user_id: string
  title: string
  description: string | null
  media_url: string
  media_type: string
  thumbnail_url: string | null
  vote_count: number
  rank: number | null
  submitted_at: string
  updated_at: string
  deleted_at: string | null
}>('ChallengeSubmission').implement({
  description: '挑战作品提交',
  fields: (t) => ({
    id: t.exposeID('id', { description: '提交ID' }),
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
      description: '提交用户',
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
    title: t.exposeString('title', { description: '作品标题' }),
    description: t.string({
      description: '作品描述',
      nullable: true,
      resolve: (parent) => parent.description
    }),
    mediaUrl: t.exposeString('media_url', { description: '媒体文件URL' }),
    mediaType: t.field({
      type: MediaType,
      description: '媒体类型',
      resolve: (parent) => parent.media_type.toUpperCase() as 'IMAGE' | 'VIDEO'
    }),
    thumbnailUrl: t.string({
      description: '缩略图URL',
      nullable: true,
      resolve: (parent) => parent.thumbnail_url
    }),
    voteCount: t.exposeInt('vote_count', { description: '投票数' }),
    rank: t.int({
      description: '排名（投票结束后计算）',
      nullable: true,
      resolve: (parent) => parent.rank
    }),
    submittedAt: t.string({
      description: '提交时间（ISO 8601）',
      resolve: (parent) => parent.submitted_at
    }),
    updatedAt: t.string({
      description: '更新时间（ISO 8601）',
      resolve: (parent) => parent.updated_at
    })
  })
})
