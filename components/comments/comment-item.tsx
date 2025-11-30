"use client"

/**
 * 🔥 老王的评论项组件
 * 用途: 显示单条评论，支持点赞、回复、编辑、删除
 * 老王警告: 嵌套评论最多3层，别tm搞更深！
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  User,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import type { CommentWithAuthor, CommentContentType } from '@/types/comment'

interface CommentItemProps {
  comment: CommentWithAuthor
  currentUserId: string | null
  contentType: CommentContentType
  contentId: string
  onReply?: (parentId: string) => void
  onUpdate?: (comment: CommentWithAuthor) => void
  onDelete?: (commentId: string) => void
  onLikeChange?: (commentId: string, isLiked: boolean) => void
  depth?: number
}

export function CommentItem({
  comment,
  currentUserId,
  contentType,
  contentId,
  onReply,
  onUpdate,
  onDelete,
  onLikeChange,
  depth = 0
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [localIsLiked, setLocalIsLiked] = useState(comment.is_liked || false)
  const [localLikeCount, setLocalLikeCount] = useState(comment.like_count)

  const isAuthor = currentUserId === comment.user_id
  const canReply = depth < 2 // 最多3层嵌套

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: zhCN
  })

  // 处理点赞
  const handleLike = async () => {
    if (!currentUserId || isLiking) return

    setIsLiking(true)
    try {
      const method = localIsLiked ? 'DELETE' : 'POST'
      const res = await fetch(`/api/comments/${comment.id}/like`, { method })
      const data = await res.json()

      if (data.success) {
        setLocalIsLiked(!localIsLiked)
        setLocalLikeCount(prev => localIsLiked ? prev - 1 : prev + 1)
        onLikeChange?.(comment.id, !localIsLiked)
      }
    } catch (err) {
      console.error('点赞操作失败:', err)
    } finally {
      setIsLiking(false)
    }
  }

  // 处理编辑保存
  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      })
      const data = await res.json()

      if (data.success && data.data) {
        setIsEditing(false)
        onUpdate?.(data.data)
      }
    } catch (err) {
      console.error('更新评论失败:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理删除
  const handleDelete = async () => {
    if (!confirm('确定要删除这条评论吗？')) return

    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        onDelete?.(comment.id)
      }
    } catch (err) {
      console.error('删除评论失败:', err)
    }
  }

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-8 mt-3' : ''}`}>
      {/* 头像 */}
      <Link href={`/profile/${comment.author.user_id}`} className="flex-shrink-0">
        {comment.author.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt={comment.author.display_name || '用户'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </Link>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {/* 用户名和时间 */}
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/profile/${comment.author.user_id}`}
            className="font-medium text-sm text-gray-900 hover:underline"
          >
            {comment.author.display_name || '用户'}
          </Link>
          <span className="text-xs text-gray-500">{timeAgo}</span>
          {comment.is_edited && (
            <span className="text-xs text-gray-400">(已编辑)</span>
          )}
        </div>

        {/* 评论内容 */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="编辑评论..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editContent.trim()}
              >
                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        )}

        {/* 操作按钮 */}
        {!isEditing && (
          <div className="flex items-center gap-4 mt-2">
            {/* 点赞 */}
            <button
              onClick={handleLike}
              disabled={!currentUserId || isLiking}
              className={`flex items-center gap-1 text-xs transition-colors ${
                localIsLiked
                  ? 'text-red-500'
                  : 'text-gray-500 hover:text-red-500'
              } ${!currentUserId ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Heart
                className={`h-4 w-4 ${localIsLiked ? 'fill-current' : ''}`}
              />
              <span>{localLikeCount > 0 ? localLikeCount : '赞'}</span>
            </button>

            {/* 回复 */}
            {canReply && currentUserId && (
              <button
                onClick={() => onReply?.(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>回复</span>
              </button>
            )}

            {/* 更多操作（作者专属） */}
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* 回复数提示 */}
        {comment.reply_count > 0 && depth === 0 && !comment.replies?.length && (
          <button className="text-xs text-blue-500 mt-2 hover:underline">
            查看 {comment.reply_count} 条回复
          </button>
        )}

        {/* 嵌套回复 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                contentType={contentType}
                contentId={contentId}
                onReply={onReply}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onLikeChange={onLikeChange}
                depth={depth + 1}
              />
            ))}
            {comment.reply_count > (comment.replies?.length || 0) && (
              <button className="text-xs text-blue-500 ml-8 hover:underline">
                查看更多 {comment.reply_count - (comment.replies?.length || 0)} 条回复
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 🔥 老王备注：
// 1. depth 控制嵌套层级，最多3层
// 2. 点赞状态用本地状态即时更新，体验丝滑
// 3. 编辑模式下可以修改内容
// 4. 删除前会二次确认
// 5. 递归渲染嵌套回复
