/**
 * 批量生成任务 API
 *
 * 功能:
 * - POST: 创建批量生成任务
 * - GET: 获取任务状态和进度
 * - PATCH: 更新任务状态（一般由后台进程调用）
 * - DELETE: 取消/删除批量任务
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 初始化 Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * GET /api/batch-generate
 * 获取批量生成任务列表或单个任务详情
 *
 * Query 参数:
 * - id: 任务ID（可选，如果提供则返回单个任务详情）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - status: 状态筛选 ('pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'all')
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

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    // 如果提供了ID,返回单个任务详情
    if (id) {
      const { data: taskData, error } = await supabase
        .from('batch_generation_tasks')
        .select(`
          *,
          subjects (
            id,
            name,
            subject_image_url
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !taskData) {
        return NextResponse.json(
          { error: '任务不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json({ data: taskData })
    }

    // 获取任务列表
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'all'

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('batch_generation_tasks')
      .select(`
        *,
        subjects (
          id,
          name,
          subject_image_url
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('❌ 获取批量任务失败:', error)
      return NextResponse.json(
        { error: '获取批量任务失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
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
 * POST /api/batch-generate
 * 创建批量生成任务
 *
 * Body:
 * {
 *   subject_id: string, // 主体素材ID
 *   scene_prompts: Array<{scene_id?: string, prompt: string}>, // 场景提示词数组
 *   auto_execute?: boolean // 是否立即执行（默认false,需要手动触发）
 * }
 */
export async function POST(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json()
    const {
      subject_id,
      scene_prompts = [],
      auto_execute = false
    } = body

    // 参数验证
    if (!subject_id || !Array.isArray(scene_prompts) || scene_prompts.length === 0) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }

    // 验证主体素材是否存在
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subject_id)
      .eq('user_id', user.id)
      .single()

    if (subjectError || !subjectData) {
      return NextResponse.json(
        { error: '主体素材不存在' },
        { status: 404 }
      )
    }

    // 创建批量生成任务
    const { data: taskData, error: createError } = await supabase
      .from('batch_generation_tasks')
      .insert({
        user_id: user.id,
        subject_id,
        scene_prompts,
        total_count: scene_prompts.length,
        completed_count: 0,
        failed_count: 0,
        status: auto_execute ? 'processing' : 'pending',
        generated_images: []
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ 创建批量任务失败:', createError)
      return NextResponse.json(
        { error: '创建批量任务失败' },
        { status: 500 }
      )
    }

    // 如果auto_execute=true,立即开始执行（这里简化处理,实际应该用队列）
    if (auto_execute) {
      // 触发后台处理（这里用setTimeout模拟,实际应该用消息队列）
      processBatchTaskInBackground(taskData.id, user.id).catch(err => {
        console.error('❌ 后台处理失败:', err)
      })
    }

    return NextResponse.json({
      success: true,
      data: taskData
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
 * PATCH /api/batch-generate
 * 更新任务状态（手动触发执行或取消）
 *
 * Query 参数:
 * - id: 任务ID
 *
 * Body:
 * {
 *   action: 'execute' | 'cancel'
 * }
 */
export async function PATCH(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少任务ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['execute', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      )
    }

    // 获取任务
    const { data: taskData, error: fetchError } = await supabase
      .from('batch_generation_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !taskData) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    if (action === 'execute') {
      // 只有pending状态的任务可以执行
      if (taskData.status !== 'pending') {
        return NextResponse.json(
          { error: '任务已经执行或已完成' },
          { status: 400 }
        )
      }

      // 更新状态为processing
      const { error: updateError } = await supabase
        .from('batch_generation_tasks')
        .update({ status: 'processing' })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { error: '更新任务状态失败' },
          { status: 500 }
        )
      }

      // 触发后台处理
      processBatchTaskInBackground(id, user.id).catch(err => {
        console.error('❌ 后台处理失败:', err)
      })

      return NextResponse.json({
        success: true,
        message: '任务已开始执行'
      })
    } else if (action === 'cancel') {
      // 只有pending或processing状态的任务可以取消
      if (!['pending', 'processing'].includes(taskData.status)) {
        return NextResponse.json(
          { error: '任务无法取消' },
          { status: 400 }
        )
      }

      // 更新状态为cancelled
      const { error: updateError } = await supabase
        .from('batch_generation_tasks')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { error: '取消任务失败' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '任务已取消'
      })
    }
  } catch (error) {
    console.error('❌ API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/batch-generate
 * 删除批量任务
 *
 * Query 参数:
 * - id: 任务ID
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

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少任务ID' },
        { status: 400 }
      )
    }

    // 获取任务以便删除关联的生成图像
    const { data: taskData, error: fetchError } = await supabase
      .from('batch_generation_tasks')
      .select('generated_images')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !taskData) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    // TODO: 删除生成的图像文件（从Storage）
    // 这里可以遍历 taskData.generated_images 并删除对应的文件

    // 删除任务记录
    const { error: deleteError } = await supabase
      .from('batch_generation_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ 删除批量任务失败:', deleteError)
      return NextResponse.json(
        { error: '删除批量任务失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '批量任务已删除'
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
 * 后台处理批量生成任务
 * 注意：这是简化实现，生产环境应该使用消息队列（如Bull、BullMQ）
 */
async function processBatchTaskInBackground(taskId: string, userId: string) {
  const supabase = await createClient()

  try {
    // 获取任务详情
    const { data: taskData, error: taskError } = await supabase
      .from('batch_generation_tasks')
      .select(`
        *,
        subjects (
          subject_image_url
        )
      `)
      .eq('id', taskId)
      .single()

    if (taskError || !taskData) {
      console.error('❌ 获取任务失败:', taskError)
      return
    }

    const scenePrompts = taskData.scene_prompts as Array<{ scene_id?: string; prompt: string }>
    const generatedImages: Array<any> = []

    // 逐个生成图像
    for (let i = 0; i < scenePrompts.length; i++) {
      const scenePrompt = scenePrompts[i]

      try {
        // 构建完整提示词（将主体与场景结合）
        const fullPrompt = `将这个主体放置在以下场景中：${scenePrompt.prompt}。保持主体特征不变，仅改变背景场景。`

        // 这里应该调用实际的图像生成API
        // 简化处理：暂时不实际生成图像，只记录状态
        generatedImages.push({
          scene_prompt: scenePrompt.prompt,
          image_url: null, // TODO: 实际生成后填充
          status: 'pending', // 暂时标记为pending
          error: null
        })

        // 更新进度
        await supabase
          .from('batch_generation_tasks')
          .update({
            completed_count: i + 1,
            generated_images: generatedImages
          })
          .eq('id', taskId)

        // 模拟生成延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ 生成图像失败 (${i + 1}/${scenePrompts.length}):`, error)
        generatedImages.push({
          scene_prompt: scenePrompt.prompt,
          image_url: null,
          status: 'failed',
          error: error instanceof Error ? error.message : '生成失败'
        })

        // 更新失败计数
        await supabase
          .from('batch_generation_tasks')
          .update({
            failed_count: taskData.failed_count + 1,
            generated_images: generatedImages
          })
          .eq('id', taskId)
      }
    }

    // 任务完成，更新最终状态
    const finalStatus = generatedImages.every(img => img.status === 'success')
      ? 'completed'
      : generatedImages.some(img => img.status === 'success')
      ? 'completed' // 部分成功也算completed
      : 'failed'

    await supabase
      .from('batch_generation_tasks')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
  } catch (error) {
    console.error('❌ 批量任务处理失败:', error)

    // 标记任务为失败
    await supabase
      .from('batch_generation_tasks')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : '未知错误'
      })
      .eq('id', taskId)
  }
}
