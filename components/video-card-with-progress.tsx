"use client"

/**
 * 🔥 老王新增：视频生成进度卡片组件
 * 用于在历史画廊中显示"生成中"状态的视频任务
 *
 * 特性：
 * - 显示 Spinner 动画加载图标
 * - 显示状态文字 + 耗时计时器
 * - 显示进度条（processing 50%, downloading 90%）
 * - 显示提示词预览
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { HistoryImage } from './shared/history-gallery'

interface VideoCardWithProgressProps {
  video: HistoryImage
  language: string
  onComplete?: () => void // 🔥 任务完成回调（刷新画廊）
}

export function VideoCardWithProgress({
  video,
  language,
  onComplete
}: VideoCardWithProgressProps) {
  const [currentStatus, setCurrentStatus] = useState(video.status)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 🔥 计算进度百分比（根据状态）
  const getProgress = (status?: string) => {
    switch(status) {
      case 'processing': return 50
      case 'downloading': return 90
      case 'completed': return 100
      default: return 0
    }
  }

  // 🔥 轮询任务状态（每10秒一次）
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/v1/video/status/${video.id}`)
        if (response.ok) {
          const data = await response.json()
          setCurrentStatus(data.status)
          setProgress(getProgress(data.status))

          // 🔥 任务完成，触发回调
          if (data.status === 'completed' && onComplete) {
            onComplete()
          }
        }
      } catch (error) {
        console.error('❌ 轮询视频状态失败:', error)
      }
    }

    // 初始化进度
    setProgress(getProgress(video.status))

    // 启动轮询（仅当任务未完成时）
    if (currentStatus === 'processing' || currentStatus === 'downloading') {
      const interval = setInterval(pollStatus, 10000) // 每10秒轮询一次
      return () => clearInterval(interval)
    }
  }, [video.id, video.status, currentStatus, onComplete])

  // 🔥 耗时计时器（从创建时间开始计算）
  useEffect(() => {
    const startTime = new Date(video.created_at).getTime()

    const updateElapsedTime = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000) // 秒
      setElapsedTime(elapsed)
    }

    updateElapsedTime() // 立即更新一次
    const timer = setInterval(updateElapsedTime, 1000) // 每秒更新

    return () => clearInterval(timer)
  }, [video.created_at])

  // 🔥 格式化耗时（1:23 格式）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 🔥 状态文本
  const getStatusText = () => {
    switch(currentStatus) {
      case 'processing':
        return language === 'zh' ? '生成中...' : 'Generating...'
      case 'downloading':
        return language === 'zh' ? '下载中...' : 'Downloading...'
      case 'completed':
        return language === 'zh' ? '已完成' : 'Completed'
      case 'failed':
        return language === 'zh' ? '生成失败' : 'Failed'
      default:
        return language === 'zh' ? '等待中...' : 'Waiting...'
    }
  }

  return (
    <div className="relative w-24 h-24 rounded-lg border border-[#D97706]/40 bg-black/10 overflow-hidden">
      {/* 🔥 加载图标 */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/50 to-black/30">
        <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
      </div>

      {/* 🔥 状态文字 + 耗时 */}
      <div className="absolute top-2 left-2 right-2 text-center">
        <div className="text-xs font-semibold text-white drop-shadow-md">
          {getStatusText()}
        </div>
        <div className="text-xs text-white/80 mt-0.5">
          ({formatTime(elapsedTime)})
        </div>
      </div>

      {/* 🔥 进度条 */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-white/70 text-center mt-0.5">
          {progress}%
        </div>
      </div>

      {/* 🔥 Tooltip：提示词预览 */}
      <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap max-w-xs overflow-hidden text-ellipsis z-50">
        <div className="font-semibold mb-1">
          {language === 'zh' ? '提示词' : 'Prompt'}
        </div>
        <div className="opacity-80 line-clamp-2">
          {video.prompt}
        </div>
      </div>
    </div>
  )
}
