/**
 * 🔥 老王的审计日志中间件
 * 用途: 自动记录所有管理员操作的审计日志
 * 老王警告: 这个中间件要是漏记日志，合规审计就要出大问题！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from './supabase/service'
import { getClientIp } from './request-ip'

// 审计日志接口
export interface AuditLogEntry {
  adminId: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

// 审计日志配置
export interface AuditConfig {
  enabled: boolean
  logRequestBody: boolean
  logResponseBody: boolean
  sensitiveFields: string[]
  excludePaths: string[]
  maxPayloadSize: number // bytes
}

// 默认配置
const DEFAULT_CONFIG: AuditConfig = {
  enabled: true,
  logRequestBody: false, // 出于安全和存储考虑，默认不记录请求体
  logResponseBody: false, // 默认不记录响应体
  sensitiveFields: ['password', 'token', 'secret', 'key', 'auth'],
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  maxPayloadSize: 10240 // 10KB
}

/**
 * 🔥 审计日志中间件
 */
export class AuditMiddleware {
  private config: AuditConfig
  private supabase = createServiceClient()

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 🔥 检查路径是否应该被排除
   */
  private shouldExcludePath(path: string): boolean {
    return this.config.excludePaths.some(excludePath =>
      path.startsWith(excludePath)
    )
  }

  /**
   * 🔥 清理敏感数据
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data }

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()

        // 检查是否是敏感字段
        const isSensitive = this.config.sensitiveFields.some(field =>
          lowerKey.includes(field.toLowerCase())
        )

        if (isSensitive) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value)
        } else {
          result[key] = value
        }
      }

      return result
    }

    return sanitizeObject(sanitized)
  }

  /**
   * 🔥 检查数据大小
   */
  private checkDataSize(data: any): boolean {
    if (!data) return true

    try {
      const size = JSON.stringify(data).length
      return size <= this.config.maxPayloadSize
    } catch {
      return false
    }
  }

  /**
   * 🔥 提取请求信息
   */
  private extractRequestInfo(req: NextRequest): {
    method: string
    path: string
    query: Record<string, string>
    headers: Record<string, string>
    userAgent?: string
    ipAddress?: string
  } {
    const url = new URL(req.url)

    return {
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(req.headers.entries()),
      userAgent: req.headers.get('user-agent') || undefined,
      // 🔥 老王 Day 3 修复：Next.js 16 没有 req.ip，统一使用 getClientIp
      ipAddress: getClientIp(req.headers)
    }
  }

  /**
   * 🔥 记录审计日志
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      if (!this.config.enabled) {
        return
      }

      const sanitizedEntry: AuditLogEntry = {
        ...entry,
        oldValues: entry.oldValues ? this.sanitizeData(entry.oldValues) : undefined,
        newValues: entry.newValues ? this.sanitizeData(entry.newValues) : undefined,
        metadata: entry.metadata ? this.sanitizeData(entry.metadata) : undefined
      }

      // 检查数据大小
      if (sanitizedEntry.oldValues && !this.checkDataSize(sanitizedEntry.oldValues)) {
        sanitizedEntry.oldValues = '[PAYLOAD_TOO_LARGE]'
      }

      if (sanitizedEntry.newValues && !this.checkDataSize(sanitizedEntry.newValues)) {
        sanitizedEntry.newValues = '[PAYLOAD_TOO_LARGE]'
      }

      await this.supabase
        .from('audit_logs')
        .insert({
          admin_id: sanitizedEntry.adminId,
          action: sanitizedEntry.action,
          resource_type: sanitizedEntry.resourceType,
          resource_id: sanitizedEntry.resourceId,
          old_values: sanitizedEntry.oldValues,
          new_values: sanitizedEntry.newValues,
          ip_address: sanitizedEntry.ipAddress,
          user_agent: sanitizedEntry.userAgent,
          metadata: sanitizedEntry.metadata,
          created_at: new Date().toISOString()
        })

      console.log(`✅ 审计日志已记录: ${sanitizedEntry.action} -> ${sanitizedEntry.resourceType}`)

    } catch (error) {
      console.error('❌ 记录审计日志失败:', error)
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 🔥 包装 API 处理器以自动记录审计日志
   */
  wrapHandler(
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: {
      action: string
      resourceType: string
      extractResourceId?: (req: NextRequest) => string | undefined
      extractOldValues?: (req: NextRequest) => Promise<any>
      extractNewValues?: (req: NextRequest, res: NextResponse) => Promise<any>
    }
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now()
      let responseData: NextResponse | null = null
      let error: Error | null = null

      try {
        // 检查是否应该排除
        const path = new URL(req.url).pathname
        if (this.shouldExcludePath(path)) {
          return await handler(req)
        }

        // 提取管理员ID（假设从请求头或认证信息中获取）
        const adminId = this.extractAdminId(req)
        if (!adminId) {
          return await handler(req) // 如果没有管理员ID，不记录审计日志
        }

        // 提取请求信息
        const requestInfo = this.extractRequestInfo(req)

        // 提取旧值（更新操作前）
        let oldValues: any = undefined
        if (options.extractOldValues) {
          try {
            oldValues = await options.extractOldValues(req)
          } catch (err) {
            console.warn('⚠️ 提取旧值失败:', err)
          }
        }

        // 执行原始处理器
        responseData = await handler(req)

        // 提取新值（操作后）
        let newValues: any = undefined
        if (options.extractNewValues && responseData) {
          try {
            newValues = await options.extractNewValues(req, responseData)
          } catch (err) {
            console.warn('⚠️ 提取新值失败:', err)
          }
        }

        // 记录审计日志
        await this.log({
          adminId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.extractResourceId ? options.extractResourceId(req) : undefined,
          oldValues,
          newValues,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          metadata: {
            method: requestInfo.method,
            path: requestInfo.path,
            query: requestInfo.query,
            duration: Date.now() - startTime,
            statusCode: responseData?.status
          }
        })

        return responseData

      } catch (err) {
        error = err as Error

        // 记录错误审计日志
        const adminId = this.extractAdminId(req)
        if (adminId) {
          const requestInfo = this.extractRequestInfo(req)

          await this.log({
            adminId,
            action: options.action,
            resourceType: options.resourceType,
            newValues: {
              error: error.message,
              stack: error.stack
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            metadata: {
              method: requestInfo.method,
              path: requestInfo.path,
              query: requestInfo.query,
              duration: Date.now() - startTime,
              status: 'error'
            }
          })
        }

        throw error
      }
    }
  }

  /**
   * 🔥 提取管理员ID
   * TODO: 根据实际的认证系统实现
   */
  private extractAdminId(req: NextRequest): string | null {
    // 临时实现：从 header 中获取
    const adminId = req.headers.get('x-admin-id')
    if (adminId) {
      return adminId
    }

    // 另一种实现：从 JWT token 中解析
    // const token = req.headers.get('authorization')?.replace('Bearer ', '')
    // if (token) {
    //   try {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    //     return decoded.userId
    //   } catch (err) {
    //     console.warn('⚠️ JWT token 解析失败:', err)
    //   }
    // }

    return null
  }
}

// 创建默认的审计中间件实例
export const auditMiddleware = new AuditMiddleware()

/**
 * 🔥 快捷函数：创建带有审计记录的处理器
 */
export function withAudit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    action: string
    resourceType: string
    extractResourceId?: (req: NextRequest) => string | undefined
    extractOldValues?: (req: NextRequest) => Promise<any>
    extractNewValues?: (req: NextRequest, res: NextResponse) => Promise<any>
  }
) {
  return auditMiddleware.wrapHandler(handler, options)
}

/**
 * 🔥 快捷函数：记录简单的审计日志
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  return auditMiddleware.log(entry)
}

console.log('🔥 审计日志中间件模块加载完成')
