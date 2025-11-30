/**
 * 后台独立登录 API
 * 使用 Supabase Auth 的邮箱密码认证
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cookies } from 'next/headers'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // 1. 输入验证
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱和密码' },
        { status: 400 }
      )
    }

    // 2. 使用 Service Client 进行认证
    const supabase = createServiceClient()

    // 先检查用户是否在 admin_users 表中
    const { data: adminUser, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'active')
      .single()

    if (adminCheckError || !adminUser) {
      return NextResponse.json(
        { success: false, error: '该账号不是管理员或未激活' },
        { status: 403 }
      )
    }

    // 3. 使用邮箱密码登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    })

    if (authError) {
      console.error('登录失败:', authError)
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    if (!authData.session) {
      return NextResponse.json(
        { success: false, error: '登录失败，未能创建会话' },
        { status: 500 }
      )
    }

    // 4. 设置后台专用的 session cookies
    const cookieStore = await cookies()
    
    // 设置 access token - 使用根路径以便所有页面都能访问
    cookieStore.set('admin-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // 设置 refresh token
    cookieStore.set('admin-refresh-token', authData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    console.log('✅ 管理员登录成功:', {
      email: authData.user.email,
      role: adminUser.role,
      user_id: authData.user.id
    })

    // 5. 记录登录日志
    await supabase.from('audit_logs').insert({
      admin_id: authData.user.id,
      action_type: 'admin_login',
      resource_type: 'auth',
      ip_address: getClientIp(req.headers),
      user_agent: req.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('登录 API 错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
