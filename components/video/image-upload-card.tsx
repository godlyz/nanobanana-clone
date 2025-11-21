"use client"

// 🔥 老王的ImageUploadCard组件 - 视频生成用的图片上传卡片
// 支持本地上传 + 从历史记录选择

import React, { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Upload, History, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ImageSource {
  type: "local" | "history"
  historyId?: string
  imageIndex?: number
  generationType?: string
  toolType?: string | null
  prompt?: string
  createdAt?: string
}

export interface ImageUploadCardProps {
  /** 图片标题（如"参考图片1"、"第一帧"） */
  title: string
  /** 当前图片URL（base64或远程URL） */
  imageUrl: string | null
  /** 图片来源元数据 */
  imageSource?: ImageSource | null
  /** 本地上传回调 */
  onLocalUpload: (base64: string) => void
  /** 从历史记录选择回调 */
  onHistorySelect: () => void
  /** 删除图片回调 */
  onRemove: () => void
  /** 是否禁用（如正在生成中） */
  disabled?: boolean
  /** 自定义样式类名 */
  className?: string
  /** 翻译文本 */
  t: {
    uploadLocal: string
    selectFromHistory: string
    remove: string
    sourceLocal: string
    sourceHistory: string
    dragOrClick: string
  }
}

/**
 * 🔥 图片上传卡片组件
 * 老王专门为视频生成设计的图片上传组件，支持本地上传和历史记录选择
 */
export function ImageUploadCard({
  title,
  imageUrl,
  imageSource,
  onLocalUpload,
  onHistorySelect,
  onRemove,
  disabled = false,
  className,
  t,
}: ImageUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // 🔥 处理本地文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件！")
      return
    }

    // 验证文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过10MB！")
      return
    }

    // 读取文件并转换为base64
    const reader = new FileReader()
    reader.onloadend = () => {
      onLocalUpload(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 🔥 拖拽上传处理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件！")
      return
    }

    // 验证文件大小
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过10MB！")
      return
    }

    // 读取文件
    const reader = new FileReader()
    reader.onloadend = () => {
      onLocalUpload(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 🔥 触发文件选择
  const handleClickUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        {/* 标题 */}
        <div className="mb-3 font-medium text-sm text-foreground">
          {title}
        </div>

        {/* 图片预览区域 或 上传占位区 */}
        {imageUrl ? (
          <div className="relative group">
            {/* 图片预览 */}
            <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 悬浮删除按钮 */}
            {!disabled && (
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title={t.remove}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* 图片来源标签 */}
            {imageSource && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                {imageSource.type === "local" ? (
                  <>
                    <Upload className="w-3 h-3" />
                    {t.sourceLocal}
                  </>
                ) : (
                  <>
                    <History className="w-3 h-3" />
                    {t.sourceHistory}
                    {imageSource.prompt && (
                      <span className="ml-1 truncate max-w-[200px]">
                        ({imageSource.prompt.slice(0, 30)}...)
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 上传占位区 */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            className={cn(
              "aspect-video w-full rounded-md border-2 border-dashed cursor-pointer transition-all",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
              <p className="text-sm font-medium">{t.dragOrClick}</p>
            </div>
          </div>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {/* 操作按钮组 */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClickUpload}
            disabled={disabled}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {t.uploadLocal}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHistorySelect}
            disabled={disabled}
            className="flex-1"
          >
            <History className="w-4 h-4 mr-1.5" />
            {t.selectFromHistory}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
