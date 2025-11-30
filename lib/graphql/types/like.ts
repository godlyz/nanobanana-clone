/**
 * GraphQL Like Type
 *
 * 艹！这是老王我用 Pothos 定义的 Like 类型！
 * 统一管理所有点赞（博客/作品/评论），对应数据库的多个 likes 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * Like 对象类型
 *
 * 艹！这个类型统一了所有点赞系统！
 * like_type 字段区分是 'blog_post', 'artwork', 还是 'comment'
 */
export const LikeType = builder.objectRef<{
  id: string
  user_id: string
  content_id: string // post_id / artwork_id / comment_id
  like_type: 'blog_post' | 'artwork' | 'comment'
  created_at: string
}>('Like').implement({
  description: '点赞类型（统一管理所有点赞）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '点赞唯一标识符（UUID）'
    }),

    userId: t.exposeID('user_id', {
      description: '点赞用户的用户ID'
    }),

    contentId: t.exposeID('content_id', {
      description: '被点赞内容的ID（博客/作品/评论）'
    }),

    likeType: t.exposeString('like_type', {
      description: '点赞对象类型（blog_post/artwork/comment）'
    }),

    createdAt: t.exposeString('created_at', {
      description: '点赞时间（ISO 8601格式）'
    }),

    // 艹！关联字段：点赞用户
    user: t.field({
      type: 'User',
      description: '点赞用户',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 查询用户信息
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

    // 艹！关联字段：被点赞的博客文章（仅当 like_type = 'blog_post'）
    blogPost: t.field({
      type: 'BlogPost',
      description: '被点赞的博客文章（仅 like_type=blog_post）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (parent.like_type !== 'blog_post') return null

        const { data } = await ctx.supabase
          .from('blog_posts')
          .select('*')
          .eq('id', parent.content_id)
          .is('deleted_at', null) // 排除软删除的文章
          .single()

        return data as any // 艹！Supabase 查询类型不完全匹配，加断言
      }
    }),

    // 艹！关联字段：被点赞的作品（仅当 like_type = 'artwork'）
    artwork: t.field({
      type: 'Artwork',
      description: '被点赞的作品（仅 like_type=artwork）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (parent.like_type !== 'artwork') return null

        // 艹！需要从 artwork_likes 表找到 artwork_type
        const { data: likeData } = await ctx.supabase
          .from('artwork_likes')
          .select('artwork_type')
          .eq('user_id', parent.user_id)
          .eq('artwork_id', parent.content_id)
          .single()

        if (!likeData) return null

        // 艹！Supabase 查询类型断言
        const likeRecord = likeData as any

        // 根据 artwork_type 查询对应的表
        const tableName = likeRecord.artwork_type === 'video'
          ? 'video_generation_history'
          : 'image_generations'

        const { data } = await ctx.supabase
          .from(tableName)
          .select('*')
          .eq('id', parent.content_id)
          .single()

        if (!data) return null

        // 艹！Supabase 查询类型断言
        const artworkData = data as any

        // 艹！统一转换为 Artwork 类型格式
        return {
          id: artworkData.id,
          user_id: artworkData.user_id,
          artwork_type: likeRecord.artwork_type,
          prompt: artworkData.prompt,
          url: likeRecord.artwork_type === 'video' ? artworkData.permanent_video_url : artworkData.url,
          thumbnail_url: artworkData.thumbnail_url,
          width: likeRecord.artwork_type === 'image' ? artworkData.width : null,
          height: likeRecord.artwork_type === 'image' ? artworkData.height : null,
          aspect_ratio: artworkData.aspect_ratio,
          resolution: artworkData.resolution,
          duration: likeRecord.artwork_type === 'video' ? artworkData.duration : null,
          file_size_bytes: artworkData.file_size_bytes,
          like_count: 0, // 艹！需要计算
          view_count: 0, // 艹！需要计算
          is_public: true, // 艹！默认公开
          status: artworkData.status,
          created_at: artworkData.created_at,
          completed_at: artworkData.completed_at
        } as any // 艹！手工构造的对象和 Artwork 类型不完全匹配，加断言
      }
    }),

    // 艹！关联字段：被点赞的评论（仅当 like_type = 'comment'）
    comment: t.field({
      type: 'Comment',
      description: '被点赞的评论（仅 like_type=comment）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (parent.like_type !== 'comment') return null

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('id', parent.content_id)
          .is('deleted_at', null) // 排除软删除的评论
          .single()

        return data as any // 艹！Supabase 查询类型不完全匹配，加断言
      }
    })
  })
})
