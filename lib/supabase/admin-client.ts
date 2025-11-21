/**
 * 后台专用的 Supabase Client
 * 使用独立的 cookies (admin-access-token, admin-refresh-token)
 * 与前台的 Supabase Auth 完全分离
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createAdminClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('your_supabase') ||
    supabaseAnonKey.includes('your_supabase')
  ) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // 只获取后台专用的 cookies
        const adminAccessToken = cookieStore.get('admin-access-token')
        const adminRefreshToken = cookieStore.get('admin-refresh-token')

        const cookies = []
        
        // 映射到 Supabase 标准 cookie 名称
        if (adminAccessToken) {
          cookies.push({
            name: 'sb-access-token',
            value: adminAccessToken.value,
          })
        }
        
        if (adminRefreshToken) {
          cookies.push({
            name: 'sb-refresh-token',
            value: adminRefreshToken.value,
          })
        }

        return cookies
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 将 Supabase 标准 cookie 映射到后台专用 cookie
            if (name === 'sb-access-token') {
              cookieStore.set('admin-access-token', value, {
                ...options,
                path: '/admin',
              })
            } else if (name === 'sb-refresh-token') {
              cookieStore.set('admin-refresh-token', value, {
                ...options,
                path: '/admin',
              })
            }
          })
        } catch {
          // Server Component 中调用 setAll 可以忽略
          // middleware 会刷新 session
        }
      },
    },
  })
}

/**
 * 验证当前用户是否为管理员
 */
export async function verifyAdminAccess(): Promise<{
  isAdmin: boolean
  user?: any
  adminUser?: any
  error?: string
}> {
  try {
    const supabase = await createAdminClient()

    // 1. 获取当前认证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        isAdmin: false,
        error: '未登录或会话已过期',
      }
    }

    // 2. 检查用户是否在 admin_users 表中
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (adminError || !adminUser) {
      return {
        isAdmin: false,
        user,
        error: '该账号不是管理员或未激活',
      }
    }

    return {
      isAdmin: true,
      user,
      adminUser,
    }
  } catch (error) {
    console.error('验证管理员权限失败:', error)
    return {
      isAdmin: false,
      error: '验证失败',
    }
  }
}
