/**
 * 🔥 老王创建：Forum Categories API
 * 用途：论坛分类的CRUD操作
 * 路由：/api/forum/categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ForumCategory, GetCategoriesParams, ApiResponse } from '@/types/forum'

/**
 * GET /api/forum/categories
 * 获取论坛分类列表
 *
 * Query参数：
 * - include_hidden: boolean (可选，仅管理员可用)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const includeHidden = searchParams.get('include_hidden') === 'true'

    // 获取当前用户（用于权限检查）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 如果请求包含隐藏分类，需要检查管理员权限
    if (includeHidden && user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only admins can view hidden categories',
          } as ApiResponse,
          { status: 403 }
        )
      }
    }

    // 构建查询
    let query = supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    // 默认只显示可见分类
    if (!includeHidden) {
      query = query.eq('is_visible', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('❌ 获取分类列表失败:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: categories as ForumCategory[],
    } as ApiResponse<ForumCategory[]>)
  } catch (error: any) {
    console.error('❌ Categories API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch categories',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * POST /api/forum/categories
 * 创建新分类（仅管理员）
 *
 * Body参数：
 * - name: string (必填)
 * - name_en: string (可选)
 * - slug: string (必填)
 * - description: string (可选)
 * - description_en: string (可选)
 * - icon: string (可选)
 * - color: string (可选)
 * - sort_order: number (可选)
 * - is_visible: boolean (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户身份
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        } as ApiResponse,
        { status: 401 }
      )
    }

    // 验证管理员权限
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin permission required',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { name, name_en, slug, description, description_en, icon, color, sort_order, is_visible } =
      body

    // 验证必填字段
    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and slug are required',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 验证slug格式（只允许小写字母、数字、连字符）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slug must contain only lowercase letters, numbers, and hyphens',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 检查slug是否已存在
    const { data: existingCategory } = await supabase
      .from('forum_categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category with this slug already exists',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 创建分类
    const { data: category, error } = await supabase
      .from('forum_categories')
      .insert({
        name,
        name_en: name_en || null,
        slug,
        description: description || null,
        description_en: description_en || null,
        icon: icon || null,
        color: color || '#3B82F6',
        sort_order: sort_order || 0,
        is_visible: is_visible !== undefined ? is_visible : true,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 创建分类失败:', error)
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        data: category as ForumCategory,
        message: 'Category created successfully',
      } as ApiResponse<ForumCategory>,
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ Create Category API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create category',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
