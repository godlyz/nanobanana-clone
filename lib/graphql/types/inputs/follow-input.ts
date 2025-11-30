/**
 * GraphQL Follow Input Types
 *
 * 艹！这是老王我用 Pothos 定义的 Follow Input 类型！
 * 用于关注和取消关注用户的 Mutation 操作！
 */

import { builder } from '../../builder'

/**
 * CreateFollowInput - 创建关注输入
 *
 * 艹！这个 Input 用于关注另一个用户！
 */
export const CreateFollowInput = builder.inputType('CreateFollowInput', {
  description: '创建关注输入',
  fields: (t) => ({
    followingId: t.id({
      required: true,
      description: '被关注用户的 ID'
    })
  })
})

/**
 * DeleteFollowInput - 取消关注输入
 *
 * 艹！这个 Input 用于取消关注用户！
 */
export const DeleteFollowInput = builder.inputType('DeleteFollowInput', {
  description: '取消关注输入',
  fields: (t) => ({
    followingId: t.id({
      required: true,
      description: '被关注用户的 ID'
    })
  })
})

/**
 * FollowFilter - 关注过滤器
 *
 * 艹！这个 Input 用于过滤查询关注关系！
 */
export const FollowFilter = builder.inputType('FollowFilter', {
  description: '关注过滤器',
  fields: (t) => ({
    followerId: t.id({
      required: false,
      description: '按关注者 ID 筛选（查询某人关注了谁）'
    }),
    followingId: t.id({
      required: false,
      description: '按被关注者 ID 筛选（查询某人的粉丝）'
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
