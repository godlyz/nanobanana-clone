"use client"

import { useState } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { useImageUpload } from "@/lib/hooks/use-image-upload"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MarkdownEditor } from "./markdown-editor"
import { Loader2, Send } from "lucide-react"

/**
 * ForumReplyForm - 回复表单组件
 *
 * Features:
 * - 富文本输入框
 * - 字数统计
 * - 提交状态管理
 * - 表单验证
 * - 双语支持
 * - 响应式设计
 */

interface ForumReplyFormProps {
  threadId: string
  parentReplyId?: string
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function ForumReplyForm({
  threadId,
  parentReplyId,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus = false
}: ForumReplyFormProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const { uploadImage } = useImageUpload()
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MIN_LENGTH = 10
  const MAX_LENGTH = 5000

  // 图片上传处理
  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await uploadImage(file, {
      threadId,
      replyId: parentReplyId
    })
    if (result) {
      return result.url
    }
    throw new Error("Image upload failed")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证内容长度
    if (content.trim().length < MIN_LENGTH) {
      setError(
        language === 'zh'
          ? `回复内容至少需要 ${MIN_LENGTH} 个字符`
          : `Reply must be at least ${MIN_LENGTH} characters`
      )
      return
    }

    if (content.length > MAX_LENGTH) {
      setError(
        language === 'zh'
          ? `回复内容不能超过 ${MAX_LENGTH} 个字符`
          : `Reply cannot exceed ${MAX_LENGTH} characters`
      )
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent("") // 清空表单
    } catch (err) {
      setError(
        language === 'zh'
          ? '发送回复失败，请重试'
          : 'Failed to post reply, please try again'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingChars = MAX_LENGTH - content.length
  const isValid = content.trim().length >= MIN_LENGTH && content.length <= MAX_LENGTH

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Markdown 编辑器 */}
        <div>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            onImageUpload={handleImageUpload}
            placeholder={
              placeholder ||
              (language === 'zh'
                ? '写下你的回复...\n\n支持 Markdown 格式和图片上传'
                : 'Write your reply...\n\nSupports Markdown and image upload')
            }
            maxLength={MAX_LENGTH}
            minRows={6}
            disabled={isSubmitting}
          />
          {/* 字数统计 */}
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>
              {content.trim().length} / {MIN_LENGTH}{' '}
              {language === 'zh' ? '字符（最少）' : 'chars (min)'}
            </span>
            <span className={remainingChars < 100 ? 'text-destructive' : ''}>
              {remainingChars}{' '}
              {language === 'zh' ? '字符剩余' : 'chars remaining'}
            </span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
            {error}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {language === 'zh' ? '发送中...' : 'Posting...'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {language === 'zh' ? '发送回复' : 'Post Reply'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
