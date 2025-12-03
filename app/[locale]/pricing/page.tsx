"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Loader2, Crown, Zap, Shield, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { useTranslations, useLocale } from 'next-intl' // 🔥 老王迁移：使用next-intl
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ContactModal } from "@/components/contact-modal"

type SubscriptionStatus = {
  isLoggedIn: boolean
  user?: {
    id: string
    email: string
  }
  subscription?: {
    plan_id: string
    status: string
    billing_period: string
    expires_at?: string // 🔥 老王添加：到期时间
    endDate?: string // 🔥 老王添加：到期时间（兼容字段）
    frozen_until?: string // 🔥 老王添加：冻结截止时间
  } | null
  // 🔥 老王添加：所有订阅列表（用于判断是否允许升降级）
  allSubscriptions?: Array<{
    id: string
    plan: string
    billingCycle: string
    status: string
    startDate: string
    endDate: string
    frozenUntil?: string
    frozenCredits?: number
    remainingDays: number
    remainingMonths: number
  }>
}

export default function PricingPage() {
  const tPricing = useTranslations('pricing') // 🔥 老王修复：拆分命名空间
  const tCredits = useTranslations('credits')
  const locale = useLocale() // 🔥 老王迁移：使用locale替代language
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isLoggedIn: false,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"subscription" | "credits">("subscription")

  // 🔥 老王添加：调整模式对话框相关状态
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [adjustmentMode, setAdjustmentMode] = useState<"immediate" | "scheduled">("immediate")
  const [targetPlan, setTargetPlan] = useState<string | null>(null)
  const [targetBillingPeriod, setTargetBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [actionType, setActionType] = useState<"upgrade" | "downgrade" | "purchase">("purchase")
  const [processing, setProcessing] = useState(false)

  // 🔥 老王添加：联系客服弹窗状态
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactInfo, setContactInfo] = useState({
    support: { phone: "", qq: "", wechat: "", telegram: "", email: "" },
    sales: { phone: "", qq: "", wechat: "", telegram: "", email: "" }
  })

  useEffect(() => {
    // 🔥 老王修复：改用 /api/subscription/all 获取所有订阅（包括冻结的）
    const fetchSubscriptionStatus = async () => {
      try {
        // 第1步：获取所有订阅
        const allResponse = await fetch("/api/subscription/all")
        const allData = await allResponse.json()

        if (allResponse.status === 401) {
          setSubscriptionStatus({
            isLoggedIn: false,
            subscription: null
          })
          setLoading(false)
          return
        }

        // 第2步：找出活跃订阅作为主订阅
        const activeSubscription = allData.subscriptions?.find((sub: any) => sub.status === 'active')

        // 第3步：设置状态（包含所有订阅列表）
        setSubscriptionStatus({
          isLoggedIn: allData.isLoggedIn,
          user: allData.user,
          subscription: activeSubscription ? {
            plan_id: activeSubscription.plan,
            status: activeSubscription.status,
            billing_period: activeSubscription.billingCycle,
            expires_at: activeSubscription.endDate,
            frozen_until: activeSubscription.frozenUntil
          } : null,
          // 🔥 老王添加：保存所有订阅列表（用于判断是否允许升降级）
          allSubscriptions: allData.subscriptions || []
        })
      } catch (error) {
        console.error("Error fetching subscription status:", error)
        setSubscriptionStatus({
          isLoggedIn: false,
          subscription: null
        })
      } finally {
        setLoading(false)
      }
    }

    // 🔥 老王添加：获取联系信息
    const fetchContactInfo = async () => {
      try {
        const response = await fetch("/api/contact")
        const data = await response.json()
        if (data.support && data.sales) {
          setContactInfo(data)
        }
      } catch (error) {
        console.error("Error fetching contact info:", error)
      }
    }

    fetchSubscriptionStatus()
    fetchContactInfo()
  }, [])

  // 🔥 老王添加：计算剩余时间（天数）
  const calculateRemainingDays = () => {
    if (!subscriptionStatus.subscription) return 0
    const expiresAt = subscriptionStatus.subscription.expires_at || subscriptionStatus.subscription.endDate
    if (!expiresAt) return 0

    const now = new Date()
    const endDate = new Date(expiresAt)
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const remainingDays = calculateRemainingDays()
  const hasActiveSubscription = !!subscriptionStatus.subscription && remainingDays > 0

  // 🔥 老王添加：检查订阅是否被冻结
  const isFrozen = () => {
    if (!subscriptionStatus.subscription?.frozen_until) return false
    const frozenUntil = new Date(subscriptionStatus.subscription.frozen_until)
    const now = new Date()
    return frozenUntil > now // 如果冻结截止时间在未来，说明还在冻结中
  }

  const subscriptionIsFrozen = isFrozen()

  // 🔥 老王添加：检查用户是否有多个订阅（不管active还是frozen）
  const hasMultipleSubscriptions = () => {
    if (!subscriptionStatus.allSubscriptions) return false
    // 过滤掉已过期的订阅，只统计active和frozen的
    const validSubscriptions = subscriptionStatus.allSubscriptions.filter(sub =>
      sub.status === 'active' || sub.status === 'frozen'
    )
    return validSubscriptions.length > 1
  }

  const hasMultiplePlans = hasMultipleSubscriptions()

  const plans = [
    {
      id: "basic",
      name: tPricing("basic.name"),
      monthlyPrice: "$12.00",
      yearlyPrice: "$144.00",
      yearlyOriginalPrice: "$180.00",
      credits: billingPeriod === "monthly"
        ? tPricing("basic.creditsMonthly")
        : tPricing("basic.creditsYearly"),
      description: tPricing("basic.description"),
      features: [
        tPricing("basic.feature1"),
        tPricing("basic.feature2"),
        tPricing("basic.feature3"),
        tPricing("basic.feature4"),
        tPricing("basic.feature5"),
        tPricing("basic.feature6"),
        tPricing("basic.feature7"), // 🔥 老王Day3添加：视频生成积分消耗说明
      ],
      cta: tPricing("basic.cta"),
      popular: false,
      icon: <Shield className="w-6 h-6" />,
    },
    {
      id: "pro",
      name: tPricing("pro.name"),
      monthlyPrice: "$60.00",
      yearlyPrice: "$720.00",
      yearlyOriginalPrice: "$1,440.00",
      credits: billingPeriod === "monthly"
        ? tPricing("pro.creditsMonthly")
        : tPricing("pro.creditsYearly"),
      description: tPricing("pro.description"),
      features: [
        tPricing("pro.feature1"),
        tPricing("pro.feature2"),
        tPricing("pro.feature3"),
        tPricing("pro.feature4"),
        tPricing("pro.feature5"),
        tPricing("pro.feature6"),
        tPricing("pro.feature7"),
        tPricing("pro.feature8"),
        tPricing("pro.feature9"), // 🔥 老王Day3添加：视频生成积分消耗说明
      ],
      cta: tPricing("pro.cta"),
      popular: true,
      icon: <Crown className="w-6 h-6" />,
    },
    {
      id: "max",
      name: tPricing("max.name"),
      monthlyPrice: "$140.00",
      yearlyPrice: "$1,680.00",
      yearlyOriginalPrice: "$3,360.00",
      credits: billingPeriod === "monthly"
        ? tPricing("max.creditsMonthly")
        : tPricing("max.creditsYearly"),
      description: tPricing("max.description"),
      features: [
        tPricing("max.feature1"),
        tPricing("max.feature2"),
        tPricing("max.feature3"),
        tPricing("max.feature4"),
        tPricing("max.feature5"),
        tPricing("max.feature6"),
        tPricing("max.feature7"),
        tPricing("max.feature8"),
        tPricing("max.feature9"), // 🔥 老王Day3添加：视频生成积分消耗说明
      ],
      cta: tPricing("max.cta"),
      popular: false,
      icon: <Zap className="w-6 h-6" />,
    },
  ]

  // 积分包数据
  const creditPackages = [
    {
      id: "starter",
      name: tCredits("starter.name"),
      credits: 100,
      price: "$9.90",
      description: tCredits("starter.description"),
      features: [
        tCredits("starter.feature1"),
        tCredits("starter.feature2"),
        tCredits("starter.feature3"),
        tCredits("starter.feature4")
      ],
      badge: tCredits("starter.badge"),
      popular: true
    },
    {
      id: "growth",
      name: tCredits("growth.name"),
      credits: 450,
      price: "$39.90",
      description: tCredits("growth.description"),
      features: [
        tCredits("growth.feature1"),
        tCredits("growth.feature2"),
        tCredits("growth.feature3"),
        tCredits("growth.feature4"),
        tCredits("growth.feature5")
      ],
      badge: tCredits("growth.badge"),
      popular: false
    },
    {
      id: "professional",
      name: tCredits("professional.name"),
      credits: 1000,
      price: "$79.90",
      description: tCredits("professional.description"),
      features: [
        tCredits("professional.feature1"),
        tCredits("professional.feature2"),
        tCredits("professional.feature3"),
        tCredits("professional.feature4"),
        tCredits("professional.feature5"),
        tCredits("professional.feature6")
      ],
      badge: tCredits("professional.badge"),
      popular: false
    },
    {
      id: "enterprise",
      name: tCredits("enterprise.name"),
      credits: 4200,
      price: "$299.90",
      description: tCredits("enterprise.description"),
      features: [
        tCredits("enterprise.feature1"),
        tCredits("enterprise.feature2"),
        tCredits("enterprise.feature3"),
        tCredits("enterprise.feature4"),
        tCredits("enterprise.feature5"),
        tCredits("enterprise.feature6"),
        tCredits("enterprise.feature7")
      ],
      badge: tCredits("enterprise.badge"),
      popular: false
    }
  ]

  const faqs = [
    {
      question: tPricing("faq1.question"),
      answer: tPricing("faq1.answer"),
    },
    {
      question: tPricing("faq2.question"),
      answer: tPricing("faq2.answer"),
    },
    {
      question: tPricing("faq3.question"),
      answer: tPricing("faq3.answer"),
    },
    {
      question: tPricing("faq4.question"),
      answer: tPricing("faq4.answer"),
    },
    {
      question: tPricing("faq5.question"), // 🔥 老王Day3添加：视频生成积分消耗FAQ
      answer: tPricing("faq5.answer"),
    },
  ]

  // 🔥 老王添加：处理升级订阅
  const handleUpgrade = async (plan: string, billing: "monthly" | "yearly") => {
    // 🔥 老王添加：冻结状态检查
    if (subscriptionIsFrozen) {
      const frozenUntil = subscriptionStatus.subscription?.frozen_until
      const frozenDate = frozenUntil ? new Date(frozenUntil).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : ''
      alert(tPricing("alerts.frozenUpgrade", { date: frozenDate }))
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan: plan,
          billingPeriod: billing,
          adjustmentMode, // 🔥 调整模式（immediate/scheduled）
          remainingDays: hasActiveSubscription ? remainingDays : 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || tPricing("alerts.upgradeFailed"))
        return
      }

      // 🔥 升级成功，跳转到支付页面
      if (data.checkoutUrl) {
        const modeText = adjustmentMode === 'immediate'
          ? tPricing("alerts.effectiveImmediately")
          : tPricing("alerts.effectiveInDays", { days: remainingDays })
        alert(`${tPricing("alerts.upgradeSuccess")} (${modeText})`)
        window.location.href = data.checkoutUrl
      } else {
        alert(tPricing("alerts.upgradeSuccess"))
        window.location.reload()
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert(tPricing("alerts.upgradeRetry"))
    } finally {
      setProcessing(false)
      setAdjustmentDialogOpen(false)
    }
  }

  // 🔥 老王添加：处理降级订阅
  const handleDowngrade = async (plan: string, billing: "monthly" | "yearly") => {
    // 🔥 老王添加：冻结状态检查
    if (subscriptionIsFrozen) {
      const frozenUntil = subscriptionStatus.subscription?.frozen_until
      const frozenDate = frozenUntil ? new Date(frozenUntil).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : ''
      alert(tPricing("alerts.frozenDowngrade", { date: frozenDate }))
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan: plan,
          billingPeriod: billing,
          adjustmentMode, // 🔥 调整模式（immediate/scheduled）
          remainingDays: hasActiveSubscription ? remainingDays : 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || tPricing("alerts.downgradeFailed"))
        return
      }

      const modeText = adjustmentMode === 'immediate'
        ? tPricing("alerts.effectiveImmediately")
        : tPricing("alerts.effectiveInDays", { days: remainingDays })
      alert(`${tPricing("alerts.downgradeSuccess")} (${modeText})`)
      window.location.reload()
    } catch (error) {
      console.error('Downgrade error:', error)
      alert(tPricing("alerts.downgradeRetry"))
    } finally {
      setProcessing(false)
      setAdjustmentDialogOpen(false)
    }
  }

  const handlePurchase = async (planId: string) => {
    // 如果未登录,跳转到登录页面
    if (!subscriptionStatus.isLoggedIn) {
      router.push("/login")
      return
    }

    try {
      // 调用 API 创建 Creem checkout session
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        // 重定向到 Creem 支付页面
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    }
  }

  const handleCreditPurchase = async (packageId: string) => {
    // 如果未登录,跳转到登录页面
    if (!subscriptionStatus.isLoggedIn) {
      router.push("/login")
      return
    }

    try {
      // 调用 API 购买积分包
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId,
        }),
      })

      const data = await response.json()

      if (data.success && data.session?.checkoutUrl) {
        // 重定向到支付页面
        window.location.href = data.session.checkoutUrl
      } else {
        alert(data.message || "购买失败，请重试")
      }
    } catch (error) {
      console.error("Error purchasing credits:", error)
      alert("购买失败，请重试")
    }
  }

  // 🔥 老王修改：处理按钮点击，判断是否需要显示调整模式对话框
  const handlePlanClick = (planId: string) => {
    const currentSubscription = subscriptionStatus.subscription

    if (!subscriptionStatus.isLoggedIn) {
      router.push("/login")
      return
    }

    if (!currentSubscription) {
      // 🔥 新购买，直接调用 handlePurchase
      handlePurchase(planId)
      return
    }

    // 🔥 老王添加：如果用户有多个订阅，只允许续费，禁止升降级
    if (hasMultiplePlans) {
      const userPlans = subscriptionStatus.allSubscriptions?.map(sub => sub.plan) || []
      const isUserPlan = userPlans.includes(planId)

      if (!isUserPlan) {
        // 不是用户的套餐，阻止操作
        alert(tPricing("alerts.multipleSubscriptions"))
        return
      }

      // 🔥 老王修复：是用户的套餐之一，直接允许续订（不管计费周期）
      handlePurchase(planId)
      return
    }

    const currentPlanId = (currentSubscription as any).plan || (currentSubscription as any).plan_id

    // 如果是当前套餐且计费周期不同，是续订
    if (currentPlanId === planId) {
      const currentBillingPeriod = (currentSubscription as any).interval || (currentSubscription as any).billing_period
      if (currentBillingPeriod !== billingPeriod) {
        // 🔥 续订，直接调用 handlePurchase
        handlePurchase(planId)
      }
      return
    }

    // 定义套餐等级
    const planLevels: Record<string, number> = { basic: 1, pro: 2, max: 3 }
    const currentLevel = planLevels[currentPlanId] || 0
    const targetLevel = planLevels[planId] || 0

    // 🔥 升级或降级，如果有活跃订阅，显示对话框
    if (targetLevel > currentLevel) {
      // 升级
      setTargetPlan(planId)
      setTargetBillingPeriod(billingPeriod)
      setActionType("upgrade")
      if (hasActiveSubscription) {
        setAdjustmentDialogOpen(true)
      } else {
        handleUpgrade(planId, billingPeriod)
      }
    } else if (targetLevel < currentLevel) {
      // 降级
      setTargetPlan(planId)
      setTargetBillingPeriod(billingPeriod)
      setActionType("downgrade")
      if (hasActiveSubscription) {
        setAdjustmentDialogOpen(true)
      } else {
        handleDowngrade(planId, billingPeriod)
      }
    } else {
      // 其他情况，直接购买
      handlePurchase(planId)
    }
  }

  // 获取按钮文本和状态
  const getButtonConfig = (planId: string) => {
    const currentSubscription = subscriptionStatus.subscription

    if (!subscriptionStatus.isLoggedIn) {
      return { text: tPricing("login"), disabled: false }
    }

    if (!currentSubscription) {
      return { text: tPricing("subscribe"), disabled: false }
    }

    // 🔥 老王添加：如果订阅被冻结，显示冻结状态并禁用按钮
    if (subscriptionIsFrozen) {
      return {
        text: tPricing("frozenStatus"),
        disabled: true
      }
    }

    // 🔥 老王添加：如果用户有多个订阅（一个active + 一个frozen），只允许续费
    if (hasMultiplePlans) {
      // 检查当前套餐ID是否匹配用户的任一订阅
      const userPlans = subscriptionStatus.allSubscriptions?.map(sub => sub.plan) || []
      const isUserPlan = userPlans.includes(planId)

      if (!isUserPlan) {
        // 不是用户的套餐，禁用按钮
        return {
          text: tPricing("multipleSubscriptions"),
          disabled: true
        }
      }

      // 🔥 老王修复：是用户的套餐之一，不管什么计费周期都显示"续订"
      return { text: tPricing("renew"), disabled: false }
    }

    const currentPlanId = (currentSubscription as any).plan || (currentSubscription as any).plan_id

    // 如果是当前套餐
    if (currentPlanId === planId) {
      const currentBillingPeriod = (currentSubscription as any).interval || (currentSubscription as any).billing_period
      // 如果计费周期相同,显示"当前套餐"
      if (currentBillingPeriod === billingPeriod) {
        return { text: tPricing("currentPlan"), disabled: true }
      }
      // 如果计费周期不同,显示"续订"
      return { text: tPricing("renew"), disabled: false }
    }

    // 定义套餐等级
    const planLevels: Record<string, number> = { basic: 1, pro: 2, max: 3 }
    const currentLevel = planLevels[currentPlanId] || 0
    const targetLevel = planLevels[planId] || 0

    // 如果目标套餐更高级,显示"升级"
    if (targetLevel > currentLevel) {
      return { text: tPricing("upgrade"), disabled: false }
    }

    // 如果目标套餐更低级,显示"降级"
    if (targetLevel < currentLevel) {
      return { text: tPricing("downgrade"), disabled: false }
    }

    return { text: tPricing("subscribe"), disabled: false }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-foreground mb-4">{tPricing("title")}</h1>
            <p className="text-xl text-muted-foreground">{tPricing("subtitle")}</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <button
              onClick={() => setActiveTab("subscription")}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "subscription"
                  ? "bg-[#F5A623] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tPricing("subscription")}
            </button>
            <button
              onClick={() => setActiveTab("credits")}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "credits"
                  ? "bg-[#F5A623] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tPricing("credits")}
            </button>
          </div>

          {/* Billing Period Toggle - 只在订阅计划时显示 */}
          {activeTab === "subscription" && (
            <div className="flex justify-center items-center gap-4 mb-12">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tPricing("monthly")}
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tPricing("yearly")}
              </button>
              </div>
          )}

          {/* Pricing Cards */}
          {activeTab === "subscription" ? (
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`p-8 relative ${
                    plan.popular
                      ? "border-2 border-primary shadow-2xl scale-105"
                      : "border border-border"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      {tPricing("mostPopular")}
                    </div>
                  )}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-lg ${
                        plan.popular
                          ? "bg-primary/10 text-primary"
                          : "bg-muted"
                      }`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="mb-2">
                      {billingPeriod === "monthly" ? (
                        <div className="text-4xl font-bold text-foreground">
                          {plan.monthlyPrice}
                          <span className="text-lg font-normal text-muted-foreground">/mo</span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-muted-foreground line-through">
                            {plan.yearlyOriginalPrice}
                          </div>
                          <div className="text-4xl font-bold text-foreground">
                            {plan.yearlyPrice}
                            <span className="text-lg font-normal text-muted-foreground">/year</span>
                          </div>
                          </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {plan.credits}
                      {billingPeriod === "yearly" && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                          ⚡ {tPricing("yearlyBonusCredits")}
                        </div>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePlanClick(plan.id)}
                    disabled={loading || processing || getButtonConfig(plan.id).disabled}
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {loading || processing ? tPricing("loading") : getButtonConfig(plan.id).text}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`p-6 relative ${
                    pkg.popular
                      ? "border-2 border-[#F5A623] shadow-2xl scale-105"
                      : "border border-border"
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5A623] text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {pkg.badge}
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {pkg.credits} 积分
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-foreground">
                        {pkg.price}
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleCreditPurchase(pkg.id)}
                    disabled={loading}
                    className={`w-full ${
                      pkg.popular
                        ? "bg-[#F5A623] text-white hover:bg-[#F5A623]/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {loading ? tPricing("loading") : tPricing("buyCredits")}
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{tPricing("faqTitle")}</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </Card>
              ))}
            </div>
            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">{tPricing("moreQuestions")}</p>
              <Button variant="outline" onClick={() => setContactModalOpen(true)}>{tPricing("contactSupport")}</Button>
            </div>
          </div>
        </div>
      </main>

      {/* 🔥 老王添加：调整模式选择对话框 */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'upgrade' ? tPricing("dialog.upgradeTitle") : tPricing("dialog.downgradeTitle")}
            </DialogTitle>
            <DialogDescription>
              {tPricing("dialog.adjustmentDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 🔥 调整模式选择（只有活跃订阅时显示） */}
            {hasActiveSubscription && remainingDays > 0 && (
              <div className="space-y-3">
                <Label>{tPricing("dialog.adjustmentMode")}</Label>

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
                        <div className="font-semibold text-sm">{tPricing("dialog.immediateSwitch")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tPricing("dialog.immediateDescription", { days: remainingDays })}
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
                        <div className="font-semibold text-sm">{tPricing("dialog.scheduledSwitch")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tPricing("dialog.scheduledDescription", { days: remainingDays })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdjustmentDialogOpen(false)
                setTargetPlan(null)
              }}
              disabled={processing}
            >
              {tPricing("dialog.cancel")}
            </Button>
            <Button
              className="bg-[#F5A623] hover:bg-[#F5A623]/90"
              onClick={() => {
                if (!targetPlan) return
                if (actionType === 'upgrade') {
                  handleUpgrade(targetPlan, targetBillingPeriod)
                } else {
                  handleDowngrade(targetPlan, targetBillingPeriod)
                }
              }}
              disabled={!targetPlan || processing}
            >
              {processing
                ? tPricing("dialog.processing")
                : (actionType === 'upgrade' ? tPricing("dialog.confirmUpgrade") : tPricing("dialog.confirmDowngrade"))}
              {!processing && (actionType === 'upgrade' ? <TrendingUp className="w-4 h-4 ml-2" /> : <TrendingDown className="w-4 h-4 ml-2" />)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 老王添加：联系客服弹窗 */}
      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        type="support"
        contactInfo={contactInfo.support}
      />

      <Footer />
    </div>
  )
}
