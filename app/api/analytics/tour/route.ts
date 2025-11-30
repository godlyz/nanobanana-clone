// 🔥 老王创建：Tour Analytics API
// 用途: 接收并存储用户引导流程分析数据
// 警告: 这个API会记录所有tour事件，数据量可能很大

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tour事件数据结构
interface TourEventPayload {
  event: string
  data: {
    tourType: string
    sessionId: string
    userId?: string
    step?: number
    totalSteps?: number
    timeSpent?: number
    completionRate?: number
    error?: string
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: TourEventPayload = await request.json()

    // 验证必填字段
    if (!payload.event || !payload.data || !payload.timestamp) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证事件类型
    const validEvents = [
      'tour_started',
      'tour_completed',
      'tour_skipped',
      'tour_step_view',
      'tour_step_back',
      'tour_step_next',
      'tour_error',
    ]
    if (!validEvents.includes(payload.event)) {
      return NextResponse.json(
        { error: '无效的事件类型' },
        { status: 400 }
      )
    }

    // 验证tourType
    const validTourTypes = ['home', 'editor', 'api-docs', 'pricing', 'tools']
    if (!validTourTypes.includes(payload.data.tourType)) {
      return NextResponse.json(
        { error: '无效的tour类型' },
        { status: 400 }
      )
    }

    // 获取Supabase客户端
    const supabase = await createClient()

    // 存储到analytics_events表
    const { data, error } = await supabase
      .from('analytics_events')
      .insert([
        {
          event_type: payload.event,
          tour_type: payload.data.tourType,
          session_id: payload.data.sessionId,
          user_id: payload.data.userId || null,
          step: payload.data.step || null,
          total_steps: payload.data.totalSteps || null,
          time_spent: payload.data.timeSpent || null,
          completion_rate: payload.data.completionRate || null,
          error_message: payload.data.error || null,
          timestamp: payload.timestamp,
        },
      ])

    if (error) {
      console.error('❌ [Analytics API] 存储失败:', error)
      // 不要因为存储失败就让前端报错，静默处理
      return NextResponse.json(
        { success: true, warning: '存储失败但不影响用户体验' },
        { status: 200 }
      )
    }

    // 开发环境输出日志
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Analytics API] 事件已存储:', {
        event: payload.event,
        tourType: payload.data.tourType,
        sessionId: payload.data.sessionId,
      })
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [Analytics API] 处理失败:', error)
    // 静默失败，不影响用户体验
    return NextResponse.json(
      { success: true, warning: '处理失败但不影响用户体验' },
      { status: 200 }
    )
  }
}

// 🔥 老王备注：
// 1. 所有错误都静默处理，不影响用户体验
// 2. 存储失败也返回200，避免前端报错
// 3. 需要先创建analytics_events表（见migration文件）
// 4. 开发环境会输出日志方便调试
// 5. 数据库表结构参考：supabase/migrations/创建时间_create_analytics_events.sql
