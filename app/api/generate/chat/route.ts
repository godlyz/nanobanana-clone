import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { globalCostManager, TokenUsage } from "@/lib/cost-manager"
import { generateShortId } from "@/lib/id-generator"

// 初始化Google GenAI客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

// 简单的内存存储对话历史（生产环境应使用数据库）
// 结构：Map<userId, Map<conversationId, any[]>>
const userConversations = new Map<string, Map<string, any[]>>()

// 辅助函数：获取用户的对话Map
function getUserConversations(userId: string): Map<string, any[]> {
  if (!userConversations.has(userId)) {
    userConversations.set(userId, new Map())
  }
  return userConversations.get(userId)!
}

// 智能对话摘要生成 - 避免话题混乱
function generateConversationSummary(history: any[]): string {
  if (history.length < 4) return "" // 对话太短，无需摘要

  // 提取关键信息：主要编辑目标、风格偏好、重要修改
  const userMessages = history.filter(item => item.role === 'user')
  const assistantMessages = history.filter(item => item.role === 'assistant')

  // 分析用户的主要意图
  const userIntents = userMessages.map(msg => {
    if (!msg.text) return ""
    // 提取关键动词和主题
    const text = msg.text.toLowerCase()
    if (text.includes('变成') || text.includes('改为') || text.includes('修改')) {
      return `修改需求：${msg.text.substring(0, 30)}...`
    } else if (text.includes('添加') || text.includes('增加')) {
      return `添加需求：${msg.text.substring(0, 30)}...`
    } else if (text.includes('删除') || text.includes('移除')) {
      return `删除需求：${msg.text.substring(0, 30)}...`
    } else if (text.includes('颜色') || text.includes('风格')) {
      return `风格调整：${msg.text.substring(0, 30)}...`
    }
    return msg.text.substring(0, 40) + "..."
  }).filter(Boolean)

  // 分析编辑进展
  const editProgress = assistantMessages.slice(-3).map(msg => {
    if (!msg.text) return ""
    return msg.text.substring(0, 50) + "..."
  }).filter(Boolean)

  // 构建简洁摘要
  const summaryParts = []

  if (userIntents.length > 0) {
    summaryParts.push(`主要需求：${userIntents.slice(-2).join('；')}`)
  }

  if (editProgress.length > 0) {
    summaryParts.push(`最近进展：${editProgress.slice(-1).join('；')}`)
  }

  // 检测是否有图片（说明是图像编辑对话）
  const hasImages = history.some(item => item.image)
  if (hasImages) {
    summaryParts.push("当前为图像编辑对话")
  }

  return summaryParts.join(' | ')
}

export async function POST(req: NextRequest) {
  try {
    // 加强用户身份验证和隔离
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({
        error: "Missing authorization header",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    // 提取用户ID并进行验证
    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')

      // 验证token格式（基础验证）
      if (!token || token.length < 10) {
        return NextResponse.json({
          error: "Invalid authorization token",
          code: "INVALID_TOKEN"
        }, { status: 401 })
      }

      userId = token

      // 生成用户特定的隔离标识符
      const userNamespace = `user_${userId}`

      // 记录用户访问日志（用于调试多用户隔离）
      console.log(`[${new Date().toISOString()}] User access: ${userNamespace}`)

    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    const {
      prompt,
      conversationId,
      images = [],
      aspectRatio = "1:1",
      responseModalities = ['Image'],
      isNewConversation = false
    } = await req.json()

    console.log("=== User Info ===")
    console.log("User ID:", userId)
    console.log("Auth Header:", authHeader ? "Present" : "Missing")

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // 验证 API 密钥是否配置
    if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY.includes("your_google_ai_api_key")) {
      return NextResponse.json({ error: "Google AI API key is not configured" }, { status: 500 })
    }

    console.log("=== Chat Generation Debug Info ===")
    console.log("Conversation ID:", conversationId)
    console.log("Prompt:", prompt)
    console.log("Number of images:", images.length)
    console.log("Aspect Ratio:", aspectRatio)
    console.log("Response Modalities:", responseModalities)
    console.log("Is New Conversation:", isNewConversation)

    // 生成用户特定的对话ID，加强隔离
    let finalConversationId = conversationId
    if (!finalConversationId || isNewConversation) {
      finalConversationId = `chat_${userId}_${Date.now()}_${generateShortId()}`
    }

    // 获取用户隔离的对话Map
    const userConversationMap = getUserConversations(userId)

    // 记录对话访问日志
    console.log(`[${new Date().toISOString()}] Conversation: User=${userId}, ConvId=${finalConversationId}, New=${isNewConversation}`)

    // 获取或初始化对话历史
    let history = userConversationMap.get(finalConversationId) || []

    // 如果是新对话，清空历史
    if (isNewConversation) {
      history = []
      userConversationMap.set(finalConversationId, history)
    }

    // 获取支持图像生成的Gemini模型
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image"
    })

    // 构建内容 - 包含对话历史
    let contents: any[] = []

    // 构建历史对话 - 让Google API理解上下文，并控制成本
    if (history.length > 0) {
      console.log("Building conversation history for Google API...")
      console.log("History length:", history.length)

      // 估算当前请求的token数（文本+历史）
      const currentInputTokens = globalCostManager.estimateInputTokens(prompt, images.length)
      console.log("Current input tokens estimate:", currentInputTokens)

      // 使用成本管理器智能截断历史
      const optimizedHistory = globalCostManager.truncateConversationHistory(
        history,
        currentInputTokens
      )

      console.log("Optimized history length:", optimizedHistory.length)

      // 添加对话摘要（如果历史较长）
      if (optimizedHistory.length > 4) {
        const conversationSummary = generateConversationSummary(optimizedHistory)
        if (conversationSummary) {
          contents.push({
            role: "user",
            parts: [{ text: `对话上下文摘要：${conversationSummary}` }]
          })
        }
      }

      // 使用优化后的历史构建内容
      optimizedHistory.forEach((item, index) => {
        const contentParts: any[] = []

        if (item.text) {
          contentParts.push({ text: item.text })
        }

        // 只包含最近的图像
        if (item.image && index >= optimizedHistory.length - 2) {
          const base64Data = item.image.includes('base64,')
            ? item.image.split(',')[1]
            : item.image

          contentParts.push({
            inlineData: {
              mimeType: "image/png",
              data: base64Data
            }
          })
        }

        // 添加到contents数组
        if (contentParts.length > 0) {
          contents.push({
            role: item.role === 'assistant' ? "model" : "user",
            parts: contentParts
          })
        }
      })

      console.log("Built contents with optimized history length:", contents.length)
    }

    // 构建当前请求的内容
    const currentParts: any[] = [{ text: prompt }]

    // 添加当前图像
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]
      let imageData: string
      let mimeType: string = "image/jpeg"

      if (imageUrl.startsWith("data:")) {
        const [dataInfo, base64Data] = imageUrl.split(",")
        if (base64Data) {
          imageData = base64Data
          const mimeMatch = dataInfo.match(/data:([^;]+)/)
          if (mimeMatch) {
            mimeType = mimeMatch[1]
          }
        } else {
          imageData = imageUrl.replace(/^data:image\/[^;]+;base64,/, "")
        }
      } else {
        imageData = imageUrl
      }

      console.log(`Processing image ${i + 1}, MIME type: ${mimeType}, data length: ${imageData.length}`)

      currentParts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageData
        }
      })
    }

    // 添加当前用户消息
    contents.push({ role: "user", parts: currentParts })

    // 成本控制验证
    const totalInputTokens = globalCostManager.estimateInputTokens(prompt, images.length) +
                           globalCostManager.estimateHistoryTokens(history)

    const costValidation = globalCostManager.validateRequest(userId, totalInputTokens, 1)

    if (!costValidation.isValid) {
      console.log("Cost validation failed:", costValidation.reason)
      return NextResponse.json({
        error: costValidation.reason,
        code: "COST_LIMIT_EXCEEDED",
        estimatedCost: costValidation.estimatedCost
      }, { status: 429 })
    }

    console.log("Cost validation passed")
    console.log("Estimated cost:", costValidation.estimatedCost?.toFixed(4))
    console.log("Sending to Google Gemini 2.5 Flash Image with chat context...")
    console.log("Total input tokens:", totalInputTokens)

    // 生成内容配置 - 修复Google Gemini API格式
    const generationConfig = {
      responseMimeType: responseModalities.includes('Text') && responseModalities.includes('Image')
        ? 'application/json'
        : responseModalities.includes('Text')
          ? 'text/plain'
          : 'image/png',
      aspectRatio: aspectRatio,
    }

    // 生成内容 - 使用正确的API格式
    const response = await model.generateContent({
      contents: contents,
      generationConfig: generationConfig
    })

    console.log("=== Chat Response Debug Info ===")
    console.log("Response received successfully")

    // 处理响应
    const candidates = response.response.candidates

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No candidates returned from API"
      }, { status: 500 })
    }

    const candidate = candidates[0]
    const parts = candidate.content.parts

    if (!parts || parts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No content parts returned from API"
      }, { status: 500 })
    }

    // 查找图像数据和文本内容
    let imageData: string | null = null
    let textResponse: string = ""
    let hasBothModalities = false

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageData = part.inlineData.data
        console.log("Found image data, length:", imageData.length)
      } else if (part.text) {
        textResponse = part.text
        console.log("Found text response:", textResponse.substring(0, 100))
      }
    }

    // 判断是否是图文交织响应
    hasBothModalities = imageData && textResponse && responseModalities.includes('Text') && responseModalities.includes('Image')

    // 更新对话历史
    const currentMessage = {
      text: prompt,
      image: images.length > 0 ? images[images.length - 1] : null,
      timestamp: new Date().toISOString()
    }

    const assistantResponse = {
      text: textResponse,
      image: imageData ? `data:image/png;base64,${imageData}` : null,
      timestamp: new Date().toISOString()
    }

    history.push(currentMessage, assistantResponse)

    // 限制历史长度（保留最近的10轮对话）
    if (history.length > 20) {
      history = history.slice(-20)
      userConversationMap.set(finalConversationId, history)
    } else {
      userConversationMap.set(finalConversationId, history)
    }

    // 使用成本管理器计算使用量
    const promptTokens = globalCostManager.estimateInputTokens(prompt, images.length)
    const outputImages = imageData ? 1 : 0
    const estimatedCost = globalCostManager.calculateRequestCost(promptTokens, outputImages)

    // 记录使用量
    const usage: TokenUsage = {
      inputTokens: promptTokens,
      outputImages: outputImages,
      totalCost: estimatedCost
    }

    globalCostManager.recordUsage(userId, finalConversationId, usage)

    console.log(`Usage recorded - Tokens: ${promptTokens}, Images: ${outputImages}, Cost: $${estimatedCost.toFixed(4)}`)

    if (hasBothModalities) {
      // 返回图文交织的响应
      return NextResponse.json({
        success: true,
        type: "multimodal",
        conversationId: finalConversationId,
        image: `data:image/png;base64,${imageData}`,
        text: textResponse,
        history: history,
        usage: {
          promptTokens,
          completionTokens: imageData ? 1290 : (textResponse ? Math.ceil(textResponse.length / 4) : 0),
          totalTokens: promptTokens + (imageData ? 1290 : (textResponse ? Math.ceil(textResponse.length / 4) : 0))
        }
      })
    } else if (imageData) {
      // 返回仅图像响应
      return NextResponse.json({
        success: true,
        type: "image",
        conversationId: finalConversationId,
        result: `data:image/png;base64,${imageData}`,
        text: textResponse || "图像生成成功",
        history: history,
        usage: {
          promptTokens,
          completionTokens: 1290,
          totalTokens: promptTokens + 1290
        }
      })
    } else {
      // 返回文本响应
      return NextResponse.json({
        success: true,
        type: "text",
        conversationId: finalConversationId,
        result: textResponse || "响应生成成功",
        history: history,
        usage: {
          promptTokens,
          completionTokens: textResponse ? Math.ceil(textResponse.length / 4) : 0,
          totalTokens: promptTokens + (textResponse ? Math.ceil(textResponse.length / 4) : 0)
        }
      })
    }
  } catch (error) {
    console.error("Error in chat generation:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error ? JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack
    }) : ""

    return NextResponse.json(
      {
        error: "Failed to generate content in chat",
        details: errorMessage,
        debugInfo: errorDetails
      },
      { status: 500 },
    )
  }
}

// GET方法用于获取对话历史
export async function GET(req: NextRequest) {
  try {
    // 使用与POST相同的用户验证逻辑
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
      console.log(`[${new Date().toISOString()}] GET: User access: user_${userId}`)
    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    // 获取用户的对话Map
    const userConversationMap = getUserConversations(userId)
    const history = userConversationMap.get(conversationId) || []

    return NextResponse.json({
      success: true,
      userId,
      conversationId,
      history: history
    })
  } catch (error) {
    console.error("Error fetching conversation history:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation history" },
      { status: 500 }
    )
  }
}

// DELETE方法用于删除对话历史
export async function DELETE(req: NextRequest) {
  try {
    // 使用与POST相同的用户验证逻辑
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
      console.log(`[${new Date().toISOString()}] DELETE: User access: user_${userId}`)
    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    // 获取用户的对话Map
    const userConversationMap = getUserConversations(userId)
    userConversationMap.delete(conversationId)

    return NextResponse.json({
      success: true,
      userId,
      conversationId,
      message: "Conversation history deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting conversation history:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation history" },
      { status: 500 }
    )
  }
}