/**
 * 🔥 老王的修改密码API
 * 用途: 用户修改自己的密码（需要邮箱验证码）
 * 老王警告: 这个API涉及账号安全，需要验证会话和邮箱验证码！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifySession } from '@/lib/session-manager'
import { checkRateLimit, RateLimitAction } from '@/lib/rate-limit'
import { verifyCode, VerificationCodePurpose } from '@/lib/email-verification-code'
import { isPasswordCompromised } from '@/lib/security/password-check'
import { getClientIp } from '@/lib/request-ip'

// 请求体接口
interface ChangePasswordRequest {
  sessionToken: string
  oldPassword?: string
  newPassword: string
  verificationCode: string
}

/**
 * 🔥 修改密码API
 * POST /api/auth/change-password
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔐 收到修改密码请求')

    // 1. 解析请求体
    const body: ChangePasswordRequest = await req.json()
    const { sessionToken, oldPassword, newPassword, verificationCode } = body

    // 验证必填字段
    if (!sessionToken || !newPassword || !verificationCode) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数'
      }, { status: 400 })
    }

    // 2. 获取客户端IP
    const clientIp = getClientIp(req.headers)

    console.log(`🔍 客户端IP: ${clientIp}`)

    // 3. 验证会话
    console.log('🔑 验证用户会话...')
    const sessionVerification = await verifySession(sessionToken, clientIp)

    if (!sessionVerification.valid || !sessionVerification.session) {
      console.warn('❌ 会话验证失败')
      return NextResponse.json({
        success: false,
        error: sessionVerification.reason || '会话无效，请重新登录'
      }, { status: 401 })
    }

    const { userId, email, hasPassword } = sessionVerification.session
    console.log('✅ 会话验证通过:', email)

    // 4. 验证新密码强度
    console.log('🔒 验证新密码强度...')
    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        error: '新密码长度至少8位'
      }, { status: 400 })
    }

    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return NextResponse.json({
        success: false,
        error: '新密码必须包含大写字母、小写字母、数字和特殊字符'
      }, { status: 400 })
    }

    // 检查新旧密码是否相同
    if (hasPassword && oldPassword === newPassword) {
      return NextResponse.json({
        success: false,
        error: '新密码不能与旧密码相同'
      }, { status: 400 })
    }

    console.log('✅ 新密码强度验证通过')

    console.log('🛡️ 检查新密码是否已泄漏...')
    try {
      const compromised = await isPasswordCompromised(newPassword)
      if (compromised) {
        return NextResponse.json({
          success: false,
          error: '新密码已出现在泄漏名单中，请更换'
        }, { status: 400 })
      }
    } catch (error) {
      console.error('❌ HIBP 检查失败:', error)
      return NextResponse.json({
        success: false,
        error: '密码安全检测暂时不可用，请稍后再试'
      }, { status: 503 })
    }

    console.log('✅ 新密码泄漏检查通过')

    // 5. 验证邮箱验证码
    console.log('✉️ 验证邮箱验证码...')
    const codeVerification = await verifyCode(
      email,
      verificationCode,
      VerificationCodePurpose.CHANGE_PASSWORD
    )

    if (!codeVerification.valid) {
      console.warn('❌ 邮箱验证码无效')
      return NextResponse.json({
        success: false,
        error: codeVerification.reason || '验证码无效或已过期'
      }, { status: 400 })
    }

    console.log('✅ 邮箱验证码验证通过')

    // 6. 检查修改密码限流（每天最多5次）
    console.log('⏱️ 检查修改密码限流...')
    const rateLimitResult = await checkRateLimit(
      RateLimitAction.PASSWORD_CHANGE,
      email
    )

    if (!rateLimitResult.success) {
      console.warn('❌ 修改密码限流触发:', email)
      return NextResponse.json({
        success: false,
        error: rateLimitResult.reason || '修改密码操作过于频繁，请稍后重试',
        resetAt: rateLimitResult.resetAt
      }, { status: 429 })
    }

    console.log('✅ 修改密码限流检查通过')

    // 7. 验证旧密码
    const supabase = createServiceClient()

    if (hasPassword) {
      if (!oldPassword) {
        return NextResponse.json({
          success: false,
          error: '请提供当前密码'
        }, { status: 400 })
      }

      console.log('🔒 验证旧密码...')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword
      })

      if (signInError) {
        console.warn('❌ 旧密码错误')
        return NextResponse.json({
          success: false,
          error: '旧密码错误'
        }, { status: 401 })
      }

      console.log('✅ 旧密码验证通过')
    }

    // 8. 更新密码
    console.log('🔐 更新用户密码...')
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ 更新密码失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '修改密码失败，请稍后重试'
      }, { status: 500 })
    }

    console.log('✅ 密码更新成功')

    // 8.1 确保账号具备邮箱密码登录身份（适配第三方 OAuth 用户）
    const { data: updatedUser, error: fetchUserError } = await supabase.auth.admin.getUserById(userId)

    if (fetchUserError || !updatedUser?.user) {
      console.warn('⚠️ 无法获取用户信息，跳过登录身份同步:', fetchUserError?.message)
    } else {
      const providersRaw = updatedUser.user.app_metadata?.providers
      const currentProviders = Array.isArray(providersRaw)
        ? providersRaw.map((item) => String(item))
        : []

      if (!currentProviders.includes('email')) {
        const mergedAppMeta = {
          ...(updatedUser.user.app_metadata ?? {}),
          providers: Array.from(new Set([...currentProviders, 'email']))
        }

        const { error: providerUpdateError } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: mergedAppMeta
        })

        if (providerUpdateError) {
          console.warn('⚠️ 同步邮箱登录身份失败:', providerUpdateError.message)
        } else {
          console.log('✅ 已为用户追加邮箱登录身份')
        }
      }
    }

    // 9. 删除该用户的所有会话（强制重新登录）
    console.log('🔑 清除所有会话（强制重新登录）...')
    const { deleteAllUserSessions } = await import('@/lib/session-manager')
    await deleteAllUserSessions(userId)

    // 10. 返回成功响应
    console.log('🎉 密码修改成功!')

    return NextResponse.json({
      success: true,
      message: '密码修改成功，请重新登录'
    })

  } catch (error) {
    console.error('❌ 修改密码API异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}

/**
 * 🔥 健康检查
 * GET /api/auth/change-password
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Change password API is running',
    version: '1.0.0'
  })
}
