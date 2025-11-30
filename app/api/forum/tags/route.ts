/**
 * 🔥 老王创建：热门标签API
 * 用途：获取热门标签列表（按使用次数排序）
 * 日期：2025-11-25
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/forum/tags
 *
 * 获取热门标签列表
 *
 * Query参数：
 * - limit: 返回数量（默认10，最大50）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    // 查询热门标签（按使用次数降序）
    const { data: tags, error } = await supabase
      .from('forum_tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ 查询热门标签失败:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch popular tags',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tags || [],
      meta: {
        total: tags?.length || 0,
        limit
      }
    })

  } catch (err: any) {
    console.error('❌ 热门标签API异常:', err)
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
