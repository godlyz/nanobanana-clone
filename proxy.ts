import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service' // 🔥 老王新增：导入 Service Client

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 后台路由保护（除了登录页和登出页）
  if (pathname.startsWith('/admin')) {
    // 允许访问登录页和登出页
    if (pathname === '/admin/login' || pathname === '/admin/logout') {
      console.log('✅ 允许访问登录/登出页:', pathname)
      return NextResponse.next()
    }

    // 验证后台管理员权限
    const adminAccessToken = request.cookies.get('admin-access-token')
    
    console.log('🔍 检查后台权限:', {
      pathname,
      hasToken: !!adminAccessToken,
      cookies: request.cookies.getAll().map(c => c.name)
    })
    
    if (!adminAccessToken) {
      // 未登录，重定向到后台登录页
      console.log('❌ 未找到 admin-access-token，重定向到登录页')
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 验证 token 有效性并检查是否为管理员
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return [
              { name: 'sb-access-token', value: adminAccessToken.value },
            ]
          },
          setAll() {},
        },
      })

      const { data: { user }, error: authError } = await supabase.auth.getUser(adminAccessToken.value)

      if (authError || !user) {
        // Token 无效，重定向到登录页
        console.log('❌ Token 无效:', authError?.message)
        const loginUrl = new URL('/admin/login', request.url)
        return NextResponse.redirect(loginUrl)
      }

      console.log('✅ 用户验证成功:', user.email)

      // 🔥 老王修复：使用 Service Client 查询 admin_users，绕过 RLS 无限递归问题
      const serviceClient = createServiceClient()
      const { data: adminUser, error: adminError } = await serviceClient
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) // 🔥 老王修复：字段名是 is_active，不是 status
        .single()

      if (adminError || !adminUser) {
        // 不是管理员，重定向到登录页
        console.log('❌ 不是管理员或未激活:', adminError?.message)
        const loginUrl = new URL('/admin/login', request.url)
        return NextResponse.redirect(loginUrl)
      }

      console.log('✅ 管理员验证通过:', { email: adminUser.email, role: adminUser.role })
      
      // 验证通过，继续请求
      return NextResponse.next()
    } catch (error) {
      console.error('后台权限验证失败:', error)
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2. 前台受保护路由认证检查
  // 🔥 老王新增：保护需要登录才能访问的前台页面
  const protectedPaths = [
    '/blog/new',
    '/blog/edit',
    '/profile/edit',
    '/forum/new',
  ]

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    console.log('🔍 检查前台受保护路由:', pathname)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // 如果Supabase未配置，提示错误并拦截
      if (
        !supabaseUrl ||
        !supabaseKey ||
        supabaseUrl.includes('your_supabase') ||
        supabaseKey.includes('your_supabase')
      ) {
        console.error('❌ Supabase未正确配置，无法验证用户身份')
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'supabase_not_configured')
        return NextResponse.redirect(redirectUrl)
      }

      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value)
              })
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

      // 未登录用户重定向到登录页，并保留原始请求URL
      if (!user) {
        console.log(`🔒 未认证用户尝试访问受保护路由: ${pathname}`)
        const redirectUrl = new URL('/login', request.url)
        // 保存用户原本想访问的页面，登录后可以返回
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      console.log(`✅ 已认证用户访问受保护路由: ${pathname} (${user.email})`)
    } catch (error) {
      console.error('❌ 前台路由认证检查失败:', error)
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'auth_check_failed')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 3. 其他前台路由（使用前台的 session 更新）
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
