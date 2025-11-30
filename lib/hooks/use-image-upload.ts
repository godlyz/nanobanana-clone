import { useState, useCallback } from "react"
import imageCompression from "browser-image-compression"

/**
 * useImageUpload - 图片上传 Hook
 *
 * Features:
 * - 自动图片压缩（browser-image-compression）
 * - 上传进度跟踪
 * - 错误处理
 * - 支持关联帖子/回复 ID
 *
 * 压缩配置：
 * - 最大宽度/高度：1920px
 * - 最大文件大小：2MB（压缩后）
 * - 保持宽高比
 * - 初始质量：0.8
 *
 * 返回值：
 * - uploadImage: 上传函数
 * - isUploading: 上传中状态
 * - progress: 上传进度（0-100）
 * - error: 错误信息
 */

interface UploadImageOptions {
  threadId?: string
  replyId?: string
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

interface UploadResult {
  url: string
  path: string
  fileName: string
  fileSize: number
  mimeType: string
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /**
   * 压缩图片
   */
  const compressImage = useCallback(async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2, // 最大 2MB
      maxWidthOrHeight: 1920, // 最大 1920px
      useWebWorker: true, // 使用 Web Worker 提升性能
      initialQuality: 0.8, // 初始质量 80%
      fileType: file.type as
        | "image/jpeg"
        | "image/jpg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      onProgress: (progressPercent: number) => {
        // 压缩进度占总进度的 30%
        setProgress(Math.floor(progressPercent * 0.3))
      },
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (err) {
      console.error("Image compression failed:", err)
      // 如果压缩失败，返回原文件
      return file
    }
  }, [])

  /**
   * 上传图片
   */
  const uploadImage = useCallback(
    async (
      file: File,
      options: UploadImageOptions = {}
    ): Promise<UploadResult | null> => {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      try {
        // 1. 压缩图片
        setProgress(10)
        const compressedFile = await compressImage(file)

        // 2. 构建 FormData
        setProgress(40)
        const formData = new FormData()
        formData.append("image", compressedFile)

        if (options.threadId) {
          formData.append("threadId", options.threadId)
        }

        if (options.replyId) {
          formData.append("replyId", options.replyId)
        }

        // 3. 上传到服务器
        setProgress(50)
        const res = await fetch("/api/forum/upload-image", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "上传失败")
        }

        setProgress(100)
        setIsUploading(false)

        // 4. 触发成功回调
        if (options.onSuccess) {
          options.onSuccess(data.url)
        }

        return data as UploadResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "图片上传失败，请稍后重试"

        setError(errorMessage)
        setIsUploading(false)
        setProgress(0)

        // 触发错误回调
        if (options.onError) {
          options.onError(errorMessage)
        }

        return null
      }
    },
    [compressImage]
  )

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  return {
    uploadImage,
    isUploading,
    progress,
    error,
    reset,
  }
}
