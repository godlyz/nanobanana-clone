"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { formatRelativeTime } from "@/lib/forum-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, MessageSquare, Star, Flag, Edit, Trash2, Save, X } from "lucide-react"
import type { ForumReply } from "@/types/forum"
// 🔥 老王性能优化：动态导入 MarkdownPreview，避免首屏加载1.5MB的highlight.js
const MarkdownPreview = dynamic(() => import("./markdown-preview").then(m => ({ default: m.MarkdownPreview })), {
  loading: () => <div className="animate-pulse h-20 bg-muted rounded" />,
  ssr: true,
})
import { MarkdownEditor } from "./markdown-editor"
import { useImageUpload } from "@/lib/hooks/use-image-upload"

/**
 * ForumReplyItem - 单个回复项组件
 *
 * Features:
 * - 显示回复作者、内容、时间
 * - 支持点赞/点踩投票
 * - 显示最佳答案标记
 * - 支持举报功能
 * - 嵌套回复（可选）
 * - 响应式设计
 * - 双语支持
 */

interface ForumReplyItemProps {
  reply: ForumReply
  threadId?: string  // 新增：所属帖子ID，用于图片上传
  isAuthor?: boolean
  isReplyAuthor?: boolean  // 是否为回复作者本人
  isBestAnswer?: boolean
  onVote?: (replyId: string, voteType: 'up' | 'down') => void
  onMarkBest?: (replyId: string) => void
  onReport?: (replyId: string) => void
  onReply?: (replyId: string) => void
  onEdit?: (replyId: string, newContent: string) => Promise<void>
  onDelete?: (replyId: string) => Promise<void>
}

export function ForumReplyItem({
  reply,
  threadId,
  isAuthor = false,
  isReplyAuthor = false,
  isBestAnswer = false,
  onVote,
  onMarkBest,
  onReport,
  onReply,
  onEdit,
  onDelete
}: ForumReplyItemProps) {
  const language = useLocale() as 'zh' | 'en'  // 🔥 老王迁移：useLocale返回当前语言，类型断言为zh或en
  const { uploadImage } = useImageUpload()
  const [isVoting, setIsVoting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(reply.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 图片上传处理
  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await uploadImage(file, {
      threadId,
      replyId: reply.id
    })
    if (result) {
      return result.url
    }
    throw new Error("Image upload failed")
  }

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting || !onVote) return
    setIsVoting(true)
    try {
      await onVote(reply.id, voteType)
    } finally {
      setIsVoting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!onEdit || editedContent.trim().length < 10) return
    setIsSaving(true)
    try {
      await onEdit(reply.id, editedContent.trim())
      setIsEditing(false)
    } catch (err) {
      console.error('Edit failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedContent(reply.content)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmMsg =
      language === 'zh'
        ? '确定要删除这条回复吗？此操作不可撤销。'
        : 'Are you sure you want to delete this reply? This action cannot be undone.'

    if (!confirm(confirmMsg)) return

    setIsDeleting(true)
    try {
      await onDelete(reply.id)
    } catch (err) {
      console.error('Delete failed:', err)
      setIsDeleting(false)
    }
  }

  const getAuthorInitials = () => {
    // 🔥 老王修复：author类型没有username字段，改用display_name或email
    const name = reply.author?.display_name || reply.author?.email
    if (!name) return "?"
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <Card className={`p-4 ${isBestAnswer ? 'border-green-500 border-2' : ''}`}>
      {/* 最佳答案标记 */}
      {isBestAnswer && (
        <div className="flex items-center gap-2 mb-3 text-green-600">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold">
            {language === 'zh' ? '最佳答案' : 'Best Answer'}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* 作者头像 */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={reply.author?.avatar_url} />
          <AvatarFallback>{getAuthorInitials()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* 作者信息 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-sm">
              {/* 🔥 老王修复：author类型没有username字段，改用display_name或email */}
              {reply.author?.display_name || reply.author?.email || (language === 'zh' ? '匿名用户' : 'Anonymous')}
            </span>
            {isAuthor && (
              <Badge variant="secondary" className="text-xs">
                {language === 'zh' ? '作者' : 'Author'}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(reply.created_at, language)}
            </span>
            {reply.updated_at && reply.updated_at !== reply.created_at && (
              <span className="text-xs text-muted-foreground">
                ({language === 'zh' ? '已编辑' : 'edited'})
              </span>
            )}
          </div>

          {/* 回复内容 */}
          {isEditing ? (
            <div className="mb-3">
              <MarkdownEditor
                value={editedContent}
                onChange={setEditedContent}
                onImageUpload={handleImageUpload}
                placeholder={
                  language === 'zh'
                    ? '编辑你的回复...\n\n支持 Markdown 格式和图片上传'
                    : 'Edit your reply...\n\nSupports Markdown and image upload'
                }
                maxLength={5000}
                minRows={6}
                disabled={isSaving}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving || editedContent.trim().length < 10}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving
                    ? (language === 'zh' ? '保存中...' : 'Saving...')
                    : (language === 'zh' ? '保存' : 'Save')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <MarkdownPreview content={reply.content} />
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 投票按钮 */}
            {onVote && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('up')}
                  disabled={isVoting}
                  className="h-8 px-2"
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {/* 🔥 老王修复：ForumReply类型用upvote_count/downvote_count，不是upvotes/downvotes */}
                  <span className="text-xs">{reply.upvote_count || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('down')}
                  disabled={isVoting}
                  className="h-8 px-2"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  <span className="text-xs">{reply.downvote_count || 0}</span>
                </Button>
              </>
            )}

            {/* 回复按钮 */}
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(reply.id)}
                className="h-8 px-2"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="text-xs">
                  {language === 'zh' ? '回复' : 'Reply'}
                </span>
              </Button>
            )}

            {/* 标记最佳答案（仅帖子作者可见） */}
            {isAuthor && onMarkBest && !isBestAnswer && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkBest(reply.id)}
                className="h-8 px-2 text-green-600 hover:text-green-700"
              >
                <Star className="h-4 w-4 mr-1" />
                <span className="text-xs">
                  {language === 'zh' ? '标记为最佳' : 'Mark as Best'}
                </span>
              </Button>
            )}

            {/* 编辑和删除按钮（仅回复作者可见） */}
            {isReplyAuthor && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="text-xs">
                    {language === 'zh' ? '编辑' : 'Edit'}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 px-2 text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span className="text-xs">
                    {language === 'zh' ? '删除' : 'Delete'}
                  </span>
                </Button>
              </>
            )}

            {/* 举报按钮 */}
            {onReport && !isReplyAuthor && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReport(reply.id)}
                className="h-8 px-2 text-destructive hover:text-destructive/90 ml-auto"
              >
                <Flag className="h-4 w-4 mr-1" />
                <span className="text-xs">
                  {language === 'zh' ? '举报' : 'Report'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
