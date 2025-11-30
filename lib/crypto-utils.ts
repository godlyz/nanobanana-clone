/**
 * 🔥 老王的加密工具类
 * 用途: 加密/解密敏感配置（如API Key）
 * 老王备注: 这个SB加密工具要是泄漏，老王就要跑路了！
 */

import crypto from 'crypto'

// 加密配置
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * 🔥 从环境变量获取加密密钥
 * 警告: 生产环境必须设置 ENCRYPTION_KEY 环境变量！
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY

  if (!envKey) {
    console.warn('⚠️ ENCRYPTION_KEY 环境变量未设置，使用默认密钥（仅开发环境）')

    // 开发环境默认密钥（生产环境必须覆盖！）
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须设置 ENCRYPTION_KEY 环境变量！')
    }

    return crypto.scryptSync('nanobanana-dev-secret-key-do-not-use-in-production', 'salt', ENCRYPTION_KEY_LENGTH)
  }

  // 将环境变量密钥转换为固定长度的Buffer
  return crypto.scryptSync(envKey, 'salt', ENCRYPTION_KEY_LENGTH)
}

/**
 * 🔥 加密文本（AES-256-GCM）
 * @param plainText 明文
 * @returns 加密后的文本（格式：iv:encrypted:authTag，Base64编码）
 */
export function encrypt(plainText: string): string {
  try {
    if (!plainText) {
      return ''
    }

    const key = getEncryptionKey()

    // 生成随机初始化向量（IV）
    const iv = crypto.randomBytes(IV_LENGTH)

    // 创建加密器
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

    // 加密数据
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final()
    ])

    // 获取认证标签（GCM模式）
    const authTag = cipher.getAuthTag()

    // 组合：iv + encrypted + authTag（Base64编码）
    const result = Buffer.concat([iv, encrypted, authTag]).toString('base64')

    console.log('✅ 数据加密成功')
    return result
  } catch (error) {
    console.error('❌ 加密失败:', error)
    throw new Error('数据加密失败')
  }
}

/**
 * 🔥 解密文本（AES-256-GCM）
 * @param encryptedText 加密的文本（格式：iv:encrypted:authTag，Base64编码）
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) {
      return ''
    }

    const key = getEncryptionKey()

    // 解码Base64
    const buffer = Buffer.from(encryptedText, 'base64')

    // 提取 iv、encrypted、authTag
    const iv = buffer.subarray(0, IV_LENGTH)
    const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH)
    const encrypted = buffer.subarray(IV_LENGTH, buffer.length - AUTH_TAG_LENGTH)

    // 创建解密器
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    // 解密数据
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    console.log('✅ 数据解密成功')
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('❌ 解密失败:', error)
    throw new Error('数据解密失败（可能密钥错误或数据损坏）')
  }
}

/**
 * 🔥 生成随机加密密钥（用于初始化环境变量）
 * 生成一个32字节的随机密钥，可用于设置 ENCRYPTION_KEY 环境变量
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(ENCRYPTION_KEY_LENGTH).toString('base64')
  console.log('🔑 新生成的加密密钥（请保存到环境变量 ENCRYPTION_KEY）:')
  console.log(key)
  return key
}

/**
 * 🔥 测试加密/解密功能
 */
export function testEncryption(): boolean {
  try {
    const testData = 'test-api-key-12345'
    const encrypted = encrypt(testData)
    const decrypted = decrypt(encrypted)

    const success = testData === decrypted

    if (success) {
      console.log('✅ 加密/解密测试通过')
    } else {
      console.error('❌ 加密/解密测试失败: 数据不匹配')
    }

    return success
  } catch (error) {
    console.error('❌ 加密/解密测试失败:', error)
    return false
  }
}

/**
 * 🔥 老王工具：安全地显示敏感信息（脱敏）
 * 用于日志输出，防止泄露完整的API Key
 */
export function maskSensitiveData(data: string, visibleLength: number = 4): string {
  if (!data || data.length <= visibleLength * 2) {
    return '***'
  }

  const prefix = data.substring(0, visibleLength)
  const suffix = data.substring(data.length - visibleLength)

  return `${prefix}${'*'.repeat(Math.max(data.length - visibleLength * 2, 3))}${suffix}`
}

console.log('🔥 加密工具模块加载完成')
