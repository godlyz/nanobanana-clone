/**
 * GraphQL API Endpoint (graphql-yoga)
 *
 * 艹！这是老王我用 graphql-yoga 创建的 GraphQL endpoint！
 * 比那个 SB Apollo Server 轻量多了，而且和 Next.js 集成得更好！
 *
 * 老王备注：现在加上 Rate Limiting 和 Query Complexity 检查！
 */

import { createYoga } from 'graphql-yoga'
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection'
import { parse } from 'graphql'
import { schema } from '@/lib/graphql/schema'
import { createGraphQLContext } from '@/lib/graphql/context'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters, getUserSubscriptionTier, RATE_LIMITS, SubscriptionTier } from '@/lib/graphql/rate-limiter'
import { validateQueryComplexity } from '@/lib/graphql/query-complexity'

// 创建 graphql-yoga 实例
const yoga = createYoga({
  // 使用 Pothos 生成的 schema
  schema,

  // 插件配置（艹！老王我加上 Rate Limiting 和 Query Complexity 检查！）
  plugins: [
    // 艹！生产环境禁用 introspection（防止暴露 schema 结构）
    ...(process.env.NODE_ENV === 'production' ? [useDisableIntrospection()] : []),
  ],

  // GraphQL Playground 配置（开发环境启用）
  graphiql: {
    title: 'Nano Banana GraphQL Playground',
    // 老王我给 Playground 加了个欢迎消息！
    defaultQuery: `# 艹！欢迎使用老王搞的 GraphQL API！
# 这是 Pothos + graphql-yoga 的实现，Code-first, TypeScript-first！
# 现在加上了 Rate Limiting 和 Query Complexity 检查！

# 测试查询 1: Hello World
query HelloWorld {
  hello
  currentTime
}

# 测试 Mutation: Echo
mutation TestEcho {
  echo(message: "老王的 GraphQL 跑起来了！")
}

# 测试 Relay 分页
query BlogPostsConnection {
  blogPostsConnection(first: 5) {
    edges {
      cursor
      node {
        id
        title
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}
`
  },

  // Context 工厂函数（每个请求都会调用）
  context: async ({ request }) => {
    // 创建 Supabase 客户端（艹！这个函数是 async 的，必须 await！）
    const supabase = await createClient()

    // 获取当前用户（如果已登录）
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // 艹！获取用户订阅层级
    const tier = await getUserSubscriptionTier(user?.id ?? null)

    // 艹！Rate Limiting 检查
    const userId = user?.id ?? `anonymous-${request.headers.get('x-forwarded-for') ?? 'unknown'}`
    const rateLimiter = rateLimiters[tier]

    try {
      await rateLimiter.consume(userId)
    } catch (error) {
      // 艹！超过限制，抛出错误
      throw new Error(
        `Rate limit exceeded. You are limited to ${RATE_LIMITS[tier].requestsPerMinute} requests per minute. ` +
        `Please wait or upgrade your subscription tier.`
      )
    }

    // 艹！Query Complexity 检查（需要解析查询）
    const body = await request.clone().text()
    let parsedQuery
    try {
      const jsonBody = JSON.parse(body)
      if (jsonBody.query) {
        parsedQuery = parse(jsonBody.query)
        validateQueryComplexity(parsedQuery, RATE_LIMITS[tier].maxComplexity)
      }
    } catch (error) {
      // 艹！解析失败或复杂度超限，抛出错误
      if (error instanceof Error && error.message.includes('complexity')) {
        throw error
      }
      // 艹！其他错误（如 JSON 解析失败）忽略，让 GraphQL 引擎处理
    }

    // 返回 GraphQL Context
    return createGraphQLContext(supabase, user, request)
  },

  // 路由配置（Next.js App Router）
  graphqlEndpoint: '/api/graphql',

  // CORS 配置
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true
  },

  // 错误处理
  maskedErrors: process.env.NODE_ENV === 'production'
})

// 导出 Next.js Route Handlers
export { yoga as GET, yoga as POST }
