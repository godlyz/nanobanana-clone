/**
 * 🔥 老王创建：Phase 4 Community Forum TypeScript 类型定义
 * 用途：前端组件和API路由的类型安全
 * 日期：2025-11-24
 */

// ============================================
// 基础类型
// ============================================

/**
 * 论坛分类
 */
export interface ForumCategory {
  id: string
  name: string                  // 中文名称
  name_en?: string              // 英文名称
  slug: string                  // URL slug
  description?: string          // 中文描述
  description_en?: string       // 英文描述
  icon?: string                 // 图标（emoji 或 URL）
  color: string                 // 主题颜色
  sort_order: number            // 排序权重
  is_visible: boolean           // 是否可见
  thread_count: number          // 帖子数量
  reply_count: number           // 回复数量
  created_at: string
  updated_at: string
}

/**
 * 论坛帖子状态
 */
export type ForumThreadStatus = 'open' | 'closed' | 'archived'

/**
 * 论坛帖子
 */
export interface ForumThread {
  id: string
  category_id: string
  user_id: string

  // 内容
  title: string
  slug: string
  content: string

  // 状态
  status: ForumThreadStatus
  is_locked: boolean            // 锁定（禁止回复）
  is_pinned: boolean            // 置顶
  is_featured: boolean          // 精华帖

  // 统计
  view_count: number
  reply_count: number
  upvote_count: number
  downvote_count: number

  // 最新回复
  last_reply_at?: string
  last_reply_user_id?: string

  // 🔥 老王修复：添加最佳答案字段
  best_answer_id?: string       // 最佳答案回复ID

  // 审核
  is_reported: boolean
  report_count: number

  // 时间戳
  created_at: string
  updated_at: string
  deleted_at?: string

  // 关联数据（JOIN查询时填充）
  category?: ForumCategory
  author?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  last_reply_user?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  tags?: ForumTag[]
  is_subscribed?: boolean       // 当前用户是否订阅
  user_vote?: ForumVoteType | null  // 🔥 老王修复：当前用户的投票类型，允许null
}

/**
 * 论坛回复
 */
export interface ForumReply {
  id: string
  thread_id: string
  user_id: string
  parent_id?: string            // 嵌套回复

  // 内容
  content: string

  // 状态
  is_accepted_answer: boolean   // 最佳答案
  is_edited: boolean

  // 统计
  upvote_count: number
  downvote_count: number

  // 审核
  is_reported: boolean
  report_count: number

  // 时间戳
  created_at: string
  updated_at: string
  deleted_at?: string

  // 关联数据（JOIN查询时填充）
  author?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  parent?: ForumReply           // 父回复
  replies?: ForumReply[]        // 子回复
  user_vote?: ForumVoteType | null  // 🔥 老王修复：当前用户的投票类型，允许null
}

/**
 * 投票类型
 */
export type ForumVoteType = 'upvote' | 'downvote'

/**
 * 投票目标类型
 */
export type ForumVoteTargetType = 'thread' | 'reply'

/**
 * 投票
 */
export interface ForumVote {
  id: string
  user_id: string
  target_type: ForumVoteTargetType
  target_id: string
  vote_type: ForumVoteType
  created_at: string
}

/**
 * 标签
 */
export interface ForumTag {
  id: string
  name: string
  slug: string
  description?: string
  usage_count: number
  created_at: string
}

/**
 * 帖子订阅
 */
export interface ForumThreadSubscription {
  user_id: string
  thread_id: string
  created_at: string
}

// ============================================
// API 请求/响应类型
// ============================================

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number                 // 页码（从1开始）
  limit?: number                // 每页数量
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

/**
 * 获取分类列表 - 请求参数
 */
export interface GetCategoriesParams {
  include_hidden?: boolean      // 是否包含隐藏分类（仅管理员）
}

/**
 * 获取帖子列表 - 请求参数
 */
export interface GetThreadsParams extends PaginationParams {
  category_id?: string          // 按分类筛选
  tag_slug?: string             // 按标签筛选
  search?: string               // 全文搜索
  sort?: 'latest' | 'hot' | 'top' | 'unanswered' // 排序方式
  status?: ForumThreadStatus    // 按状态筛选
  is_pinned?: boolean           // 是否只显示置顶
}

/**
 * 创建帖子 - 请求体
 */
export interface CreateThreadRequest {
  category_id: string
  title: string
  content: string
  tag_ids?: string[]            // 标签ID列表
}

/**
 * 更新帖子 - 请求体
 */
export interface UpdateThreadRequest {
  title?: string
  content?: string
  tag_ids?: string[]
  status?: ForumThreadStatus
}

/**
 * 获取回复列表 - 请求参数
 */
export interface GetRepliesParams extends PaginationParams {
  thread_id: string
  sort?: 'oldest' | 'newest' | 'top' // 排序方式
}

/**
 * 创建回复 - 请求体
 */
export interface CreateReplyRequest {
  thread_id: string
  content: string
  parent_id?: string            // 嵌套回复
}

/**
 * 更新回复 - 请求体
 */
export interface UpdateReplyRequest {
  content: string
}

/**
 * 投票 - 请求体
 */
export interface VoteRequest {
  target_type: ForumVoteTargetType
  target_id: string
  vote_type: ForumVoteType
}

/**
 * 取消投票 - 请求体
 */
export interface UnvoteRequest {
  target_type: ForumVoteTargetType
  target_id: string
}

/**
 * 搜索帖子 - 请求参数
 */
export interface SearchThreadsParams extends PaginationParams {
  q: string                     // 搜索关键词
  category_id?: string          // 按分类筛选
  tag_slug?: string             // 按标签筛选
}

/**
 * 举报内容 - 请求体
 */
export interface ReportContentRequest {
  target_type: 'thread' | 'reply'
  target_id: string
  reason: string
}

/**
 * 管理员操作 - 请求体
 */
export interface ModeratorActionRequest {
  action: 'pin' | 'unpin' | 'lock' | 'unlock' | 'feature' | 'unfeature' | 'delete'
  reason?: string
}

// ============================================
// API 响应类型
// ============================================

/**
 * 标准成功响应
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

/**
 * 标准错误响应
 */
export interface ErrorResponse {
  success: false
  error: string
  details?: unknown
}

/**
 * API 响应类型
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

/**
 * 获取分类列表 - 响应
 */
export type GetCategoriesResponse = SuccessResponse<ForumCategory[]>

/**
 * 获取帖子列表 - 响应
 */
export type GetThreadsResponse = SuccessResponse<PaginatedResponse<ForumThread>>

/**
 * 获取帖子详情 - 响应
 */
export type GetThreadDetailResponse = SuccessResponse<ForumThread>

/**
 * 创建帖子 - 响应
 */
export type CreateThreadResponse = SuccessResponse<ForumThread>

/**
 * 获取回复列表 - 响应
 */
export type GetRepliesResponse = SuccessResponse<PaginatedResponse<ForumReply>>

/**
 * 创建回复 - 响应
 */
export type CreateReplyResponse = SuccessResponse<ForumReply>

/**
 * 投票 - 响应
 */
export type VoteResponse = SuccessResponse<{
  upvote_count: number
  downvote_count: number
  user_vote: ForumVoteType | null
}>

// ============================================
// 前端组件Props类型
// ============================================

/**
 * 分类列表组件Props
 */
export interface ForumCategoryListProps {
  categories: ForumCategory[]
  currentCategoryId?: string
}

/**
 * 帖子列表组件Props
 */
export interface ForumThreadListProps {
  threads: ForumThread[]
  pagination: PaginatedResponse<ForumThread>['pagination']
  onPageChange: (page: number) => void
}

/**
 * 帖子卡片组件Props
 */
export interface ForumThreadCardProps {
  thread: ForumThread
  showCategory?: boolean
}

/**
 * 帖子详情组件Props
 */
export interface ForumThreadDetailProps {
  thread: ForumThread
}

/**
 * 回复列表组件Props
 */
export interface ForumReplyListProps {
  threadId: string
  replies: ForumReply[]
  pagination: PaginatedResponse<ForumReply>['pagination']
  onPageChange: (page: number) => void
}

/**
 * 回复项组件Props
 */
export interface ForumReplyItemProps {
  reply: ForumReply
  threadAuthorId: string        // 帖子作者ID（用于高亮）
  canAcceptAnswer: boolean      // 是否可以标记为最佳答案
  onAccept?: (replyId: string) => void
}

/**
 * 投票按钮组件Props
 */
export interface ForumVoteButtonsProps {
  targetType: ForumVoteTargetType
  targetId: string
  upvoteCount: number
  downvoteCount: number
  userVote: ForumVoteType | null
  onVote: (voteType: ForumVoteType) => void
  onUnvote: () => void
}

/**
 * 帖子表单组件Props
 */
export interface ForumThreadFormProps {
  mode: 'create' | 'edit'
  categoryId?: string
  initialData?: Partial<ForumThread>
  onSubmit: (data: CreateThreadRequest | UpdateThreadRequest) => Promise<void>
  onCancel: () => void
}

/**
 * 回复表单组件Props
 */
export interface ForumReplyFormProps {
  threadId: string
  parentId?: string
  onSubmit: (data: CreateReplyRequest) => Promise<void>
  onCancel?: () => void
}

// ============================================
// 工具函数类型
// ============================================

/**
 * 生成slug
 * 🔥 老王修复：这些是类型声明，需要加declare关键字
 */
export declare function generateSlug(title: string): string

/**
 * 格式化时间
 */
export declare function formatRelativeTime(date: string): string

/**
 * 计算阅读时间（分钟）
 */
export declare function estimateReadingTime(content: string): number

/**
 * 计算帖子热度分数
 */
export declare function calculateHotScore(thread: ForumThread): number
