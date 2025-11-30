import { NextRequest, NextResponse } from 'next/server'
import { getSuccessRateReport } from '@/lib/video-success-rate-monitor'

// Cron 任务运行在 Node.js Runtime
export const runtime = 'nodejs'

async function authorize(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key-change-me'
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    console.error('❌ Cron密钥验证失败')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await getSuccessRateReport()
    const last24h = report.stats.last24Hours
    const healthy = last24h.successRate >= 95

    if (!healthy) {
      console.error(
        `⚠️ 视频成功率低于95%: ${last24h.successRate}% (alert=${last24h.alertLevel})`
      )
    } else {
      console.log(`✅ 视频成功率健康: ${last24h.successRate}%`)
    }

    return NextResponse.json(
      {
        success: true,
        healthy,
        alertLevel: last24h.alertLevel,
        last24h,
        failureBreakdown: report.failureBreakdown.slice(0, 5),
        recommendations: report.recommendations.slice(0, 5),
        generatedAt: new Date().toISOString(),
      },
      { status: healthy ? 200 : 202 } // 202 表示需要关注但任务已成功执行
    )
  } catch (error: any) {
    console.error('❌ 检查成功率失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// 支持POST（某些Cron服务使用POST）
export async function POST(request: NextRequest) {
  return GET(request)
}
