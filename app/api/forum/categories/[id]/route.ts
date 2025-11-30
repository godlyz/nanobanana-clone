/**
 * 🔥 老王创建：Forum Category Detail API
 * 用途：单个分类的获取、更新、删除
 * 路由：/api/forum/categories/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ForumCategory, ApiResponse } from '@/types/forum'

/**
 * GET /api/forum/categories/[id]
 * 获取单个分类详情
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: category, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Category not found',
          } as ApiResponse,
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: category as ForumCategory,
    } as ApiResponse<ForumCategory>)
  } catch (error: any) {
    console.error('❌ Get Category API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch category',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * PUT /api/forum/categories/[id]
 * 更新分类（仅管理员）
 *
 * Body参数（所有可选）：
 * - name: string
 * - name_en: string
 * - slug: string
 * - description: string
 * - description_en: string
 * - icon: string
 * - color: string
 * - sort_order: number
 * - is_visible: boolean
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 验证slug格式（如果提供）
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slug must contain only lowercase letters, numbers, and hyphens',
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 如果更新slug，检查是否已存在
    if (slug) {
      const { data: existingCategory } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
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
    }

    // 构建更新数据（只更新提供的字段）
    const updateData: Partial<ForumCategory> = {}
    if (name !== undefined) updateData.name = name
    if (name_en !== undefined) updateData.name_en = name_en
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (description_en !== undefined) updateData.description_en = description_en
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_visible !== undefined) updateData.is_visible = is_visible

    // 更新分类
    const { data: category, error } = await supabase
      .from('forum_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Category not found',
          } as ApiResponse,
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: category as ForumCategory,
      message: 'Category updated successfully',
    } as ApiResponse<ForumCategory>)
  } catch (error: any) {
    console.error('❌ Update Category API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update category',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forum/categories/[id]
 * 删除分类（仅管理员）
 *
 * 注意：
 * - 会级联删除该分类下的所有帖子（由数据库ON DELETE CASCADE处理）
 * - 建议先将帖子移动到其他分类
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 检查分类是否存在以及是否有帖子
    const { data: category } = await supabase
      .from('forum_categories')
      .select('id, thread_count')
      .eq('id', id)
      .single()

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        } as ApiResponse,
        { status: 404 }
      )
    }

    // 如果分类下有帖子，警告用户
    if (category.thread_count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category with ${category.thread_count} threads. Please move or delete threads first.`,
        } as ApiResponse,
        { status: 400 }
      )
    }

    // 删除分类
    const { error } = await supabase.from('forum_categories').delete().eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Category deleted successfully',
    } as ApiResponse)
  } catch (error: any) {
    console.error('❌ Delete Category API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete category',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
