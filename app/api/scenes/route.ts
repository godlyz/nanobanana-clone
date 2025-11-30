/**
 * 场景素材库 API
 *
 * 功能:
 * - GET: 获取用户的场景库列表（支持分页、筛选、搜索）
 * - POST: 创建新的场景素材
 * - PATCH: 更新场景素材信息
 * - DELETE: 删除指定的场景素材
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateShortId } from '@/lib/id-generator'

/**
 * GET /api/scenes
 * 获取用户的场景库列表
 *
 * Query 参数:
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - category: 分类筛选 ('indoor' | 'outdoor' | 'nature' | 'urban' | 'other' | 'all')
 * - favorite: 仅显示收藏 ('true' | 'false')
 * - search: 搜索关键词（搜索名称和描述）
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
    const category = searchParams.get('category') || 'all'
    const favoriteOnly = searchParams.get('favorite') === 'true'
    const searchQuery = searchParams.get('search') || ''

    // 计算分页
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 构建查询
    let query = supabase
      .from('scenes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 分类筛选
    if (category !== 'all') {
      query = query.eq('category', category)
    }

    // 收藏筛选
    if (favoriteOnly) {
      query = query.eq('is_favorite', true)
    }

    // 搜索（名称或描述）
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }

    // 执行分页查询
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('❌ 获取场景库失败:', error)
      return NextResponse.json(
        { error: '获取场景库失败' },
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
 * POST /api/scenes
 * 创建新的场景素材
 *
 * Body:
 * {
 *   name: string,
 *   description?: string,
 *   scene_image: string, // Base64编码的场景图像（保留背景，移除主体）
 *   original_image?: string, // Base64编码的原始图像
 *   category?: 'indoor' | 'outdoor' | 'nature' | 'urban' | 'other',
 *   tags?: string[]
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
      name,
      description = '',
      scene_image,
      original_image,
      category = 'other',
      tags = []
    } = body

    // 参数验证
    if (!name || !scene_image) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }

    // 上传场景图像到 Supabase Storage
    const timestamp = Date.now()
    const randomId = generateShortId()
    const sceneFileName = `${timestamp}_${randomId}_scene.png`
    const sceneFilePath = `${user.id}/${sceneFileName}`

    // 将Base64转换为Blob
    const sceneBase64 = scene_image.replace(/^data:image\/\w+;base64,/, '')
    const sceneBuffer = Buffer.from(sceneBase64, 'base64')

    const { error: uploadSceneError } = await supabase.storage
      .from('scenes')
      .upload(sceneFilePath, sceneBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadSceneError) {
      console.error('❌ 上传场景图像失败:', uploadSceneError)
      return NextResponse.json(
        { error: '上传场景图像失败' },
        { status: 500 }
      )
    }

    // 获取场景图像公开URL
    const { data: { publicUrl: sceneUrl } } = supabase.storage
      .from('scenes')
      .getPublicUrl(sceneFilePath)

    // 处理原始图像（如果提供）
    let originalImageUrl = null
    if (original_image) {
      const originalFileName = `${timestamp}_${randomId}_original.png`
      const originalFilePath = `${user.id}/${originalFileName}`

      const originalBase64 = original_image.replace(/^data:image\/\w+;base64,/, '')
      const originalBuffer = Buffer.from(originalBase64, 'base64')

      const { error: uploadOriginalError } = await supabase.storage
        .from('scenes')
        .upload(originalFilePath, originalBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (!uploadOriginalError) {
        const { data: { publicUrl: originalUrl } } = supabase.storage
          .from('scenes')
          .getPublicUrl(originalFilePath)
        originalImageUrl = originalUrl
      }
    }

    // 插入场景记录
    const { data: sceneData, error: insertError } = await supabase
      .from('scenes')
      .insert({
        user_id: user.id,
        name,
        description,
        scene_image_url: sceneUrl,
        original_image_url: originalImageUrl,
        category,
        tags,
        is_favorite: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 插入场景记录失败:', insertError)
      return NextResponse.json(
        { error: '保存场景素材失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sceneData
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
 * PATCH /api/scenes
 * 更新场景素材信息
 *
 * Query 参数:
 * - id: 场景素材ID
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   category?: 'indoor' | 'outdoor' | 'nature' | 'urban' | 'other',
 *   tags?: string[],
 *   is_favorite?: boolean
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

    // 获取场景ID
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少场景ID' },
        { status: 400 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.is_favorite !== undefined) updateData.is_favorite = body.is_favorite

    // 执行更新
    const { data: sceneData, error: updateError } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 更新场景失败:', updateError)
      return NextResponse.json(
        { error: '更新场景素材失败' },
        { status: 500 }
      )
    }

    if (!sceneData) {
      return NextResponse.json(
        { error: '场景素材不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sceneData
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
 * DELETE /api/scenes
 * 删除指定的场景素材
 *
 * Query 参数:
 * - id: 场景素材ID
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

    // 获取场景ID
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少场景ID' },
        { status: 400 }
      )
    }

    // 先获取记录以便删除关联的图像
    const { data: sceneData, error: fetchError } = await supabase
      .from('scenes')
      .select('scene_image_url, original_image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !sceneData) {
      return NextResponse.json(
        { error: '场景素材不存在' },
        { status: 404 }
      )
    }

    // 从Storage中删除图像文件
    const filesToDelete: string[] = []

    if (sceneData.scene_image_url) {
      const urlParts = sceneData.scene_image_url.split('/')
      filesToDelete.push(urlParts.slice(-2).join('/'))
    }

    if (sceneData.original_image_url) {
      const urlParts = sceneData.original_image_url.split('/')
      filesToDelete.push(urlParts.slice(-2).join('/'))
    }

    if (filesToDelete.length > 0) {
      const { error: deleteFilesError } = await supabase.storage
        .from('scenes')
        .remove(filesToDelete)

      if (deleteFilesError) {
        console.error('⚠️ 删除图像文件失败:', deleteFilesError)
        // 继续删除数据库记录，即使文件删除失败
      }
    }

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('scenes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ 删除场景失败:', deleteError)
      return NextResponse.json(
        { error: '删除场景素材失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '场景素材已删除'
    })
  } catch (error) {
    console.error('❌ API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
