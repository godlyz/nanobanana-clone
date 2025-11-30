/**
 * 🔥 老王的管理员审核列表API
 * 用途: 管理员查看所有待审核的推荐提交
 * GET /api/admin/showcase/submissions
 * 老王警告: 必须是管理员才能访问！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRBAC, AdminAction } from '@/lib/admin-auth'

async function handleGet(request: NextRequest) {
  try {
    console.log('📋 管理员查询推荐列表')

    const supabase = createServiceClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const perPage = Math.min(Math.max(Number.parseInt(searchParams.get('per_page') || '20', 10) || 20, 1), 100)

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase
      .from('showcase_submissions')
      .select(`
        *,
        users:user_id (
          id,
          email,
          user_metadata
        ),
        generation_history:generation_history_id (
          id,
          generated_images
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: submissions, error: queryError, count } = await query.range(from, to)

    if (queryError) {
      console.error('❌ 查询推荐列表失败:', queryError)
      return NextResponse.json({
        success: false,
        error: '查询推荐列表失败',
      }, { status: 500 })
    }

    const processedSubmissions = (submissions ?? []).map((submission) => {
      const imageUrl = submission.generation_history?.generated_images?.[submission.image_index] || ''
      const metadata = submission.users?.user_metadata || {}
      return {
        ...submission,
        image_url: imageUrl,
        creator_email: submission.users?.email || 'Unknown',
        creator_name: metadata.full_name || metadata.name || 'Anonymous',
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        submissions: processedSubmissions,
        total: count || 0,
        page,
        per_page: perPage,
      },
    })
  } catch (error) {
    console.error('❌ 查询推荐列表异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试',
    }, { status: 500 })
  }
}

export const GET = withRBAC(AdminAction.USER_READ)(handleGet)
