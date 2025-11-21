// 成本管理和对话长度控制系统

export interface CostConfig {
  // 价格配置（美元）
  inputTokenCostPerMillion: number;    // 输入token成本：$0.3/100万
  outputImageCostPerImage: number;     // 输出图片成本：$0.039/张

  // 对话长度限制
  maxConversationHistory: number;      // 最大历史对话轮数
  maxTokensPerRequest: number;         // 单次请求最大token数
  maxTokensPerConversation: number;    // 单个对话最大token数

  // 成本限制
  maxCostPerUser: number;              // 单用户最大成本限制
  maxCostPerRequest: number;           // 单次请求最大成本限制
}

export interface TokenUsage {
  inputTokens: number;
  outputImages: number;
  totalCost: number;
}

export interface ConversationCostTracker {
  userId: string;
  conversationId: string;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  lastUpdated: Date;
}

// 默认配置
export const DEFAULT_COST_CONFIG: CostConfig = {
  inputTokenCostPerMillion: 0.3,        // $0.3 per 1M tokens
  outputImageCostPerImage: 0.039,       // $0.039 per image
  maxConversationHistory: 6,            // 最多保留6轮对话（用户+助手）
  maxTokensPerRequest: 100000,          // 单次请求最大100K tokens
  maxTokensPerConversation: 300000,     // 单个对话最大300K tokens
  maxCostPerUser: 10.0,                 // 单用户最大$10
  maxCostPerRequest: 2.0                 // 单次请求最大$2
};

export class CostManager {
  private config: CostConfig;
  private userCostTrackers: Map<string, ConversationCostTracker> = new Map();

  constructor(config: CostConfig = DEFAULT_COST_CONFIG) {
    this.config = config;
  }

  /**
   * 估算输入token数量
   * 文本：1 token ≈ 4个字符
   * 图片：固定258 tokens（Google Gemini估算）
   */
  estimateInputTokens(text: string, imageCount: number): number {
    const textTokens = Math.ceil(text.length / 4);
    const imageTokens = imageCount * 258;
    return textTokens + imageTokens;
  }

  /**
   * 计算单次请求成本
   */
  calculateRequestCost(inputTokens: number, outputImages: number): number {
    const inputCost = (inputTokens / 1000000) * this.config.inputTokenCostPerMillion;
    const outputCost = outputImages * this.config.outputImageCostPerImage;
    return inputCost + outputCost;
  }

  /**
   * 检查请求是否在成本限制内
   */
  validateRequest(userId: string, inputTokens: number, outputImages: number): {
    isValid: boolean;
    reason?: string;
    estimatedCost?: number;
  } {
    const estimatedCost = this.calculateRequestCost(inputTokens, outputImages);

    // 检查单次请求成本限制
    if (estimatedCost > this.config.maxCostPerRequest) {
      return {
        isValid: false,
        reason: `请求成本 $${estimatedCost.toFixed(4)} 超过单次请求限制 $${this.config.maxCostPerRequest}`,
        estimatedCost
      };
    }

    // 检查单次请求token限制
    if (inputTokens > this.config.maxTokensPerRequest) {
      return {
        isValid: false,
        reason: `输入token数 ${inputTokens} 超过单次请求限制 ${this.config.maxTokensPerRequest}`,
        estimatedCost
      };
    }

    // 检查用户总成本限制
    const userTracker = this.getUserCostTracker(userId);
    const newTotalCost = userTracker.totalCost + estimatedCost;

    if (newTotalCost > this.config.maxCostPerUser) {
      return {
        isValid: false,
        reason: `用户总成本 $${newTotalCost.toFixed(4)} 将超过限制 $${this.config.maxCostPerUser}`,
        estimatedCost
      };
    }

    return { isValid: true, estimatedCost };
  }

  /**
   * 智能截断对话历史以控制成本
   */
  truncateConversationHistory(
    history: any[],
    currentInputTokens: number,
    maxTokens: number = this.config.maxTokensPerRequest
  ): any[] {
    if (history.length <= 2) return history; // 少于2轮对话，无需截断

    let availableTokens = maxTokens - currentInputTokens;
    let truncatedHistory = [...history];

    // 从最早的对话开始删除，直到token数量在限制内
    while (truncatedHistory.length > 2 && this.estimateHistoryTokens(truncatedHistory) > availableTokens) {
      // 删除最早的一轮对话（用户+助手）
      truncatedHistory = truncatedHistory.slice(2);
      console.log(`截断对话历史，剩余轮数: ${truncatedHistory.length / 2}`);
    }

    // 确保不超过最大历史轮数限制
    const maxHistoryMessages = this.config.maxConversationHistory * 2;
    if (truncatedHistory.length > maxHistoryMessages) {
      truncatedHistory = truncatedHistory.slice(-maxHistoryMessages);
      console.log(`按轮数限制截断，保留最近 ${this.config.maxConversationHistory} 轮对话`);
    }

    return truncatedHistory;
  }

  /**
   * 估算对话历史的token数量
   */
  estimateHistoryTokens(history: any[]): number {
    let totalTokens = 0;

    for (const message of history) {
      // 文本token估算
      if (message.text) {
        totalTokens += Math.ceil(message.text.length / 4);
      }

      // 图片token估算
      if (message.image) {
        totalTokens += 258;
      }
    }

    return totalTokens;
  }

  /**
   * 记录使用量
   */
  recordUsage(userId: string, conversationId: string, usage: TokenUsage): void {
    const key = `${userId}_${conversationId}`;
    let tracker = this.userCostTrackers.get(key);

    if (!tracker) {
      tracker = {
        userId,
        conversationId,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        lastUpdated: new Date()
      };
      this.userCostTrackers.set(key, tracker);
    }

    tracker.totalTokens += usage.inputTokens;
    tracker.totalCost += usage.totalCost;
    tracker.messageCount += 1;
    tracker.lastUpdated = new Date();

    console.log(`记录使用量 - 用户: ${userId}, 对话: ${conversationId}, 成本: $${usage.totalCost.toFixed(4)}, 总成本: $${tracker.totalCost.toFixed(4)}`);
  }

  /**
   * 获取用户成本跟踪器
   */
  getUserCostTracker(userId: string, conversationId?: string): ConversationCostTracker {
    if (conversationId) {
      const key = `${userId}_${conversationId}`;
      return this.userCostTrackers.get(key) || {
        userId,
        conversationId,
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        lastUpdated: new Date()
      };
    }

    // 返回用户所有对话的总计
    const userTrackers = Array.from(this.userCostTrackers.values())
      .filter(tracker => tracker.userId === userId);

    if (userTrackers.length === 0) {
      return {
        userId,
        conversationId: '',
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        lastUpdated: new Date()
      };
    }

    return userTrackers.reduce((total, tracker) => ({
      userId,
      conversationId: 'total',
      totalTokens: total.totalTokens + tracker.totalTokens,
      totalCost: total.totalCost + tracker.totalCost,
      messageCount: total.messageCount + tracker.messageCount,
      lastUpdated: new Date(Math.max(total.lastUpdated.getTime(), tracker.lastUpdated.getTime()))
    }), {
      userId,
      conversationId: 'total',
      totalTokens: 0,
      totalCost: 0,
      messageCount: 0,
      lastUpdated: new Date()
    });
  }

  /**
   * 生成成本报告
   */
  generateCostReport(userId: string): {
    totalCost: number;
    totalTokens: number;
    totalMessages: number;
    costPerMessage: number;
    costPerToken: number;
    conversations: number;
  } {
    const userTrackers = Array.from(this.userCostTrackers.values())
      .filter(tracker => tracker.userId === userId);

    const totalCost = userTrackers.reduce((sum, tracker) => sum + tracker.totalCost, 0);
    const totalTokens = userTrackers.reduce((sum, tracker) => sum + tracker.totalTokens, 0);
    const totalMessages = userTrackers.reduce((sum, tracker) => sum + tracker.messageCount, 0);
    const conversations = userTrackers.length;

    return {
      totalCost,
      totalTokens,
      totalMessages,
      costPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0,
      costPerToken: totalTokens > 0 ? (totalCost / totalTokens) * 1000000 : 0, // 转换为每百万token的成本
      conversations
    };
  }

  /**
   * 清理过期的成本跟踪器
   */
  cleanupExpiredTrackers(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒

    for (const [key, tracker] of this.userCostTrackers.entries()) {
      if (now.getTime() - tracker.lastUpdated.getTime() > maxAge) {
        this.userCostTrackers.delete(key);
        console.log(`清理过期成本跟踪器: ${key}`);
      }
    }
  }

  /**
   * 获取配置
   */
  getConfig(): CostConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CostConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('更新成本配置:', this.config);
  }
}

// 全局成本管理器实例
export const globalCostManager = new CostManager();

// 定期清理过期数据（每小时执行一次）
if (typeof window === 'undefined') {
  // 仅在服务端执行
  setInterval(() => {
    globalCostManager.cleanupExpiredTrackers();
  }, 60 * 60 * 1000); // 1小时
}