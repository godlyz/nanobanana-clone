/**
 * 🔥 客户端 IP 提取工具
 * 老王提示: 统一处理 `x-forwarded-for` 多IP 场景，避免字符串不一致导致安全校验失败
 */

/**
 * 从请求头中提取客户端 IP，优先使用 `x-forwarded-for` 首个值
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const ip = forwarded
      .split(',')
      .map(part => part.trim())
      .find(Boolean)

    if (ip) {
      return ip
    }
  }

  const realIp = headers.get('x-real-ip')
  if (realIp && realIp.trim()) {
    return realIp.trim()
  }

  return 'unknown'
}
