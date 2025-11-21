"use client"

import { Download, X } from "lucide-react"
import { useEffect } from "react"

// 🔥 老王创建：视频播放器 Modal 组件（从 page.tsx 提取，遵循单一职责原则）

interface VideoPlayerModalProps {
  isOpen: boolean
  videoUrl: string | null
  onClose: () => void
  title?: string
}

export function VideoPlayerModal({
  isOpen,
  videoUrl,
  onClose,
  title = "视频预览"
}: VideoPlayerModalProps) {
  // 🔥 老王添加：ESC 键关闭功能
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 🔥 老王添加：防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // 下载视频
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoUrl) return

    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `ai-generated-video-${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="w-full h-full max-w-7xl mx-auto p-8 flex flex-col">
        {/* 控制栏 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {/* 下载和关闭按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载视频
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="关闭 (ESC)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 视频播放器区域 */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              您的浏览器不支持视频播放。
            </video>
          )}
        </div>

        {/* 提示文本 */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            提示：按 ESC 键关闭 | 点击控件暂停/播放
          </p>
        </div>
      </div>
    </div>
  )
}
