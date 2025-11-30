/**
 * GraphQL User Type
 *
 * 艹！这是老王我用 Pothos 定义的 User 类型！
 * 对应数据库的 user_profiles 表和 Supabase Auth users 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'
import type { UserProfile } from '@/types/profile'

/**
 * User 对象类型
 *
 * 艹！这个类型结合了 Supabase Auth User 和 UserProfile！
 */
export const UserType = builder.objectRef<{
  id: string
  email: string | null
  user_profile: UserProfile | null
}>('User').implement({
  description: '用户类型（包含认证信息和资料信息）',
  fields: (t) => ({
    // 基础字段（来自 Supabase Auth）
    id: t.exposeID('id', {
      description: '用户唯一标识符（UUID）'
    }),

    email: t.string({
      description: '用户邮箱（仅自己可见，其他人看到为null）',
      nullable: true,
      resolve: (parent, _args, ctx: GraphQLContext) => {
        // 只有当前登录用户可以看到自己的邮箱
        if (ctx.user && ctx.user.id === parent.id) {
          return parent.email
        }
        return null
      }
    }),

    // 资料字段（来自 user_profiles 表）
    displayName: t.string({
      description: '显示名称',
      nullable: true,
      resolve: (parent) => parent.user_profile?.display_name ?? null
    }),

    avatarUrl: t.string({
      description: '头像URL',
      nullable: true,
      resolve: (parent) => parent.user_profile?.avatar_url ?? null
    }),

    bio: t.string({
      description: '个人简介',
      nullable: true,
      resolve: (parent) => parent.user_profile?.bio ?? null
    }),

    websiteUrl: t.string({
      description: '个人网站URL',
      nullable: true,
      resolve: (parent) => parent.user_profile?.website_url ?? null
    }),

    twitterHandle: t.string({
      description: 'Twitter用户名',
      nullable: true,
      resolve: (parent) => parent.user_profile?.twitter_handle ?? null
    }),

    instagramHandle: t.string({
      description: 'Instagram用户名',
      nullable: true,
      resolve: (parent) => parent.user_profile?.instagram_handle ?? null
    }),

    githubHandle: t.string({
      description: 'GitHub用户名',
      nullable: true,
      resolve: (parent) => parent.user_profile?.github_handle ?? null
    }),

    location: t.string({
      description: '所在地',
      nullable: true,
      resolve: (parent) => parent.user_profile?.location ?? null
    }),

    // 统计字段
    followerCount: t.int({
      description: '粉丝数量',
      resolve: (parent) => parent.user_profile?.follower_count ?? 0
    }),

    followingCount: t.int({
      description: '关注数量',
      resolve: (parent) => parent.user_profile?.following_count ?? 0
    }),

    postCount: t.int({
      description: '文章数量',
      resolve: (parent) => parent.user_profile?.post_count ?? 0
    }),

    artworkCount: t.int({
      description: '作品数量',
      resolve: (parent) => parent.user_profile?.artwork_count ?? 0
    }),

    totalLikes: t.int({
      description: '总获赞数',
      resolve: (parent) => parent.user_profile?.total_likes ?? 0
    }),

    // 时间戳
    createdAt: t.string({
      description: '注册时间（ISO 8601格式）',
      nullable: true,
      resolve: (parent) => parent.user_profile?.created_at ?? null
    }),

    updatedAt: t.string({
      description: '更新时间（ISO 8601格式）',
      nullable: true,
      resolve: (parent) => parent.user_profile?.updated_at ?? null
    })
  })
})
