"use client"

import { X, Share2, Loader2, Check, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import type { VideoShowcaseCategory } from "@/types/showcase"

// 🔥 老王创建：视频分享到Showcase的Modal组件
// 功能：让用户填写标题、描述、分类、标签，然后提交到展示库

interface VideoShareModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  videoPrompt?: string
  onSuccess?: () => void
}

// 分类选项
const CATEGORY_OPTIONS: { value: VideoShowcaseCategory; labelEn: string; labelZh: string }[] = [
  { value: 'creative', labelEn: 'Creative', labelZh: '创意' },
  { value: 'portrait', labelEn: 'Portrait', labelZh: '人像' },
  { value: 'landscape', labelEn: 'Landscape', labelZh: '风景' },
  { value: 'product', labelEn: 'Product', labelZh: '产品' },
  { value: 'anime', labelEn: 'Anime', labelZh: '动漫' },
]

// 预设标签
const PRESET_TAGS = [
  { en: 'AI Generated', zh: 'AI生成' },
  { en: 'Short Video', zh: '短视频' },
  { en: 'Animation', zh: '动画' },
  { en: 'Motion', zh: '动态' },
  { en: 'Creative', zh: '创意' },
  { en: 'Art', zh: '艺术' },
]

export function VideoShareModal({
  isOpen,
  onClose,
  videoId,
  videoPrompt,
  onSuccess,
}: VideoShareModalProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<VideoShowcaseCategory>('creative')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription(videoPrompt || '')
      setCategory('creative')
      setSelectedTags([])
      setCustomTag('')
      setSubmitStatus('idle')
      setErrorMessage('')
    }
  }, [isOpen, videoPrompt])

  // ESC关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  // 防止背景滚动
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

  // 切换标签
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 5 ? [...prev, tag] : prev
    )
  }

  // 添加自定义标签
  const addCustomTag = () => {
    const trimmed = customTag.trim()
    if (trimmed && !selectedTags.includes(trimmed) && selectedTags.length < 5) {
      setSelectedTags(prev => [...prev, trimmed])
      setCustomTag('')
    }
  }

  // 提交分享
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setErrorMessage(language === 'zh' ? '请输入标题' : 'Please enter a title')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/showcase/submit-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_generation_history_id: videoId,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          tags: selectedTags,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitStatus('success')
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      } else {
        setSubmitStatus('error')
        setErrorMessage(data.error || (language === 'zh' ? '提交失败' : 'Submission failed'))
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage(language === 'zh' ? '网络错误，请重试' : 'Network error, please retry')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg bg-background rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {language === 'zh' ? '分享到展示库' : 'Share to Showcase'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 成功状态 */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
              <Check className="w-5 h-5" />
              <span>
                {language === 'zh'
                  ? '提交成功！您的视频正在审核中。'
                  : 'Submitted! Your video is under review.'}
              </span>
            </div>
          )}

          {/* 错误状态 */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {language === 'zh' ? '标题' : 'Title'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={language === 'zh' ? '给你的视频起个名字' : 'Give your video a name'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting || submitStatus === 'success'}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {language === 'zh' ? '描述' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={language === 'zh' ? '介绍一下你的创作灵感...' : 'Share your creative inspiration...'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isSubmitting || submitStatus === 'success'}
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {language === 'zh' ? '分类' : 'Category'}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  disabled={isSubmitting || submitStatus === 'success'}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    category === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  } disabled:opacity-50`}
                >
                  {language === 'zh' ? opt.labelZh : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {language === 'zh' ? '标签（最多5个）' : 'Tags (max 5)'}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TAGS.map((tag) => {
                const tagLabel = language === 'zh' ? tag.zh : tag.en
                const isSelected = selectedTags.includes(tagLabel)
                return (
                  <button
                    key={tag.en}
                    type="button"
                    onClick={() => toggleTag(tagLabel)}
                    disabled={isSubmitting || submitStatus === 'success' || (!isSelected && selectedTags.length >= 5)}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'border-border hover:border-primary/30'
                    } disabled:opacity-50`}
                  >
                    {tagLabel}
                  </button>
                )
              })}
            </div>
            {/* 自定义标签输入 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                maxLength={20}
                placeholder={language === 'zh' ? '添加自定义标签' : 'Add custom tag'}
                className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting || submitStatus === 'success' || selectedTags.length >= 5}
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTag.trim() || isSubmitting || submitStatus === 'success' || selectedTags.length >= 5}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50"
              >
                {language === 'zh' ? '添加' : 'Add'}
              </button>
            </div>
            {/* 已选标签展示 */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={isSubmitting || submitStatus === 'success'}
                      className="hover:text-primary/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || submitStatus === 'success' || !title.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'zh' ? '提交中...' : 'Submitting...'}
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  {language === 'zh' ? '已提交' : 'Submitted'}
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  {language === 'zh' ? '提交分享' : 'Submit'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
