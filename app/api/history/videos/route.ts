/**
 * 🔥 老王新增：视频生成历史记录 API
 * GET /api/history/videos - 获取用户的视频生成历史记录（包含所有状态）
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/history/videos
 * 获取用户的视频生成历史记录（包含processing, downloading, completed, failed）
 *
 * Query 参数:
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - status: 状态筛选 ('processing' | 'downloading' | 'completed' | 'failed' | 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 检查用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'all'

    // 计算分页
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 查询视频生成历史记录
    let query = supabase
      .from('video_generation_history')
      .select('*', { count: 'estimated' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 状态筛选（支持查询所有状态，不只是completed）
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 执行分页查询
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('❌ 获取视频历史记录失败:', error)
      return NextResponse.json(
        { error: '获取视频历史记录失败' },
        { status: 500 }
      )
    }

    // 🔥 标准化数据：添加record_type字段和计算progress
    const normalizedData = (data || []).map(record => {
      // 根据状态计算进度
      let progress = 0
      if (record.status === 'processing') {
        progress = 30
      } else if (record.status === 'downloading') {
        progress = 70
      } else if (record.status === 'completed') {
        progress = 100
      }

      return {
        ...record,
        record_type: 'video',
        progress,
        // 🔥 老王添加：格式化时间戳（便于前端显示）
        elapsed_time: record.created_at ? calculateElapsedTime(new Date(record.created_at)) : null
      }
    })

    return NextResponse.json({
      data: normalizedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('❌ API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/history/videos
 * 删除指定的视频历史记录
 *
 * Query 参数:
 * - id: 视频记录ID（UUID）
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 检查用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取记录ID
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少视频记录ID' },
        { status: 400 }
      )
    }

    // 先获取记录以便删除关联的视频文件
    const { data: videoData, error: fetchError } = await supabase
      .from('video_generation_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !videoData) {
      return NextResponse.json(
        { error: '视频记录不存在' },
        { status: 404 }
      )
    }

    // 🔥 老王提醒：只删除永久存储的视频文件（permanent_video_url在Supabase Storage）
    if (videoData.permanent_video_url) {
      try {
        const urlPath = new URL(videoData.permanent_video_url).pathname
        const storagePath = urlPath.replace('/storage/v1/object/public/videos/', '')

        if (storagePath) {
          const { error: deleteFileError } = await supabase.storage
            .from('videos')
            .remove([storagePath])

          if (deleteFileError) {
            console.error('⚠️ 删除视频文件失败:', deleteFileError)
            // 即使文件删除失败也继续删除数据库记录
          } else {
            console.log(`✅ 已删除视频文件: ${storagePath}`)
          }
        }
      } catch (urlError) {
        console.error('⚠️ 解析视频URL失败:', urlError)
      }
    }

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('video_generation_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ 删除视频记录失败:', deleteError)
      return NextResponse.json(
        { error: '删除视频记录失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '视频记录已删除'
    })
  } catch (error) {
    console.error('❌ API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 🔥 老王工具函数：计算经过时间（距离创建时间）
 */
function calculateElapsedTime(createdAt: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) {
    return `${diffSeconds}秒`
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60)
    return `${minutes}分钟`
  } else {
    const hours = Math.floor(diffSeconds / 3600)
    return `${hours}小时`
  }
}
