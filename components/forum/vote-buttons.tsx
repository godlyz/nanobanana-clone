/**
 * 🔥 老王创建：论坛投票按钮组件
 * 用途：帖子/回复的点赞/踩按钮和显示
 * 日期：2025-11-25
 */

"use client"

import { useState, useCallback } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ForumVoteType } from "@/types/forum"

/**
 * ForumVoteButtons - 投票按钮组件
 *
 * Features:
 * - 点赞/踩按钮
 * - 净票数显示（upvote_count - downvote_count）
 * - 乐观UI更新（立即反馈，失败时回滚）
 * - API集成 (/api/forum/votes)
 * - 用户登录检测
 * - 双语支持
 * - 防抖处理（避免重复点击）
 *
 * Props:
 * - target_type: 'thread' | 'reply' - 投票对象类型
 * - target_id: string - 投票对象ID
 * - upvote_count: number - 点赞数
 * - downvote_count: number - 踩数
 * - user_vote: ForumVoteType | null - 当前用户的投票状态
 * - onVoteChange: (newVote: ForumVoteType | null) => void - 投票变化回调
 * - disabled: boolean - 是否禁用
 * - size: 'sm' | 'md' | 'lg' - 按钮尺寸
 */

interface ForumVoteButtonsProps {
  target_type: 'thread' | 'reply'
  target_id: string
  upvote_count: number
  downvote_count: number
  user_vote?: ForumVoteType | null
  onVoteChange?: (newVote: ForumVoteType | null, upvotes: number, downvotes: number) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ForumVoteButtons({
  target_type,
  target_id,
  upvote_count,
  downvote_count,
  user_vote = null,
  onVoteChange,
  disabled = false,
  size = 'md',
}: ForumVoteButtonsProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  // 🔥 老王修复：useToast返回{addToast, removeToast, toasts}，不是{toast}
  const { addToast } = useToast()

  // 本地状态（乐观UI更新）
  const [localUpvotes, setLocalUpvotes] = useState(upvote_count)
  const [localDownvotes, setLocalDownvotes] = useState(downvote_count)
  const [localUserVote, setLocalUserVote] = useState<ForumVoteType | null>(user_vote || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 计算净票数
  const netVotes = localUpvotes - localDownvotes

  // 按钮尺寸配置
  const sizeConfig = {
    sm: {
      button: 'h-7 w-7 p-0',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      button: 'h-8 w-8 p-0',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      button: 'h-9 w-9 p-0',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  }

  const config = sizeConfig[size]

  // 处理投票
  const handleVote = useCallback(
    async (voteType: ForumVoteType) => {
      if (isSubmitting || disabled) return

      // 乐观UI更新
      const prevUpvotes = localUpvotes
      const prevDownvotes = localDownvotes
      const prevUserVote = localUserVote

      try {
        setIsSubmitting(true)

        // 计算乐观更新的票数
        let newUpvotes = localUpvotes
        let newDownvotes = localDownvotes
        let newUserVote: ForumVoteType | null = voteType

        // 情况1：用户点击相同类型的按钮 → 取消投票
        if (localUserVote === voteType) {
          newUserVote = null
          if (voteType === 'upvote') {
            newUpvotes -= 1
          } else {
            newDownvotes -= 1
          }
        }
        // 情况2：用户从upvote切换到downvote
        else if (localUserVote === 'upvote' && voteType === 'downvote') {
          newUpvotes -= 1
          newDownvotes += 1
          newUserVote = 'downvote'
        }
        // 情况3：用户从downvote切换到upvote
        else if (localUserVote === 'downvote' && voteType === 'upvote') {
          newUpvotes += 1
          newDownvotes -= 1
          newUserVote = 'upvote'
        }
        // 情况4：用户首次投票
        else {
          if (voteType === 'upvote') {
            newUpvotes += 1
          } else {
            newDownvotes += 1
          }
        }

        // 立即更新UI（乐观更新）
        setLocalUpvotes(newUpvotes)
        setLocalDownvotes(newDownvotes)
        setLocalUserVote(newUserVote)

        // 调用回调
        if (onVoteChange) {
          onVoteChange(newUserVote, newUpvotes, newDownvotes)
        }

        // 调用API
        const response = await fetch('/api/forum/votes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            thread_id: target_type === 'thread' ? target_id : undefined,
            reply_id: target_type === 'reply' ? target_id : undefined,
            vote_type: voteType,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Vote failed')
        }

        // API返回成功，什么都不做（因为我们已经乐观更新了）
        // console.log('Vote API success:', data)

      } catch (error: any) {
        console.error('Vote error:', error)

        // 回滚乐观更新
        setLocalUpvotes(prevUpvotes)
        setLocalDownvotes(prevDownvotes)
        setLocalUserVote(prevUserVote)

        if (onVoteChange) {
          onVoteChange(prevUserVote, prevUpvotes, prevDownvotes)
        }

        // 显示错误提示 - 🔥 老王修复：addToast接收(message, type, duration)参数
        const errorTitle = language === 'zh' ? '投票失败' : 'Vote Failed'
        const errorDesc = error.message === 'Authentication required'
          ? (language === 'zh' ? '请先登录' : 'Please login first')
          : (language === 'zh' ? '投票失败，请稍后重试' : 'Failed to vote, please try again')
        addToast(`${errorTitle}: ${errorDesc}`, 'error')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSubmitting,
      disabled,
      localUpvotes,
      localDownvotes,
      localUserVote,
      target_type,
      target_id,
      onVoteChange,
      language,
      addToast, // 🔥 老王修复：改成addToast
    ]
  )

  return (
    <div className="flex items-center gap-1">
      {/* Upvote按钮 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          config.button,
          localUserVote === 'upvote'
            ? 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/50 dark:hover:bg-green-900/50'
            : 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'
        )}
        onClick={() => handleVote('upvote')}
        disabled={isSubmitting || disabled}
        title={language === 'zh' ? '赞' : 'Upvote'}
      >
        {isSubmitting && localUserVote === 'upvote' ? (
          <Loader2 className={cn(config.icon, 'animate-spin')} />
        ) : (
          <ThumbsUp
            className={cn(
              config.icon,
              localUserVote === 'upvote' && 'fill-current'
            )}
          />
        )}
      </Button>

      {/* 净票数显示 */}
      <span
        className={cn(
          config.text,
          'font-medium min-w-[2rem] text-center tabular-nums',
          netVotes > 0 && 'text-green-600',
          netVotes < 0 && 'text-red-600',
          netVotes === 0 && 'text-muted-foreground'
        )}
      >
        {netVotes > 0 && '+'}
        {netVotes}
      </span>

      {/* Downvote按钮 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          config.button,
          localUserVote === 'downvote'
            ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50'
            : 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
        )}
        onClick={() => handleVote('downvote')}
        disabled={isSubmitting || disabled}
        title={language === 'zh' ? '踩' : 'Downvote'}
      >
        {isSubmitting && localUserVote === 'downvote' ? (
          <Loader2 className={cn(config.icon, 'animate-spin')} />
        ) : (
          <ThumbsDown
            className={cn(
              config.icon,
              localUserVote === 'downvote' && 'fill-current'
            )}
          />
        )}
      </Button>
    </div>
  )
}
