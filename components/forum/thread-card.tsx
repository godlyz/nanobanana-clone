/**
 * 🔥 老王创建：论坛帖子卡片组件
 * 用途：显示单个帖子的预览信息
 * 日期：2025-11-25
 */

"use client"

import Link from "next/link"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageSquare,
  Eye,
  ThumbsUp,
  Pin,
  Lock,
  Star,
  Clock,
  User,
} from "lucide-react"
import type { ForumThreadCardProps } from "@/types/forum"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/forum-utils"

/**
 * 论坛帖子卡片组件
 *
 * Features:
 * - 显示帖子标题、作者、分类、状态
 * - 显示置顶、锁定、精华等标识
 * - 显示阅读数、回复数、点赞数
 * - 显示最后回复时间和用户
 * - 支持中英双语
 * - 悬停效果
 *
 * @example
 * ```tsx
 * <ForumThreadCard
 *   thread={thread}
 *   showCategory={true}
 * />
 * ```
 */
export function ForumThreadCard({ thread, showCategory = true }: ForumThreadCardProps) {
  const language = useLocale() as 'zh' | 'en'  // 🔥 老王迁移：useLocale返回当前语言，类型断言为zh或en

  const authorName = thread.author?.display_name || thread.author?.email?.split('@')[0] || 'Anonymous'
  const categoryName = showCategory && thread.category
    ? (language === 'zh' ? thread.category.name : (thread.category.name_en || thread.category.name))
    : null

  const lastReplyUserName = thread.last_reply_user
    ? (thread.last_reply_user.display_name || thread.last_reply_user.email?.split('@')[0] || 'Anonymous')
    : null

  return (
    <Link
      href={`/forum/threads/${thread.slug}`}
      className="block"
    >
      <Card
        className={cn(
          "transition-all hover:border-primary hover:shadow-md",
          thread.is_pinned && "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900/50",
          thread.is_featured && !thread.is_pinned && "border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900/50"
        )}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* 左侧：作者头像 */}
            <div className="flex-shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={thread.author?.avatar_url} alt={authorName} />
                <AvatarFallback>
                  {authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* 右侧：帖子信息 */}
            <div className="flex-1 min-w-0">
              {/* 标题行 */}
              <div className="flex items-start gap-2 mb-2">
                {/* 状态图标 - 🔥 老王修复：lucide-react图标不支持title属性，移除 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {thread.is_pinned && (
                    <Pin className="h-4 w-4 text-yellow-500" aria-label={language === 'zh' ? '置顶' : 'Pinned'} />
                  )}
                  {thread.is_featured && (
                    <Star className="h-4 w-4 text-orange-500" aria-label={language === 'zh' ? '精华' : 'Featured'} />
                  )}
                  {thread.is_locked && (
                    <Lock className="h-4 w-4 text-red-500" aria-label={language === 'zh' ? '锁定' : 'Locked'} />
                  )}
                </div>

                {/* 标题 */}
                <h3 className="font-semibold text-base line-clamp-2 flex-1 hover:text-primary transition-colors">
                  {thread.title}
                </h3>
              </div>

              {/* 元信息行 */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                {/* 作者 */}
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{authorName}</span>
                </div>

                {/* 置顶标签 */}
                {thread.is_pinned && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {language === 'zh' ? '置顶' : 'Pinned'}
                  </Badge>
                )}

                {/* 精华标签 */}
                {thread.is_featured && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    {language === 'zh' ? '精华' : 'Featured'}
                  </Badge>
                )}

                {/* 分类 */}
                {categoryName && thread.category && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: thread.category.color,
                      color: thread.category.color,
                    }}
                  >
                    {categoryName}
                  </Badge>
                )}

                {/* 创建时间 */}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(thread.created_at, language)}</span>
                </div>

                {/* 状态标签 */}
                {thread.status !== 'open' && (
                  <Badge variant="secondary" className="text-xs">
                    {thread.status === 'closed'
                      ? (language === 'zh' ? '已关闭' : 'Closed')
                      : (language === 'zh' ? '已归档' : 'Archived')
                    }
                  </Badge>
                )}
              </div>

              {/* 统计行 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {/* 阅读数 */}
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{thread.view_count}</span>
                </div>

                {/* 回复数 */}
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{thread.reply_count}</span>
                </div>

                {/* 点赞数 */}
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{thread.upvote_count}</span>
                </div>

                {/* 最后回复 */}
                {thread.last_reply_at && lastReplyUserName && (
                  <div className="ml-auto flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">
                      {language === 'zh' ? '最后回复：' : 'Last reply: '}
                    </span>
                    <span className="font-medium">{lastReplyUserName}</span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(thread.last_reply_at, language)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
