"use client"

/**
 * 🔥 老王的成就列表组件
 * 用途: 展示用户成就墙
 * 老王警告: 成就墙要能激励用户继续努力！
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, Loader2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { AchievementBadge } from './achievement-badge'
import type { AchievementProgress, AchievementTier } from '@/types/achievement'
import { ACHIEVEMENT_TIER_CONFIG } from '@/types/achievement'

interface AchievementListProps {
  userId?: string  // 不传则显示当前用户
  showProgress?: boolean  // 是否显示进度（只有自己能看）
  compact?: boolean  // 紧凑模式
}

export function AchievementList({
  userId,
  showProgress = true,
  compact = false
}: AchievementListProps) {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<AchievementTier | 'all'>('all')
  const [stats, setStats] = useState({
    unlocked_count: 0,
    total_count: 0,
    total_points: 0
  })

  // 获取成就进度
  const fetchAchievements = useCallback(async () => {
    setLoading(true)
    try {
      // 如果是看自己的，用progress API；看别人的，用user API
      const endpoint = showProgress && !userId
        ? '/api/achievements/progress'
        : `/api/achievements/user${userId ? `?user_id=${userId}` : ''}`

      const res = await fetch(endpoint)
      const data = await res.json()

      if (data.success) {
        if (showProgress && !userId) {
          // progress API 返回格式
          setAchievements(data.data)
          setStats(data.stats)
        } else {
          // user API 返回格式 - 需要转换
          const progressData: AchievementProgress[] = data.data.map((item: { achievement: AchievementProgress['achievement']; unlocked_at: string }) => ({
            achievement: item.achievement,
            current_value: item.achievement.condition_value,
            target_value: item.achievement.condition_value,
            progress_percent: 100,
            is_unlocked: true,
            unlocked_at: item.unlocked_at
          }))
          setAchievements(progressData)
          setStats({
            unlocked_count: data.stats.unlocked_count,
            total_count: data.stats.total_achievements,
            total_points: data.stats.total_points
          })
        }
      }
    } catch (error) {
      console.error('获取成就失败:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, showProgress])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  // 筛选成就
  const filteredAchievements = achievements.filter(item => {
    if (tierFilter === 'all') return true
    return item.achievement.tier === tierFilter
  })

  // 分组显示（按是否解锁）
  const unlockedAchievements = filteredAchievements.filter(a => a.is_unlocked)
  const lockedAchievements = filteredAchievements.filter(a => !a.is_unlocked)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (compact) {
    // 紧凑模式：只显示已解锁的徽章
    return (
      <div className="flex flex-wrap gap-2">
        {unlockedAchievements.slice(0, 8).map(item => (
          <AchievementBadge
            key={item.achievement.id}
            achievement={item.achievement}
            isUnlocked={true}
            unlockedAt={item.unlocked_at}
            size="sm"
          />
        ))}
        {unlockedAchievements.length > 8 && (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">
            +{unlockedAchievements.length - 8}
          </div>
        )}
        {unlockedAchievements.length === 0 && (
          <p className="text-sm text-gray-400">暂无成就</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-8 w-8" />
          <div>
            <h3 className="text-lg font-bold">成就墙</h3>
            <p className="text-purple-100 text-sm">
              已解锁 {stats.unlocked_count}/{stats.total_count} 个成就
            </p>
          </div>
        </div>
        <Progress
          value={(stats.unlocked_count / stats.total_count) * 100}
          className="h-2 bg-purple-400"
        />
        <div className="mt-4 flex items-center justify-between text-sm">
          <span>完成度 {Math.round((stats.unlocked_count / stats.total_count) * 100)}%</span>
          <span>总点数 {stats.total_points}</span>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select
          value={tierFilter}
          onValueChange={(v) => setTierFilter(v as AchievementTier | 'all')}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            {(Object.entries(ACHIEVEMENT_TIER_CONFIG) as [AchievementTier, typeof ACHIEVEMENT_TIER_CONFIG['bronze']][]).map(([tier, config]) => (
              <SelectItem key={tier} value={tier}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 已解锁成就 */}
      {unlockedAchievements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            已解锁 ({unlockedAchievements.length})
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {unlockedAchievements.map(item => (
              <AchievementBadge
                key={item.achievement.id}
                achievement={item.achievement}
                isUnlocked={true}
                unlockedAt={item.unlocked_at}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* 未解锁成就（仅自己可见） */}
      {showProgress && !userId && lockedAchievements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            待解锁 ({lockedAchievements.length})
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {lockedAchievements.map(item => (
              <AchievementBadge
                key={item.achievement.id}
                achievement={item.achievement}
                isUnlocked={false}
                progress={item.current_value}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {filteredAchievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无成就</p>
        </div>
      )}
    </div>
  )
}

// 🔥 老王备注：
// 1. 支持查看自己或别人的成就
// 2. 自己可以看进度，别人只能看已解锁
// 3. compact模式适合在个人主页展示
// 4. 支持按等级筛选
// 5. 顶部显示统计信息和进度条
