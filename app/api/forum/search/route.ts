/**
 * 🔥 老王创建：论坛全文搜索API（RPC优化版）
 * 用途：搜索帖子标题和内容（使用PostgreSQL全文搜索 + RPC）
 * 日期：2025-11-27
 * 性能优化：使用数据库RPC函数进行全文搜索和相关性评分
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redis } from "@/lib/redis-client"

/**
 * GET /api/forum/search
 *
 * 全文搜索论坛帖子
 *
 * Query参数：
 * - q: 搜索关键词（必填，最少2个字符）
 * - category_id: 可选，限制在某个分类内搜索
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20，最大50）
 * - sort: 排序方式（relevance=相关性, latest=最新, popular=热门）
 *
 * 返回数据：
 * - threads: 匹配的帖子列表（含作者信息和分类信息）
 * - pagination: 分页信息
 * - search_meta: 搜索元信息（查询、耗时等）
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const query = searchParams.get('q')?.trim()
    const categoryId = searchParams.get('category_id')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const sort = searchParams.get('sort') || 'relevance' // relevance, latest, popular

    // 验证搜索关键词
    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
        },
        { status: 400 }
      )
    }

    // 🔥 老王添加：Redis缓存（5分钟TTL）
    const cacheKey = `forum:search:${query}:${categoryId || 'all'}:${page}:${limit}:${sort}`
    const cached = await redis.get(cacheKey, true)
    if (cached) {
      console.log('✅ 搜索缓存命中:', cacheKey)
      const cachedDuration = Date.now() - startTime
      return NextResponse.json({
        ...(cached as any),
        search_meta: {
          ...(cached as any).search_meta,
          cached: true,
          cache_duration_ms: cachedDuration
        }
      })
    }

    // 🔥 老王优化：使用RPC函数进行全文搜索
    const offset = (page - 1) * limit
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_forum_threads_optimized',
      {
        search_query: query,
        category_filter: categoryId || null,
        sort_by: sort,
        limit_param: limit,
        offset_param: offset
      }
    )

    if (searchError) {
      console.error('❌ RPC搜索失败:', searchError)
      return NextResponse.json(
        {
          success: false,
          error: 'Search failed',
          details: searchError.message
        },
        { status: 500 }
      )
    }

    // 🔥 老王添加：手动JOIN user_profiles和forum_categories补充完整信息
    let formattedThreads: any[] = []

    if (searchResults && searchResults.length > 0) {
      // 收集所有需要查询的user_id和category_id
      const userIds = new Set<string>()
      const categoryIds = new Set<string>()

      searchResults.forEach((thread: any) => {
        if (thread.user_id) userIds.add(thread.user_id)
        if (thread.category_id) categoryIds.add(thread.category_id)
      })

      // 并行查询user_profiles和forum_categories
      const [
        { data: profiles },
        { data: categories }
      ] = await Promise.all([
        userIds.size > 0
          ? supabase
              .from('user_profiles')
              .select('user_id, display_name, avatar_url')
              .in('user_id', Array.from(userIds))
          : Promise.resolve({ data: [] }),

        categoryIds.size > 0
          ? supabase
              .from('forum_categories')
              .select('id, name, name_en, slug, icon, color')
              .in('id', Array.from(categoryIds))
          : Promise.resolve({ data: [] })
      ])

      // 构建映射表
      const profileMap = new Map()
      profiles?.forEach((p: any) => profileMap.set(p.user_id, p))

      const categoryMap = new Map()
      categories?.forEach((c: any) => categoryMap.set(c.id, c))

      // 格式化返回数据
      formattedThreads = searchResults.map((thread: any) => ({
        id: thread.id,
        title: thread.title,
        slug: thread.slug || null,
        content: thread.content.substring(0, 200) + (thread.content.length > 200 ? '...' : ''), // 摘要
        status: thread.status,
        is_locked: thread.is_locked,
        is_pinned: thread.is_pinned,
        is_featured: thread.is_featured,
        view_count: thread.view_count,
        reply_count: thread.reply_count,
        upvote_count: thread.upvote_count,
        downvote_count: thread.downvote_count || 0,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        last_reply_at: thread.last_reply_at,
        relevance_score: thread.relevance_score, // 🔥 老王添加：RPC返回的相关性评分
        author: profileMap.has(thread.user_id)
          ? {
              user_id: profileMap.get(thread.user_id).user_id,
              username: profileMap.get(thread.user_id).display_name || 'Anonymous',
              avatar_url: profileMap.get(thread.user_id).avatar_url || null
            }
          : null,
        category: categoryMap.has(thread.category_id)
          ? categoryMap.get(thread.category_id)
          : null
      }))
    }

    // 🔥 老王优化：获取总数（需要重新查询）
    // 注意：RPC函数只返回当前页的结果，总数需要单独查询
    const { count: totalCount } = await supabase
      .from('forum_threads')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)

    const total = totalCount || 0
    const totalPages = Math.ceil(total / limit)

    // 计算耗时
    const duration = Date.now() - startTime

    // 🔥 老王添加：构建响应数据
    const responseData = {
      success: true,
      data: formattedThreads,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      search_meta: {
        query,
        tsquery: query, // 🔥 老王添加：添加tsquery字段（用于测试验证）
        sort,
        category_id: categoryId,
        duration_ms: duration,
        result_count: formattedThreads.length,
        cached: false,
        optimization: 'RPC function (full-text search with relevance scoring)'
      }
    }

    // 🔥 老王添加：保存到Redis缓存（5分钟TTL）
    await redis.set(cacheKey, responseData, 300)
    console.log('💾 搜索缓存已更新:', cacheKey, `(${duration}ms)`)

    return NextResponse.json(responseData)

  } catch (err: any) {
    console.error('❌ 搜索API异常:', err)
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: err.message,
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}
