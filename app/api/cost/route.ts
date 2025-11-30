import { NextRequest, NextResponse } from "next/server"
import { globalCostManager } from "@/lib/cost-manager"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        error: "Missing userId parameter",
        code: "MISSING_USER_ID"
      }, { status: 400 })
    }

    // 生成成本报告
    const costReport = globalCostManager.generateCostReport(userId)

    // 获取用户详细成本跟踪信息
    const userTracker = globalCostManager.getUserCostTracker(userId)

    return NextResponse.json({
      success: true,
      userId,
      costReport,
      userTracker,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error generating cost report:", error)
    return NextResponse.json({
      error: "Failed to generate cost report",
      code: "REPORT_ERROR"
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        error: "Missing userId parameter",
        code: "MISSING_USER_ID"
      }, { status: 400 })
    }

    // 清理特定用户的成本数据
    // 注意：由于globalCostManager是全局实例，这里只能演示
    // 在实际应用中，你可能需要实现更精细的数据清理机制

    return NextResponse.json({
      success: true,
      message: "Cost data cleanup not implemented for global instance",
      userId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error cleaning cost data:", error)
    return NextResponse.json({
      error: "Failed to clean cost data",
      code: "CLEANUP_ERROR"
    }, { status: 500 })
  }
}