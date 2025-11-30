/**
 * 🔥 老王创建：论坛统计API
 * 用途：获取论坛统计数据（总帖数、总回复数、活跃用户等）
 * 日期：2025-11-25
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/forum/stats
 *
 * 获取论坛统计数据
 *
 * 返回数据：
 * - total_threads: 总帖数（未删除）
 * - total_replies: 总回复数（未删除）
 * - total_users: 参与用户总数
 * - active_users_today: 今日活跃用户数（今天发帖或回复的用户）
 * - total_categories: 分类总数
 * - total_tags: 标签总数
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 统计总帖数（未删除）
    const { count: totalThreads } = await supabase
      .from('forum_threads')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    // 2. 统计总回复数（未删除）
    const { count: totalReplies } = await supabase
      .from('forum_replies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    // 3. 统计参与用户总数（发过帖或回复的用户去重）
    const { data: threadUsers } = await supabase
      .from('forum_threads')
      .select('user_id')
      .is('deleted_at', null)

    const { data: replyUsers } = await supabase
      .from('forum_replies')
      .select('user_id')
      .is('deleted_at', null)

    const uniqueUserIds = new Set([
      ...(threadUsers?.map(t => t.user_id) || []),
      ...(replyUsers?.map(r => r.user_id) || [])
    ])

    // 4. 统计今日活跃用户（今天发帖或回复的用户）
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayThreadUsers } = await supabase
      .from('forum_threads')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())
      .is('deleted_at', null)

    const { data: todayReplyUsers } = await supabase
      .from('forum_replies')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())
      .is('deleted_at', null)

    const activeTodayUserIds = new Set([
      ...(todayThreadUsers?.map(t => t.user_id) || []),
      ...(todayReplyUsers?.map(r => r.user_id) || [])
    ])

    // 5. 统计分类总数（可见的）
    const { count: totalCategories } = await supabase
      .from('forum_categories')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible', true)

    // 6. 统计标签总数
    const { count: totalTags } = await supabase
      .from('forum_tags')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: {
        total_threads: totalThreads || 0,
        total_replies: totalReplies || 0,
        total_users: uniqueUserIds.size,
        active_users_today: activeTodayUserIds.size,
        total_categories: totalCategories || 0,
        total_tags: totalTags || 0
      }
    })

  } catch (err: any) {
    console.error('❌ 论坛统计API异常:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: err.message
      },
      { status: 500 }
    )
  }
}
