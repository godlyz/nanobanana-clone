"use client"

// 🔥 老王的HistoryImagePickerModal组件 - 历史图片选择器
// 从用户历史生成记录中选择图片作为视频参考

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImageSource } from "./image-upload-card"

export interface HistoryImage {
  id: string
  url: string
  thumbnail_url: string
  image_name: string | null
  prompt: string
  generation_type: "text_to_image" | "image_to_image"
  tool_type: string | null
  created_at: string
  record_id: string
  image_index: number
}

export interface HistoryImagePickerModalProps {
  /** 是否打开Modal */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 选择图片回调 */
  onSelect: (imageUrl: string, imageSource: ImageSource) => void
  /** 翻译文本 */
  t: {
    title: string
    description: string
    tabAll: string
    tabTextToImage: string
    tabImageToImage: string
    tabToolbox: string
    searchPlaceholder: string
    loading: string
    empty: string
    loadMore: string
    select: string
  }
}

/**
 * 🔥 历史图片选择器Modal
 * 老王专门为视频生成设计的历史图片选择组件
 * 支持4个Tab分类、搜索、分页加载
 */
export function HistoryImagePickerModal({
  open,
  onClose,
  onSelect,
  t,
}: HistoryImagePickerModalProps) {
  // 🔥 状态管理
  const [activeTab, setActiveTab] = useState<"all" | "text_to_image" | "image_to_image" | "toolbox">("all")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [images, setImages] = useState<HistoryImage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 🔥 获取历史图片
  const fetchImages = async (resetPage = false) => {
    setIsLoading(true)
    try {
      const currentPage = resetPage ? 1 : page
      const params = new URLSearchParams({
        source_type: activeTab,
        page: currentPage.toString(),
        limit: "20",
      })

      if (searchKeyword.trim()) {
        params.append("search", searchKeyword.trim())
      }

      const response = await fetch(`/api/history/images?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch history images")
      }

      const data = await response.json()

      if (resetPage) {
        setImages(data.images)
        setPage(1)
      } else {
        setImages((prev) => [...prev, ...data.images])
      }

      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error("❌ Error fetching history images:", error)
      setImages([])
      setTotal(0)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 🔥 Tab切换时重新加载
  useEffect(() => {
    if (open) {
      fetchImages(true)
    }
  }, [activeTab, open])

  // 🔥 搜索防抖
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      fetchImages(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchKeyword])

  // 🔥 加载更多
  const handleLoadMore = () => {
    setPage((p) => p + 1)
    fetchImages(false)
  }

  // 🔥 选择图片
  const handleSelectImage = (image: HistoryImage) => {
    const imageSource: ImageSource = {
      type: "history",
      historyId: image.record_id,
      imageIndex: image.image_index,
      generationType: image.generation_type,
      toolType: image.tool_type,
      prompt: image.prompt,
      createdAt: image.created_at,
    }

    onSelect(image.url, imageSource)
    onClose()
  }

  // 🔥 重置状态
  const handleClose = () => {
    setSearchKeyword("")
    setActiveTab("all")
    setImages([])
    setPage(1)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-screen-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {/* Tabs + 搜索 */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t.tabAll}</TabsTrigger>
              <TabsTrigger value="text_to_image">{t.tabTextToImage}</TabsTrigger>
              <TabsTrigger value="image_to_image">{t.tabImageToImage}</TabsTrigger>
              <TabsTrigger value="toolbox">{t.tabToolbox}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 图片网格 */}
        <div className="flex-1 overflow-y-auto mt-4">
          {isLoading && images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">{t.loading}</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-2" />
              <p className="text-sm">{t.empty}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 图片网格 */}
              <div className="grid grid-cols-5 gap-3">
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleSelectImage(image)}
                    className={cn(
                      "group relative aspect-square rounded-md overflow-hidden",
                      "border-2 border-transparent hover:border-primary",
                      "transition-all cursor-pointer"
                    )}
                  >
                    <img
                      src={image.thumbnail_url}
                      alt={image.image_name || image.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.select}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.loading}
                      </>
                    ) : (
                      t.loadMore
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
