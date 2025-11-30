/**
 * 🔥 老王的限流包装器
 * 用途: 为API路由添加限流保护
 * 可以单独使用，也可以和 withAuth 组合
 *
 * 示例:
 * export const POST = withRateLimit(withAuth(async (request, user) => { ... }))
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from './rate-limiter'
import type { User } from '@supabase/supabase-js'
// 🔥 老王修复：改用import导入withAuth，避免require导致类型丢失
import { withAuth } from '@/lib/api-auth'

/**
 * 限流包装器（无认证版本）
 * 用于不需要认证的公开API
 *
 * @example
 * export const POST = withRateLimit(async (request) => {
 *   // 你的处理逻辑
 * })
 */
export function withRateLimit<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    // 执行限流检查
    const rateLimitResponse = await rateLimitMiddleware(request)

    // 如果超限，返回 429 错误
    if (rateLimitResponse) {
      return rateLimitResponse as NextResponse<T>
    }

    // 限流通过，执行实际处理器
    return handler(request)
  }
}

/**
 * 限流包装器（认证版本）
 * 用于需要认证的API，基于用户ID进行限流
 *
 * @example
 * export const POST = withAuthRateLimit(async (request, user) => {
 *   // user 已认证，且通过了限流检查
 * })
 */
export function withAuthRateLimit<T = any>(
  handler: (request: Request, user: User) => Promise<NextResponse<T>>
) {
  // 🔥 老王修复：改用Request类型以匹配Next.js API路由标准签名
  return async (request: Request, user: User): Promise<NextResponse<T>> => {
    // 基于用户ID执行限流检查（类型断言Request为NextRequest以兼容rateLimitMiddleware）
    const rateLimitResponse = await rateLimitMiddleware(request as NextRequest, user.id)

    // 如果超限，返回 429 错误
    if (rateLimitResponse) {
      return rateLimitResponse as NextResponse<T>
    }

    // 限流通过，执行实际处理器
    return handler(request, user)
  }
}

/**
 * 组合包装器：认证 + 限流
 * 这是最常用的组合，先认证再限流
 *
 * @example
 * export const POST = withAuthAndRateLimit(async (request, user) => {
 *   // user 已认证，且通过了限流检查
 * })
 */
export function withAuthAndRateLimit<T = any>(
  handler: (request: Request, user: User) => Promise<NextResponse<T>>
) {
  // 🔥 老王修复：withAuth已在顶部import，删除require
  // 🔥 老王修复：withAuth期望Request类型，不是NextRequest，所以handler签名改用Request

  // 先包装限流，再包装认证
  return withAuth<T>(async (request: Request, user: User): Promise<NextResponse<T>> => {
    // 执行限流检查（rateLimitMiddleware兼容Request类型）
    const rateLimitResponse = await rateLimitMiddleware(request as NextRequest, user.id)

    if (rateLimitResponse) {
      return rateLimitResponse as NextResponse<T>
    }

    // 执行实际处理器
    return handler(request, user)
  })
}
