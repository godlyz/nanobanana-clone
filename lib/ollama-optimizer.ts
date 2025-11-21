/**
 * 🔥 老王重构：通用LLM提示词优化器
 *
 * 功能：
 * - 支持多种LLM提供商（Ollama、OpenAI、Anthropic等）
 * - 支持快速/详细两种优化模式
 * - 分析提示词质量（完整性、清晰度、创意性、具体性）
 * - 生成结构化优化建议和多个备选方案
 * - 内置降级处理，确保系统可用性
 * - 🔥 老王重构：配置优先级：数据库 > 环境变量
 */

import { Ollama } from 'ollama'
import * as fs from 'fs'
import * as path from 'path'
import { llmConfigLoader, getFallbackPromptOptimizationConfig } from './llm-config-loader' // 🔥 老王新增：从数据库加载配置

// 🔥 老王添加：LLM配置接口
interface LLMConfig {
  provider: 'ollama' | 'openai' | 'anthropic' | 'GLM' | 'custom'
  apiUrl: string
  apiKey?: string
  models: {
    quick: string
    detailed: string
  }
  timeout?: number
  headers?: Record<string, string>
}

interface OptimizationOptions {
  level: 'quick' | 'detailed'
  category?: string
  userPreferences?: {
    preferredStyle?: string
    preferredLighting?: string
    preferredComposition?: string
    translateToEnglish?: boolean  // 🔥 老王添加：是否翻译成英文
  }
}

interface OptimizationResult {
  selected: {
    optimizedPrompt: string
    improvements: string[]
    qualityScore: number
  }
  analysis: {
    completeness: number
    clarity: number
    creativity: number
    specificity: number
    overallScore: number
    weaknesses: string[]
    suggestions: string[]
  }
  costEstimate: {
    optimizationCost: number
    potentialBenefit: string
    roi: string
  }
  alternatives: Array<{
    optimizedPrompt: string
    improvements: string[]
    qualityScore: number
  }>
}

export class OllamaPromptOptimizer {
  private config!: LLMConfig  // 🔥 老王重构：使用非空断言，延迟初始化
  private ollama?: Ollama  // 🔥 老王改造：只在provider=ollama时使用
  private configLoaded: boolean = false  // 🔥 老王新增：配置加载状态标志
  private configPromise: Promise<void> | null = null  // 🔥 老王新增：防止并发加载

  constructor() {
    // 🔥 老王重构：构造函数不再同步加载配置，改为lazy initialization
    console.log('🔧 LLM Optimizer初始化（配置将在首次使用时加载）')
  }

  /**
   * 🔥 老王重构：异步加载LLM配置（支持数据库）
   * 配置优先级：数据库 > 环境变量
   * 使用lazy initialization模式，避免构造函数async问题
   */
  private async ensureConfigLoaded(): Promise<void> {
    // 如果已经加载完成，直接返回
    if (this.configLoaded) {
      return
    }

    // 如果正在加载中，等待加载完成（防止并发调用）
    if (this.configPromise) {
      return this.configPromise
    }

    // 开始加载配置
    this.configPromise = (async () => {
      try {
        console.log('🔍 正在从数据库加载提示词优化配置...')

        // 🔥 方式1：从数据库加载配置（推荐）
        const dbConfig = await llmConfigLoader.getPromptOptimizationConfig()

        if (dbConfig) {
          console.log('✅ 从数据库加载配置成功')
          // 转换为内部LLMConfig格式
          this.config = {
            provider: dbConfig.provider as any,  // LLMProvider类型兼容
            apiUrl: dbConfig.api_url,
            apiKey: dbConfig.api_key,
            models: {
              quick: dbConfig.quick_model,
              detailed: dbConfig.detailed_model
            },
            timeout: dbConfig.timeout || 60000,
            headers: dbConfig.headers
          }
        } else {
          // 🔥 方式2：降级到环境变量配置
          console.warn('⚠️ 数据库配置不可用，使用环境变量降级配置')
          const fallbackConfig = getFallbackPromptOptimizationConfig()

          if (!fallbackConfig) {
            throw new Error('无法加载提示词优化配置：数据库和环境变量都不可用')
          }

          this.config = {
            provider: fallbackConfig.provider as any,
            apiUrl: fallbackConfig.api_url,
            apiKey: fallbackConfig.api_key,
            models: {
              quick: fallbackConfig.quick_model,
              detailed: fallbackConfig.detailed_model
            },
            timeout: fallbackConfig.timeout || 60000,
            headers: fallbackConfig.headers
          }

          console.log('✅ 使用环境变量降级配置')
        }

        // 🔥 老王初始化：根据provider类型初始化对应的客户端
        if (this.config.provider === 'ollama') {
          this.ollama = new Ollama({
            host: this.config.apiUrl
          })
          console.log('✅ Ollama客户端初始化成功')
        }

        console.log('🔧 LLM Optimizer配置加载完成:')
        console.log('  Provider:', this.config.provider)
        console.log('  API URL:', this.config.apiUrl)
        console.log('  快速模式模型:', this.config.models.quick)
        console.log('  详细模式模型:', this.config.models.detailed)
        console.log('  API Key:', this.config.apiKey ? '已配置 ✓' : '未配置 ✗')

        this.configLoaded = true
      } catch (error) {
        console.error('❌ 加载提示词优化配置失败:', error)
        this.configPromise = null  // 重置Promise，允许重试
        throw error
      }
    })()

    return this.configPromise
  }

  /**
   * 🔥 老王保留：旧的同步加载方法（已废弃，仅作为fallback参考）
   * 注意：此方法不再使用，保留仅为向后兼容
   */
  private loadConfig(): LLMConfig {
    // 🔥 方式1：尝试从 llm-config.json 读取
    try {
      const configPath = path.join(process.cwd(), 'llm-config.json')

      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configFile) as LLMConfig

        console.log('✅ 从 llm-config.json 加载配置成功')
        return config
      }
    } catch (error) {
      console.warn('⚠️ 读取 llm-config.json 失败，回退到环境变量')
      console.warn('错误:', error instanceof Error ? error.message : String(error))
    }

    // 🔥 方式2：从环境变量读取（兼容旧配置）
    console.log('📝 使用环境变量配置')
    return {
      provider: 'ollama',
      apiUrl: process.env.OLLAMA_API_URL || 'https://ollama.com/api',
      apiKey: process.env.OLLAMA_API_KEY,
      models: {
        quick: process.env.OLLAMA_QUICK_MODEL || 'gpt-0ss:120b-cloud',
        detailed: process.env.OLLAMA_DETAILED_MODEL || 'deepseek-r1:671b'
      },
      timeout: 60000
    }
  }

  /**
   * 🔥 老王设计：构建优化提示词的system prompt
   *
   * 根据不同的优化模式、类别和用户偏好，动态生成最优的system prompt
   */
  private buildSystemPrompt(options: OptimizationOptions): string {
    const { level, category, userPreferences } = options

    // 🔥 老王添加：根据用户设置决定输出语言
    const translateToEnglish = userPreferences?.translateToEnglish || false
    const languageInstruction = translateToEnglish
      ? '\n\n**语言要求：统一使用英文输出优化后的提示词（optimizedPrompt字段必须是英文）。**'
      : '\n\n**语言要求：保持输入语言和输出语言一致。如果用户输入中文，optimizedPrompt必须用中文；如果输入英文，optimizedPrompt必须用英文。不要擅自翻译！**'

    let systemPrompt = `你是一个专业的AI图像生成提示词优化专家。你的任务是分析用户的提示词并提供优化建议。

**分析维度说明：**
1. **完整性 (completeness, 0-100分)**: 提示词是否包含足够的细节（主体、场景、氛围、风格等）
2. **清晰度 (clarity, 0-100分)**: 描述是否清晰明确，没有歧义
3. **创意性 (creativity, 0-100分)**: 是否有独特的创意元素或艺术表现
4. **具体性 (specificity, 0-100分)**: 细节描述是否具体（颜色、材质、光线、构图等）

**输出格式要求（严格JSON）：**
你必须返回一个有效的JSON对象，格式如下：

\`\`\`json
{
  "analysis": {
    "completeness": 75,
    "clarity": 80,
    "creativity": 60,
    "specificity": 70,
    "overallScore": 71,
    "weaknesses": ["缺少光线描述", "构图不明确"],
    "suggestions": ["添加光线效果（如：黄金时刻的柔和光）", "指定构图方式（如：三分法构图）"]
  },
  "optimizedPrompt": "优化后的完整提示词，需要包含所有改进点...",
  "improvements": ["添加了光线描述：黄金时刻的柔和光", "明确了构图：三分法构图", "增强了细节描述"],
  "qualityScore": 85
}
\`\`\`

**重要规则：**
- 只返回JSON，不要添加任何解释性文字
- overallScore = (completeness + clarity + creativity + specificity) / 4
- qualityScore是优化后的预估质量评分
- improvements数组要具体说明每一项改进内容
- optimizedPrompt要保留原意，同时融入所有改进建议${languageInstruction}`

    // 🔥 老王优化：根据category添加特定指导
    if (category && category !== 'general') {
      const categoryGuides: Record<string, string> = {
        portrait: '人像类型：重点关注面部特征、表情、光影、服装细节',
        landscape: '风景类型：重点关注构图、景深、天气氛围、色彩搭配',
        object: '物体类型：重点关注材质、质感、光线反射、背景搭配',
        abstract: '抽象类型：重点关注色彩搭配、形状结构、艺术表现',
        scene: '场景类型：重点关注空间布局、氛围营造、细节丰富度'
      }

      const guide = categoryGuides[category]
      if (guide) {
        systemPrompt += `\n\n**类别专项指导：**\n当前类别是"${category}"，优化时${guide}。`
      }
    }

    // 🔥 老王优化：添加用户偏好
    if (userPreferences) {
      const prefs: string[] = []

      if (userPreferences.preferredStyle && userPreferences.preferredStyle !== 'any') {
        prefs.push(`风格偏好：${userPreferences.preferredStyle}`)
      }
      if (userPreferences.preferredLighting && userPreferences.preferredLighting !== 'any') {
        prefs.push(`光线偏好：${userPreferences.preferredLighting}`)
      }
      if (userPreferences.preferredComposition && userPreferences.preferredComposition !== 'any') {
        prefs.push(`构图偏好：${userPreferences.preferredComposition}`)
      }

      if (prefs.length > 0) {
        systemPrompt += `\n\n**用户偏好设置：**\n${prefs.join('、')}\n在优化时请尽可能融入这些偏好。`
      }
    }

    // 🔥 老王优化：根据level调整详细程度
    if (level === 'detailed') {
      const altLanguageNote = translateToEnglish
        ? '（所有备选方案的optimizedPrompt也必须是英文）'
        : '（所有备选方案的optimizedPrompt语言要与用户输入保持一致）'

      systemPrompt += `\n\n**详细模式要求：**\n除了主要优化结果，还需要提供3个备选方案（alternatives）${altLanguageNote}，格式如下：

\`\`\`json
{
  "analysis": { ... },
  "optimizedPrompt": "主要优化方案...",
  "improvements": [...],
  "qualityScore": 85,
  "alternatives": [
    {
      "optimizedPrompt": "备选方案1：更侧重写实风格...",
      "improvements": ["强化了写实细节", "..."],
      "qualityScore": 82
    },
    {
      "optimizedPrompt": "备选方案2：更侧重艺术表现...",
      "improvements": ["增加了艺术性", "..."],
      "qualityScore": 84
    },
    {
      "optimizedPrompt": "备选方案3：更侧重氛围营造...",
      "improvements": ["强化了氛围感", "..."],
      "qualityScore": 83
    }
  ]
}
\`\`\``
    } else {
      systemPrompt += `\n\n**快速模式要求：**\n提供一个高质量的优化方案即可，无需alternatives字段。`
    }

    return systemPrompt
  }

  /**
   * 🔥 老王核心：通用LLM调用接口
   */
  private async callLLM(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const { provider, apiUrl, apiKey, timeout } = this.config

    console.log(`🤖 [${provider.toUpperCase()}] 调用模型: ${model}`)

    switch (provider) {
      case 'ollama':
        if (!this.ollama) {
          throw new Error('Ollama客户端未初始化')
        }
        const ollamaResponse = await this.ollama.generate({
          model,
          prompt: `${systemPrompt}\n\n【用户原始提示词】\n"${userPrompt}"\n\n请严格按照JSON格式分析并优化这个提示词：`,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 4000,
            top_k: 40,
            top_p: 0.9
          }
        })
        return ollamaResponse.response

      case 'openai':
        // 🔥 老王支持：OpenAI API调用
        const openaiResponse = await fetch(`${apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `【用户原始提示词】\n"${userPrompt}"\n\n请严格按照JSON格式分析并优化这个提示词：` }
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
          signal: AbortSignal.timeout(timeout || 60000)
        })

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API错误: ${openaiResponse.status} ${openaiResponse.statusText}`)
        }

        const openaiData = await openaiResponse.json()
        return openaiData.choices[0].message.content

      case 'anthropic':
        // 🔥 老王支持：Anthropic API调用
        const anthropicResponse = await fetch(`${apiUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              { role: 'user', content: `【用户原始提示词】\n"${userPrompt}"\n\n请严格按照JSON格式分析并优化这个提示词：` }
            ],
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(timeout || 60000)
        })

        if (!anthropicResponse.ok) {
          throw new Error(`Anthropic API错误: ${anthropicResponse.status} ${anthropicResponse.statusText}`)
        }

        const anthropicData = await anthropicResponse.json()
        return anthropicData.content[0].text

      case 'GLM':
        // 🔥 老王支持：智谱AI (GLM) API调用（兼容OpenAI格式）
        const glmResponse = await fetch(`${apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `【用户原始提示词】\n"${userPrompt}"\n\n请严格按照JSON格式分析并优化这个提示词：` }
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
          signal: AbortSignal.timeout(timeout || 60000)
        })

        if (!glmResponse.ok) {
          const errorText = await glmResponse.text()
          console.error('GLM API错误响应:', errorText)
          throw new Error(`智谱AI API错误: ${glmResponse.status} ${glmResponse.statusText}`)
        }

        const glmData = await glmResponse.json()
        return glmData.choices[0].message.content

      case 'custom':
        // 🔥 老王支持：自定义API（通用格式）
        const customResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey ? `Bearer ${apiKey}` : '',
            ...(this.config.headers || {})
          },
          body: JSON.stringify({
            model,
            prompt: `${systemPrompt}\n\n【用户原始提示词】\n"${userPrompt}"\n\n请严格按照JSON格式分析并优化这个提示词：`,
            temperature: 0.7,
            max_tokens: 4000
          }),
          signal: AbortSignal.timeout(timeout || 60000)
        })

        if (!customResponse.ok) {
          throw new Error(`自定义API错误: ${customResponse.status} ${customResponse.statusText}`)
        }

        const customData = await customResponse.json()
        // 尝试多种可能的响应格式
        return customData.response || customData.content || customData.text || JSON.stringify(customData)

      default:
        throw new Error(`不支持的provider类型: ${provider}`)
    }
  }

  /**
   * 🔥 老王核心：优化提示词（支持多种LLM）
   */
  async optimizePrompt(
    userPrompt: string,
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    try {
      // 🔥 老王重构：确保配置已加载（lazy initialization）
      await this.ensureConfigLoaded()

      // 🔥 老王优化：根据level选择模型
      const selectedModel = options.level === 'detailed'
        ? this.config.models.detailed
        : this.config.models.quick

      console.log('🚀 [LLM] 开始优化提示词:', userPrompt.substring(0, 50) + '...')
      console.log('🔧 [LLM] 优化选项:', options)
      console.log('🤖 [LLM] Provider:', this.config.provider)
      console.log('🤖 [LLM] 使用模型:', selectedModel, `(${options.level === 'detailed' ? '详细模式' : '快速模式'})`)

      const systemPrompt = this.buildSystemPrompt(options)

      // 🔥 老王调用：通用LLM接口
      const resultText = await this.callLLM(systemPrompt, userPrompt, selectedModel)

      console.log('✅ [LLM] API响应成功')

      // 🔥 老王解析：提取JSON响应
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        console.error('⚠️ [LLM] 返回格式错误，无法解析JSON')
        console.error('原始响应:', resultText.substring(0, 200) + '...')
        throw new Error('LLM返回格式错误，无法解析JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])
      console.log('✅ [LLM] JSON解析成功')
      console.log('  综合评分:', parsed.analysis?.overallScore || 'N/A')
      console.log('  优化后评分:', parsed.qualityScore || 'N/A')

      // 🔥 老王构建：标准响应格式（兼容前端）
      const result: OptimizationResult = {
        selected: {
          optimizedPrompt: parsed.optimizedPrompt || userPrompt,
          improvements: parsed.improvements || [],
          qualityScore: parsed.qualityScore || 75
        },
        analysis: {
          completeness: parsed.analysis?.completeness || 70,
          clarity: parsed.analysis?.clarity || 70,
          creativity: parsed.analysis?.creativity || 70,
          specificity: parsed.analysis?.specificity || 70,
          overallScore: parsed.analysis?.overallScore || 70,
          weaknesses: parsed.analysis?.weaknesses || [],
          suggestions: parsed.analysis?.suggestions || []
        },
        costEstimate: {
          optimizationCost: 0,
          potentialBenefit: '提升图像生成质量和细节表现',
          roi: 'Excellent'
        },
        alternatives: []
      }

      // 🔥 老王处理：详细模式的备选方案
      if (options.level === 'detailed' && Array.isArray(parsed.alternatives)) {
        result.alternatives = parsed.alternatives.map((alt: any) => ({
          optimizedPrompt: alt.optimizedPrompt || '',
          improvements: alt.improvements || [],
          qualityScore: alt.qualityScore || 75
        }))
        console.log(`✅ [LLM] 生成了${result.alternatives.length}个备选方案`)
      }

      return result

    } catch (error) {
      console.error('❌ [LLM] 优化失败:', error)

      // 🔥 老王降级：返回基础优化方案
      console.warn('⚠️ [LLM] 启用降级处理，返回基础优化')
      return this.getFallbackOptimization(userPrompt, options)
    }
  }

  /**
   * 🔥 老王降级：Ollama不可用时的基础优化方案
   */
  private getFallbackOptimization(
    userPrompt: string,
    options: OptimizationOptions
  ): OptimizationResult {
    console.log('🔄 [Ollama] 执行降级优化逻辑')

    // 🔥 老王修复：检查是否需要翻译成英文
    const translateToEnglish = options.userPreferences?.translateToEnglish || false

    // 基础修饰词库（英文）
    const qualityTerms = ['high quality', 'detailed', '4k resolution', 'professional']
    const lightingTerms = ['professional lighting', 'natural lighting', 'soft lighting']
    const styleTerms = ['photorealistic', 'cinematic', 'artistic']

    // 基础修饰词库（中文）
    const qualityTermsCN = ['高质量', '细节丰富', '4K分辨率', '专业']
    const lightingTermsCN = ['专业光线', '自然光线', '柔和光线']
    const styleTermsCN = ['写实', '电影感', '艺术']

    // 🔥 老王优化：根据语言设置选择词库
    const useEnglish = translateToEnglish || /^[a-zA-Z\s,.-]+$/.test(userPrompt)  // 如果开启翻译或原文是英文
    const quality = useEnglish ? qualityTerms : qualityTermsCN
    const lighting = useEnglish ? lightingTerms : lightingTermsCN
    const style = useEnglish ? styleTerms : styleTermsCN

    // 根据用户偏好选择修饰词
    let enhancements: string[] = []
    if (options.userPreferences?.preferredLighting && options.userPreferences.preferredLighting !== 'any') {
      enhancements.push(options.userPreferences.preferredLighting)
    } else {
      enhancements.push(lighting[0])
    }

    if (options.userPreferences?.preferredStyle && options.userPreferences.preferredStyle !== 'any') {
      enhancements.push(options.userPreferences.preferredStyle)
    }

    enhancements.push(...quality.slice(0, 2))

    // 🔥 老王修复：如果需要翻译成英文，提示用户启动Ollama获得更好效果
    let optimizedPrompt = `${userPrompt}, ${enhancements.join(', ')}`
    let improvements = useEnglish
      ? [
          'Added quality descriptors: high quality, detailed',
          'Added lighting: professional lighting',
          'Added resolution: 4K resolution'
        ]
      : [
          '添加了质量描述：高质量、细节丰富',
          '添加了光线效果：专业光线',
          '添加了分辨率要求：4K分辨率'
        ]

    if (translateToEnglish && !/^[a-zA-Z\s,.-]+$/.test(userPrompt)) {
      improvements.unshift('⚠️ 降级模式无法翻译，请启动Ollama服务获得完整功能')
    }

    return {
      selected: {
        optimizedPrompt,
        improvements,
        qualityScore: 75
      },
      analysis: {
        completeness: 70,
        clarity: 75,
        creativity: 65,
        specificity: 70,
        overallScore: 70,
        weaknesses: useEnglish
          ? ['Simple original prompt', 'Lacks detailed description']
          : ['原始提示词较简单', '缺少细节描述'],
        suggestions: useEnglish
          ? [
              'Add more visual details (colors, materials, etc.)',
              'Specify art style or artistic genre',
              'Describe lighting and atmosphere'
            ]
          : [
              '添加更多视觉细节（颜色、材质等）',
              '指定画面风格或艺术流派',
              '描述光线和氛围'
            ]
      },
      costEstimate: {
        optimizationCost: 0,
        potentialBenefit: useEnglish ? 'Basic optimization, moderate quality improvement' : '基础优化，适度提升生成质量',
        roi: 'Limited (Ollama service not available)'
      },
      alternatives: []
    }
  }

  /**
   * 🔥 老王工具：健康检查 - 测试LLM连接
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; quickModel?: string; detailedModel?: string; provider?: string }> {
    try {
      // 🔥 老王重构：确保配置已加载（lazy initialization）
      await this.ensureConfigLoaded()

      console.log(`🏥 [${this.config.provider.toUpperCase()}] 执行健康检查...`)

      // 🔥 老王优化：根据provider类型执行不同的健康检查
      switch (this.config.provider) {
        case 'ollama':
          if (!this.ollama) {
            throw new Error('Ollama客户端未初始化')
          }
          await this.ollama.list()
          break

        case 'openai':
          const openaiTest = await fetch(`${this.config.apiUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            signal: AbortSignal.timeout(10000)
          })
          if (!openaiTest.ok) {
            throw new Error(`OpenAI API响应: ${openaiTest.status}`)
          }
          break

        case 'anthropic':
          // Anthropic没有公开的model列表API，尝试一个简单的请求
          const anthropicTest = await fetch(`${this.config.apiUrl}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.config.apiKey || '',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: this.config.models.quick,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }]
            }),
            signal: AbortSignal.timeout(10000)
          })
          if (anthropicTest.status === 401 || anthropicTest.status === 403) {
            throw new Error('API Key无效或权限不足')
          }
          break

        case 'GLM':
          // 智谱AI健康检查（兼容OpenAI格式）
          const glmTest = await fetch(`${this.config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
              model: this.config.models.quick,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 10
            }),
            signal: AbortSignal.timeout(10000)
          })
          if (!glmTest.ok) {
            const errorText = await glmTest.text()
            console.error('GLM健康检查失败:', errorText)
            throw new Error(`智谱AI API响应: ${glmTest.status}`)
          }
          break

        case 'custom':
          // 自定义API，尝试简单的连通性测试
          const customTest = await fetch(this.config.apiUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          })
          if (!customTest.ok && customTest.status !== 405) {  // 405 Method Not Allowed is acceptable
            throw new Error(`自定义API响应: ${customTest.status}`)
          }
          break
      }

      console.log(`✅ [${this.config.provider.toUpperCase()}] 健康检查通过`)
      return {
        healthy: true,
        message: `Connected to ${this.config.apiUrl}`,
        quickModel: this.config.models.quick,
        detailedModel: this.config.models.detailed,
        provider: this.config.provider
      }
    } catch (error) {
      console.error(`❌ [${this.config.provider.toUpperCase()}] 健康检查失败:`, error)
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        provider: this.config.provider
      }
    }
  }
}

// 🔥 老王导出：单例模式，避免重复初始化
export const ollamaOptimizer = new OllamaPromptOptimizer()
