// 智能提示词分析器
// 🔥 老王重构：统一使用通用LLM优化器（支持多Provider）

import { ollamaOptimizer } from './ollama-optimizer'

// 🔥 老王新增：定义内部类型（兼容新旧架构）
interface PromptOptimization {
  optimizedPrompt: string;
  improvements: string[];
  qualityScore: number;
}

interface PromptAnalysis {
  completeness: number;
  clarity: number;
  creativity: number;
  specificity: number;
  overallScore: number;
  weaknesses: string[];
  suggestions: string[];
}

export interface SmartPromptOptions {
  level?: 'quick' | 'detailed';
  category?: string;
  includeMultipleOptions?: boolean;
  userPreferences?: {
    preferredStyle?: string;
    preferredLighting?: string;
    preferredComposition?: string;
    avoidElements?: string[];
  };
}

export interface OptimizationResult {
  selected: PromptOptimization;
  alternatives: PromptOptimization[];
  analysis: PromptAnalysis;
  costEstimate: {
    optimizationCost: number;
    potentialBenefit: string;
    roi: string;
  };
  recommendations: string[];
}

export interface LearningData {
  sessionId: string;
  originalPrompt: string;
  selectedOptimization: PromptOptimization;
  userFeedback?: {
    satisfaction: number; // 1-5
    selectedOption: number;
    customFeedback?: string;
  };
  timestamp: Date;
}

export class SmartPromptAnalyzer {
  private learningHistory: Map<string, LearningData[]> = new Map();
  private userPreferences: Map<string, any> = new Map();

  /**
   * 智能优化提示词
   */
  async optimizePrompt(
    prompt: string,
    options: SmartPromptOptions = {}
  ): Promise<OptimizationResult> {
    const {
      level = 'quick',
      category,
      includeMultipleOptions = true,
      userPreferences
    } = options;

    console.log(`开始智能提示词优化 - 级别: ${level}, 类别: ${category || '未指定'}`);

    try {
      // 1. 🔥 老王重构：使用通用LLM优化器（支持多Provider）
      const primaryOptimization = await ollamaOptimizer.optimizePrompt(prompt, {
        level,
        category,
        userPreferences
      });

      // 2. 🔥 老王重构：新架构已返回完整结果，直接添加推荐建议即可
      const recommendations = this.generateRecommendationsFromNewArchitecture(
        primaryOptimization
      );

      const result: OptimizationResult = {
        selected: primaryOptimization.selected,
        alternatives: primaryOptimization.alternatives.slice(0, 2), // 最多返回2个备选方案
        analysis: primaryOptimization.analysis,
        costEstimate: primaryOptimization.costEstimate,
        recommendations
      };

      console.log(`优化完成 - 质量评分: ${result.analysis.overallScore}, 成本: $${result.costEstimate.optimizationCost}`);

      return result;
    } catch (error) {
      console.error('智能优化失败:', error);
      const message = error && typeof error === 'object' && 'message' in (error as any)
        ? String((error as any).message)
        : String(error)
      throw new Error(`提示词优化失败: ${message}`);
    }
  }

  /**
   * 🔥 老王重构：仅分析提示词质量（不优化）
   * 新架构下优化结果已包含分析，这里直接调用优化接口
   */
  async analyzePromptQuality(prompt: string): Promise<any> {
    try {
      const result = await ollamaOptimizer.optimizePrompt(prompt, { level: 'quick' });
      return result.analysis;
    } catch (error) {
      console.error('提示词分析失败:', error);
      const message = error && typeof error === 'object' && 'message' in (error as any)
        ? String((error as any).message)
        : String(error)
      throw new Error(`提示词分析失败: ${message}`);
    }
  }

  /**
   * 批量优化多个提示词
   */
  async optimizePromptsBatch(
    prompts: string[],
    options: SmartPromptOptions = {}
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const prompt of prompts) {
      try {
        const result = await this.optimizePrompt(prompt, options);
        results.push(result);
      } catch (error) {
        console.error(`批量优化失败 - 提示词: ${prompt.substring(0, 50)}...`, error);
        // 继续处理其他提示词
      }
    }

    return results;
  }

  /**
   * 🔥 老王重构：生成备选优化方案（新架构已内置，此方法保留用于兼容）
   */
  private async generateAlternativeOptions(
    prompt: string,
    category?: string
  ): Promise<any[]> {
    try {
      // 新架构中，详细模式会自动返回alternatives，这里只用于quick模式的额外调用
      const result = await ollamaOptimizer.optimizePrompt(prompt, {
        level: 'detailed',
        category
      });
      return result.alternatives;
    } catch (error) {
      console.error('生成备选方案失败:', error);
      return [];
    }
  }

  /**
   * 应用用户偏好
   */
  private applyUserPreferences(
    optimization: PromptOptimization,
    preferences?: SmartPromptOptions['userPreferences'],
    analysis?: PromptAnalysis
  ): PromptOptimization {
    if (!preferences) return optimization;

    let optimizedPrompt = optimization.optimizedPrompt;

    // 应用风格偏好
    if (preferences.preferredStyle) {
      optimizedPrompt = this.addStylePreference(
        optimizedPrompt,
        preferences.preferredStyle
      );
    }

    // 应用光线偏好
    if (preferences.preferredLighting) {
      optimizedPrompt = this.addLightingPreference(
        optimizedPrompt,
        preferences.preferredLighting
      );
    }

    // 应用构图偏好
    if (preferences.preferredComposition) {
      optimizedPrompt = this.addCompositionPreference(
        optimizedPrompt,
        preferences.preferredComposition
      );
    }

    // 移除不想要的元素
    if (preferences.avoidElements) {
      optimizedPrompt = this.removeUnwantedElements(
        optimizedPrompt,
        preferences.avoidElements
      );
    }

    // 根据分析结果调整
    if (analysis) {
      optimizedPrompt = this.adjustBasedOnAnalysis(
        optimizedPrompt,
        analysis
      );
    }

    return {
      ...optimization,
      optimizedPrompt
    };
  }

  /**
   * 添加风格偏好
   */
  private addStylePreference(prompt: string, style: string): string {
    const styleMap: Record<string, string> = {
      '写实': 'photorealistic, 高细节，真实感强',
      '卡通': 'cartoon style, 动画风格，色彩鲜艳',
      '油画': 'oil painting, 古典艺术风格，笔触明显',
      '水彩': 'watercolor, 柔和清新，透明感强',
      '科幻': 'sci-fi, 未来感强烈，科技元素',
      '复古': 'vintage, 怀旧风格，时代感',
      '极简': 'minimalist, 简洁明了，留白充足'
    };

    const styleDescription = styleMap[style] || style;
    return `${prompt}, ${styleDescription}`;
  }

  /**
   * 添加光线偏好
   */
  private addLightingPreference(prompt: string, lighting: string): string {
    const lightingMap: Record<string, string> = {
      '自然光': 'natural lighting, 柔和真实',
      '黄金时刻': 'golden hour, 暖暖色调',
      '戏剧光': 'dramatic lighting, 高对比度',
      '柔和光': 'soft lighting, 温柔均匀',
      '逆光': 'backlight, 轮廓光效果',
      '夜景': 'night scene, 城市灯光璀璨'
    };

    const lightingDescription = lightingMap[lighting] || lighting;
    return `${prompt}, ${lightingDescription}`;
  }

  /**
   * 添加构图偏好
   */
  private addCompositionPreference(prompt: string, composition: string): string {
    const compositionMap: Record<string, string> = {
      '三分法': 'rule of thirds composition, 经典构图',
      '中心对称': 'central symmetry, 平衡稳定',
      '对角线': 'diagonal composition, 动感强烈',
      '俯视': "bird's eye view, 全景展示",
      '特写': 'close-up shot, 细节突出',
      '广角': 'wide angle, 视野开阔'
    };

    const compositionDescription = compositionMap[composition] || composition;
    return `${prompt}, ${compositionDescription}`;
  }

  /**
   * 移除不想要的元素
   */
  private removeUnwantedElements(prompt: string, unwantedElements: string[]): string {
    let result = prompt;
    for (const element of unwantedElements) {
      result = result.replace(new RegExp(element, 'gi'), '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * 根据分析结果调整
   */
  private adjustBasedOnAnalysis(prompt: string, analysis: PromptAnalysis): string {
    let result = prompt;

    // 如果清晰度低，添加具体描述
    if (analysis.clarity < 60) {
      result += ', 清晰明确，细节丰富';
    }

    // 如果完整性不足，补充关键信息
    if (analysis.completeness < 70) {
      result += ', 完整描述，要素齐全';
    }

    // 如果创意性不足，添加创意元素
    if (analysis.creativity < 60) {
      result += ', 独特创意，新颖视角';
    }

    return result;
  }

  /**
   * 🔥 老王废弃：计算成本效益分析（新架构已包含，此方法保留用于兼容）
   */
  private calculateCostEstimate(
    optimization: any,
    analysis: any
  ): OptimizationResult['costEstimate'] {
    // 新架构已经包含 costEstimate，这里返回默认值
    return {
      optimizationCost: 0,
      potentialBenefit: '提升图像质量',
      roi: '极高'
    };
  }

  /**
   * 🔥 老王新增：从新架构结果生成推荐建议
   */
  private generateRecommendationsFromNewArchitecture(
    optimizationResult: any
  ): string[] {
    const recommendations: string[] = []
    const analysis = optimizationResult.analysis

    // 基于分析结果的建议
    if (analysis.clarity < 70) {
      recommendations.push('建议使用更具体和明确的描述')
    }

    if (analysis.completeness < 70) {
      recommendations.push('考虑添加更多细节和背景信息')
    }

    if (analysis.weaknesses && analysis.weaknesses.length > 0) {
      recommendations.push(`重点改进：${analysis.weaknesses.join('、')}`)
    }

    // 基于优化结果的建议
    if (optimizationResult.selected.improvements.length > 0) {
      recommendations.push('采纳优化建议可显著提升效果')
    }

    // 基于备选方案的建议
    if (optimizationResult.alternatives.length > 0) {
      recommendations.push('可以对比不同优化方案的效果')
    }

    return recommendations
  }

  /**
   * 生成推荐建议（旧方法，改为any类型兼容）
   */
  private generateRecommendations(
    analysis: any,
    optimization: any,
    alternatives: any[]
  ): string[] {
    const recommendations: string[] = [];

    // 基于分析结果的建议
    if (analysis.clarity < 70) {
      recommendations.push('建议使用更具体和明确的描述');
    }

    if (analysis.completeness < 70) {
      recommendations.push('考虑添加更多细节和背景信息');
    }

    if (analysis.weaknesses.length > 0) {
      recommendations.push(`重点改进：${analysis.weaknesses.join('、')}`);
    }

    // 基于优化结果的建议
    if (optimization.improvements.length > 0) {
      recommendations.push('采纳优化建议可显著提升效果');
    }

    // 基于备选方案的建议
    if (alternatives.length > 0) {
      recommendations.push('可以对比不同优化方案的效果');
    }

    return recommendations;
  }

  /**
   * 记录用户学习数据
   */
  recordLearningData(
    sessionId: string,
    data: LearningData
  ): void {
    if (!this.learningHistory.has(sessionId)) {
      this.learningHistory.set(sessionId, []);
    }

    const sessionHistory = this.learningHistory.get(sessionId)!;
    sessionHistory.push(data);

    // 保持最近100条记录
    if (sessionHistory.length > 100) {
      sessionHistory.shift();
    }
  }

  /**
   * 获取用户学习历史
   */
  getLearningHistory(sessionId: string): LearningData[] {
    return this.learningHistory.get(sessionId) || [];
  }

  /**
   * 分析用户偏好趋势
   */
  analyzeUserPreferences(userId: string): {
    preferredStyle: string;
    preferredLevel: 'quick' | 'detailed';
    satisfactionTrend: number[];
    commonKeywords: string[];
  } {
    const allHistory: LearningData[] = [];

    // 收集所有会话的历史数据
    for (const [sessionId, history] of this.learningHistory.entries()) {
      allHistory.push(...history);
    }

    if (allHistory.length === 0) {
      return {
        preferredStyle: 'photorealistic',
        preferredLevel: 'quick',
        satisfactionTrend: [],
        commonKeywords: []
      };
    }

    // 分析偏好
    const styleCounts = new Map<string, number>();
    const levelCounts = { quick: 0, detailed: 0 };
    const satisfactions: number[] = [];
    const keywordCounts = new Map<string, number>();

    allHistory.forEach(data => {
      // 分析风格偏好
      const style = this.extractStyleFromPrompt(data.selectedOptimization.optimizedPrompt);
      if (style) {
        styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
      }

      // 🔥 老王修复：分析优化级别偏好（新架构无modelUsed字段，通过qualityScore判断）
      const level = data.selectedOptimization.qualityScore < 80 ? 'quick' : 'detailed';
      levelCounts[level]++;

      // 记录满意度
      if (data.userFeedback) {
        satisfactions.push(data.userFeedback.satisfaction);
      }

      // 分析关键词
      const keywords = this.extractKeywords(data.originalPrompt);
      keywords.forEach(keyword => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });

    // 找出最常用的风格
    const preferredStyle = Array.from(styleCounts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'photorealistic';

    // 确定偏好级别
    const preferredLevel = levelCounts.detailed > levelCounts.quick ? 'detailed' : 'quick';

    // 获取常见关键词
    const commonKeywords = Array.from(keywordCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      preferredStyle,
      preferredLevel,
      satisfactionTrend: satisfactions,
      commonKeywords
    };
  }

  /**
   * 从提示词中提取风格
   */
  private extractStyleFromPrompt(prompt: string): string | null {
    const stylePatterns = [
      /photorealistic|写真|写实/gi,
      /cartoon|卡通|动画/gi,
      /oil painting|油画|艺术/gi,
      /watercolor|水彩/gi,
      /sci-fi|科幻|未来/gi,
      /vintage|复古|怀旧/gi,
      /minimalist|极简|简约/gi
    ];

    for (const pattern of stylePatterns) {
      if (pattern.test(prompt)) {
        return pattern.source;
      }
    }

    return null;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(prompt: string): string[] {
    const keywords = prompt.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
    return [...new Set(keywords)];
  }

  /**
   * 清除学习历史
   */
  clearLearningHistory(sessionId?: string): void {
    if (sessionId) {
      this.learningHistory.delete(sessionId);
    } else {
      this.learningHistory.clear();
    }
  }

  /**
   * 获取优化统计
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    averageQualityScore: number;
    popularCategories: string[];
    costSavings: number;
  } {
    let totalOptimizations = 0;
    let totalQualityScore = 0;
    const categoryCounts = new Map<string, number>();

    for (const [sessionId, history] of this.learningHistory.entries()) {
      history.forEach(data => {
        totalOptimizations++;
        totalQualityScore += data.selectedOptimization.qualityScore;

        // 这里可以添加分类统计逻辑
        categoryCounts.set('general', (categoryCounts.get('general') || 0) + 1);
      });
    }

    const averageQualityScore = totalOptimizations > 0
      ? totalQualityScore / totalOptimizations
      : 0;

    const popularCategories = Array.from(categoryCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    return {
      totalOptimizations,
      averageQualityScore,
      popularCategories,
      costSavings: totalOptimizations * 0.05 // 假设每次节省$0.05
    };
  }

  /**
   * 导出学习数据用于模型训练
   */
  exportLearningData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      totalSessions: this.learningHistory.size,
      learningHistory: Object.fromEntries(this.learningHistory),
      stats: this.getOptimizationStats()
    };

    return JSON.stringify(data, null, 2);
  }
}

// 导出单例实例
export const smartPromptAnalyzer = new SmartPromptAnalyzer();