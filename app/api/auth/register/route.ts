/**
 * 🔥 老王的用户注册API
 * 用途: 处理邮箱注册，创建新用户账号
 * 老王警告: 这个API涉及账号安全，代码逻辑严密，别tm乱改！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkRateLimit, RateLimitAction } from '@/lib/rate-limit'
import { quickValidateEmail } from '@/lib/email-validation'
import { verifyCode, VerificationCodePurpose } from '@/lib/email-verification-code'
import bcrypt from 'bcryptjs'
import { isPasswordCompromised } from '@/lib/security/password-check'
import { getClientIp } from '@/lib/request-ip'

// 请求体接口
interface RegisterRequest {
  email: string
  password: string
  username?: string
  verificationCode: string
  turnstileToken: string
}

/**
 * 🔥 用户注册API
 * POST /api/auth/register
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📝 收到用户注册请求')

    // 1. 解析请求体
    const body: RegisterRequest = await req.json()
    const { email, password, username, verificationCode, turnstileToken } = body

    // 验证必填字段
    if (!email || !password || !verificationCode || !turnstileToken) {
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

    // 4. 快速验证邮箱格式（不调用API，节省配额）
    console.log('📮 验证邮箱格式...')
    const emailValidation = quickValidateEmail(email)

    if (!emailValidation.isValid || emailValidation.isBlacklisted) {
      console.warn('❌ 邮箱验证失败')
      return NextResponse.json({
        success: false,
        error: emailValidation.reason || '邮箱格式无效或已被禁用'
      }, { status: 400 })
    }

    console.log('✅ 邮箱格式验证通过')

    // 5. 验证密码强度
    console.log('🔐 验证密码强度...')
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: '密码长度至少8位'
      }, { status: 400 })
    }

    // 要求包含大小写字母、数字和特殊字符
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return NextResponse.json({
        success: false,
        error: '密码必须包含大写字母、小写字母、数字和特殊字符'
      }, { status: 400 })
    }

    console.log('✅ 密码强度验证通过')

    console.log('🛡️ 检查密码是否泄漏...')
    try {
      const compromised = await isPasswordCompromised(password)
      if (compromised) {
        return NextResponse.json({
          success: false,
          error: '该密码已出现在泄漏名单中，请使用更安全的密码'
        }, { status: 400 })
      }
    } catch (error) {
      console.error('❌ HIBP 检查失败:', error)
      return NextResponse.json({
        success: false,
        error: '密码安全检测暂时不可用，请稍后再试'
      }, { status: 503 })
    }

    console.log('✅ 密码泄漏检查通过')

    // 6. 验证邮箱验证码
    console.log('✉️ 验证邮箱验证码...')
    const codeVerification = await verifyCode(
      email,
      verificationCode,
      VerificationCodePurpose.REGISTER
    )

    if (!codeVerification.valid) {
      console.warn('❌ 邮箱验证码无效')
      return NextResponse.json({
        success: false,
        error: codeVerification.reason || '验证码无效或已过期'
      }, { status: 400 })
    }

    console.log('✅ 邮箱验证码验证通过')

    // 7. 检查注册限流（每个IP每天最多3次注册）
    console.log('⏱️ 检查注册限流...')
    const rateLimitResult = await checkRateLimit(
      RateLimitAction.REGISTRATION,
      clientIp
    )

    if (!rateLimitResult.success) {
      console.warn('❌ 注册限流触发:', clientIp)
      return NextResponse.json({
        success: false,
        error: rateLimitResult.reason || '注册操作过于频繁，请稍后重试',
        resetAt: rateLimitResult.resetAt
      }, { status: 429 })
    }

    console.log(`✅ 注册限流检查通过 (剩余次数: ${rateLimitResult.remaining})`)

    // 8. 创建数据库客户端
    const supabase = createServiceClient()

    // 9. 检查邮箱是否已注册
    console.log('🔍 检查邮箱是否已注册...')
    const { data: existingUser, error: checkError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.warn('❌ 邮箱已注册:', email)
      return NextResponse.json({
        success: false,
        error: '该邮箱已被注册'
      }, { status: 409 })
    }

    console.log('✅ 邮箱可用')

    // 10. 检查用户名是否已存在（如果提供了用户名）
    if (username) {
      console.log('🔍 检查用户名是否已存在...')
      const { data: existingUsername } = await supabase
        .from('auth.users')
        .select('id')
        .eq('raw_user_meta_data->username', username)
        .single()

      if (existingUsername) {
        console.warn('❌ 用户名已存在:', username)
        return NextResponse.json({
          success: false,
          error: '该用户名已被使用'
        }, { status: 409 })
      }

      console.log('✅ 用户名可用')
    }

    // 11. 加密密码
    console.log('🔒 加密密码...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // 12. 使用Supabase创建用户
    console.log('👤 创建用户账号...')
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 邮箱已验证，直接确认
      user_metadata: {
        username: username || email.split('@')[0],
        registration_ip: clientIp,
        registration_date: new Date().toISOString()
      }
    })

    if (createError || !newUser.user) {
      console.error('❌ 创建用户失败:', createError)
      return NextResponse.json({
        success: false,
        error: '创建账号失败，请稍后重试'
      }, { status: 500 })
    }

    console.log('✅ 用户账号创建成功:', newUser.user.id)

    // 13. 记录登录日志
    console.log('📝 记录登录日志...')
    await supabase
      .from('login_logs')
      .insert({
        user_id: newUser.user.id,
        email: email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true,
        failure_reason: null
      })

    // 14. 返回成功响应（不返回敏感信息）
    console.log('🎉 用户注册成功!')

    return NextResponse.json({
      success: true,
      message: '注册成功！请前往登录',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        username: username || email.split('@')[0]
      }
    })

  } catch (error) {
    console.error('❌ 用户注册API异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}

/**
 * 🔥 健康检查
 * GET /api/auth/register
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'User registration API is running',
    version: '1.0.0'
  })
}
