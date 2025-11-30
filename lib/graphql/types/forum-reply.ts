/**
 * GraphQL ForumReply Type
 *
 * 艹！这是老王我用 Pothos 定义的 ForumReply 类型！
 * 论坛回复系统，对应数据库的 forum_replies 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'

/**
 * ForumReply 对象类型
 *
 * 艹！这个类型管理论坛主题的回复！
 * 支持嵌套回复（parent_id）
 */
export const ForumReplyType = builder.objectRef<{
  id: string
  thread_id: string
  user_id: string
  parent_id?: string | null
  content: string
  is_accepted_answer: boolean
  is_edited: boolean
  upvote_count: number
  downvote_count: number
  is_reported: boolean
  report_count: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
}>('ForumReply').implement({
  description: '论坛回复类型（对主题或回复的回复）',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '回复唯一标识符（UUID）'
    }),

    threadId: t.exposeID('thread_id', {
      description: '所属主题ID'
    }),

    userId: t.exposeID('user_id', {
      description: '回复者用户ID'
    }),

    parentId: t.string({
      description: '父回复ID（null表示直接回复主题）',
      nullable: true,
      resolve: (parent) => parent.parent_id ?? null
    }),

    // 内容字段
    content: t.exposeString('content', {
      description: '回复内容'
    }),

    // 状态字段
    isAcceptedAnswer: t.exposeBoolean('is_accepted_answer', {
      description: '是否被标记为最佳答案'
    }),

    isEdited: t.exposeBoolean('is_edited', {
      description: '是否已编辑'
    }),

    // 统计字段
    upvoteCount: t.exposeInt('upvote_count', {
      description: '点赞数'
    }),

    downvoteCount: t.exposeInt('downvote_count', {
      description: '点踩数'
    }),

    // 审核字段
    isReported: t.exposeBoolean('is_reported', {
      description: '是否被举报'
    }),

    reportCount: t.exposeInt('report_count', {
      description: '举报次数'
    }),

    // 时间戳
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

    // 艹！关联字段：所属主题
    thread: t.field({
      type: 'ForumThread',
      description: '所属论坛主题',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        const { data } = await ctx.supabase
          .from('forum_threads')
          .select('*')
          .eq('id', parent.thread_id)
          .is('deleted_at', null)
          .single()

        return data as any // 艹！Supabase 查询类型和 ForumThread 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：回复者信息
    author: t.field({
      type: 'User',
      description: '回复者',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
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

    // 艹！关联字段：父回复
    parent: t.field({
      type: 'ForumReply',
      description: '父回复（null表示直接回复主题）',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        if (!parent.parent_id) return null

        const { data } = await ctx.supabase
          .from('forum_replies')
          .select('*')
          .eq('id', parent.parent_id)
          .is('deleted_at', null)
          .single()

        return data as any // 艹！Supabase 查询类型和 ForumReply 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：子回复列表
    replies: t.field({
      type: ['ForumReply'],
      description: '子回复列表（嵌套回复）',
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
          .from('forum_replies')
          .select('*')
          .eq('parent_id', parent.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any // 艹！Supabase 查询类型和 ForumReply[] 不完全匹配，加断言
      }
    }),

    // 艹！计算字段：是否被删除
    isDeleted: t.boolean({
      description: '是否被软删除',
      resolve: (parent) => !!parent.deleted_at
    }),

    // 艹！计算字段：投票分数（upvote - downvote）
    voteScore: t.int({
      description: '投票分数（upvote - downvote）',
      resolve: (parent) => parent.upvote_count - parent.downvote_count
    }),

    // 艹！计算字段：是否是新回复（24小时内）
    isRecent: t.boolean({
      description: '是否是新回复（24小时内）',
      resolve: (parent) => {
        const createdDate = new Date(parent.created_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - createdDate.getTime())
        const diffHours = diffTime / (1000 * 60 * 60)

        return diffHours <= 24
      }
    }),

    // 艹！计算字段：是否是直接回复（parent_id为null）
    isDirectReply: t.boolean({
      description: '是否是直接回复主题（parent_id为null）',
      resolve: (parent) => !parent.parent_id
    }),

    // 艹！计算字段：回复层级深度
    depth: t.int({
      description: '回复层级深度（0=直接回复，1=嵌套回复）',
      resolve: (parent) => (parent.parent_id ? 1 : 0)
    })
  })
})
