/**
 * 🔥 老王的成就列表API
 * 用途: 获取所有成就定义
 * 老王警告: 成就定义是固定的，可以缓存！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  AchievementTier,
  AchievementConditionType,
  AchievementsListResponse
} from '@/types/achievement'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析参数
    const tier = searchParams.get('tier') as AchievementTier | null
    const conditionType = searchParams.get('condition_type') as AchievementConditionType | null
    const includeHidden = searchParams.get('include_hidden') === 'true'

    // 构建查询
    let query = supabase
      .from('achievements_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // 筛选条件
    if (tier) {
      query = query.eq('tier', tier)
    }

    if (conditionType) {
      query = query.eq('condition_type', conditionType)
    }

    if (!includeHidden) {
      query = query.eq('is_hidden', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取成就列表失败:', error)
      return NextResponse.json({
        success: false,
        error: '获取成就列表失败'
      }, { status: 500 })
    }

    const response: AchievementsListResponse = {
      success: true,
      data: data || [],
      total: data?.length || 0
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('成就API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

// 🔥 老王备注:
// 1. 返回所有启用的成就定义
// 2. 支持按等级和条件类型筛选
// 3. 默认不返回隐藏成就
// 4. 按sort_order排序
