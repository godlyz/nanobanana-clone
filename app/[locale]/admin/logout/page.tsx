/**
 * 后台登出页面
 * 自动执行登出操作并重定向到登录页
 */

'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogoutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  // 🔥 老王修复：使用 use() 解包 params
  const { locale } = use(params)
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      try {
        console.log('🚪 开始登出...')
        
        const response = await fetch('/api/admin/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })

        const data = await response.json()

        if (data.success) {
          console.log('✅ 登出成功，清除本地数据')
          // 清除所有本地存储
          localStorage.clear()
          sessionStorage.clear()

          // 🔥 老王修复：跳转到登录页面时带上语言前缀
          window.location.href = `/${locale}/admin/login`
        } else {
          console.error('❌ 登出失败:', data.error)
          window.location.href = `/${locale}/admin/login`
        }
      } catch (error) {
        console.error('❌ 登出错误:', error)
        // 即使出错也要清除本地数据并跳转
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = `/${locale}/admin/login`
      }
    }

    logout()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">正在退出登录...</p>
      </div>
    </div>
  )
}
