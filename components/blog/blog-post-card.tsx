"use client"

/**
 * 🔥 老王的博客文章卡片组件
 * 用途: 在列表页展示博客文章摘要
 * 老王警告: 这个卡片支持点赞、分类标签显示，样式要好看！
 */

import React from 'react'
import Link from 'next/link'
import { Heart, Eye, Calendar, User } from 'lucide-react'
import type { BlogPostDetail } from '@/types/blog'
import { Button } from '@/components/ui/button'

interface BlogPostCardProps {
  post: BlogPostDetail
  onLike?: (postId: string) => void
  isLiking?: boolean
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 老王的博客文章卡片
 */
export function BlogPostCard({ post, onLike, isLiking }: BlogPostCardProps) {
  const {
    id,
    title,
    slug,
    excerpt,
    cover_image_url,
    status,
    published_at,
    view_count,
    like_count,
    comment_count,
    author,
    categories,
    tags,
    is_liked
  } = post

  // 点赞处理
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault() // 防止触发Link跳转
    if (onLike) {
      onLike(id)
    }
  }

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* 封面图 */}
      {cover_image_url && (
        <Link href={`/blog/${slug}`}>
          <div className="relative aspect-video w-full overflow-hidden bg-gray-200">
            <img
              src={cover_image_url}
              alt={title}
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      {/* 内容区 */}
      <div className="p-6">
        {/* 分类和标签 */}
        {(categories && categories.length > 0) || (tags && tags.length > 0) ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* 分类 */}
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors"
              >
                {category.name}
              </Link>
            ))}

            {/* 标签 */}
            {tags?.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                href={`/blog?tag=${tag.slug}`}
                className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        {/* 标题 */}
        <Link href={`/blog/${slug}`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors line-clamp-2">
            {title}
          </h2>
        </Link>

        {/* 摘要 */}
        {excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {excerpt}
          </p>
        )}

        {/* 元信息和操作 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {/* 左侧：作者和日期 */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* 作者 */}
            {author && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{author.name}</span>
              </div>
            )}

            {/* 发布日期 */}
            {published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(published_at)}</span>
              </div>
            )}
          </div>

          {/* 右侧：浏览量和点赞 */}
          <div className="flex items-center gap-4">
            {/* 浏览量 */}
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>{view_count}</span>
            </div>

            {/* 点赞按钮 */}
            <Button
              variant={is_liked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              disabled={isLiking || !onLike}
              className="flex items-center gap-1"
            >
              <Heart
                className={`h-4 w-4 ${is_liked ? 'fill-current' : ''}`}
              />
              <span>{like_count}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 草稿标记 */}
      {status === 'draft' && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
          草稿
        </div>
      )}
    </article>
  )
}

// 🔥 老王备注：
// 1. 支持封面图展示，悬停有缩放效果
// 2. 分类和标签可点击跳转到筛选页面
// 3. 点赞按钮有填充效果，已点赞显示实心红心
// 4. 日期显示智能化（今天、昨天、X天前等）
// 5. 摘要和标题都有行数限制（line-clamp）
// 6. 草稿文章显示黄色标记（仅作者可见）
// 7. 卡片悬停有阴影变化效果
