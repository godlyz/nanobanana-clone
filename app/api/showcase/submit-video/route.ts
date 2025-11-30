/**
 * 🔥 老王的视频推荐提交API
 * 用途: 用户将生成的视频推荐到案例展示库
 * POST /api/showcase/submit-video
 * 老王警告: 必须登录，只能推荐自己的视频，只能推荐已完成的视频！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { SubmitVideoShowcaseRequest, SubmitVideoShowcaseResponse, VideoShowcaseCategory } from '@/types/showcase'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 收到视频推荐提交请求')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 解析请求体
    const body: SubmitVideoShowcaseRequest = await request.json()
    const {
      video_generation_history_id,
      title,
      description,
      category,
      tags = []
    } = body

    console.log('📋 视频推荐信息:', {
      video_generation_history_id,
      title,
      category,
      tags
    })

    // 3. 验证必填字段
    if (!video_generation_history_id || !title || !category) {
      console.error('❌ 缺少必填字段')
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '缺少必填字段：video_generation_history_id、title、category' },
        { status: 400 }
      )
    }

    // 4. 验证分类
    const validCategories: VideoShowcaseCategory[] = ['portrait', 'landscape', 'product', 'creative', 'anime', 'all']
    if (!validCategories.includes(category)) {
      console.error('❌ 无效的分类:', category)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: `无效的分类，必须是：${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. 验证视频生成历史是否属于当前用户且已完成
    const { data: videoData, error: videoError } = await supabase
      .from('video_generation_history')
      .select('id, user_id, status, permanent_video_url, google_video_url, prompt, duration, resolution')
      .eq('id', video_generation_history_id)
      .eq('user_id', user.id)
      .single()

    if (videoError || !videoData) {
      console.error('❌ 视频记录不存在或不属于当前用户:', videoError)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '视频记录不存在或无权访问' },
        { status: 403 }
      )
    }

    console.log('✅ 视频记录验证通过')

    // 6. 验证视频状态必须是completed
    if (videoData.status !== 'completed') {
      console.error('❌ 视频尚未完成:', videoData.status)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: `视频尚未完成生成，当前状态：${videoData.status}` },
        { status: 400 }
      )
    }

    // 7. 验证视频URL存在
    const videoUrl = videoData.permanent_video_url || videoData.google_video_url
    if (!videoUrl) {
      console.error('❌ 视频URL不存在')
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '视频URL不存在，无法分享' },
        { status: 400 }
      )
    }

    console.log('✅ 视频URL验证通过:', videoUrl)

    // 8. 检查是否重复推荐（同一个视频只能推荐一次）
    const { data: existingSubmission, error: duplicateError } = await supabase
      .from('video_showcase_submissions')
      .select('id, status')
      .eq('video_generation_history_id', video_generation_history_id)
      .maybeSingle()

    if (duplicateError) {
      // 如果表不存在，则创建它（首次使用时）
      if (duplicateError.code === '42P01') {
        console.log('⚠️ video_showcase_submissions 表不存在，需要创建')
        // 这里不直接创建表，而是返回提示
        return NextResponse.json<SubmitVideoShowcaseResponse>(
          { success: false, error: '视频分享功能正在配置中，请稍后再试' },
          { status: 503 }
        )
      }
      console.error('❌ 检查重复推荐失败:', duplicateError)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '检查重复推荐失败' },
        { status: 500 }
      )
    }

    if (existingSubmission) {
      console.log('⚠️ 该视频已推荐过:', existingSubmission)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        {
          success: false,
          error: `该视频已推荐过，当前状态：${existingSubmission.status === 'pending' ? '审核中' : existingSubmission.status === 'approved' ? '已通过' : '已拒绝'}`
        },
        { status: 409 }
      )
    }

    console.log('✅ 未发现重复推荐')

    // 9. 创建视频推荐提交记录
    const { data: submissionData, error: submitError } = await supabase
      .from('video_showcase_submissions')
      .insert({
        user_id: user.id,
        video_generation_history_id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        tags: tags || [],
        video_url: videoUrl,
        duration: videoData.duration,
        resolution: videoData.resolution,
        prompt: videoData.prompt,
        status: 'pending' // 初始状态为待审核
      })
      .select('id, status')
      .single()

    if (submitError || !submissionData) {
      // 如果表不存在，返回友好提示
      if (submitError?.code === '42P01') {
        console.log('⚠️ video_showcase_submissions 表不存在')
        return NextResponse.json<SubmitVideoShowcaseResponse>(
          { success: false, error: '视频分享功能正在配置中，请稍后再试' },
          { status: 503 }
        )
      }
      console.error('❌ 创建视频推荐提交失败:', submitError)
      return NextResponse.json<SubmitVideoShowcaseResponse>(
        { success: false, error: '推荐提交失败，请稍后重试' },
        { status: 500 }
      )
    }

    console.log('🎉 视频推荐提交成功:', submissionData.id)

    // 10. 返回成功响应
    return NextResponse.json<SubmitVideoShowcaseResponse>({
      success: true,
      data: {
        submission_id: submissionData.id,
        status: submissionData.status,
        message: '视频推荐提交成功！我们会尽快审核您的作品。'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ 视频推荐提交异常:', error)
    return NextResponse.json<SubmitVideoShowcaseResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
