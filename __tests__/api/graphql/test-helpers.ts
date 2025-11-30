/**
 * GraphQL 测试辅助工具
 * 老王备注：使用 graphql-yoga 的测试方法，避免 graphql() 函数的模块实例问题
 *
 * 艹！之前老王我尝试了各种方法修复 "Cannot use GraphQL from another realm" 错误：
 * - ✗ 使用 vitest.config.ts 别名配置
 * - ✗ 使用 package.json pnpm.overrides
 * - ✗ 使用 .npmrc public-hoist-pattern
 * - ✗ 在测试环境重新构建 schema
 *
 * 最终解决方案：使用 graphql-yoga 的测试方法，通过 HTTP 请求测试，完全绕过 graphql() 函数！
 */

import { createYoga } from 'graphql-yoga'
import { schema } from '@/lib/graphql/schema'
import { createGraphQLContext, GraphQLContext } from '@/lib/graphql/context'
import type { User } from '@supabase/supabase-js'

/**
 * 创建测试用的 Yoga GraphQL 服务器
 * 艹！这个函数创建一个可测试的 graphql-yoga 实例
 */
export function createTestYoga(options: { user?: User | null } = {}) {
  return createYoga({
    schema,
    graphqlEndpoint: '/api/graphql',

    // 艹！自定义 context 工厂，注入 mock 用户和 Supabase
    context: async ({ request }) => {
      // 创建 mock Supabase 客户端
      // 艹！创建 Mock BlogPost 测试数据
      const mockBlogPosts = [
        createMockBlogPost({
          id: 'post-1',
          user_id: options.user?.id || 'author-1',
          title: 'Test Blog Post 1',
          slug: 'test-blog-post-1',
          content: 'This is test content 1',
          excerpt: 'This is excerpt 1',
          cover_image_url: 'https://example.com/cover1.jpg',
          status: 'published',
          published_at: new Date().toISOString(),
          view_count: 100,
          like_count: 10,
          comment_count: 5,
          meta_title: 'Meta Title 1',
          meta_description: 'Meta Description 1',
          meta_keywords: 'test,blog,post',
        }),
        createMockBlogPost({
          id: 'post-2',
          user_id: options.user?.id || 'author-2',
          title: 'Test Blog Post 2',
          slug: 'test-blog-post-2',
          content: 'This is test content 2',
          excerpt: 'This is excerpt 2',
          cover_image_url: null,
          status: 'published',
          published_at: new Date().toISOString(),
          view_count: 50,
          like_count: 5,
          comment_count: 2,
          meta_title: null,
          meta_description: null,
          meta_keywords: null,
        }),
      ]

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: options.user || null }, error: null }),
          admin: {
            getUserById: async (id: string) => {
              // 艹！如果查询的是当前登录用户，返回用户数据
              if (options.user && id === options.user.id) {
                return {
                  data: { user: options.user },
                  error: null,
                }
              }
              // 艹！如果查询的是其他用户，返回 null（模拟用户不存在）
              return {
                data: { user: null },
                error: null,
              }
            },
            listUsers: async () => ({
              data: { users: options.user ? [options.user] : [] },
              error: null,
            }),
          },
        },
        from: (table: string) => {
          // 艹！创建一个可链式调用的 query builder mock
          const createQueryBuilder = (): any => ({
            select: (columns?: string) => createQueryBuilder(),
            eq: (column: string, value: any) => createQueryBuilder(),
            in: (column: string, values: any[]) => createQueryBuilder(),
            is: (column: string, value: any) => createQueryBuilder(),
            order: (column: string, options?: any) => createQueryBuilder(),
            range: (from: number, to: number) => createQueryBuilder(),
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            // 艹！根据表名返回对应的测试数据
            then: (resolve: any) => {
              if (table === 'blog_posts') {
                return resolve({ data: mockBlogPosts, error: null })
              } else if (table === 'user_profiles') {
                // 艹！返回用户资料数据
                return resolve({
                  data: options.user ? [{
                    user_id: options.user.id,
                    display_name: 'Test User',
                    avatar_url: 'https://example.com/avatar.jpg',
                    bio: 'Test bio',
                  }] : [],
                  error: null
                })
              }
              return resolve({ data: [], error: null })
            },
          })
          return createQueryBuilder()
        },
      } as any

      // 艹！创建 Mock DataLoaders（简化版，不依赖真实 Supabase）
      const mockLoaders = {
        userLoader: {
          load: async (userId: string) => {
            // 艹！如果查询当前用户，返回用户数据
            if (options.user && userId === options.user.id) {
              return options.user
            }
            return null
          }
        },
        userProfileLoader: {
          load: async (userId: string) => {
            // 艹！如果查询当前用户的资料，返回 Mock 资料
            if (options.user && userId === options.user.id) {
              return {
                user_id: userId,
                display_name: 'Test User',
                avatar_url: 'https://example.com/avatar.jpg',
                bio: 'Test bio',
                website_url: null,
                twitter_handle: null,
                instagram_handle: null,
                github_handle: null,
                location: null,
                follower_count: 0,
                following_count: 0,
                post_count: 0,
                artwork_count: 0,
                total_likes: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            }
            return null
          }
        },
        blogPostLikesLoader: {
          load: async (postId: string) => {
            // 艹！Mock 点赞状态：已登录用户对 post-1 已点赞
            if (options.user && postId === 'post-1') {
              return true
            }
            return false
          }
        },
        // 艹！其他 loaders 暂时不需要，先用空对象
        artworkLoader: { load: async () => null },
        videoLoader: { load: async () => null },
        likeCountLoader: { load: async () => 0 },
        commentCountLoader: { load: async () => 0 },
        followerCountLoader: { load: async () => 0 },
        followingCountLoader: { load: async () => 0 },
        isFollowingLoader: { load: async () => false },
        blogPostLoader: { load: async () => null },
      } as any

      // 艹！直接返回 GraphQL Context，不调用 createGraphQLContext
      return {
        supabase: mockSupabase,
        user: options.user || null,
        loaders: mockLoaders,
        request
      }
    },
  })
}

/**
 * 执行 GraphQL 查询
 * 艹！使用 graphql-yoga 的 fetch API 测试，完全绕过 graphql() 函数的模块实例问题！
 *
 * @param query - GraphQL 查询字符串
 * @param variables - 查询变量
 * @param options - 用户选项（用于创建 yoga 实例）
 * @returns 查询结果
 */
export async function executeGraphQL(
  query: string,
  variables: Record<string, any> = {},
  options: { user?: User | null } = {}
): Promise<any> {
  // 艹！创建 yoga 实例
  const yoga = createTestYoga(options)

  // 艹！构造 GraphQL HTTP 请求
  const request = new Request('http://localhost:3000/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  // 艹！使用 yoga.fetch() 执行请求（这个方法支持测试环境）
  const response = await yoga.fetch(request)

  // 艹！解析响应
  const result = await response.json()

  return result
}

/**
 * 创建 mock 用户
 * 艹！这个函数创建一个测试用的 mock 用户对象
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User
}

/**
 * 创建 mock BlogPost
 * 艹！这个函数创建一个测试用的 mock BlogPost 对象
 */
export function createMockBlogPost(overrides?: Partial<any>): any {
  return {
    id: 'test-post-123',
    user_id: 'test-user-123',
    title: 'Test Blog Post',
    slug: 'test-blog-post',
    content: 'This is a test blog post content',
    excerpt: 'This is a test excerpt',
    cover_image_url: null,
    status: 'published',
    published_at: new Date().toISOString(),
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

/**
 * 计算查询次数工具
 * 艹！这个函数用于监控数据库查询次数，验证 DataLoader 优化效果
 */
export class QueryCounter {
  private count = 0

  increment() {
    this.count++
  }

  getCount() {
    return this.count
  }

  reset() {
    this.count = 0
  }
}

/**
 * 创建带查询计数的 Supabase 客户端
 * 艹！这个函数包装 Supabase 客户端，记录所有查询
 */
export function createCountingSupabaseClient(counter: QueryCounter): any {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'from') {
        return (table: string) => {
          // 艹！每次调用 from 就增加查询计数
          counter.increment()
          return createMockQueryBuilder(counter)
        }
      }
      return target[prop as keyof typeof target]
    },
  })
}

/**
 * 创建 mock QueryBuilder
 * 艹！这个函数模拟 Supabase 的查询构建器
 */
function createMockQueryBuilder(counter: QueryCounter): any {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    order: () => builder,
    range: () => builder,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  }
  return builder
}
