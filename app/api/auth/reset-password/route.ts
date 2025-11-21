/**
 * 🔥 老王的重置密码API
 * 用途: 用户忘记密码时重置密码（需要邮箱验证码）
 * 老王警告: 这个API涉及账号安全，必须严格验证邮箱验证码！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, RateLimitAction } from '@/lib/rate-limit'
import { verifyCode, VerificationCodePurpose } from '@/lib/email-verification-code'
import { getClientIp } from '@/lib/request-ip'

// 请求体接口
interface ResetPasswordRequest {
  email: string
  newPassword: string
  verificationCode: string
}

/**
 * 🔥 重置密码API
 * POST /api/auth/reset-password
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔐 收到重置密码请求')

    // 1. 解析请求体
    const body: ResetPasswordRequest = await req.json()
    const { email, newPassword, verificationCode } = body

    // 验证必填字段
    if (!email || !newPassword || !verificationCode) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数'
      }, { status: 400 })
    }

    // 2. 获取客户端IP
    const clientIp = getClientIp(req.headers)

    console.log(`🔍 客户端IP: ${clientIp}`)

    // 3. 验证新密码强度
    console.log('🔒 验证新密码强度...')
    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        error: '新密码长度至少8位'
      }, { status: 400 })
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasLetter || !hasNumber) {
      return NextResponse.json({
        success: false,
        error: '新密码必须包含字母和数字'
      }, { status: 400 })
    }

    console.log('✅ 新密码强度验证通过')

    // 4. 验证邮箱验证码
    console.log('✉️ 验证邮箱验证码...')
    const codeVerification = await verifyCode(
      email,
      verificationCode,
      VerificationCodePurpose.RESET_PASSWORD
    )

    if (!codeVerification.valid) {
      console.warn('❌ 邮箱验证码无效')
      return NextResponse.json({
        success: false,
        error: codeVerification.reason || '验证码无效或已过期'
      }, { status: 400 })
    }

    console.log('✅ 邮箱验证码验证通过')

    // 5. 检查重置密码限流（每天最多3次）
    console.log('⏱️ 检查重置密码限流...')
    const rateLimitResult = await checkRateLimit(
      RateLimitAction.PASSWORD_RESET,
      email
    )

    if (!rateLimitResult.success) {
      console.warn('❌ 重置密码限流触发:', email)
      return NextResponse.json({
        success: false,
        error: rateLimitResult.reason || '重置密码操作过于频繁，请稍后重试',
        resetAt: rateLimitResult.resetAt
      }, { status: 429 })
    }

    console.log('✅ 重置密码限流检查通过')

    // 6. 查找用户
    const supabase = createServiceClient()

    console.log('🔍 查找用户:', email)
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      console.warn('❌ 用户不存在:', email)
      // 安全起见，不告诉用户邮箱不存在，统一返回成功消息
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，密码重置成功'
      })
    }

    console.log('✅ 用户找到:', userData.id)

    // 7. 更新密码
    console.log('🔐 更新用户密码...')
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ 更新密码失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '重置密码失败，请稍后重试'
      }, { status: 500 })
    }

    console.log('✅ 密码更新成功')

    // 8. 删除该用户的所有会话（强制重新登录）
    console.log('🔑 清除所有会话（强制重新登录）...')
    const { deleteAllUserSessions } = await import('@/lib/session-manager')
    await deleteAllUserSessions(userData.id)

    // 9. 返回成功响应
    console.log('🎉 密码重置成功!')

    return NextResponse.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    })

  } catch (error) {
    console.error('❌ 重置密码API异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}

/**
 * 🔥 健康检查
 * GET /api/auth/reset-password
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Reset password API is running',
    version: '1.0.0'
  })
}
