/**
 * 🔥 老王创建：论坛筛选栏组件
 * 用途：帖子列表的排序和筛选功能
 * 日期：2025-11-25
 */

"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, ThumbsUp, MessageSquare, X, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ForumCategory, ForumTag, ForumThreadStatus } from "@/types/forum"

/**
 * ForumFilterBar - 论坛筛选栏组件
 *
 * Features:
 * - 排序选项（latest, hot, top, unanswered）
 * - 分类/标签/状态筛选
 * - URL状态同步（通过 searchParams）
 * - 清除筛选功能
 * - 双语支持
 * - 响应式设计
 *
 * Props:
 * - categories: 分类列表
 * - tags: 标签列表
 * - showStatusFilter: 是否显示状态筛选（默认 false）
 */

interface ForumFilterBarProps {
  categories?: ForumCategory[]
  tags?: ForumTag[]
  showStatusFilter?: boolean
}

type SortOption = 'latest' | 'hot' | 'top' | 'unanswered'

export function ForumFilterBar({
  categories = [],
  tags = [],
  showStatusFilter = false,
}: ForumFilterBarProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 当前筛选状态
  const currentSort = (searchParams.get('sort') || 'latest') as SortOption
  // 老王修复：默认值用 "_all_" 代替空字符串（避免Select报错）
  const currentCategoryId = searchParams.get('category_id') || '_all_'
  const currentTagSlug = searchParams.get('tag_slug') || '_all_'
  const currentStatus = searchParams.get('status') || ''

  // 排序选项配置
  const sortOptions: { value: SortOption; label: string; label_en: string; icon: React.ReactNode }[] = [
    { value: 'latest', label: '最新', label_en: 'Latest', icon: <Clock className="h-4 w-4" /> },
    { value: 'hot', label: '热门', label_en: 'Hot', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'top', label: '最多点赞', label_en: 'Top', icon: <ThumbsUp className="h-4 w-4" /> },
    { value: 'unanswered', label: '未回复', label_en: 'Unanswered', icon: <MessageSquare className="h-4 w-4" /> },
  ]

  // 状态选项
  const statusOptions: { value: ForumThreadStatus | ''; label: string; label_en: string }[] = [
    { value: '', label: '全部', label_en: 'All' },
    { value: 'open', label: '开放', label_en: 'Open' },
    { value: 'closed', label: '已关闭', label_en: 'Closed' },
    { value: 'archived', label: '已归档', label_en: 'Archived' },
  ]

  // 更新URL参数
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // 重置分页
      params.delete('page')

      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  // 排序变化
  const handleSortChange = (sort: SortOption) => {
    updateSearchParams({ sort })
  }

  // 分类变化
  const handleCategoryChange = (categoryId: string) => {
    // 老王修复：使用 "_all_" 作为"所有分类"的特殊值（空字符串会导致Select报错）
    updateSearchParams({ category_id: (categoryId === '' || categoryId === '_all_') ? null : categoryId })
  }

  // 标签变化
  const handleTagChange = (tagSlug: string) => {
    // 老王修复：使用 "_all_" 作为"所有标签"的特殊值（空字符串会导致Select报错）
    updateSearchParams({ tag_slug: (tagSlug === '' || tagSlug === '_all_') ? null : tagSlug })
  }

  // 状态变化
  const handleStatusChange = (status: string) => {
    updateSearchParams({ status: status === '' ? null : status })
  }

  // 清除所有筛选
  const clearAllFilters = () => {
    router.push(pathname)
  }

  // 是否有活动筛选（老王修复：排除 "_all_" 这个特殊值）
  const hasActiveFilters = !!((currentCategoryId && currentCategoryId !== '_all_') || (currentTagSlug && currentTagSlug !== '_all_') || (showStatusFilter && currentStatus))

  // 获取当前分类名称
  const currentCategoryName = categories.find(c => c.id === currentCategoryId)
    ? (language === 'zh'
      ? categories.find(c => c.id === currentCategoryId)!.name
      : (categories.find(c => c.id === currentCategoryId)!.name_en || categories.find(c => c.id === currentCategoryId)!.name))
    : ''

  // 获取当前标签名称 - 🔥 老王修复：forum_tags表没有name_en字段，直接用name
  const currentTagName = tags.find(t => t.slug === currentTagSlug)?.name || ''

  return (
    <div className="space-y-3">
      {/* 排序按钮组 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {language === 'zh' ? '排序：' : 'Sort:'}
        </span>
        {sortOptions.map(option => (
          <Button
            key={option.value}
            variant={currentSort === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange(option.value)}
            className={cn(
              'gap-2',
              currentSort === option.value && 'shadow-sm'
            )}
          >
            {option.icon}
            <span className="hidden sm:inline">
              {language === 'zh' ? option.label : option.label_en}
            </span>
            <span className="sm:hidden">
              {language === 'zh' ? option.label : option.label_en}
            </span>
          </Button>
        ))}
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === 'zh' ? '筛选：' : 'Filter:'}
          </span>
        </div>

        {/* 分类筛选 */}
        {categories.length > 0 && (
          <Select value={currentCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder={language === 'zh' ? '所有分类' : 'All Categories'} />
            </SelectTrigger>
            <SelectContent>
              {/* 老王修复：value不能是空字符串，用 "_all_" 代替 */}
              <SelectItem value="_all_">
                {language === 'zh' ? '所有分类' : 'All Categories'}
              </SelectItem>
              {categories.filter(cat => cat.is_visible).map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <span>
                      {language === 'zh' ? category.name : (category.name_en || category.name)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <Select value={currentTagSlug} onValueChange={handleTagChange}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder={language === 'zh' ? '所有标签' : 'All Tags'} />
            </SelectTrigger>
            <SelectContent>
              {/* 老王修复：value不能是空字符串，用 "_all_" 代替 */}
              <SelectItem value="_all_">
                {language === 'zh' ? '所有标签' : 'All Tags'}
              </SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.slug}>
                  {/* 🔥 老王修复：forum_tags表没有name_en字段，直接用name */}
                  {tag.name}
                  {/* 🔥 老王修复：ForumTag类型用usage_count，不是thread_count */}
                  {tag.usage_count > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {tag.usage_count}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 状态筛选（可选） */}
        {showStatusFilter && (
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder={language === 'zh' ? '所有状态' : 'All Status'} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {language === 'zh' ? option.label : option.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            {language === 'zh' ? '清除筛选' : 'Clear Filters'}
          </Button>
        )}
      </div>

      {/* 当前筛选条件显示 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {language === 'zh' ? '当前筛选：' : 'Active filters:'}
          </span>

          {currentCategoryId && currentCategoryName && (
            <Badge variant="secondary" className="text-xs">
              {language === 'zh' ? '分类' : 'Category'}: {currentCategoryName}
              <button
                onClick={() => handleCategoryChange('')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentTagSlug && currentTagName && (
            <Badge variant="secondary" className="text-xs">
              {language === 'zh' ? '标签' : 'Tag'}: {currentTagName}
              <button
                onClick={() => handleTagChange('')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {showStatusFilter && currentStatus && (
            <Badge variant="secondary" className="text-xs">
              {language === 'zh' ? '状态' : 'Status'}: {statusOptions.find(s => s.value === currentStatus)?.[language === 'zh' ? 'label' : 'label_en']}
              <button
                onClick={() => handleStatusChange('')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
