import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { globalFeedbackManager } from "@/lib/feedback-manager"
import { globalCostManager } from "@/lib/cost-manager"

// 初始化Google GenAI客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

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
      console.log(`[${new Date().toISOString()}] Feedback API User access: ${userId}`)

    } catch (error) {
      return NextResponse.json({
        error: "Authorization parsing failed",
        code: "AUTH_PARSE_ERROR"
      }, { status: 401 })
    }

    const {
      prompt,
      sessionId,
      isNewConversation = false,
      responseModalities = ['Image', 'Text'],
      userFeedback,
      rollback,
      enableSmartOptimization = false,
      optimizationOptions = {}
    } = await req.json()

    console.log("=== Feedback Generation Debug Info ===")
    console.log("User ID:", userId)
    console.log("Session ID:", sessionId)
    console.log("Prompt:", prompt)
    console.log("Is New Conversation:", isNewConversation)
    console.log("User Feedback:", userFeedback)
    console.log("Rollback Request:", rollback)
    console.log("Smart Optimization:", enableSmartOptimization)
    console.log("Optimization Options:", optimizationOptions)

    let session;
    let referenceImage: string | null = null;

    // 处理回退请求
    if (rollback && sessionId) {
      try {
        const rollbackResult = globalFeedbackManager.rollbackToLastSatisfied(sessionId);
        if (rollbackResult) {
          referenceImage = rollbackResult.image;
          console.log(`回退到满意结果: ${rollbackResult.id}`);
        }
      } catch (error) {
        console.log("回退失败:", error);
      }
    }

    // 处理用户反馈
    if (userFeedback && sessionId) {
      try {
        globalFeedbackManager.updateFeedback(
          sessionId,
          userFeedback.resultId,
          userFeedback.feedbackType,
          userFeedback.comment
        );
        console.log(`更新用户反馈: ${userFeedback.resultId} -> ${userFeedback.feedbackType}`);
      } catch (error) {
        console.log("更新反馈失败:", error);
      }
    }

    // 获取或创建会话
    if (!sessionId || isNewConversation) {
      const newSessionId = globalFeedbackManager.createSession(userId, prompt);
      session = globalFeedbackManager.getSession(newSessionId)!;
      console.log("创建新会话:", newSessionId);
    } else {
      session = globalFeedbackManager.getSession(sessionId);
      if (!session) {
        return NextResponse.json({
          error: "Session not found",
          code: "SESSION_NOT_FOUND"
        }, { status: 404 })
      }
    }

    // 核心功能：准备基于反馈的上下文（支持智能优化）
    let contextData;
    let optimizationData;
    let originalPrompt;

    if (enableSmartOptimization) {
      try {
        console.log("使用智能优化准备上下文...");
        const optimizedContext = await globalFeedbackManager.prepareOptimizedConversationContext(
          session.id,
          prompt,
          enableSmartOptimization,
          optimizationOptions
        );

        contextData = {
          referenceImage: optimizedContext.referenceImage,
          contextPrompt: optimizedContext.contextPrompt,
          hasSatisfiedReference: optimizedContext.hasSatisfiedReference,
          conversationHistory: optimizedContext.conversationHistory
        };

        optimizationData = optimizedContext.optimizationData;
        originalPrompt = optimizedContext.originalPrompt;

        console.log("智能优化成功应用");
      } catch (error) {
        console.warn("智能优化失败，使用传统方式:", error);
        // 回退到传统方式
        contextData = globalFeedbackManager.prepareNextConversationContext(
          session.id,
          prompt
        );
      }
    } else {
      // 使用传统的上下文准备方式
      contextData = globalFeedbackManager.prepareNextConversationContext(
        session.id,
        prompt
      );
    }

    console.log("=== Feedback Context Debug Info ===");
    console.log("Has Satisfied Reference:", contextData.hasSatisfiedReference);
    console.log("Reference Image Available:", !!contextData.referenceImage);
    console.log("Context History Length:", contextData.conversationHistory.length);
    if (optimizationData) {
      console.log("Optimization Applied:", optimizationData.selected.optimizedPrompt);
      console.log("Quality Score:", optimizationData.analysis.overallScore);
    }

    // 构建内容
    let contents: any[] = [...contextData.conversationHistory];

    // 如果没有满意的结果，直接使用当前提示
    if (!contextData.hasSatisfiedReference) {
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }

    // 添加当前图片（如果有）
    if (contextData.referenceImage) {
      const currentParts = contents[contents.length - 1].parts;
      currentParts.push({
        inlineData: {
          mimeType: "image/png",
          data: contextData.referenceImage.split(',')[1]
        }
      });
      contents[contents.length - 1].parts = currentParts;
    }

    // 成本验证
    const totalInputTokens = globalCostManager.estimateInputTokens(prompt, contextData.referenceImage ? 1 : 0);
    const costValidation = globalCostManager.validateRequest(userId, totalInputTokens, 1);

    if (!costValidation.isValid) {
      console.log("Cost validation failed:", costValidation.reason)
      return NextResponse.json({
        error: costValidation.reason,
        code: "COST_LIMIT_EXCEEDED",
        estimatedCost: costValidation.estimatedCost
      }, { status: 429 })
    }

    console.log("Cost validation passed, estimated cost:", costValidation.estimatedCost?.toFixed(4));

    // 获取支持图像生成的Gemini模型
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image"
    })

    // 生成内容配置
    const generationConfig = {
      responseMimeType: responseModalities.includes('Text') && responseModalities.includes('Image')
        ? 'application/json'
        : responseModalities.includes('Text')
          ? 'text/plain'
          : 'image/png',
    }

    // 生成内容
    const response = await model.generateContent({
      contents: contents,
      generationConfig: generationConfig
    });

    console.log("=== Feedback Response Debug Info ===")
    console.log("Response received successfully")

    // 处理响应
    const responseResult = response.response;
    let imageData = null;
    let textResponse = "";
    let hasBothModalities = false;

    if (responseResult.candidates && responseResult.candidates.length > 0) {
      const candidate = responseResult.candidates[0];
      const parts = candidate.content.parts;

      for (const part of parts) {
        if (part.text) {
          textResponse = part.text;
        } else if (part.inlineData) {
          imageData = part.inlineData.data;
        }
      }

      // 检查是否是图文交织响应
      hasBothModalities = imageData && textResponse && responseModalities.includes('Text') && responseModalities.includes('Image');
    }

    // 记录生成结果（包含智能优化数据）
    const result = await globalFeedbackManager.recordGeneration(
      session.id,
      imageData ? `data:image/png;base64,${imageData}` : '',
      textResponse || "生成完成",
      contextData.contextPrompt, // 使用优化后的提示词
      optimizationData,
      originalPrompt
    );

    // 计算使用量
    const promptTokens = globalCostManager.estimateInputTokens(prompt, contextData.referenceImage ? 1 : 0);
    const outputImages = imageData ? 1 : 0;
    const estimatedCost = globalCostManager.calculateRequestCost(promptTokens, outputImages);

    // 记录使用量
    globalCostManager.recordUsage(userId, session.id, {
      inputTokens: promptTokens,
      outputImages: outputImages,
      totalCost: estimatedCost
    });

    console.log(`Feedback usage recorded - Tokens: ${promptTokens}, Images: ${outputImages}, Cost: $${estimatedCost.toFixed(4)}`);

    // 获取反馈统计
    const feedbackStats = globalFeedbackManager.getFeedbackStats(session.id);

    if (hasBothModalities) {
      // 返回图文交织的响应
      return NextResponse.json({
        success: true,
        type: "multimodal",
        sessionId: session.id,
        resultId: result.id,
        image: imageData ? `data:image/png;base64,${imageData}` : null,
        text: textResponse,
        hasSatisfiedReference: contextData.hasSatisfiedReference,
        referenceImage: contextData.referenceImage,
        feedbackStats,
        // 智能优化信息
        optimizationData: optimizationData ? {
          enabled: true,
          originalPrompt: originalPrompt,
          optimizedPrompt: optimizationData.selected.optimizedPrompt,
          qualityScore: optimizationData.analysis.overallScore,
          improvements: optimizationData.selected.improvements,
          costEstimate: optimizationData.costEstimate
        } : {
          enabled: false
        },
        usage: {
          promptTokens,
          completionTokens: imageData ? 1290 : 0,
          totalTokens: promptTokens + (imageData ? 1290 : 0),
          estimatedCost,
          inputImages: contextData.referenceImage ? 1 : 0,
          outputImages: outputImages
        }
      })
    } else if (imageData) {
      // 只返回图片
      return NextResponse.json({
        success: true,
        type: "image",
        sessionId: session.id,
        resultId: result.id,
        image: imageData ? `data:image/png;base64,${imageData}` : null,
        text: textResponse || "生成完成",
        hasSatisfiedReference: contextData.hasSatisfiedReference,
        referenceImage: contextData.referenceImage,
        feedbackStats,
        // 智能优化信息
        optimizationData: optimizationData ? {
          enabled: true,
          originalPrompt: originalPrompt,
          optimizedPrompt: optimizationData.selected.optimizedPrompt,
          qualityScore: optimizationData.analysis.overallScore,
          improvements: optimizationData.selected.improvements,
          costEstimate: optimizationData.costEstimate
        } : {
          enabled: false
        },
        usage: {
          promptTokens,
          completionTokens: imageData ? 1290 : 0,
          totalTokens: promptTokens + (imageData ? 1290 : 0),
          estimatedCost,
          inputImages: contextData.referenceImage ? 1 : 0,
          outputImages: outputImages
        }
      })
    } else {
      // 只返回文本
      return NextResponse.json({
        success: true,
        type: "text",
        sessionId: session.id,
        resultId: result.id,
        image: null,
        text: textResponse || "生成完成",
        hasSatisfiedReference: contextData.hasSatisfiedReference,
        referenceImage: contextData.referenceImage,
        feedbackStats,
        // 智能优化信息
        optimizationData: optimizationData ? {
          enabled: true,
          originalPrompt: originalPrompt,
          optimizedPrompt: optimizationData.selected.optimizedPrompt,
          qualityScore: optimizationData.analysis.overallScore,
          improvements: optimizationData.selected.improvements,
          costEstimate: optimizationData.costEstimate
        } : {
          enabled: false
        },
        usage: {
          promptTokens,
          completionTokens: Math.ceil((textResponse || "").length / 4),
          totalTokens: promptTokens + Math.ceil((textResponse || "").length / 4),
          estimatedCost,
          inputImages: contextData.referenceImage ? 1 : 0,
          outputImages: 0
        }
      })
    }

  } catch (error) {
    console.error("Error in feedback generation:", error)
    return NextResponse.json({
      error: "Failed to generate content with feedback mechanism",
      code: "GENERATION_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET方法用于获取会话信息
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

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      // 返回用户所有会话
      const sessions = globalFeedbackManager.getUserSessions(userId)
      const sessionReports = sessions.map(session => {
        const report = globalFeedbackManager.generateSessionReport(session.id)
        return report
      }).filter(Boolean)

      return NextResponse.json({
        success: true,
        userId,
        sessions: sessionReports,
        totalSessions: sessionReports.length
      })
    } else {
      // 返回特定会话
      const report = globalFeedbackManager.generateSessionReport(sessionId);
      if (!report) {
        return NextResponse.json({
          error: "Session not found",
          code: "SESSION_NOT_FOUND"
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        sessionId,
        report
      })
    }

  } catch (error) {
    console.error("Error in feedback GET:", error)
    return NextResponse.json({
      error: "Failed to get session information",
      code: "GET_ERROR"
    }, { status: 500 })
  }
}

// DELETE方法用于删除会话
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        error: "Session ID is required",
        code: "MISSING_SESSION_ID"
      }, { status: 400 })
    }

    // 这里应该实现会话删除逻辑
    // 由于我们使用的是内存存储，这里只是演示
    console.log(`请求删除会话: ${sessionId}, 用户: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Session deletion not implemented for in-memory storage",
      sessionId,
      userId
    })

  } catch (error) {
    console.error("Error in feedback DELETE:", error)
    return NextResponse.json({
      error: "Failed to delete session",
      code: "DELETE_ERROR"
    }, { status: 500 })
  }
}

// PUT方法用于记录智能优化反馈
export async function PUT(req: NextRequest) {
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

    const {
      sessionId,
      resultId,
      optimizationQuality,
      optimizationHelpful,
      customFeedback
    } = await req.json()

    console.log("=== Optimization Feedback Debug Info ===")
    console.log("User ID:", userId)
    console.log("Session ID:", sessionId)
    console.log("Result ID:", resultId)
    console.log("Optimization Quality:", optimizationQuality)
    console.log("Optimization Helpful:", optimizationHelpful)

    if (!sessionId || !resultId || !optimizationQuality) {
      return NextResponse.json({
        error: "Missing required fields: sessionId, resultId, optimizationQuality",
        code: "MISSING_FIELDS"
      }, { status: 400 })
    }

    // 记录智能优化反馈
    try {
      globalFeedbackManager.recordOptimizationFeedback(
        sessionId,
        resultId,
        optimizationQuality,
        optimizationHelpful,
        customFeedback
      );

      console.log("智能优化反馈记录成功");

      // 获取更新后的优化统计
      const optimizationStats = globalFeedbackManager.getOptimizationStats(userId);

      return NextResponse.json({
        success: true,
        message: "Optimization feedback recorded successfully",
        sessionId,
        resultId,
        optimizationStats
      });

    } catch (error) {
      console.error("记录优化反馈失败:", error);
      return NextResponse.json({
        error: "Failed to record optimization feedback",
        code: "FEEDBACK_RECORD_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error in optimization feedback PUT:", error)
    return NextResponse.json({
      error: "Failed to record optimization feedback",
      code: "PUT_ERROR"
    }, { status: 500 })
  }
}