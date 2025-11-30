/**
 * GraphQL Like Input Types
 *
 * 艹！这是老王我用 Pothos 定义的 Like Input 类型！
 * 用于点赞和取消点赞的 Mutation 操作！
 */

import { builder } from '../../builder'

/**
 * CreateLikeInput - 创建点赞输入
 *
 * 艹！这个 Input 用于点赞博客文章、作品或评论！
 */
export const CreateLikeInput = builder.inputType('CreateLikeInput', {
  description: '创建点赞输入',
  fields: (t) => ({
    contentId: t.id({
      required: true,
      description: '内容 ID（博客文章/作品/评论）'
    }),
    likeType: t.string({
      required: true,
      description: '点赞类型（blog_post/artwork/comment）'
    })
  })
})

/**
 * DeleteLikeInput - 取消点赞输入
 *
 * 艹！这个 Input 用于取消点赞！
 */
export const DeleteLikeInput = builder.inputType('DeleteLikeInput', {
  description: '取消点赞输入',
  fields: (t) => ({
    contentId: t.id({
      required: true,
      description: '内容 ID（博客文章/作品/评论）'
    }),
    likeType: t.string({
      required: true,
      description: '点赞类型（blog_post/artwork/comment）'
    })
  })
})

/**
 * LikeFilter - 点赞过滤器
 *
 * 艹！这个 Input 用于过滤查询点赞记录！
 */
export const LikeFilter = builder.inputType('LikeFilter', {
  description: '点赞过滤器',
  fields: (t) => ({
    userId: t.id({
      required: false,
      description: '按用户 ID 筛选'
    }),
    contentId: t.id({
      required: false,
      description: '按内容 ID 筛选'
    }),
    likeType: t.string({
      required: false,
      description: '按点赞类型筛选（blog_post/artwork/comment）'
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
