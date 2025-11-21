/**
 * 🔥 老王的发送邮箱验证码API
 * 用途: 发送注册、重置密码、修改密码的验证码
 * 老王警告: 这个API有多层安全防护，别tm乱改！
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkRateLimit, RateLimitAction } from '@/lib/rate-limit'
import { validateEmail } from '@/lib/email-validation'
import { sendVerificationCode, checkRecentCode, VerificationCodePurpose } from '@/lib/email-verification-code'
import { getClientIp } from '@/lib/request-ip'

// 请求体接口
interface SendCodeRequest {
  email: string
  purpose: VerificationCodePurpose
  turnstileToken: string
}

/**
 * 🔥 发送验证码API
 * POST /api/auth/send-code
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📧 收到发送验证码请求')

    // 1. 解析请求体
    const body: SendCodeRequest = await req.json()
    const { email, purpose, turnstileToken } = body

    // 验证必填字段
    if (!email || !purpose || !turnstileToken) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数'
      }, { status: 400 })
    }

    // 2. 获取客户端IP（用于限流）
    const clientIp = getClientIp(req.headers)

    console.log(`🔍 客户端IP: ${clientIp}`)

    // 3. 验证Turnstile图形验证码
    console.log('🔒 验证Turnstile图形验证码...')
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp)

    if (!turnstileResult.valid) {
      console.warn('❌ Turnstile验证失败:', turnstileResult.reason)
      return NextResponse.json({
        success: false,
        error: turnstileResult.reason || '图形验证失败，请刷新页面重试'
      }, { status: 400 })
    }

    console.log('✅ Turnstile验证通过')

    // 4. 验证邮箱格式和临时邮箱检测
    console.log('📮 验证邮箱...')
    const emailValidation = await validateEmail(email)

    if (!emailValidation.isValid) {
      console.warn('❌ 邮箱验证失败:', emailValidation.reason)
      return NextResponse.json({
        success: false,
        error: emailValidation.reason || '邮箱格式无效'
      }, { status: 400 })
    }

    if (emailValidation.isTempEmail || emailValidation.isBlacklisted) {
      console.warn('❌ 检测到临时邮箱:', email)
      return NextResponse.json({
        success: false,
        error: '不支持使用临时邮箱注册'
      }, { status: 400 })
    }

    console.log('✅ 邮箱验证通过')

    // 5. 检查IP限流（每个IP每天最多2次）
    console.log('⏱️ 检查IP限流...')
    const rateLimitResult = await checkRateLimit(
      RateLimitAction.EMAIL_VERIFICATION,
      clientIp
    )

    if (!rateLimitResult.success) {
      console.warn('❌ IP限流触发:', clientIp)
      return NextResponse.json({
        success: false,
        error: rateLimitResult.reason || '操作过于频繁，请稍后重试',
        resetAt: rateLimitResult.resetAt
      }, { status: 429 })
    }

    console.log(`✅ IP限流检查通过 (剩余次数: ${rateLimitResult.remaining})`)

    // 6. 检查是否在1分钟内发送过验证码（防止重复发送）
    console.log('🕐 检查最近发送记录...')
    const hasRecentCode = await checkRecentCode(email, purpose, 1)

    if (hasRecentCode) {
      console.warn('❌ 1分钟内已发送过验证码:', email)
      return NextResponse.json({
        success: false,
        error: '验证码已发送，请勿重复操作，1分钟后可重试'
      }, { status: 429 })
    }

    // 7. 发送验证码
    console.log('📤 发送验证码...')
    const sendResult = await sendVerificationCode(email, purpose)

    if (!sendResult.success) {
      console.error('❌ 发送验证码失败:', sendResult.error)
      return NextResponse.json({
        success: false,
        error: sendResult.error || '发送验证码失败，请稍后重试'
      }, { status: 500 })
    }

    console.log('✅ 验证码发送成功:', email)

    // 8. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收邮件',
      expiresAt: sendResult.expiresAt,
      // 🔥 开发环境返回验证码，生产环境不返回
      ...(process.env.NODE_ENV === 'development' && { code: sendResult.code })
    })

  } catch (error) {
    console.error('❌ 发送验证码API异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}

/**
 * 🔥 健康检查
 * GET /api/auth/send-code
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Send verification code API is running',
    version: '1.0.0'
  })
}
