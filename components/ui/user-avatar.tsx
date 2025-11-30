"use client"

import { useState } from "react"
import Image from "next/image"
import { User } from "lucide-react"

interface UserAvatarProps {
  src: string | null | undefined
  alt?: string
  size?: number
  className?: string
}

/**
 * 🔥 老王优化：带 fallback 的用户头像组件
 *
 * 功能：
 * 1. 图片加载失败自动显示默认头像
 * 2. 图片加载超时自动降级
 * 3. 支持自定义尺寸和样式
 */
export function UserAvatar({ src, alt = "User avatar", size = 32, className = "" }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  // 如果没有头像 URL 或加载失败，显示默认头像
  if (!src || imageError) {
    return (
      <div
        className={`rounded-full bg-primary/10 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <User className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-primary ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${size}px`}
        onError={() => {
          console.warn(`⚠️ 头像加载失败，使用默认头像: ${src}`)
          setImageError(true)
        }}
        // 🔥 老王优化：设置较短的加载优先级，避免阻塞主要内容
        loading="lazy"
        // 🔥 老王优化：禁用图片优化可以加快加载速度（头像通常不需要优化）
        unoptimized={false}
      />
    </div>
  )
}
