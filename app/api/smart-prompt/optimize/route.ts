import { NextRequest, NextResponse } from "next/server"
import { ollamaOptimizer } from "@/lib/ollama-optimizer"

/**
 * 🔥 老王重构：使用Ollama云端API替换globalFeedbackManager
 *
 * 改动说明：
 * - 移除globalFeedbackManager依赖
 * - 替换为ollamaOptimizer云端API调用
 * - 保持API响应格式不变（前端无需改动）
 * - 移除会话管理（Ollama无状态设计）
 */

export async function POST(req: NextRequest) {
  try {
    // 从请求头获取用户身份信息
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({
        error: "Missing authorization header",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')
      if (!token || token.length < 10) {
        return NextResponse.json({
          error: "Invalid authorization token",
          code: "INVALID_TOKEN"
        }, { status: 401 })
      }
      userId = token
      console.log(`[${new Date().toISOString()}] Smart Prompt API User access: ${userId}`)
    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    const {
      prompt,
      level = 'quick',
      category,
      enablePersonalization = false,
      userPreferences = {}
    } = await req.json()

    console.log("=== Smart Prompt Optimization Debug Info ===")
    console.log("User ID:", userId)
    console.log("Prompt:", prompt)
    console.log("Level:", level)
    console.log("Category:", category)
    console.log("Personalization:", enablePersonalization)
    console.log("User Preferences:", userPreferences)

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        code: "MISSING_PROMPT"
      }, { status: 400 })
    }

    try {
      // 🔥 老王修改：使用Ollama云端API执行智能优化
      const optimizationResult = await ollamaOptimizer.optimizePrompt(
        prompt,
        {
          level,
          category,
          userPreferences: enablePersonalization ? userPreferences : undefined
        }
      )

      console.log("Ollama智能优化完成:")
      console.log("- 质量评分:", optimizationResult.analysis.overallScore)
      console.log("- 优化成本:", optimizationResult.costEstimate.optimizationCost)
      console.log("- 改进建议数量:", optimizationResult.selected.improvements.length)

      return NextResponse.json({
        success: true,
        result: optimizationResult,
        sessionId: `ollama-${userId}-${Date.now()}` // 临时会话ID（仅用于前端显示）
      })

    } catch (optimizationError) {
      console.error("Ollama智能优化失败:", optimizationError)

      return NextResponse.json({
        error: "智能优化失败",
        code: "OPTIMIZATION_ERROR",
        details: optimizationError instanceof Error ? optimizationError.message : "Unknown error"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error in smart prompt optimization:", error)
    return NextResponse.json({
      error: "Failed to optimize prompt",
      code: "OPTIMIZATION_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * 🔥 老王简化：GET方法改为Ollama健康检查
 *
 * 功能：
 * - 检查Ollama云端API连接状态
 * - 返回当前使用的模型信息
 * - 不再提供会话统计（Ollama无状态设计）
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({
        error: "Missing authorization header",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')
      if (!token || token.length < 10) {
        return NextResponse.json({
          error: "Invalid authorization token",
          code: "INVALID_TOKEN"
        }, { status: 401 })
      }
      userId = token
    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    // 🔥 老王修改：执行LLM健康检查（支持多种provider）
    console.log(`[${new Date().toISOString()}] LLM Health Check by user: ${userId}`)
    const healthStatus = await ollamaOptimizer.healthCheck()

    return NextResponse.json({
      success: true,
      llm: {
        provider: healthStatus.provider || 'ollama',
        status: healthStatus.healthy ? 'connected' : 'disconnected',
        message: healthStatus.message,
        quickModel: healthStatus.quickModel || 'gpt-0ss:120b-cloud',
        detailedModel: healthStatus.detailedModel || 'deepseek-r1:671b'
      }
    })

  } catch (error) {
    console.error("Error in smart prompt GET:", error)
    return NextResponse.json({
      error: "Failed to get Ollama status",
      code: "GET_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}