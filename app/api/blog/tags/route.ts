/**
 * 🔥 老王的博客标签管理API
 * 用途: 获取、创建标签
 * GET /api/blog/tags - 获取所有标签列表
 * POST /api/blog/tags - 创建新标签（需要登录）
 * 老王警告: slug必须唯一！生产环境应该限制只有管理员能创建标签！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  CreateTagRequest,
  GetTagsResponse,
  BlogApiSuccessResponse,
  BlogApiErrorResponse
} from '@/types/blog'

/**
 * GET /api/blog/tags
 * 获取所有标签列表（按post_count降序）
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🏷️ 获取标签列表')

    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 查询所有未删除的标签
    const { data: tags, error: queryError } = await supabase
      .from('blog_tags')
      .select('*')
      .is('deleted_at', null)
      .order('post_count', { ascending: false })

    if (queryError) {
      console.error('❌ 查询标签列表失败:', queryError)
      return NextResponse.json<GetTagsResponse>(
        { success: false, error: '查询标签列表失败' },
        { status: 500 }
      )
    }

    console.log(`✅ 查询成功，共 ${tags?.length || 0} 个标签`)

    return NextResponse.json<GetTagsResponse>({
      success: true,
      data: tags || []
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取标签列表异常:', error)
    return NextResponse.json<GetTagsResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/blog/tags
 * 创建新标签
 * 请求体:
 * - name: 标签名称（必填，2-30字符，唯一）
 * - slug: URL slug（必填，2-30字符，唯一）
 *
 * 老王警告: 生产环境应该添加管理员权限检查！
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 收到创建标签请求')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // TODO: 🔥 生产环境应该检查管理员权限
    // if (!isAdmin(user)) {
    //   return NextResponse.json({ success: false, error: '无权创建标签' }, { status: 403 })
    // }

    console.log('✅ 用户已登录:', user.id)

    // 2. 解析请求体
    const body: CreateTagRequest = await request.json()
    const { name, slug } = body

    console.log('📋 标签信息:', { name, slug })

    // 3. 验证必填字段
    if (!name || !slug) {
      console.error('❌ 缺少必填字段')
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '缺少必填字段：name、slug' },
        { status: 400 }
      )
    }

    // 4. 验证字段长度
    if (name.length < 2 || name.length > 30) {
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '标签名称长度必须在2-30字符之间' },
        { status: 400 }
      )
    }

    if (slug.length < 2 || slug.length > 30) {
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: 'Slug长度必须在2-30字符之间' },
        { status: 400 }
      )
    }

    // 5. 检查name是否已存在
    const { data: existingByName } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('name', name)
      .is('deleted_at', null)
      .single()

    if (existingByName) {
      console.error('❌ 标签名称已存在:', name)
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '该标签名称已存在' },
        { status: 409 }
      )
    }

    // 6. 检查slug是否已存在
    const { data: existingBySlug } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (existingBySlug) {
      console.error('❌ Slug已存在:', slug)
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '该Slug已存在' },
        { status: 409 }
      )
    }

    // 7. 创建标签
    const { data: newTag, error: insertError } = await supabase
      .from('blog_tags')
      .insert({
        name,
        slug
      })
      .select('id, name, slug')
      .single()

    if (insertError) {
      console.error('❌ 创建标签失败:', insertError)
      return NextResponse.json<BlogApiErrorResponse>(
        { success: false, error: '创建标签失败' },
        { status: 500 }
      )
    }

    console.log('✅ 标签创建成功:', newTag.id)

    return NextResponse.json<BlogApiSuccessResponse>({
      success: true,
      data: newTag
    }, { status: 201 })

  } catch (error) {
    console.error('❌ 创建标签异常:', error)
    return NextResponse.json<BlogApiErrorResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET请求按post_count降序返回，热门标签在前
// 2. POST请求严格验证name和slug唯一性
// 3. 生产环境应该限制只有管理员能创建标签（TODO）
// 4. post_count字段由数据库trigger自动维护，不需要手动更新
// 5. 标签比分类更灵活，长度限制更短（30字符vs50字符）
