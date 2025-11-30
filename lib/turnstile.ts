/**
 * 🔥 老王的Cloudflare Turnstile验证工具
 * 用途: 验证图形验证码，防止机器人攻击
 * 老王警告: 这是防护第一道防线，千万别tm跳过验证！
 */

// Turnstile验证结果
export interface TurnstileVerifyResult {
  success: boolean
  valid: boolean
  reason?: string
  hostname?: string
  action?: string
  cdata?: string
}

// Cloudflare API响应接口
interface CloudflareResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

/**
 * 🔥 验证Turnstile Token
 * 老王核心功能: 调用Cloudflare API验证token
 *
 * @param token - 前端Turnstile返回的token
 * @param remoteIp - 用户IP地址（可选，用于额外验证）
 */
function isValidIpAddress(ip?: string | null): boolean {
  if (!ip) return false
  // IPv4
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/
  if (ipv4Regex.test(ip)) return true
  // IPv6 (simplified check)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  const ipv6CompressedRegex = /^(([0-9a-fA-F]{1,4}:){1,7}|:):(([0-9a-fA-F]{1,4}:){1,7}|:)?[0-9a-fA-F]{1,4}$/
  return ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip)
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  const isDevMode = process.env.NODE_ENV !== 'production'

  // 检查配置
  if (isDevMode || !secretKey || secretKey === 'your_turnstile_secret_key_here') {
    console.warn('⚠️ Turnstile Secret Key未配置，跳过验证（开发环境容错）')
    return {
      success: true,
      valid: true,
      reason: 'Turnstile未配置，开发模式放行'
    }
  }

  // 检查token
  if (!token || token.trim() === '') {
    console.warn('⚠️ Turnstile token为空')
    return {
      success: false,
      valid: false,
      reason: '图形验证码无效'
    }
  }

  try {
    // 调用Cloudflare验证API
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    // 如果提供了IP，添加到验证请求中
    if (remoteIp && isValidIpAddress(remoteIp)) {
      formData.append('remoteip', remoteIp)
    }

    console.log('🔍 验证Turnstile token:', token.substring(0, 20) + '...')

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString(),
        // 🔥 老王修复: 设置5秒超时
        signal: AbortSignal.timeout(5000)
      }
    )

    if (!response.ok) {
      console.error('❌ Turnstile API调用失败:', response.status, response.statusText)
      return {
        success: false,
        valid: false,
        reason: 'Turnstile验证服务异常'
      }
    }

    const data: CloudflareResponse = await response.json()

    // 检查验证结果
    if (data.success) {
      console.log('✅ Turnstile验证通过')
      return {
        success: true,
        valid: true,
        hostname: data.hostname,
        action: data.action,
        cdata: data.cdata
      }
    } else {
      // 验证失败，记录错误码
      const errorCodes = data['error-codes'] || []
      console.warn('⚠️ Turnstile验证失败:', errorCodes)

      // 老王智慧: 根据错误码返回友好提示
      let reason = '图形验证失败'
      if (errorCodes.includes('timeout-or-duplicate')) {
        reason = '验证码已过期或重复使用，请刷新页面重试'
      } else if (errorCodes.includes('invalid-input-response')) {
        reason = '验证码无效，请重新验证'
      } else if (errorCodes.includes('bad-request')) {
        reason = '验证请求格式错误'
      } else if (errorCodes.includes('internal-error')) {
        reason = '验证服务内部错误，请稍后重试'
      }

      return {
        success: false,
        valid: false,
        reason
      }
    }

  } catch (error) {
    console.error('❌ Turnstile验证异常:', error)

    // 超时或网络错误
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          valid: false,
          reason: '验证超时，请检查网络连接'
        }
      }
    }

    return {
      success: false,
      valid: false,
      reason: '验证异常，请稍后重试'
    }
  }
}

/**
 * 🔥 批量验证Turnstile Tokens
 * 老王注释: 用于批量处理场景
 */
export async function verifyTurnstileTokensBatch(
  tokens: Array<{ token: string, remoteIp?: string }>
): Promise<TurnstileVerifyResult[]> {
  // 🔥 并行验证，但限制并发数（避免被Cloudflare限流）
  const batchSize = 5
  const results: TurnstileVerifyResult[] = []

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(({ token, remoteIp }) => verifyTurnstileToken(token, remoteIp))
    )

    results.push(...batchResults)

    // 每批之间延迟200ms，避免被限流
    if (i + batchSize < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}

/**
 * 🔥 检查Turnstile是否已配置
 * 老王智慧: 用于判断是否启用图形验证码功能
 */
export function isTurnstileConfigured(): boolean {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  return !!(
    siteKey &&
    secretKey &&
    siteKey !== 'your_turnstile_site_key_here' &&
    secretKey !== 'your_turnstile_secret_key_here'
  )
}

/**
 * 🔥 获取Turnstile Site Key
 * 老王注释: 前端需要这个key来渲染验证组件
 */
export function getTurnstileSiteKey(): string | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey || siteKey === 'your_turnstile_site_key_here') {
    return null
  }

  return siteKey
}
