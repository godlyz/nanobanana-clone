/**
 * 🔥 老王创建：管理员缓存管理API
 * 用途：手动清除论坛相关缓存
 * 路由：/api/admin/cache
 * 权限：仅限admin和moderator
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearAllCache } from '@/lib/forum-cache'
import type { ApiResponse } from '@/types/forum'

/**
 * POST /api/admin/cache
 * 清除所有论坛缓存
 *
 * 仅限管理员和审核员使用
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

    // 验证用户是否为管理员或审核员
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isModerator = profile?.role === 'moderator'

    if (!isAdmin && !isModerator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. Admin or moderator role required.',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 清除所有缓存
    const result = await clearAllCache()

    if (result.success) {
      console.log(`✅ 管理员 ${user.email} 手动清除了所有缓存`)
      return NextResponse.json({
        success: true,
        data: {
          cleared_patterns: result.message,
          timestamp: new Date().toISOString(),
          cleared_by: user.email,
        },
        message: result.message,
      } as ApiResponse)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        } as ApiResponse,
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ 清除缓存失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear cache',
      } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cache
 * 获取缓存状态信息
 *
 * 仅限管理员和审核员使用
 */
export async function GET(request: NextRequest) {
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

    // 验证用户是否为管理员或审核员
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isModerator = profile?.role === 'moderator'

    if (!isAdmin && !isModerator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. Admin or moderator role required.',
        } as ApiResponse,
        { status: 403 }
      )
    }

    // 返回缓存配置信息
    return NextResponse.json({
      success: true,
      data: {
        cache_type: process.env.UPSTASH_REDIS_REST_URL ? 'Upstash Redis' : 'InMemoryRedis',
        ttl: {
          analytics: '600s (10 minutes)',
          search: '300s (5 minutes)',
          threads: 'N/A (not yet cached)',
        },
        invalidation_strategy: 'Event-based (THREAD_CREATED, REPLY_CREATED, etc.)',
        clear_cache_endpoint: '/api/admin/cache (POST)',
      },
    } as ApiResponse)
  } catch (error: any) {
    console.error('❌ 获取缓存状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get cache status',
      } as ApiResponse,
      { status: 500 }
    )
  }
}
