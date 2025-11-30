/**
 * 🔥 老王的IP限流工具
 * 用途: 防止恶意攻击、限制频繁操作、保护系统资源
 * 老王警告: 这个模块是系统安全的第一道防线，别tm关闭它！
 */

import { Redis } from '@upstash/redis'

// 限流动作类型
export enum RateLimitAction {
  EMAIL_VERIFICATION = 'email_verification',      // 邮箱验证码发送
  LOGIN_ATTEMPT = 'login_attempt',                // 登录尝试
  PASSWORD_RESET = 'password_reset',              // 密码重置
  REGISTRATION = 'registration',                  // 用户注册
  PASSWORD_CHANGE = 'password_change',            // 修改密码
}

// 限流配置
export interface RateLimitConfig {
  action: RateLimitAction
  identifier: string  // IP地址或email
  maxAttempts: number // 最大尝试次数
  windowMs: number    // 时间窗口（毫秒）
}

// 限流检查结果
export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
  reason?: string
}

// 🔥 老王智慧：不同操作的默认限流配置
const DEFAULT_RATE_LIMITS: Record<RateLimitAction, { max: number, windowMs: number }> = {
  [RateLimitAction.EMAIL_VERIFICATION]: {
    max: 2,               // 每个IP每天最多2次
    windowMs: 24 * 60 * 60 * 1000  // 24小时
  },
  [RateLimitAction.LOGIN_ATTEMPT]: {
    max: 5,               // 5次失败锁定
    windowMs: 15 * 60 * 1000       // 15分钟
  },
  [RateLimitAction.PASSWORD_RESET]: {
    max: 3,               // 每天最多3次
    windowMs: 24 * 60 * 60 * 1000  // 24小时
  },
  [RateLimitAction.REGISTRATION]: {
    max: 3,               // 每个IP每天最多3次注册
    windowMs: 24 * 60 * 60 * 1000  // 24小时
  },
  [RateLimitAction.PASSWORD_CHANGE]: {
    max: 5,               // 每天最多5次
    windowMs: 24 * 60 * 60 * 1000  // 24小时
  }
}

/**
 * 🔥 获取Redis客户端实例
 * 老王注释: 单例模式，避免重复创建连接
 */
let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token || url === 'your_upstash_redis_rest_url_here') {
    console.warn('⚠️ Upstash Redis未配置，限流功能将被禁用（生产环境必须配置！）')
    return null
  }

  try {
    redisClient = new Redis({
      url,
      token
    })
    console.log('✅ Upstash Redis客户端已初始化')
    return redisClient
  } catch (error) {
    console.error('❌ Upstash Redis客户端初始化失败:', error)
    return null
  }
}

/**
 * 🔥 生成Redis键名
 * 老王注释: 统一管理键名，避免冲突
 */
function getRateLimitKey(action: RateLimitAction, identifier: string): string {
  return `ratelimit:${action}:${identifier}`
}

/**
 * 🔥 检查并记录限流
 * 老王智慧: 核心限流逻辑，简单高效
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitResult> {
  const redis = getRedisClient()

  // 🔥 如果Redis未配置，直接放行（开发环境容错）
  if (!redis) {
    console.warn(`⚠️ Redis未配置，跳过限流检查: ${action} - ${identifier}`)
    return {
      success: true,
      remaining: 999,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }

  const config = DEFAULT_RATE_LIMITS[action]
  const key = getRateLimitKey(action, identifier)

  try {
    // 使用Redis的INCR命令增加计数
    const count = await redis.incr(key)

    // 如果是第一次访问，设置过期时间
    if (count === 1) {
      await redis.pexpire(key, config.windowMs)
    }

    // 获取剩余过期时间
    const ttl = await redis.pttl(key)
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : config.windowMs))

    // 检查是否超过限制
    if (count > config.max) {
      console.warn(`⚠️ 限流触发: ${action} - ${identifier} (${count}/${config.max})`)
      return {
        success: false,
        remaining: 0,
        resetAt,
        reason: `操作过于频繁，请在 ${formatResetTime(resetAt)} 后重试`
      }
    }

    // 计算剩余次数
    const remaining = config.max - count

    console.log(`✅ 限流检查通过: ${action} - ${identifier} (${count}/${config.max})`)

    return {
      success: true,
      remaining,
      resetAt
    }

  } catch (error) {
    // 艹，Redis挂了，但不能影响用户操作
    console.error('❌ 限流检查失败（Redis错误），放行请求:', error)
    return {
      success: true,
      remaining: 999,
      resetAt: new Date(Date.now() + config.windowMs)
    }
  }
}

/**
 * 🔥 重置限流计数
 * 老王注释: 用于手动解除限流（管理员功能）
 */
export async function resetRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<boolean> {
  const redis = getRedisClient()

  if (!redis) {
    console.warn('⚠️ Redis未配置，无法重置限流')
    return false
  }

  const key = getRateLimitKey(action, identifier)

  try {
    await redis.del(key)
    console.log(`✅ 已重置限流: ${action} - ${identifier}`)
    return true
  } catch (error) {
    console.error('❌ 重置限流失败:', error)
    return false
  }
}

/**
 * 🔥 获取当前限流状态
 * 老王注释: 查询功能，不增加计数
 */
export async function getRateLimitStatus(
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitResult | null> {
  const redis = getRedisClient()

  if (!redis) {
    return null
  }

  const config = DEFAULT_RATE_LIMITS[action]
  const key = getRateLimitKey(action, identifier)

  try {
    const count = await redis.get(key) as number | null
    const ttl = await redis.pttl(key)

    if (count === null) {
      // 没有记录，说明未触发限流
      return {
        success: true,
        remaining: config.max,
        resetAt: new Date(Date.now() + config.windowMs)
      }
    }

    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : 0))
    const remaining = Math.max(0, config.max - count)

    return {
      success: remaining > 0,
      remaining,
      resetAt,
      reason: remaining === 0 ? `操作过于频繁，请在 ${formatResetTime(resetAt)} 后重试` : undefined
    }

  } catch (error) {
    console.error('❌ 获取限流状态失败:', error)
    return null
  }
}

/**
 * 🔥 批量重置限流（管理员功能）
 * 老王注释: 用于清理所有限流记录
 */
export async function resetAllRateLimits(action: RateLimitAction): Promise<number> {
  const redis = getRedisClient()

  if (!redis) {
    console.warn('⚠️ Redis未配置，无法批量重置限流')
    return 0
  }

  try {
    // 使用SCAN命令查找所有相关键
    const pattern = `ratelimit:${action}:*`
    // 🔥 老王 Day 4 修复：Redis scan 返回的 cursor 是字符串类型，不是数字
    let cursor: string | number = '0'
    let deletedCount = 0

    do {
      // @ts-ignore - Redis库类型定义问题
      const result = await redis.scan(cursor, { match: pattern, count: 100 })
      cursor = result[0]
      const keys = result[1] as string[]

      if (keys.length > 0) {
        await redis.del(...keys)
        deletedCount += keys.length
      }
    } while (cursor !== '0' && cursor !== 0)  // 🔥 老王修复：兼容字符串和数字两种类型

    console.log(`✅ 已批量重置限流: ${action} - 共${deletedCount}条记录`)
    return deletedCount

  } catch (error) {
    console.error('❌ 批量重置限流失败:', error)
    return 0
  }
}

/**
 * 🔥 格式化重置时间
 * 老王智慧: 用户友好的时间显示
 */
function formatResetTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs <= 0) {
    return '现在'
  }

  const diffMinutes = Math.ceil(diffMs / (60 * 1000))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}天后`
  }

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60
    return remainingMinutes > 0
      ? `${diffHours}小时${remainingMinutes}分钟后`
      : `${diffHours}小时后`
  }

  return `${diffMinutes}分钟后`
}

/**
 * 🔥 自定义限流配置
 * 老王注释: 灵活配置，适应不同场景
 */
export async function checkCustomRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient()

  if (!redis) {
    console.warn('⚠️ Redis未配置，跳过自定义限流检查')
    return {
      success: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowMs)
    }
  }

  const key = getRateLimitKey(config.action, config.identifier)

  try {
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.pexpire(key, config.windowMs)
    }

    const ttl = await redis.pttl(key)
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : config.windowMs))

    if (count > config.maxAttempts) {
      return {
        success: false,
        remaining: 0,
        resetAt,
        reason: `操作过于频繁，请在 ${formatResetTime(resetAt)} 后重试`
      }
    }

    return {
      success: true,
      remaining: config.maxAttempts - count,
      resetAt
    }

  } catch (error) {
    console.error('❌ 自定义限流检查失败:', error)
    return {
      success: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowMs)
    }
  }
}
