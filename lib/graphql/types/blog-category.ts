/**
 * GraphQL BlogCategory Type
 *
 * 艹！这是老王我用 Pothos 定义的 BlogCategory 类型！
 * 博客分类系统，对应数据库的 blog_categories 表！
 */

import { builder } from '../builder'

/**
 * BlogCategory 对象类型
 *
 * 艹！这个类型管理博客文章的分类！
 */
export const BlogCategoryType = builder.objectRef<{
  id: string
  name: string
  slug: string
  description?: string | null
  post_count: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
}>('BlogCategory').implement({
  description: '博客分类类型',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '分类唯一标识符（UUID）'
    }),

    name: t.exposeString('name', {
      description: '分类名称'
    }),

    slug: t.exposeString('slug', {
      description: '分类URL友好标识符'
    }),

    description: t.string({
      description: '分类描述',
      nullable: true,
      resolve: (parent) => parent.description ?? null
    }),

    postCount: t.exposeInt('post_count', {
      description: '该分类下的文章数量'
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

    // 艹！计算字段：是否被删除
    isDeleted: t.boolean({
      description: '是否被软删除',
      resolve: (parent) => !!parent.deleted_at
    })
  })
})
