/**
 * GraphQL Follow Type
 *
 * 艹！这是老王我用 Pothos 定义的 Follow 类型！
 * 管理用户之间的关注关系（粉丝/关注），对应数据库的 user_follows 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * Follow 对象类型
 *
 * 艹！这个类型表示用户之间的关注关系！
 * follower = 关注者，following = 被关注者
 */
export const FollowType = builder.objectRef<{
  follower_id: string
  following_id: string
  created_at: string
}>('Follow').implement({
  description: '关注关系类型（用户关注/粉丝）',
  fields: (t) => ({
    // 基础字段
    followerId: t.exposeID('follower_id', {
      description: '关注者的用户ID'
    }),

    followingId: t.exposeID('following_id', {
      description: '被关注者的用户ID'
    }),

    createdAt: t.exposeString('created_at', {
      description: '关注时间（ISO 8601格式）'
    }),

    // 艹！关联字段：关注者（粉丝）
    follower: t.field({
      type: 'User',
      description: '关注者（粉丝）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 查询关注者信息
        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(parent.follower_id)
        if (!authUser.user) return null

        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', parent.follower_id)
          .single()

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！关联字段：被关注者
    following: t.field({
      type: 'User',
      description: '被关注者',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 查询被关注者信息
        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(parent.following_id)
        if (!authUser.user) return null

        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', parent.following_id)
          .single()

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！计算字段：是否相互关注（互粉）
    isMutual: t.boolean({
      description: '是否相互关注（互粉）',
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 查询反向关注关系是否存在
        const { data } = await ctx.supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', parent.following_id)
          .eq('following_id', parent.follower_id)
          .maybeSingle()

        return !!data
      }
    })
  })
})
