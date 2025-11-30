/**
 * 🔥 老王创建：论坛分类列表组件
 * 用途：显示论坛的所有分类，支持选中状态高亮
 * 日期：2025-11-25
 */

"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Users } from "lucide-react"
import type { ForumCategoryListProps } from "@/types/forum"
import { cn } from "@/lib/utils"

/**
 * 论坛分类列表组件
 *
 * Features:
 * - 显示所有可见的论坛分类
 * - 高亮当前选中的分类
 * - 显示每个分类的图标、名称、描述
 * - 显示帖子数量和回复数量统计
 * - 支持中英双语
 * - 响应式设计（移动端自适应）
 *
 * @example
 * ```tsx
 * <ForumCategoryList
 *   categories={categories}
 *   currentCategoryId={categoryId}
 * />
 * ```
 */
export function ForumCategoryList({ categories, currentCategoryId }: ForumCategoryListProps) {
  const { language, t } = useLanguage()

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {language === 'zh' ? '暂无分类' : 'No categories available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const isActive = currentCategoryId === category.id
        const categoryName = language === 'zh' ? category.name : (category.name_en || category.name)
        const categoryDesc = language === 'zh'
          ? category.description
          : (category.description_en || category.description)

        return (
          <Link
            key={category.id}
            href={`/forum?category=${category.slug}`}
            className="block transition-transform hover:scale-105"
          >
            <Card
              className={cn(
                "h-full transition-colors",
                isActive && "border-primary bg-primary/5"
              )}
              style={{
                borderLeftWidth: isActive ? '4px' : undefined,
                borderLeftColor: isActive ? category.color : undefined,
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* 分类图标 */}
                    {category.icon && (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{categoryName}</CardTitle>
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                        style={{
                          borderColor: category.color,
                          color: category.color
                        }}
                      >
                        {category.slug}
                      </Badge>
                    </div>
                  </div>
                </div>

                {categoryDesc && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {categoryDesc}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {/* 帖子数量 */}
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>
                      {category.thread_count} {language === 'zh' ? '帖子' : 'threads'}
                    </span>
                  </div>

                  {/* 回复数量 */}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {category.reply_count} {language === 'zh' ? '回复' : 'replies'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
