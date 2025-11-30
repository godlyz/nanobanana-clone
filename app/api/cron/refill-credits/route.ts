/**
 * 🔥 老王自动充值API：年付订阅月度积分自动充值
 *
 * 触发方式：
 * 1. Vercel Cron（每天凌晨2点）
 * 2. 手动调用（需要密钥验证）
 *
 * 逻辑：
 * - 查找 next_refill_date <= NOW() 且 remaining_refills > 0 的订阅
 * - 自动充值当月积分（30天有效）
 * - remaining_refills -= 1
 * - next_refill_date = 新积分过期时间
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// 🔥 使用 Node.js Runtime（Cron 任务不需要 Edge Runtime）
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // 1. 验证Cron密钥（防止未授权调用）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-change-me'

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Cron密钥验证失败')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 创建Service Client（需要绕过RLS）
    const supabase = createServiceClient()

    // 3. 调用数据库函数执行自动充值
    const { data, error } = await supabase.rpc('check_and_refill_expired_subscriptions')

    if (error) {
      console.error('❌ 自动充值失败:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 })
    }

    // 4. 返回充值结果
    const refilledCount = data?.length || 0

    console.log(`✅ 自动充值完成: ${refilledCount} 个订阅`)

    return NextResponse.json({
      success: true,
      refilled_count: refilledCount,
      refilled_subscriptions: data || [],
      executed_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ Cron执行异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// 支持POST方法（某些Cron服务可能用POST）
export async function POST(request: NextRequest) {
  return GET(request)
}
