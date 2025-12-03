/**
 * 🔥 老王创建：论坛搜索栏组件
 * 用途：全文搜索帖子（支持实时搜索建议）
 * 日期：2025-11-25
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Button } from "@/components/ui/button"
import { Search, X, Loader2 } from "lucide-react"

interface ForumSearchBarProps {
  placeholder?: string
  autoFocus?: boolean
}

/**
 * 论坛搜索栏
 *
 * Features:
 * - 实时搜索（输入后回车或点击搜索按钮）
 * - 显示搜索历史（可选）
 * - 清空按钮
 * - 双语支持
 * - 响应式设计
 */
export function ForumSearchBar({
  placeholder,
  autoFocus = false
}: ForumSearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [isSearching, setIsSearching] = useState(false)

  // 处理搜索提交
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()

    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      // 搜索关键词太短
      inputRef.current?.focus()
      return
    }

    setIsSearching(true)

    // 构建查询参数
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', trimmedQuery)
    params.delete('page') // 新搜索重置页码

    // 跳转到搜索结果页
    router.push(`/forum?${params.toString()}`)

    // 延迟重置loading状态
    setTimeout(() => setIsSearching(false), 500)
  }

  // 清空搜索
  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()

    // 如果当前在搜索结果页，返回论坛首页
    if (searchParams.get('q')) {
      router.push('/forum')
    }
  }

  // 处理回车键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        {/* 搜索图标 */}
        <div className="absolute left-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* 搜索输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (language === 'zh'
              ? '搜索帖子、问题、讨论...'
              : 'Search threads, questions, discussions...')
          }
          autoFocus={autoFocus}
          disabled={isSearching}
          className="w-full h-10 pl-10 pr-20 rounded-md border border-input bg-background text-sm
                     focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50
                     placeholder:text-muted-foreground"
        />

        {/* 清空按钮 */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 flex items-center justify-center h-6 w-6
                       rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* 搜索按钮 */}
        <Button
          type="submit"
          size="sm"
          disabled={isSearching || query.trim().length < 2}
          className="absolute right-1 h-8"
        >
          {language === 'zh' ? '搜索' : 'Search'}
        </Button>
      </div>

      {/* 搜索提示 */}
      {query.length > 0 && query.length < 2 && (
        <p className="mt-1 text-xs text-destructive">
          {language === 'zh'
            ? '至少输入2个字符'
            : 'Enter at least 2 characters'}
        </p>
      )}
    </form>
  )
}
