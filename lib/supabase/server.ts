import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('your_supabase') ||
    supabaseAnonKey.includes('your_supabase')
  ) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file. See SUPABASE_SETUP.md for instructions.'
    )
  }

  // 🔥 老王修复：支持从Authorization header读取token（用于API测试）
  const authHeader = headerStore.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    // 检测到Bearer token，使用anon client + 全局headers
    const { createClient: createAnonClient } = await import('@supabase/supabase-js')
    const token = authHeader.substring(7)

    return createAnonClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })
  }

  // 常规cookie-based认证
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}


