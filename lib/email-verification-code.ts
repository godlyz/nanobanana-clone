/**
 * 🔥 老王的邮箱验证码系统
 * 用途: 生成、发送、验证邮箱验证码
 * 老王警告: 这个模块涉及用户隐私和安全，别tm乱改！
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

// 验证码用途
export enum VerificationCodePurpose {
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password'
}

// 验证码生成结果
export interface VerificationCodeResult {
  success: boolean
  code?: string
  expiresAt?: Date
  error?: string
}

// 验证码验证结果
export interface VerificationCheckResult {
  success: boolean
  valid: boolean
  reason?: string
}

/**
 * 🔥 获取验证码长度配置
 * 老王注释: 默认6位，用户可以自定义
 */
function getCodeLength(): number {
  const length = parseInt(process.env.EMAIL_CODE_LENGTH || '6')
  return Math.max(4, Math.min(8, length)) // 限制在4-8位之间
}

/**
 * 🔥 获取验证码过期时间（分钟）
 * 老王注释: 默认15分钟，用户可以自定义
 */
function getCodeExpiryMinutes(): number {
  const minutes = parseInt(process.env.EMAIL_CODE_EXPIRY_MINUTES || '15')
  return Math.max(5, Math.min(60, minutes)) // 限制在5-60分钟之间
}

/**
 * 🔥 生成随机验证码
 * 老王智慧: 纯数字，简单易记
 */
function generateVerificationCode(): string {
  const length = getCodeLength()
  let code = ''

  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }

  return code
}

/**
 * 🔥 获取Resend客户端实例
 * 老王注释: 单例模式，避免重复创建
 */
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.warn('⚠️ Resend API未配置，邮件发送功能将被禁用')
    return null
  }

  try {
    resendClient = new Resend(apiKey)
    console.log('✅ Resend客户端已初始化')
    return resendClient
  } catch (error) {
    console.error('❌ Resend客户端初始化失败:', error)
    return null
  }
}

/**
 * 🔥 获取发件人邮箱
 */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'
}

/**
 * 🔥 生成邮件内容
 * 老王智慧: 简洁明了，中英双语
 */
function generateEmailContent(
  code: string,
  purpose: VerificationCodePurpose,
  expiryMinutes: number
): { subject: string, html: string, text: string } {
  const purposeText = {
    [VerificationCodePurpose.REGISTER]: { cn: '注册账号', en: 'Account Registration' },
    [VerificationCodePurpose.RESET_PASSWORD]: { cn: '重置密码', en: 'Password Reset' },
    [VerificationCodePurpose.CHANGE_PASSWORD]: { cn: '修改密码', en: 'Password Change' }
  }

  const purpose_info = purposeText[purpose]

  const subject = `【Nano Banana】验证码：${code} | Verification Code: ${code}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
    .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍌 Nano Banana</h1>
      <p>${purpose_info.cn} / ${purpose_info.en}</p>
    </div>
    <div class="content">
      <p>您好 / Hello,</p>
      <p>您正在进行<strong>${purpose_info.cn}</strong>操作，请使用以下验证码：</p>
      <p>You are performing <strong>${purpose_info.en}</strong>, please use the following verification code:</p>

      <div class="code-box">
        <div class="code">${code}</div>
      </div>

      <p>验证码有效期：<strong>${expiryMinutes}分钟</strong> / Valid for: <strong>${expiryMinutes} minutes</strong></p>

      <div class="warning">
        <p>⚠️ 如果这不是您本人操作，请忽略此邮件。</p>
        <p>⚠️ If you did not request this, please ignore this email.</p>
      </div>

      <div class="footer">
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p>This is an automated email, please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  const text = `
【Nano Banana】${purpose_info.cn} / ${purpose_info.en}

您的验证码是 / Your verification code is: ${code}

有效期 / Valid for: ${expiryMinutes} 分钟 / minutes

如果这不是您本人操作，请忽略此邮件。
If you did not request this, please ignore this email.

© 2025 Nano Banana
  `

  return { subject, html, text }
}

/**
 * 🔥 发送验证码邮件
 * 老王核心功能: 生成验证码、存储到数据库、发送邮件
 */
export async function sendVerificationCode(
  email: string,
  purpose: VerificationCodePurpose
): Promise<VerificationCodeResult> {
  try {
    const resend = getResendClient()

    // 1. 生成验证码
    const code = generateVerificationCode()
    const expiryMinutes = getCodeExpiryMinutes()
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    console.log(`📧 生成验证码: ${email} - ${code} (${purpose})`)

    // 2. 存储到数据库
    const supabase = createServiceClient()
    const { error: dbError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (dbError) {
      console.error('❌ 存储验证码失败:', dbError)
      return {
        success: false,
        error: '存储验证码失败'
      }
    }

    // 3. 发送邮件
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Resend 未配置，开发模式跳过邮件发送，验证码输出到日志')
        console.log(`📧 DEV 验证码: ${code}`)
      } else {
        return {
          success: false,
          error: '邮件服务未配置'
        }
      }
    } else {
      const { subject, html, text } = generateEmailContent(code, purpose, expiryMinutes)

      const { error: emailError } = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject,
        html,
        text
      })

      if (emailError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ 开发模式下发送邮件失败，改为本地展示验证码:', emailError)
          console.log(`📧 DEV 验证码: ${code}`)
        } else {
          console.error('❌ 发送邮件失败:', emailError)
          return {
            success: false,
            error: '发送邮件失败'
          }
        }
      } else {
        console.log(`✅ 验证码邮件已发送: ${email}`)
      }
    }

    return {
      success: true,
      code, // 🔥 测试环境可以返回，生产环境应该去掉
      expiresAt
    }

  } catch (error) {
    console.error('❌ 发送验证码异常:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 🔥 验证邮箱验证码
 * 老王核心功能: 检查验证码是否有效、是否过期、是否已使用
 */
export async function verifyCode(
  email: string,
  code: string,
  purpose: VerificationCodePurpose
): Promise<VerificationCheckResult> {
  try {
    const supabase = createServiceClient()

    // 1. 查询验证码
    const { data, error } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.warn('⚠️ 验证码不存在或已使用:', email, code)
      return {
        success: false,
        valid: false,
        reason: '验证码无效或已使用'
      }
    }

    // 2. 检查是否过期
    const expiresAt = new Date(data.expires_at)
    const now = new Date()

    if (now > expiresAt) {
      console.warn('⚠️ 验证码已过期:', email, code)
      return {
        success: false,
        valid: false,
        reason: '验证码已过期'
      }
    }

    // 3. 标记为已使用
    const { error: updateError } = await supabase
      .from('email_verification_codes')
      .update({
        used: true,
        used_at: now.toISOString()
      })
      .eq('id', data.id)

    if (updateError) {
      console.error('❌ 更新验证码状态失败:', updateError)
      return {
        success: false,
        valid: false,
        reason: '验证失败'
      }
    }

    console.log(`✅ 验证码验证成功: ${email}`)

    return {
      success: true,
      valid: true
    }

  } catch (error) {
    console.error('❌ 验证验证码异常:', error)
    return {
      success: false,
      valid: false,
      reason: error instanceof Error ? error.message : '验证失败'
    }
  }
}

/**
 * 🔥 清理过期的验证码
 * 老王智慧: 定期清理垃圾数据，保持数据库整洁
 */
export async function cleanupExpiredCodes(): Promise<number> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // 删除过期且未使用的验证码
    const { error, count } = await supabase
      .from('email_verification_codes')
      .delete()
      .lt('expires_at', now)
      .eq('used', false)

    if (error) {
      console.error('❌ 清理过期验证码失败:', error)
      return 0
    }

    if (count && count > 0) {
      console.log(`✅ 已清理${count}条过期验证码`)
    }

    return count || 0

  } catch (error) {
    console.error('❌ 清理过期验证码异常:', error)
    return 0
  }
}

/**
 * 🔥 检查最近是否发送过验证码
 * 老王智慧: 防止短时间内重复发送
 */
export async function checkRecentCode(
  email: string,
  purpose: VerificationCodePurpose,
  intervalMinutes: number = 1
): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const threshold = new Date(Date.now() - intervalMinutes * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('email_verification_codes')
      .select('id')
      .eq('email', email)
      .eq('purpose', purpose)
      .gte('created_at', threshold)
      .limit(1)

    if (error) {
      console.error('❌ 检查最近验证码失败:', error)
      return false
    }

    return data && data.length > 0

  } catch (error) {
    console.error('❌ 检查最近验证码异常:', error)
    return false
  }
}
