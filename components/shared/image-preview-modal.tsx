"use client"

import { useEffect } from "react"
import { ZoomIn, ZoomOut, RotateCcw, X, Download } from "lucide-react"
import Image from "next/image"

interface ImagePreviewModalProps {
  show: boolean
  imageUrl: string | null
  zoom: number
  language: string
  onClose: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onDownload?: () => void
  downloadFileName?: string
}

/**
 * 🔥 老王创建的共用组件：图片预览模态框
 *
 * 功能：
 * - 全屏预览图片
 * - 缩放控制（25%-200%）
 * - ESC键关闭
 * - 下载功能
 * - 中英双语支持
 */
export function ImagePreviewModal({
  show,
  imageUrl,
  zoom,
  language,
  onClose,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onDownload,
  downloadFileName = `preview-${Date.now()}.png`
}: ImagePreviewModalProps) {
  // 键盘事件监听 - ESC关闭预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  // 默认下载处理
  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (imageUrl) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = downloadFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!show || !imageUrl) return null

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 预览容器 */}
      <div className="relative max-w-7xl max-h-full w-full h-full flex flex-col">
        {/* 控制栏 */}
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-black/50 rounded-lg">
          {/* 缩放控制 */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onZoomOut()
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={language === 'zh' ? '缩小 (-25%)' : 'Zoom Out (-25%)'}
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white font-medium min-w-[80px] text-center">
              {zoom}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onZoomIn()
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={language === 'zh' ? '放大 (+25%)' : 'Zoom In (+25%)'}
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onZoomReset()
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={language === 'zh' ? '重置缩放' : 'Reset Zoom'}
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 下载和关闭按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {language === 'zh' ? '下载图片' : 'Download'}
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

        {/* 图片展示区域 */}
        <div
          className="flex-1 flex items-center justify-center overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-full max-w-full max-h-full">
            <Image
              src={imageUrl}
              alt="Preview"
              fill
              className="object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
              sizes="100vw"
            />
          </div>
        </div>

        {/* 提示文本 */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            {language === 'zh' ? '提示：按 ESC 键关闭 | 鼠标滚轮缩放' : 'Tip: Press ESC to close | Mouse wheel to zoom'}
          </p>
        </div>
      </div>
    </div>
  )
}
