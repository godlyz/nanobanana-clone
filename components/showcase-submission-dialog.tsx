/**
 * 🔥 老王的推荐提交弹窗组件
 * 用途: 用户填写作品信息并推荐到案例展示库
 * 老王警告: 表单验证要严格，别tm乱提交！
 */

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, X, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import type { ShowcaseCategory } from "@/types/showcase"
import Image from "next/image"

interface ShowcaseSubmissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  generationHistoryId: string
  imageIndex: number
  imageUrl: string
  onSuccess?: () => void
}

export function ShowcaseSubmissionDialog({
  open,
  onOpenChange,
  generationHistoryId,
  imageIndex,
  imageUrl,
  onSuccess
}: ShowcaseSubmissionDialogProps) {
  const { t, language } = useLanguage()

  // 表单状态
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ShowcaseCategory | "">("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 分类选项
  const categories: { value: ShowcaseCategory; label: string; emoji: string }[] = [
    { value: "portrait", label: language === "zh" ? "人像" : "Portrait", emoji: "👤" },
    { value: "landscape", label: language === "zh" ? "风景" : "Landscape", emoji: "🏞️" },
    { value: "product", label: language === "zh" ? "产品" : "Product", emoji: "📦" },
    { value: "creative", label: language === "zh" ? "创意" : "Creative", emoji: "🎨" },
    { value: "anime", label: language === "zh" ? "动漫" : "Anime", emoji: "🎭" },
  ]

  /**
   * 🔥 添加标签
   */
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag])
      setTagInput("")
    }
  }

  /**
   * 🔥 删除标签
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  /**
   * 🔥 处理Enter键添加标签
   */
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  /**
   * 🔥 提交推荐
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证表单
    if (!title.trim()) {
      setError(language === "zh" ? "请输入作品标题" : "Please enter a title")
      return
    }

    if (!category) {
      setError(language === "zh" ? "请选择作品分类" : "Please select a category")
      return
    }

    if (title.trim().length < 3) {
      setError(language === "zh" ? "标题至少3个字符" : "Title must be at least 3 characters")
      return
    }

    if (title.trim().length > 100) {
      setError(language === "zh" ? "标题不能超过100个字符" : "Title cannot exceed 100 characters")
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch("/api/showcase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generation_history_id: generationHistoryId,
          image_index: imageIndex,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          tags
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (language === "zh" ? "推荐失败，请稍后重试" : "Submission failed, please try again"))
        setIsLoading(false)
        return
      }

      // 推荐成功
      console.log("🎉 推荐成功:", data.data)
      setSuccess(true)
      setIsLoading(false)

      // 2秒后关闭弹窗
      setTimeout(() => {
        handleClose()
        onSuccess?.()
      }, 2000)

    } catch (error) {
      console.error("❌ 推荐异常:", error)
      setError(language === "zh" ? "推荐失败，请稍后重试" : "Submission failed, please try again")
      setIsLoading(false)
    }
  }

  /**
   * 🔥 关闭弹窗并重置表单
   */
  const handleClose = () => {
    onOpenChange(false)
    // 延迟重置，避免动画未完成时看到表单重置
    setTimeout(() => {
      setTitle("")
      setDescription("")
      setCategory("")
      setTags([])
      setTagInput("")
      setError(null)
      setSuccess(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {language === "zh" ? "推荐到案例展示" : "Submit to Showcase"}
          </DialogTitle>
          <DialogDescription>
            {language === "zh"
              ? "分享您的作品到案例展示库，让更多人看到您的创作！"
              : "Share your creation to the showcase gallery for others to see!"}
          </DialogDescription>
        </DialogHeader>

        {/* 成功提示 */}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {language === "zh" ? "推荐提交成功！" : "Submission Successful!"}
              </p>
              <p className="text-sm mt-1 text-green-600/80">
                {language === "zh"
                  ? "我们会尽快审核您的作品，审核通过后将出现在案例展示页面。"
                  : "We will review your work soon, and it will appear in the showcase once approved."}
              </p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 图片预览 */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {language === "zh" ? "作品预览" : "Preview"}
            </label>
            {imageUrl && imageUrl.trim() !== '' ? (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted border">
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-lg bg-muted border border-dashed flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-40" />
                <p className="text-sm text-center px-4">
                  {language === "zh"
                    ? "图片加载失败或不存在"
                    : "Image failed to load or does not exist"}
                </p>
              </div>
            )}
          </div>

          {/* 作品标题 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "zh" ? "作品标题" : "Title"} <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder={language === "zh" ? "给你的作品起个响亮的名字" : "Give your work a catchy title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              disabled={isLoading || success}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/100 {language === "zh" ? "字符" : "characters"}
            </p>
          </div>

          {/* 作品描述 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "zh" ? "作品描述" : "Description"} ({language === "zh" ? "可选" : "Optional"})
            </label>
            <Textarea
              placeholder={language === "zh" ? "描述您的创作灵感和背后的故事..." : "Describe your inspiration and the story behind your work..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={isLoading || success}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 {language === "zh" ? "字符" : "characters"}
            </p>
          </div>

          {/* 作品分类 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "zh" ? "作品分类" : "Category"} <span className="text-destructive">*</span>
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as ShowcaseCategory)} disabled={isLoading || success}>
              <SelectTrigger>
                <SelectValue placeholder={language === "zh" ? "选择一个分类" : "Select a category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 标签 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "zh" ? "标签" : "Tags"} ({language === "zh" ? "最多5个" : "Max 5"})
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                type="text"
                placeholder={language === "zh" ? "输入标签并按Enter" : "Enter a tag and press Enter"}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                maxLength={20}
                disabled={isLoading || success || tags.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5 || isLoading || success}
              >
                {language === "zh" ? "添加" : "Add"}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1">
                    <span className="mr-1">{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      disabled={isLoading || success}
                      className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {language === "zh" ? "取消" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || success}
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "zh" ? "提交中..." : "Submitting..."}
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {language === "zh" ? "已提交" : "Submitted"}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {language === "zh" ? "提交推荐" : "Submit"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
