/**
 * 🔥 老王的用户登录API
 * 用途: 处理邮箱/用户名登录，创建会话
 * 老王警告: 这个API涉及账号安全，多层防护，别tm乱改！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkRateLimit, RateLimitAction } from '@/lib/rate-limit'
import { createSession } from '@/lib/session-manager'
import bcrypt from 'bcryptjs'
import { getClientIp } from '@/lib/request-ip'

// 请求体接口
interface LoginRequest {
  identifier: string  // 邮箱或用户名
  password: string
  turnstileToken: string
}

/**
 * 🔥 用户登录API
 * POST /api/auth/login
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔐 收到用户登录请求')

    // 1. 解析请求体
    const body: LoginRequest = await req.json()
    const { identifier, password, turnstileToken } = body

    // 验证必填字段
    if (!identifier || !password || !turnstileToken) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数'
      }, { status: 400 })
    }

    // 2. 获取客户端IP和User-Agent
    const clientIp = getClientIp(req.headers)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log(`🔍 客户端信息 - IP: ${clientIp}, UA: ${userAgent.substring(0, 50)}...`)

    // 3. 验证Turnstile图形验证码
    console.log('🔒 验证Turnstile图形验证码...')
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp)

    if (!turnstileResult.valid) {
      console.warn('❌ Turnstile验证失败')
      return NextResponse.json({
        success: false,
        error: turnstileResult.reason || '图形验证失败，请刷新页面重试'
      }, { status: 400 })
    }

    console.log('✅ Turnstile验证通过')

    // 4. 检查登录限流（每个IP 15分钟内最多5次）
    console.log('⏱️ 检查登录限流...')
    const rateLimitResult = await checkRateLimit(
      RateLimitAction.LOGIN_ATTEMPT,
      clientIp
    )

    if (!rateLimitResult.success) {
      console.warn('❌ 登录限流触发:', clientIp)
      return NextResponse.json({
        success: false,
        error: rateLimitResult.reason || '登录尝试过于频繁，请稍后重试',
        resetAt: rateLimitResult.resetAt
      }, { status: 429 })
    }

    console.log(`✅ 登录限流检查通过 (剩余次数: ${rateLimitResult.remaining})`)

    // 5. 创建数据库客户端
    const supabase = createServiceClient()

    // 6. 查找用户（支持邮箱或用户名登录）
    console.log('🔍 查找用户:', identifier)

    // 判断是邮箱还是用户名
    const isEmail = identifier.includes('@')

    const normalizedIdentifier = identifier.trim().toLowerCase()
    let userData: any = null

    const { data: usersResult, error: listUsersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (listUsersError) {
      console.error('❌ 获取用户列表失败:', listUsersError)
      return NextResponse.json({
        success: false,
        error: '服务器错误，请稍后重试'
      }, { status: 500 })
    }

    if (usersResult?.users) {
      if (isEmail) {
        userData = usersResult.users.find(user => user.email?.toLowerCase() === normalizedIdentifier)
      } else {
        userData = usersResult.users.find(user =>
          typeof user.user_metadata?.username === 'string' &&
          user.user_metadata.username.toLowerCase() === normalizedIdentifier
        )
      }
    }

    if (!userData) {
      console.warn('❌ 用户不存在:', identifier)

      // 记录失败日志
      await supabase
        .from('login_logs')
        .insert({
          email: identifier,
          ip_address: clientIp,
          user_agent: userAgent,
          success: false,
          failure_reason: '用户不存在'
        })

      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    console.log('✅ 用户找到:', userData.email)

    const hasPasswordProvider = Array.isArray(userData.app_metadata?.providers)
      ? userData.app_metadata.providers.includes('email')
      : false

    // 7. 验证密码
    console.log('🔒 验证密码...')

    // 使用Supabase验证密码
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: password
    })

    if (authError || !authData.user) {
      console.warn('❌ 密码错误:', userData.email)

      // 记录失败日志
      await supabase
        .from('login_logs')
        .insert({
          user_id: userData.id,
          email: userData.email,
          ip_address: clientIp,
          user_agent: userAgent,
          success: false,
          failure_reason: '密码错误'
        })

      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    console.log('✅ 密码验证通过')

    // 8. 创建会话
    console.log('🔑 创建用户会话...')
    const session = await createSession(
      userData.id,
      userData.email,
      clientIp,
      userAgent,
      hasPasswordProvider
    )

    if (!session) {
      console.error('❌ 创建会话失败')
      return NextResponse.json({
        success: false,
        error: '登录失败，请稍后重试'
      }, { status: 500 })
    }

    console.log('✅ 会话创建成功')

    // 9. 记录成功日志
    await supabase
      .from('login_logs')
      .insert({
        user_id: userData.id,
        email: userData.email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true,
        failure_reason: null
      })

    // 10. 返回成功响应
    console.log('🎉 用户登录成功!')

    return NextResponse.json({
      success: true,
      message: '登录成功',
      session: {
        token: session.sessionToken,
        expiresAt: session.expiresAt
      },
      supabaseSession: authData.session ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
        token_type: authData.session.token_type
      } : null,
      user: {
        id: userData.id,
        email: userData.email,
        username: typeof userData.user_metadata?.username === 'string'
          ? userData.user_metadata.username
          : userData.email.split('@')[0]
      }
    })

  } catch (error) {
    console.error('❌ 用户登录API异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}

/**
 * 🔥 健康检查
 * GET /api/auth/login
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'User login API is running',
    version: '1.0.0'
  })
}
