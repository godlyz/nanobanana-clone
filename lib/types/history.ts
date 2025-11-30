// 工具类型定义
export type ToolType =
  // 基础工具箱
  | 'style-transfer'
  | 'background-remover'
  | 'scene-preservation'
  | 'consistent-generation'
  // 高级工具箱
  | 'text-to-image-with-text'
  | 'chat-edit'
  | 'smart-prompt'
  // 基础模式（不使用工具）
  | null

export interface GenerationHistoryRecord {
  id: string
  user_id?: string
  generation_type: 'text_to_image' | 'image_to_image'
  tool_type?: ToolType // 使用的工具类型
  prompt: string
  reference_images: string[]
  generated_images?: string[] | null
  generated_image_url?: string | null
  aspect_ratio: string
  credits_used?: number | null
  batch_count?: number | null
  created_at: string
  generation_params?: Record<string, any> | null
}

export const normalizeGenerationHistoryRecord = (payload: any): GenerationHistoryRecord => {
  const rawType = payload?.generation_type || 'text_to_image'
  const normalizedType = typeof rawType === 'string'
    ? rawType.replace(/-/g, '_')
    : 'text_to_image'

  const referenceImages = Array.isArray(payload?.reference_images)
    ? payload.reference_images
    : []

  // 🔥 老王修复：兼容image_names和generated_images字段
  let generatedImages: string[] = []

  // 优先使用generated_images字段
  if (Array.isArray(payload?.generated_images) && payload.generated_images.length > 0) {
    generatedImages = payload.generated_images
  }
  // 其次使用image_names字段（数据库中实际存储的字段）
  else if (Array.isArray(payload?.image_names) && payload.image_names.length > 0) {
    generatedImages = payload.image_names
  }
  // 最后使用单个图片URL字段
  else if (payload?.generated_image_url) {
    generatedImages = [payload.generated_image_url]
  }

  // 处理 tool_type：null 或有效的工具名称
  const toolType = payload?.tool_type || null

  return {
    id: payload?.id,
    user_id: payload?.user_id,
    generation_type: normalizedType as 'text_to_image' | 'image_to_image',
    tool_type: toolType as ToolType,
    prompt: payload?.prompt || '',
    reference_images: referenceImages,
    generated_images: generatedImages,
    generated_image_url: payload?.generated_image_url || null,
    aspect_ratio: payload?.aspect_ratio || '1:1',
    credits_used: payload?.credits_used ?? null,
    batch_count: payload?.batch_count ?? null,
    created_at: payload?.created_at || new Date().toISOString(),
    generation_params: payload?.generation_params || null,
  }
}

// 🔥 老王添加：视频记录类型定义
export interface VideoHistoryRecord {
  id: string
  user_id: string
  operation_id: string
  status: 'processing' | 'downloading' | 'completed' | 'failed'
  prompt: string
  negative_prompt?: string | null
  aspect_ratio: string
  resolution: string
  duration: number
  duration_seconds?: number // 🔥 老王添加：实际时长（秒），用于延长功能
  reference_image_url?: string | null
  credit_cost: number
  google_video_url?: string | null
  permanent_video_url?: string | null
  thumbnail_url?: string | null
  file_size_bytes?: number | null
  error_message?: string | null
  error_code?: string | null
  retry_count: number
  created_at: string
  completed_at?: string | null
  downloaded_at?: string | null
  record_type: 'video'
  progress: number
  elapsed_time: string | null
  gemini_video_uri?: string | null // 🔥 老王添加：用于判断是否可延长
  generation_mode?: string // 🔥 老王添加：用于区分视频记录
  source_video_id?: string | null // 🔥 老王添加：源视频ID（用于延长链显示）
}

export const getHistoryRecordImages = (record: GenerationHistoryRecord | any): string[] => {
  // 🔥 老王修复：处理多种数据格式
  let images: string[] = []

  // 1. 优先使用标准化后的generated_images字段
  if (Array.isArray(record.generated_images) && record.generated_images.length > 0) {
    images = record.generated_images
  }
  // 2. 兼容原始image_names字段（数据库中的实际字段）
  else if (Array.isArray(record.image_names) && record.image_names.length > 0) {
    images = record.image_names
  }
  // 3. 单个图片URL字段
  else if (record.generated_image_url) {
    images = [record.generated_image_url]
  }

  return images
}
