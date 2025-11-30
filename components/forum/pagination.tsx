/**
 * 🔥 老王创建：论坛分页组件
 * 用途：帖子列表的分页导航
 * 日期：2025-11-25
 */

"use client"

import { useCallback, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ForumPagination - 论坛分页组件
 *
 * Features:
 * - 上一页/下一页按钮
 * - 页码显示（最多显示 7 个页码）
 * - 跳转到指定页输入框
 * - URL同步（通过 searchParams）
 * - 双语支持
 * - 响应式设计
 *
 * Props:
 * - currentPage: 当前页码
 * - totalPages: 总页数
 * - onPageChange: 页码变化回调（可选，不传则使用 URL 路由）
 */

interface ForumPaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  onPageChange?: (page: number) => void
}

export function ForumPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: ForumPaginationProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 生成页码数组（最多显示7个页码）
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      // 总页数 <= 7，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总页数 > 7，智能显示
      pages.push(1) // 始终显示第一页

      if (currentPage <= 3) {
        // 当前页靠前：1 2 3 4 5 ... 10
        pages.push(2, 3, 4, 5, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        // 当前页靠后：1 ... 6 7 8 9 10
        pages.push('...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // 当前页居中：1 ... 4 5 6 ... 10
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  // 更新URL参数或调用回调
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || page === currentPage) return

      if (onPageChange) {
        onPageChange(page)
      } else {
        const params = new URLSearchParams(searchParams.toString())
        if (page === 1) {
          params.delete('page')
        } else {
          params.set('page', page.toString())
        }
        router.push(`${pathname}?${params.toString()}`)
      }
    },
    [currentPage, totalPages, onPageChange, searchParams, pathname, router]
  )

  // 处理跳转输入
  const handleJumpToPage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const pageStr = formData.get('jumpPage') as string
    const page = parseInt(pageStr, 10)

    if (!isNaN(page)) {
      goToPage(page)
      // 清空输入框
      e.currentTarget.reset()
    }
  }

  // 如果没有分页，不显示组件
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* 左侧：总数信息 */}
      <div className="text-sm text-muted-foreground">
        {totalItems !== undefined && (
          <span>
            {language === 'zh'
              ? `共 ${totalItems} 条记录`
              : `${totalItems} total items`}
            {' • '}
          </span>
        )}
        <span>
          {language === 'zh'
            ? `第 ${currentPage} / ${totalPages} 页`
            : `Page ${currentPage} of ${totalPages}`}
        </span>
      </div>

      {/* 中间：页码按钮 */}
      <div className="flex items-center gap-1">
        {/* 第一页 */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          title={language === 'zh' ? '第一页' : 'First page'}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* 上一页 */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          title={language === 'zh' ? '上一页' : 'Previous page'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 页码 */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            )
          }

          const pageNum = page as number
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8',
                currentPage === pageNum && 'shadow-sm'
              )}
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </Button>
          )
        })}

        {/* 下一页 */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          title={language === 'zh' ? '下一页' : 'Next page'}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* 最后一页 */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          title={language === 'zh' ? '最后一页' : 'Last page'}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 右侧：跳转输入 */}
      <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {language === 'zh' ? '跳转到' : 'Go to'}
        </span>
        <Input
          type="number"
          name="jumpPage"
          min={1}
          max={totalPages}
          placeholder={language === 'zh' ? '页码' : 'Page'}
          className="h-8 w-16 text-center"
        />
        <Button type="submit" variant="outline" size="sm" className="h-8">
          {language === 'zh' ? '跳转' : 'Go'}
        </Button>
      </form>
    </div>
  )
}
