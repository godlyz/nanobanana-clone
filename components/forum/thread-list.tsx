/**
 * 🔥 老王创建：论坛帖子列表组件
 * 用途：显示帖子列表和分页控制
 * 日期：2025-11-25
 */

"use client"

import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { ForumThreadCard } from "./thread-card"
import type { ForumThreadListProps } from "@/types/forum"
import { cn } from "@/lib/utils"

/**
 * 论坛帖子列表组件
 *
 * Features:
 * - 显示帖子列表（使用ForumThreadCard）
 * - 分页控制（首页、上一页、下一页、末页）
 * - 显示当前页码和总页数
 * - 空状态提示
 * - 支持中英双语
 * - 响应式设计
 *
 * @example
 * ```tsx
 * <ForumThreadList
 *   threads={threads}
 *   pagination={pagination}
 *   onPageChange={(page) => console.log('Page changed:', page)}
 * />
 * ```
 */
export function ForumThreadList({
  threads,
  pagination,
  onPageChange,
}: ForumThreadListProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言

  // 空状态
  if (!threads || threads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">
              {language === 'zh' ? '暂无帖子' : 'No threads yet'}
            </p>
            <p className="text-sm">
              {language === 'zh'
                ? '成为第一个发帖的人吧！'
                : 'Be the first to start a discussion!'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 计算页码范围（显示当前页前后2页）
  const getPageRange = () => {
    const { page, total_pages } = pagination
    const range: number[] = []

    // 如果总页数<=7，显示所有页码
    if (total_pages <= 7) {
      for (let i = 1; i <= total_pages; i++) {
        range.push(i)
      }
      return range
    }

    // 否则智能显示页码
    if (page <= 3) {
      // 靠近开头
      return [1, 2, 3, 4, 5, -1, total_pages]
    } else if (page >= total_pages - 2) {
      // 靠近结尾
      return [1, -1, total_pages - 4, total_pages - 3, total_pages - 2, total_pages - 1, total_pages]
    } else {
      // 中间位置
      return [1, -1, page - 1, page, page + 1, -1, total_pages]
    }
  }

  const pageRange = getPageRange()

  return (
    <div className="space-y-4">
      {/* 帖子列表 */}
      <div className="space-y-3">
        {threads.map((thread) => (
          <ForumThreadCard
            key={thread.id}
            thread={thread}
            showCategory={true}
          />
        ))}
      </div>

      {/* 分页控制 */}
      {pagination.total_pages > 1 && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* 分页信息 */}
          <div className="text-sm text-muted-foreground">
            {language === 'zh' ? (
              <>
                第 <span className="font-medium">{pagination.page}</span> 页，
                共 <span className="font-medium">{pagination.total_pages}</span> 页
                （共 <span className="font-medium">{pagination.total}</span> 个帖子）
              </>
            ) : (
              <>
                Page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.total_pages}</span>
                {' '}(<span className="font-medium">{pagination.total}</span> total threads)
              </>
            )}
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center gap-2">
            {/* 首页 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={!pagination.has_prev}
              title={language === 'zh' ? '首页' : 'First page'}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* 上一页 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
              title={language === 'zh' ? '上一页' : 'Previous page'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* 页码按钮 */}
            <div className="hidden sm:flex items-center gap-2">
              {pageRange.map((pageNum, index) => {
                if (pageNum === -1) {
                  // 省略号
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      pageNum === pagination.page && 'pointer-events-none'
                    )}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            {/* 下一页 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
              title={language === 'zh' ? '下一页' : 'Next page'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* 末页 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(pagination.total_pages)}
              disabled={!pagination.has_next}
              title={language === 'zh' ? '末页' : 'Last page'}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* 移动端简化版页码显示 */}
          <div className="sm:hidden text-sm text-muted-foreground">
            {pagination.page} / {pagination.total_pages}
          </div>
        </div>
      )}
    </div>
  )
}
