// 🔥 老王创建：指数退避重试处理器
// 用途: 为视频生成等关键操作提供智能重试机制
// 策略: Exponential Backoff with Jitter（指数退避+抖动）

/**
 * 错误分类枚举
 * - TRANSIENT: 临时错误，可以重试（网络超时、API限流、服务暂时不可用）
 * - PERMANENT: 永久错误，不应重试（参数错误、权限不足、资源不存在）
 * - UNKNOWN: 未知错误，谨慎重试
 */
export enum ErrorCategory {
  TRANSIENT = 'TRANSIENT',   // 临时错误，可重试
  PERMANENT = 'PERMANENT',    // 永久错误，不重试
  UNKNOWN = 'UNKNOWN',        // 未知错误，谨慎重试
}

/**
 * 错误分类器
 * 根据错误信息和状态码判断错误类型
 */
export function categorizeError(error: any): ErrorCategory {
  // 检查HTTP状态码
  const statusCode = error.status || error.statusCode || error.response?.status

  if (statusCode) {
    // 4xx 客户端错误（除了429）→ PERMANENT
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
      return ErrorCategory.PERMANENT
    }

    // 429 Rate Limit → TRANSIENT
    if (statusCode === 429) {
      return ErrorCategory.TRANSIENT
    }

    // 5xx 服务器错误 → TRANSIENT
    if (statusCode >= 500) {
      return ErrorCategory.TRANSIENT
    }
  }

  // 检查错误消息关键词
  const errorMessage = (error.message || error.toString()).toLowerCase()

  // PERMANENT 错误模式
  const permanentPatterns = [
    'invalid',
    'missing',
    'unauthorized',
    'forbidden',
    'not found',
    'permission denied',
    'authentication failed',
    'invalid parameter',
    'insufficient credits',
  ]

  for (const pattern of permanentPatterns) {
    if (errorMessage.includes(pattern)) {
      return ErrorCategory.PERMANENT
    }
  }

  // TRANSIENT 错误模式
  const transientPatterns = [
    'timeout',
    'rate limit',
    'temporarily unavailable',
    'service unavailable',
    'network',
    'connection',
    'econnrefused',
    'enotfound',
    'etimeout',
  ]

  for (const pattern of transientPatterns) {
    if (errorMessage.includes(pattern)) {
      return ErrorCategory.TRANSIENT
    }
  }

  // 默认返回 UNKNOWN（谨慎重试）
  return ErrorCategory.UNKNOWN
}

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /**
   * 最大重试次数（不包括首次尝试）
   * @default 3
   */
  maxRetries?: number

  /**
   * 初始延迟时间（毫秒）
   * @default 1000 (1秒)
   */
  initialDelay?: number

  /**
   * 最大延迟时间（毫秒）
   * @default 30000 (30秒)
   */
  maxDelay?: number

  /**
   * 退避倍数（每次重试的延迟倍数）
   * @default 2
   */
  backoffMultiplier?: number

  /**
   * 抖动因子（0-1之间，用于随机化延迟）
   * @default 0.1 (±10%)
   */
  jitterFactor?: number

  /**
   * 是否重试UNKNOWN类型的错误
   * @default true
   */
  retryUnknownErrors?: boolean

  /**
   * 自定义重试条件函数
   * @param error 捕获的错误
   * @param attemptNumber 当前重试次数（从1开始）
   * @returns true表示应该重试，false表示不重试
   */
  shouldRetry?: (error: any, attemptNumber: number) => boolean

  /**
   * 重试前的回调函数
   * @param error 捕获的错误
   * @param attemptNumber 下一次尝试的编号（从2开始）
   * @param delay 延迟时间（毫秒）
   */
  onRetry?: (error: any, attemptNumber: number, delay: number) => void
}

/**
 * 计算指数退避延迟时间（带抖动）
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitterFactor: number
): number {
  // 基础延迟：initialDelay * (backoffMultiplier ^ attemptNumber)
  const baseDelay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1)

  // 应用最大延迟限制
  const cappedDelay = Math.min(baseDelay, maxDelay)

  // 应用抖动（±jitterFactor）
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1)
  const finalDelay = cappedDelay + jitter

  // 确保延迟大于0
  return Math.max(0, Math.round(finalDelay))
}

/**
 * 执行带重试的异步操作
 *
 * @template T 操作返回值类型
 * @param operation 要执行的操作（async函数）
 * @param options 重试配置选项
 * @returns Promise<T> 操作成功的返回值
 * @throws 最终失败时抛出最后一次错误
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await veoClient.generateVideo(params),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 2000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms`)
 *     }
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // 合并默认配置
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
    retryUnknownErrors = true,
    shouldRetry,
    onRetry,
  } = options

  let lastError: any

  // 尝试执行（包括首次尝试）
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // 执行操作
      const result = await operation()
      return result
    } catch (error: any) {
      lastError = error

      // 如果这是最后一次尝试，直接抛出错误
      if (attempt > maxRetries) {
        throw error
      }

      // 分类错误
      const category = categorizeError(error)

      // 判断是否应该重试
      let shouldRetryThisError = false

      // 优先使用自定义重试条件
      if (shouldRetry) {
        shouldRetryThisError = shouldRetry(error, attempt)
      } else {
        // 使用默认重试逻辑
        if (category === ErrorCategory.TRANSIENT) {
          shouldRetryThisError = true
        } else if (category === ErrorCategory.UNKNOWN && retryUnknownErrors) {
          shouldRetryThisError = true
        } else {
          shouldRetryThisError = false
        }
      }

      if (!shouldRetryThisError) {
        // 不应重试，直接抛出错误
        throw error
      }

      // 计算延迟时间
      const delay = calculateBackoffDelay(
        attempt,
        initialDelay,
        maxDelay,
        backoffMultiplier,
        jitterFactor
      )

      // 调用重试前回调
      if (onRetry) {
        onRetry(error, attempt + 1, delay)
      }

      // 开发环境输出重试日志
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 [Retry] Attempt ${attempt}/${maxRetries} failed (${category})`)
        console.log(`   Error: ${error.message}`)
        console.log(`   Retrying in ${delay}ms...`)
      }

      // 等待延迟后重试
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError
}

/**
 * 创建预配置的重试处理器
 */
export class RetryHandler {
  private options: RetryOptions

  constructor(options: RetryOptions = {}) {
    this.options = options
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return retryWithBackoff(operation, this.options)
  }

  /**
   * 更新重试配置
   */
  updateOptions(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options }
  }
}

/**
 * 预定义的重试策略
 */
export const RetryStrategies = {
  /**
   * 激进策略：快速重试，适合关键操作
   * - 最大重试次数：5次
   * - 初始延迟：500ms
   * - 最大延迟：10秒
   */
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  /**
   * 标准策略：平衡的重试配置
   * - 最大重试次数：3次
   * - 初始延迟：1秒
   * - 最大延迟：30秒
   */
  STANDARD: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  /**
   * 保守策略：谨慎重试，避免过度请求
   * - 最大重试次数：2次
   * - 初始延迟：2秒
   * - 最大延迟：60秒
   */
  CONSERVATIVE: {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitterFactor: 0.2,
  },

  /**
   * 快速失败策略：只重试一次
   * - 最大重试次数：1次
   * - 初始延迟：1秒
   * - 最大延迟：5秒
   */
  FAST_FAIL: {
    maxRetries: 1,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.05,
  },
}

// 🔥 老王备注：
// 1. 支持指数退避（Exponential Backoff）+ 抖动（Jitter）
// 2. 自动分类错误类型（TRANSIENT/PERMANENT/UNKNOWN）
// 3. 智能重试决策（永久错误不重试，临时错误重试）
// 4. 4种预定义策略（激进/标准/保守/快速失败）
// 5. 可自定义重试条件和回调
// 6. 完全类型安全（TypeScript）
//
// 使用示例:
// ```typescript
// import { retryWithBackoff, RetryStrategies } from '@/lib/retry-handler'
//
// // 使用标准策略
// const result = await retryWithBackoff(
//   () => veoClient.generateVideo(params),
//   RetryStrategies.STANDARD
// )
//
// // 自定义策略
// const result = await retryWithBackoff(
//   () => apiCall(),
//   {
//     maxRetries: 5,
//     initialDelay: 2000,
//     onRetry: (error, attempt, delay) => {
//       console.log(`Retrying... attempt ${attempt}`)
//     }
//   }
// )
// ```
