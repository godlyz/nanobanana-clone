"use client"

/**
 * 🔥 老王的通知项组件
 * 用途: 显示单条通知
 * 老王警告: 不同类型的通知显示不同的图标和内容！
 */

import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  User,
  UserPlus,
  Heart,
  MessageCircle,
  AtSign,
  Reply,
  Bell
} from 'lucide-react'
import type { NotificationWithUser, NotificationType } from '@/types/notification'

interface NotificationItemProps {
  notification: NotificationWithUser
  onClick?: () => void
}

// 通知类型配置
const notificationConfig: Record<NotificationType, {
  icon: React.ElementType
  iconClass: string
  bgClass: string
  getLink: (n: NotificationWithUser) => string
}> = {
  follow: {
    icon: UserPlus,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-100',
    getLink: (n) => n.from_user ? `/profile/${n.from_user.user_id}` : '#'
  },
  like: {
    icon: Heart,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-100',
    getLink: (n) => {
      if (n.content_type === 'blog_post') return `/blog/${n.content_id}`
      if (n.content_type === 'artwork') return `/artworks/${n.content_id}`
      if (n.content_type === 'video') return `/videos/${n.content_id}`
      return '#'
    }
  },
  comment: {
    icon: MessageCircle,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-100',
    getLink: (n) => {
      if (n.content_type === 'blog_post') return `/blog/${n.content_id}`
      if (n.content_type === 'artwork') return `/artworks/${n.content_id}`
      if (n.content_type === 'video') return `/videos/${n.content_id}`
      return '#'
    }
  },
  mention: {
    icon: AtSign,
    iconClass: 'text-purple-500',
    bgClass: 'bg-purple-100',
    getLink: (n) => {
      if (n.content_type === 'comment') return `#comment-${n.content_id}`
      return '#'
    }
  },
  reply: {
    icon: Reply,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-100',
    getLink: (n) => {
      if (n.content_type === 'comment') return `#comment-${n.content_id}`
      return '#'
    }
  },
  system: {
    icon: Bell,
    iconClass: 'text-gray-500',
    bgClass: 'bg-gray-100',
    getLink: () => '#'
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = notificationConfig[notification.type]
  const Icon = config.icon
  const link = config.getLink(notification)

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: zhCN
  })

  // 构建通知内容
  const renderContent = () => {
    const fromUserName = notification.from_user?.display_name || '有人'

    switch (notification.type) {
      case 'follow':
        return (
          <span>
            <strong>{fromUserName}</strong> 关注了你
          </span>
        )
      case 'like':
        return (
          <span>
            <strong>{fromUserName}</strong> 赞了你的{getContentTypeName(notification.content_type)}
          </span>
        )
      case 'comment':
        return (
          <span>
            <strong>{fromUserName}</strong> 评论了你的{getContentTypeName(notification.content_type)}
          </span>
        )
      case 'mention':
        return (
          <span>
            <strong>{fromUserName}</strong> 在评论中提到了你
          </span>
        )
      case 'reply':
        return (
          <span>
            <strong>{fromUserName}</strong> 回复了你的评论
          </span>
        )
      case 'system':
        return (
          <span>
            {notification.title || '系统通知'}
          </span>
        )
      default:
        return <span>{notification.message || '新通知'}</span>
    }
  }

  const content = (
    <div
      className={`flex gap-3 p-4 rounded-lg transition-colors cursor-pointer ${
        notification.is_read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50/50 hover:bg-blue-50'
      }`}
      onClick={onClick}
    >
      {/* 通知图标 */}
      <div className={`w-10 h-10 rounded-full ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${config.iconClass}`} />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* 触发者头像 */}
          {notification.from_user && (
            <Link
              href={`/profile/${notification.from_user.user_id}`}
              className="flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {notification.from_user.avatar_url ? (
                <img
                  src={notification.from_user.avatar_url}
                  alt={notification.from_user.display_name || '用户'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </Link>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {renderContent()}
            </p>
            {notification.message && notification.type !== 'follow' && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {notification.message}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
          </div>

          {/* 未读标记 */}
          {!notification.is_read && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
          )}
        </div>
      </div>
    </div>
  )

  // 如果有链接，包装成 Link
  if (link !== '#') {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// 获取内容类型名称
function getContentTypeName(type: string | null): string {
  switch (type) {
    case 'blog_post': return '文章'
    case 'artwork': return '作品'
    case 'video': return '视频'
    case 'comment': return '评论'
    default: return '内容'
  }
}

// 🔥 老王备注：
// 1. 不同类型通知显示不同图标和颜色
// 2. 未读通知有蓝色背景和小圆点
// 3. 点击通知跳转到对应内容
// 4. 系统通知没有触发者头像
