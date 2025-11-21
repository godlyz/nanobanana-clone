"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageIcon as ImageIconLucide, Loader2, Download, Save, Maximize2 } from "lucide-react"
import Image from "next/image"

interface OutputGalleryProps {
  images: string[]
  language: string
  textColor: string
  mutedColor: string
  inputBg: string
  inputBorder: string
  onImageClick: (imageUrl: string) => void
  onSaveImage?: (imageUrl: string, index: number, name: string) => Promise<void>
  onDownloadImage?: (imageUrl: string, index: number) => void
  emptyMessage?: string
  showSaveInput?: boolean
}

/**
 * 🔥 老王创建的共用组件：输出画廊
 *
 * 功能：
 * - 展示生成的图片
 * - 点击放大预览
 * - 保存图片到云端（可选）
 * - 下载图片到本地
 * - 中英双语支持
 */
export function OutputGallery({
  images,
  language,
  textColor,
  mutedColor,
  inputBg,
  inputBorder,
  onImageClick,
  onSaveImage,
  onDownloadImage,
  emptyMessage,
  showSaveInput = true
}: OutputGalleryProps) {
  const [saveNameInput, setSaveNameInput] = useState("")
  const [savingImageIndex, setSavingImageIndex] = useState<number | null>(null)

  const handleSave = async (imageUrl: string, index: number) => {
    if (!onSaveImage) return
    if (!saveNameInput.trim()) {
      alert(language === 'zh' ? '请输入保存名称' : 'Please enter a name')
      return
    }

    setSavingImageIndex(index)
    try {
      await onSaveImage(imageUrl, index, saveNameInput.trim())
      setSaveNameInput("")
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSavingImageIndex(null)
    }
  }

  const handleDownload = (imageUrl: string, index: number) => {
    if (onDownloadImage) {
      onDownloadImage(imageUrl, index)
    } else {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `generated-${Date.now()}-${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIconLucide className={`w-16 h-16 ${mutedColor} mb-4`} />
        <p className={mutedColor}>
          {emptyMessage || (language === 'zh' ? '还没有生成图片' : 'No images generated yet')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {images.map((img, index) => (
        <div key={index} className="space-y-3">
          {/* 图片点击放大查看 */}
          <div
            className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-[#D97706]"
            onClick={() => onImageClick(img)}
          >
            <Image
              src={img}
              alt={`Generated ${index + 1}`}
              width={1600}
              height={1600}
              className="w-full h-auto rounded-lg object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
            {/* 放大提示图标 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* 操作按钮 */}
          {showSaveInput && onSaveImage ? (
            <div className="flex gap-2">
              <Input
                placeholder={language === 'zh' ? '输入保存名称...' : 'Enter name...'}
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                className={`flex-1 ${inputBg} ${inputBorder}`}
              />
              <Button
                onClick={() => handleSave(img, index)}
                disabled={savingImageIndex === index || !saveNameInput.trim()}
                variant="outline"
                size="icon"
              >
                {savingImageIndex === index ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={() => handleDownload(img, index)}
                variant="outline"
                size="icon"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleDownload(img, index)}
              className="w-full bg-[#D97706] hover:bg-[#B45309] text-white text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'zh' ? '下载图片' : 'Download'}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
