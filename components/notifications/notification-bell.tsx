"use client"

/**
 * 🔥 老王的通知铃铛组件
 * 用途: 导航栏通知图标，显示未读数量，点击展开下拉菜单
 * 老王警告: 这玩意儿要定时轮询未读数量，别搞太频繁！
 */

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { NotificationItem } from './notification-item'
import type { NotificationWithUser } from '@/types/notification'

interface NotificationBellProps {
  userId: string | null
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // 获取未读数量
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return

    try {
      const res = await fetch('/api/notifications/unread-count')
      const data = await res.json()
      if (data.success) {
        setUnreadCount(data.count || 0)
      }
    } catch (err) {
      console.error('获取未读数量失败:', err)
    }
  }, [userId])

  // 获取最新通知
  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=10')
      const data = await res.json()
      if (data.success && data.data) {
        setNotifications(data.data)
      }
    } catch (err) {
      console.error('获取通知列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 标记全部已读
  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return

    setMarkingAllRead(true)
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()

      if (data.success) {
        setUnreadCount(0)
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        )
      }
    } catch (err) {
      console.error('标记已读失败:', err)
    } finally {
      setMarkingAllRead(false)
    }
  }

  // 点击单条通知
  const handleNotificationClick = async (notification: NotificationWithUser) => {
    if (notification.is_read) return

    // 标记为已读
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notification.id] })
      })

      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (err) {
      console.error('标记已读失败:', err)
    }
  }

  // 初始加载和定时轮询
  useEffect(() => {
    if (!userId) return

    fetchUnreadCount()

    // 每 30 秒轮询一次未读数量
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [userId, fetchUnreadCount])

  // 打开下拉菜单时加载通知
  useEffect(() => {
    if (open && userId) {
      fetchNotifications()
    }
  }, [open, userId, fetchNotifications])

  // 未登录不显示
  if (!userId) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0" align="end">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">通知</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              全部已读
            </Button>
          )}
        </div>

        {/* 通知列表 */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        {notifications.length > 0 && (
          <div className="p-3 border-t text-center">
            <Link
              href="/notifications"
              className="text-sm text-blue-500 hover:underline"
              onClick={() => setOpen(false)}
            >
              查看全部通知
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// 🔥 老王备注：
// 1. 未登录不显示铃铛
// 2. 未读数量 > 99 显示 "99+"
// 3. 每 30 秒轮询一次未读数量
// 4. 点击通知自动标记已读
// 5. 支持全部标记已读
// 6. 下拉菜单最多显示 10 条
