"use client"

/**
 * 🔥 老王的成就徽章组件
 * 用途: 展示单个成就徽章
 * 老王警告: 徽章要好看，用户才有收集的欲望！
 */

import React from 'react'
import { Lock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import type { AchievementDefinition, AchievementTier } from '@/types/achievement'
import { ACHIEVEMENT_TIER_CONFIG } from '@/types/achievement'

interface AchievementBadgeProps {
  achievement: AchievementDefinition
  isUnlocked: boolean
  unlockedAt?: string
  progress?: number
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  unlockedAt,
  progress = 0,
  showTooltip = true,
  size = 'md',
  onClick
}: AchievementBadgeProps) {
  const tierConfig = ACHIEVEMENT_TIER_CONFIG[achievement.tier as AchievementTier]

  // 尺寸配置
  const sizeConfig = {
    sm: {
      container: 'w-12 h-12',
      icon: 'text-xl',
      border: 'border-2'
    },
    md: {
      container: 'w-16 h-16',
      icon: 'text-2xl',
      border: 'border-2'
    },
    lg: {
      container: 'w-20 h-20',
      icon: 'text-3xl',
      border: 'border-3'
    }
  }

  const { container, icon, border } = sizeConfig[size]

  // 进度百分比
  const progressPercent = isUnlocked
    ? 100
    : Math.min(100, Math.round((progress / achievement.condition_value) * 100))

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const badgeContent = (
    <div
      className={`
        relative ${container} rounded-full flex items-center justify-center
        ${border} transition-all cursor-pointer
        ${isUnlocked
          ? `${tierConfig.bgColor} ${tierConfig.borderColor} hover:scale-110`
          : 'bg-gray-100 border-gray-200 grayscale opacity-60 hover:opacity-80'
        }
      `}
      onClick={onClick}
    >
      {/* 徽章图标 */}
      <span className={icon}>
        {isUnlocked ? (
          achievement.badge_icon || '🏆'
        ) : (
          <Lock className="h-5 w-5 text-gray-400" />
        )}
      </span>

      {/* 未解锁时的进度环 */}
      {!isUnlocked && progressPercent > 0 && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 36 36"
        >
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progressPercent} 100`}
            className="text-purple-400"
          />
        </svg>
      )}
    </div>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{achievement.badge_icon || '🏆'}</span>
              <span className="font-medium">{achievement.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${tierConfig.bgColor} ${tierConfig.color}`}>
                {tierConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{achievement.description}</p>
            {isUnlocked ? (
              <p className="text-xs text-green-600">
                ✓ 已解锁 {unlockedAt && `· ${formatDate(unlockedAt)}`}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                进度: {progress}/{achievement.condition_value} ({progressPercent}%)
              </p>
            )}
            <p className="text-xs text-purple-600">+{achievement.points} 点数</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// 🔥 老王备注：
// 1. 支持3种尺寸 sm/md/lg
// 2. 未解锁时显示灰色锁图标
// 3. 未解锁时显示进度环
// 4. Tooltip显示详细信息
// 5. 等级用不同颜色区分
