/**
 * 🔥 老王的限流测试
 * 测试 Sliding Window 限流算法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limiter'
import { redis } from '@/lib/redis-client'

describe('Rate Limiter - Sliding Window Algorithm', () => {
  beforeEach(() => {
    // 清除所有 mock
    vi.clearAllMocks()
  })

  it('应该允许第一个请求通过', async () => {
    const identifier = 'user:test-1'
    const limit = RATE_LIMITS.FREE

    const result = await checkRateLimit(identifier, limit)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(limit - 1)
    expect(result.limit).toBe(limit)
  })

  it('应该正确计数多个请求', async () => {
    const identifier = 'user:test-2'
    const limit = RATE_LIMITS.FREE

    // 发送 3 个请求
    const result1 = await checkRateLimit(identifier, limit)
    const result2 = await checkRateLimit(identifier, limit)
    const result3 = await checkRateLimit(identifier, limit)

    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(limit - 1)

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(limit - 2)

    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(limit - 3)
  })

  it('应该在达到限制时拒绝请求', async () => {
    const identifier = 'user:test-3'
    const limit = 5 // 使用小限制方便测试

    // 发送 5 个请求（达到限制）
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(identifier, limit)
    }

    // 第 6 个请求应该被拒绝
    const result = await checkRateLimit(identifier, limit)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('应该为不同用户独立计数', async () => {
    const user1 = 'user:alice'
    const user2 = 'user:bob'
    const limit = RATE_LIMITS.FREE

    const result1 = await checkRateLimit(user1, limit)
    const result2 = await checkRateLimit(user2, limit)

    // 两个用户都应该有完整的限额
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(limit - 1)

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(limit - 1)
  })

  it('应该正确设置不同订阅等级的限制', async () => {
    const freeUser = 'user:free'
    const proUser = 'user:pro'
    const maxUser = 'user:max'

    const freeResult = await checkRateLimit(freeUser, RATE_LIMITS.FREE)
    const proResult = await checkRateLimit(proUser, RATE_LIMITS.PRO)
    const maxResult = await checkRateLimit(maxUser, RATE_LIMITS.MAX)

    expect(freeResult.limit).toBe(100)
    expect(proResult.limit).toBe(500)
    expect(maxResult.limit).toBe(1000)
  })

  it('Redis 失败时应该优雅降级（允许请求）', async () => {
    // Mock Redis 失败
    vi.spyOn(redis, 'incr').mockResolvedValue(null)

    const identifier = 'user:test-fallback'
    const limit = RATE_LIMITS.FREE

    const result = await checkRateLimit(identifier, limit)

    // 应该允许请求（优雅降级）
    expect(result.allowed).toBe(true)
  })

  it('应该包含正确的 reset 时间戳', async () => {
    const identifier = 'user:test-reset'
    const limit = RATE_LIMITS.FREE

    const now = Math.floor(Date.now() / 1000)
    const result = await checkRateLimit(identifier, limit)

    // reset 时间应该在 now + 60 秒左右（允许 2 秒误差）
    expect(result.reset).toBeGreaterThanOrEqual(now + 58)
    expect(result.reset).toBeLessThanOrEqual(now + 62)
  })
})

describe('Rate Limits Configuration', () => {
  it('应该定义所有订阅等级的限制', () => {
    expect(RATE_LIMITS.FREE).toBe(100)
    expect(RATE_LIMITS.PRO).toBe(500)
    expect(RATE_LIMITS.MAX).toBe(1000)
    expect(RATE_LIMITS.DEFAULT).toBe(100)
  })

  it('FREE 和 DEFAULT 应该相同', () => {
    expect(RATE_LIMITS.FREE).toBe(RATE_LIMITS.DEFAULT)
  })
})
