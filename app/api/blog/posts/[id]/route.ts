/**
 * 🔥 老王的单个博客文章API
 * 用途: 查询、更新、删除指定ID的文章
 * GET /api/blog/posts/[id] - 获取文章详情
 * PUT /api/blog/posts/[id] - 更新文章（需要登录且为作者）
 * DELETE /api/blog/posts/[id] - 软删除文章（需要登录且为作者）
 * 老王警告: 更新slug时必须检查重复！删除是软删除，不是真删除！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  BlogPostDetail,
  GetBlogPostResponse,
  UpdateBlogPostRequest,
  UpdateBlogPostResponse,
  DeleteBlogPostResponse
} from '@/types/blog'

/**
 * GET /api/blog/posts/[id]
 * 获取单个文章详情（包含分类、标签、作者信息、是否已点赞）
 * 老王说明: id可以是UUID或slug，优先判断是否为UUID格式
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('📖 获取文章详情:', id)

    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 获取当前用户（用于判断是否已点赞）
    const { data: { user } } = await supabase.auth.getUser()

    // 3. 判断id是UUID还是slug（UUID格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    console.log('🔍 查询方式:', isUUID ? 'UUID' : 'Slug')

    // 4. 查询文章基础信息（根据UUID或slug）
    let query = supabase
      .from('blog_posts')
      .select('*')
      .is('deleted_at', null)

    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: post, error: postError } = await query.single()

    if (postError || !post) {
      console.error('❌ 文章不存在或已删除:', postError)
      return NextResponse.json<GetBlogPostResponse>(
        { success: false, error: '文章不存在或已删除' },
        { status: 404 }
      )
    }

    // 5. 查询分类（使用post.id而非参数id，因为参数可能是slug）
    const { data: categoryData } = await supabase
      .from('blog_post_categories')
      .select('category_id, blog_categories(*)')
      .eq('post_id', post.id)

    const categories = categoryData?.map(item => item.blog_categories).filter(Boolean) || []

    // 6. 查询标签
    const { data: tagData } = await supabase
      .from('blog_post_tags')
      .select('tag_id, blog_tags(*)')
      .eq('post_id', post.id)

    const tags = tagData?.map(item => item.blog_tags).filter(Boolean) || []

    // 7. 查询作者信息
    const { data: authorData } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', post.user_id)
      .single()

    const author = authorData ? {
      id: authorData.id,
      email: authorData.email,
      name: authorData.raw_user_meta_data?.name || authorData.email,
      avatar_url: authorData.raw_user_meta_data?.avatar_url
    } : undefined

    // 8. 查询是否已点赞（仅登录用户）
    let isLiked = false
    if (user) {
      const { data: likeData } = await supabase
        .from('blog_post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single()

      isLiked = !!likeData
    }

    // 9. 增加浏览次数（不等待结果，避免阻塞响应）
    supabase
      .from('blog_posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', post.id)
      .then(({ error }) => {
        if (error) console.error('❌ 更新浏览次数失败:', error)
      })

    // 9. 组装详情数据
    const detail: BlogPostDetail = {
      ...post,
      categories,
      tags,
      author,
      is_liked: isLiked
    }

    console.log('✅ 文章详情查询成功')

    return NextResponse.json<GetBlogPostResponse>({
      success: true,
      data: detail
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取文章详情异常:', error)
    return NextResponse.json<GetBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/blog/posts/[id]
 * 更新文章（仅作者本人可更新）
 * 请求体: 同创建文章，但所有字段都是可选的
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('✏️ 收到更新文章请求:', id)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 检查文章是否存在且属于当前用户
    const { data: existingPost, error: checkError } = await supabase
      .from('blog_posts')
      .select('id, user_id, slug')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingPost) {
      console.error('❌ 文章不存在或已删除:', checkError)
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '文章不存在或已删除' },
        { status: 404 }
      )
    }

    if (existingPost.user_id !== user.id) {
      console.error('❌ 无权更新他人文章')
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '无权更新他人文章' },
        { status: 403 }
      )
    }

    // 3. 解析请求体
    const body: UpdateBlogPostRequest = await request.json()
    const {
      title,
      slug,
      content,
      excerpt,
      cover_image_url,
      status,
      meta_title,
      meta_description,
      meta_keywords,
      category_ids,
      tag_ids
    } = body

    console.log('📋 更新信息:', {
      title,
      slug,
      content_length: content?.length,
      status,
      has_category_ids: !!category_ids,
      has_tag_ids: !!tag_ids
    })

    // 4. 验证字段长度（如果提供）
    if (title !== undefined && (title.length < 3 || title.length > 200)) {
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '标题长度必须在3-200字符之间' },
        { status: 400 }
      )
    }

    if (slug !== undefined && (slug.length < 3 || slug.length > 200)) {
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: 'Slug长度必须在3-200字符之间' },
        { status: 400 }
      )
    }

    if (content !== undefined && content.length < 10) {
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '内容长度至少10字符' },
        { status: 400 }
      )
    }

    // 5. 验证status（如果提供）
    if (status !== undefined && status !== 'draft' && status !== 'published') {
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: 'status必须是draft或published' },
        { status: 400 }
      )
    }

    // 6. 如果更新slug，检查是否重复
    if (slug !== undefined && slug !== existingPost.slug) {
      const { data: duplicatePost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .neq('id', id)
        .single()

      if (duplicatePost) {
        console.error('❌ Slug已存在:', slug)
        return NextResponse.json<UpdateBlogPostResponse>(
          { success: false, error: '该Slug已被使用，请更换' },
          { status: 409 }
        )
      }
    }

    // 7. 构建更新数据（只更新提供的字段）
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (content !== undefined) updateData.content = content
    if (excerpt !== undefined) updateData.excerpt = excerpt || null
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url || null
    if (status !== undefined) updateData.status = status
    if (meta_title !== undefined) updateData.meta_title = meta_title || null
    if (meta_description !== undefined) updateData.meta_description = meta_description || null
    if (meta_keywords !== undefined) updateData.meta_keywords = meta_keywords || null

    // 8. 更新文章
    const { data: updatedPost, error: updateError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select('id, updated_at')
      .single()

    if (updateError) {
      console.error('❌ 更新文章失败:', updateError)
      return NextResponse.json<UpdateBlogPostResponse>(
        { success: false, error: '更新文章失败' },
        { status: 500 }
      )
    }

    console.log('✅ 文章更新成功')

    // 9. 更新分类关联（如果提供）
    if (category_ids !== undefined) {
      // 先删除所有旧关联
      await supabase
        .from('blog_post_categories')
        .delete()
        .eq('post_id', id)

      // 再创建新关联
      if (category_ids.length > 0) {
        const categoryRelations = category_ids.map(categoryId => ({
          post_id: id,
          category_id: categoryId
        }))

        const { error: categoryError } = await supabase
          .from('blog_post_categories')
          .insert(categoryRelations)

        if (categoryError) {
          console.error('❌ 更新分类关联失败:', categoryError)
        } else {
          console.log('✅ 分类关联更新成功')
        }
      }
    }

    // 10. 更新标签关联（如果提供）
    if (tag_ids !== undefined) {
      // 先删除所有旧关联
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id)

      // 再创建新关联
      if (tag_ids.length > 0) {
        const tagRelations = tag_ids.map(tagId => ({
          post_id: id,
          tag_id: tagId
        }))

        const { error: tagError } = await supabase
          .from('blog_post_tags')
          .insert(tagRelations)

        if (tagError) {
          console.error('❌ 更新标签关联失败:', tagError)
        } else {
          console.log('✅ 标签关联更新成功')
        }
      }
    }

    // 11. 返回成功
    return NextResponse.json<UpdateBlogPostResponse>({
      success: true,
      data: {
        id: updatedPost.id,
        updated_at: updatedPost.updated_at
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 更新文章异常:', error)
    return NextResponse.json<UpdateBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/blog/posts/[id]
 * 软删除文章（仅作者本人可删除）
 * 老王警告: 这是软删除，只���置deleted_at字段，不真正删除数据！
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🗑️ 收到删除文章请求:', id)

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<DeleteBlogPostResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 2. 检查文章是否存在且属于当前用户
    const { data: existingPost, error: checkError } = await supabase
      .from('blog_posts')
      .select('id, user_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingPost) {
      console.error('❌ 文章不存在或已删除:', checkError)
      return NextResponse.json<DeleteBlogPostResponse>(
        { success: false, error: '文章不存在或已删除' },
        { status: 404 }
      )
    }

    if (existingPost.user_id !== user.id) {
      console.error('❌ 无权删除他人文章')
      return NextResponse.json<DeleteBlogPostResponse>(
        { success: false, error: '无权删除他人文章' },
        { status: 403 }
      )
    }

    // 3. 软删除文章（设置deleted_at字段）
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('❌ 删除文章失败:', deleteError)
      return NextResponse.json<DeleteBlogPostResponse>(
        { success: false, error: '删除文章失败' },
        { status: 500 }
      )
    }

    console.log('✅ 文章删除成功（软删除）')

    return NextResponse.json<DeleteBlogPostResponse>({
      success: true
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 删除文章异常:', error)
    return NextResponse.json<DeleteBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET请求自动增加浏览次数（异步执行，不等待结果）
// 2. PUT请求只更新提供的字段，未提供的字段保持不变
// 3. 更新slug时必须检查重复（排除自己）
// 4. 分类和标签更新：先删除所有旧关联，再创建新关联
// 5. DELETE是软删除，只设置deleted_at字段，数据库记录不删除
// 6. 所有操作都检查权限：只能操作自己的文章
