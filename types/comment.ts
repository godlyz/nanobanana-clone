/**
 * 🔥 老王的评论系统类型定义
 * 用途: 定义评论系统相关的所有 TypeScript 类型
 * 老王警告: 嵌套评论最多3层（depth 0-2），别tm搞更深的嵌套！
 */

// ============================================
// 1. 评论内容类型枚举
// ============================================
export type CommentContentType = 'blog_post' | 'artwork' | 'video'

// ============================================
// 2. 基础评论类型（数据库直接映射）
// ============================================
export interface Comment {
  id: string
  user_id: string
  content_id: string
  content_type: CommentContentType
  parent_id: string | null
  content: string
  like_count: number
  reply_count: number
  depth: number // 0=顶级, 1=一级回复, 2=二级回复
  is_edited: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ============================================
// 3. 评论作者信息（关联查询用）
// ============================================
export interface CommentAuthor {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

// ============================================
// 4. 带作者信息的评论（前端展示用）
// ============================================
export interface CommentWithAuthor extends Comment {
  author: CommentAuthor
  is_liked?: boolean // 当前用户是否点赞
  replies?: CommentWithAuthor[] // 嵌套回复（仅顶级评论加载时包含）
}

// ============================================
// 5. 评论点赞记录
// ============================================
export interface CommentLike {
  user_id: string
  comment_id: string
  created_at: string
}

// ============================================
// 6. 创建评论请求
// ============================================
export interface CreateCommentRequest {
  content_id: string
  content_type: CommentContentType
  parent_id?: string // 可选，回复某条评论时传
  content: string
}

// ============================================
// 7. 更新评论请求
// ============================================
export interface UpdateCommentRequest {
  content: string
}

// ============================================
// 8. 评论列表查询参数
// ============================================
export interface ListCommentsParams {
  content_id: string
  content_type: CommentContentType
  parent_id?: string | null // null=只查顶级评论，有值=查某评论的回复
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'popular' // popular按like_count排序
}

// ============================================
// 9. 评论列表响应
// ============================================
export interface CommentsResponse {
  success: boolean
  data?: CommentWithAuthor[]
  pagination?: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
  error?: string
}

// ============================================
// 10. 单条评论响应
// ============================================
export interface CommentResponse {
  success: boolean
  data?: CommentWithAuthor
  error?: string
}

// ============================================
// 11. 评论操作响应（点赞/删除等）
// ============================================
export interface CommentActionResponse {
  success: boolean
  message?: string
  error?: string
}

// ============================================
// 12. 评论统计
// ============================================
export interface CommentStats {
  total_count: number
  top_level_count: number
}

// 🔥 老王备注：
// 1. Comment 是数据库直接映射的类型
// 2. CommentWithAuthor 是前端展示用的类型，包含作者信息
// 3. depth 字段限制嵌套层级：0=顶级，1=一级回复，2=二级回复
// 4. 软删除用 deleted_at，前端查询时自动过滤
// 5. replies 字段只有查顶级评论时才会填充，避免N+1查询
