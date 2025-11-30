"use client"

import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { ReactNode } from "react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  description?: string
}

// 🔥 老王：颜色配置对象（遵循DRY原则，统一管理颜色）
const colorSchemes = {
  blue: {
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-blue-600 dark:text-blue-400'
  },
  green: {
    gradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    valueColor: 'text-green-600 dark:text-green-400'
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    valueColor: 'text-purple-600 dark:text-purple-400'
  },
  orange: {
    gradient: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    valueColor: 'text-orange-600 dark:text-orange-400'
  },
  red: {
    gradient: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    valueColor: 'text-red-600 dark:text-red-400'
  }
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  colorScheme = 'blue',
  description
}: StatsCardProps) {
  const { theme } = useTheme()
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"

  // 🔥 老王：获取颜色配置
  const colors = colorSchemes[colorScheme]

  return (
    <Card className={`bg-gradient-to-br ${colors.gradient} border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center shadow-md`}>
            <Icon className={`w-6 h-6 ${colors.iconColor}`} />
          </div>

          {/* 🔥 老王：趋势指示器 */}
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className={`text-3xl font-bold ${colors.valueColor}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
