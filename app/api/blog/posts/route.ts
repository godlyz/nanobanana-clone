/**
 * 🔥 老王的博客文章CRUD API
 * 用途: 创建、查询博客文章列表
 * GET /api/blog/posts - 获取文章列表（支持分页、筛选、搜索）
 * POST /api/blog/posts - 创建新文章（需要登录）
 * 老王警告: slug必须唯一，创建前检查重复！全文搜索用PostgreSQL的tsvector！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  CreateBlogPostRequest,
  CreateBlogPostResponse,
  GetBlogPostsQuery,
  GetBlogPostsResponse,
  BlogPostDetail
} from '@/types/blog'

/**
 * GET /api/blog/posts
 * 获取博客文章列表
 * 查询参数:
 * - page: 页码（默认1）
 * - per_page: 每页数量（默认12）
 * - status: draft | published | all（默认published）
 * - category_id: 分类ID筛选
 * - category_slug: 分类Slug筛选（优先于category_id）
 * - tag_id: 标签ID筛选
 * - tag_slug: 标签Slug筛选（优先于tag_id）
 * - search: 全文搜索关键词
 * - sort: created_at | published_at | view_count | like_count（默认published_at）
 * - order: asc | desc（默认desc）
 * - user_id: 按作者筛选
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 获取博客文章列表')

    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '12'), 100) // 最多100条
    const status = (searchParams.get('status') || 'published') as 'draft' | 'published' | 'all'
    const categoryId = searchParams.get('category_id')
    const categorySlug = searchParams.get('category_slug')
    const tagId = searchParams.get('tag_id')
    const tagSlug = searchParams.get('tag_slug')
    const search = searchParams.get('search')
    const sort = (searchParams.get('sort') || 'published_at') as 'created_at' | 'published_at' | 'view_count' | 'like_count'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
    const userId = searchParams.get('user_id')
    const offset = (page - 1) * perPage

    console.log('📋 查询参数:', {
      page,
      perPage,
      status,
      categoryId,
      tagId,
      search,
      sort,
      order,
      userId
    })

    // 3. 获取当前用户（用于判断是否已点赞）
    const { data: { user } } = await supabase.auth.getUser()

    // 4. 构建基础查询
    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })

    // 5. 状态筛选
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 6. 软删除筛选（不显示已删除的文章）
    query = query.is('deleted_at', null)

    // 7. 作者筛选
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // 8. 全文搜索（使用PostgreSQL的tsvector）
    if (search && search.trim()) {
      // 艹，这个SB全文搜索要用textSearch函数
      query = query.textSearch('search_vector', search.trim(), {
        type: 'websearch',
        config: 'english'
      })
    }

    // 9. 分类筛选（通过junction表，支持slug和id）
    let finalCategoryId = categoryId
    if (categorySlug && !categoryId) {
      // 优先使用slug，先查询分类ID
      const { data: category } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', categorySlug)
        .is('deleted_at', null)
        .single()

      if (category) {
        finalCategoryId = category.id
      }
    }

    if (finalCategoryId) {
      // 子查询：先从blog_post_categories找出符合分类的post_id列表
      const { data: postIds, error: categoryError } = await supabase
        .from('blog_post_categories')
        .select('post_id')
        .eq('category_id', finalCategoryId)

      if (categoryError) {
        console.error('❌ 分类筛选失败:', categoryError)
        return NextResponse.json<GetBlogPostsResponse>(
          { success: false, error: '分类筛选失败' },
          { status: 500 }
        )
      }

      const ids = postIds?.map(item => item.post_id) || []
      if (ids.length === 0) {
        // 没有符合条件的文章，直接返回空列表
        return NextResponse.json<GetBlogPostsResponse>({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            per_page: perPage
          }
        }, { status: 200 })
      }

      query = query.in('id', ids)
    }

    // 10. 标签筛选（通过junction表，支持slug和id）
    let finalTagId = tagId
    if (tagSlug && !tagId) {
      // 优先使用slug，先查询标签ID
      const { data: tag } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tagSlug)
        .is('deleted_at', null)
        .single()

      if (tag) {
        finalTagId = tag.id
      }
    }

    if (finalTagId) {
      const { data: postIds, error: tagError } = await supabase
        .from('blog_post_tags')
        .select('post_id')
        .eq('tag_id', finalTagId)

      if (tagError) {
        console.error('❌ 标签筛选失败:', tagError)
        return NextResponse.json<GetBlogPostsResponse>(
          { success: false, error: '标签筛选失败' },
          { status: 500 }
        )
      }

      const ids = postIds?.map(item => item.post_id) || []
      if (ids.length === 0) {
        return NextResponse.json<GetBlogPostsResponse>({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            per_page: perPage
          }
        }, { status: 200 })
      }

      query = query.in('id', ids)
    }

    // 11. 排序和分页
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + perPage - 1)

    // 12. 执行查询
    const { data: posts, error: queryError, count } = await query

    if (queryError) {
      console.error('❌ 查询文章列表失败:', queryError)
      return NextResponse.json<GetBlogPostsResponse>(
        { success: false, error: '查询文章列表失败' },
        { status: 500 }
      )
    }

    console.log(`✅ 查询成功，共 ${count} 条记录，当前页 ${posts?.length} 条`)

    // 13. 对每篇文章查询分类、标签、作者信息、是否已点赞
    const items: BlogPostDetail[] = await Promise.all(
      (posts || []).map(async (post) => {
        // 查询分类
        const { data: categoryData } = await supabase
          .from('blog_post_categories')
          .select('category_id, blog_categories(*)')
          .eq('post_id', post.id)

        const categories = categoryData?.map(item => item.blog_categories).filter(Boolean) || []

        // 查询标签
        const { data: tagData } = await supabase
          .from('blog_post_tags')
          .select('tag_id, blog_tags(*)')
          .eq('post_id', post.id)

        const tags = tagData?.map(item => item.blog_tags).filter(Boolean) || []

        // 查询作者信息
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

        // 查询是否已点赞（仅登录用户）
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

        return {
          ...post,
          categories,
          tags,
          author,
          is_liked: isLiked
        } as BlogPostDetail
      })
    )

    // 14. 返回数据
    return NextResponse.json<GetBlogPostsResponse>({
      success: true,
      data: {
        items,
        total: count || 0,
        page,
        per_page: perPage
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取文章列表异常:', error)
    return NextResponse.json<GetBlogPostsResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/blog/posts
 * 创建新的博客文章
 * 请求体:
 * - title: 标题（必填，3-200字符）
 * - slug: URL slug（必填，唯一，3-200字符）
 * - content: 内容（必填，至少10字符）
 * - excerpt: 摘要（可选，最多500字符）
 * - cover_image_url: 封面图URL（可选）
 * - status: draft | published（默认draft）
 * - meta_title: SEO标题（可选，最多70字符）
 * - meta_description: SEO描述（可选，最多160字符）
 * - meta_keywords: SEO关键词（可选）
 * - category_ids: 分类ID数组（可选）
 * - tag_ids: 标签ID数组（可选）
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 收到创建文章请求')

    // 1. 验证用户登录
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ 用户未登录:', authError)
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('✅ 用户已登录:', user.id)

    // 2. 解析请求体
    const body: CreateBlogPostRequest = await request.json()
    const {
      title,
      slug,
      content,
      excerpt,
      cover_image_url,
      status = 'draft',
      meta_title,
      meta_description,
      meta_keywords,
      category_ids = [],
      tag_ids = []
    } = body

    console.log('📋 文章信息:', {
      title,
      slug,
      content_length: content?.length,
      status,
      category_ids,
      tag_ids
    })

    // 3. 验证必填字段
    if (!title || !slug || !content) {
      console.error('❌ 缺少必填字段')
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '缺少必填字段：title、slug、content' },
        { status: 400 }
      )
    }

    // 4. 验证字段长度
    if (title.length < 3 || title.length > 200) {
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '标题长度必须在3-200字符之间' },
        { status: 400 }
      )
    }

    if (slug.length < 3 || slug.length > 200) {
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: 'Slug长度必须在3-200字符之间' },
        { status: 400 }
      )
    }

    if (content.length < 10) {
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '内容长度至少10字符' },
        { status: 400 }
      )
    }

    // 5. 验证status
    if (status !== 'draft' && status !== 'published') {
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: 'status必须是draft或published' },
        { status: 400 }
      )
    }

    // 6. 检查slug是否已存在
    const { data: existingPost, error: checkError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned，这是正常情况
      console.error('❌ 检查slug重复失败:', checkError)
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '检查slug失败' },
        { status: 500 }
      )
    }

    if (existingPost) {
      console.error('❌ Slug已存在:', slug)
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '该Slug已被使用，请更换' },
        { status: 409 }
      )
    }

    // 7. 创建文章
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        user_id: user.id,
        title,
        slug,
        content,
        excerpt: excerpt || null,
        cover_image_url: cover_image_url || null,
        status,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        meta_keywords: meta_keywords || null
      })
      .select('id, slug')
      .single()

    if (insertError) {
      console.error('❌ 创建文章失败:', insertError)
      return NextResponse.json<CreateBlogPostResponse>(
        { success: false, error: '创建文章失败' },
        { status: 500 }
      )
    }

    console.log('✅ 文章创建成功:', newPost.id)

    // 8. 关联分类
    if (category_ids.length > 0) {
      const categoryRelations = category_ids.map(categoryId => ({
        post_id: newPost.id,
        category_id: categoryId
      }))

      const { error: categoryError } = await supabase
        .from('blog_post_categories')
        .insert(categoryRelations)

      if (categoryError) {
        console.error('❌ 关联分类失败:', categoryError)
        // 不影响主流程，只记录警告
      } else {
        console.log('✅ 分类关联成功:', category_ids.length)
      }
    }

    // 9. 关联标签
    if (tag_ids.length > 0) {
      const tagRelations = tag_ids.map(tagId => ({
        post_id: newPost.id,
        tag_id: tagId
      }))

      const { error: tagError } = await supabase
        .from('blog_post_tags')
        .insert(tagRelations)

      if (tagError) {
        console.error('❌ 关联标签失败:', tagError)
        // 不影响主流程，只记录警告
      } else {
        console.log('✅ 标签关联成功:', tag_ids.length)
      }
    }

    // 10. 返回成功
    return NextResponse.json<CreateBlogPostResponse>({
      success: true,
      data: {
        id: newPost.id,
        slug: newPost.slug
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ 创建文章异常:', error)
    return NextResponse.json<CreateBlogPostResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. GET请求支持复杂查询：分页、筛选、搜索、排序
// 2. 全文搜索使用PostgreSQL的textSearch，性能比LIKE强多了
// 3. 分类和标签筛选通过junction表子查询实现
// 4. POST请求严格验证字段长度和slug唯一性
// 5. 分类和标签关联失败不影响文章创建（只记录警告）
// 6. 所有删除都是软删除（deleted_at字段），前端不可见
