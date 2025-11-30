"use client"

/**
 * 🔥 老王的评论列表组件
 * 用途: 显示评论列表，支持分页、排序、嵌套
 * 老王警告: 这是评论系统的入口组件，集成了所有功能！
 */

import React, { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { CommentItem } from './comment-item'
import { CommentForm } from './comment-form'
import type { CommentWithAuthor, CommentContentType } from '@/types/comment'

interface CommentListProps {
  contentId: string
  contentType: CommentContentType
  currentUserId: string | null
  currentUserAvatar?: string | null
}

export function CommentList({
  contentId,
  contentType,
  currentUserId,
  currentUserAvatar
}: CommentListProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState<'newest' | 'oldest' | 'popular'>('newest')
  const [replyTo, setReplyTo] = useState<{
    parentId: string
    authorName: string
  } | null>(null)

  // 获取评论列表
  const fetchComments = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        content_id: contentId,
        content_type: contentType,
        page: pageNum.toString(),
        limit: '20',
        sort
      })

      const res = await fetch(`/api/comments?${params}`)
      const data = await res.json()

      if (data.success && data.data) {
        if (reset) {
          setComments(data.data)
        } else {
          setComments(prev => [...prev, ...data.data])
        }
        setHasMore(data.pagination?.has_more || false)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('获取评论失败:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [contentId, contentType, sort])

  // 初始加载和排序变化时重新获取
  useEffect(() => {
    setPage(1)
    fetchComments(1, true)
  }, [fetchComments])

  // 加载更多
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchComments(nextPage, false)
  }

  // 新评论提交成功
  const handleNewComment = (comment: CommentWithAuthor) => {
    if (replyTo) {
      // 回复模式：找到父评论并添加回复
      setComments(prev => prev.map(c => {
        if (c.id === replyTo.parentId) {
          return {
            ...c,
            reply_count: c.reply_count + 1,
            replies: [...(c.replies || []), comment]
          }
        }
        return c
      }))
      setReplyTo(null)
    } else {
      // 新评论：添加到列表顶部
      setComments(prev => [comment, ...prev])
      setTotal(prev => prev + 1)
    }
  }

  // 评论更新
  const handleCommentUpdate = (updated: CommentWithAuthor) => {
    setComments(prev => prev.map(c => {
      if (c.id === updated.id) return updated
      // 检查嵌套回复
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map(r => r.id === updated.id ? updated : r)
        }
      }
      return c
    }))
  }

  // 评论删除
  const handleCommentDelete = (commentId: string) => {
    setComments(prev => {
      // 先检查是否是顶级评论
      const isTopLevel = prev.some(c => c.id === commentId)
      if (isTopLevel) {
        return prev.filter(c => c.id !== commentId)
      }
      // 否则检查嵌套回复
      return prev.map(c => ({
        ...c,
        replies: c.replies?.filter(r => r.id !== commentId),
        reply_count: c.replies?.some(r => r.id === commentId)
          ? c.reply_count - 1
          : c.reply_count
      }))
    })
    setTotal(prev => prev - 1)
  }

  // 发起回复
  const handleReply = (parentId: string) => {
    const parent = comments.find(c => c.id === parentId)
      || comments.flatMap(c => c.replies || []).find(r => r.id === parentId)

    if (parent) {
      setReplyTo({
        parentId,
        authorName: parent.author.display_name || '用户'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            评论 {total > 0 && `(${total})`}
          </h3>
        </div>

        {/* 排序选择 */}
        {total > 0 && (
          <Select
            value={sort}
            onValueChange={(value: 'newest' | 'oldest' | 'popular') => setSort(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新</SelectItem>
              <SelectItem value="oldest">最早</SelectItem>
              <SelectItem value="popular">最热</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 评论输入框 */}
      <CommentForm
        contentId={contentId}
        contentType={contentType}
        currentUserId={currentUserId}
        currentUserAvatar={currentUserAvatar}
        parentId={replyTo?.parentId}
        parentAuthorName={replyTo?.authorName}
        onSubmit={handleNewComment}
        onCancelReply={() => setReplyTo(null)}
        placeholder={replyTo ? `回复 @${replyTo.authorName}...` : '写下你的评论...'}
      />

      {/* 评论列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有评论，来抢沙发吧！</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              contentType={contentType}
              contentId={contentId}
              onReply={handleReply}
              onUpdate={handleCommentUpdate}
              onDelete={handleCommentDelete}
            />
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                加载更多
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 🔥 老王备注：
// 1. 这是评论系统的入口组件
// 2. 支持排序：最新、最早、最热
// 3. 支持分页加载
// 4. 支持回复模式（切换输入框状态）
// 5. 新评论/回复即时显示，不需要刷新
// 6. 删除评论即时从列表移除
