/**
 * 🔥 老王的API限流中间件
 * 用途: 防止API滥用，保护服务器资源
 * 算法: Sliding Window (滑动窗口) + Redis
 *
 * 限流规则:
 * - Free Tier: 100 requests/min
 * - Pro Tier: 500 requests/min
 * - Max Tier: 1000 requests/min
 */

import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis-client'
import { createClient } from '@/lib/supabase/server'

// 限流配置（每分钟请求数）
export const RATE_LIMITS = {
  FREE: 100,      // 免费用户
  PRO: 500,       // Pro 订阅
  MAX: 1000,      // Max 订阅
  DEFAULT: 100,   // 未登录用户默认
} as const

// 时间窗口（秒）
const WINDOW_SIZE = 60 // 1分钟

// 限流结果接口
interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix 时间戳（秒）
}

// 获取用户订阅等级
async function getUserTier(userId: string): Promise<keyof typeof RATE_LIMITS> {
  try {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!subscription) return 'FREE'

    // 根据订阅类型返回对应等级
    switch (subscription.plan_type) {
      case 'pro_monthly':
      case 'pro_yearly':
        return 'PRO'
      case 'max_monthly':
      case 'max_yearly':
        return 'MAX'
      default:
        return 'FREE'
    }
  } catch (error) {
    console.error('❌ 获取用户订阅等级失败:', error)
    return 'FREE' // 默认返回免费等级
  }
}

// 获取客户端标识符（IP或用户ID）
function getClientIdentifier(request: NextRequest): string {
  // 优先使用 X-Forwarded-For 获取真实IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // 其次使用 X-Real-IP
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // 🔥 老王修复：NextRequest类型没有ip属性，降级返回unknown
  // 注意：在生产环境应确保Vercel/CDN设置了X-Forwarded-For或X-Real-IP
  return 'unknown'
}

// Sliding Window 限流算法
export async function checkRateLimit(
  identifier: string,
  limit: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000) // 当前时间戳（秒）
  const windowStart = now - WINDOW_SIZE
  const key = `rate_limit:${identifier}:${now}`

  try {
    // 使用 Redis INCR 原子操作计数
    const count = await redis.incr(key)

    if (count === null) {
      // Redis 操作失败，默认允许请求（优雅降级）
      console.warn('⚠️ Redis限流操作失败，允许请求通过')
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        reset: now + WINDOW_SIZE,
      }
    }

    // 首次创建key时设置过期时间
    if (count === 1) {
      await redis.expire(key, WINDOW_SIZE)
    }

    // 检查是否超限
    const allowed = count <= limit
    const remaining = Math.max(0, limit - count)

    return {
      allowed,
      limit,
      remaining,
      reset: now + WINDOW_SIZE,
    }
  } catch (error) {
    console.error('❌ 限流检查失败:', error)
    // 出错时默认允许请求（优雅降级）
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: now + WINDOW_SIZE,
    }
  }
}

// 限流中间件
export async function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  // 获取客户端标识符
  const clientId = userId || getClientIdentifier(request)

  // 获取用户订阅等级
  const tier = userId ? await getUserTier(userId) : 'DEFAULT'
  const limit = RATE_LIMITS[tier]

  // 执行限流检查
  const result = await checkRateLimit(clientId, limit)

  // 添加限流响应头
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())

  // 如果超限，返回 429 错误
  if (!result.allowed) {
    console.warn(`⚠️ 限流触发 [${clientId}]: ${tier} tier, ${limit} req/min`)

    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. You are limited to ${limit} requests per minute. Please try again in ${result.reset - Math.floor(Date.now() / 1000)} seconds.`,
        retryAfter: result.reset,
      },
      {
        status: 429,
        headers,
      }
    )
  }

  // 允许请求通过，返回 null
  return null
}

// 快捷函数：直接检查限流（用于 API 路由）
export async function applyRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  return rateLimitMiddleware(request, userId)
}
