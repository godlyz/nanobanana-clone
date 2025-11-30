// 🔥 老王创建：视频生成错误码分类系统
// 用途: 统一管理所有视频生成相关的错误码和错误信息
// 分类: 按错误类型和严重程度组织

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'LOW',         // 低：不影响功能，用户可继续
  MEDIUM = 'MEDIUM',   // 中：部分功能受影响，需要提示
  HIGH = 'HIGH',       // 高：功能无法使用，需要修复
  CRITICAL = 'CRITICAL', // 严重：系统级错误，影响所有用户
}

/**
 * 错误详细信息接口
 */
export interface VideoErrorDetails {
  code: string
  message: string
  userMessage: string  // 用户友好的错误提示
  severity: ErrorSeverity
  httpStatus: number
  retryable: boolean   // 是否可以重试
  refundCredits: boolean  // 是否应该退还积分
  documentationUrl?: string  // 错误文档链接
  suggestedAction?: string  // 建议的解决方案
}

/**
 * 视频生成错误码分类
 */
export const VideoErrorCodes = {
  // ========== 参数验证错误 (4xx) ==========
  VALIDATION: {
    MISSING_PROMPT: {
      code: 'MISSING_PROMPT',
      message: 'Missing or invalid field: prompt (must be non-empty string)',
      userMessage: '请输入视频提示词',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请检查并填写视频描述内容',
    },

    INVALID_ASPECT_RATIO: {
      code: 'INVALID_ASPECT_RATIO',
      message: 'aspect_ratio must be one of: 16:9, 9:16',
      userMessage: '视频宽高比格式不正确',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请选择支持的宽高比（16:9 或 9:16）',
    },

    INVALID_RESOLUTION: {
      code: 'INVALID_RESOLUTION',
      message: 'resolution must be one of: 720p, 1080p',
      userMessage: '视频分辨率不支持',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请选择支持的分辨率（720p 或 1080p）',
    },

    INVALID_DURATION: {
      code: 'INVALID_DURATION',
      message: 'duration must be one of: 4, 6, 8 (seconds)',
      userMessage: '视频时长不正确',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请选择支持的时长（4秒、6秒或8秒）',
    },

    INVALID_GENERATION_MODE: {
      code: 'INVALID_GENERATION_MODE',
      message: 'generation_mode must be one of: text-to-video, reference-images, first-last-frame',
      userMessage: '生成模式不正确',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请选择支持的生成模式',
    },

    INVALID_REFERENCE_IMAGES: {
      code: 'INVALID_REFERENCE_IMAGES',
      message: 'reference_images must be an array with 1-3 image URLs for reference-images mode',
      userMessage: '参考图片数量不正确',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请上传1-3张参考图片',
    },

    MISSING_FRAME_URLS: {
      code: 'MISSING_FRAME_URLS',
      message: 'Both first_frame_url and last_frame_url are required for first-last-frame mode',
      userMessage: '缺少首帧或尾帧图片',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请同时上传首帧和尾帧图片',
    },

    CONFLICTING_FIELDS: {
      code: 'CONFLICTING_FIELDS',
      message: 'Conflicting fields detected for the selected generation mode',
      userMessage: '参数冲突',
      severity: ErrorSeverity.LOW,
      httpStatus: 400,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请检查当前生成模式所需的参数',
    },
  },

  // ========== 权限与配额错误 (4xx) ==========
  AUTHORIZATION: {
    INSUFFICIENT_CREDITS: {
      code: 'INSUFFICIENT_CREDITS',
      message: 'Insufficient credits for video generation',
      userMessage: '积分不足，无法生成视频',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 402,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请购买更多积分后重试',
    },

    CONCURRENT_LIMIT_EXCEEDED: {
      code: 'CONCURRENT_LIMIT_EXCEEDED',
      message: 'Maximum 3 concurrent video generation tasks allowed',
      userMessage: '同时生成的视频数量已达上限',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 429,
      retryable: true,
      refundCredits: false,
      suggestedAction: '请等待现有任务完成后再尝试',
    },

    RATE_LIMIT_EXCEEDED: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded for your subscription tier',
      userMessage: '请求频率超过限制',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 429,
      retryable: true,
      refundCredits: false,
      suggestedAction: '请稍后重试，或升级订阅计划',
    },

    SUBSCRIPTION_EXPIRED: {
      code: 'SUBSCRIPTION_EXPIRED',
      message: 'Your subscription has expired',
      userMessage: '订阅已过期',
      severity: ErrorSeverity.HIGH,
      httpStatus: 402,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请续费订阅后继续使用',
    },
  },

  // ========== Google Veo API 错误 (5xx) ==========
  VEO_API: {
    VEO_API_TIMEOUT: {
      code: 'VEO_API_TIMEOUT',
      message: 'Google Veo API request timed out',
      userMessage: 'AI服务响应超时',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 504,
      retryable: true,
      refundCredits: true,
      suggestedAction: '请稍后重试',
    },

    VEO_API_UNAVAILABLE: {
      code: 'VEO_API_UNAVAILABLE',
      message: 'Google Veo API is temporarily unavailable',
      userMessage: 'AI服务暂时不可用',
      severity: ErrorSeverity.HIGH,
      httpStatus: 503,
      retryable: true,
      refundCredits: true,
      suggestedAction: '服务正在维护中，请稍后重试',
    },

    VEO_API_ERROR: {
      code: 'VEO_API_ERROR',
      message: 'Google Veo API returned an error',
      userMessage: 'AI服务返回错误',
      severity: ErrorSeverity.HIGH,
      httpStatus: 503,
      retryable: true,
      refundCredits: true,
      suggestedAction: '请稍后重试，如果问题持续请联系客服',
    },

    PROMPT_CONTAINS_PROHIBITED_CONTENT: {
      code: 'PROMPT_CONTAINS_PROHIBITED_CONTENT',
      message: 'Prompt contains prohibited content',
      userMessage: '提示词包含不允许的内容',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 400,
      retryable: false,
      refundCredits: true,
      suggestedAction: '请修改提示词，避免使用敏感或不当内容',
    },

    VIDEO_GENERATION_FAILED: {
      code: 'VIDEO_GENERATION_FAILED',
      message: 'Video generation failed on Google Veo API',
      userMessage: '视频生成失败',
      severity: ErrorSeverity.HIGH,
      httpStatus: 500,
      retryable: true,
      refundCredits: true,
      suggestedAction: '请尝试修改提示词或参数后重试',
    },
  },

  // ========== 数据库错误 (5xx) ==========
  DATABASE: {
    DATABASE_CONNECTION_ERROR: {
      code: 'DATABASE_CONNECTION_ERROR',
      message: 'Failed to connect to database',
      userMessage: '数据库连接失败',
      severity: ErrorSeverity.CRITICAL,
      httpStatus: 500,
      retryable: true,
      refundCredits: true,
      suggestedAction: '系统正在处理中，请稍后重试',
    },

    DATABASE_QUERY_ERROR: {
      code: 'DATABASE_QUERY_ERROR',
      message: 'Database query failed',
      userMessage: '数据查询失败',
      severity: ErrorSeverity.HIGH,
      httpStatus: 500,
      retryable: true,
      refundCredits: true,
      suggestedAction: '请稍后重试',
    },

    DATABASE_ERROR: {
      code: 'DATABASE_ERROR',
      message: 'An unexpected database error occurred',
      userMessage: '数据库错误',
      severity: ErrorSeverity.HIGH,
      httpStatus: 500,
      retryable: true,
      refundCredits: true,
      suggestedAction: '系统错误，请联系客服',
    },
  },

  // ========== 系统错误 (5xx) ==========
  SYSTEM: {
    INTERNAL_SERVER_ERROR: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
      userMessage: '服务器内部错误',
      severity: ErrorSeverity.CRITICAL,
      httpStatus: 500,
      retryable: true,
      refundCredits: true,
      suggestedAction: '系统错误，请稍后重试',
    },

    CONFIGURATION_ERROR: {
      code: 'CONFIGURATION_ERROR',
      message: 'System configuration error',
      userMessage: '系统配置错误',
      severity: ErrorSeverity.CRITICAL,
      httpStatus: 500,
      retryable: false,
      refundCredits: true,
      suggestedAction: '系统配置异常，请联系技术支持',
    },

    OPERATION_NOT_FOUND: {
      code: 'OPERATION_NOT_FOUND',
      message: 'Operation ID not found',
      userMessage: '操作记录未找到',
      severity: ErrorSeverity.MEDIUM,
      httpStatus: 404,
      retryable: false,
      refundCredits: false,
      suggestedAction: '请检查任务ID是否正确',
    },
  },
}

/**
 * 根据错误码获取详细信息
 */
export function getErrorDetails(errorCode: string): VideoErrorDetails | null {
  // 遍历所有分类查找错误码
  for (const category of Object.values(VideoErrorCodes)) {
    for (const error of Object.values(category)) {
      if (error.code === errorCode) {
        return error as VideoErrorDetails
      }
    }
  }

  return null
}

/**
 * 创建标准错误响应
 */
export function createErrorResponse(errorCode: string, additionalInfo?: Record<string, any>) {
  const details = getErrorDetails(errorCode)

  if (!details) {
    // 未知错误，返回通用错误
    return {
      error: errorCode,
      message: 'An unexpected error occurred',
      userMessage: '发生了未知错误',
      severity: ErrorSeverity.HIGH,
      retryable: true,
      ...additionalInfo,
    }
  }

  return {
    error: details.code,
    message: details.message,
    userMessage: details.userMessage,
    severity: details.severity,
    retryable: details.retryable,
    suggestedAction: details.suggestedAction,
    documentationUrl: details.documentationUrl,
    ...additionalInfo,
  }
}

/**
 * 判断错误是否应该退还积分
 */
export function shouldRefundCredits(errorCode: string): boolean {
  const details = getErrorDetails(errorCode)
  return details?.refundCredits ?? true  // 默认退还积分（安全策略）
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(errorCode: string): boolean {
  const details = getErrorDetails(errorCode)
  return details?.retryable ?? false  // 默认不重试（保守策略）
}

/**
 * 获取错误的HTTP状态码
 */
export function getHttpStatus(errorCode: string): number {
  const details = getErrorDetails(errorCode)
  return details?.httpStatus ?? 500  // 默认500
}

// 🔥 老王备注：
// 1. 完整的错误码分类：参数验证、权限配额、VeoAPI、数据库、系统
// 2. 每个错误都包含：code、message、userMessage、severity、httpStatus、retryable、refundCredits
// 3. 支持错误详情查询、错误响应生成、积分退款判断、重试判断
// 4. 用户友好的错误提示和建议解决方案
// 5. 完全类型安全
//
// 使用示例:
// ```typescript
// import { VideoErrorCodes, createErrorResponse, shouldRefundCredits } from '@/lib/video-error-codes'
//
// // 创建错误响应
// const errorResponse = createErrorResponse('INSUFFICIENT_CREDITS', {
//   currentCredits: 10,
//   requiredCredits: 50,
// })
//
// // 判断是否应该退款
// if (shouldRefundCredits('VEO_API_ERROR')) {
//   await refundCredits(userId, amount)
// }
// ```
