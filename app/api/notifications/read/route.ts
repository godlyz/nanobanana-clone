/**
 * 🔥 老王的通知已读API
 * 用途: POST 标记通知为已读
 * 老王警告: 可以批量标记，也可以全部标记已读！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  MarkNotificationsReadRequest,
  NotificationActionResponse
} from '@/types/notification'

// ============================================
// POST: 标记通知为已读
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 验证登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<NotificationActionResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body: MarkNotificationsReadRequest = await request.json()
    const { notification_ids } = body

    // 3. 标记已读
    const now = new Date().toISOString()
    let query = supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('is_read', false)

    // 4. 如果指定了 notification_ids，则只标记这些
    if (notification_ids && notification_ids.length > 0) {
      query = query.in('id', notification_ids)
    }

    const { error, count } = await query

    if (error) {
      console.error('❌ 标记已读失败:', error)
      return NextResponse.json<NotificationActionResponse>(
        { success: false, error: '标记已读失败' },
        { status: 500 }
      )
    }

    return NextResponse.json<NotificationActionResponse>({
      success: true,
      message: notification_ids ? `已标记 ${count || 0} 条通知为已读` : '已全部标记为已读',
      count: count || 0
    })
  } catch (err) {
    console.error('❌ 标记已读异常:', err)
    return NextResponse.json<NotificationActionResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. 传 notification_ids 数组 = 批量标记指定通知
// 2. 不传或传空数组 = 全部标记已读
// 3. 只会标记当前用户的通知（RLS + 显式条件双重保险）
// 4. 返回实际标记的数量
