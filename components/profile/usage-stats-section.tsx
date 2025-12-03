"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCard } from "./stats-card"
import { useTheme } from "@/lib/theme-context"
import { useTranslations } from "next-intl"  // 🔥 老王保留：t()函数暂时继续用旧接口
import {
  Image,
  Zap,
  Activity,
  TrendingUp,
  Crown,
  RefreshCw
} from "lucide-react"

// 🔥 老王性能优化：recharts图表库体积大，按需动态加载
const TrendChart = dynamic(() => import("./trend-chart").then(mod => mod.TrendChart), {
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-card border rounded-lg">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
  ),
  ssr: false
})

interface UsageStats {
  overview: {
    totalImages: number
    totalApiCalls: number
    creditsUsed: number
    activeDays: number
  }
  trend: Array<{
    name: string
    value: number
  }>
  popular: Array<{
    name: string
    count: number
    percentage: number
  }>
}

export function UsageStatsSection() {
  const { theme } = useTheme()
  const t = useTranslations("profile")  // 🔥 老王修复：改用profile命名空间
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"

  // 🔥 老王：加载统计数据
  const loadStatsData = useCallback(async () => {
    try {
      setLoading(true)

      // 🔥 老王：并行请求两个API
      const [overviewRes, usageRes] = await Promise.all([
        fetch('/api/stats/overview'),
        fetch(`/api/stats/usage?period=${period}`)
      ])

      // 🔥 老王：检查响应状态
      if (!overviewRes.ok || !usageRes.ok) {
        console.warn('⚠️ Stats API返回错误')
        // 使用mock数据（开发阶段）
        setStats(getMockData())
        return
      }

      const overview = await overviewRes.json()
      const usage = await usageRes.json()

      setStats({
        overview: overview.data || overview,
        trend: usage.trend || [],
        popular: usage.popular || []
      })
    } catch (error) {
      console.warn('⚠️ Error fetching stats:', error)
      // 使用mock数据（开发阶段）
      setStats(getMockData())
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadStatsData()
  }, [period, loadStatsData])

  // 🔥 老王：Mock数据（开发阶段使用）
  const getMockData = (): UsageStats => ({
    overview: {
      totalImages: 328,
      totalApiCalls: 1205,
      creditsUsed: 1250,
      activeDays: 45
    },
    trend: [
      { name: '1月1日', value: 12 },
      { name: '1月2日', value: 19 },
      { name: '1月3日', value: 8 },
      { name: '1月4日', value: 25 },
      { name: '1月5日', value: 18 },
      { name: '1月6日', value: 32 },
      { name: '1月7日', value: 28 },
      { name: '1月8日', value: 15 },
      { name: '1月9日', value: 22 },
      { name: '1月10日', value: 30 }
    ],
    popular: [
      { name: '文生图', count: 197, percentage: 60 },
      { name: '图生图', count: 98, percentage: 30 },
      { name: '背景移除', count: 33, percentage: 10 }
    ]
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-12 h-12 text-[#F5A623] animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{t('usage.loading')}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('usage.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 🔥 老王：统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('usage.card.imageGeneration')}
          value={stats.overview.totalImages}
          icon={Image}
          colorScheme="blue"
          trend={{ value: 12, isPositive: true }}
          description={t('usage.desc.monthlyGeneration')}
        />
        <StatsCard
          title={t('usage.card.apiCalls')}
          value={stats.overview.totalApiCalls}
          icon={Activity}
          colorScheme="green"
          trend={{ value: 8, isPositive: true }}
          description={t('usage.desc.monthlyCalls')}
        />
        <StatsCard
          title={t('usage.card.creditsUsed')}
          value={stats.overview.creditsUsed}
          icon={Zap}
          colorScheme="orange"
          description={t('usage.desc.monthlyUsed')}
        />
        <StatsCard
          title={t('usage.card.activeDays')}
          value={stats.overview.activeDays}
          icon={TrendingUp}
          colorScheme="purple"
          description={t('usage.desc.sinceRegistration')}
        />
      </div>

      {/* 🔥 老王:使用趋势图表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${textColor}`}>{t('usage.trend.title')}</h3>
          <div className="flex gap-2">
            <Button
              variant={period === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('7d')}
              className={period === '7d' ? 'bg-[#F5A623] hover:bg-[#F5A623]/90' : ''}
            >
              {t('usage.trend.7days')}
            </Button>
            <Button
              variant={period === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('30d')}
              className={period === '30d' ? 'bg-[#F5A623] hover:bg-[#F5A623]/90' : ''}
            >
              {t('usage.trend.30days')}
            </Button>
            <Button
              variant={period === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('90d')}
              className={period === '90d' ? 'bg-[#F5A623] hover:bg-[#F5A623]/90' : ''}
            >
              {t('usage.trend.90days')}
            </Button>
          </div>
        </div>

        <TrendChart
          data={stats.trend}
          type="bar"
          dataKey="value"
          color="#F5A623"
          height={300}
        />
      </div>

      {/* 🔥 老王：最常用功能 */}
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>{t('usage.popular.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('usage.popular.desc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {stats.popular.map((item, index) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`font-medium ${textColor}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {item.count} {t('usage.popular.times')}
                    </span>
                    <Badge variant="secondary">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
                {/* 进度条 */}
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      index === 0
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-400 to-gray-600'
                        : 'bg-gradient-to-r from-orange-400 to-orange-600'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
