// 🔥 老王注释：API密钥生成和验证工具
// 这个文件包含生成加密安全的API密钥、哈希和验证的所有逻辑

import crypto from "crypto"

/**
 * 🔥 老王函数：生成加密安全的API密钥
 * 格式：sk_live_[32位随机字符]
 *
 * @returns 生成的API密钥字符串
 */
export function generateApiKey(): string {
  // 生成32字节的加密安全随机数据（老王我可不用那些垃圾Math.random）
  const randomBytes = crypto.randomBytes(32)

  // 转换为Base64并去掉特殊字符，只保留字母数字
  const randomString = randomBytes
    .toString("base64")
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .replace(/=/g, "")
    .substring(0, 32) // 取前32个字符

  // 🔥 老王规范：使用sk_live_前缀，live表示生产环境密钥
  return `sk_live_${randomString}`
}

/**
 * 🔥 老王函数：计算API密钥的SHA-256哈希值
 * 绝不在数据库存明文密钥！这是安全的基本原则！
 *
 * @param apiKey - 原始API密钥
 * @returns SHA-256哈希值（十六进制字符串）
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex")
}

/**
 * 🔥 老王函数：生成API密钥预览字符串
 * 格式：sk_...last4
 * 用于在界面上显示，让用户知道是哪个密钥，但又不泄露完整密钥
 *
 * @param apiKey - 原始API密钥
 * @returns 预览字符串
 */
export function getApiKeyPreview(apiKey: string): string {
  if (apiKey.length < 8) {
    throw new Error("API密钥长度太短，这个SB密钥格式不对")
  }

  // 取最后4位
  const last4 = apiKey.slice(-4)
  return `sk_...${last4}`
}

/**
 * 🔥 老王函数：验证API密钥格式是否正确
 *
 * @param apiKey - 要验证的API密钥
 * @returns 格式是否正确
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // 必须以sk_live_开头，并且总长度合适
  if (!apiKey.startsWith("sk_live_")) {
    return false
  }

  // 总长度应该是 sk_live_(8) + 32位随机字符 = 40
  if (apiKey.length !== 40) {
    return false
  }

  // 随机部分应该只包含字母和数字
  const randomPart = apiKey.substring(8)
  return /^[a-zA-Z0-9]+$/.test(randomPart)
}

/**
 * 🔥 老王函数：验证API密钥是否匹配哈希值
 * 用于API请求时验证密钥的有效性
 *
 * @param apiKey - 用户提供的API密钥
 * @param storedHash - 数据库中存储的哈希值
 * @returns 是否匹配
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(apiKey)

  // 使用timingSafeEqual防止时序攻击（老王我连这种细节都考虑到了）
  try {
    const computedBuffer = Buffer.from(computedHash, "hex")
    const storedBuffer = Buffer.from(storedHash, "hex")

    if (computedBuffer.length !== storedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(computedBuffer, storedBuffer)
  } catch (error) {
    // 艹，格式不对或者长度不匹配
    console.error("API密钥验证错误:", error)
    return false
  }
}

/**
 * 🔥 老王类型：API密钥数据库记录
 */
export interface ApiKeyRecord {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_preview: string
  last_used_at: string | null
  created_at: string
  is_active: boolean
}

/**
 * 🔥 老王类型：返回给客户端的API密钥信息（不包含哈希）
 */
export interface ApiKeyInfo {
  id: string
  name: string
  key_preview: string
  last_used_at: string | null
  created_at: string
  is_active: boolean
}

/**
 * 🔥 老王函数：将数据库记录转换为客户端信息（过滤敏感数据）
 *
 * @param record - 数据库记录
 * @returns 客户端安全的信息对象
 */
export function toApiKeyInfo(record: ApiKeyRecord): ApiKeyInfo {
  return {
    id: record.id,
    name: record.name,
    key_preview: record.key_preview,
    last_used_at: record.last_used_at,
    created_at: record.created_at,
    is_active: record.is_active,
  }
}
