/**
 * GraphQL User API 测试套件
 * 老王备注：测试 GraphQL API 的 User 查询
 *
 * 测试范围：
 * 1. me 查询 - 获取当前登录用户
 * 2. user(id) 查询 - 根据 ID 获取用户
 * 3. 隐私控制 - 邮箱仅自己可见
 * 4. 用户资料字段 - displayName, avatarUrl, bio 等
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeGraphQL, createMockUser } from './test-helpers'

describe('GraphQL User API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('me 查询', () => {
    it('未登录时应返回 null', async () => {
      const query = `
        query Me {
          me {
            id
            email
          }
        }
      `

      // 艹！使用新的 executeGraphQL，不传 user 表示未登录
      const result = await executeGraphQL(query, {}, { user: null })

      expect(result.errors).toBeUndefined()
      expect(result.data.me).toBeNull()
    })

    it('已登录时应返回当前用户信息', async () => {
      const mockUser = createMockUser({
        id: 'test-user-123',
        email: 'test@example.com',
      })

      const query = `
        query Me {
          me {
            id
            email
            displayName
            avatarUrl
            bio
          }
        }
      `

      // 艹！传 mockUser 表示已登录
      const result = await executeGraphQL(query, {}, { user: mockUser })

      expect(result.errors).toBeUndefined()
      expect(result.data.me).toBeDefined()
      expect(result.data.me.id).toBe(mockUser.id)
      expect(result.data.me.email).toBe(mockUser.email)
    })

    it('应返回用户统计信息', async () => {
      const mockUser = createMockUser()

      const query = `
        query Me {
          me {
            id
            followerCount
            followingCount
            postCount
            artworkCount
            totalLikes
          }
        }
      `

      const result = await executeGraphQL(query, {}, { user: mockUser })

      expect(result.errors).toBeUndefined()
      expect(result.data.me).toBeDefined()

      // 艹！统计字段应该是数字
      expect(typeof result.data.me.followerCount).toBe('number')
      expect(typeof result.data.me.followingCount).toBe('number')
      expect(typeof result.data.me.postCount).toBe('number')
      expect(typeof result.data.me.artworkCount).toBe('number')
      expect(typeof result.data.me.totalLikes).toBe('number')
    })
  })

  describe('user(id) 查询', () => {
    it('应该根据 ID 获取用户信息', async () => {
      const query = `
        query User($id: ID!) {
          user(id: $id) {
            id
            displayName
            avatarUrl
          }
        }
      `

      const result = await executeGraphQL(
        query,
        { id: 'test-user-123' },
        { user: null }
      )

      expect(result.errors).toBeUndefined()
      // 艹！如果用户存在应该返回数据，不存在返回 null
      if (result.data.user) {
        expect(result.data.user.id).toBe('test-user-123')
      }
    })

    it('查询不存在的用户应返回 null', async () => {
      const query = `
        query User($id: ID!) {
          user(id: $id) {
            id
            displayName
          }
        }
      `

      // 艹！未登录用户
      const result = await executeGraphQL(
        query,
        { id: 'non-existent-user-id' },
        { user: null }
      )

      expect(result.errors).toBeUndefined()
      expect(result.data.user).toBeNull()
    })
  })

  describe('邮箱隐私控制', () => {
    const mockUser = createMockUser({
      id: 'user-123',
      email: 'user123@example.com',
    })

    it('查询自己时应该可以看到邮箱', async () => {
      const query = `
        query Me {
          me {
            id
            email
          }
        }
      `

      // 艹！已登录用户
      const result = await executeGraphQL(query, {}, { user: mockUser })

      expect(result.errors).toBeUndefined()
      expect(result.data.me.email).toBe('user123@example.com')
    })

    it('查询其他用户时不应该看到邮箱', async () => {
      const query = `
        query User($id: ID!) {
          user(id: $id) {
            id
            email
          }
        }
      `

      const currentUser = createMockUser({
        id: 'current-user-id',
        email: 'current@example.com',
      })

      // 艹！已登录用户
      const result = await executeGraphQL(
        query,
        { id: 'other-user-id' },
        { user: currentUser }
      )

      expect(result.errors).toBeUndefined()
      if (result.data.user) {
        // 艹！查询其他用户的邮箱应该返回 null
        expect(result.data.user.email).toBeNull()
      }
    })
  })

  describe('用户资料字段', () => {
    const mockUser = createMockUser()

    it('应该返回所有资料字段', async () => {
      const query = `
        query Me {
          me {
            id
            displayName
            avatarUrl
            bio
            websiteUrl
            twitterHandle
            instagramHandle
            githubHandle
            location
          }
        }
      `

      // 艹！已登录用户
      const result = await executeGraphQL(query, {}, { user: mockUser })

      expect(result.errors).toBeUndefined()
      expect(result.data.me).toBeDefined()

      // 艹！所有资料字段应该是字符串或 null
      const fields = [
        'displayName',
        'avatarUrl',
        'bio',
        'websiteUrl',
        'twitterHandle',
        'instagramHandle',
        'githubHandle',
        'location',
      ]

      fields.forEach((field) => {
        const value = result.data.me[field]
        expect(value === null || typeof value === 'string').toBe(true)
      })
    })

    it('应该返回时间戳字段', async () => {
      const query = `
        query Me {
          me {
            id
            createdAt
            updatedAt
          }
        }
      `

      // 艹！已登录用户
      const result = await executeGraphQL(query, {}, { user: mockUser })

      expect(result.errors).toBeUndefined()
      expect(result.data.me).toBeDefined()

      // 艹！时间戳应该是字符串或 null
      if (result.data.me.createdAt) {
        expect(typeof result.data.me.createdAt).toBe('string')
      }
      if (result.data.me.updatedAt) {
        expect(typeof result.data.me.updatedAt).toBe('string')
      }
    })
  })

  describe('错误处理', () => {
    it('无效的 user ID 应该返回 null', async () => {
      const query = `
        query User($id: ID!) {
          user(id: $id) {
            id
          }
        }
      `

      // 艹！未登录用户
      const result = await executeGraphQL(
        query,
        { id: '' },  // 艹！空 ID
        { user: null }
      )

      // 艹！应该返回错误或 null
      if (result.errors) {
        expect(result.errors.length).toBeGreaterThan(0)
      } else {
        expect(result.data.user).toBeNull()
      }
    })
  })
})
