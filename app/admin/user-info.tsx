/**
 * 🔥 老王的管理员用户信息显示组件
 * 用途: 在管理后台顶部显示当前登录的管理员信息
 * 老王警告: 这个组件要是显示错了用户，管理员都要乱套了！
 */

'use client'

import { useEffect, useState } from 'react'

interface AdminUser {
  id: string
  email: string
  role: string
}

export function AdminUserInfo() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 从管理后台验证 API 获取用户信息
    const fetchAdminUser = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        }
      } catch (err) {
        console.error('❌ 获取管理员信息异常:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return null // 未登录时不显示
  }

  // 获取用户显示名称
  const displayName = user.email?.split('@')[0] || '管理员'

  // 角色显示文本
  const roleText = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'viewer': '查看者'
  }[user.role] || user.role

  return (
    <div className="flex items-center space-x-3">
      {/* 用户头像 */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="hidden md:block">
        <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
          <span>{displayName}</span>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
            {roleText}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {user.email}
        </div>
      </div>
    </div>
  )
}
