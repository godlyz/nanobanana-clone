/**
 * GraphQL SDK 基础使用示例 - Node.js / API 路由
 * 艹！这个文件展示了如何在 Node.js 环境（如 API 路由）中使用 GraphQL SDK
 *
 * 适用场景：
 * - Next.js API 路由
 * - Node.js 脚本
 * - 服务端数据获取
 */

import { createGraphQLSDK, GraphQLSDKError, GraphQLErrorType } from '@/lib/graphql/sdk'

/**
 * 示例 1: 创建 SDK 实例并获取当前用户
 */
async function example1_GetCurrentUser() {
  console.log('\n=== 示例 1: 获取当前用户 ===')

  // 创建 SDK 实例
  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
    token: 'your-auth-token', // 可选
    enableLogging: true, // 开发模式启用日志
  })

  try {
    // 获取当前用户
    const { me } = await sdk.api.GetMe()

    console.log('✅ 当前用户:', me)
    console.log('  - ID:', me?.id)
    console.log('  - Email:', me?.email)
    console.log('  - 显示名称:', me?.displayName)
  } catch (error) {
    if (error instanceof GraphQLSDKError) {
      console.error('❌ 错误类型:', error.type)
      console.error('❌ 错误信息:', error.message)
    } else {
      console.error('❌ 未知错误:', error)
    }
  }
}

/**
 * 示例 2: 获取博客文章列表
 */
async function example2_GetBlogPosts() {
  console.log('\n=== 示例 2: 获取博客文章列表 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  try {
    const { blogPosts } = await sdk.api.GetPublishedBlogPosts({
      limit: 10,
      offset: 0,
    })

    console.log('✅ 博客文章总数:', blogPosts?.length ?? 0)

    blogPosts?.forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.title}`)
      console.log(`     作者: ${post.author?.displayName}`)
      console.log(`     浏览: ${post.viewCount}, 点赞: ${post.likeCount}`)
    })
  } catch (error) {
    console.error('❌ 获取博客文章失败:', error)
  }
}

/**
 * 示例 3: 获取单个博客文章详情
 */
async function example3_GetSinglePost() {
  console.log('\n=== 示例 3: 获取单个博客文章详情 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  try {
    const { blogPost } = await sdk.api.GetBlogPost({
      id: 'post-123',
    })

    if (!blogPost) {
      console.log('❌ 博客文章不存在')
      return
    }

    console.log('✅ 博客文章详情:')
    console.log('  - 标题:', blogPost.title)
    console.log('  - 作者:', blogPost.author?.displayName)
    console.log('  - 发布时间:', blogPost.publishedAt)
    console.log('  - 浏览量:', blogPost.viewCount)
    console.log('  - 点赞数:', blogPost.likeCount)
    console.log('  - 评论数:', blogPost.commentCount)
    console.log('  - 内容预览:', blogPost.content?.substring(0, 100) + '...')
  } catch (error) {
    console.error('❌ 获取博客文章失败:', error)
  }
}

/**
 * 示例 4: Echo Mutation（测试用）
 */
async function example4_EchoMutation() {
  console.log('\n=== 示例 4: Echo Mutation ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  try {
    const { echo } = await sdk.api.TestEcho({
      message: 'Hello, GraphQL SDK!',
    })

    console.log('✅ Echo 结果:', echo)
  } catch (error) {
    console.error('❌ Echo Mutation 失败:', error)
  }
}

/**
 * 示例 5: 错误处理示例
 */
async function example5_ErrorHandling() {
  console.log('\n=== 示例 5: 错误处理示例 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
    retry: true,
    maxRetries: 3,
  })

  try {
    // 尝试获取不存在的文章
    const { blogPost } = await sdk.api.GetBlogPost({
      id: 'non-existent-id',
    })

    console.log('✅ 文章:', blogPost)
  } catch (error) {
    if (error instanceof GraphQLSDKError) {
      console.error('❌ GraphQL 错误:')
      console.error('  - 类型:', error.type)
      console.error('  - 消息:', error.message)
      console.error('  - 状态码:', error.statusCode)

      // 根据错误类型处理
      switch (error.type) {
        case GraphQLErrorType.AUTHENTICATION_ERROR:
          console.error('  → 需要重新登录')
          break
        case GraphQLErrorType.AUTHORIZATION_ERROR:
          console.error('  → 权限不足')
          break
        case GraphQLErrorType.NETWORK_ERROR:
          console.error('  → 网络连接失败，请检查网络')
          break
        case GraphQLErrorType.RATE_LIMIT_ERROR:
          console.error('  → 请求过于频繁，请稍后再试')
          break
        default:
          console.error('  → 未知错误')
      }
    } else {
      console.error('❌ 未知错误:', error)
    }
  }
}

/**
 * 示例 6: 更新认证 Token
 */
async function example6_UpdateToken() {
  console.log('\n=== 示例 6: 更新认证 Token ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  // 登录后更新 token
  console.log('1. 登录并获取 token...')
  const newToken = 'new-auth-token-from-login'
  sdk.setToken(newToken)
  console.log('✅ Token 已更新')

  // 现在可以进行需要认证的请求
  try {
    const { me } = await sdk.api.GetMe()
    console.log('✅ 认证成功，当前用户:', me?.email)
  } catch (error) {
    console.error('❌ 认证失败')
  }

  // 登出时清除 token
  console.log('2. 登出...')
  sdk.setToken(null)
  console.log('✅ Token 已清除')
}

/**
 * 示例 7: 自定义请求头
 */
async function example7_CustomHeaders() {
  console.log('\n=== 示例 7: 自定义请求头 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
    headers: {
      'X-Custom-Header': 'initial-value',
    },
  })

  // 动态更新请求头
  sdk.setHeaders({
    'X-Request-ID': 'unique-request-id-123',
    'X-Client-Version': '1.0.0',
  })

  console.log('✅ 自定义请求头已设置')

  try {
    const { me } = await sdk.api.GetMe()
    console.log('✅ 请求成功（带自定义请求头）')
  } catch (error) {
    console.error('❌ 请求失败')
  }
}

/**
 * 示例 8: 禁用重试
 */
async function example8_DisableRetry() {
  console.log('\n=== 示例 8: 禁用重试 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
    retry: false, // 禁用重试
  })

  console.log('✅ 已禁用请求重试')

  try {
    const { me } = await sdk.api.GetMe()
    console.log('✅ 请求成功')
  } catch (error) {
    console.error('❌ 请求失败（不重试）')
  }
}

/**
 * 示例 9: 自定义重试策略
 */
async function example9_CustomRetry() {
  console.log('\n=== 示例 9: 自定义重试策略 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
    retry: true,
    maxRetries: 5, // 最多重试 5 次
    retryDelay: 2000, // 每次重试延迟 2 秒
  })

  console.log('✅ 自定义重试策略：最多 5 次，每次延迟 2 秒')

  try {
    const { me } = await sdk.api.GetMe()
    console.log('✅ 请求成功')
  } catch (error) {
    console.error('❌ 请求失败（已重试 5 次）')
  }
}

/**
 * 示例 10: 执行原始 GraphQL 请求
 */
async function example10_RawRequest() {
  console.log('\n=== 示例 10: 执行原始 GraphQL 请求 ===')

  const sdk = createGraphQLSDK({
    endpoint: 'http://localhost:3000/api/graphql',
  })

  try {
    // 执行原始 GraphQL 请求（使用字符串查询）
    const query = `
      query GetMe {
        me {
          id
          email
          displayName
        }
      }
    `

    const result = await sdk.request(query)
    console.log('✅ 原始请求成功:', result)
  } catch (error) {
    console.error('❌ 原始请求失败:', error)
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 GraphQL SDK Node.js 使用示例')
  console.log('=' .repeat(50))

  await example1_GetCurrentUser()
  await example2_GetBlogPosts()
  await example3_GetSinglePost()
  await example4_EchoMutation()
  await example5_ErrorHandling()
  await example6_UpdateToken()
  await example7_CustomHeaders()
  await example8_DisableRetry()
  await example9_CustomRetry()
  await example10_RawRequest()

  console.log('\n' + '='.repeat(50))
  console.log('✅ 所有示例运行完成！')
}

// 导出示例函数
export {
  example1_GetCurrentUser,
  example2_GetBlogPosts,
  example3_GetSinglePost,
  example4_EchoMutation,
  example5_ErrorHandling,
  example6_UpdateToken,
  example7_CustomHeaders,
  example8_DisableRetry,
  example9_CustomRetry,
  example10_RawRequest,
  runAllExamples,
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error)
}
