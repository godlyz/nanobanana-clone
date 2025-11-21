/**
 * 🔥 老王的推荐提交API
 * 用途: 用户将生成的图片推荐到案例展示库
 * POST /api/showcase/submit
 * 老王警告: 必须登录，只能推荐自己的作品，不能重复推荐！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { SubmitShowcaseRequest, SubmitShowcaseResponse } from '@/types/showcase'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 收到推荐提交请求')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 解析请求体
    const body: SubmitShowcaseRequest = await request.json()
    const {
      generation_history_id,
      image_index,
      title,
      description,
      category,
      tags = []
    } = body

    console.log('📋 推荐信息:', {
      generation_history_id,
      image_index,
      title,
      category,
      tags
    })

    // 3. 验证必填字段
    if (!generation_history_id || image_index === undefined || !title || !category) {
      console.error('❌ 缺少必填字段')
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: '缺少必填字段：generation_history_id、image_index、title、category' },
        { status: 400 }
      )
    }

    // 4. 验证分类
    const validCategories = ['portrait', 'landscape', 'product', 'creative', 'anime', 'all']
    if (!validCategories.includes(category)) {
      console.error('❌ 无效的分类:', category)
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: `无效的分类，必须是：${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. 验证生成历史是否属于当前用户
    const { data: historyData, error: historyError } = await supabase
      .from('generation_history')
      .select('id, user_id, generated_images')
      .eq('id', generation_history_id)
      .eq('user_id', user.id)
      .single()

    if (historyError || !historyData) {
      console.error('❌ 生成历史不存在或不属于当前用户:', historyError)
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: '生成历史不存在或无权访问' },
        { status: 403 }
      )
    }

    console.log('✅ 生成历史验证通过')

    // 6. 验证image_index是否有效
    const generatedImages = historyData.generated_images || []
    if (!Array.isArray(generatedImages) || image_index < 0 || image_index >= generatedImages.length) {
      console.error('❌ 无效的图片索引:', { image_index, total: generatedImages.length })
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: `无效的图片索引：${image_index}（总数：${generatedImages.length}）` },
        { status: 400 }
      )
    }

    const imageUrl = generatedImages[image_index]
    console.log('✅ 图片索引验证通过，图片URL:', imageUrl)

    // 7. 检查是否重复推荐（同一张图片只能推荐一次）
    const { data: existingSubmission, error: duplicateError } = await supabase
      .from('showcase_submissions')
      .select('id, status')
      .eq('generation_history_id', generation_history_id)
      .eq('image_index', image_index)
      .maybeSingle()

    if (duplicateError) {
      console.error('❌ 检查重复推荐失败:', duplicateError)
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: '检查重复推荐失败' },
        { status: 500 }
      )
    }

    if (existingSubmission) {
      console.log('⚠️ 该图片已推荐过:', existingSubmission)
      return NextResponse.json<SubmitShowcaseResponse>(
        {
          success: false,
          error: `该图片已推荐过，当前状态：${existingSubmission.status === 'pending' ? '审核中' : existingSubmission.status === 'approved' ? '已通过' : '已拒绝'}`
        },
        { status: 409 }
      )
    }

    console.log('✅ 未发现重复推荐')

    // 8. 创建推荐提交记录
    const { data: submissionData, error: submitError } = await supabase
      .from('showcase_submissions')
      .insert({
        user_id: user.id,
        generation_history_id,
        image_index,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        tags: tags || [],
        status: 'pending' // 初始状态为待审核
      })
      .select('id, status')
      .single()

    if (submitError || !submissionData) {
      console.error('❌ 创建推荐提交失败:', submitError)
      return NextResponse.json<SubmitShowcaseResponse>(
        { success: false, error: '推荐提交失败，请稍后重试' },
        { status: 500 }
      )
    }

    console.log('🎉 推荐提交成功:', submissionData.id)

    // 9. 返回成功响应
    return NextResponse.json<SubmitShowcaseResponse>({
      success: true,
      data: {
        submission_id: submissionData.id,
        status: submissionData.status,
        message: '推荐提交成功！我们会尽快审核您的作品。'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ 推荐提交异常:', error)
    return NextResponse.json<SubmitShowcaseResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
