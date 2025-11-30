/**
 * GraphQL Comment Type
 *
 * 艹！这是老王我用 Pothos 定义的 Comment 类型！
 * 支持嵌套评论（最大深度2），对应数据库的 comments 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * Comment 对象类型
 *
 * 艹！这个类型支持对博客、作品、视频的评论和回复！
 * content_type 字段区分评论对象（blog_post/artwork/video）
 */
export const CommentType = builder.objectRef<{
  id: string
  user_id: string
  content_id: string
  content_type: 'blog_post' | 'artwork' | 'video'
  parent_id?: string | null
  content: string
  like_count: number
  reply_count: number
  depth: number
  is_edited: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}>('Comment').implement({
  description: '评论类型（支持嵌套回复）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '评论唯一标识符（UUID）'
    }),

    userId: t.exposeID('user_id', {
      description: '评论作者的用户ID'
    }),

    contentId: t.exposeID('content_id', {
      description: '被评论内容的ID（博客/作品/视频）'
    }),

    contentType: t.exposeString('content_type', {
      description: '评论对象类型（blog_post/artwork/video）'
    }),

    parentId: t.id({
      description: '父评论ID（null表示顶级评论）',
      nullable: true,
      resolve: (parent) => parent.parent_id ?? null
    }),

    content: t.exposeString('content', {
      description: '评论内容'
    }),

    likeCount: t.exposeInt('like_count', {
      description: '点赞数量'
    }),

    replyCount: t.exposeInt('reply_count', {
      description: '回复数量'
    }),

    depth: t.exposeInt('depth', {
      description: '嵌套深度（0=顶级，1=一级回复，2=二级回复）'
    }),

    isEdited: t.exposeBoolean('is_edited', {
      description: '是否已编辑'
    }),

    createdAt: t.exposeString('created_at', {
      description: '创建时间（ISO 8601格式）'
    }),

    updatedAt: t.exposeString('updated_at', {
      description: '更新时间（ISO 8601格式）'
    }),

    deletedAt: t.string({
      description: '删除时间（软删除，ISO 8601格式）',
      nullable: true,
      resolve: (parent) => parent.deleted_at ?? null
    }),

    // 艹！关联字段：评论作者
    author: t.field({
      type: 'User',
      description: '评论作者',
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
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！关联字段：父评论（如果有）
    parent: t.field({
      type: 'Comment',
      description: '父评论（null表示顶级评论）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (!parent.parent_id) return null

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('id', parent.parent_id)
          .is('deleted_at', null) // 排除软删除的评论
          .single()

        return data as any // Supabase 查询类型和 Comment 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：子评论列表（回复）
    replies: t.field({
      type: ['Comment'],
      description: '子评论列表（回复）',
      args: {
        limit: t.arg.int({
          required: false,
          description: '每页数量（默认10，最大50）'
        }),
        offset: t.arg.int({
          required: false,
          description: '偏移量（用于分页）'
        })
      },
      resolve: async (parent, args, ctx: GraphQLContext) => {
        const limit = Math.min(args.limit ?? 10, 50)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('parent_id', parent.id)
          .is('deleted_at', null) // 排除软删除的评论
          .order('created_at', { ascending: true }) // 按时间正序（先发的在前）
          .range(offset, offset + limit - 1)

        return (data ?? []) as any // Supabase 查询类型和 Comment[] 不完全匹配，加断言
      }
    }),

    // 艹！当前用户是否已点赞
    isLiked: t.boolean({
      description: '当前用户是否已点赞',
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (!ctx.user) return false

        // 艹！假设有 comment_likes 表（和 artwork_likes 类似）
        const { data } = await ctx.supabase
          .from('comment_likes')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('comment_id', parent.id)
          .maybeSingle()

        return !!data
      }
    }),

    // 艹！计算字段：是否可以回复
    canReply: t.boolean({
      description: '是否可以回复（深度<2）',
      resolve: (parent) => parent.depth < 2
    }),

    // 艹！计算字段：是否被删除
    isDeleted: t.boolean({
      description: '是否被软删除',
      resolve: (parent) => !!parent.deleted_at
    })
  })
})
