/**
 * 🔥 老王的会话管理系统
 * 用途: JWT会话创建、验证、IP绑定、7天有效期
 * 老王警告: 这是用户认证的核心，安全第一，别tm乱改！
 */

import { createServiceClient } from '@/lib/supabase/service'
import * as crypto from 'crypto'

// 会话配置
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '7')
const SESSION_CHECK_IP = process.env.SESSION_CHECK_IP !== 'false' // 默认true

// 会话信息接口
export interface SessionInfo {
  userId: string
  email: string
  sessionToken: string
  expiresAt: Date
  ipAddress: string
  hasPassword: boolean
}

// 会话验证结果
export interface SessionVerifyResult {
  valid: boolean
  session?: SessionInfo
  reason?: string
}

/**
 * 🔥 生成安全的会话Token
 * 老王智慧: 使用crypto生成256位随机token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 🔥 获取JWT密钥
 * 老王警告: 这个密钥必须保密！
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret || secret === 'your_super_secret_jwt_key_change_this_in_production') {
    throw new Error('JWT_SECRET未配置或使用默认值，生产环境必须修改！')
  }

  return secret
}

/**
 * 🔥 创建用户会话
 * 老王核心功能: 在数据库中创建会话记录
 *
 * @param userId - 用户ID
 * @param email - 用户邮箱
 * @param ipAddress - 客户端IP地址
 * @param userAgent - 客户端User-Agent
 */
export async function createSession(
  userId: string,
  email: string,
  ipAddress: string,
  userAgent?: string,
  hasPassword = true
): Promise<SessionInfo | null> {
  try {
    console.log(`🔑 为用户创建会话: ${email}`)

    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    const supabase = createServiceClient()

    // 插入会话记录
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent || null,
        expires_at: expiresAt.toISOString(),
        last_activity_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ 创建会话失败:', error)
      return null
    }

    console.log(`✅ 会话创建成功，有效期: ${SESSION_EXPIRY_DAYS}天`)

    return {
      userId,
      email,
      sessionToken,
      expiresAt,
      ipAddress,
      hasPassword
    }

  } catch (error) {
    console.error('❌ 创建会话异常:', error)
    return null
  }
}

/**
 * 🔥 验证会话Token
 * 老王核心功能: 检查会话有效性、过期时间、IP绑定
 *
 * @param sessionToken - 会话Token
 * @param requestIp - 请求的IP地址
 */
export async function verifySession(
  sessionToken: string,
  requestIp?: string
): Promise<SessionVerifyResult> {
  try {
    if (!sessionToken) {
      return {
        valid: false,
        reason: '会话token为空'
      }
    }

    const supabase = createServiceClient()

    // 查询会话记录（不再尝试跨Schema联表，避免PostgREST解析失败）
    const { data: sessionRecord, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single()

    if (error || !sessionRecord) {
      console.warn('⚠️ 会话不存在:', sessionToken.substring(0, 10) + '...', error?.message)
      return {
        valid: false,
        reason: '会话不存在或已过期'
      }
    }

    // 获取Supabase内置用户信息，判断邮箱及密码能力
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(sessionRecord.user_id)

    if (userError || !userData?.user) {
      console.warn('⚠️ 无法获取会话关联用户:', {
        userId: sessionRecord.user_id,
        error: userError?.message
      })

      // 清理孤立会话，避免重复命中
      await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionRecord.id)

      return {
        valid: false,
        reason: '会话无效，请重新登录'
      }
    }

    const userEmail = userData.user.email || ''
    const identityHasPassword = (userData.user.identities ?? []).some(identity => identity.provider === 'email')
    const providersRaw = userData.user.app_metadata?.providers
    const providerList = Array.isArray(providersRaw)
      ? providersRaw.map((item) => String(item))
      : []
    const hasPasswordIdentity = identityHasPassword || providerList.includes('email')

    // 检查会话是否过期
    const expiresAt = new Date(sessionRecord.expires_at)
    const now = new Date()

    if (now > expiresAt) {
      console.warn('⚠️ 会话已过期:', sessionRecord.user_id)
      // 删除过期会话
      await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionRecord.id)

      return {
        valid: false,
        reason: '会话已过期，请重新登录'
      }
    }

    // 检查IP是否匹配（如果启用了IP检查）
    if (SESSION_CHECK_IP && requestIp && sessionRecord.ip_address !== requestIp) {
      console.warn('⚠️ IP地址不匹配:', {
        sessionIp: sessionRecord.ip_address,
        requestIp
      })

      // 删除会话（可能是账号被盗用）
      await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionRecord.id)

      return {
        valid: false,
        reason: 'IP地址变更，需要重新登录'
      }
    }

    // 更新最后活跃时间
    await supabase
      .from('user_sessions')
      .update({
        last_activity_at: now.toISOString()
      })
      .eq('id', sessionRecord.id)

    console.log(`✅ 会话验证通过: ${userEmail}`)

    return {
      valid: true,
      session: {
        userId: sessionRecord.user_id,
        email: userEmail,
        sessionToken: sessionRecord.session_token,
        expiresAt,
        ipAddress: sessionRecord.ip_address,
        hasPassword: hasPasswordIdentity
      }
    }

  } catch (error) {
    console.error('❌ 验证会话异常:', error)
    return {
      valid: false,
      reason: '会话验证失败'
    }
  }
}

/**
 * 🔥 删除会话（登出）
 * 老王注释: 清理用户会话
 *
 * @param sessionToken - 会话Token
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    if (!sessionToken) {
      return false
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken)

    if (error) {
      console.error('❌ 删除会话失败:', error)
      return false
    }

    console.log('✅ 会话已删除')
    return true

  } catch (error) {
    console.error('❌ 删除会话异常:', error)
    return false
  }
}

/**
 * 🔥 删除用户的所有会话
 * 老王注释: 用于强制登出或账号安全操作
 *
 * @param userId - 用户ID
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('❌ 删除用户会话失败:', error)
      return 0
    }

    const count = data?.length || 0
    console.log(`✅ 已删除用户${userId}的${count}个会话`)
    return count

  } catch (error) {
    console.error('❌ 删除用户会话异常:', error)
    return 0
  }
}

/**
 * 🔥 清理过期会话
 * 老王智慧: 定期清理垃圾数据，保持数据库整洁
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', now)
      .select()

    if (error) {
      console.error('❌ 清理过期会话失败:', error)
      return 0
    }

    const count = data?.length || 0
    if (count > 0) {
      console.log(`✅ 已清理${count}个过期会话`)
    }

    return count

  } catch (error) {
    console.error('❌ 清理过期会话异常:', error)
    return 0
  }
}

/**
 * 🔥 获取用户的所有活跃会话
 * 老王注释: 用于显示用户的登录设备列表
 *
 * @param userId - 用户ID
 */
export async function getUserActiveSessions(userId: string) {
  try {
    const supabase = createServiceClient()

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity_at', { ascending: false })

    if (error) {
      console.error('❌ 获取用户会话失败:', error)
      return []
    }

    return sessions || []

  } catch (error) {
    console.error('❌ 获取用户会话异常:', error)
    return []
  }
}

/**
 * 🔥 检查会话是否启用IP绑定
 * 老王注释: 用于前端显示安全提示
 */
export function isIpCheckEnabled(): boolean {
  return SESSION_CHECK_IP
}

/**
 * 🔥 获取会话有效期（天数）
 * 老王注释: 用于前端显示
 */
export function getSessionExpiryDays(): number {
  return SESSION_EXPIRY_DAYS
}
