/**
 * GraphQL BlogPost Type
 *
 * 艹！这是老王我用 Pothos 定义的 BlogPost 类型！
 * 对应数据库的 blog_posts 表！
 */

import { builder } from '../builder'
import type { GraphQLContext } from '../context'
import type { BlogPost } from '@/types/blog'

/**
 * BlogPost 状态枚举
 */
export const BlogPostStatusEnum = builder.enumType('BlogPostStatus', {
  values: {
    DRAFT: { value: 'draft', description: '草稿' },
    PUBLISHED: { value: 'published', description: '已发布' }
  } as const
})

/**
 * BlogPost 对象类型
 *
 * 艹！这个类型映射了数据库的 blog_posts 表！
 */
export const BlogPostType = builder.objectRef<BlogPost>('BlogPost').implement({
  description: '博客文章类型',
  fields: (t) => ({
    // 基础字段
    id: t.exposeID('id', {
      description: '文章唯一标识符（UUID）'
    }),

    userId: t.exposeString('user_id', {
      description: '作者用户ID（UUID）'
    }),

    // 文章内容
    title: t.exposeString('title', {
      description: '文章标题'
    }),

    slug: t.exposeString('slug', {
      description: '文章URL友好标识符'
    }),

    content: t.exposeString('content', {
      description: '文章内容（Markdown格式）'
    }),

    excerpt: t.string({
      description: '文章摘要',
      nullable: true,
      resolve: (parent) => parent.excerpt
    }),

    coverImageUrl: t.string({
      description: '封面图片URL',
      nullable: true,
      resolve: (parent) => parent.cover_image_url
    }),

    // 状态管理
    status: t.field({
      type: BlogPostStatusEnum,
      description: '文章状态',
      resolve: (parent) => parent.status
    }),

    publishedAt: t.string({
      description: '发布时间（ISO 8601格式）',
      nullable: true,
      resolve: (parent) => parent.published_at
    }),

    // 互动统计
    viewCount: t.exposeInt('view_count', {
      description: '浏览次数'
    }),

    likeCount: t.exposeInt('like_count', {
      description: '点赞次数'
    }),

    commentCount: t.exposeInt('comment_count', {
      description: '评论次数'
    }),

    // SEO 元数据
    metaTitle: t.string({
      description: 'SEO标题',
      nullable: true,
      resolve: (parent) => parent.meta_title
    }),

    metaDescription: t.string({
      description: 'SEO描述',
      nullable: true,
      resolve: (parent) => parent.meta_description
    }),

    metaKeywords: t.string({
      description: 'SEO关键词',
      nullable: true,
      resolve: (parent) => parent.meta_keywords
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

    // 关联字段（使用 DataLoader 批量加载）
    author: t.field({
      type: 'User', // 艹！用字符串引用，避免循环依赖！
      description: '文章作者',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！使用 DataLoader 批量加载用户信息，避免 N+1 查询！
        const [authUser, profile] = await Promise.all([
          ctx.loaders.userLoader.load(parent.user_id),
          ctx.loaders.userProfileLoader.load(parent.user_id)
        ])

        if (!authUser) return null

        return {
          id: authUser.id,
          email: authUser.email ?? null,
          user_profile: profile as any // Supabase 查询类型和 UserProfile 不完全匹配，加断言
        }
      }
    }),

    // 艹！关联字段：文章评论列表
    comments: t.field({
      type: ['Comment'],
      description: '文章评论列表',
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
          .eq('content_id', parent.id)
          .eq('content_type', 'blog_post')
          .is('deleted_at', null) // 排除软删除的评论
          .is('parent_id', null) // 只返回顶级评论
          .order('created_at', { ascending: false }) // 按时间倒序
          .range(offset, offset + limit - 1)

        return (data ?? []) as any // 艹！Supabase 查询类型和 Comment 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：文章点赞列表
    likes: t.field({
      type: ['Like'],
      description: '文章点赞列表',
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
          .from('blog_post_likes')
          .select('*')
          .eq('post_id', parent.id)
          .order('created_at', { ascending: false }) // 按时间倒序
          .range(offset, offset + limit - 1)

        // 艹！转换为统一的 Like 类型格式
        return (data ?? []).map((like: any) => ({
          id: like.id,
          user_id: like.user_id,
          content_id: like.post_id,
          like_type: 'blog_post' as const,
          created_at: like.created_at
        })) as any // 艹！Supabase 查询类型转换后和 Like 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：文章分类列表
    categories: t.field({
      type: ['BlogCategory'],
      description: '文章分类列表',
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！通过 junction 表查询分类
        const { data: junctions } = await ctx.supabase
          .from('blog_post_categories')
          .select('category_id')
          .eq('post_id', parent.id)

        if (!junctions || junctions.length === 0) return []

        const categoryIds = junctions.map((j: any) => j.category_id)

        const { data: categories } = await ctx.supabase
          .from('blog_categories')
          .select('*')
          .in('id', categoryIds)
          .is('deleted_at', null) // 排除软删除的分类

        return (categories ?? []) as any // 艹！Supabase 查询类型和 BlogCategory 不完全匹配，加断言
      }
    }),

    // 艹！关联字段：文章标签列表
    tags: t.field({
      type: ['BlogTag'],
      description: '文章标签列表',
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！通过 junction 表查询标签
        const { data: junctions } = await ctx.supabase
          .from('blog_post_tags')
          .select('tag_id')
          .eq('post_id', parent.id)

        if (!junctions || junctions.length === 0) return []

        const tagIds = junctions.map((j: any) => j.tag_id)

        const { data: tags } = await ctx.supabase
          .from('blog_tags')
          .select('*')
          .in('id', tagIds)
          .is('deleted_at', null) // 排除软删除的标签

        return (tags ?? []) as any // 艹！Supabase 查询类型和 BlogTag 不完全匹配，加断言
      }
    }),

    // 当前用户是否已点赞（需要登录）
    isLiked: t.boolean({
      description: '当前用户是否已点赞',
      nullable: true,
      resolve: async (parent, _args, ctx: GraphQLContext) => {
        // 艹！使用 DataLoader 批量查询点赞状态，避免 N+1 查询！
        return await ctx.loaders.blogPostLikesLoader.load(parent.id)
      }
    }),

    // 艹！计算字段：阅读时长估算（分钟）
    readingTime: t.int({
      description: '阅读时长估算（分钟）',
      resolve: (parent) => {
        // 艹！平均阅读速度：每分钟200个中文字或250个英文词
        const wordCount = parent.content.length
        const minutes = Math.ceil(wordCount / 200)
        return Math.max(1, minutes) // 至少1分钟
      }
    }),

    // 艹！计算字段：是否被删除
    isDeleted: t.boolean({
      description: '是否被软删除',
      resolve: (parent) => !!parent.deleted_at
    })
  })
})
