/**
 * GraphQL BlogPost Input Types
 *
 * 艹！这是老王我用 Pothos 定义的 BlogPost Input 类型！
 * 用于创建和更新博客文章的 Mutation 操作！
 */

import { builder } from '../../builder'

/**
 * CreateBlogPostInput - 创建博客文章输入
 *
 * 艹！这个 Input 用于创建新的博客文章！
 */
export const CreateBlogPostInput = builder.inputType('CreateBlogPostInput', {
  description: '创建博客文章输入',
  fields: (t) => ({
    title: t.string({
      required: true,
      description: '文章标题（3-200字符）'
      // 艹！Pothos Input 不支持 validate，验证逻辑在 resolver 中处理
    }),
    content: t.string({
      required: true,
      description: '文章内容（Markdown 格式）'
      // 艹！Pothos Input 不支持 validate，验证逻辑在 resolver 中处理
    }),
    excerpt: t.string({
      required: false,
      description: '文章摘要（可选，如果不提供则自动生成）'
    }),
    coverImage: t.string({
      required: false,
      description: '封面图片 URL（可选）'
    }),
    slug: t.string({
      required: false,
      description: '文章 slug（可选，如果不提供则自动生成）'
    }),
    status: t.string({
      required: false,
      description: '发布状态（draft/published，默认 draft）'
    }),
    categoryIds: t.idList({
      required: false,
      description: '分类 ID 列表（可选）'
    }),
    tagIds: t.idList({
      required: false,
      description: '标签 ID 列表（可选）'
    }),
    isPublic: t.boolean({
      required: false,
      description: '是否公开（默认 true）'
    })
  })
})

/**
 * UpdateBlogPostInput - 更新博客文章输入
 *
 * 艹！这个 Input 用于更新已有的博客文章！
 * 所有字段都是可选的，只更新提供的字段！
 */
export const UpdateBlogPostInput = builder.inputType('UpdateBlogPostInput', {
  description: '更新博客文章输入',
  fields: (t) => ({
    title: t.string({
      required: false,
      description: '文章标题（3-200字符）'
      // 艹！Pothos Input 不支持 validate，验证逻辑在 resolver 中处理
    }),
    content: t.string({
      required: false,
      description: '文章内容（Markdown 格式）'
      // 艹！Pothos Input 不支持 validate，验证逻辑在 resolver 中处理
    }),
    excerpt: t.string({
      required: false,
      description: '文章摘要'
    }),
    coverImage: t.string({
      required: false,
      description: '封面图片 URL'
    }),
    slug: t.string({
      required: false,
      description: '文章 slug'
    }),
    status: t.string({
      required: false,
      description: '发布状态（draft/published）'
    }),
    categoryIds: t.idList({
      required: false,
      description: '分类 ID 列表'
    }),
    tagIds: t.idList({
      required: false,
      description: '标签 ID 列表'
    }),
    isPublic: t.boolean({
      required: false,
      description: '是否公开'
    })
  })
})

/**
 * BlogPostFilter - 博客文章过滤器
 *
 * 艹！这个 Input 用于过滤查询博客文章！
 * 支持按状态、作者、分类、标签等条件过滤！
 */
export const BlogPostFilter = builder.inputType('BlogPostFilter', {
  description: '博客文章过滤器',
  fields: (t) => ({
    status: t.string({
      required: false,
      description: '按状态筛选（draft/published）'
    }),
    authorId: t.id({
      required: false,
      description: '按作者 ID 筛选'
    }),
    categoryId: t.id({
      required: false,
      description: '按分类 ID 筛选'
    }),
    tagId: t.id({
      required: false,
      description: '按标签 ID 筛选'
    }),
    search: t.string({
      required: false,
      description: '搜索关键词（标题或内容）'
    }),
    isPublic: t.boolean({
      required: false,
      description: '是否公开'
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
 * BlogPostOrderBy - 博客文章排序
 *
 * 艹！这个 Input 用于指定博客文章的排序方式！
 */
export const BlogPostOrderBy = builder.inputType('BlogPostOrderBy', {
  description: '博客文章排序',
  fields: (t) => ({
    field: t.string({
      required: true,
      description: '排序字段（created_at/updated_at/view_count/like_count）'
    }),
    direction: t.string({
      required: false,
      description: '排序方向（asc/desc，默认 desc）'
    })
  })
})
