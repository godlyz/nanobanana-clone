/**
 * GraphQL ForumCategory Type
 *
 * 艹！这是老王我用 Pothos 定义的 ForumCategory 类型！
 * 论坛分类系统，对应数据库的 forum_categories 表！
 */

import { builder } from '../builder'

/**
 * ForumCategory 对象类型
 *
 * 艹！这个类型管理论坛的分类！
 */
export const ForumCategoryType = builder.objectRef<{
  id: string
  name: string
  name_en?: string | null
  slug: string
  description?: string | null
  description_en?: string | null
  icon?: string | null
  color: string
  sort_order: number
  thread_count: number
  reply_count: number
  created_at: string
  updated_at: string
}>('ForumCategory').implement({
  description: '论坛分类类型',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '分类唯一标识符（UUID）'
    }),

    name: t.exposeString('name', {
      description: '分类名称（中文）'
    }),

    nameEn: t.string({
      description: '分类名称（英文）',
      nullable: true,
      resolve: (parent) => parent.name_en ?? null
    }),

    slug: t.exposeString('slug', {
      description: '分类URL友好标识符'
    }),

    description: t.string({
      description: '分类描述（中文）',
      nullable: true,
      resolve: (parent) => parent.description ?? null
    }),

    descriptionEn: t.string({
      description: '分类描述（英文）',
      nullable: true,
      resolve: (parent) => parent.description_en ?? null
    }),

    icon: t.string({
      description: '分类图标（emoji）',
      nullable: true,
      resolve: (parent) => parent.icon ?? null
    }),

    color: t.exposeString('color', {
      description: '分类颜色（十六进制）'
    }),

    sortOrder: t.exposeInt('sort_order', {
      description: '排序顺序（越小越靠前）'
    }),

    threadCount: t.exposeInt('thread_count', {
      description: '该分类下的主题数量'
    }),

    replyCount: t.exposeInt('reply_count', {
      description: '该分类下的回复总数'
    }),

    createdAt: t.exposeString('created_at', {
      description: '创建时间（ISO 8601格式）'
    }),

    updatedAt: t.exposeString('updated_at', {
      description: '更新时间（ISO 8601格式）'
    })
  })
})
