"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  TrendingUp,
  Calendar,
  Zap,
  Clock,
  Snowflake
} from "lucide-react"
import type { SubscriptionData } from "@/hooks/use-profile-data"

interface SubscriptionManagementSectionV2Props {
  subscriptions: SubscriptionData[]
  loading?: boolean
}

/**
 * 🔥 老王重构：订阅管理组件 V2
 *
 * 功能：显示所有订阅（包括激活和冻结的）
 * - 激活订阅：绿色卡片，显示剩余月数
 * - 冻结订阅：蓝色卡片，显示冻结至时间和冻结积分
 * - 过期订阅：灰色卡片
 */
export function SubscriptionManagementSectionV2({ subscriptions, loading }: SubscriptionManagementSectionV2Props) {
  const { language, t } = useLanguage()
  const { theme } = useTheme()
  const router = useRouter()

  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"

  // 🔥 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 🔥 获取状态Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t('profile.subscription.status.active')}
          </Badge>
        )
      case 'frozen':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Snowflake className="w-3 h-3 mr-1" />
            {t('profile.subscription.status.frozen')}
          </Badge>
        )
      case 'inactive':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            {t('profile.subscription.status.inactive')}
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
            {t('profile.subscription.status.expired')}
          </Badge>
        )
      default:
        return null
    }
  }

  // 🔥 获取卡片样式
  const getCardStyle = (status: string) => {
    switch (status) {
      case 'active':
        return "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800"
      case 'frozen':
        return "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800"
      case 'inactive':
        return "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800"
      case 'expired':
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-900/30 border border-gray-200 dark:border-gray-800"
      default:
        return cardBg
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

  if (subscriptions.length === 0) {
    return (
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>
                {t('profile.subscription.title')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.subscription.desc')}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-900/30 border border-gray-200 dark:border-gray-800">
            <h4 className={`text-lg font-bold ${textColor} mb-2`}>
              {t('profile.subscription.freePlan')}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t('profile.subscription.upgradeDesc')}
            </p>
          </div>

          <Button
            className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white w-full mt-4"
            onClick={() => router.push('/pricing')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('profile.subscription.button.upgrade')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`${cardBg} border shadow-lg`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textColor}`}>
              {t('profile.subscription.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('profile.subscription.count').replace('{count}', subscriptions.length.toString())}
            </p>
          </div>
        </div>

        {/* 订阅列表 */}
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div key={sub.id} className={`p-4 rounded-lg ${getCardStyle(sub.status)}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-lg font-bold ${textColor}`}>
                      {t(`profile.subscription.plan.${sub.plan}`) || sub.plan}
                    </h4>
                    {getStatusBadge(sub.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.billing_cycle === 'yearly' ? t('profile.subscription.billing.yearly') : t('profile.subscription.billing.monthly')}
                  </p>
                </div>
                <div className="text-right">
                  {sub.status === 'frozen' ? (
                    <Snowflake className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Zap className="w-6 h-6 text-[#F5A623]" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {t('profile.subscription.field.startDate')}
                  </p>
                  <p className={`font-medium ${textColor}`}>{formatDate(sub.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {t('profile.subscription.field.expiryDate')}
                  </p>
                  <p className={`font-medium ${textColor}`}>{formatDate(sub.endDate)}</p>
                </div>
              </div>

              {/* 🔥 剩余月数显示（所有订阅都显示"剩余X个月未使用"） */}
              {(sub.status === 'active' || sub.status === 'inactive' || sub.status === 'frozen') && sub.remainingMonths !== undefined && (
                <div className={`pt-3 border-t ${
                  sub.status === 'active' ? 'border-green-200 dark:border-green-800' :
                  sub.status === 'frozen' ? 'border-blue-200 dark:border-blue-800' :
                  'border-orange-200 dark:border-orange-800'
                }`}>
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    <Clock className={`w-4 h-4 ${
                      sub.status === 'active' ? 'text-green-600 dark:text-green-400' :
                      sub.status === 'frozen' ? 'text-blue-600 dark:text-blue-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`} />
                    <span className={`font-semibold ${textColor}`}>
                      {t('profile.subscription.remaining.months').replace('{count}', sub.remainingMonths.toString())}
                    </span>

                    {/* 🔥 冻结订阅额外信息 */}
                    {sub.status === 'frozen' && (
                      <>
                        {sub.frozenCredits !== undefined && sub.frozenCredits > 0 && (
                          <span className={`font-semibold ${textColor}`}>
                            ，{t('profile.subscription.frozen.credits')} {sub.frozenCredits}{t('profile.subscription.unit.credits')}
                          </span>
                        )}
                        {sub.frozenUntil && sub.remaining_days !== undefined && (
                          <span className={`font-semibold ${textColor}`}>
                            ，{t('profile.subscription.frozen.remaining')} {sub.remaining_days}{t('profile.subscription.unit.days')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4">
          <Button
            className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white flex-1"
            onClick={() => router.push('/pricing')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('profile.subscription.button.viewPlans')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
