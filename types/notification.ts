/**
 * 🔥 老王的通知系统类型定义
 * 用途: 定义通知系统相关的所有 TypeScript 类型
 * 老王警告: 通知要及时清理，30天后的已读通知自动删除！
 */

// ============================================
// 1. 通知类型枚举
// ============================================
export type NotificationType =
  | 'follow'    // 有人关注你
  | 'like'      // 有人点赞你的内容
  | 'comment'   // 有人评论你的内容
  | 'mention'   // 有人在评论中@你
  | 'reply'     // 有人回复你的评论
  | 'system'    // 系统通知

// ============================================
// 2. 通知关联的内容类型
// ============================================
export type NotificationContentType = 'blog_post' | 'artwork' | 'video' | 'comment' | null

// ============================================
// 3. 基础通知类型（数据库直接映射）
// ============================================
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  from_user_id: string | null // 触发通知的用户，系统通知为null
  content_id: string | null // 关联的内容ID
  content_type: NotificationContentType
  title: string | null // 系统通知用
  message: string | null // 通知内容预览
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ============================================
// 4. 触发通知的用户信息（关联查询用）
// ============================================
export interface NotificationFromUser {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

// ============================================
// 5. 带用户信息的通知（前端展示用）
// ============================================
export interface NotificationWithUser extends Notification {
  from_user: NotificationFromUser | null
}

// ============================================
// 6. 创建通知请求（后端内部使用）
// ============================================
export interface CreateNotificationRequest {
  user_id: string
  type: NotificationType
  from_user_id?: string
  content_id?: string
  content_type?: NotificationContentType
  title?: string
  message?: string
}

// ============================================
// 7. 通知列表查询参数
// ============================================
export interface ListNotificationsParams {
  type?: NotificationType // 可选，按类型筛选
  is_read?: boolean // 可选，按已读状态筛选
  page?: number
  limit?: number
}

// ============================================
// 8. 通知列表响应
// ============================================
export interface NotificationsResponse {
  success: boolean
  data?: NotificationWithUser[]
  pagination?: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
  error?: string
}

// ============================================
// 9. 单条通知响应
// ============================================
export interface NotificationResponse {
  success: boolean
  data?: NotificationWithUser
  error?: string
}

// ============================================
// 10. 标记已读请求
// ============================================
export interface MarkNotificationsReadRequest {
  notification_ids?: string[] // 可选，为空表示全部标记已读
}

// ============================================
// 11. 通知操作响应
// ============================================
export interface NotificationActionResponse {
  success: boolean
  message?: string
  count?: number // 操作影响的通知数量
  error?: string
}

// ============================================
// 12. 未读通知数量响应
// ============================================
export interface UnreadCountResponse {
  success: boolean
  count?: number
  error?: string
}

// ============================================
// 13. 通知统计
// ============================================
export interface NotificationStats {
  total_count: number
  unread_count: number
  by_type: Record<NotificationType, number>
}

// ============================================
// 14. 实时通知事件（Supabase Realtime用）
// ============================================
export interface RealtimeNotificationEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Notification
  old?: Notification
}

// 🔥 老王备注：
// 1. Notification 是数据库直接映射的类型
// 2. NotificationWithUser 是前端展示用的类型，包含触发者信息
// 3. from_user_id 设置 ON DELETE SET NULL，用户删除后显示"已注销用户"
// 4. 通知由后端API通过service_role创建，用户无法直接插入
// 5. read_at 记录已读时间，方便统计用户活跃度
// 6. RealtimeNotificationEvent 用于 Supabase Realtime 订阅
