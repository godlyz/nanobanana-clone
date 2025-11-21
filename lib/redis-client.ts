/**
 * 🔥 老王的Redis客户端工具
 * 用途: 统一管理Redis连接，支持Upstash和本地Redis
 * 老王备注: 这个SB工具必须稳定，缓存出问题整个系统都要完蛋！
 */

import { Redis } from '@upstash/redis'

type RedisLike = {
  set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<any>
  get(key: string): Promise<string | null>
  del(...keys: string[]): Promise<number>
  exists(key: string): Promise<number>
  expire(key: string, ttl: number): Promise<number>
  ttl(key: string): Promise<number>
  mget(...keys: string[]): Promise<(string | null)[]>
  mset(values: Record<string, string>): Promise<'OK' | null>
  incr(key: string): Promise<number>
  incrby(key: string, amount: number): Promise<number>
  decr(key: string): Promise<number>
  decrby(key: string, amount: number): Promise<number>
  flushall(): Promise<string>
}

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number | null }>()

  private getEntry(key: string) {
    const entry = this.store.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }

    return entry
  }

  private setExpiry(key: string, ttlMs: number | null) {
    const entry = this.store.get(key)
    if (!entry) {
      return 0
    }

    entry.expiresAt = ttlMs === null ? null : Date.now() + ttlMs
    this.store.set(key, entry)
    return 1
  }

  async set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<'OK'> {
    const ttlMs = options?.px ?? (options?.ex ? options.ex * 1000 : null)
    this.store.set(key, {
      value,
      expiresAt: ttlMs !== null ? Date.now() + ttlMs : null,
    })
    return 'OK'
  }

  async get(key: string): Promise<string | null> {
    const entry = this.getEntry(key)
    return entry ? entry.value : null
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0
    for (const key of keys) {
      if (this.getEntry(key) !== null) {
        this.store.delete(key)
        deleted += 1
      }
    }
    return deleted
  }

  async exists(key: string): Promise<number> {
    return this.getEntry(key) ? 1 : 0
  }

  async expire(key: string, ttl: number): Promise<number> {
    const ttlMs = ttl >= 0 ? ttl * 1000 : null
    return this.setExpiry(key, ttlMs)
  }

  async ttl(key: string): Promise<number> {
    const entry = this.getEntry(key)
    if (!entry) {
      return -2
    }

    if (entry.expiresAt === null) {
      return -1
    }

    const remainingMs = entry.expiresAt - Date.now()
    return remainingMs <= 0 ? -2 : Math.ceil(remainingMs / 1000)
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)))
  }

  async mset(values: Record<string, string>): Promise<'OK'> {
    for (const [key, value] of Object.entries(values)) {
      await this.set(key, value)
    }
    return 'OK'
  }

  private adjustNumber(key: string, delta: number): number {
    const currentEntry = this.getEntry(key)
    const currentValue = currentEntry?.value ?? '0'
    const currentNumber = Number.parseInt(currentValue, 10) || 0
    const nextNumber = currentNumber + delta
    this.store.set(key, { value: String(nextNumber), expiresAt: currentEntry?.expiresAt ?? null })
    return nextNumber
  }

  async incr(key: string): Promise<number> {
    return this.adjustNumber(key, 1)
  }

  async incrby(key: string, amount: number): Promise<number> {
    return this.adjustNumber(key, amount)
  }

  async decr(key: string): Promise<number> {
    return this.adjustNumber(key, -1)
  }

  async decrby(key: string, amount: number): Promise<number> {
    return this.adjustNumber(key, -amount)
  }

  async flushall(): Promise<string> {
    this.store.clear()
    return 'OK'
  }
}

// Redis客户端实例
let redisClient: RedisLike | null = null
let warnedFallback = false

/**
 * 🔥 获取Redis客户端实例
 * @returns {Redis} Redis客户端
 */
export function getRedisClient(): RedisLike {
  if (redisClient) {
    return redisClient
  }

  // 检查环境变量
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    if (!warnedFallback) {
      console.warn('⚠️ Redis配置缺失，使用内存缓存实现，仅供开发/测试使用')
      warnedFallback = true
    }
    redisClient = new InMemoryRedis()
    return redisClient
  }

  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
      // 🔥 老王 Day 4 修复：@upstash/redis 的 retry 配置应该是对象而不是数字
      retry: {
        retries: 3,
        backoff: (retryCount: number) => Math.min(retryCount * 50, 500),
      },
      // ttl: 60, // 默认TTL 60秒（移除，这不是Redis构造函数的有效选项）
    }) as unknown as RedisLike

    console.log('✅ Redis客户端初始化成功')
    return redisClient
  } catch (error) {
    console.error('❌ Redis客户端初始化失败，降级为内存缓存实现:', error)
    if (!warnedFallback) {
      console.warn('⚠️ 已启用内存缓存实现，仅建议在非生产环境使用')
      warnedFallback = true
    }
    redisClient = new InMemoryRedis()
    return redisClient
  }
}

/**
 * 🔥 测试Redis连接
 * @returns {Promise<boolean>} 连接是否正常
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const testKey = 'admin:connection:test'
    const testValue = `test_${Date.now()}`

    // 写入测试
    await client.set(testKey, testValue, { ex: 10 })

    // 读取测试
    const retrievedValue = await client.get(testKey)

    // 清理测试数据
    await client.del(testKey)

    if (retrievedValue === testValue) {
      console.log('✅ Redis连接测试成功')
      return true
    } else {
      console.error('❌ Redis连接测试失败: 值不匹配')
      return false
    }
  } catch (error) {
    console.error('❌ Redis连接测试失败:', error)
    return false
  }
}

/**
 * 🔥 安全的Redis操作包装器
 * 自动处理错误和重试逻辑
 */
export class SafeRedisOperations {
  private client: RedisLike

  constructor() {
    this.client = getRedisClient()
  }

  /**
   * 安全设置值
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      const options = ttl ? { ex: ttl } : undefined
      await this.client.set(key, serializedValue, options)
      return true
    } catch (error) {
      console.error(`❌ Redis SET操作失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 安全获取值
   */
  async get<T = string>(key: string, parseJson = false): Promise<T | null> {
    try {
      const value = await this.client.get(key)
      if (value === null) {
        return null
      }

      if (parseJson) {
        return JSON.parse(value) as T
      }

      return value as T
    } catch (error) {
      console.error(`❌ Redis GET操作失败 [${key}]:`, error)
      return null
    }
  }

  /**
   * 安全删除值
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error(`❌ Redis DEL操作失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 安全检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.error(`❌ Redis EXISTS操作失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 安全设置过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl)
      return result === 1
    } catch (error) {
      console.error(`❌ Redis EXPIRE操作失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 安全获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key)
    } catch (error) {
      console.error(`❌ Redis TTL操作失败 [${key}]:`, error)
      return -1
    }
  }

  /**
   * 安全批量获取
   */
  async mget<T = string>(keys: string[], parseJson = false): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys)

      return values.map(value => {
        if (value === null) {
          return null
        }

        if (parseJson) {
          try {
            return JSON.parse(value) as T
          } catch (parseError) {
            console.error('❌ JSON解析失败:', parseError, 'Value:', value)
            return null
          }
        }

        return value as T
      })
    } catch (error) {
      console.error('❌ Redis MGET操作失败:', error)
      return keys.map(() => null)
    }
  }

  /**
   * 安全批量设置
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      const serializedPairs: Record<string, string> = {}

      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs[key] = typeof value === 'string' ? value : JSON.stringify(value)
      }

      await this.client.mset(serializedPairs)

      // 如果指定了TTL，为所有键设置过期时间
      if (ttl) {
        const promises = Object.keys(keyValuePairs).map(key =>
          this.client.expire(key, ttl)
        )
        await Promise.all(promises)
      }

      return true
    } catch (error) {
      console.error('❌ Redis MSET操作失败:', error)
      return false
    }
  }

  /**
   * 安全递增操作
   */
  async incr(key: string, amount = 1): Promise<number | null> {
    try {
      if (amount === 1) {
        return await this.client.incr(key)
      } else {
        return await this.client.incrby(key, amount)
      }
    } catch (error) {
      console.error(`❌ Redis INCR操作失败 [${key}]:`, error)
      return null
    }
  }

  /**
   * 安全递减操作
   */
  async decr(key: string, amount = 1): Promise<number | null> {
    try {
      if (amount === 1) {
        return await this.client.decr(key)
      } else {
        return await this.client.decrby(key, amount)
      }
    } catch (error) {
      console.error(`❌ Redis DECR操作失败 [${key}]:`, error)
      return null
    }
  }

  /**
   * 清空所有数据（危险操作，仅限开发环境）
   */
  async flushAll(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 生产环境禁止执行flushAll操作！')
      return false
    }

    try {
      await this.client.flushall()
      console.log('⚠️ 开发环境Redis数据已清空')
      return true
    } catch (error) {
      console.error('❌ Redis FLUSHALL操作失败:', error)
      return false
    }
  }
}

/**
 * 🔥 导出安全的Redis操作实例
 */
export const redis = new SafeRedisOperations()

/**
 * 🔥 缓存键前缀管理
 */
export const CACHE_KEYS = {
  CONFIG: 'admin:config',
  PROMOTION_RULES: 'admin:promotion_rules',
  USER_SESSION: 'admin:session',
  AUDIT_LOG: 'admin:audit',
  SYSTEM_HEALTH: 'admin:health',
} as const

/**
 * 🔥 缓存TTL配置（秒）
 */
export const CACHE_TTL = {
  CONFIG: parseInt(process.env.CONFIG_CACHE_TTL || '3600'), // 1小时
  PROMOTION_RULES: parseInt(process.env.PROMOTION_RULES_CACHE_TTL || '3600'), // 1小时
  USER_SESSION: 86400, // 24小时
  SYSTEM_HEALTH: 300, // 5分钟
} as const

console.log('🔥 Redis工具模块加载完成')
