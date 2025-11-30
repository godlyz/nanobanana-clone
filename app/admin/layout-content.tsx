'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminUserInfo } from './user-info'

export function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // 登录和登出页面不显示导航栏，也不需要验证
  const showNav = pathname !== '/admin/login' && pathname !== '/admin/logout'
  const needsAuth = pathname !== '/admin/login' && pathname !== '/admin/logout'

  // 🔥 老王的管理员认证检查
  useEffect(() => {
    async function checkAuth() {
      // 如果是登录或登出页面，直接跳过认证检查
      if (!needsAuth) {
        setIsChecking(false)
        return
      }

      try {
        // 🔥 老王修复：移除 document.cookie 检查
        // httpOnly cookie 无法被 JavaScript 读取，直接调用 API 验证
        const response = await fetch('/api/admin/auth/verify', {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          console.warn('⚠️ Token验证失败，跳转到登录页')
          router.push('/admin/login')
          return
        }

        const data = await response.json()

        if (!data.success) {
          console.warn('⚠️ 验证失败，跳转到登录页')
          router.push('/admin/login')
          return
        }

        // 验证通过
        console.log('✅ 管理员认证通过')
        setIsAuthenticated(true)

      } catch (error) {
        console.error('❌ 认证检查失败:', error)
        router.push('/admin/login')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [pathname, router, needsAuth])

  // 如果正在检查认证，显示加载状态
  if (isChecking && needsAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">验证身份中...</p>
        </div>
      </div>
    )
  }

  // 如果需要认证但未通过，不渲染内容（防止闪烁）
  if (needsAuth && !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">NB</span>
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-bold text-gray-900">Nano Banana</h1>
                    <p className="text-xs text-gray-500">管理后台</p>
                  </div>
                </div>

                {/* 导航菜单 */}
                <nav className="hidden md:ml-10 md:flex md:space-x-8">
                  <a href="/admin" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    仪表板
                  </a>
                  <a href="/admin/config" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    系统配置
                  </a>
                  <a href="/admin/promotions" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    活动规则
                  </a>
                  <a href="/admin/users" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    用户管理
                  </a>
                  <a href="/admin/audit" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    审计日志
                  </a>
                  <a href="/admin/legal-settings" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    法律设置
                  </a>
                  <a href="/admin/challenges" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    挑战管理
                  </a>
                </nav>
              </div>

              {/* 右侧操作区 */}
              <div className="flex items-center space-x-4">
                {/* 用户菜单 */}
                <AdminUserInfo />

                {/* 退出按钮 */}
                <a 
                  href="/admin/logout"
                  className="text-gray-500 hover:text-gray-700 flex items-center space-x-2"
                  title="退出登录"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm hidden lg:inline">退出</span>
                </a>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 主要内容区域 */}
      <main className={showNav ? "max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" : ""}>
        {children}
      </main>
    </div>
  )
}
