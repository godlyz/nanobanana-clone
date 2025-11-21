/**
 * 🔥 老王的案例展示列表API
 * 用途: 获取公开展示的作品列表
 * GET /api/showcase/list
 * 老王警告: 所有人可以访问，但只返回approved的作品！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { GetShowcaseListResponse } from '@/types/showcase'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 获取案例展示列表')

    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const sort = searchParams.get('sort') || 'published_at' // published_at, likes_count
    const order = searchParams.get('order') || 'desc' // asc, desc
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '12')
    const offset = (page - 1) * perPage

    console.log('📋 查询参数:', { category, sort, order, page, perPage })

    // 3. 构建查询
    let query = supabase
      .from('showcase')
      .select('*', { count: 'exact' })
      .order(sort as 'published_at' | 'likes_count', { ascending: order === 'asc' })
      .range(offset, offset + perPage - 1)

    // 4. 如果指定了分类，添加筛选
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // 5. 执行查询
    const { data: items, error: queryError, count } = await query

    if (queryError) {
      console.error('❌ 查询案例列表失败:', queryError)
      return NextResponse.json<GetShowcaseListResponse>(
        { success: false, error: '查询案例列表失败' },
        { status: 500 }
      )
    }

    console.log(`✅ 查询成功，共 ${count} 条记录，当前页 ${items?.length} 条`)

    // 6. 返回数据
    return NextResponse.json<GetShowcaseListResponse>({
      success: true,
      data: {
        items: items || [],
        total: count || 0,
        page,
        per_page: perPage
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取案例列表异常:', error)
    return NextResponse.json<GetShowcaseListResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
