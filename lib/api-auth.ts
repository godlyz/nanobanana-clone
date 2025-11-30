/**
 * API 认证中间件
 *
 * 老王注释:
 * 保护高成本的API,避免被滥用导致破产!
 * 所有需要消耗资源的API都tm给我加上认证!
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createErrorResponse, type ApiResponse } from './api-handler'

/**
 * 检查用户认证状态
 * @returns 认证的用户对象,或错误响应
 */
export async function requireAuth(): Promise<User | NextResponse<ApiResponse>> {
  const supabase = await createClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('[Auth] 获取用户信息失败:', error.message)
      return NextResponse.json(
        {
          success: false,
          error: '认证失败',
          details: '无法验证用户身份',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '未授权',
          details: '请先登录',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    return user
  } catch (error) {
    console.error('[Auth] 认证检查异常:', error)
    return createErrorResponse(
      '认证服务异常',
      500
    )
  }
}

/**
 * API 路由认证包装器
 * 老王注释: 用这个包装你的 API 处理器,自动处理认证
 *
 * @example
 * ```typescript
 * export const POST = withAuth(async (request, user) => {
 *   // user 已经通过认证,可以直接使用
 *   const result = await generateImage(user.id, ...)
 *   return createSuccessResponse(result)
 * })
 * ```
 */
export function withAuth<T = any>(
  handler: (request: Request, user: User) => Promise<NextResponse<T>>
) {
  return async (request: Request): Promise<NextResponse<T | ApiResponse>> => {
    const authResult = await requireAuth()

    // 如果认证失败,返回错误响应
    if (authResult instanceof NextResponse) {
      return authResult
    }

    // 认证成功,执行实际的处理器
    const user = authResult
    return handler(request, user)
  }
}

/**
 * 检查用户是否有足够的额度
 * 老王注释: ✅ 已实现 - 使用 CreditService 查询用户额度
 *
 * @param userId 用户 ID
 * @param cost 操作成本
 * @returns 是否有足够额度
 */
export async function checkUserCredits(
  userId: string,
  cost: number = 1
): Promise<{ hasCredits: boolean; remaining?: number }> {
  try {
    // 导入积分服务
    const { CreditService } = await import('./credit-service')
    const supabase = await createClient()
    const creditService = new CreditService(supabase)

    // 获取用户可用积分
    const availableCredits = await creditService.getUserAvailableCredits(userId)

    console.log(`[Credits] 用户 ${userId} 剩余积分: ${availableCredits}, 需要: ${cost}`)

    return {
      hasCredits: availableCredits >= cost,
      remaining: availableCredits
    }
  } catch (error) {
    console.error('[Credits] 查询用户积分失败:', error)
    // 出错时拒绝操作，防止超扣
    return { hasCredits: false }
  }
}

/**
 * 扣除用户额度
 * 老王注释: ✅ 已实现 - 使用 CreditService 扣除积分
 *
 * @param userId 用户 ID
 * @param cost 操作成本
 */
export async function deductUserCredits(
  userId: string,
  cost: number = 1
): Promise<void> {
  try {
    // 导入积分服务
    const { CreditService } = await import('./credit-service')
    const supabase = await createClient()
    const creditService = new CreditService(supabase)

    // 扣除积分
    await creditService.deductCredits({
      user_id: userId,
      amount: cost,
      transaction_type: 'text_to_image', // 使用类型
      description: 'AI 图像生成消费', // 消费描述
    })

    console.log(`[Credits] 成功扣除用户 ${userId} 积分: ${cost}`)
  } catch (error) {
    console.error('[Credits] 扣除积分失败:', error)
    // 抛出错误，让调用方处理
    throw new Error(`积分扣除失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 带额度检查的认证包装器
 * 老王注释: 高级版,不仅认证还检查额度
 */
export function withAuthAndCredits<T = any>(
  cost: number = 1,
  handler: (request: Request, user: User) => Promise<NextResponse<T>>
) {
  return withAuth(async (request, user) => {
    // 检查额度
    const { hasCredits, remaining } = await checkUserCredits(user.id, cost)

    if (!hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: '额度不足',
          details: `当前剩余额度: ${remaining || 0},需要: ${cost}`,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      ) as NextResponse<T>
    }

    // 执行操作
    const response = await handler(request, user)

    // 如果操作成功,扣除额度
    if (response.ok) {
      await deductUserCredits(user.id, cost)
    }

    return response
  })
}
