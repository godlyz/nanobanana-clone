"use client"

/**
 * 🔥 老王的评论输入表单
 * 用途: 发表新评论或回复
 * 老王警告: 登录才能发评论，别想匿名喷人！
 */

import React, { useState, useRef, useEffect } from 'react'
import { User, Send, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CommentContentType, CommentWithAuthor } from '@/types/comment'

interface CommentFormProps {
  contentId: string
  contentType: CommentContentType
  currentUserId: string | null
  currentUserAvatar?: string | null
  parentId?: string | null
  parentAuthorName?: string | null
  onSubmit: (comment: CommentWithAuthor) => void
  onCancelReply?: () => void
  placeholder?: string
}

export function CommentForm({
  contentId,
  contentType,
  currentUserId,
  currentUserAvatar,
  parentId,
  parentAuthorName,
  onSubmit,
  onCancelReply,
  placeholder = '写下你的评论...'
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 回复模式下自动聚焦
  useEffect(() => {
    if (parentId && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [parentId])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting || !currentUserId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: contentId,
          content_type: contentType,
          parent_id: parentId || undefined,
          content: content.trim()
        })
      })

      const data = await res.json()

      if (data.success && data.data) {
        setContent('')
        onSubmit(data.data)
        onCancelReply?.()
      } else {
        setError(data.error || '发送失败')
      }
    } catch (err) {
      console.error('发送评论失败:', err)
      setError('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 按 Ctrl+Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 未登录状态
  if (!currentUserId) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">
          <a href="/login" className="text-blue-500 hover:underline">登录</a>
          {' '}后发表评论
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 回复提示 */}
      {parentId && parentAuthorName && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>回复 @{parentAuthorName}</span>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {/* 当前用户头像 */}
        {currentUserAvatar ? (
          <img
            src={currentUserAvatar}
            alt="你的头像"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-gray-400" />
          </div>
        )}

        {/* 输入区域 */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
            maxLength={2000}
          />

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {content.length}/2000 · Ctrl+Enter 发送
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 🔥 老王备注：
// 1. 未登录显示登录提示
// 2. 支持回复模式（显示回复谁）
// 3. Ctrl+Enter 快捷发送
// 4. 字数限制 2000 字
// 5. 发送成功后清空输入框
