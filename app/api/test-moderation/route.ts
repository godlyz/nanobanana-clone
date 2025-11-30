// 🔥 老王创建：NSFW 内容扫描测试 API
// 用途: 测试 Google Cloud Vision API 集成是否正常
// 警告: 仅用于开发环境测试，生产环境应删除或保护此路由

import { NextRequest, NextResponse } from 'next/server'
import { getModerationService } from '@/lib/moderation-service'

export async function GET(request: NextRequest) {
  // 仅开发环境可用
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '此测试 API 仅在开发环境可用' },
      { status: 403 }
    )
  }

  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      {
        error: '缺少参数',
        usage: 'GET /api/test-moderation?url=https://example.com/image.jpg',
        example: 'http://localhost:3000/api/test-moderation?url=https://via.placeholder.com/400',
      },
      { status: 400 }
    )
  }

  try {
    const service = getModerationService()

    // 扫描内容
    const scanResult = await service.scanContent(url, 'image')

    // 获取决策
    const decision = service.makeDecision(scanResult)

    return NextResponse.json({
      success: true,
      url,
      apiConfigured: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      scanResult,
      decision,
      explanation: {
        scoring: {
          adult: `${scanResult.adultScore.toFixed(2)} (权重 1.5x)`,
          violence: `${scanResult.violenceScore.toFixed(2)} (权重 1.2x)`,
          racy: `${scanResult.racyScore.toFixed(2)} (权重 1.0x)`,
          medical: `${scanResult.medicalScore.toFixed(2)} (权重 0.3x)`,
          spoof: `${scanResult.spoofScore.toFixed(2)} (权重 0.5x)`,
        },
        overall: `${scanResult.overallRiskScore.toFixed(2)} / 100`,
        threshold: {
          safe: '0-30 (自动通过)',
          review: '30-70 (人工审核)',
          reject: '70-100 (自动拒绝)',
        },
        result: decision.decision,
      },
    })
  } catch (error: any) {
    console.error('❌ [Test Moderation] 测试失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '测试失败',
        details: error.stack,
        hint: '请检查 GOOGLE_CLOUD_VISION_API_KEY 环境变量是否配置正确',
      },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. 此 API 仅用于开发环境测试
// 2. 支持通过 URL 参数测试任意图片
// 3. 返回详细的扫描结果和决策理由
// 4. 生产环境会自动禁用
// 5. 测试示例：
//    - http://localhost:3000/api/test-moderation?url=https://via.placeholder.com/400
//    - http://localhost:3000/api/test-moderation?url=https://picsum.photos/400
