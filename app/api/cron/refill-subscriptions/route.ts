/**
 * 定时任务: 月付订阅自动充值
 * 老王备注: 每天执行一次,检查需要充值的月付订阅
 *
 * Vercel Cron配置 (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/refill-subscriptions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // 验证Cron Secret (生产环境安全措施)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 调用数据库函数处理月付订阅充值
    const { error } = await supabase.rpc('process_monthly_subscription_refills')

    if (error) {
      console.error('定时任务执行失败:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('定时任务执行成功: 月付订阅充值完成')

    return NextResponse.json({
      success: true,
      message: '月付订阅充值完成',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('定时任务��常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
