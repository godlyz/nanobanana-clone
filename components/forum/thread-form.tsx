/**
 * 🔥 老王创建：论坛帖子表单组件
 * 用途：创建/编辑帖子的表单界面
 * 日期：2025-11-25
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MarkdownEditor } from "./markdown-editor"
import { AlertCircle, Save, Send, X } from "lucide-react"
import type { ForumCategory, ForumTag, CreateThreadRequest, UpdateThreadRequest } from "@/types/forum"
import { validateThreadTitle } from "@/lib/forum-utils"
import { useToast } from "@/hooks/use-toast"

/**
 * ForumThreadForm - 帖子创建/编辑表单
 *
 * Features:
 * - 标题输入（3-200字符验证）
 * - Markdown 编辑器（复用 MarkdownEditor 组件）
 * - 分类下拉选择
 * - 标签多选输入（最多 5 个）
 * - 实时字数统计
 * - 草稿自动保存（localStorage）
 * - 双语支持
 * - 图片上传支持
 *
 * Props:
 * - mode: 'create' | 'edit' - 表单模式
 * - initialData: 初始数据（编辑模式）
 * - categories: 可选分类列表
 * - tags: 可选标签列表
 * - onSubmit: 提交回调
 * - onCancel: 取消回调
 */

interface ForumThreadFormProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id?: string
    title: string
    content: string
    category_id: string
    tag_ids?: string[]
  }
  categories: ForumCategory[]
  tags: ForumTag[]
  onSubmit: (data: CreateThreadRequest | UpdateThreadRequest) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

// 草稿本地存储 key
const DRAFT_STORAGE_KEY = 'forum_thread_draft'

export function ForumThreadForm({
  mode = 'create',
  initialData,
  categories,
  tags,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ForumThreadFormProps) {
  const { language } = useLanguage()
  const router = useRouter()
  // 🔥 老王修复：useToast返回{addToast, removeToast, toasts}，不是{toast}
  const { addToast } = useToast()

  // 表单状态
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialData?.tag_ids || [])
  const [titleError, setTitleError] = useState<string>('')
  const [isDraftSaved, setIsDraftSaved] = useState(false)

  // 标题验证
  const validateTitle = useCallback(() => {
    const validation = validateThreadTitle(title)
    setTitleError(validation.valid ? '' : (validation.error || ''))
    return validation.valid
  }, [title])

  // 实时标题验证
  useEffect(() => {
    if (title) {
      validateTitle()
    } else {
      setTitleError('')
    }
  }, [title, validateTitle])

  // 草稿自动保存（仅创建模式）
  useEffect(() => {
    if (mode === 'create' && (title || content || categoryId || selectedTagIds.length > 0)) {
      const draftData = {
        title,
        content,
        category_id: categoryId,
        tag_ids: selectedTagIds,
        saved_at: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
      setIsDraftSaved(true)

      // 3秒后隐藏"已保存"提示
      const timer = setTimeout(() => setIsDraftSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [mode, title, content, categoryId, selectedTagIds])

  // 加载草稿（仅创建模式且无初始数据）
  useEffect(() => {
    if (mode === 'create' && !initialData) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          const shouldLoadDraft = window.confirm(
            language === 'zh'
              ? '检测到未发布的草稿，是否恢复？'
              : 'Draft detected. Do you want to restore it?'
          )
          if (shouldLoadDraft) {
            setTitle(draft.title || '')
            setContent(draft.content || '')
            setCategoryId(draft.category_id || '')
            setSelectedTagIds(draft.tag_ids || [])
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
          }
        } catch (error) {
          console.error('Failed to load draft:', error)
        }
      }
    }
  }, [mode, initialData, language])

  // 清除草稿
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setIsDraftSaved(false)
  }

  // 表单验证
  const validateForm = (): boolean => {
    // 验证标题
    if (!validateTitle()) {
      // 🔥 老王修复：addToast接收(message, type, duration)参数
      const errorMsg = `${language === 'zh' ? '验证失败' : 'Validation Failed'}: ${titleError}`
      addToast(errorMsg, 'error')
      return false
    }

    // 验证内容
    if (content.trim().length < 10) {
      // 🔥 老王修复：addToast接收(message, type, duration)参数
      const errorMsg = `${language === 'zh' ? '验证失败' : 'Validation Failed'}: ${language === 'zh' ? '内容至少需要 10 个字符' : 'Content must be at least 10 characters'}`
      addToast(errorMsg, 'error')
      return false
    }

    // 验证分类
    if (!categoryId) {
      // 🔥 老王修复：addToast接收(message, type, duration)参数
      const errorMsg = `${language === 'zh' ? '验证失败' : 'Validation Failed'}: ${language === 'zh' ? '请选择一个分类' : 'Please select a category'}`
      addToast(errorMsg, 'error')
      return false
    }

    return true
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const formData: CreateThreadRequest | UpdateThreadRequest = mode === 'create'
      ? {
          title,
          content,
          category_id: categoryId,
          tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        }
      : {
          title,
          content,
          tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        }

    try {
      await onSubmit(formData)
      // 提交成功后清除草稿
      clearDraft()
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  // 取消操作
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  // 标签切换
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId)
      } else if (prev.length < 5) {
        return [...prev, tagId]
      } else {
        // 🔥 老王修复：addToast接收(message, type, duration)参数
        const warnMsg = `${language === 'zh' ? '标签上限' : 'Tag Limit'}: ${language === 'zh' ? '最多只能选择 5 个标签' : 'You can select up to 5 tags'}`
        addToast(warnMsg, 'warning')
        return prev
      }
    })
  }

  // 移除标签
  const removeTag = (tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId))
  }

  // 图片上传处理（示例实现，需要对接实际上传API）
  const handleImageUpload = async (file: File): Promise<string> => {
    // TODO: 对接实际的图片上传 API
    // 这里返回一个占位URL
    console.log('Uploading image:', file.name)

    // 示例：使用 FileReader 生成本地预览 URL（仅用于开发）
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create'
              ? (language === 'zh' ? '创建新帖子' : 'Create New Thread')
              : (language === 'zh' ? '编辑帖子' : 'Edit Thread')}
          </CardTitle>
          <CardDescription>
            {language === 'zh'
              ? '填写表单以发布您的内容。支持 Markdown 格式。'
              : 'Fill out the form to publish your content. Markdown is supported.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 标题输入 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {language === 'zh' ? '标题' : 'Title'}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                language === 'zh'
                  ? '输入帖子标题（3-200 字符）'
                  : 'Enter thread title (3-200 characters)'
              }
              maxLength={200}
              className={titleError ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {title.length} / 200
              </span>
              {titleError && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {titleError}
                </span>
              )}
            </div>
          </div>

          {/* 分类选择 */}
          <div className="space-y-2">
            <Label htmlFor="category">
              {language === 'zh' ? '分类' : 'Category'}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={isSubmitting || mode === 'edit'}
            >
              <SelectTrigger id="category">
                <SelectValue
                  placeholder={language === 'zh' ? '选择一个分类' : 'Select a category'}
                />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(cat => cat.is_visible).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>
                        {language === 'zh' ? category.name : (category.name_en || category.name)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 标签选择 */}
          <div className="space-y-2">
            <Label>
              {language === 'zh' ? '标签' : 'Tags'}
              <span className="text-muted-foreground text-xs ml-2">
                ({language === 'zh' ? '最多 5 个' : 'Up to 5'})
              </span>
            </Label>

            {/* 已选标签 */}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTagIds.map(tagId => {
                  const tag = tags.find(t => t.id === tagId)
                  if (!tag) return null
                  return (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="pl-2 pr-1 py-1"
                    >
                      <span className="mr-1">
                        {/* 🔥 老王修复：forum_tags表没有name_en字段，直接用name */}
                        {tag.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTag(tagId)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* 可选标签列表 */}
            <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
              {tags.filter(tag => !selectedTagIds.includes(tag.id)).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => toggleTag(tag.id)}
                >
                  {/* 🔥 老王修复：forum_tags表没有name_en字段，直接用name */}
                  {tag.name}
                </Badge>
              ))}
              {tags.filter(tag => !selectedTagIds.includes(tag.id)).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {language === 'zh' ? '所有标签已选择' : 'All tags selected'}
                </p>
              )}
            </div>
          </div>

          {/* 内容编辑器 */}
          <div className="space-y-2">
            <Label htmlFor="content">
              {language === 'zh' ? '内容' : 'Content'}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onImageUpload={handleImageUpload}
              placeholder={
                language === 'zh'
                  ? '使用 Markdown 编写您的内容...'
                  : 'Write your content using Markdown...'
              }
              maxLength={50000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {language === 'zh' ? '最少 10 字符' : 'Minimum 10 characters'}
            </p>
          </div>

          {/* 草稿提示 */}
          {mode === 'create' && isDraftSaved && (
            <Alert>
              <Save className="h-4 w-4" />
              <AlertDescription>
                {language === 'zh' ? '草稿已自动保存' : 'Draft auto-saved'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>

          <div className="flex items-center gap-2">
            {mode === 'create' && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearDraft}
                disabled={isSubmitting}
              >
                {language === 'zh' ? '清除草稿' : 'Clear Draft'}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !!titleError}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting
                ? (language === 'zh' ? '提交中...' : 'Submitting...')
                : (language === 'zh' ? '发布' : 'Publish')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
