/**
 * 🔥 老王的用户权限检查中间件
 * 用途: 检查用户是否有权限访问特定资源
 * 老王警告: 这个权限检查要是出了问题，数据安全都要完蛋！
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 权限定义
export interface Permission {
  resource: string
  action: string
  description: string
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    // 用户管理权限
    { resource: 'users', action: 'read', description: '查看用户' },
    { resource: 'users', action: 'write', description: '修改用户' },
    { resource: 'users', action: 'delete', description: '删除用户' },
    { resource: 'users', action: 'role_manage', description: '管理角色' },

    // 系统配置权限
    { resource: 'config', action: 'read', description: '查看配置' },
    { resource: 'config', action: 'write', description: '修改配置' },
    { resource: 'config', action: 'delete', description: '删除配置' },

    // 活动规则权限
    { resource: 'promotion', action: 'read', description: '查看活动' },
    { resource: 'promotion', action: 'write', description: '修改活动' },
    { resource: 'promotion', action: 'delete', description: '删除活动' },
    { resource: 'promotion', action: 'activate', description: '激活活动' },

    // 审计日志权限
    { resource: 'audit', action: 'read', description: '查看日志' },
    { resource: 'audit', action: 'export', description: '导出日志' },
    { resource: 'audit', action: 'delete', description: '删除日志' },

    // 系统管理权限
    { resource: 'system', action: 'backup', description: '系统备份' },
    { resource: 'system', action: 'restore', description: '系统恢复' },
    { resource: 'system', action: 'maintenance', description: '系统维护' }
  ],

  admin: [
    // 用户管理权限（有限）
    { resource: 'users', action: 'read', description: '查看用户' },
    { resource: 'users', action: 'write', description: '修改用户信息' },

    // 系统配置权限
    { resource: 'config', action: 'read', description: '查看配置' },
    { resource: 'config', action: 'write', description: '修改配置' },

    // 活动规则权限
    { resource: 'promotion', action: 'read', description: '查看活动' },
    { resource: 'promotion', action: 'write', description: '修改活动' },
    { resource: 'promotion', action: 'activate', description: '激活活动' },

    // 审计日志权限
    { resource: 'audit', action: 'read', description: '查看日志' },
    { resource: 'audit', action: 'export', description: '导出日志' }
  ],

  viewer: [
    // 只读权限
    { resource: 'users', action: 'read', description: '查看用户' },
    { resource: 'config', action: 'read', description: '查看配置' },
    { resource: 'promotion', action: 'read', description: '查看活动' },
    { resource: 'audit', action: 'read', description: '查看日志' }
  ]
}

// 用户信息接口
export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  status: string
  permissions: Permission[]
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(
  user: UserInfo | null,
  resource: string,
  action: string
): boolean {
  if (!user) return false

  // 检查用户状态
  if (user.status !== 'active') {
    return false
  }

  // 检查权限
  return user.permissions.some(
    permission => permission.resource === resource && permission.action === action
  )
}

/**
 * 获取用户的所有权限
 */
export function getUserPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * 验证用户身份并获取权限信息
 */
export async function getUserFromToken(token: string): Promise<UserInfo | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 验证JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    // 从admin_users表获取管理员信息
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email!)
      .single()

    if (adminError || !adminUser) {
      return null
    }

    // 获取用户权限
    const permissions = getUserPermissions(adminUser.role)

    return {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      status: adminUser.status,
      permissions
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 从请求中提取用户信息
 */
export async function getUserFromRequest(request: NextRequest): Promise<UserInfo | null> {
  try {
    // 从Authorization header中获取token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    return await getUserFromToken(token)
  } catch (error) {
    console.error('从请求中获取用户信息失败:', error)
    return null
  }
}

/**
 * 创建权限检查中间件
 */
export function requirePermission(resource: string, action: string) {
  return async (request: NextRequest) => {
    try {
      const user = await getUserFromRequest(request)

      if (!user) {
        return NextResponse.json(
          { success: false, error: '未授权访问' },
          { status: 401 }
        )
      }

      if (!hasPermission(user, resource, action)) {
        return NextResponse.json(
          {
            success: false,
            error: '权限不足',
            required: { resource, action },
            user_role: user.role
          },
          { status: 403 }
        )
      }

      // 将用户信息附加到请求头中，供后续处理使用
      const headers = new Headers(request.headers)
      headers.set('x-user-info', JSON.stringify(user))

      return { user, headers }
    } catch (error) {
      console.error('权限检查失败:', error)
      return NextResponse.json(
        { success: false, error: '权限检查失败' },
        { status: 500 }
      )
    }
  }
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(user: UserInfo | null): boolean {
  return user?.role === 'super_admin' && user.status === 'active'
}

/**
 * 检查是否为管理员（包含超级管理员）
 */
export function isAdmin(user: UserInfo | null): boolean {
  return (user?.role === 'admin' || user?.role === 'super_admin') && user.status === 'active'
}

/**
 * 检查用户是否可以修改指定角色的用户
 */
export function canManageRole(manager: UserInfo | null, targetRole: string): boolean {
  if (!manager || manager.status !== 'active') {
    return false
  }

  // 超级管理员可以管理所有角色
  if (manager.role === 'super_admin') {
    return true
  }

  // 普通管理员只能管理viewer角色
  if (manager.role === 'admin' && targetRole === 'viewer') {
    return true
  }

  // viewer不能管理任何角色
  return false
}

/**
 * 获取角色权限摘要
 */
export function getRolePermissionsSummary(role: string): {
  total: number
  byResource: Record<string, number>
  canWrite: boolean
  canDelete: boolean
  canManageUsers: boolean
} {
  const permissions = getUserPermissions(role)

  const byResource: Record<string, number> = {}
  let canWrite = false
  let canDelete = false
  let canManageUsers = false

  permissions.forEach(permission => {
    byResource[permission.resource] = (byResource[permission.resource] || 0) + 1

    if (permission.action === 'write' || permission.action === 'role_manage') {
      canWrite = true
    }

    if (permission.action === 'delete') {
      canDelete = true
    }

    if (permission.resource === 'users' && permission.action !== 'read') {
      canManageUsers = true
    }
  })

  return {
    total: permissions.length,
    byResource,
    canWrite,
    canDelete,
    canManageUsers
  }
}

/**
 * 客户端权限检查Hook（用于React组件）
 */
export function usePermissions() {
  const checkPermission = (user: UserInfo | null, resource: string, action: string) => {
    return hasPermission(user, resource, action)
  }

  const canAccess = (user: UserInfo | null, permissions: Array<{resource: string, action: string}>) => {
    return permissions.every(({ resource, action }) => hasPermission(user, resource, action))
  }

  const getAccessibleActions = (user: UserInfo | null, resource: string) => {
    if (!user) return []

    return user.permissions
      .filter(permission => permission.resource === resource)
      .map(permission => permission.action)
  }

  return {
    checkPermission,
    canAccess,
    getAccessibleActions,
    isSuperAdmin: (user: UserInfo | null) => isSuperAdmin(user),
    isAdmin: (user: UserInfo | null) => isAdmin(user)
  }
}

// 默认导出权限配置
export { ROLE_PERMISSIONS }