/**
 * GraphQL ForumVote Input Types
 *
 * 艹！这是老王我用 Pothos 定义的 ForumVote Input 类型！
 * 用于论坛投票（upvote/downvote）的 Mutation 操作！
 */

import { builder } from '../../builder'

/**
 * CreateForumVoteInput - 创建论坛投票输入
 *
 * 艹！这个 Input 用于对论坛主题或回复进行投票！
 */
export const CreateForumVoteInput = builder.inputType('CreateForumVoteInput', {
  description: '创建论坛投票输入',
  fields: (t) => ({
    targetType: t.string({
      required: true,
      description: '投票目标类型（thread/reply）'
    }),
    targetId: t.id({
      required: true,
      description: '投票目标 ID（主题 ID 或回复 ID）'
    }),
    voteType: t.string({
      required: true,
      description: '投票类型（upvote/downvote）'
    })
  })
})

/**
 * UpdateForumVoteInput - 更新论坛投票输入
 *
 * 艹！这个 Input 用于修改已有的投票（从 upvote 改为 downvote 或反之）！
 */
export const UpdateForumVoteInput = builder.inputType('UpdateForumVoteInput', {
  description: '更新论坛投票输入',
  fields: (t) => ({
    voteType: t.string({
      required: true,
      description: '投票类型（upvote/downvote）'
    })
  })
})

/**
 * DeleteForumVoteInput - 取消论坛投票输入
 *
 * 艹！这个 Input 用于取消投票！
 */
export const DeleteForumVoteInput = builder.inputType('DeleteForumVoteInput', {
  description: '取消论坛投票输入',
  fields: (t) => ({
    targetType: t.string({
      required: true,
      description: '投票目标类型（thread/reply）'
    }),
    targetId: t.id({
      required: true,
      description: '投票目标 ID（主题 ID 或回复 ID）'
    })
  })
})

/**
 * ForumVoteFilter - 论坛投票过滤器
 *
 * 艹！这个 Input 用于过滤查询论坛投票！
 */
export const ForumVoteFilter = builder.inputType('ForumVoteFilter', {
  description: '论坛投票过滤器',
  fields: (t) => ({
    userId: t.id({
      required: false,
      description: '按用户 ID 筛选'
    }),
    targetType: t.string({
      required: false,
      description: '按目标类型筛选（thread/reply）'
    }),
    targetId: t.id({
      required: false,
      description: '按目标 ID 筛选'
    }),
    voteType: t.string({
      required: false,
      description: '按投票类型筛选（upvote/downvote）'
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
