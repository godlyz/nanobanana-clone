/**
 * GraphQL ForumReply Input Types
 *
 * 艹！这是老王我用 Pothos 定义的 ForumReply Input 类型！
 * 用于创建和更新论坛回复的 Mutation 操作！
 */

import { builder } from '../../builder'

/**
 * CreateForumReplyInput - 创建论坛回复输入
 *
 * 艹！这个 Input 用于创建新的论坛回复！
 * 支持嵌套回复（parent_id）！
 */
export const CreateForumReplyInput = builder.inputType('CreateForumReplyInput', {
  description: '创建论坛回复输入',
  fields: (t) => ({
    threadId: t.id({
      required: true,
      description: '主题 ID'
    }),
    content: t.string({
      required: true,
      description: '回复内容（1-10000字符）',
    }),
    parentId: t.id({
      required: false,
      description: '父回复 ID（嵌套回复时使用）'
    })
  })
})

/**
 * UpdateForumReplyInput - 更新论坛回复输入
 *
 * 艹！这个 Input 用于更新已有的论坛回复！
 */
export const UpdateForumReplyInput = builder.inputType('UpdateForumReplyInput', {
  description: '更新论坛回复输入',
  fields: (t) => ({
    content: t.string({
      required: true,
      description: '回复内容（1-10000字符）',
    })
  })
})

/**
 * ForumReplyFilter - 论坛回复过滤器
 *
 * 艹！这个 Input 用于过滤查询论坛回复！
 */
export const ForumReplyFilter = builder.inputType('ForumReplyFilter', {
  description: '论坛回复过滤器',
  fields: (t) => ({
    threadId: t.id({
      required: false,
      description: '按主题 ID 筛选'
    }),
    userId: t.id({
      required: false,
      description: '按用户 ID 筛选'
    }),
    parentId: t.id({
      required: false,
      description: '按父回复 ID 筛选（null 表示直接回复主题）'
    }),
    isAcceptedAnswer: t.boolean({
      required: false,
      description: '是否为最佳答案'
    }),
    createdAfter: t.string({
      required: false,
      description: '创建时间晚于（ISO 8601格式）'
    }),
    createdBefore: t.string({
      required: false,
      description: '创建时间早于（ISO 8601格式）'
    })
  })
})

/**
 * ForumReplyOrderBy - 论坛回复排序
 *
 * 艹！这个 Input 用于指定论坛回复的排序方式！
 */
export const ForumReplyOrderBy = builder.inputType('ForumReplyOrderBy', {
  description: '论坛回复排序',
  fields: (t) => ({
    field: t.string({
      required: true,
      description: '排序字段（created_at/upvote_count）'
    }),
    direction: t.string({
      required: false,
      description: '排序方向（asc/desc，默认 asc）'
    })
  })
})
