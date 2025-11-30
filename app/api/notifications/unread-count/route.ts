/**
 * 🔥 老王的未读通知数量API
 * 用途: GET 获取当前用户的未读通知数量
 * 老王警告: 这个接口会被频繁调用，要保证性能！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UnreadCountResponse } from '@/types/notification'

// ============================================
// GET: 获取未读通知数量
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 验证登录
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<UnreadCountResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 查询未读数量
    const { count, error } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('❌ 查询未读数量失败:', error)
      return NextResponse.json<UnreadCountResponse>(
        { success: false, error: '获取未读数量失败' },
        { status: 500 }
      )
    }

    return NextResponse.json<UnreadCountResponse>({
      success: true,
      count: count || 0
    })
  } catch (err) {
    console.error('❌ 获取未读数量异常:', err)
    return NextResponse.json<UnreadCountResponse>(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. 使用 count: 'exact', head: true 只查数量不查数据
// 2. 这个接口会被导航栏频繁调用，保持轻量
// 3. 数据库有索引 idx_notifications_user_unread 支持这个查询
