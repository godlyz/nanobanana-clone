/**
 * 🔥 老王的用户推荐历史API
 * 用途: 用户查看自己提交的showcase推荐历史
 * GET /api/showcase/my-submissions - 获取用户的推荐列表
 * DELETE /api/showcase/my-submissions?id=xxx - 删除指定推荐
 * 老王警告: 只能操作自己的推荐，别tm越权！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 用户查询自己的推荐列表')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 查询用户的推荐列表（关联生成历史获取图片URL）
    const { data: submissions, error: queryError } = await supabase
      .from('showcase_submissions')
      .select(`
        *,
        generation_history:generation_history_id (
          id,
          generated_images,
          image_names
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('❌ 查询推荐列表失败:', queryError)
      return NextResponse.json(
        { success: false, error: '查询推荐列表失败' },
        { status: 500 }
      )
    }

    console.log(`✅ 查询成功，共 ${submissions?.length || 0} 条记录`)

    // 3. 处理数据：添加图片URL
    const processedSubmissions = submissions?.map(submission => {
      // 🔥 老王修复：兼容generated_images和image_names字段
      const generatedImages = submission.generation_history?.generated_images
        || submission.generation_history?.image_names
        || []
      const imageUrl = Array.isArray(generatedImages) ? generatedImages[submission.image_index] : ''

      return {
        id: submission.id,
        generation_history_id: submission.generation_history_id,
        image_index: submission.image_index,
        image_url: imageUrl || '',
        title: submission.title,
        description: submission.description,
        category: submission.category,
        tags: submission.tags,
        status: submission.status,
        reviewed_by: submission.reviewed_by,
        reviewed_at: submission.reviewed_at,
        rejection_reason: submission.rejection_reason,
        created_at: submission.created_at
      }
    }) || []

    // 4. 返回数据
    return NextResponse.json({
      success: true,
      data: processedSubmissions
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 查询推荐列表异常:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ 用户删除推荐')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 获取要删除的推荐ID
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('id')

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: '缺少推荐ID' },
        { status: 400 }
      )
    }

    console.log('🗑️ 删除推荐ID:', submissionId)

    // 3. 验证推荐归属（只能删除自己的）
    const { data: submission, error: checkError } = await supabase
      .from('showcase_submissions')
      .select('user_id, status')
      .eq('id', submissionId)
      .single()

    if (checkError || !submission) {
      console.error('❌ 查询推荐失败:', checkError)
      return NextResponse.json(
        { success: false, error: '推荐不存在' },
        { status: 404 }
      )
    }

    if (submission.user_id !== user.id) {
      console.error('❌ 用户尝试删除别人的推荐:', user.id, submission.user_id)
      return NextResponse.json(
        { success: false, error: '无权删除此推荐' },
        { status: 403 }
      )
    }

    // 4. 只允许删除pending状态的推荐
    if (submission.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '只能删除待审核的推荐' },
        { status: 400 }
      )
    }

    // 5. 执行删除
    const { error: deleteError } = await supabase
      .from('showcase_submissions')
      .delete()
      .eq('id', submissionId)

    if (deleteError) {
      console.error('❌ 删除推荐失败:', deleteError)
      return NextResponse.json(
        { success: false, error: '删除失败' },
        { status: 500 }
      )
    }

    console.log('✅ 删除成功:', submissionId)

    return NextResponse.json({
      success: true,
      message: '删除成功'
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 删除推荐异常:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
