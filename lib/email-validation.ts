/**
 * 🔥 老王的邮箱验证工具
 * 用途: 检测临时邮箱、验证邮箱格式、防止垃圾注册
 * 老王警告: 这个模块很重要，别tm让那些临时邮箱注册成功！
 */

// 邮箱验证结果接口
export interface EmailValidationResult {
  isValid: boolean
  isTempEmail: boolean
  isBlacklisted: boolean
  reason?: string
  provider?: string
}

// 常见的临时邮箱域名黑名单 (老王收集的)
const DEFAULT_TEMP_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'throwaway.email',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'getnada.com',
  'trashmail.com',
  'fakeinbox.com',
  'yopmail.com',
  'mohmal.com',
  'sharklasers.com',
  'dispostable.com',
  'emailondeck.com',
]

/**
 * 🔥 基础邮箱格式验证
 * 老王注释: 用正则快速检查邮箱格式，这个最基础
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // 老王精选的邮箱正则，简单实用
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.trim().toLowerCase())
}

/**
 * 🔥 从环境变量获取临时邮箱黑名单
 * 老王智慧: 支持用户自定义黑名单
 */
function getTempEmailBlacklist(): string[] {
  const envBlacklist = process.env.TEMP_EMAIL_BLACKLIST || ''
  const customDomains = envBlacklist
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0)

  // 合并默认黑名单和自定义黑名单
  return [...DEFAULT_TEMP_EMAIL_DOMAINS, ...customDomains]
}

/**
 * 🔥 检查邮箱域名是否在黑名单中
 * 老王注释: 这个最快，先检查本地黑名单，省钱省时间
 */
export function isEmailDomainBlacklisted(email: string): boolean {
  if (!isValidEmailFormat(email)) {
    return false
  }

  const domain = email.split('@')[1].toLowerCase()
  const blacklist = getTempEmailBlacklist()

  return blacklist.includes(domain)
}

/**
 * 🔥 使用AbstractAPI验证邮箱
 * 老王警告: 这个要花钱的，免费版每月100次，省着点用！
 * 参数 skipAPI: 如果为true，跳过API调用（用于测试或省配额）
 */
export async function validateEmailWithAPI(
  email: string,
  skipAPI: boolean = false
): Promise<EmailValidationResult> {
  // 先检查格式
  if (!isValidEmailFormat(email)) {
    return {
      isValid: false,
      isTempEmail: false,
      isBlacklisted: false,
      reason: '邮箱格式无效'
    }
  }

  // 检查本地黑名单
  if (isEmailDomainBlacklisted(email)) {
    return {
      isValid: false,
      isTempEmail: true,
      isBlacklisted: true,
      reason: '该邮箱域名在黑名单中',
      provider: email.split('@')[1]
    }
  }

  // 如果跳过API调用，直接返回通过
  if (skipAPI) {
    return {
      isValid: true,
      isTempEmail: false,
      isBlacklisted: false
    }
  }

  // 使用AbstractAPI检查
  const apiKey = process.env.ABSTRACTAPI_EMAIL_VALIDATION_KEY

  if (!apiKey || apiKey === 'your_abstractapi_key_here') {
    console.warn('⚠️ AbstractAPI未配置，跳过临时邮箱检测（仅本地黑名单生效）')
    return {
      isValid: true,
      isTempEmail: false,
      isBlacklisted: false
    }
  }

  try {
    const response = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // 🔥 老王修复: 设置3秒超时，避免等太久
        signal: AbortSignal.timeout(3000)
      }
    )

    if (!response.ok) {
      console.warn('⚠️ AbstractAPI调用失败，跳过在线检测:', response.status)
      return {
        isValid: true,
        isTempEmail: false,
        isBlacklisted: false
      }
    }

    const data = await response.json()

    // AbstractAPI返回的关键字段
    const isDisposable = data.is_disposable_email?.value === true
    const isFreeProvider = data.is_free_email?.value === true

    return {
      isValid: data.is_valid_format?.value === true && !isDisposable,
      isTempEmail: isDisposable,
      isBlacklisted: false,
      reason: isDisposable ? '检测到临时邮箱' : undefined,
      provider: data.smtp_provider
    }

  } catch (error) {
    // 艹，API调用失败了，但不能影响用户注册
    console.warn('⚠️ AbstractAPI调用异常，跳过在线检测:', error instanceof Error ? error.message : error)
    return {
      isValid: true,
      isTempEmail: false,
      isBlacklisted: false
    }
  }
}

/**
 * 🔥 综合邮箱验证（推荐使用）
 * 老王智慧: 先检查本地黑名单，再调用API，省钱又高效
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  // 1. 格式验证
  if (!isValidEmailFormat(email)) {
    return {
      isValid: false,
      isTempEmail: false,
      isBlacklisted: false,
      reason: '邮箱格式无效'
    }
  }

  // 2. 本地黑名单检查（免费且快速）
  if (isEmailDomainBlacklisted(email)) {
    return {
      isValid: false,
      isTempEmail: true,
      isBlacklisted: true,
      reason: '该邮箱域名已被禁用',
      provider: email.split('@')[1]
    }
  }

  // 3. API在线检测（花钱的，慎用）
  return validateEmailWithAPI(email, false)
}

/**
 * 🔥 快速验证（仅本地检查，不调用API）
 * 老王推荐: 用于不重要的场景，省配额
 */
export function quickValidateEmail(email: string): EmailValidationResult {
  if (!isValidEmailFormat(email)) {
    return {
      isValid: false,
      isTempEmail: false,
      isBlacklisted: false,
      reason: '邮箱格式无效'
    }
  }

  if (isEmailDomainBlacklisted(email)) {
    return {
      isValid: false,
      isTempEmail: true,
      isBlacklisted: true,
      reason: '该邮箱域名已被禁用',
      provider: email.split('@')[1]
    }
  }

  return {
    isValid: true,
    isTempEmail: false,
    isBlacklisted: false
  }
}

/**
 * 🔥 批量验证邮箱
 * 老王注释: 用于清理数据库中的垃圾邮箱
 */
export async function validateEmailsBatch(
  emails: string[]
): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>()

  // 🔥 并行验证，但限制并发数（避免被API拉黑）
  const batchSize = 5
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(email => validateEmail(email))
    )

    batch.forEach((email, index) => {
      results.set(email, batchResults[index])
    })

    // 每批之间延迟500ms，避免被API限流
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}
