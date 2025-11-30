/**
 * 🔥 老王创建：论坛面包屑导航组件
 * 用途：显示论坛页面层级导航
 * 日期：2025-11-25
 */

"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"
import type { ForumCategory, ForumTag, ForumThread } from "@/types/forum"

/**
 * ForumBreadcrumb - 论坛面包屑导航组件
 *
 * Features:
 * - 显示当前页面的层级路径
 * - 支持多种页面类型（首页、分类、标签、帖子、搜索等）
 * - 双语支持
 * - Next.js Link 集成（客户端导航）
 * - 响应式设计
 *
 * Props:
 * - items: 面包屑项目列表（自动生成）
 * - category: 当前分类（可选）
 * - tag: 当前标签（可选）
 * - thread: 当前帖子（可选）
 * - searchQuery: 搜索关键词（可选）
 * - customPath: 自定义路径（可选）
 */

interface BreadcrumbItem {
  label: string
  label_en?: string
  href?: string
  icon?: React.ReactNode
}

interface ForumBreadcrumbProps {
  items?: BreadcrumbItem[]
  category?: ForumCategory | null
  tag?: ForumTag | null
  thread?: ForumThread | null
  searchQuery?: string
  customPath?: { label: string; label_en?: string; href?: string }[]
}

export function ForumBreadcrumb({
  items,
  category,
  tag,
  thread,
  searchQuery,
  customPath,
}: ForumBreadcrumbProps) {
  const { language } = useLanguage()

  // 自动生成面包屑项目
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const auto: BreadcrumbItem[] = []

    // 首页
    auto.push({
      label: '首页',
      label_en: 'Home',
      href: '/',
      icon: <Home className="h-3 w-3" />,
    })

    // 论坛首页
    auto.push({
      label: '论坛',
      label_en: 'Forum',
      href: '/forum',
    })

    // 自定义路径（优先级最高）
    if (customPath && customPath.length > 0) {
      customPath.forEach(item => auto.push(item))
      return auto
    }

    // 搜索结果页
    if (searchQuery) {
      auto.push({
        label: '搜索结果',
        label_en: 'Search Results',
        href: `/forum/search?q=${encodeURIComponent(searchQuery)}`,
      })
      return auto
    }

    // 分类页面
    if (category) {
      auto.push({
        label: category.name,
        label_en: category.name_en || category.name,
        href: `/forum/category/${category.slug}`,
      })
    }

    // 标签页面 - 🔥 老王修复：forum_tags表没有name_en字段，直接用name
    if (tag) {
      auto.push({
        label: tag.name,
        label_en: tag.name, // 标签名不区分中英文
        href: `/forum/tag/${tag.slug}`,
      })
    }

    // 帖子详情页面
    if (thread) {
      // 如果有分类，先显示分类
      if (thread.category && !category) {
        auto.push({
          label: thread.category.name,
          label_en: thread.category.name_en || thread.category.name,
          href: `/forum/category/${thread.category.slug}`,
        })
      }

      // 帖子标题（当前页面）
      auto.push({
        label: thread.title,
        label_en: thread.title,
      })
    }

    return auto
  })()

  // 如果只有一个项目，不显示面包屑
  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const displayLabel = language === 'zh' ? item.label : (item.label_en || item.label)

          return (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && <BreadcrumbSeparator />}

              <BreadcrumbItem>
                {isLast || !item.href ? (
                  // 当前页面（不可点击）
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {item.icon}
                    <span className="max-w-[200px] truncate" title={displayLabel}>
                      {displayLabel}
                    </span>
                  </BreadcrumbPage>
                ) : (
                  // 可点击的链接
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="flex items-center gap-1.5">
                      {item.icon}
                      <span>{displayLabel}</span>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
