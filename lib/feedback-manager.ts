// 基于用户反馈的对话管理器
// 核心理念：每次对话都基于用户满意的特定结果图片进行修改
// 集成智能提示词优化功能

import { smartPromptAnalyzer, SmartPromptOptions, OptimizationResult } from './smart-prompt-analyzer';
import { generateShortId } from './id-generator';

export interface FeedbackResult {
  id: string;
  image: string;           // 生成的图片
  text: string;            // 生成说明
  userFeedback: 'satisfied' | 'unsatisfied' | 'pending'; // 用户反馈状态
  feedbackComment?: string; // 用户反馈评论
  timestamp: Date;
  generationPrompt: string; // 生成时的提示词
  // 智能优化相关字段
  originalPrompt?: string; // 用户原始提示词
  optimizedPrompt?: string; // 智能优化后的提示词
  optimizationData?: OptimizationResult; // 完整的优化数据
  optimizationEnabled?: boolean; // 是否启用了智能优化
}

export interface ConversationSession {
  id: string;
  userId: string;
  // 关键：当前满意的基准结果
  currentReference: FeedbackResult | null;

  // 完整的反馈历史（用于回退）
  feedbackHistory: FeedbackResult[];

  // 对话意图记录（帮助理解用户想要什么）
  conversationIntent: string;

  created: Date;
  lastUpdated: Date;
}

export interface FeedbackRequest {
  prompt: string;
  userFeedback?: {
    resultId: string;
    feedbackType: 'satisfied' | 'unsatisfied';
    comment?: string;
  };
  // 智能优化选项
  enableSmartOptimization?: boolean;
  optimizationOptions?: SmartPromptOptions;
}

export class FeedbackManager {
  private sessions: Map<string, ConversationSession> = new Map();

  /**
   * 创建新的对话会话
   */
  createSession(userId: string, initialPrompt: string): string {
    const sessionId = `feedback_${userId}_${Date.now()}_${generateShortId()}`;

    const session: ConversationSession = {
      id: sessionId,
      userId,
      currentReference: null,
      feedbackHistory: [],
      conversationIntent: initialPrompt,
      created: new Date(),
      lastUpdated: new Date()
    };

    this.sessions.set(sessionId, session);
    console.log(`创建新的反馈会话: ${sessionId}, 用户: ${userId}`);

    return sessionId;
  }

  /**
   * 获取用户会话
   */
  getSession(sessionId: string): ConversationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 记录生成结果（支持智能优化）
   */
  async recordGeneration(
    sessionId: string,
    image: string,
    text: string,
    prompt: string,
    optimizationData?: OptimizationResult,
    originalPrompt?: string
  ): Promise<FeedbackResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    const result: FeedbackResult = {
      id: `result_${Date.now()}_${generateShortId()}`,
      image,
      text,
      userFeedback: 'pending',
      timestamp: new Date(),
      generationPrompt: prompt,
      originalPrompt,
      optimizedPrompt: optimizationData?.selected.optimizedPrompt,
      optimizationData,
      optimizationEnabled: !!optimizationData
    };

    // 添加到历史记录
    session.feedbackHistory.push(result);
    session.lastUpdated = new Date();

    console.log(`记录生成结果: ${result.id}, 会话: ${sessionId}`);

    return result;
  }

  /**
   * 更新用户反馈 - 这是核心功能！
   */
  updateFeedback(
    sessionId: string,
    resultId: string,
    feedbackType: 'satisfied' | 'unsatisfied',
    comment?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    const result = session.feedbackHistory.find(r => r.id === resultId);
    if (!result) {
      throw new Error(`结果不存在: ${resultId}`);
    }

    // 更新反馈状态
    result.userFeedback = feedbackType;
    result.feedbackComment = comment;
    session.lastUpdated = new Date();

    // 核心：如果是满意反馈，更新当前参考基准
    if (feedbackType === 'satisfied') {
      session.currentReference = result;
      console.log(`用户满意！设置新的参考基准: ${resultId}`);
    } else {
      console.log(`用户不满意，保持当前参考基准: ${session.currentReference?.id || 'null'}`);
    }

    // 清理旧的历史记录（保留最近20个）
    if (session.feedbackHistory.length > 20) {
      session.feedbackHistory = session.feedbackHistory.slice(-20);
    }
  }

  /**
   * 为下一轮对话准备上下文
   * 这是最重要的方法！
   */
  prepareNextConversationContext(sessionId: string, nextPrompt: string): {
    referenceImage: string | null;
    contextPrompt: string;
    hasSatisfiedReference: boolean;
    conversationHistory: any[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    const context: any[] = [];
    let referenceImage: string | null = null;
    let hasSatisfiedReference = false;

    // 核心：基于用户满意的基准结果
    if (session.currentReference) {
      referenceImage = session.currentReference.image;
      hasSatisfiedReference = true;

      // 构建基于满意结果的上下文
      context.push({
        role: "user",
        parts: [
          { text: `初始需求：${session.conversationIntent}` }
        ]
      });

      context.push({
        role: "model",
        parts: [
          { text: session.currentReference.text },
          {
            inlineData: {
              mimeType: "image/png",
              data: session.currentReference.image.split(',')[1]
            }
          }
        ]
      });

      context.push({
        role: "user",
        parts: [
          { text: `用户满意这个结果，现在要求：${nextPrompt}` }
        ]
      });

      console.log(`准备基于满意结果的上下文，基准ID: ${session.currentReference.id}`);

    } else {
      // 没有满意的结果，使用初始需求
      context.push({
        role: "user",
        parts: [
          { text: session.conversationIntent }
        ]
      });

      console.log(`没有满意结果，使用初始需求: ${session.conversationIntent}`);
    }

    return {
      referenceImage,
      contextPrompt: nextPrompt,
      hasSatisfiedReference,
      conversationHistory: context
    };
  }

  /**
   * 获取用户反馈统计
   */
  getFeedbackStats(sessionId: string): {
    totalGenerations: number;
    satisfiedCount: number;
    unsatisfiedCount: number;
    pendingCount: number;
    satisfactionRate: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalGenerations: 0,
        satisfiedCount: 0,
        unsatisfiedCount: 0,
        pendingCount: 0,
        satisfactionRate: 0
      };
    }

    const stats = {
      totalGenerations: session.feedbackHistory.length,
      satisfiedCount: session.feedbackHistory.filter(r => r.userFeedback === 'satisfied').length,
      unsatisfiedCount: session.feedbackHistory.filter(r => r.userFeedback === 'unsatisfied').length,
      pendingCount: session.feedbackHistory.filter(r => r.userFeedback === 'pending').length,
      satisfactionRate: 0
    };

    if (stats.totalGenerations > 0) {
      stats.satisfactionRate = stats.satisfiedCount / stats.totalGenerations;
    }

    return stats;
  }

  /**
   * 回退到上一个满意的结果
   */
  rollbackToLastSatisfied(sessionId: string): FeedbackResult | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    // 从历史记录中找到上一个满意的结果（排除当前）
    const satisfiedResults = session.feedbackHistory
      .filter(r => r.userFeedback === 'satisfied' && r.id !== session.currentReference?.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (satisfiedResults.length > 0) {
      const previousSatisfied = satisfiedResults[0];
      session.currentReference = previousSatisfied;
      console.log(`回退到上一个满意结果: ${previousSatisfied.id}`);
      return previousSatisfied;
    }

    console.log(`没有找到可回退的满意结果`);
    return null;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastUpdated.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        console.log(`清理过期会话: ${sessionId}`);
      }
    }
  }

  /**
   * 获取用户所有会话
   */
  getUserSessions(userId: string): ConversationSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  /**
   * 智能优化提示词
   */
  async optimizePromptIntelligently(
    prompt: string,
    options: SmartPromptOptions = {},
    sessionId?: string
  ): Promise<{
    optimizedPrompt: string;
    optimizationData: OptimizationResult;
    costEstimate: any;
  }> {
    try {
      console.log(`开始智能优化提示词: ${prompt.substring(0, 50)}...`);

      // 如果有会话ID，应用用户偏好学习
      let enhancedOptions = { ...options };
      if (sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          // 分析用户偏好
          const userPreferences = smartPromptAnalyzer.analyzeUserPreferences(session.userId);
          enhancedOptions.userPreferences = {
            ...enhancedOptions.userPreferences,
            preferredStyle: userPreferences.preferredStyle,
            // 根据用户历史满意度调整优化级别
            ...(userPreferences.satisfactionTrend.length > 0 &&
               userPreferences.satisfactionTrend.slice(-3).every(s => s >= 4)
               ? { level: 'detailed' as const }
               : { level: 'quick' as const })
          };
        }
      }

      // 执行智能优化
      const optimizationData = await smartPromptAnalyzer.optimizePrompt(prompt, enhancedOptions);

      console.log(`优化完成 - 质量评分: ${optimizationData.analysis.overallScore}, 成本: $${optimizationData.costEstimate.optimizationCost}`);

      return {
        optimizedPrompt: optimizationData.selected.optimizedPrompt,
        optimizationData,
        costEstimate: optimizationData.costEstimate
      };
    } catch (error) {
      console.error('智能优化失败:', error);
      throw new Error(`智能优化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 准备智能优化的对话上下文
   */
  async prepareOptimizedConversationContext(
    sessionId: string,
    nextPrompt: string,
    enableSmartOptimization: boolean = true,
    optimizationOptions: SmartPromptOptions = {}
  ): Promise<{
    referenceImage: string | null;
    contextPrompt: string;
    hasSatisfiedReference: boolean;
    conversationHistory: any[];
    optimizationData?: OptimizationResult;
    originalPrompt?: string;
    costEstimate?: any;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    // 智能优化提示词
    let optimizationData: OptimizationResult | undefined;
    let originalPrompt = nextPrompt;
    let contextPrompt = nextPrompt;

    if (enableSmartOptimization) {
      try {
        const optimizationResult = await this.optimizePromptIntelligently(
          nextPrompt,
          optimizationOptions,
          sessionId
        );

        optimizationData = optimizationResult.optimizationData;
        contextPrompt = optimizationResult.optimizedPrompt;

        console.log(`智能优化已应用: ${nextPrompt} -> ${contextPrompt}`);
      } catch (error) {
        console.warn('智能优化失败，使用原始提示词:', error);
        // 继续使用原始提示词
      }
    }

    // 获取基础上下文
    const baseContext = this.prepareNextConversationContext(sessionId, contextPrompt);

    return {
      ...baseContext,
      optimizationData,
      originalPrompt,
      costEstimate: optimizationData?.costEstimate
    };
  }

  /**
   * 记录用户对智能优化的反馈
   */
  recordOptimizationFeedback(
    sessionId: string,
    resultId: string,
    optimizationQuality: number, // 1-5 评分
    optimizationHelpful: boolean,
    customFeedback?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    const result = session.feedbackHistory.find(r => r.id === resultId);
    if (!result || !result.optimizationData) {
      throw new Error(`结果不存在或未启用智能优化: ${resultId}`);
    }

    // 记录学习数据
    const learningData = {
      sessionId,
      originalPrompt: result.originalPrompt || result.generationPrompt,
      selectedOptimization: result.optimizationData.selected,
      userFeedback: {
        satisfaction: optimizationQuality,
        selectedOption: 0, // 默认选择第一个优化方案
        customFeedback
      },
      timestamp: new Date()
    };

    smartPromptAnalyzer.recordLearningData(session.userId, learningData);

    console.log(`记录智能优化反馈 - 会话: ${sessionId}, 质量: ${optimizationQuality}, 有帮助: ${optimizationHelpful}`);
  }

  /**
   * 获取智能优化统计
   */
  getOptimizationStats(userId?: string): {
    totalOptimizations: number;
    averageQualityScore: number;
    popularCategories: string[];
    costSavings: number;
    userSatisfactionRate: number;
  } {
    const baseStats = smartPromptAnalyzer.getOptimizationStats();

    // 如果指定了用户，添加用户特定的统计
    if (userId) {
      const userPreferences = smartPromptAnalyzer.analyzeUserPreferences(userId);
      const userSatisfactionRate = userPreferences.satisfactionTrend.length > 0
        ? userPreferences.satisfactionTrend.reduce((a, b) => a + b, 0) / userPreferences.satisfactionTrend.length
        : 0;

      return {
        ...baseStats,
        userSatisfactionRate
      };
    }

    return {
      ...baseStats,
      userSatisfactionRate: 0
    };
  }

  /**
   * 生成会话报告
   */
  generateSessionReport(sessionId: string): {
    session: ConversationSession;
    stats: any;
    currentReference: FeedbackResult | null;
    canRollback: boolean;
    optimizationStats?: any;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const stats = this.getFeedbackStats(sessionId);

    // 检查是否可以回退
    const canRollback = session.feedbackHistory
      .filter(r => r.userFeedback === 'satisfied' && r.id !== session.currentReference?.id)
      .length > 0;

    // 添加智能优化统计
    const optimizationStats = this.getOptimizationStats(session.userId);

    return {
      session,
      stats,
      currentReference: session.currentReference,
      canRollback,
      optimizationStats
    };
  }
}

// 全局反馈管理器实例
export const globalFeedbackManager = new FeedbackManager();

// 定期清理过期数据
if (typeof window === 'undefined') {
  setInterval(() => {
    globalFeedbackManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // 1小时
}