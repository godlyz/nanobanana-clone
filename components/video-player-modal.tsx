"use client"

import { Download, X, Loader2, Copy, Check, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { SocialShareButtons } from "@/components/social-share-buttons"
import { VideoShareModal } from "@/components/video-share-modal"
import { VideoExtendDialog } from "@/components/video/video-extend-dialog"

// 🔥 老王创建：视频播放器 Modal 组件（从 page.tsx 提取，遵循单一职责原则）
// 🔥 老王升级：添加国际化支持、提示词显示、更好的下载体验、社交分享功能

interface VideoPlayerModalProps {
  isOpen: boolean
  videoUrl: string | null
  onClose: () => void
  title?: string
  prompt?: string  // 🔥 老王新增：显示视频提示词
  duration?: number  // 🔥 老王新增：视频时长
  resolution?: string  // 🔥 老王新增：视频分辨率
  videoId?: string  // 🔥 老王新增：视频ID用于分享
  canShare?: boolean  // 🔥 老王新增：是否可以分享
  sourceVideoId?: string | null  // 🔥 老王新增：源视频ID（延长链）
  extensionChain?: Array<{ id: string; duration: number }>  // 🔥 老王新增：延长链历史
  geminiVideoUri?: string  // 🔥 老王新增：Gemini视频URI（延长必需）
  onExtendSuccess?: () => void  // 🔥 老王新增：延长成功回调
}

export function VideoPlayerModal({
  isOpen,
  videoUrl,
  onClose,
  title,
  prompt,
  duration,
  resolution,
  videoId,
  canShare = false,
  sourceVideoId,
  extensionChain = [],
  geminiVideoUri,
  onExtendSuccess,
}: VideoPlayerModalProps) {
  const { language } = useLanguage()
  const [isDownloading, setIsDownloading] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)  // 🔥 老王新增：延长对话框状态

  // 默认标题国际化
  const displayTitle = title || (language === 'zh' ? '视频预览' : 'Video Preview')

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

  // 🔥 老王升级：改进的下载视频功能（支持API下载和直接下载两种方式）
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoUrl) return

    setIsDownloading(true)
    try {
      // 尝试使用download API（可以处理跨域视频）
      const response = await fetch('/api/video/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-video-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // 回退方案：直接使用链接下载
        const link = document.createElement('a')
        link.href = videoUrl
        link.download = `ai-video-${Date.now()}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch {
      // 出错时直接用链接下载
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `ai-video-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsDownloading(false)
    }
  }

  // 🔥 老王新增：复制提示词功能
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!prompt) return

    try {
      await navigator.clipboard.writeText(prompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch {
      console.error('复制失败')
    }
  }

  // 🔥 老王新增：判断是否显示延长按钮
  const shouldShowExtendButton = () => {
    // 必须有videoId
    if (!videoId) return false

    // 必须是720p（1080p不支持延长）
    if (resolution !== '720p') return false

    // 必须有geminiVideoUri（只有Veo生成的视频才能延长）
    if (!geminiVideoUri) return false

    // 延长后总时长不能超过148秒
    const newDuration = (duration || 0) + 7
    if (newDuration > 148) return false

    return true
  }

  // 🔥 老王新增：处理延长视频
  const handleExtendVideo = async (videoId: string, extendPrompt: string) => {
    try {
      const response = await fetch('/api/video/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_video_id: videoId,
          prompt: extendPrompt,
          person_generation: 'allow_adult', // 默认使用allow_adult
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || '延长视频失败')
      }

      const result = await response.json()
      console.log('✅ 视频延长任务创建成功:', result)

      // 调用成功回调
      if (onExtendSuccess) {
        onExtendSuccess()
      }
    } catch (error: any) {
      console.error('❌ 延长视频失败:', error)
      throw error
    }
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
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{displayTitle}</h2>
            {/* 🔥 老王新增：视频信息标签 */}
            {(duration || resolution) && (
              <div className="flex items-center gap-2">
                {duration && (
                  <span className="px-2 py-1 bg-white/10 rounded text-white/80 text-sm">
                    {duration}s
                  </span>
                )}
                {resolution && (
                  <span className="px-2 py-1 bg-white/10 rounded text-white/80 text-sm">
                    {resolution}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 社交分享、延长、下载和关闭按钮 */}
          <div className="flex items-center gap-3">
            {/* 🔥 老王新增（2025-11-23）：社交媒体分享按钮（Twitter/Facebook/LinkedIn等） */}
            {videoId && videoUrl && (
              <SocialShareButtons
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/video/${videoId}`}
                title={prompt?.slice(0, 100) || title || (language === 'zh' ? '我用 Nano Banana 创作的AI视频' : 'My AI video created with Nano Banana')}
                description={prompt || (language === 'zh' ? '看看我用 Nano Banana 创作的AI视频！' : 'Check out my AI video created with Nano Banana!')}
                imageUrl={videoUrl}
                hashtags={['NanoBanana', 'AIVideo', 'AIArt']}
                size="default"
                className="shrink-0"
              />
            )}
            {/* 🔥 老王新增：延长按钮 */}
            {shouldShowExtendButton() && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExtendDialogOpen(true)
                }}
                className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {language === 'zh' ? '延长' : 'Extend'}
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#D97706]/50 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {language === 'zh' ? '下载视频' : 'Download'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={language === 'zh' ? '关闭 (ESC)' : 'Close (ESC)'}
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
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              {language === 'zh' ? '您的浏览器不支持视频播放。' : 'Your browser does not support video playback.'}
            </video>
          )}
        </div>

        {/* 🔥 老王新增：提示词显示区域 */}
        {prompt && (
          <div
            className="mt-4 bg-white/5 rounded-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/80 text-sm font-medium">
                {language === 'zh' ? '提示词' : 'Prompt'}
              </h3>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                {promptCopied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">
                      {language === 'zh' ? '已复制' : 'Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{language === 'zh' ? '复制' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-white/60 text-sm line-clamp-3">
              {prompt}
            </p>
          </div>
        )}

        {/* 提示文本 */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            {language === 'zh'
              ? '提示：按 ESC 键关闭 | 点击控件暂停/播放'
              : 'Tip: Press ESC to close | Click controls to pause/play'}
          </p>
        </div>
      </div>

      {/* 🔥 老王新增：视频分享Modal */}
      {videoId && (
        <VideoShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          videoId={videoId}
          videoPrompt={prompt}
          onSuccess={() => setIsShareModalOpen(false)}
        />
      )}

      {/* 🔥 老王新增：视频延长对话框 */}
      {videoId && prompt && (
        <VideoExtendDialog
          open={isExtendDialogOpen}
          onOpenChange={setIsExtendDialogOpen}
          videoId={videoId}
          currentDuration={duration || 0}
          resolution={resolution || '720p'}
          prompt={prompt}
          sourceVideoId={sourceVideoId}
          extensionChain={extensionChain}
          onConfirm={handleExtendVideo}
        />
      )}
    </div>
  )
}
