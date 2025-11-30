/**
 * 统一历史记录 API - 获取所有类型的历史记录（图像+视频）
 *
 * 功能: GET - 获取用户的所有历史记录列表（支持分页和筛选）
 * - 图像生成历史 (generation_history 表)
 * - 视频生成历史 (video_generation_history 表)
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/history/all
 * 获取用户的所有历史记录（图像+视频）
 *
 * Query 参数:
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - type: 筛选类型 ('all' | 'image' | 'video' | 具体工具类型)
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
    const type = searchParams.get('type') || 'all'

    console.log(`🔍 获取历史记录: user=${user.id}, type=${type}, page=${page}, limit=${limit}`)

    let allRecords: any[] = []

    // 根据类型决定获取哪些历史记录
    if (type === 'all' || type === 'image' || (type !== 'video' && !type.startsWith('video-'))) {
      // 获取图像生成历史记录
      try {
        const imageQuery = supabase
          .from('generation_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const { data: imageData, error: imageError } = await imageQuery

        if (!imageError && imageData) {
          // 转换图像记录格式以兼容现有组件
          const formattedImageData = imageData.map(record => ({
            ...record,
            // 统一字段格式
            id: record.id,
            prompt: record.prompt,
            created_at: record.created_at,
            credits_used: record.credits_used || 0,
            // 图像特有字段
            generated_images: record.generated_images || [],
            thumbnail_images: record.thumbnail_images || [],
            reference_images: record.reference_images || [],
            generation_type: record.generation_type,
            tool_type: record.tool_type,
            aspect_ratio: record.aspect_ratio || '1:1',
            // 视频相关字段设为null
            thumbnail_url: null,
            permanent_video_url: null,
            duration: null,
            resolution: null,
            status: 'completed', // 图像记录默认为完成状态
            // 统一类型标识
            record_type: 'image'
          }))

          allRecords = allRecords.concat(formattedImageData)
          console.log(`✅ 获取图像历史记录: ${formattedImageData.length}条`)
        } else {
          console.error('❌ 获取图像历史记录失败:', imageError)
        }
      } catch (error) {
        console.error('❌ 查询图像历史记录异常:', error)
      }
    }

    if (type === 'all' || type === 'video' || type.startsWith('video-')) {
      // 获取视频生成历史记录
      try {
        const videoQuery = supabase
          .from('video_generation_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const { data: videoData, error: videoError } = await videoQuery

        if (!videoError && videoData) {
          // 转换视频记录格式以兼容现有组件
          const formattedVideoData = videoData.map(record => ({
            ...record,
            // 统一字段格式
            id: record.id,
            prompt: record.prompt,
            negative_prompt: record.negative_prompt, // 🔥 老王修复：明确传递负面提示词
            created_at: record.created_at,
            credits_used: record.credit_cost || 0,
            // 视频特有字段
            thumbnail_url: record.thumbnail_url,
            permanent_video_url: record.permanent_video_url,
            duration: record.duration,
            resolution: record.resolution,
            aspect_ratio: record.aspect_ratio || '16:9',
            generation_mode: record.generation_mode || 'text-to-video',
            // 图像相关字段设为空数组
            generated_images: [],
            thumbnail_images: [],
            reference_images: [],
            generation_type: 'video_generation', // 特殊标识视频类型
            tool_type: null,
            status: record.status || 'completed',
            // 统一类型标识
            record_type: 'video'
          }))

          allRecords = allRecords.concat(formattedVideoData)
          console.log(`✅ 获取视频历史记录: ${formattedVideoData.length}条`)
        } else {
          console.error('❌ 获取视频历史记录失败:', videoError)
        }
      } catch (error) {
        console.error('❌ 查询视频历史记录异常:', error)
      }
    }

    // 按时间排序（最新的在前）
    allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 如果需要类型过滤
    let filteredRecords = allRecords
    if (type !== 'all') {
      if (type === 'image') {
        filteredRecords = allRecords.filter(record => record.record_type === 'image')
      } else if (type === 'video') {
        filteredRecords = allRecords.filter(record => record.record_type === 'video')
      } else if (type.startsWith('video-')) {
        // 具体的视频生成模式
        filteredRecords = allRecords.filter(record =>
          record.record_type === 'video' && record.generation_mode === type
        )
      } else {
        // 具体的图像工具类型
        filteredRecords = allRecords.filter(record =>
          record.record_type === 'image' && record.tool_type === type
        )
      }
    }

    // 计算分页
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedRecords = filteredRecords.slice(from, to)
    const total = filteredRecords.length

    console.log(`📊 返回结果: 总计${total}条，当前页${paginatedRecords.length}条`)

    return NextResponse.json({
      data: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
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