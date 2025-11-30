/**
 * GraphQL Artwork Type
 *
 * 艹！这是老王我用 Pothos 定义的 Artwork 类型！
 * 统一管理图片和视频作品，对应数据库的 image_generations 和 video_generation_history 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * Artwork 对象类型
 *
 * 艹！这个类型统一了图片和视频作品！
 * artwork_type 字段区分是 'image' 还是 'video'
 */
export const ArtworkType = builder.objectRef<{
  id: string
  user_id: string
  artwork_type: 'image' | 'video'
  prompt: string
  url: string
  thumbnail_url?: string | null
  width?: number | null
  height?: number | null
  aspect_ratio?: string | null
  resolution?: string | null
  duration?: number | null
  file_size_bytes?: number | null
  like_count: number
  view_count: number
  is_public: boolean
  status?: string | null
  created_at: string
  completed_at?: string | null
}>('Artwork').implement({
  description: '作品类型（图片或视频）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '作品唯一标识符（UUID）'
    }),

    userId: t.exposeID('user_id', {
      description: '作品作者的用户ID'
    }),

    artworkType: t.exposeString('artwork_type', {
      description: '作品类型（image 或 video）'
    }),

    prompt: t.exposeString('prompt', {
      description: '创作提示词'
    }),

    url: t.exposeString('url', {
      description: '作品URL（图片或视频）'
    }),

    thumbnailUrl: t.string({
      description: '缩略图URL',
      nullable: true,
      resolve: (parent) => parent.thumbnail_url ?? null
    }),

    // 尺寸和分辨率
    width: t.int({
      description: '宽度（像素，仅图片）',
      nullable: true,
      resolve: (parent) => parent.width ?? null
    }),

    height: t.int({
      description: '高度（像素，仅图片）',
      nullable: true,
      resolve: (parent) => parent.height ?? null
    }),

    aspectRatio: t.string({
      description: '宽高比（如 16:9, 9:16）',
      nullable: true,
      resolve: (parent) => parent.aspect_ratio ?? null
    }),

    resolution: t.string({
      description: '分辨率（如 720p, 1080p）',
      nullable: true,
      resolve: (parent) => parent.resolution ?? null
    }),

    duration: t.int({
      description: '时长（秒，仅视频）',
      nullable: true,
      resolve: (parent) => parent.duration ?? null
    }),

    fileSizeBytes: t.int({
      description: '文件大小（字节）',
      nullable: true,
      resolve: (parent) => parent.file_size_bytes ? Number(parent.file_size_bytes) : null
    }),

    // 互动统计
    likeCount: t.int({
      description: '点赞数量',
      resolve: (parent) => parent.like_count
    }),

    viewCount: t.int({
      description: '浏览次数',
      resolve: (parent) => parent.view_count
    }),

    isPublic: t.boolean({
      description: '是否公开',
      resolve: (parent) => parent.is_public
    }),

    status: t.string({
      description: '状态（processing, completed, failed等）',
      nullable: true,
      resolve: (parent) => parent.status ?? null
    }),

    // 时间戳
    createdAt: t.exposeString('created_at', {
      description: '创建时间（ISO 8601格式）'
    }),

    completedAt: t.string({
      description: '完成时间（ISO 8601格式）',
      nullable: true,
      resolve: (parent) => parent.completed_at ?? null
    }),

    // 艹！关联字段：作品作者
    author: t.field({
      type: 'User',
      description: '作品作者',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 查询作者信息
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
          user_profile: profile as any // 艹！Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！当前用户是否已点赞
    isLiked: t.boolean({
      description: '当前用户是否已点赞',
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (!ctx.user) return false

        const { data } = await ctx.supabase
          .from('artwork_likes')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('artwork_id', parent.id)
          .eq('artwork_type', parent.artwork_type)
          .maybeSingle()

        return !!data
      }
    })
  })
})
