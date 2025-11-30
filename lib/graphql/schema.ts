/**
 * Pothos GraphQL Schema Builder
 *
 * 艹！这是老王我用 Pothos 写的 TypeScript-first, Code-first GraphQL Schema！
 * 不像那个 SB Apollo Server 还要读 .graphql 文件，这个直接用 TypeScript 定义！
 */

import { builder } from './builder'

// 艹！导入所有类型定义（Pothos 使用副作用导入，导入即注册）
// 老王提醒：必须在定义 Query/Mutation 之前导入类型，否则字符串引用会报错！

// 基础类型（Connection 分页支持）
import './types/connection'

// 用户相关类型
import './types/user'
import './types/follow'

// 作品相关类型
import './types/artwork'
import './types/video'

// 评论和点赞类型
import './types/comment'
import './types/like'

// 博客系统类型
import './types/blog-post'
import './types/blog-category'
import './types/blog-tag'

// 论坛系统类型
import './types/forum-category'
import './types/forum-thread'
import './types/forum-reply'
import './types/forum-vote'

// 成就和排行榜类型
import './types/achievement-definition'
import './types/user-achievement'
import './types/leaderboard'

// Challenges 系统类型（挑战/竞赛功能）
import './types/challenge'
import './types/challenge-submission'
import './types/challenge-vote'
import './types/challenge-reward'

// 艹！导入 Input 类型（用于 Mutation 操作）
import './types/inputs/pagination-input'
import './types/inputs/blog-post-input'
import './types/inputs/comment-input'
import './types/inputs/forum-thread-input'
import './types/inputs/forum-reply-input'
import './types/inputs/forum-vote-input'
import './types/inputs/like-input'
import './types/inputs/follow-input'
import './types/inputs/challenge-input'

// 定义 Query 根类型
builder.queryType({
  description: 'GraphQL 查询入口',
  fields: (t) => ({
    // 测试查询：Hello World
    hello: t.string({
      description: '测试查询：返回 Hello World',
      resolve: () => 'Hello from Pothos GraphQL! 老王我的 Code-first Schema 跑起来了！'
    }),

    // 测试查询：当前时间
    currentTime: t.string({
      description: '返回当前服务器时间（ISO 格式）',
      resolve: () => new Date().toISOString()
    }),

    // 获取当前登录用户
    me: t.field({
      type: 'User', // 艹！用字符串引用，避免循环依赖！
      description: '获取当前登录用户信息（需要认证）',
      nullable: true,
      resolve: async (_parent, _args, ctx) => {
        // 艹！未登录返回null！
        if (!ctx.user) return null

        // 查询用户资料
        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', ctx.user.id)
          .single()

        return {
          id: ctx.user.id,
          email: ctx.user.email ?? null,
          user_profile: profile as any // 艹！Supabase 类型推断有问题，先用 any 绕过
        }
      }
    }),

    // 根据ID获取用户
    user: t.field({
      type: 'User',
      description: '根据用户ID获取用户信息',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '用户ID（UUID）' })
      },
      resolve: async (_parent, args, ctx) => {
        // 查询用户基础信息
        const { data: authUser } = await ctx.supabase.auth.admin.getUserById(args.id)
        if (!authUser.user) return null

        // 查询用户资料
        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', args.id)
          .single()

        return {
          id: authUser.user.id,
          email: authUser.user.email ?? null,
          user_profile: profile as any // 艹！Supabase 类型推断有问题，先用 any 绕过
        }
      }
    }),

    // 获取博客文章列表
    blogPosts: t.field({
      type: ['BlogPost'],
      description: '获取博客文章列表',
      args: {
        status: t.arg.string({
          required: false,
          description: '按状态筛选（draft/published）'
        }),
        limit: t.arg.int({
          required: false,
          description: '每页数量（默认10，最大100）'
        }),
        offset: t.arg.int({
          required: false,
          description: '偏移量（用于分页）'
        })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 10, 100)
        const offset = args.offset ?? 0

        // 构建查询
        let query = ctx.supabase
          .from('blog_posts')
          .select('*')
          .is('deleted_at', null) // 排除软删除的记录
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        // 按状态筛选
        if (args.status) {
          query = query.eq('status', args.status)
        } else {
          // 默认只返回已发布的文章（除非用户登录）
          if (!ctx.user) {
            query = query.eq('status', 'published')
          }
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching blog posts:', error)
          return []
        }

        return (data ?? []) as any
      }
    }),

    // 根据ID获取单个博客文章
    blogPost: t.field({
      type: 'BlogPost',
      description: '根据文章ID获取博客文章',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '文章ID（UUID）' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null) // 排除软删除的记录
          .single()

        if (error || !data) {
          if (error) console.error('Error fetching blog post:', error)
          return null
        }

        // 检查权限：草稿只有作者可以查看
        if ((data as any).status === 'draft' && ctx.user?.id !== (data as any).user_id) {
          return null
        }

        return data as any
      }
    }),

    // Relay-style 分页查询 (艹！这是老王我新加的 Connection 分页！)
    blogPostsConnection: t.connection({
      type: 'BlogPost',
      description: 'Relay-style 博客文章分页查询 (使用 cursor 分页)',
      args: {
        status: t.arg.string({
          required: false,
          description: '按状态筛选（draft/published）'
        }),
        orderBy: t.arg.string({
          required: false,
          description: '排序字段 (created_at/view_count/like_count)',
          defaultValue: 'created_at'
        }),
        orderDirection: t.arg.string({
          required: false,
          description: '排序方向 (asc/desc)',
          defaultValue: 'desc'
        })
      },
      resolve: async (_parent, args, ctx) => {
        // 艹！解析分页参数
        const limit = args.first ?? args.last ?? 10
        const after = args.after ? Buffer.from(args.after, 'base64').toString('utf-8') : null
        const before = args.before ? Buffer.from(args.before, 'base64').toString('utf-8') : null

        // 艹！验证排序字段（防止 SQL 注入）
        const validOrderFields = ['created_at', 'view_count', 'like_count']
        const orderBy = validOrderFields.includes(args.orderBy ?? 'created_at')
          ? (args.orderBy ?? 'created_at')
          : 'created_at'

        const orderDirection = (args.orderDirection === 'asc' || args.orderDirection === 'desc')
          ? args.orderDirection
          : 'desc'

        // 艹！构建查询
        let query = ctx.supabase
          .from('blog_posts')
          .select('*')
          .is('deleted_at', null)

        // 按状态筛选
        if (args.status) {
          query = query.eq('status', args.status)
        } else {
          // 默认只返回已发布的文章（除非用户登录）
          if (!ctx.user) {
            query = query.eq('status', 'published')
          }
        }

        // 艹！应用 cursor 过滤（after 或 before）
        if (after) {
          const [afterValue, afterId] = after.split('|')
          if (orderDirection === 'desc') {
            query = query.or(`${orderBy}.lt.${afterValue},and(${orderBy}.eq.${afterValue},id.lt.${afterId})`)
          } else {
            query = query.or(`${orderBy}.gt.${afterValue},and(${orderBy}.eq.${afterValue},id.gt.${afterId})`)
          }
        }

        if (before) {
          const [beforeValue, beforeId] = before.split('|')
          if (orderDirection === 'desc') {
            query = query.or(`${orderBy}.gt.${beforeValue},and(${orderBy}.eq.${beforeValue},id.gt.${beforeId})`)
          } else {
            query = query.or(`${orderBy}.lt.${beforeValue},and(${orderBy}.eq.${beforeValue},id.lt.${beforeId})`)
          }
        }

        // 艹！应用排序（Supabase 使用 range() 而不是 limit()）
        query = query
          .order(orderBy, { ascending: orderDirection === 'asc' })
          .order('id', { ascending: orderDirection === 'asc' })
          .range(0, limit) // range(0, limit) 返回 limit+1 条数据，用于判断是否有下一页

        const { data, error } = await query

        if (error) {
          console.error('Error fetching blog posts connection:', error)
          return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } }
        }

        // 艹！判断是否有更多数据
        const hasMore = (data?.length ?? 0) > limit
        const items = hasMore ? (data as any)!.slice(0, limit) : ((data ?? []) as any)

        // 艹！生成 edges 和 pageInfo
        const edges = items.map((post: any) => {
          const cursorValue = post[orderBy as keyof typeof post]
          const cursor = Buffer.from(`${cursorValue}|${post.id}`).toString('base64')
          return {
            cursor,
            node: post
          }
        })

        const pageInfo = {
          hasNextPage: args.first ? hasMore : false,
          hasPreviousPage: args.last ? hasMore : false,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
        }

        return { edges, pageInfo }
      }
    }),

    /**
     * 获取某个用户的博客文章列表
     */
    userBlogPosts: t.field({
      type: ['BlogPost'],
      description: '获取某个用户的博客文章列表（支持分页）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        status: t.arg.string({ required: false, description: '按状态筛选（draft/published）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('blog_posts')
          .select('*')
          .eq('author_id', args.userId)
          .is('deleted_at', null)

        // 如果不是作者本人，只返回已发布的文章
        if (ctx.user?.id !== args.userId) {
          query = query.eq('status', 'published')
        } else if (args.status) {
          // 作者本人可以按状态筛选
          query = query.eq('status', args.status)
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！博客分类和标签 Query（4个）
    // ========================================

    /**
     * 获取博客分类列表
     */
    blogCategories: t.field({
      type: ['BlogCategory'],
      description: '获取博客分类列表（支持分页）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('blog_categories')
          .select('*')
          .is('deleted_at', null)
          .order('post_count', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取博客标签列表
     */
    blogTags: t.field({
      type: ['BlogTag'],
      description: '获取博客标签列表（支持分页）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('blog_tags')
          .select('*')
          .is('deleted_at', null)
          .order('post_count', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个分类下的博客文章
     */
    blogPostsByCategory: t.field({
      type: ['BlogPost'],
      description: '获取某个分类下的博客文章（支持分页）',
      args: {
        categoryId: t.arg.id({ required: true, description: '分类ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！先查询关联表获取文章ID列表
        const { data: relations } = await ctx.supabase
          .from('blog_post_categories')
          .select('post_id')
          .eq('category_id', args.categoryId)

        if (!relations || relations.length === 0) {
          return []
        }

        const postIds = (relations as any).map((r: any) => r.post_id)

        // 艹！然后查询文章详情
        const { data } = await ctx.supabase
          .from('blog_posts')
          .select('*')
          .in('id', postIds)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个标签下的博客文章
     */
    blogPostsByTag: t.field({
      type: ['BlogPost'],
      description: '获取某个标签下的博客文章（支持分页）',
      args: {
        tagId: t.arg.id({ required: true, description: '标签ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！先查询关联表获取文章ID列表
        const { data: relations } = await ctx.supabase
          .from('blog_post_tags')
          .select('post_id')
          .eq('tag_id', args.tagId)

        if (!relations || relations.length === 0) {
          return []
        }

        const postIds = (relations as any).map((r: any) => r.post_id)

        // 艹！然后查询文章详情
        const { data } = await ctx.supabase
          .from('blog_posts')
          .select('*')
          .in('id', postIds)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！论坛分类和用户相关 Query（3个）
    // ========================================

    /**
     * 获取论坛分类列表
     */
    forumCategories: t.field({
      type: ['ForumCategory'],
      description: '获取论坛分类列表（支持分页）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('forum_categories')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个分类下的论坛主题
     */
    forumThreadsByCategory: t.field({
      type: ['ForumThread'],
      description: '获取某个分类下的论坛主题（支持分页）',
      args: {
        categoryId: t.arg.id({ required: true, description: '分类ID' }),
        status: t.arg.string({ required: false, description: '按状态筛选（open/closed/archived）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('forum_threads')
          .select('*')
          .eq('category_id', args.categoryId)
          .is('deleted_at', null)

        if (args.status) {
          query = query.eq('status', args.status)
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个用户的论坛主题
     */
    userForumThreads: t.field({
      type: ['ForumThread'],
      description: '获取某个用户的论坛主题（支持分页）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        status: t.arg.string({ required: false, description: '按状态筛选（open/closed/archived）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('forum_threads')
          .select('*')
          .eq('author_id', args.userId)
          .is('deleted_at', null)

        if (args.status) {
          query = query.eq('status', args.status)
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 艹！论坛主题列表查询（分页 + 过滤 + 排序）
    forumThreads: t.field({
      type: ['ForumThread'],
      description: '获取论坛主题列表',
      args: {
        categoryId: t.arg.id({ required: false, description: '按分类筛选' }),
        status: t.arg.string({ required: false, description: '按状态筛选（open/closed/archived）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' }),
        orderBy: t.arg.string({ required: false, description: '排序字段', defaultValue: 'created_at' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('forum_threads')
          .select('*')
          .is('deleted_at', null)

        if (args.categoryId) query = query.eq('category_id', args.categoryId)
        if (args.status) query = query.eq('status', args.status)

        const { data } = await query
          .order(args.orderBy ?? 'created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 艹！获取单个论坛主题
    forumThread: t.field({
      type: 'ForumThread',
      description: '根据ID获取论坛主题',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '主题ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('forum_threads')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        return data as any
      }
    }),

    // 艹！作品列表查询（分页 + 过滤）
    artworks: t.field({
      type: ['Artwork'],
      description: '获取作品列表（图片或视频）',
      args: {
        artworkType: t.arg.string({ required: false, description: '作品类型（image/video）' }),
        userId: t.arg.id({ required: false, description: '按用户筛选' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！根据 artwork_type 查询不同的表
        const table = args.artworkType === 'video' ? 'video_generation_history' : 'image_generations'

        let query = ctx.supabase
          .from(table as any)
          .select('*')

        if (args.userId) query = query.eq('user_id', args.userId)

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []).map((item: any) => ({
          ...item,
          artwork_type: args.artworkType ?? (table === 'video_generation_history' ? 'video' : 'image')
        }))
      }
    }),

    // 艹！排行榜查询（排序 + 分页）
    leaderboard: t.field({
      type: ['Leaderboard'],
      description: '获取排行榜（按leaderboard_score排序）',
      args: {
        limit: t.arg.int({ required: false, description: '返回前N名（默认100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 100, 500)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('user_stats')
          .select('*')
          .order('leaderboard_score', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！成就和统计相关 Query（8个）
    // ========================================

    /**
     * 获取成就定义列表
     */
    achievements: t.field({
      type: ['AchievementDefinition'],
      description: '获取所有成就定义列表（支持分页）',
      args: {
        category: t.arg.string({ required: false, description: '按分类筛选（video/blog/forum/social）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('achievement_definitions')
          .select('*')
          .eq('is_active', true)

        if (args.category) {
          query = query.eq('category', args.category)
        }

        const { data } = await query
          .order('points', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个用户的成就列表
     */
    userAchievements: t.field({
      type: ['UserAchievement'],
      description: '获取某个用户的成就列表（支持分页）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', args.userId)
          .order('earned_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取当前用户的成就列表
     */
    myAchievements: t.field({
      type: ['UserAchievement'],
      description: '获取当前用户的成就列表（需要认证，支持分页）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        if (!ctx.user) {
          throw new Error('需要登录才能查看自己的成就')
        }

        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('earned_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取单个成就定义
     */
    achievement: t.field({
      type: 'AchievementDefinition',
      description: '获取单个成就定义',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '成就ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('achievement_definitions')
          .select('*')
          .eq('id', args.id)
          .eq('is_active', true)
          .single()

        return data as any
      }
    }),

    /**
     * 获取博客文章点赞列表
     */
    blogPostLikes: t.field({
      type: ['Like'],
      description: '获取博客文章点赞列表（支持分页）',
      args: {
        postId: t.arg.id({ required: true, description: '文章ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('blog_post_likes')
          .select('*')
          .eq('post_id', args.postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return ((data ?? []) as any).map((row: any) => ({
          id: `blog_post_like_${row.post_id}_${row.user_id}`,
          user_id: row.user_id,
          target_id: row.post_id,
          target_type: 'blog_post' as const,
          created_at: row.created_at
        }))
      }
    }),

    /**
     * 获取作品点赞列表
     */
    artworkLikes: t.field({
      type: ['Like'],
      description: '获取作品点赞列表（支持分页）',
      args: {
        artworkId: t.arg.id({ required: true, description: '作品ID' }),
        artworkType: t.arg.string({ required: true, description: '作品类型（image/video）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('artwork_likes')
          .select('*')
          .eq('artwork_id', args.artworkId)
          .eq('artwork_type', args.artworkType)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return ((data ?? []) as any).map((row: any) => ({
          id: `artwork_like_${row.artwork_id}_${row.user_id}`,
          user_id: row.user_id,
          target_id: row.artwork_id,
          target_type: row.artwork_type as 'image' | 'video',
          created_at: row.created_at
        }))
      }
    }),

    /**
     * 获取用户的所有点赞记录
     */
    userLikes: t.field({
      type: 'String',
      description: '获取用户的所有点赞记录（返回JSON字符串，包含blog/artwork/comment点赞）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！查询博客点赞
        const { data: blogLikes } = await ctx.supabase
          .from('blog_post_likes')
          .select('*')
          .eq('user_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        // 艹！查询作品点赞
        const { data: artworkLikes } = await ctx.supabase
          .from('artwork_likes')
          .select('*')
          .eq('user_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        // 艹！查询评论点赞
        const { data: commentLikes } = await ctx.supabase
          .from('comment_likes')
          .select('*')
          .eq('user_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return JSON.stringify({
          blogLikes: blogLikes ?? [],
          artworkLikes: artworkLikes ?? [],
          commentLikes: commentLikes ?? [],
          total: (blogLikes?.length ?? 0) + (artworkLikes?.length ?? 0) + (commentLikes?.length ?? 0)
        })
      }
    }),

    /**
     * 获取关注列表（支持分页）
     */
    followList: t.field({
      type: ['Follow'],
      description: '获取关注关系列表（支持按关注者/被关注者筛选）',
      args: {
        followerId: t.arg.id({ required: false, description: '关注者ID' }),
        followingId: t.arg.id({ required: false, description: '被关注者ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('user_follows')
          .select('*')

        if (args.followerId) {
          query = query.eq('follower_id', args.followerId)
        }

        if (args.followingId) {
          query = query.eq('following_id', args.followingId)
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 艹！论坛回复查询（分页 + 嵌套）
    forumReplies: t.field({
      type: ['ForumReply'],
      description: '获取论坛回复列表',
      args: {
        threadId: t.arg.id({ required: false, description: '按主题筛选' }),
        parentId: t.arg.id({ required: false, description: '按父回复筛选（嵌套回复）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' }),
        orderBy: t.arg.string({ required: false, description: '排序字段', defaultValue: 'created_at' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('forum_replies')
          .select('*')
          .is('deleted_at', null)

        if (args.threadId) query = query.eq('thread_id', args.threadId)
        if (args.parentId) query = query.eq('parent_id', args.parentId)

        const { data } = await query
          .order(args.orderBy ?? 'created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 艹！评论查询（分页 + 嵌套）
    comments: t.field({
      type: ['Comment'],
      description: '获取评论列表',
      args: {
        contentId: t.arg.id({ required: false, description: '按内容ID筛选' }),
        contentType: t.arg.string({ required: false, description: '按内容类型筛选（blog_post/artwork/video）' }),
        parentId: t.arg.id({ required: false, description: '按父评论筛选（嵌套评论，最多2层）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' }),
        orderBy: t.arg.string({ required: false, description: '排序字段', defaultValue: 'created_at' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('comments')
          .select('*')
          .is('deleted_at', null)

        if (args.contentId) query = query.eq('content_id', args.contentId)
        if (args.contentType) query = query.eq('content_type', args.contentType)
        if (args.parentId) query = query.eq('parent_id', args.parentId)

        const { data } = await query
          .order(args.orderBy ?? 'created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！补充用户相关 Query（Week 32 Day 3-5）
    // ========================================

    // 获取用户列表（分页）
    users: t.field({
      type: ['User'],
      description: '获取用户列表（支持搜索和过滤）',
      args: {
        search: t.arg.string({ required: false, description: '搜索关键词（匹配用户名和邮箱）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！查询用户资料表（支持搜索）
        let query = ctx.supabase
          .from('user_profiles')
          .select('*')

        if (args.search) {
          query = query.or(`display_name.ilike.%${args.search}%`)
        }

        const { data: profiles } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!profiles || profiles.length === 0) return []

        // 艹！批量查询用户认证信息
        const userPromises = profiles.map(async (profile: any) => {
          const { data: authUser } = await ctx.supabase.auth.admin.getUserById(profile.user_id)
          if (!authUser.user) return null

          return {
            id: authUser.user.id,
            email: authUser.user.email ?? null,
            user_profile: profile
          }
        })

        const users = await Promise.all(userPromises)
        return users.filter(u => u !== null)
      }
    }),

    // 获取用户粉丝列表
    followers: t.field({
      type: ['Follow'],
      description: '获取用户的粉丝列表',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('user_follows')
          .select('*')
          .eq('following_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取用户关注列表
    following: t.field({
      type: ['Follow'],
      description: '获取用户关注的人列表',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！作品相关 Query（15个）
    // ========================================

    // 获取单个作品（通过ID）
    artwork: t.field({
      type: 'Artwork',
      description: '获取单个作品（图片或视频）',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '作品ID' }),
        type: t.arg.string({ required: true, description: '作品类型（image 或 video）' })
      },
      resolve: async (_parent, args, ctx) => {
        // 艹！根据类型查询不同的表
        if (args.type === 'video') {
          const { data } = await ctx.supabase
            .from('video_generation_history')
            .select('*')
            .eq('id', args.id)
            .single()

          if (!data) return null

          const videoData = data as any

          // 转换为 Artwork 格式
          return {
            id: videoData.id,
            user_id: videoData.user_id,
            artwork_type: 'video' as const,
            prompt: videoData.prompt,
            url: videoData.permanent_video_url ?? videoData.google_video_url ?? '',
            thumbnail_url: videoData.thumbnail_url,
            aspect_ratio: videoData.aspect_ratio,
            resolution: videoData.resolution,
            duration: videoData.duration,
            file_size_bytes: videoData.file_size_bytes,
            like_count: 0, // TODO: 从 artwork_likes 表统计
            view_count: 0, // TODO: 添加浏览统计
            is_public: true, // TODO: 添加隐私控制字段
            status: videoData.status,
            created_at: videoData.created_at,
            completed_at: videoData.completed_at
          } as any
        }

        // TODO: 支持 image 类型（需要 image_generations 表）
        throw new Error('暂不支持 image 类型作品查询，请使用 video 类型')
      }
    }),

    // 获取用户的所有作品
    userArtworks: t.field({
      type: ['Artwork'],
      description: '获取用户的所有作品（图片和视频）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        type: t.arg.string({ required: false, description: '过滤类型（image 或 video），不传则返回所有' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0
        const artworks: any[] = []

        // 艹！查询用户的视频作品
        if (!args.type || args.type === 'video') {
          const { data: videos } = await ctx.supabase
            .from('video_generation_history')
            .select('*')
            .eq('user_id', args.userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (videos) {
            artworks.push(...videos.map((v: any) => ({
              id: v.id,
              user_id: v.user_id,
              artwork_type: 'video' as const,
              prompt: v.prompt,
              url: v.permanent_video_url ?? v.google_video_url ?? '',
              thumbnail_url: v.thumbnail_url,
              aspect_ratio: v.aspect_ratio,
              resolution: v.resolution,
              duration: v.duration,
              file_size_bytes: v.file_size_bytes,
              like_count: 0,
              view_count: 0,
              is_public: true,
              status: v.status,
              created_at: v.created_at,
              completed_at: v.completed_at
            })))
          }
        }

        // TODO: 添加图片作品查询（需要 image_generations 表）

        return artworks
      }
    }),

    // 获取热门作品（按点赞数排序）
    trendingArtworks: t.field({
      type: ['Artwork'],
      description: '获取热门作品（按点赞数和浏览量排序）',
      args: {
        type: t.arg.string({ required: false, description: '过滤类型（image 或 video）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！暂时只支持视频，按创建时间排序（TODO: 添加点赞数统计）
        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 获取精选作品
    featuredArtworks: t.field({
      type: ['Artwork'],
      description: '获取精选作品（管理员推荐）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！暂时返回最新的完成作品（TODO: 添加 is_featured 字段）
        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 获取最近作品
    recentArtworks: t.field({
      type: ['Artwork'],
      description: '获取最近创建的作品',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 通过提示词搜索作品
    artworksByPrompt: t.field({
      type: ['Artwork'],
      description: '通过提示词搜索作品（支持模糊匹配）',
      args: {
        search: t.arg.string({ required: true, description: '搜索关键词' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .ilike('prompt', `%${args.search}%`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 按分辨率过滤作品
    artworksByResolution: t.field({
      type: ['Artwork'],
      description: '按分辨率过滤作品（720p 或 1080p）',
      args: {
        resolution: t.arg.string({ required: true, description: '分辨率（720p, 1080p）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('resolution', args.resolution)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 按宽高比过滤作品
    artworksByAspectRatio: t.field({
      type: ['Artwork'],
      description: '按宽高比过滤作品（16:9 或 9:16）',
      args: {
        aspectRatio: t.arg.string({ required: true, description: '宽高比（16:9, 9:16）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('aspect_ratio', args.aspectRatio)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 按时长过滤作品（视频）
    artworksByDuration: t.field({
      type: ['Artwork'],
      description: '按时长过滤视频作品（4秒、6秒或8秒）',
      args: {
        duration: t.arg.int({ required: true, description: '时长（秒）：4, 6, 8' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('duration', args.duration)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 获取当前用户的作品
    myArtworks: t.field({
      type: ['Artwork'],
      description: '获取当前登录用户的所有作品',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        if (!ctx.user) throw new Error('未登录，无法查看个人作品')

        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 获取用户点赞的作品列表
    likedArtworks: t.field({
      type: ['Artwork'],
      description: '获取用户点赞的作品列表',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！先查询用户点赞的作品ID列表
        const { data: likes } = await ctx.supabase
          .from('artwork_likes')
          .select('artwork_id, artwork_type')
          .eq('user_id', args.userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!likes || likes.length === 0) return []

        // 艹！分别查询图片和视频作品
        const videoIds = likes.filter((l: any) => l.artwork_type === "video").map((l: any) => l.artwork_id)
        const artworks: any[] = []

        if (videoIds.length > 0) {
          const { data: videos } = await ctx.supabase
            .from('video_generation_history')
            .select('*')
            .in('id', videoIds)
            .eq('status', 'completed')

          if (videos) {
            artworks.push(...videos.map((v: any) => ({
              id: v.id,
              user_id: v.user_id,
              artwork_type: 'video' as const,
              prompt: v.prompt,
              url: v.permanent_video_url ?? v.google_video_url ?? '',
              thumbnail_url: v.thumbnail_url,
              aspect_ratio: v.aspect_ratio,
              resolution: v.resolution,
              duration: v.duration,
              file_size_bytes: v.file_size_bytes,
              like_count: 0,
              view_count: 0,
              is_public: true,
              status: v.status,
              created_at: v.created_at,
              completed_at: v.completed_at
            })))
          }
        }

        // TODO: 添加图片作品查询

        return artworks
      }
    }),

    // 获取公开作品列表
    publicArtworks: t.field({
      type: ['Artwork'],
      description: '获取所有公开的作品（用于画廊展示）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        // 艹！暂时所有完成的视频都是公开的（TODO: 添加 is_public 字段）
        const { data: videos } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return []

        return videos.map((v: any) => ({
          id: v.id,
          user_id: v.user_id,
          artwork_type: 'video' as const,
          prompt: v.prompt,
          url: v.permanent_video_url ?? v.google_video_url ?? '',
          thumbnail_url: v.thumbnail_url,
          aspect_ratio: v.aspect_ratio,
          resolution: v.resolution,
          duration: v.duration,
          file_size_bytes: v.file_size_bytes,
          like_count: 0,
          view_count: 0,
          is_public: true,
          status: v.status,
          created_at: v.created_at,
          completed_at: v.completed_at
        })) as any
      }
    }),

    // 获取作品统计信息
    artworkStats: t.field({
      type: 'String', // TODO: 创建专门的 ArtworkStats 类型
      description: '获取作品统计信息（总数、分类统计等）',
      nullable: true,
      resolve: async (_parent, _args, ctx) => {
        // 艹！统计视频作品数量
        const { count: videoCount } = await ctx.supabase
          .from('video_generation_history')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')

        // TODO: 添加图片作品统计
        // TODO: 创建 ArtworkStats 类型并返回结构化数据

        return JSON.stringify({
          totalVideos: videoCount ?? 0,
          totalImages: 0,
          total: videoCount ?? 0
        })
      }
    }),

    // Relay 风格分页：获取作品列表
    artworksConnection: t.connection({
      type: 'Artwork',
      description: '获取作品列表（Relay 分页）',
      args: {
        type: t.arg.string({ required: false, description: '过滤类型（image 或 video）' })
      },
      resolve: async (_parent, args, ctx) => {
        // 艹！暂时只支持视频
        const limit = args.first ?? args.last ?? 20
        const offset = args.after ? parseInt(atob(args.after).split(':')[1]) + 1 : 0

        const { data: videos, count } = await ctx.supabase
          .from('video_generation_history')
          .select('*', { count: 'exact' })
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } }

        const edges = (videos as any).map((v: any, index: number) => ({
          cursor: btoa(`artwork:${offset + index}`),
          node: {
            id: v.id,
            user_id: v.user_id,
            artwork_type: 'video' as const,
            prompt: v.prompt,
            url: v.permanent_video_url ?? v.google_video_url ?? '',
            thumbnail_url: v.thumbnail_url,
            aspect_ratio: v.aspect_ratio,
            resolution: v.resolution,
            duration: v.duration,
            file_size_bytes: v.file_size_bytes,
            like_count: 0,
            view_count: 0,
            is_public: true,
            status: v.status,
            created_at: v.created_at,
            completed_at: v.completed_at
          } as any
        }))

        return {
          edges,
          pageInfo: {
            hasNextPage: (count ?? 0) > offset + limit,
            hasPreviousPage: offset > 0,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
          }
        }
      }
    }),

    // ========================================
    // 艹！视频相关 Query（10个）
    // ========================================

    // 获取单个视频（通过ID）
    video: t.field({
      type: 'Video',
      description: '获取单个视频详情',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '视频ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('id', args.id)
          .single()

        return data as any
      }
    }),

    // 获取视频列表（支持多种过滤）
    videos: t.field({
      type: ['Video'],
      description: '获取视频列表（支持多种过滤条件）',
      args: {
        status: t.arg.string({ required: false, description: '状态过滤（processing, completed, failed）' }),
        resolution: t.arg.string({ required: false, description: '分辨率过滤（720p, 1080p）' }),
        aspectRatio: t.arg.string({ required: false, description: '宽高比过滤（16:9, 9:16）' }),
        duration: t.arg.int({ required: false, description: '时长过滤（4, 6, 8）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('video_generation_history')
          .select('*')

        // 艹！应用过滤条件
        if (args.status) query = query.eq('status', args.status)
        if (args.resolution) query = query.eq('resolution', args.resolution)
        if (args.aspectRatio) query = query.eq('aspect_ratio', args.aspectRatio)
        if (args.duration) query = query.eq('duration', args.duration)

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取用户的视频列表
    userVideos: t.field({
      type: ['Video'],
      description: '获取指定用户的所有视频',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        status: t.arg.string({ required: false, description: '状态过滤（processing, completed, failed）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', args.userId)

        if (args.status) query = query.eq('status', args.status)

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取当前用户的视频列表
    myVideos: t.field({
      type: ['Video'],
      description: '获取当前登录用户的所有视频',
      args: {
        status: t.arg.string({ required: false, description: '状态过滤（processing, completed, failed）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        if (!ctx.user) throw new Error('未登录，无法查看个人视频')

        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', ctx.user.id)

        if (args.status) query = query.eq('status', args.status)

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取处理中的视频
    processingVideos: t.field({
      type: ['Video'],
      description: '获取当前用户正在处理的视频任务',
      resolve: async (_parent, _args, ctx) => {
        if (!ctx.user) throw new Error('未登录')

        const { data } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', ctx.user.id)
          .in('status', ['processing', 'downloading'])
          .order('created_at', { ascending: false })

        return (data ?? []) as any
      }
    }),

    // 获取失败的视频任务
    failedVideos: t.field({
      type: ['Video'],
      description: '获取当前用户失败的视频任务',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        if (!ctx.user) throw new Error('未登录')

        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 通过 operation_id 查询视频
    videoByOperationId: t.field({
      type: 'Video',
      description: '通过 Google Veo operation_id 查询视频',
      nullable: true,
      args: {
        operationId: t.arg.string({ required: true, description: 'Google Veo operation ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('operation_id', args.operationId)
          .single()

        return data as any
      }
    }),

    // 获取视频统计信息
    videoStats: t.field({
      type: 'String', // TODO: 创建 VideoStats 类型
      description: '获取视频统计信息（总数、状态分布等）',
      nullable: true,
      resolve: async (_parent, _args, ctx) => {
        // 艹！统计各状态的视频数量
        const { data: allVideos } = await ctx.supabase
          .from('video_generation_history')
          .select('status')

        if (!allVideos) return JSON.stringify({ total: 0 })

        const stats = (allVideos as any).reduce((acc: any, v: any) => {
          acc[v.status] = (acc[v.status] || 0) + 1
          return acc
        }, {})

        return JSON.stringify({
          total: allVideos.length,
          ...stats
        })
      }
    }),

    // Relay 分页：获取视频列表
    videosConnection: t.connection({
      type: 'Video',
      description: '获取视频列表（Relay 分页）',
      args: {
        status: t.arg.string({ required: false, description: '状态过滤' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = args.first ?? args.last ?? 20
        const offset = args.after ? parseInt(atob(args.after).split(':')[1]) + 1 : 0

        let query = ctx.supabase
          .from('video_generation_history')
          .select('*', { count: 'exact' })

        if (args.status) query = query.eq('status', args.status)

        const { data: videos, count } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!videos) return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } }

        const edges = (videos as any).map((v: any, index: number) => ({
          cursor: btoa(`video:${offset + index}`),
          node: v as any
        }))

        return {
          edges,
          pageInfo: {
            hasNextPage: (count ?? 0) > offset + limit,
            hasPreviousPage: offset > 0,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
          }
        }
      }
    }),

    // 获取最近完成的视频
    recentVideos: t.field({
      type: ['Video'],
      description: '获取最近完成的视频',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('video_generation_history')
          .select('*')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // ========================================
    // 艹！社交相关 Query（6个）
    // ========================================

    /**
     * 获取单个评论
     */
    comment: t.field({
      type: 'Comment',
      description: '获取单个评论',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '评论ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        return data as any
      }
    }),

    /**
     * 获取某个内容（博客/作品/视频）的评论列表
     */
    commentsByContent: t.field({
      type: ['Comment'],
      description: '获取某个内容的评论列表（支持分页）',
      args: {
        contentId: t.arg.id({ required: true, description: '内容ID（博客/作品/视频）' }),
        contentType: t.arg.string({ required: true, description: '内容类型（blog_post, artwork, video）' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('content_id', args.contentId)
          .eq('content_type', args.contentType)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个评论的回复列表
     */
    commentReplies: t.field({
      type: ['Comment'],
      description: '获取某个评论的回复列表（支持分页）',
      args: {
        parentId: t.arg.id({ required: true, description: '父评论ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('parent_id', args.parentId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取某个评论的点赞列表
     */
    commentLikes: t.field({
      type: ['Like'],
      description: '获取某个评论的点赞列表（支持分页）',
      args: {
        commentId: t.arg.id({ required: true, description: '评论ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comment_likes')
          .select('*')
          .eq('comment_id', args.commentId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return ((data ?? []) as any).map((row: any) => ({
          id: `comment_like_${row.comment_id}_${row.user_id}`,
          user_id: row.user_id,
          target_id: row.comment_id,
          target_type: 'comment' as const,
          created_at: row.created_at
        }))
      }
    }),

    /**
     * 获取某个用户的评论列表
     */
    userComments: t.field({
      type: ['Comment'],
      description: '获取某个用户的评论列表（支持分页）',
      args: {
        userId: t.arg.id({ required: true, description: '用户ID' }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('user_id', args.userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    /**
     * 获取当前用户的评论列表
     */
    myComments: t.field({
      type: ['Comment'],
      description: '获取当前用户的评论列表（需要认证，支持分页）',
      args: {
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量' })
      },
      resolve: async (_parent, args, ctx) => {
        if (!ctx.user) {
          throw new Error('需要登录才能查看自己的评论')
        }

        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        const { data } = await ctx.supabase
          .from('comments')
          .select('*')
          .eq('user_id', ctx.user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // =====================================================
    // 艹！Challenges 挑战系统 Queries（Week 32-34）
    // 老王出品，保证质量！
    // =====================================================

    // 获取所有挑战（分页 + 筛选）
    challenges: t.field({
      type: ['Challenge'],
      description: '获取所有挑战（分页 + 筛选）',
      args: {
        status: t.arg.string({
          required: false,
          description: '按状态筛选: draft | active | voting | closed'
        }),
        category: t.arg.string({
          required: false,
          description: '按分类筛选: general | creative | technical | artistic'
        }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量（用于分页）' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0

        let query = ctx.supabase
          .from('challenges')
          .select('*')
          .is('deleted_at', null)

        // 状态筛选
        if (args.status) {
          query = query.eq('status', args.status.toLowerCase())
        } else {
          // 默认只显示已发布的挑战（非草稿）
          query = query.neq('status', 'draft')
        }

        // 分类筛选
        if (args.category) {
          query = query.eq('category', args.category.toLowerCase())
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取单个挑战详情
    challenge: t.field({
      type: 'Challenge',
      description: '获取单个挑战详情',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '挑战ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        return data as any
      }
    }),

    // 获取挑战的所有提交作品（分页 + 排序）
    challengeSubmissions: t.field({
      type: ['ChallengeSubmission'],
      description: '获取挑战的所有提交作品（分页 + 排序）',
      args: {
        challengeId: t.arg.id({ required: true, description: '挑战ID' }),
        sortBy: t.arg.string({
          required: false,
          description: '排序方式: votes（投票数）| recent（提交时间）| rank（排名）'
        }),
        limit: t.arg.int({ required: false, description: '每页数量（默认20，最大100）' }),
        offset: t.arg.int({ required: false, description: '偏移量（用于分页）' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 20, 100)
        const offset = args.offset ?? 0
        const sortBy = args.sortBy ?? 'votes'

        let query = ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', args.challengeId)
          .is('deleted_at', null)

        // 排序
        if (sortBy === 'votes') {
          query = query.order('vote_count', { ascending: false })
        } else if (sortBy === 'recent') {
          query = query.order('submitted_at', { ascending: false })
        } else if (sortBy === 'rank') {
          query = query.order('rank', { ascending: true, nullsFirst: false })
        }

        const { data } = await query.range(offset, offset + limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取单个提交作品详情
    challengeSubmission: t.field({
      type: 'ChallengeSubmission',
      description: '获取单个提交作品详情',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '作品ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        return data as any
      }
    }),

    // 获取用户的投票记录
    myVotes: t.field({
      type: ['ChallengeVote'],
      description: '获取当前用户的投票记录（需要认证）',
      args: {
        challengeId: t.arg.id({ required: false, description: '挑战ID（可选，筛选指定挑战的投票）' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法查看投票记录')

        let query = ctx.supabase
          .from('challenge_votes')
          .select('*')
          .eq('user_id', user.id)
          .is('revoked_at', null)

        if (args.challengeId) {
          query = query.eq('challenge_id', args.challengeId)
        }

        const { data } = await query.order('voted_at', { ascending: false })

        return (data ?? []) as any
      }
    }),

    // 获取挑战排行榜（前100名）
    challengeLeaderboard: t.field({
      type: ['ChallengeSubmission'],
      description: '获取挑战排行榜（前100名）',
      args: {
        challengeId: t.arg.id({ required: true, description: '挑战ID' }),
        limit: t.arg.int({ required: false, description: '排行榜数量（默认100，最大100）' })
      },
      resolve: async (_parent, args, ctx) => {
        const limit = Math.min(args.limit ?? 100, 100)

        const { data } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('challenge_id', args.challengeId)
          .is('deleted_at', null)
          .order('rank', { ascending: true, nullsFirst: false })
          .range(0, limit - 1)

        return (data ?? []) as any
      }
    }),

    // 获取挑战统计信息
    challengeStatistics: t.field({
      type: 'String', // 艹！Pothos 默认没有 JSON 类型，用 String 返回 JSON 字符串
      description: '获取挑战统计信息（总提交数、参与人数、总投票数等）',
      nullable: true,
      args: {
        challengeId: t.arg.id({ required: true, description: '挑战ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const { data, error } = await ctx.supabase
          .rpc('get_challenge_statistics', {
            challenge_uuid: args.challengeId
          })

        if (error) throw new Error(`获取统计信息失败: ${error.message}`)

        // RPC 返回的是单行记录，取第一条，序列化为 JSON 字符串
        const result = (data as any)?.[0]
        return result ? JSON.stringify(result) : null
      }
    }),

    // 获取用户的挑战奖励记录
    myRewards: t.field({
      type: ['ChallengeReward'],
      description: '获取当前用户的挑战奖励记录（需要认证）',
      args: {
        challengeId: t.arg.id({ required: false, description: '挑战ID（可选，筛选指定挑战的奖励）' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法查看奖励记录')

        let query = ctx.supabase
          .from('challenge_rewards')
          .select('*')
          .eq('user_id', user.id)

        if (args.challengeId) {
          query = query.eq('challenge_id', args.challengeId)
        }

        const { data } = await query.order('awarded_at', { ascending: false })

        return (data ?? []) as any
      }
    })
  })
})

// 定义 Mutation 根类型（暂时为空）
builder.mutationType({
  description: 'GraphQL 变更操作入口',
  fields: (t) => ({
    // 测试 Mutation：Echo
    echo: t.string({
      description: '测试 Mutation：回显输入的消息',
      args: {
        message: t.arg.string({ required: true, description: '要回显的消息' })
      },
      resolve: (_parent, args) => `Echo: ${args.message}`
    }),

    // 艹！博客文章 CRUD Mutations
    createBlogPost: t.field({
      type: 'BlogPost',
      description: '创建博客文章',
      args: {
        // 艹！扁平化参数，避免定义 Input 类型
        title: t.arg.string({ required: true, description: '标题' }),
        slug: t.arg.string({ required: false, description: 'URL Slug' }),
        content: t.arg.string({ required: true, description: '内容（Markdown）' }),
        excerpt: t.arg.string({ required: false, description: '摘要' }),
        coverImageUrl: t.arg.string({ required: false, description: '封面图URL' }),
        status: t.arg.string({ required: false, description: '状态（draft/published）' }),
        categoryIds: t.arg.stringList({ required: false, description: '分类ID列表' }),
        tagIds: t.arg.stringList({ required: false, description: '标签ID列表' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法创建博客文章')

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .insert({
            author_id: user.id,
            title: args.title,
            slug: args.slug ?? args.title.toLowerCase().replace(/\s+/g, '-'),
            content: args.content,
            excerpt: args.excerpt,
            cover_image_url: args.coverImageUrl,
            status: args.status ?? 'draft',
            published_at: args.status === 'published' ? new Date().toISOString() : null,
            category_ids: args.categoryIds ?? [],
            tag_ids: args.tagIds ?? []
          })
          .select()
          .single()

        if (error) throw new Error(`创建博客文章失败: ${error.message}`)
        return data as any
      }
    }),

    updateBlogPost: t.field({
      type: 'BlogPost',
      description: '更新博客文章',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '博客文章ID' }),
        // 艹！扁平化参数，避免定义 Input 类型
        title: t.arg.string({ required: false, description: '标题' }),
        slug: t.arg.string({ required: false, description: 'URL Slug' }),
        content: t.arg.string({ required: false, description: '内容（Markdown）' }),
        excerpt: t.arg.string({ required: false, description: '摘要' }),
        coverImageUrl: t.arg.string({ required: false, description: '封面图URL' }),
        status: t.arg.string({ required: false, description: '状态（draft/published）' }),
        categoryIds: t.arg.stringList({ required: false, description: '分类ID列表' }),
        tagIds: t.arg.stringList({ required: false, description: '标签ID列表' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法更新博客文章')

        // 艹！构建更新数据对象
        const updateData: any = {}
        if (args.title) updateData.title = args.title
        if (args.slug) updateData.slug = args.slug
        if (args.content) updateData.content = args.content
        if (args.excerpt) updateData.excerpt = args.excerpt
        if (args.coverImageUrl) updateData.cover_image_url = args.coverImageUrl
        if (args.status) updateData.status = args.status
        if (args.categoryIds) updateData.category_ids = args.categoryIds
        if (args.tagIds) updateData.tag_ids = args.tagIds

        const { data, error } = await ctx.supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', args.id)
          .eq('author_id', user.id) // 只能更新自己的文章
          .select()
          .single()

        if (error) throw new Error(`更新博客文章失败: ${error.message}`)
        return data as any
      }
    }),

    deleteBlogPost: t.boolean({
      description: '删除博客文章（软删除）',
      args: {
        id: t.arg.id({ required: true, description: '博客文章ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法删除博客文章')

        const { error } = await ctx.supabase
          .from('blog_posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)
          .eq('author_id', user.id) // 只能删除自己的文章

        if (error) throw new Error(`删除博客文章失败: ${error.message}`)
        return true
      }
    }),

    // 艹！评论 Mutations
    createComment: t.field({
      type: 'Comment',
      description: '创建评论',
      args: {
        // 艹！扁平化参数
        contentId: t.arg.id({ required: true, description: '内容ID' }),
        contentType: t.arg.string({ required: true, description: '内容类型（blog_post/artwork/video）' }),
        content: t.arg.string({ required: true, description: '评论内容' }),
        parentId: t.arg.id({ required: false, description: '父评论ID（回复评论时使用）' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法创建评论')

        const { data, error } = await ctx.supabase
          .from('comments')
          .insert({
            user_id: user.id,
            content_id: args.contentId,
            content_type: args.contentType,
            content: args.content,
            parent_id: args.parentId
          })
          .select()
          .single()

        if (error) throw new Error(`创建评论失败: ${error.message}`)
        return data as any
      }
    }),

    // 艹！点赞 Mutations
    createLike: t.field({
      type: 'Like',
      description: '点赞',
      args: {
        // 艹！扁平化参数
        targetId: t.arg.id({ required: true, description: '目标ID（博客/作品/视频ID）' }),
        targetType: t.arg.string({ required: true, description: '目标类型（blog_post/artwork/video）' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法点赞')

        const { data, error } = await ctx.supabase
          .from('likes')
          .insert({
            user_id: user.id,
            target_id: args.targetId,
            target_type: args.targetType
          })
          .select()
          .single()

        if (error) throw new Error(`点赞失败: ${error.message}`)
        return data as any
      }
    }),

    deleteLike: t.boolean({
      description: '取消点赞',
      args: {
        // 艹！扁平化参数
        targetId: t.arg.id({ required: true, description: '目标ID' }),
        targetType: t.arg.string({ required: true, description: '目标类型' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法取消点赞')

        const { error } = await ctx.supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', args.targetId)
          .eq('target_type', args.targetType)

        if (error) throw new Error(`取消点赞失败: ${error.message}`)
        return true
      }
    }),

    // 艹！关注 Mutations
    createFollow: t.field({
      type: 'Follow',
      description: '关注用户',
      args: {
        // 艹！扁平化参数
        followingId: t.arg.id({ required: true, description: '被关注用户ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法关注用户')

        const { data, error } = await ctx.supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: args.followingId
          })
          .select()
          .single()

        if (error) throw new Error(`关注失败: ${error.message}`)
        return data as any
      }
    }),

    deleteFollow: t.boolean({
      description: '取消关注',
      args: {
        // 艹！扁平化参数
        followingId: t.arg.id({ required: true, description: '被取消关注的用户ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法取消关注')

        const { error } = await ctx.supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', args.followingId)

        if (error) throw new Error(`取消关注失败: ${error.message}`)
        return true
      }
    }),

    // 艹！论坛主题 Mutations
    createForumThread: t.field({
      type: 'ForumThread',
      description: '创建论坛主题',
      args: {
        // 艹！扁平化参数，避免定义 Input 类型
        categoryId: t.arg.id({ required: true, description: '分类ID' }),
        title: t.arg.string({ required: true, description: '主题标题' }),
        content: t.arg.string({ required: true, description: '主题内容（Markdown）' }),
        tagIds: t.arg.stringList({ required: false, description: '标签ID列表' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法创建论坛主题')

        const { data, error } = await ctx.supabase
          .from('forum_threads')
          .insert({
            category_id: args.categoryId,
            author_id: user.id,
            title: args.title,
            content: args.content,
            tag_ids: args.tagIds ?? []
          })
          .select()
          .single()

        if (error) throw new Error(`创建论坛主题失败: ${error.message}`)
        return data as any
      }
    }),

    // 艹！论坛回复 Mutations
    createForumReply: t.field({
      type: 'ForumReply',
      description: '创建论坛回复',
      args: {
        // 艹！扁平化参数
        threadId: t.arg.id({ required: true, description: '主题ID' }),
        content: t.arg.string({ required: true, description: '回复内容（Markdown）' }),
        parentId: t.arg.id({ required: false, description: '父回复ID（嵌套回复时使用）' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法创建论坛回复')

        const { data, error } = await ctx.supabase
          .from('forum_replies')
          .insert({
            thread_id: args.threadId,
            author_id: user.id,
            content: args.content,
            parent_id: args.parentId
          })
          .select()
          .single()

        if (error) throw new Error(`创建论坛回复失败: ${error.message}`)
        return data as any
      }
    }),

    // 艹！论坛投票 Mutations
    createForumVote: t.field({
      type: 'ForumVote',
      description: '创建论坛投票（upvote/downvote）',
      args: {
        // 艹！扁平化参数
        targetType: t.arg.string({ required: true, description: '投票目标类型（thread/reply）' }),
        targetId: t.arg.id({ required: true, description: '投票目标ID' }),
        voteType: t.arg.string({ required: true, description: '投票类型（upvote/downvote）' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法投票')

        const { data, error } = await ctx.supabase
          .from('forum_votes')
          .insert({
            user_id: user.id,
            target_type: args.targetType,
            target_id: args.targetId,
            vote_type: args.voteType
          })
          .select()
          .single()

        if (error) throw new Error(`投票失败: ${error.message}`)
        return data as any
      }
    }),

    updateForumVote: t.field({
      type: 'ForumVote',
      description: '更新论坛投票（从upvote改为downvote或反之）',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '投票ID' }),
        // 艹！扁平化参数
        voteType: t.arg.string({ required: true, description: '新的投票类型（upvote/downvote）' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法更新投票')

        const { data, error } = await ctx.supabase
          .from('forum_votes')
          .update({ vote_type: args.voteType })
          .eq('id', args.id)
          .eq('user_id', user.id) // 只能更新自己的投票
          .select()
          .single()

        if (error) throw new Error(`更新投票失败: ${error.message}`)
        return data as any
      }
    }),

    deleteForumVote: t.boolean({
      description: '删除论坛投票（取消投票）',
      args: {
        // 艹！扁平化参数
        targetType: t.arg.string({ required: true, description: '投票目标类型（thread/reply）' }),
        targetId: t.arg.id({ required: true, description: '投票目标ID' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法删除投票')

        const { error } = await ctx.supabase
          .from('forum_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', args.targetType)
          .eq('target_id', args.targetId)

        if (error) throw new Error(`删除投票失败: ${error.message}`)
        return true
      }
    }),

    // =====================================================
    // 艹！Challenges 挑战系统 Mutations（Week 32-34）
    // 老王出品，保证质量！
    // =====================================================

    // 创建挑战（仅管理员）
    createChallenge: t.field({
      type: 'Challenge',
      description: '创建挑战（仅管理员）',
      args: {
        // 艹！扁平化参数，这个憨批参数最多
        title: t.arg.string({ required: true, description: '挑战标题' }),
        description: t.arg.string({ required: true, description: '挑战描述（Markdown）' }),
        rules: t.arg.string({ required: false, description: '挑战规则（Markdown）' }),
        category: t.arg.string({ required: false, description: '挑战分类（general/art/photo/video等）' }),
        coverImageUrl: t.arg.string({ required: false, description: '封面图URL' }),
        prizes: t.arg.string({ required: false, description: '奖品信息（JSON字符串）' }),
        startAt: t.arg.string({ required: true, description: '开始时间（ISO 8601）' }),
        endAt: t.arg.string({ required: true, description: '结束时间（ISO 8601）' }),
        votingEndsAt: t.arg.string({ required: true, description: '投票结束时间（ISO 8601）' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法创建挑战')

        // 检查管理员权限
        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        // 艹！Supabase 类型推断问题，加个类型断言
        if (!profile || (profile as any).role !== 'admin') {
          throw new Error('权限不足，仅管理员可创建挑战')
        }

        const { data, error } = await ctx.supabase
          .from('challenges')
          .insert({
            title: args.title,
            description: args.description,
            rules: args.rules,
            category: args.category?.toLowerCase() ?? 'general',
            cover_image_url: args.coverImageUrl,
            prizes: args.prizes,
            start_at: args.startAt,
            end_at: args.endAt,
            voting_ends_at: args.votingEndsAt,
            status: 'draft',  // 初始状态为草稿
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw new Error(`创建挑战失败: ${error.message}`)
        return data as any
      }
    }),

    // 更新挑战（仅管理员）
    updateChallenge: t.field({
      type: 'Challenge',
      description: '更新挑战（仅管理员）',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '挑战ID' }),
        // 艹！扁平化参数，所有字段都是可选的
        title: t.arg.string({ required: false, description: '挑战标题' }),
        description: t.arg.string({ required: false, description: '挑战描述（Markdown）' }),
        rules: t.arg.string({ required: false, description: '挑战规则（Markdown）' }),
        category: t.arg.string({ required: false, description: '挑战分类' }),
        coverImageUrl: t.arg.string({ required: false, description: '封面图URL' }),
        prizes: t.arg.string({ required: false, description: '奖品信息（JSON字符串）' }),
        startAt: t.arg.string({ required: false, description: '开始时间（ISO 8601）' }),
        endAt: t.arg.string({ required: false, description: '结束时间（ISO 8601）' }),
        votingEndsAt: t.arg.string({ required: false, description: '投票结束时间（ISO 8601）' }),
        status: t.arg.string({ required: false, description: '状态（draft/active/voting/ended/cancelled）' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法更新挑战')

        // 检查管理员权限
        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        // 艹！Supabase 类型推断问题，加个类型断言
        if (!profile || (profile as any).role !== 'admin') {
          throw new Error('权限不足，仅管理员可更新挑战')
        }

        // 构建更新对象（仅包含提供的字段）
        const updateData: any = {}
        if (args.title) updateData.title = args.title
        if (args.description) updateData.description = args.description
        if (args.rules !== undefined) updateData.rules = args.rules
        if (args.category) updateData.category = args.category.toLowerCase()
        if (args.coverImageUrl !== undefined) updateData.cover_image_url = args.coverImageUrl
        if (args.prizes) updateData.prizes = args.prizes
        if (args.startAt) updateData.start_at = args.startAt
        if (args.endAt) updateData.end_at = args.endAt
        if (args.votingEndsAt) updateData.voting_ends_at = args.votingEndsAt
        if (args.status) updateData.status = args.status.toLowerCase()

        const { data, error } = await ctx.supabase
          .from('challenges')
          .update(updateData)
          .eq('id', args.id)
          .is('deleted_at', null)
          .select()
          .single()

        if (error) throw new Error(`更新挑战失败: ${error.message}`)
        return data as any
      }
    }),

    // 删除挑战（软删除，仅管理员）
    deleteChallenge: t.boolean({
      description: '删除挑战（软删除，仅管理员）',
      args: {
        id: t.arg.id({ required: true, description: '挑战ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法删除挑战')

        // 检查管理员权限
        const { data: profile } = await ctx.supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        // 艹！Supabase 类型推断问题，加个类型断言
        if (!profile || (profile as any).role !== 'admin') {
          throw new Error('权限不足，仅管理员可删除挑战')
        }

        const { error } = await ctx.supabase
          .from('challenges')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)

        if (error) throw new Error(`删除挑战失败: ${error.message}`)
        return true
      }
    }),

    // 提交挑战作品
    submitChallengeEntry: t.field({
      type: 'ChallengeSubmission',
      description: '提交挑战作品',
      args: {
        // 艹！扁平化参数
        challengeId: t.arg.id({ required: true, description: '挑战ID' }),
        title: t.arg.string({ required: true, description: '作品标题' }),
        description: t.arg.string({ required: false, description: '作品描述（Markdown）' }),
        mediaUrl: t.arg.string({ required: true, description: '作品媒体URL' }),
        mediaType: t.arg.string({ required: true, description: '媒体类型（image/video）' }),
        thumbnailUrl: t.arg.string({ required: false, description: '缩略图URL' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法提交作品')

        // 检查挑战是否存在且处于可提交状态
        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', args.challengeId)
          .is('deleted_at', null)
          .single()

        if (!challenge) throw new Error('挑战不存在')
        // 艹！Supabase 类型推断问题，加类型断言
        if ((challenge as any).status !== 'active') throw new Error('挑战不在进行中，无法提交作品')
        if (new Date() > new Date((challenge as any).end_at)) throw new Error('提交截止时间已过')

        const { data, error } = await ctx.supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: args.challengeId,
            user_id: user.id,
            title: args.title,
            description: args.description,
            media_url: args.mediaUrl,
            media_type: args.mediaType.toLowerCase(),
            thumbnail_url: args.thumbnailUrl
          })
          .select()
          .single()

        if (error) throw new Error(`提交作品失败: ${error.message}`)
        return data as any
      }
    }),

    // 更新挑战作品
    updateChallengeEntry: t.field({
      type: 'ChallengeSubmission',
      description: '更新挑战作品',
      nullable: true,
      args: {
        id: t.arg.id({ required: true, description: '作品ID' }),
        // 艹！扁平化参数，所有字段可选
        title: t.arg.string({ required: false, description: '作品标题' }),
        description: t.arg.string({ required: false, description: '作品描述（Markdown）' }),
        thumbnailUrl: t.arg.string({ required: false, description: '缩略图URL' })
      },
      resolve: async (_parent, args, ctx) => {
        const user = ctx.user
        if (!user) throw new Error('未登录，无法更新作品')

        // 检查作品是否属于当前用户
        const { data: submission } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        if (!submission) throw new Error('作品不存在')
        // 艹！Supabase 类型推断问题，加类型断言
        if ((submission as any).user_id !== user.id) throw new Error('无权修改他人的作品')

        // 检查挑战是否仍可编辑
        const { data: challenge } = await ctx.supabase
          .from('challenges')
          .select('*')
          .eq('id', (submission as any).challenge_id)
          .single()

        // 艹！Supabase 类型推断问题，加类型断言
        if (new Date() > new Date((challenge as any).end_at)) throw new Error('提交截止时间已过，无法修改作品')

        // 构建更新对象
        const updateData: any = {}
        if (args.title) updateData.title = args.title
        if (args.description !== undefined) updateData.description = args.description
        if (args.thumbnailUrl !== undefined) updateData.thumbnail_url = args.thumbnailUrl

        const { data, error } = await ctx.supabase
          .from('challenge_submissions')
          .update(updateData)
          .eq('id', args.id)
          .select()
          .single()

        if (error) throw new Error(`更新作品失败: ${error.message}`)
        return data as any
      }
    }),

    // 删除挑战作品（软删除）
    deleteChallengeEntry: t.boolean({
      description: '删除挑战作品（软删除）',
      args: {
        id: t.arg.id({ required: true, description: '作品ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法删除作品')

        // 检查作品是否属于当前用户
        const { data: submission } = await ctx.supabase
          .from('challenge_submissions')
          .select('*')
          .eq('id', args.id)
          .is('deleted_at', null)
          .single()

        if (!submission) throw new Error('作品不存在')
        // 艹！Supabase 类型推断问题，加类型断言
        if ((submission as any).user_id !== user.id) throw new Error('无权删除他人的作品')

        const { error } = await ctx.supabase
          .from('challenge_submissions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', args.id)

        if (error) throw new Error(`删除作品失败: ${error.message}`)
        return true
      }
    }),

    // 投票（带防作弊检查）
    voteChallengeSubmission: t.field({
      type: 'ChallengeVote',
      description: '为挑战作品投票（带防作弊检查）',
      args: {
        submissionId: t.arg.id({ required: true, description: '作品ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法投票')

        // 获取客户端IP（从 request headers）
        // 注意：这需要在 context 中传递 request 对象
        const ipAddress = ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] ||
                         ctx.request?.headers.get('x-real-ip') ||
                         'unknown'
        const userAgent = ctx.request?.headers.get('user-agent') || null

        // 调用 RPC 函数进行投票（包含所有防作弊逻辑）
        const { data, error } = await ctx.supabase
          .rpc('cast_vote', {
            p_submission_id: args.submissionId,
            p_user_id: user.id,
            p_ip_address: ipAddress,
            p_user_agent: userAgent
          })

        if (error) throw new Error(`投票失败: ${error.message}`)

        // 查询刚创建的投票记录
        const { data: vote } = await ctx.supabase
          .from('challenge_votes')
          .select('*')
          .eq('id', data)
          .single()

        // 艹！Supabase 类型推断问题，加类型断言
        return vote as any
      }
    }),

    // 撤回投票
    revokeVote: t.boolean({
      description: '撤回投票',
      args: {
        voteId: t.arg.id({ required: true, description: '投票ID' })
      },
      resolve: async (_parent, args, ctx) => {
    const argsAny = args as any;
        const user = ctx.user
        if (!user) throw new Error('未登录，无法撤回投票')

        // 调用 RPC 函数撤回投票
        const { data, error } = await ctx.supabase
          .rpc('revoke_vote', {
            p_vote_id: args.voteId,
            p_user_id: user.id
          })

        if (error) throw new Error(`撤回投票失败: ${error.message}`)
        return data as any
      }
    })
  })
})

// 艹！定义 Subscription 根类型（Week 8新增：实时推送支持）
builder.subscriptionType({
  description: 'GraphQL 订阅入口（实时推送）',
  fields: (t) => ({
    // 艹！订阅新发布的博客文章（实时推送）
    newBlogPost: t.field({
      type: 'BlogPost',
      description: '订阅新发布的博客文章（实时推送）',
      nullable: true,
      subscribe: async function* (_parent, _args, ctx) {
        // 艹！这是一个异步生成器函数，用于推送新文章
        // 每5秒检查一次数据库是否有新文章（简化实现，生产环境应该用数据库触发器 + Redis Pub/Sub）
        let lastCheckTime = new Date()

        while (true) {
          // 查询最近发布的新文章
          const { data: newPosts } = await ctx.supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .gte('published_at', lastCheckTime.toISOString())
            .order('published_at', { ascending: false })
            .limit(1)

          // 艹！如果有新文章，推送出去！
          if (newPosts && newPosts.length > 0) {
            const post = newPosts[0] as any // 艹！Supabase 类型推断问题，加类型断言
            lastCheckTime = new Date(post.published_at)

            // 获取作者信息
            const { data: authUser } = await ctx.supabase.auth.admin.getUserById(post.user_id)
            const { data: profile } = await ctx.supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', post.user_id)
              .single()

            yield {
              ...post,
              author: authUser?.user ? {
                id: authUser.user.id,
                email: authUser.user.email ?? null,
                user_profile: profile
              } : null
            }
          }

          // 艹！等待5秒再检查
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      },
      resolve: (post) => post
    }),

    // 艹！订阅服务器时间（测试用，每秒推送一次）
    currentTime: t.string({
      description: '订阅服务器时间（每秒推送，用于测试Subscription功能）',
      subscribe: async function* () {
        // 艹！每秒推送一次当前时间
        while (true) {
          yield new Date().toISOString()
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      },
      resolve: (time) => time
    })
  })
})

// 艹！导出 GraphQL Schema（类型已在文件开头导入）
export const schema = builder.toSchema()
