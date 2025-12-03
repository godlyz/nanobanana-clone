/**
 * 🔥 老王创建：论坛统计卡片组件
 * 用途：展示论坛关键统计数据
 * 日期：2025-11-25
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Users, MessageSquare, FileText, BarChart3, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * ForumStatsCard - 论坛统计卡片组件
 *
 * Features:
 * - 展示论坛关键统计数据（发帖数、回复数、活跃用户数、参与度等）
 * - 自动刷新（每60秒）
 * - 手动刷新按钮
 * - 骨架屏加载状态
 * - 增长率指示器（正增长显示绿色↑，负增长显示红色↓）
 * - 双语支持
 * - 响应式设计
 *
 * Props:
 * - autoRefresh: 是否自动刷新（默认 true）
 * - refreshInterval: 刷新间隔毫秒数（默认 60000 = 60秒）
 * - period: 统计周期（'day' | 'week' | 'month' | 'year'，默认 'month'）
 * - days: 获取最近N天的数据（默认 30）
 * - onDataUpdate: 数据更新回调
 */

interface ForumStatsCardProps {
  autoRefresh?: boolean
  refreshInterval?: number
  period?: 'day' | 'week' | 'month' | 'year'
  days?: number
  onDataUpdate?: (data: ForumAnalytics) => void
}

interface ForumAnalytics {
  summary: {
    total_posts: number
    total_replies: number
    engagement_rate: number
    avg_replies_per_thread: number
    thread_growth_rate: number
    reply_growth_rate: number
  }
  top_contributors: Array<{
    user_id: string
    display_name: string
    avatar_url: string | null
    contribution_count: number
  }>
  category_distribution: Array<{
    name: string
    name_en: string
    count: number
    percentage: string
  }>
  meta: {
    period: string
    days: number
    start_date: string
    end_date: string
    duration_ms: number
  }
}

export function ForumStatsCard({
  autoRefresh = true,
  refreshInterval = 60000,
  period = 'month',
  days = 30,
  onDataUpdate,
}: ForumStatsCardProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const [data, setData] = useState<ForumAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 获取统计数据
  const fetchStats = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        period,
        days: days.toString(),
      })

      const response = await fetch(`/api/forum/analytics?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setData(result.data)
      setLastUpdate(new Date())

      if (onDataUpdate) {
        onDataUpdate(result.data)
      }

    } catch (err: any) {
      console.error('Failed to fetch forum stats:', err)
      setError(err.message || 'Failed to load statistics')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [period, days, onDataUpdate])

  // 初始加载
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return

    const timer = setInterval(() => {
      fetchStats(true)
    }, refreshInterval)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, fetchStats])

  // 手动刷新
  const handleManualRefresh = () => {
    fetchStats(true)
  }

  // 格式化数字（千位分隔符）
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
  }

  // 格式化增长率
  const formatGrowthRate = (rate: number): string => {
    const sign = rate > 0 ? '+' : ''
    return `${sign}${rate.toFixed(1)}%`
  }

  // 渲染增长率指示器
  const renderGrowthIndicator = (rate: number) => {
    if (rate > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
          <TrendingUp className="h-3 w-3" />
          <span>{formatGrowthRate(rate)}</span>
        </div>
      )
    } else if (rate < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
          <TrendingDown className="h-3 w-3" />
          <span>{formatGrowthRate(rate)}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <span>0.0%</span>
        </div>
      )
    }
  }

  // 骨架屏加载状态
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 错误状态
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {language === 'zh' ? '论坛统计' : 'Forum Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">{error || (language === 'zh' ? '加载失败' : 'Failed to load')}</p>
            <Button variant="outline" size="sm" onClick={handleManualRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'zh' ? '重试' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'zh' ? '论坛统计' : 'Forum Statistics'}
            </CardTitle>
            <CardDescription>
              {language === 'zh'
                ? `最近 ${data.meta.days} 天的统计数据`
                : `Statistics for the last ${data.meta.days} days`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
            title={language === 'zh' ? '刷新数据' : 'Refresh data'}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 关键指标网格 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 发帖总数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              <span>{language === 'zh' ? '发帖数' : 'Threads'}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(data.summary.total_posts)}
            </div>
            {renderGrowthIndicator(data.summary.thread_growth_rate)}
          </div>

          {/* 回复总数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="h-4 w-4" />
              <span>{language === 'zh' ? '回复数' : 'Replies'}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {formatNumber(data.summary.total_replies)}
            </div>
            {renderGrowthIndicator(data.summary.reply_growth_rate)}
          </div>

          {/* 参与度 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              <span>{language === 'zh' ? '参与度' : 'Engagement'}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {data.summary.engagement_rate.toFixed(2)}
            </div>
            <div className="text-muted-foreground text-xs">
              {language === 'zh' ? '回复/帖子比' : 'Replies per thread'}
            </div>
          </div>

          {/* 平均回复数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>{language === 'zh' ? '平均回复' : 'Avg Replies'}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {data.summary.avg_replies_per_thread.toFixed(1)}
            </div>
            <div className="text-muted-foreground text-xs">
              {language === 'zh' ? '每个帖子' : 'Per thread'}
            </div>
          </div>
        </div>

        {/* 最后更新时间 */}
        {lastUpdate && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
            {language === 'zh' ? '最后更新：' : 'Last updated: '}
            {lastUpdate.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
