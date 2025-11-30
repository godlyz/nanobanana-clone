/**
 * 🔥 老王的RBAC认证中间件
 * 用途: 管理后台系统权限验证，防止未授权访问
 * 老王警告: 这个中间件要是放进去一个SAB，整个系统都要被爬虫搞废！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from './supabase/service'
import { createServerClient } from '@supabase/ssr'
import { getClientIp } from './request-ip'  // 🔥 老王 Day 3 新增：获取客户端 IP

// 管理员角色枚举
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',    // 超级管理员：所有权限
  ADMIN = 'admin',              // 管理员：大部分权限
  VIEWER = 'viewer'              // 查看者：只读权限
}

// 权限操作枚举
export enum AdminAction {
  // 配置管理
  CONFIG_READ = 'config_read',
  CONFIG_WRITE = 'config_write',
  CONFIG_DELETE = 'config_delete',

  // 活动规则管理
  PROMOTION_READ = 'promotion_read',
  PROMOTION_WRITE = 'promotion_write',
  PROMOTION_DELETE = 'promotion_delete',
  PROMOTION_ACTIVATE = 'promotion_activate',

  // 用户管理
  USER_READ = 'user_read',
  USER_WRITE = 'user_write',
  USER_DELETE = 'user_delete',
  USER_ROLE_MANAGE = 'user_role_manage',

  // 审计日志
  AUDIT_READ = 'audit_read',
  AUDIT_EXPORT = 'audit_export',

  // 系统管理
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_RESTORE = 'system_restore',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

/**
 * 获取用户邮箱地址
 * @param request Next.js 请求对象
 * @returns 用户邮箱或 null
 * 🔥 老王修复：从 cookie 中读取 admin-access-token，而不是从 Authorization header
 */
async function getUserEmail(request: NextRequest): Promise<string | null> {
  try {
    // 🔥 老王修复：从 cookie 中获取 admin-access-token
    const adminAccessToken = request.cookies.get('admin-access-token')

    if (!adminAccessToken) {
      console.warn('[AdminAuth] 未找到 admin-access-token cookie')
      return null
    }

    const token = adminAccessToken.value

    // 使用 Service Client 验证 token
    const supabase = createServiceClient()

    // 验证 token 并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user?.email) {
      console.warn('[AdminAuth] 获取用户邮箱失败:', error?.message)
      return null
    }

    return user.email
  } catch (error) {
    console.error('[AdminAuth] 获取用户邮箱异常:', error)
    return null
  }
}

/**
 * 验证管理员身份（检查是否在管理员白名单中）
 * @param email 用户邮箱
 * @param role 角色
 * @returns 验证结果
 */
export async function verifyAdminIdentity(email: string, role: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    const supabase = createServiceClient()

    // 🔥 老王修复：直接用 email 字段查询，不需要JOIN auth.users 表
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, role, status')
      .eq('email', email)
      .eq('status', 'active')  // 🔥 只查询激活的管理员
      .single()

    if (error) {
      console.warn('[AdminAuth] 查询管理员失败:', error.message)
      return { isValid: false, error: '管理员身份验证失败' }
    }

    if (!data) {
      console.warn('[AdminAuth] 用户不在管理员列表中:', email)
      return { isValid: false, error: '无管理员权限' }
    }

    // 验证角色匹配
    if (data.role !== role) {
      console.warn(`[AdminAuth] 角色不匹配: ${email}, 期望: ${role}, 实际: ${data.role}`)
      return { isValid: false, error: '管理员角色不匹配' }
    }

    console.log(`✅ [AdminAuth] 管理员身份验证成功: ${email}, 角色: ${data.role}`)
    return { isValid: true }
  } catch (error) {
    console.error('[AdminAuth] 验证管理员身份异常:', error)
    return { isValid: false, error: '身份验证服务异常' }
  }
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<AdminRole, AdminAction[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminAction), // 超级管理员拥有所有权限
  [AdminRole.ADMIN]: [
    AdminAction.CONFIG_READ,
    AdminAction.CONFIG_WRITE,
    AdminAction.PROMOTION_READ,
    AdminAction.PROMOTION_WRITE,
    AdminAction.PROMOTION_ACTIVATE,
    AdminAction.USER_READ,
    AdminAction.USER_WRITE,
    AdminAction.AUDIT_READ,
    AdminAction.AUDIT_EXPORT
  ],
  [AdminRole.VIEWER]: [
    AdminAction.CONFIG_READ,
    AdminAction.PROMOTION_READ,
    AdminAction.USER_READ,
    AdminAction.AUDIT_READ
  ]
}

// 管理员邮箱白名单（从环境变量获取）
const ADMIN_EMAIL_WHITELIST = process.env.ADMIN_EMAIL_WHITELIST?.split(',').map(email => email.trim().toLowerCase()) || []

/**
 * 🔥 检查权限
 * 验证用户角色是否具有执行特定操作的权限
 */
export function checkPermission(userRole: AdminRole, requiredAction: AdminAction): boolean {
  const userPermissions = ROLE_PERMISSIONS[userRole] || []
  return userPermissions.includes(requiredAction)
}

/**
 * 🔥 创建用于 API Route 的 Supabase 客户端
 * 能够正确处理用户认证
 */
function createRouteClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value
          }))
        },
        setAll() {
          // API Routes 不需要设置 cookies
        },
      },
    }
  )
}

/**
 * 🔥 获取用户角色
 * 从 admin-access-token 获取当前用户，然后查询数据库获取角色
 */
export async function getUserRole(req: NextRequest): Promise<AdminRole | null> {
  try {
    console.log('🔍 [getUserRole] 开始获取用户角色')
    
    // 首先检查 header 中的角色（用于测试或外部系统调用）
    const roleHeader = req.headers.get('x-admin-role')
    if (roleHeader && Object.values(AdminRole).includes(roleHeader as AdminRole)) {
      console.log(`✅ [getUserRole] 从 header 获取到角色: ${roleHeader}`)
      return roleHeader as AdminRole
    }

    // 从 cookie 中获取 admin-access-token
    const adminAccessToken = req.cookies.get('admin-access-token')
    
    if (!adminAccessToken) {
      const allCookies = req.cookies.getAll().map(c => c.name).join(', ')
      console.log(`⚠️ [getUserRole] 未找到 admin-access-token`)
      console.log(`📋 [getUserRole] 可用的 cookies: ${allCookies || '(无)'}`)
      return null
    }
    
    console.log(`✅ [getUserRole] 找到 admin-access-token: ${adminAccessToken.value.substring(0, 30)}...`)

    // 使用 service client 验证 token 并查询角色
    const serviceSupabase = createServiceClient()
    
    console.log(`🔍 [getUserRole] 验证 token...`)
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(adminAccessToken.value)

    if (authError) {
      console.log(`❌ [getUserRole] Token 验证失败: ${authError.message}`)
      return null
    }
    
    if (!user) {
      console.log(`❌ [getUserRole] Token 有效但未返回用户`)
      return null
    }

    console.log(`✅ [getUserRole] Token 验证成功: ${user.email}`)

    // 从 admin_users 表查询用户角色
    console.log(`🔍 [getUserRole] 查询管理员角色...`)
    const { data: adminUser, error: dbError } = await serviceSupabase
      .from('admin_users')
      .select('role, status')
      .eq('email', user.email)
      .eq('status', 'active')
      .single()

    if (dbError) {
      console.log(`❌ [getUserRole] 数据库查询失败: ${dbError.message}`)
      return null
    }
    
    if (!adminUser) {
      console.log(`⚠️ [getUserRole] 用户 ${user.email} 不是活跃管理员`)
      return null
    }

    console.log(`✅ [getUserRole] 用户 ${user.email} 的角色: ${adminUser.role}`)

    // 验证角色是否有效
    if (Object.values(AdminRole).includes(adminUser.role as AdminRole)) {
      return adminUser.role as AdminRole
    }

    console.error(`❌ [getUserRole] 无效的角色: ${adminUser.role}`)
    return null

  } catch (error) {
    console.error('❌ [getUserRole] 异常:', error instanceof Error ? error.message : error)
    console.error('❌ [getUserRole] 堆栈:', error instanceof Error ? error.stack : '')
    return null
  }
}

/**
 * 🔥 RBAC 中间件
 * 在 API 路由中使用，验证权限并记录审计日志
 */
export async function withAdminAuth(
  req: NextRequest,
  requiredAction?: AdminAction
): Promise<{ userRole: AdminRole | null; hasPermission: boolean; error?: string }> {
  try {
    console.log(`🔐 [withAdminAuth] 开始验证，需要权限: ${requiredAction || '无限制'}`)
    
    // 获取用户角色
    const userRole = await getUserRole(req)

    if (!userRole) {
      console.log(`❌ [withAdminAuth] 未获取到用户角色`)
      return {
        userRole: null,
        hasPermission: false,
        error: '未提供管理员身份信息'
      }
    }

    console.log(`✅ [withAdminAuth] 获取到用户角色: ${userRole}`)

    // 验证管理员身份（白名单检查）
    // ✅ 已实现 - 从认证信息中获取邮箱并验证身份
    try {
      const userEmail = await getUserEmail(req)

      if (!userEmail) {
        console.warn(`[AdminAuth] 无法获取用户邮箱，拒绝访问`)
        return {
          userRole,
          hasPermission: false,
          error: '无法验证管理员身份'
        }
      }

      // 验证管理员身份（检查是否在管理员白名单中）
      const identityCheck = await verifyAdminIdentity(userEmail, userRole)
      if (!identityCheck.isValid) {
        console.warn(`[AdminAuth] 管理员身份验证失败: ${userEmail}, 角色: ${userRole}, 错误: ${identityCheck.error}`)
        return {
          userRole,
          hasPermission: false,
          error: identityCheck.error
        }
      }

      console.log(`[AdminAuth] 管理员身份验证通过: ${userEmail}, 角色: ${userRole}`)
    } catch (error) {
      console.error('[AdminAuth] 身份验证异常:', error)
      return {
        userRole,
        hasPermission: false,
        error: '身份验证服务异常'
      }
    }

    // 检查权限
    let hasPermission = true
    if (requiredAction) {
      hasPermission = checkPermission(userRole, requiredAction)
      console.log(`🔐 [withAdminAuth] 权限检查结果: ${hasPermission} (${userRole} vs ${requiredAction})`)
    } else {
      console.log(`🔐 [withAdminAuth] 无需特定权限，允许访问`)
    }

    return {
      userRole,
      hasPermission
    }

  } catch (error) {
    console.error('❌ 权限验证失败:', error)
    return {
      userRole: null,
      hasPermission: false,
      error: '权限验证系统异常'
    }
  }
}

/**
 * 🔥 RBAC 中间件包装器
 * 用于 Next.js API 路由
 */
export function withRBAC(requiredAction?: AdminAction) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      try {
        console.log(`🔒 [withRBAC] 开始权限验证: ${requiredAction || 'any action'}`)
        console.log(`🔒 [withRBAC] 请求路径: ${req.nextUrl.pathname}`)
        
        // 执行权限验证
        const authResult = await withAdminAuth(req, requiredAction)

        console.log(`🔒 [withRBAC] 验证结果:`, {
          userRole: authResult.userRole,
          hasPermission: authResult.hasPermission,
          error: authResult.error
        })

        if (!authResult.hasPermission) {
          console.log(`❌ [withRBAC] 权限不足，拒绝访问`)
          return NextResponse.json({
            success: false,
            error: '权限不足',
            message: authResult.error || '您没有权限执行此操作',
            requiredAction,
            userRole: authResult.userRole
          }, { status: 403 })
        }

        // 权限验证通过，执行处理器
        console.log(`✅ [withRBAC] 权限验证通过: ${authResult.userRole} -> ${requiredAction || 'any action'}`)

        // 记录审计日志
        // ✅ 已实现 - 记录管理员操作审计日志
        try {
          const adminId = await getCurrentUserId(req)
          if (adminId) {
            await logAdminAction({
              adminId,
              action: requiredAction || 'unknown_action',
              resourceType: getResourceType(req.url),
              // 🔥 老王 Day 3 修复：Next.js 16 没有 req.ip，使用 getClientIp
              ipAddress: getClientIp(req.headers),
              userAgent: req.headers.get('user-agent') || 'unknown'
            })
          }
        } catch (auditError) {
          console.error('[AdminAuth] 记录审计日志失败:', auditError)
          // 审计日志失败不影响主要功能，记录错误即可
        }

        // 执行原始处理器
        return await handler(req)

      } catch (error) {
        console.error('❌ RBAC 中间件执行失败:', error)
        return NextResponse.json({
          success: false,
          error: '认证中间件异常',
          message: error instanceof Error ? error.message : '未知错误'
        }, { status: 500 })
      }
    }
  }
}

/**
 * 获取当前管理员用户ID
 * @param request Next.js 请求对象
 * @returns 用户ID或 null
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    // 从 Authorization header 中获取 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => undefined,
        },
      }
    )

    // 验证 token 并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user?.id) {
      return null
    }

    return user.id
  } catch (error) {
    return null
  }
}

/**
 * 从URL中提取资源类型
 * @param url 请求URL
 * @returns 资源类型字符串
 */
function getResourceType(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    // 根据路径确定资源类型
    if (pathname.includes('/admin/users')) return 'user_management'
    if (pathname.includes('/admin/config')) return 'system_config'
    if (pathname.includes('/admin/promotions')) return 'promotion_management'
    if (pathname.includes('/admin/audit')) return 'audit_log'
    if (pathname.includes('/admin/showcase')) return 'showcase_review'

    return 'unknown_resource'
  } catch (error) {
    return 'unknown_resource'
  }
}

/**
 * 🔥 记录管理员操作审计日志
 */
export async function logAdminAction(params: {
  adminId: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase
      .from('audit_logs')
      .insert({
        admin_id: params.adminId,
        action_type: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        old_value: params.oldValues,
        new_value: params.newValues,
        ip_address: params.ipAddress || 'unknown',
        user_agent: params.userAgent || 'unknown'
      })

    console.log(`✅ 审计日志已记录: ${params.action} -> ${params.resourceType}`)

  } catch (error) {
    console.error('❌ 记录审计日志失败:', error)
    // 不抛出错误，避免影响主要功能
  }
}

console.log('🔥 RBAC 认证中间件模块加载完成')