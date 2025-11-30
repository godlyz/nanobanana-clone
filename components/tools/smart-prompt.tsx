"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { createClient } from "@/lib/supabase/client"
import { Brain, Zap, Target, TrendingUp, Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SmartPromptProps {
  user: SupabaseUser | null
}

interface OptimizationResult {
  selected: {
    optimizedPrompt: string;
    improvements: string[];
    qualityScore: number;
  };
  analysis: {
    completeness: number;
    clarity: number;
    creativity: number;
    specificity: number;
    overallScore: number;
    weaknesses: string[];
    suggestions: string[];
  };
  costEstimate: {
    optimizationCost: number;
    potentialBenefit: string;
    roi: string;
  };
  alternatives: any[];
}

interface PreferenceOptions {
  preferredStyle?: string;
  preferredLighting?: string;
  preferredComposition?: string;
  avoidElements?: string[];
  translateToEnglish?: boolean;  // 🔥 老王添加：是否翻译成英文
}

export function SmartPrompt({ user }: SmartPromptProps) {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const supabase = useMemo(() => createClient(), [])

  const [originalPrompt, setOriginalPrompt] = useState("")
  const [optimizationLevel, setOptimizationLevel] = useState<'quick' | 'detailed'>('quick')
  const [category, setCategory] = useState("general")
  const [enablePersonalization, setEnablePersonalization] = useState(true)
  const [preferences, setPreferences] = useState<PreferenceOptions>({})

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOptimization, setSelectedOptimization] = useState(0)

  // 🔥 老王添加：LLM配置信息
  const [llmConfig, setLlmConfig] = useState<{
    provider: string
    quickModel: string
    detailedModel: string
  }>({
    provider: 'GLM',
    quickModel: 'glm-4.5-air',
    detailedModel: 'glm-4.6'
  })

  // 主题相关的样式类
  const bgColor = theme === "light" ? "bg-[#FFFEF5]" : "bg-[#0A0F1C]"
  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const cardBorder = theme === "light" ? "border-[#F59E0B]/20" : "border-[#1E293B]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"
  const mutedColor = theme === "light" ? "text-[#64748B]" : "text-[#94A3B8]"
  const inputBg = theme === "light" ? "bg-white" : "bg-[#1E293B]"
  const inputBorder = theme === "light" ? "border-[#E2E8F0]" : "border-[#374151]"
  const primaryColor = theme === "light" ? "text-[#D97706]" : "text-[#D97706]"
  const primaryBg = theme === "light" ? "bg-[#D97706]" : "bg-[#D97706]"

  // 预设类别
  const categories = [
    { value: "general", label: t("smartPrompt.category.general") },
    { value: "portrait", label: t("smartPrompt.category.portrait") },
    { value: "landscape", label: t("smartPrompt.category.landscape") },
    { value: "object", label: t("smartPrompt.category.object") },
    { value: "abstract", label: t("smartPrompt.category.abstract") },
    { value: "scene", label: t("smartPrompt.category.scene") }
  ]

  // 风格选项
  const styleOptions = [
    { value: "any", label: t("smartPrompt.style.any") },
    { value: "写实", label: t("smartPrompt.style.realistic") },
    { value: "卡通", label: t("smartPrompt.style.cartoon") },
    { value: "油画", label: t("smartPrompt.style.oil") },
    { value: "水彩", label: t("smartPrompt.style.watercolor") },
    { value: "科幻", label: t("smartPrompt.style.scifi") },
    { value: "复古", label: t("smartPrompt.style.vintage") },
    { value: "极简", label: t("smartPrompt.style.minimalist") }
  ]

  // 光线选项
  const lightingOptions = [
    { value: "any", label: t("smartPrompt.lighting.any") },
    { value: "自然光", label: t("smartPrompt.lighting.natural") },
    { value: "黄金时刻", label: t("smartPrompt.lighting.golden") },
    { value: "戏剧光", label: t("smartPrompt.lighting.dramatic") },
    { value: "柔和光", label: t("smartPrompt.lighting.soft") },
    { value: "逆光", label: t("smartPrompt.lighting.backlight") },
    { value: "夜景", label: t("smartPrompt.lighting.night") }
  ]

  // 构图选项
  const compositionOptions = [
    { value: "any", label: t("smartPrompt.composition.any") },
    { value: "三分法", label: t("smartPrompt.composition.ruleThirds") },
    { value: "中心对称", label: t("smartPrompt.composition.center") },
    { value: "对角线", label: t("smartPrompt.composition.diagonal") },
    { value: "俯视", label: t("smartPrompt.composition.overhead") },
    { value: "特写", label: t("smartPrompt.composition.closeup") },
    { value: "广角", label: t("smartPrompt.composition.wide") }
  ]

  // 🔥 老王添加：获取LLM配置信息
  useEffect(() => {
    const fetchLLMConfig = async () => {
      if (!user) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch('/api/smart-prompt/optimize', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.llm) {
            setLlmConfig({
              provider: data.llm.provider || 'GLM',
              quickModel: data.llm.quickModel || 'glm-4.5-air',
              detailedModel: data.llm.detailedModel || 'glm-4.6'
            })
          }
        }
      } catch (error) {
        console.error(t("tools.smartPrompt.fetchConfigFailed"), error)
      }
    }

    fetchLLMConfig()
  }, [user, supabase])

  const handleOptimize = async () => {
    if (!user) {
      alert(t("tools.smartPrompt.loginRequired"))
      return
    }

    if (!originalPrompt.trim()) {
      setError(t("smartPrompt.error.emptyPrompt"))
      return
    }

    setIsOptimizing(true)
    setError(null)
    setOptimizationResult(null)

    try {
      // 🔥 老王修复：获取Supabase session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError(t("tools.smartPrompt.sessionExpired"))
        setIsOptimizing(false)
        return
      }

      const response = await fetch('/api/smart-prompt/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,  // 🔥 老王修复：添加authorization header
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          level: optimizationLevel,
          category: category || undefined,
          enablePersonalization,
          userPreferences: enablePersonalization ? preferences : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || t("tools.smartPrompt.optimizationFailed"))
      }

      setOptimizationResult(data.result)
    } catch (err) {
      console.error('智能优化失败:', err)
      setError(err instanceof Error ? err.message : t("tools.smartPrompt.networkError"))
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleUseOptimized = () => {
    if (!optimizationResult) return

    const optimizedPrompt = selectedOptimization === 0
      ? optimizationResult.selected.optimizedPrompt
      : optimizationResult.alternatives[selectedOptimization - 1]?.optimizedPrompt

    if (optimizedPrompt) {
      navigator.clipboard.writeText(optimizedPrompt)
      alert(t("smartPrompt.alert.copied"))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和描述 */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-[#D97706]" />
          </div>
          <h1 className={`text-3xl font-bold ${textColor}`}>
            {t("smartPrompt.title")}
          </h1>
        </div>
        <p className={`text-lg ${mutedColor} max-w-2xl mx-auto`}>
          {t("smartPrompt.subtitle")}
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-[#FEF3C7] text-[#D97706]">
            {t("tools.smartPrompt.aiDriven")}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {t("tools.smartPrompt.smartOptimization")}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：输入和设置 */}
        <div className="space-y-6">
          <Card className={`${cardBg} ${cardBorder} border-2 p-6`}>
            <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${textColor}`}>
              <Target className="w-5 h-5 text-[#D97706]" />
              {t("smartPrompt.input.title")}
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="original-prompt" className={textColor}>{t("smartPrompt.input.label")}</Label>
                <Textarea
                  id="original-prompt"
                  placeholder={t("smartPrompt.input.placeholder")}
                  value={originalPrompt}
                  onChange={(e) => setOriginalPrompt(e.target.value)}
                  className={`min-h-[120px] ${inputBg} ${inputBorder} ${textColor} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="optimization-level" className={textColor}>
                    {t("smartPrompt.input.level")}
                  </Label>
                  <Select value={optimizationLevel} onValueChange={(value: 'quick' | 'detailed') => setOptimizationLevel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">
                        <div className="flex flex-col">
                          <span>{t("smartPrompt.level.quick")}</span>
                          <span className="text-xs text-muted-foreground">{t("tools.smartPrompt.quickModelDesc").replace('{model}', llmConfig.quickModel)}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="detailed">
                        <div className="flex flex-col">
                          <span>{t("smartPrompt.level.detailed")}</span>
                          <span className="text-xs text-muted-foreground">{t("tools.smartPrompt.detailedModelDesc").replace('{model}', llmConfig.detailedModel)}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {optimizationLevel === 'detailed' && (
                    <p className={`text-xs ${mutedColor} mt-1`}>
                      {t("tools.smartPrompt.detailedModeHint").replace('{model}', llmConfig.detailedModel)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category" className={textColor}>{t("smartPrompt.input.category")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <Card className={`${cardBg} ${cardBorder} border-2 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${textColor}`}>
                <Star className="w-5 h-5 text-[#D97706]" />
                {t("smartPrompt.preferences.title")}
              </h3>
              <Switch
                checked={enablePersonalization}
                onCheckedChange={setEnablePersonalization}
              />
            </div>

            {enablePersonalization && (
              <div className="space-y-4">
                {/* 🔥 老王添加：翻译成英文开关 */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${inputBorder} ${inputBg}`}>
                  <div>
                    <Label className={`${textColor} font-medium`}>{t("tools.smartPrompt.translateToEnglish")}</Label>
                    <p className={`text-xs ${mutedColor} mt-1`}>
                      {t("tools.smartPrompt.translateToEnglishDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.translateToEnglish || false}
                    onCheckedChange={(checked) => setPreferences({...preferences, translateToEnglish: checked})}
                  />
                </div>

                <div>
                  <Label className={textColor}>{t("smartPrompt.preferences.style")}</Label>
                  <Select value={preferences.preferredStyle || "any"} onValueChange={(value) => setPreferences({...preferences, preferredStyle: value === "any" ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t("smartPrompt.noPreference")}</SelectItem>
                      {styleOptions.map(style => (
                        <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={textColor}>{t("smartPrompt.preferences.lighting")}</Label>
                  <Select value={preferences.preferredLighting || "any"} onValueChange={(value) => setPreferences({...preferences, preferredLighting: value === "any" ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t("smartPrompt.noPreference")}</SelectItem>
                      {lightingOptions.map(lighting => (
                        <SelectItem key={lighting.value} value={lighting.value}>{lighting.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={textColor}>{t("smartPrompt.preferences.composition")}</Label>
                  <Select value={preferences.preferredComposition || "any"} onValueChange={(value) => setPreferences({...preferences, preferredComposition: value === "any" ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t("smartPrompt.noPreference")}</SelectItem>
                      {compositionOptions.map(comp => (
                        <SelectItem key={comp.value} value={comp.value}>{comp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>

          <Button
            onClick={handleOptimize}
            disabled={!originalPrompt.trim() || isOptimizing}
            size="lg"
            className="w-full bg-[#D97706] hover:bg-[#B45309] text-white"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("smartPrompt.optimizing")}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t("smartPrompt.optimize")}
              </>
            )}
          </Button>

          {error && (
            <div className={`p-3 rounded-md border ${cardBorder} text-red-600 text-sm flex items-center gap-2 ${theme === 'light' ? 'bg-red-50' : 'bg-red-900/20'}`}>
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* 右侧：优化结果 */}
        <div>
          {optimizationResult ? (
            <div className="space-y-6">
              <Card className={`${cardBg} ${cardBorder} border-2 p-6`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textColor}`}>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {t("smartPrompt.result.title")}
                </h3>

                {/* 质量评分 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`p-3 rounded-lg ${getScoreBgColor(optimizationResult.analysis.overallScore)}`}>
                    <div className="text-sm text-muted-foreground mb-1">{t("smartPrompt.result.overallScore")}</div>
                    <div className={`text-2xl font-bold ${getScoreColor(optimizationResult.analysis.overallScore)}`}>
                      {optimizationResult.analysis.overallScore}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FEF3C7]">
                    <div className="text-sm text-muted-foreground mb-1">{t("smartPrompt.result.costEstimate")}</div>
                    <div className="text-2xl font-bold text-[#D97706]">
                      ${optimizationResult.costEstimate.optimizationCost}
                    </div>
                  </div>
                </div>

                {/* 详细分析 */}
                <div className="space-y-3 mb-6">
                  <h4 className={`font-medium ${textColor}`}>{t("smartPrompt.result.analysis")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${textColor}`}>{t("smartPrompt.result.completeness")}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={optimizationResult.analysis.completeness} className="w-20 h-2" />
                        <span className="text-sm font-medium">{optimizationResult.analysis.completeness}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${textColor}`}>{t("smartPrompt.result.clarity")}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={optimizationResult.analysis.clarity} className="w-20 h-2" />
                        <span className="text-sm font-medium">{optimizationResult.analysis.clarity}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${textColor}`}>{t("smartPrompt.result.creativity")}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={optimizationResult.analysis.creativity} className="w-20 h-2" />
                        <span className="text-sm font-medium">{optimizationResult.analysis.creativity}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${textColor}`}>{t("smartPrompt.result.specificity")}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={optimizationResult.analysis.specificity} className="w-20 h-2" />
                        <span className="text-sm font-medium">{optimizationResult.analysis.specificity}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 优化建议 */}
                {optimizationResult.selected.improvements.length > 0 && (
                  <div className="mb-6">
                    <h4 className={`font-medium mb-2 ${textColor}`}>{t("smartPrompt.result.improvements")}</h4>
                    <ul className="space-y-1">
                      {optimizationResult.selected.improvements.map((improvement, index) => (
                        <li key={index} className={`text-sm ${mutedColor} flex items-start gap-2`}>
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 优化后的提示词 */}
                <div className="mb-6">
                  <h4 className={`font-medium mb-2 ${textColor}`}>{t("smartPrompt.result.optimizedPrompt")}</h4>
                  <div className={`p-3 rounded-lg border ${theme === 'light' ? 'bg-[#FEF3C7] border-[#D97706]' : 'bg-[#D97706]/10 border-[#D97706]'}`}>
                    <p className={`text-sm leading-relaxed ${textColor}`}>{optimizationResult.selected.optimizedPrompt}</p>
                  </div>
                </div>

                <Button onClick={handleUseOptimized} className="w-full bg-[#D97706] hover:bg-[#B45309] text-white">
                  {t("smartPrompt.result.useOptimized")}
                </Button>
              </Card>
            </div>
          ) : (
            <Card className={`${cardBg} ${cardBorder} border-2 p-12 text-center`}>
              <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-[#D97706]" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${textColor}`}>{t("smartPrompt.placeholder.title")}</h3>
              <p className={`text-sm ${mutedColor}`}>
                {t("smartPrompt.placeholder.description")}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* 特性介绍 */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className={`${cardBg} ${cardBorder} border-2 p-6 text-center`}>
          <div className="w-12 h-12 rounded-lg bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-[#D97706]" />
          </div>
          <h3 className={`font-semibold text-lg mb-2 ${textColor}`}>{t("smartPrompt.features.ai")}</h3>
          <p className={`text-sm ${mutedColor}`}>
            {t("smartPrompt.features.aiDesc")}
          </p>
        </Card>

        <Card className={`${cardBg} ${cardBorder} border-2 p-6 text-center`}>
          <div className="w-12 h-12 rounded-lg bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-[#D97706]" />
          </div>
          <h3 className={`font-semibold text-lg mb-2 ${textColor}`}>{t("smartPrompt.features.learning")}</h3>
          <p className={`text-sm ${mutedColor}`}>
            {t("smartPrompt.features.learningDesc")}
          </p>
        </Card>

        <Card className={`${cardBg} ${cardBorder} border-2 p-6 text-center`}>
          <div className="w-12 h-12 rounded-lg bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-[#D97706]" />
          </div>
          <h3 className={`font-semibold text-lg mb-2 ${textColor}`}>{t("smartPrompt.features.personalization")}</h3>
          <p className={`text-sm ${mutedColor}`}>
            {t("smartPrompt.features.personalizationDesc")}
          </p>
        </Card>
      </div>
    </div>
  )
}
