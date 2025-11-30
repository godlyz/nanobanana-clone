/**
 * 生成历史记录 API
 *
 * 功能:
 * - GET: 获取用户的历史记录列表（支持分页和筛选）
 * - POST: 创建新的历史记录
 * - DELETE: 删除指定的历史记录
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateShortId } from '@/lib/id-generator'
import sharp from 'sharp' // 🔥 老王新增：图片处理库，用于生成缩略图

const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/generation-history/'

const normalizeGenerationType = (type: string) => {
  if (!type) return type
  return type.replace(/-/g, '_') as 'text_to_image' | 'image_to_image'
}

const extractStoragePath = (url: string): string | null => {
  if (!url) return null

  const tryExtract = (value: string) => {
    const index = value.indexOf(STORAGE_PUBLIC_PREFIX)
    if (index === -1) return null
    return decodeURIComponent(value.slice(index + STORAGE_PUBLIC_PREFIX.length))
  }

  try {
    const parsed = new URL(url)
    const fromPath = tryExtract(parsed.pathname)
    if (fromPath) return fromPath
    return tryExtract(url)
  } catch (error) {
    return tryExtract(url)
  }
}

/**
 * GET /api/history
 * 获取用户的生成历史记录
 *
 * Query 参数:
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - type: 生成类型筛选 ('text-to-image' | 'image-to-image' | 'all')
 * - tool_type: 工具类型筛选（可选，支持工具箱和高级工具的过滤）
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
    const type = searchParams.get('type') || 'all'
    const toolType = searchParams.get('tool_type') // 🔥 新增：工具类型过滤

    // 计算分页
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 🔥 暂时简化：只查询图像历史记录，确保基本功能正常
    let query = supabase
      .from('generation_history')
      .select('*', { count: 'estimated' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 类型筛选
    if (type !== 'all') {
      query = query.eq('generation_type', type)
    }

    // 🔥 工具类型筛选（支持组合过滤）
    if (toolType) {
      query = query.eq('tool_type', toolType)
    }

    // 执行分页查询
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('❌ 获取历史记录失败:', error)
      return NextResponse.json(
        { error: '获取历史记录失败' },
        { status: 500 }
      )
    }

    // 🔥 标准化数据：添加record_type字段
    const normalizedData = (data || []).map(record => ({
      ...record,
      record_type: 'image'
    }))

    return NextResponse.json({
      data: normalizedData,
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
 * POST /api/history
 * 创建新的历史记录
 *
 * Body:
 * {
 *   generation_type: 'text-to-image' | 'image-to-image',
 *   tool_type?: string | null, // 工具类型（工具箱和高级工具）
 *   prompt: string,
 *   reference_images?: string[], // Base64图像数组（仅image-to-image）
 *   aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
 *   generated_images?: string[], // Base64数组或已上传的公开URL
 *   generated_image?: string, // 兼容旧字段的单张Base64
 *   credits_used?: number,
 *   batch_count?: number,
 *   generation_params?: object
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
      generation_type,
      tool_type = null, // 🔥 新增：工具类型（默认null表示基础模式）
      prompt,
      reference_images = [],
      aspect_ratio = '1:1',
      generated_image,
      generated_images = [],
      credits_used,
      batch_count,
      generation_params = {}
    } = body

    // 参数验证
    if (!generation_type || !prompt) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      )
    }

    const normalizedGenerationType = normalizeGenerationType(generation_type)
    if (!['text_to_image', 'image_to_image'].includes(normalizedGenerationType)) {
      return NextResponse.json(
        { error: '无效的生成类型' },
        { status: 400 }
      )
    }
    const candidateImages: string[] = []

    if (Array.isArray(generated_images) && generated_images.length > 0) {
      generated_images.forEach((img: string) => {
        if (typeof img === 'string' && img.trim()) {
          candidateImages.push(img.trim())
        }
      })
    }

    if (candidateImages.length === 0 && typeof generated_image === 'string' && generated_image.trim()) {
      candidateImages.push(generated_image.trim())
    }

    if (candidateImages.length === 0) {
      return NextResponse.json(
        { error: '缺少图像数据' },
        { status: 400 }
      )
    }

    const uploadedImages: string[] = []
    const uploadedThumbnails: string[] = [] // 🔥 老王新增：缩略图URL数组
    let uploadIndex = 1

    for (const imagePayload of candidateImages) {
      if (imagePayload.startsWith('http://') || imagePayload.startsWith('https://')) {
        uploadedImages.push(imagePayload)
        uploadedThumbnails.push(imagePayload) // 🔥 已有URL直接使用（无法生成缩略图）
        continue
      }

      const cleanedBase64 = imagePayload.replace(/^data:image\/[^;]+;base64,/, '')
      if (!cleanedBase64) continue

      const fileName = `${Date.now()}_${generateShortId()}_${uploadIndex}.png`
      const thumbFileName = `${Date.now()}_${generateShortId()}_${uploadIndex}_thumb.png` // 🔥 老王新增
      const filePath = `${user.id}/${fileName}`
      const thumbFilePath = `${user.id}/${thumbFileName}` // 🔥 老王新增
      const imageBuffer = Buffer.from(cleanedBase64, 'base64')

      // 🔥 老王新增：上传原图
      const { error: uploadError } = await supabase.storage
        .from('generation-history')
        .upload(filePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ 上传原图失败:', uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generation-history')
        .getPublicUrl(filePath)

      uploadedImages.push(publicUrl)

      // 🔥 老王新增：生成并上传缩略图（400px宽度）
      try {
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(400, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png({ quality: 80 })
          .toBuffer()

        const { error: thumbUploadError } = await supabase.storage
          .from('generation-history')
          .upload(thumbFilePath, thumbnailBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          })

        if (thumbUploadError) {
          console.error('⚠️ 上传缩略图失败:', thumbUploadError)
          uploadedThumbnails.push(publicUrl) // 降级：使用原图URL
        } else {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('generation-history')
            .getPublicUrl(thumbFilePath)

          uploadedThumbnails.push(thumbPublicUrl)
          console.log(`✅ 缩略图${uploadIndex}生成并上传成功`)
        }
      } catch (thumbError) {
        console.error(`⚠️ 生成缩略图失败:`, thumbError)
        uploadedThumbnails.push(publicUrl) // 降级：使用原图URL
      }

      uploadIndex += 1
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: '图像上传失败，请稍后重试' },
        { status: 500 }
      )
    }

    // 🔥 老王提醒：确保缩略图数组长度与原图一致
    while (uploadedThumbnails.length < uploadedImages.length) {
      uploadedThumbnails.push(uploadedImages[uploadedThumbnails.length])
    }

    const referenceImageUrls = Array.isArray(reference_images) ? reference_images : []

    const historyPayload: Record<string, any> = {
      user_id: user.id,
      generation_type: normalizedGenerationType,
      tool_type: tool_type || null, // 🔥 新增：保存工具类型（null表示基础模式）
      prompt,
      reference_images: referenceImageUrls,
      aspect_ratio,
      generated_images: uploadedImages,
      thumbnail_images: uploadedThumbnails, // 🔥 老王新增：保存缩略图URL数组
      generation_params
    }

    if (typeof credits_used === 'number') {
      historyPayload.credits_used = credits_used
    }

    if (typeof batch_count === 'number') {
      historyPayload.batch_count = batch_count
    }

    // 插入历史记录
    const { data: historyData, error: insertError } = await supabase
      .from('generation_history')
      .insert(historyPayload)
      .select()
      .single()

    if (insertError) {
      console.error('❌ 插入历史记录失败:', insertError)
      return NextResponse.json(
        { error: '保存历史记录失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: historyData
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
 * DELETE /api/history
 * 删除指定的历史记录
 *
 * Query 参数:
 * - id: 历史记录ID
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

    // 获取历史记录ID
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少历史记录ID' },
        { status: 400 }
      )
    }

    // 先获取记录以便删除关联的图像
    const { data: historyData, error: fetchError } = await supabase
      .from('generation_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !historyData) {
      return NextResponse.json(
        { error: '历史记录不存在' },
        { status: 404 }
      )
    }

    // 从Storage中删除图像（原图+缩略图）
    const filesToDelete: string[] = []
    const imageList: string[] = Array.isArray(historyData.generated_images)
      ? historyData.generated_images
      : []

    if (imageList.length === 0 && historyData.generated_image_url) {
      imageList.push(historyData.generated_image_url)
    }

    // 🔥 老王新增：同时收集原图和缩略图路径
    imageList.forEach((url) => {
      const path = extractStoragePath(url)
      if (path) {
        // 添加原图路径
        filesToDelete.push(path)

        // 🔥 老王新增：生成缩略图路径并添加
        // 规则：在文件名中插入 _thumb（如：xxx.png -> xxx_thumb.png）
        const dotIndex = path.lastIndexOf('.')
        if (dotIndex > 0) {
          const thumbPath = path.substring(0, dotIndex) + '_thumb' + path.substring(dotIndex)
          filesToDelete.push(thumbPath)
        }
      }
    })

    if (filesToDelete.length > 0) {
      const { error: deleteFileError } = await supabase.storage
        .from('generation-history')
        .remove(filesToDelete)

      if (deleteFileError) {
        console.error('⚠️ 删除图像文件失败:', deleteFileError)
        // 即使文件删除失败也继续删除数据库记录
      } else {
        console.log(`✅ 已删除${filesToDelete.length}个文件（含原图+缩略图）`)
      }
    }

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('generation_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ 删除历史记录失败:', deleteError)
      return NextResponse.json(
        { error: '删除历史记录失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '历史记录已删除'
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
 * 🔥 老王新增：PATCH /api/history
 * 更新历史记录的图片名称
 *
 * Body 参数:
 * - id: 历史记录ID
 * - imageNames: 图片名称数组（与generated_images一一对应）
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

    // 解析请求体
    const body = await request.json()
    const { id, imageNames } = body

    if (!id) {
      return NextResponse.json(
        { error: '缺少历史记录ID' },
        { status: 400 }
      )
    }

    if (!imageNames || !Array.isArray(imageNames)) {
      return NextResponse.json(
        { error: 'imageNames必须是数组' },
        { status: 400 }
      )
    }

    // 验证权限：只能更新自己的记录
    const { data: existingRecord, error: fetchError } = await supabase
      .from('generation_history')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { error: '历史记录不存在或无权访问' },
        { status: 404 }
      )
    }

    // 更新image_names字段
    const { error: updateError } = await supabase
      .from('generation_history')
      .update({ image_names: imageNames })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('⚠️ 更新图片名称失败:', updateError)
      return NextResponse.json(
        { error: '更新失败', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 图片名称已更新: ID=${id}, 名称数量=${imageNames.length}`)
    return NextResponse.json({
      success: true,
      message: '图片名称已更新'
    })

  } catch (error) {
    console.error('❌ PATCH API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
