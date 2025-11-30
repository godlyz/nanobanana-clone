/**
 * GraphQL Rate Limiting 测试套件
 * 老王备注：测试 Rate Limiting 和 Query Complexity 功能
 *
 * 测试范围：
 * 1. Rate Limiting - 免费用户限制 100/min
 * 2. Query Complexity - 超过复杂度限制应报错
 * 3. 不同订阅层级的限制
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SubscriptionTier, RATE_LIMITS, rateLimiters } from '@/lib/graphql/rate-limiter'
import { calculateQueryComplexity, validateQueryComplexity } from '@/lib/graphql/query-complexity'
import { parse } from 'graphql'

describe('GraphQL Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rate Limit 配置', () => {
    it('应该正确配置各层级的限制', () => {
      // 艹！验证 FREE 层级
      expect(RATE_LIMITS[SubscriptionTier.FREE]).toEqual({
        requestsPerMinute: 100,
        maxComplexity: 500,
      })

      // 艹！验证 BASIC 层级
      expect(RATE_LIMITS[SubscriptionTier.BASIC]).toEqual({
        requestsPerMinute: 500,
        maxComplexity: 750,
      })

      // 艹！验证 PRO 层级
      expect(RATE_LIMITS[SubscriptionTier.PRO]).toEqual({
        requestsPerMinute: 1000,
        maxComplexity: 1000,
      })

      // 艹！验证 MAX 层级
      expect(RATE_LIMITS[SubscriptionTier.MAX]).toEqual({
        requestsPerMinute: 2000,
        maxComplexity: 2000,
      })

      // 艹！验证 ADMIN 层级
      expect(RATE_LIMITS[SubscriptionTier.ADMIN]).toEqual({
        requestsPerMinute: 10000,
        maxComplexity: 5000,
      })
    })

    it('应该创建所有层级的 Rate Limiter 实例', () => {
      // 艹！验证每个层级都有对应的 Rate Limiter
      expect(rateLimiters[SubscriptionTier.FREE]).toBeDefined()
      expect(rateLimiters[SubscriptionTier.BASIC]).toBeDefined()
      expect(rateLimiters[SubscriptionTier.PRO]).toBeDefined()
      expect(rateLimiters[SubscriptionTier.MAX]).toBeDefined()
      expect(rateLimiters[SubscriptionTier.ADMIN]).toBeDefined()
    })
  })

  describe('Query Complexity 计算', () => {
    it('简单查询的复杂度应该较低', () => {
      const query = `
        query HelloWorld {
          hello
          currentTime
        }
      `

      const document = parse(query)
      const complexity = calculateQueryComplexity(document)

      // 艹！简单查询（2个标量字段）复杂度应该 ≤ 10
      expect(complexity).toBeLessThanOrEqual(10)
      expect(complexity).toBeGreaterThan(0)
    })

    it('嵌套查询的复杂度应该较高', () => {
      const query = `
        query BlogPosts {
          blogPosts(limit: 10) {
            id
            title
            author {
              id
              displayName
              email
            }
          }
        }
      `

      const document = parse(query)
      const complexity = calculateQueryComplexity(document)

      // 艹！嵌套查询（含列表和对象字段）复杂度应该 > 10
      expect(complexity).toBeGreaterThan(10)
    })

    it('Connection 查询的复杂度应该较高', () => {
      const query = `
        query BlogPostsConnection {
          blogPostsConnection(first: 10) {
            edges {
              cursor
              node {
                id
                title
                author {
                  id
                  displayName
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `

      const document = parse(query)
      const complexity = calculateQueryComplexity(document)

      // 艹！Connection 查询复杂度应该 > 20
      expect(complexity).toBeGreaterThan(20)
    })

    it('Mutation 的复杂度应该较高', () => {
      const mutation = `
        mutation TestEcho {
          echo(message: "test")
        }
      `

      const document = parse(mutation)
      const complexity = calculateQueryComplexity(document)

      // 艹！Mutation 基础复杂度是 10
      expect(complexity).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Query Complexity 验证', () => {
    it('应该允许复杂度在限制内的查询', () => {
      const query = `
        query HelloWorld {
          hello
        }
      `

      const document = parse(query)

      // 艹！复杂度很低，不应该抛出错误
      expect(() => {
        validateQueryComplexity(document, 500)
      }).not.toThrow()
    })

    it('应该拒绝复杂度超限的查询', () => {
      const query = `
        query BlogPosts {
          blogPosts(limit: 10) {
            id
            title
            author {
              id
              displayName
            }
          }
        }
      `

      const document = parse(query)

      // 艹！设置一个很低的复杂度限制（10），应该抛出错误
      expect(() => {
        validateQueryComplexity(document, 10)
      }).toThrow(/complexity.*exceeds/)
    })

    it('错误消息应该包含实际复杂度和限制', () => {
      const query = `
        query BlogPostsConnection {
          blogPostsConnection(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `

      const document = parse(query)

      // 艹！捕获错误并验证错误消息
      try {
        validateQueryComplexity(document, 10)
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('complexity')
        expect((error as Error).message).toContain('exceeds')
        expect((error as Error).message).toContain('10') // 最大复杂度
      }
    })
  })

  describe('订阅层级限制', () => {
    it('FREE 用户应该有最严格的限制', () => {
      const freeLimit = RATE_LIMITS[SubscriptionTier.FREE]
      const basicLimit = RATE_LIMITS[SubscriptionTier.BASIC]

      // 艹！FREE 的限制应该小于 BASIC
      expect(freeLimit.requestsPerMinute).toBeLessThan(basicLimit.requestsPerMinute)
      expect(freeLimit.maxComplexity).toBeLessThan(basicLimit.maxComplexity)
    })

    it('PRO 用户应该有更高的限制', () => {
      const basicLimit = RATE_LIMITS[SubscriptionTier.BASIC]
      const proLimit = RATE_LIMITS[SubscriptionTier.PRO]

      // 艹！PRO 的限制应该大于 BASIC
      expect(proLimit.requestsPerMinute).toBeGreaterThan(basicLimit.requestsPerMinute)
      expect(proLimit.maxComplexity).toBeGreaterThan(basicLimit.maxComplexity)
    })

    it('ADMIN 用户应该有最宽松的限制', () => {
      const proLimit = RATE_LIMITS[SubscriptionTier.PRO]
      const adminLimit = RATE_LIMITS[SubscriptionTier.ADMIN]

      // 艹！ADMIN 的限制应该远大于 PRO
      expect(adminLimit.requestsPerMinute).toBeGreaterThan(proLimit.requestsPerMinute)
      expect(adminLimit.maxComplexity).toBeGreaterThan(proLimit.maxComplexity)
    })
  })

  describe('真实查询复杂度示例', () => {
    it('简单查询：hello + currentTime', () => {
      const query = `query { hello currentTime }`
      const complexity = calculateQueryComplexity(parse(query))

      // 艹！2个标量字段 = 复杂度 ~2
      expect(complexity).toBeLessThanOrEqual(5)
    })

    it('单个 blogPost 查询', () => {
      const query = `
        query {
          blogPost(id: "test") {
            id
            title
            content
          }
        }
      `
      const complexity = calculateQueryComplexity(parse(query))

      // 艹！单个对象 + 3个标量字段 = 复杂度 ~6
      expect(complexity).toBeLessThanOrEqual(10)
    })

    it('blogPosts 列表查询（含作者）', () => {
      const query = `
        query {
          blogPosts(limit: 10) {
            id
            title
            author {
              id
              displayName
            }
          }
        }
      `
      const complexity = calculateQueryComplexity(parse(query))

      // 艹！列表 + 嵌套对象 = 复杂度 ~20
      expect(complexity).toBeGreaterThan(15)
      expect(complexity).toBeLessThanOrEqual(30)
    })

    it('blogPostsConnection 分页查询', () => {
      const query = `
        query {
          blogPostsConnection(first: 10) {
            edges {
              cursor
              node {
                id
                title
                author {
                  id
                  displayName
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `
      const complexity = calculateQueryComplexity(parse(query))

      // 艹！Connection + edges + 嵌套对象 = 复杂度 ~35
      expect(complexity).toBeGreaterThan(25)
      expect(complexity).toBeLessThanOrEqual(50)
    })
  })
})
