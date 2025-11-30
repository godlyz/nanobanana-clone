import { useState } from "react"

/**
 * 🔥 老王创建的自定义Hook：图片预览状态管理
 *
 * 功能：
 * - 管理预览显示状态
 * - 管理当前预览图片URL
 * - 管理缩放比例
 * - 提供缩放控制函数
 */
export function useImagePreview() {
  const [showPreview, setShowPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(100)

  const openPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl)
    setShowPreview(true)
    setImageZoom(100)
  }

  const closePreview = () => {
    setShowPreview(false)
    setImageZoom(100)
  }

  const zoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 25, 200))
  }

  const zoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 25, 50))
  }

  const resetZoom = () => {
    setImageZoom(100)
  }

  return {
    showPreview,
    previewImage,
    imageZoom,
    openPreview,
    closePreview,
    zoomIn,
    zoomOut,
    resetZoom
  }
}
