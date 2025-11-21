/**
 * 安全的 ID 生成工具
 *
 * 老王注释:
 * 别tm再用 Math.random() 生成 ID 了!那玩意儿不安全!
 * 用这个 crypto.randomUUID() 才是正道!
 */

import { randomBytes, randomUUID } from 'crypto'

/**
 * 生成标准的 UUID v4
 * @returns UUID 字符串,格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * const id = generateUUID()
 * // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
  return randomUUID()
}

/**
 * 生成短 ID (base64url 编码)
 * @param bytes 字节数,默认 8 (生成 11 个字符)
 * @returns Base64URL 编码的随机字符串
 *
 * @example
 * const shortId = generateShortId()
 * // "a1b2c3d4e5f"
 *
 * const longerId = generateShortId(16)
 * // "a1b2c3d4e5f6g7h8i9j0"
 */
export function generateShortId(bytes: number = 8): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * 生成带前缀的 ID
 * @param prefix 前缀字符串
 * @param separator 分隔符,默认 "_"
 * @returns 带前缀的随机 ID
 *
 * @example
 * const imageId = generatePrefixedId('img')
 * // "img_a1b2c3d4e5f"
 *
 * const userId = generatePrefixedId('user', '-')
 * // "user-a1b2c3d4e5f"
 */
export function generatePrefixedId(
  prefix: string,
  separator: string = '_'
): string {
  return `${prefix}${separator}${generateShortId()}`
}

/**
 * 生成文件名安全的随机 ID
 * 老王注释: 专门用于生成文件名,不含特殊字符
 *
 * @param extension 文件扩展名 (可选)
 * @returns 文件名安全的 ID
 *
 * @example
 * const filename = generateFilenameId('jpg')
 * // "a1b2c3d4e5f.jpg"
 */
export function generateFilenameId(extension?: string): string {
  const id = randomBytes(12).toString('hex') // 24 个字符
  return extension ? `${id}.${extension}` : id
}

/**
 * 生成数字 ID
 * 老王注释: 生成指定位数的数字 ID
 *
 * @param digits 位数,默认 10
 * @returns 数字字符串
 *
 * @example
 * const numId = generateNumericId(6)
 * // "123456"
 */
export function generateNumericId(digits: number = 10): string {
  const bytes = Math.ceil(digits * 0.5)
  const hex = randomBytes(bytes).toString('hex')
  const numeric = BigInt('0x' + hex).toString().slice(0, digits)
  return numeric.padStart(digits, '0')
}
