/**
 * 🔥 老王创建：论坛侧边栏组件
 * 用途：显示分类快速导航、热门标签、统计数据
 * 日期：2025-11-25
 */

"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MessageSquare,
  Users,
  TrendingUp,
  Tag,
  BarChart3,
} from "lucide-react"
import type { ForumCategory, ForumTag } from "@/types/forum"
import { cn } from "@/lib/utils"

/**
 * 论坛侧边栏组件Props
 */
export interface ForumSidebarProps {
  categories: ForumCategory[]
  popularTags?: ForumTag[]
  stats?: {
    total_threads: number
    total_replies: number
    total_users: number
    active_users_today?: number
  }
  currentCategoryId?: string
  currentTagSlug?: string
}

/**
 * 论坛侧边栏组件
 *
 * Features:
 * - 显示所有分类的快速导航
 * - 显示热门标签（按使用次数排序）
 * - 显示论坛统计数据
 * - 高亮当前选中的分类/标签
 * - 支持中英双语
 * - 响应式设计（移动端可隐藏）
 *
 * @example
 * ```tsx
 * <ForumSidebar
 *   categories={categories}
 *   popularTags={tags}
 *   stats={stats}
 *   currentCategoryId={categoryId}
 * />
 * ```
 */
export function ForumSidebar({
  categories,
  popularTags,
  stats,
  currentCategoryId,
  currentTagSlug,
}: ForumSidebarProps) {
  const { language } = useLanguage()

  return (
    <div className="space-y-6">
      {/* 分类快速导航 */}
      {categories && categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              {language === 'zh' ? '分类' : 'Categories'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* 全部分类 */}
            <Link
              href="/forum"
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                !currentCategoryId && "bg-accent font-medium"
              )}
            >
              <span>{language === 'zh' ? '全部' : 'All'}</span>
              <Badge variant="secondary" className="text-xs">
                {categories.reduce((sum, cat) => sum + cat.thread_count, 0)}
              </Badge>
            </Link>

            <Separator className="my-2" />

            {/* 分类列表 */}
            {categories.map((category) => {
              const isActive = currentCategoryId === category.id
              const categoryName = language === 'zh'
                ? category.name
                : (category.name_en || category.name)

              return (
                <Link
                  key={category.id}
                  href={`/forum?category=${category.slug}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                    isActive && "bg-accent font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {category.icon && (
                      <span className="flex-shrink-0">{category.icon}</span>
                    )}
                    <span className="truncate">{categoryName}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {category.thread_count}
                  </Badge>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 热门标签 */}
      {popularTags && popularTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" />
              {language === 'zh' ? '热门标签' : 'Popular Tags'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => {
                const isActive = currentTagSlug === tag.slug

                return (
                  <Link
                    key={tag.id}
                    href={`/forum?tag=${tag.slug}`}
                  >
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground",
                        isActive && "pointer-events-none"
                      )}
                    >
                      <Tag className="mr-1 h-3 w-3" />
                      {tag.name}
                      <span className="ml-1 opacity-70">({tag.usage_count})</span>
                    </Badge>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计数据 */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {language === 'zh' ? '统计' : 'Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 帖子总数 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{language === 'zh' ? '总帖子数' : 'Total Threads'}</span>
              </div>
              <span className="font-semibold">{stats.total_threads.toLocaleString()}</span>
            </div>

            {/* 回复总数 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{language === 'zh' ? '总回复数' : 'Total Replies'}</span>
              </div>
              <span className="font-semibold">{stats.total_replies.toLocaleString()}</span>
            </div>

            {/* 用户总数 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{language === 'zh' ? '总用户数' : 'Total Users'}</span>
              </div>
              <span className="font-semibold">{stats.total_users.toLocaleString()}</span>
            </div>

            {/* 今日活跃用户（可选） */}
            {stats.active_users_today !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{language === 'zh' ? '今日活跃' : 'Active Today'}</span>
                </div>
                <span className="font-semibold text-green-600">
                  {stats.active_users_today.toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
