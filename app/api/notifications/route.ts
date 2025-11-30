/**
 * 🔥 老王的通知API - 列表查询
 * 用途: GET 获取当前用户的通知列表
 * 老王警告: 只能查自己的通知，RLS策略保证安全！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  NotificationType,
  NotificationWithUser,
  NotificationsResponse
} from '@/types/notification'

// ============================================
// GET: 获取通知列表
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 验证登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<NotificationsResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as NotificationType | null
    const is_read = searchParams.get('is_read')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // 3. 构建查询
    const offset = (page - 1) * limit

    let query = supabase
      .from('user_notifications')
      .select(`
        *,
        from_user:user_profiles!user_notifications_from_user_id_fkey(
          user_id,
          display_name,
          avatar_url,
          username
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 4. 按类型筛选
    if (type) {
      query = query.eq('type', type)
    }

    // 5. 按已读状态筛选
    if (is_read !== null && is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true')
    }

    // 6. 分页
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error, count } = await query

    if (error) {
      console.error('❌ 查询通知失败:', error)
      return NextResponse.json<NotificationsResponse>(
        { success: false, error: '获取通知失败' },
        { status: 500 }
      )
    }

    // 7. 组装返回数据
    const notificationsWithUser: NotificationWithUser[] = (notifications || []).map(notification => ({
      ...notification,
      from_user: notification.from_user || null
    }))

    return NextResponse.json<NotificationsResponse>({
      success: true,
      data: notificationsWithUser,
      pagination: {
        page,
        limit,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      }
    })
  } catch (err) {
    console.error('❌ 获取通知列表异常:', err)
    return NextResponse.json<NotificationsResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. 只能查自己的通知（RLS策略保证）
// 2. 支持按类型、已读状态筛选
// 3. 默认按时间倒序，最新的在前面
// 4. from_user 关联用户信息，删除用户后显示 null
