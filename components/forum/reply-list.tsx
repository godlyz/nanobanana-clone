"use client"

import { useState } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { ForumReplyItem } from "./reply-item"
import { ForumReplyForm } from "./reply-form"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import type { ForumReply } from "@/types/forum"

/**
 * ForumReplyList - 回复列表组件
 *
 * Features:
 * - 显示帖子的所有回复
 * - 支持嵌套回复
 * - 最佳答案优先显示
 * - 分页加载
 * - 回复表单切换
 * - 双语支持
 */

interface ForumReplyListProps {
  threadId: string
  threadAuthorId: string
  currentUserId?: string
  replies: ForumReply[]
  bestAnswerId?: string
  totalCount: number
  currentPage?: number
  pageSize?: number
  onLoadMore?: () => void
  onVote?: (replyId: string, voteType: 'up' | 'down') => void
  onMarkBest?: (replyId: string) => void
  onReport?: (replyId: string) => void
  onPostReply: (content: string, parentReplyId?: string) => Promise<void>
  onEditReply?: (replyId: string, newContent: string) => Promise<void>
  onDeleteReply?: (replyId: string) => Promise<void>
}

export function ForumReplyList({
  threadId,
  threadAuthorId,
  currentUserId,
  replies,
  bestAnswerId,
  totalCount,
  currentPage = 1,
  pageSize = 20,
  onLoadMore,
  onVote,
  onMarkBest,
  onReport,
  onPostReply,
  onEditReply,
  onDeleteReply
}: ForumReplyListProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [showMainReplyForm, setShowMainReplyForm] = useState(false)

  // 按最佳答案优先排序
  const sortedReplies = [...replies].sort((a, b) => {
    if (a.id === bestAnswerId) return -1
    if (b.id === bestAnswerId) return 1
    return 0
  })

  const handlePostReply = async (content: string, parentReplyId?: string) => {
    await onPostReply(content, parentReplyId)
    setReplyingToId(null)
    setShowMainReplyForm(false)
  }

  const hasMore = totalCount > replies.length

  return (
    <div className="space-y-4">
      {/* 回复统计 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {language === 'zh' ? '回复' : 'Replies'} ({totalCount})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMainReplyForm(!showMainReplyForm)}
        >
          {language === 'zh' ? '写回复' : 'Write Reply'}
        </Button>
      </div>

      {/* 主回复表单 */}
      {showMainReplyForm && (
        <ForumReplyForm
          threadId={threadId}
          onSubmit={(content) => handlePostReply(content)}
          onCancel={() => setShowMainReplyForm(false)}
          autoFocus
        />
      )}

      {/* 回复列表 */}
      {sortedReplies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {language === 'zh'
              ? '还没有回复，来发表第一个回复吧！'
              : 'No replies yet. Be the first to reply!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedReplies.map((reply) => (
            <div key={reply.id}>
              <ForumReplyItem
                reply={reply}
                threadId={threadId}
                isAuthor={reply.author?.id === threadAuthorId}
                isReplyAuthor={currentUserId === reply.author?.id}
                isBestAnswer={reply.id === bestAnswerId}
                onVote={onVote}
                onMarkBest={
                  currentUserId === threadAuthorId ? onMarkBest : undefined
                }
                onReport={currentUserId !== reply.author?.id ? onReport : undefined}
                onReply={() => setReplyingToId(reply.id)}
                onEdit={onEditReply}
                onDelete={onDeleteReply}
              />

              {/* 嵌套回复表单 */}
              {replyingToId === reply.id && (
                <div className="ml-8 mt-2">
                  <ForumReplyForm
                    threadId={threadId}
                    parentReplyId={reply.id}
                    onSubmit={(content) => handlePostReply(content, reply.id)}
                    onCancel={() => setReplyingToId(null)}
                    placeholder={
                      // 🔥 老王修复：author类型没有username字段，改用display_name或email
                      language === 'zh'
                        ? `回复 @${reply.author?.display_name || reply.author?.email || '用户'}...`
                        : `Reply to @${reply.author?.display_name || reply.author?.email || 'User'}...`
                    }
                    autoFocus
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onLoadMore}>
            {language === 'zh'
              ? `加载更多 (${replies.length}/${totalCount})`
              : `Load More (${replies.length}/${totalCount})`}
          </Button>
        </div>
      )}
    </div>
  )
}
