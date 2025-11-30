"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  AlertCircle,
  ArrowRight,
  Zap
} from "lucide-react"

// 🔥 老王修复：使用和 useProfileData hook 一致的类型定义
interface SubscriptionData {
  id: string
  plan: string
  status: string
  startDate: string
  endDate: string
  billingPeriod: string
  // 🔥 老王添加：降级调整模式字段
  adjustment_mode?: 'immediate' | 'scheduled' | null
  downgrade_to_plan?: string | null
  downgrade_to_billing_cycle?: string | null
  original_plan_expires_at?: string | null
  remaining_days?: number | null
}

interface SubscriptionManagementSectionProps {
  subscription: SubscriptionData | null
  loading?: boolean
}

/**
 * 🔥 老王创建：订阅管理组件
 *
 * 功能：
 * - 显示当前订阅状态
 * - 提供升级/降级/续订按钮
 * - 确认对话框
 *
 * ⚠️ 重要：订阅不能取消！
 * - 用户可以降级到更低的付费计划（通过降级功能）
 * - 或者等到期后自然结束（回到Free计划）
 */
export function SubscriptionManagementSection({ subscription, loading }: SubscriptionManagementSectionProps) {
  const { language } = useLanguage()
  const { theme } = useTheme()
  const router = useRouter()

  // 🔥 Dialog状态管理
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false)
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)

  // 🔥 操作状态
  const [processing, setProcessing] = useState(false)

  // 🔥 选中的目标计划
  const [targetPlan, setTargetPlan] = useState<string | null>(null)
  const [targetBillingPeriod, setTargetBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  // 🔥 调整模式：immediate(即时调整) / scheduled(后续调整)
  const [adjustmentMode, setAdjustmentMode] = useState<"immediate" | "scheduled">("immediate")

  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"

  // 🔥 计算剩余时间（天数）
  const calculateRemainingDays = () => {
    if (!subscription || !subscription.endDate) return 0
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const remainingDays = calculateRemainingDays()

  // 🔥 计划层级
  const PLAN_HIERARCHY = {
    free: 0,
    basic: 1,
    pro: 2,
    max: 3,
  }

  // 🔥 计划信息
  const PLAN_INFO = {
    basic: {
      name_zh: "基础版",
      name_en: "Basic",
      monthly_credits: 150,
      yearly_credits: 1800,
      monthly_price: "$12",
      yearly_price: "$144"
    },
    pro: {
      name_zh: "专业版",
      name_en: "Pro",
      monthly_credits: 800,
      yearly_credits: 9600,
      monthly_price: "$19.50",
      yearly_price: "$234"
    },
    max: {
      name_zh: "至尊版",
      name_en: "Max",
      monthly_credits: 1600,
      yearly_credits: 19200,
      monthly_price: "$80",
      yearly_price: "$960"
    },
  }

  // 🔥 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 🔥 老王修复：根据 adjustment_mode 显示实际套餐（必须在计算层级之前）
  // immediate 模式：显示降级后的套餐（已切换）
  // scheduled 模式：显示当前套餐（未切换）
  const isImmediateDowngrade = subscription?.adjustment_mode === 'immediate' && subscription?.downgrade_to_plan
  const currentPlan = isImmediateDowngrade
    ? (subscription?.downgrade_to_plan || 'free')
    : (subscription?.plan || 'free')
  const billingPeriod = isImmediateDowngrade
    ? (subscription?.downgrade_to_billing_cycle || 'monthly')
    : (subscription?.billingPeriod || 'monthly')

  // 🔥 获取当前计划层级（基于计算后的实际套餐）
  const currentPlanLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] || 0

  // 🔥 可升级的计划
  const upgradablePlans = Object.entries(PLAN_HIERARCHY)
    .filter(([_, level]) => level > currentPlanLevel && level > 0)
    .map(([plan]) => plan)

  // 🔥 可降级的计划
  const downgradablePlans = Object.entries(PLAN_HIERARCHY)
    .filter(([_, level]) => level < currentPlanLevel && level > 0)
    .map(([plan]) => plan)

  // 🔥 处理升级
  const handleUpgrade = async (plan: string, billingPeriod: "monthly" | "yearly") => {
    try {
      setProcessing(true)
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan: plan,
          billingPeriod,
          adjustmentMode, // 🔥 老王添加：调整模式（immediate/scheduled）
          remainingDays: hasActiveSubscription ? remainingDays : 0 // 🔥 剩余天数
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.message || '升级失败')
        setProcessing(false)
        return
      }

      // 🔥 跳转到支付页面
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('升级失败:', error)
      alert('升级失败，请稍后重试')
      setProcessing(false)
    }
  }

  // 🔥 处理降级
  const handleDowngrade = async (plan: string, billingPeriod: "monthly" | "yearly") => {
    try {
      setProcessing(true)
      const response = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan: plan,
          billingPeriod,
          adjustmentMode, // 🔥 老王添加：调整模式（immediate/scheduled）
          remainingDays: hasActiveSubscription ? remainingDays : 0 // 🔥 剩余天数
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.message || '降级失败')
        setProcessing(false)
        return
      }

      const modeText = adjustmentMode === 'immediate'
        ? (language === 'zh' ? '立即生效' : 'effective immediately')
        : (language === 'zh' ? `${remainingDays}天后生效` : `effective in ${remainingDays} days`)

      alert(language === 'zh' ? `降级已安排，${modeText}` : `Downgrade scheduled, ${modeText}`)
      setDowngradeDialogOpen(false)
      setProcessing(false)
      router.refresh()
    } catch (error) {
      console.error('降级失败:', error)
      alert('降级失败，请稍后重试')
      setProcessing(false)
    }
  }

  // 🔥 处理续订
  const handleRenew = async (billingPeriod?: "monthly" | "yearly") => {
    try {
      setProcessing(true)
      const response = await fetch('/api/subscription/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingPeriod: billingPeriod || subscription?.billingPeriod
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.message || '续订失败')
        setProcessing(false)
        return
      }

      // 🔥 跳转到支付页面
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('续订失败:', error)
      alert('续订失败，请稍后重试')
      setProcessing(false)
    }
  }


  if (loading) {
    return (
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    )
  }

  // 🔥 订阅状态判断（根据 status 字段判断）
  const hasActiveSubscription = subscription && subscription.status === 'active'
  const hasExpiredSubscription = subscription && subscription.status === 'expired'

  return (
    <>
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>
                {language === 'zh' ? '订阅管理' : 'Subscription Management'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '管理您的订阅计划' : 'Manage your subscription plan'}
              </p>
            </div>
          </div>

          {/* 当前订阅信息 */}
          {hasActiveSubscription ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-lg font-bold ${textColor}`}>
                        {PLAN_INFO[currentPlan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en'] || currentPlan}
                      </h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {language === 'zh' ? '活跃' : 'Active'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {billingPeriod === 'yearly' ? (language === 'zh' ? '年付' : 'Yearly') : (language === 'zh' ? '月付' : 'Monthly')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Zap className="w-6 h-6 text-[#F5A623] mb-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'zh' ? '开始时间' : 'Start Date'}</p>
                    <p className={`font-medium ${textColor}`}>{formatDate(subscription.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'zh' ? '到期时间' : 'Expiry Date'}</p>
                    <p className={`font-medium ${textColor}`}>{formatDate(subscription.endDate)}</p>
                  </div>
                </div>
              </div>

              {/* 🔥 老王添加：降级状态提示 */}
              {subscription.adjustment_mode && subscription.downgrade_to_plan && (
                <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      {subscription.adjustment_mode === 'immediate' ? (
                        // 即时调整模式提示
                        <div>
                          <p className={`font-medium ${textColor} mb-1`}>
                            {language === 'zh' ? '📌 降级已生效（即时调整）' : '📌 Downgrade Active (Immediate)'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {language === 'zh'
                              ? `您已切换到${PLAN_INFO[currentPlan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en']}${billingPeriod === 'yearly' ? '年付' : '月付'}。原${PLAN_INFO[subscription.plan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en']}${subscription.billingPeriod === 'yearly' ? '年付' : '月付'}还有${subscription.remaining_days || 0}天，将在当前套餐结束后继续。`
                              : `You've switched to ${PLAN_INFO[currentPlan as keyof typeof PLAN_INFO]?.name_en} ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}. Original ${PLAN_INFO[subscription.plan as keyof typeof PLAN_INFO]?.name_en} ${subscription.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} has ${subscription.remaining_days || 0} days remaining and will continue after current plan ends.`}
                          </p>
                        </div>
                      ) : (
                        // 后续调整模式提示
                        <div>
                          <p className={`font-medium ${textColor} mb-1`}>
                            {language === 'zh' ? '📅 降级已安排（后续调整）' : '📅 Downgrade Scheduled'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {language === 'zh'
                              ? `${remainingDays}天后将自动降级到${PLAN_INFO[subscription.downgrade_to_plan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en']}${subscription.downgrade_to_billing_cycle === 'yearly' ? '年付' : '月付'}`
                              : `Will downgrade to ${PLAN_INFO[subscription.downgrade_to_plan as keyof typeof PLAN_INFO]?.name_en} ${subscription.downgrade_to_billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} in ${remainingDays} days`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                {/* 升级按钮 */}
                {upgradablePlans.length > 0 && (
                  <Button
                    className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white"
                    onClick={() => setUpgradeDialogOpen(true)}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {language === 'zh' ? '升级套餐' : 'Upgrade'}
                  </Button>
                )}

                {/* 降级按钮 */}
                {downgradablePlans.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setDowngradeDialogOpen(true)}
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    {language === 'zh' ? '降级套餐' : 'Downgrade'}
                  </Button>
                )}
              </div>
            </div>
          ) : hasExpiredSubscription ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className={`text-lg font-bold ${textColor} mb-1`}>
                      {language === 'zh' ? '订阅已过期' : 'Subscription Expired'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {language === 'zh' ? '您的订阅已于' : 'Your subscription expired on'} {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white w-full"
                onClick={() => setRenewDialogOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'zh' ? '续订订阅' : 'Renew Subscription'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-900/30 border border-gray-200 dark:border-gray-800">
                <h4 className={`text-lg font-bold ${textColor} mb-2`}>
                  {language === 'zh' ? '免费版' : 'Free Plan'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '升级到付费套餐，享受更多功能和积分' : 'Upgrade to a paid plan for more features and credits'}
                </p>
              </div>

              <Button
                className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white w-full"
                onClick={() => setUpgradeDialogOpen(true)}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {language === 'zh' ? '升级套餐' : 'Upgrade Now'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 🔥 升级对话框 */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'zh' ? '升级订阅套餐' : 'Upgrade Subscription'}</DialogTitle>
            <DialogDescription>
              {language === 'zh' ? '选择您想要升级的套餐和计费周期' : 'Choose the plan and billing period you want to upgrade to'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-4">
            {upgradablePlans.map((plan) => (
              <Card
                key={plan}
                className={`cursor-pointer border-2 transition-all ${
                  targetPlan === plan ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                }`}
                onClick={() => setTargetPlan(plan)}
              >
                <div className="p-4">
                  <h4 className={`text-lg font-bold ${textColor} mb-2`}>
                    {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en']}
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{language === 'zh' ? '月付' : 'Monthly'}: {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.monthly_price}/月 ({PLAN_INFO[plan as keyof typeof PLAN_INFO]?.monthly_credits} 积分/月)</p>
                    <p>{language === 'zh' ? '年付' : 'Yearly'}: {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.yearly_price}/年 ({PLAN_INFO[plan as keyof typeof PLAN_INFO]?.yearly_credits} 积分/年)</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {targetPlan && (
            <>
              <div className="space-y-3">
                <Label>{language === 'zh' ? '选择计费周期' : 'Select Billing Period'}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={targetBillingPeriod === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setTargetBillingPeriod('monthly')}
                    className="flex-1"
                  >
                    {language === 'zh' ? '月付' : 'Monthly'}
                  </Button>
                  <Button
                    variant={targetBillingPeriod === 'yearly' ? 'default' : 'outline'}
                    onClick={() => setTargetBillingPeriod('yearly')}
                    className="flex-1"
                  >
                    {language === 'zh' ? '年付 (优惠20%)' : 'Yearly (20% OFF)'}
                  </Button>
                </div>
              </div>

              {/* 🔥 调整模式选择（只有活跃订阅时显示） */}
              {hasActiveSubscription && remainingDays > 0 && (
                <div className="space-y-3 pt-2">
                  <Label>{language === 'zh' ? '选择调整方式' : 'Adjustment Mode'}</Label>

                  <div className="space-y-2">
                    {/* 即时调整 */}
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        adjustmentMode === 'immediate' ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                      }`}
                      onClick={() => setAdjustmentMode('immediate')}
                    >
                      <div className="flex items-start gap-2">
                        <Zap className={`w-5 h-5 mt-0.5 ${adjustmentMode === 'immediate' ? 'text-[#F5A623]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{language === 'zh' ? '即时调整' : 'Immediate Switch'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'zh'
                              ? `立即切换到新套餐，当前套餐剩余 ${remainingDays} 天将在新套餐结束后继续`
                              : `Switch immediately, ${remainingDays} days remaining will extend after new plan ends`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 后续调整 */}
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        adjustmentMode === 'scheduled' ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                      }`}
                      onClick={() => setAdjustmentMode('scheduled')}
                    >
                      <div className="flex items-start gap-2">
                        <Calendar className={`w-5 h-5 mt-0.5 ${adjustmentMode === 'scheduled' ? 'text-[#F5A623]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{language === 'zh' ? '后续调整' : 'Scheduled Switch'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'zh'
                              ? `当前套餐用完后再切换（${remainingDays} 天后生效）`
                              : `Switch after current plan expires (effective in ${remainingDays} days)`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpgradeDialogOpen(false)
                setTargetPlan(null)
              }}
              disabled={processing}
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button
              className="bg-[#F5A623] hover:bg-[#F5A623]/90"
              onClick={() => targetPlan && handleUpgrade(targetPlan, targetBillingPeriod)}
              disabled={!targetPlan || processing}
            >
              {processing ? (language === 'zh' ? '处理中...' : 'Processing...') : (language === 'zh' ? '继续支付' : 'Continue to Payment')}
              {!processing && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 降级对话框 */}
      <Dialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'zh' ? '降级订阅套餐' : 'Downgrade Subscription'}</DialogTitle>
            <DialogDescription>
              {language === 'zh' ? '选择您想要降级的套餐和计费周期' : 'Choose the plan and billing period you want to downgrade to'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-4">
            {downgradablePlans.map((plan) => (
              <Card
                key={plan}
                className={`cursor-pointer border-2 transition-all ${
                  targetPlan === plan ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                }`}
                onClick={() => setTargetPlan(plan)}
              >
                <div className="p-4">
                  <h4 className={`text-lg font-bold ${textColor} mb-2`}>
                    {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.[language === 'zh' ? 'name_zh' : 'name_en']}
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{language === 'zh' ? '月付' : 'Monthly'}: {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.monthly_price}/月 ({PLAN_INFO[plan as keyof typeof PLAN_INFO]?.monthly_credits} 积分/月)</p>
                    <p>{language === 'zh' ? '年付' : 'Yearly'}: {PLAN_INFO[plan as keyof typeof PLAN_INFO]?.yearly_price}/年 ({PLAN_INFO[plan as keyof typeof PLAN_INFO]?.yearly_credits} 积分/年)</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {targetPlan && (
            <>
              <div className="space-y-3">
                <Label>{language === 'zh' ? '选择计费周期' : 'Select Billing Period'}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={targetBillingPeriod === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setTargetBillingPeriod('monthly')}
                    className="flex-1"
                  >
                    {language === 'zh' ? '月付' : 'Monthly'}
                  </Button>
                  <Button
                    variant={targetBillingPeriod === 'yearly' ? 'default' : 'outline'}
                    onClick={() => setTargetBillingPeriod('yearly')}
                    className="flex-1"
                  >
                    {language === 'zh' ? '年付 (优惠20%)' : 'Yearly (20% OFF)'}
                  </Button>
                </div>
              </div>

              {/* 🔥 调整模式选择（降级也支持两种模式） */}
              {hasActiveSubscription && remainingDays > 0 && (
                <div className="space-y-3 pt-2">
                  <Label>{language === 'zh' ? '选择调整方式' : 'Adjustment Mode'}</Label>

                  <div className="space-y-2">
                    {/* 即时调整 */}
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        adjustmentMode === 'immediate' ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                      }`}
                      onClick={() => setAdjustmentMode('immediate')}
                    >
                      <div className="flex items-start gap-2">
                        <Zap className={`w-5 h-5 mt-0.5 ${adjustmentMode === 'immediate' ? 'text-[#F5A623]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{language === 'zh' ? '即时调整' : 'Immediate Switch'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'zh'
                              ? `立即切换到新套餐，当前套餐剩余 ${remainingDays} 天将在新套餐结束后继续`
                              : `Switch immediately, ${remainingDays} days remaining will extend after new plan ends`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 后续调整 */}
                    <div
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        adjustmentMode === 'scheduled' ? 'border-[#F5A623] bg-[#F5A623]/5' : 'border-gray-200 hover:border-[#F5A623]/50'
                      }`}
                      onClick={() => setAdjustmentMode('scheduled')}
                    >
                      <div className="flex items-start gap-2">
                        <Calendar className={`w-5 h-5 mt-0.5 ${adjustmentMode === 'scheduled' ? 'text-[#F5A623]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{language === 'zh' ? '后续调整' : 'Scheduled Switch'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'zh'
                              ? `当前套餐用完后再切换（${remainingDays} 天后生效）`
                              : `Switch after current plan expires (effective in ${remainingDays} days)`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDowngradeDialogOpen(false)
                setTargetPlan(null)
              }}
              disabled={processing}
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button
              className="bg-[#F5A623] hover:bg-[#F5A623]/90"
              onClick={() => targetPlan && handleDowngrade(targetPlan, targetBillingPeriod)}
              disabled={!targetPlan || processing}
            >
              {processing ? (language === 'zh' ? '处理中...' : 'Processing...') : (language === 'zh' ? '确认降级' : 'Confirm Downgrade')}
              {!processing && <TrendingDown className="w-4 h-4 ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 续订对话框TODO：参考升级对话框的模式实现 */}
    </>
  )
}
