/**
 * API 统一响应和错误处理
 *
 * 老王注释:
 * 所有API都应该用这个统一的格式返回结果,别tm再各写各的了!
 * 这样前端处理起来也方便,错误信息也规范
 */

import { NextResponse } from 'next/server'

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
  debugInfo?: any
  timestamp?: string
}

/**
 * 创建成功响应
 * @param data 返回的数据
 * @param status HTTP 状态码,默认 200
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * 创建错误响应
 * @param error 错误对象或错误消息
 * @param status HTTP 状态码,默认 500
 * @param additionalInfo 额外的调试信息
 */
export function createErrorResponse(
  error: Error | string,
  status = 500,
  additionalInfo?: Record<string, any>
): NextResponse<ApiResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const errorMessage = error instanceof Error ? error.message : error

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  }

  // 开发环境提供详细的错误信息
  if (isDevelopment && error instanceof Error) {
    response.details = error.stack
    response.debugInfo = {
      name: error.name,
      ...additionalInfo,
    }
  }

  return NextResponse.json(response, { status })
}

/**
 * 统一的错误处理器
 * 老王注释: 所有 try/catch 都用这个,保持一致性!
 *
 * @param error 捕获的错误
 * @param context 错误上下文(用于日志)
 * @returns 错误响应
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ApiResponse> {
  // 记录错误日志
  console.error(`[${context}] API Error:`, error)

  // 处理不同类型的错误
  if (error instanceof Error) {
    // 根据错误类型返回不同的状态码
    if (error.message.includes('Unauthorized') || error.message.includes('认证')) {
      return createErrorResponse(error, 401)
    }
    if (error.message.includes('Forbidden') || error.message.includes('权限')) {
      return createErrorResponse(error, 403)
    }
    if (error.message.includes('Not Found') || error.message.includes('未找到')) {
      return createErrorResponse(error, 404)
    }

    return createErrorResponse(error, 500)
  }

  // 未知错误
  return createErrorResponse('发生未知错误', 500)
}

/**
 * 验证请求参数
 * 老王注释: 简单的参数验证,复杂的用 Zod
 *
 * @param data 请求数据
 * @param requiredFields 必填字段
 * @returns 验证结果
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}

/**
 * 创建参数验证错误响应
 */
export function createValidationError(
  missingFields: string[]
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: '缺少必填参数',
      details: `缺少字段: ${missingFields.join(', ')}`,
      timestamp: new Date().toISOString(),
    },
    { status: 400 }
  )
}
