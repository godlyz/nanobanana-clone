"use client"

/**
 * 🔥 老王的作品详情弹窗组件
 * 用途: 显示图片/视频作品的详细信息，支持点赞、分享等操作
 * 老王警告: 这个弹窗要支持ESC关闭和点击外部关闭，用户体验不能SB！
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  Heart,
  Download,
  User,
  Calendar,
  Loader2,
  Play,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SocialShareButtons } from '@/components/social-share-buttons'
import { PrivacySelector } from '@/components/privacy-selector'
import { EmbedCodeGenerator } from '@/components/embed-code-generator'
import type { ArtworkItem } from '@/types/profile'

interface ArtworkDetailModalProps {
  artwork: ArtworkItem
  isOpen: boolean
  onClose: () => void
  onLikeChange?: (artworkId: string, isLiked: boolean, newCount: number) => void
}

export default function ArtworkDetailModal({
  artwork,
  isOpen,
  onClose,
  onLikeChange
}: ArtworkDetailModalProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(artwork.is_liked || false)
  const [likeCount, setLikeCount] = useState(artwork.like_count || 0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'followers_only'>(
    (artwork as any).privacy || 'public'
  )

  // 1. 获取当前登录用户
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          setCurrentUserId(data.user.id)
        }
      } catch (err) {
        console.error('获取当前用户失败:', err)
      }
    }
    fetchCurrentUser()
  }, [])

  // 2. 同步artwork的点赞状态
  useEffect(() => {
    setIsLiked(artwork.is_liked || false)
    setLikeCount(artwork.like_count || 0)
  }, [artwork])

  // 3. ESC键关闭弹窗
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // 4. 处理点赞
  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    setLikeLoading(true)

    try {
      const method = isLiked ? 'DELETE' : 'POST'
      const res = await fetch(
        `/api/artworks/${artwork.id}/like?type=${artwork.type}`,
        { method }
      )
      const data = await res.json()

      if (data.success) {
        const newIsLiked = data.data.is_liked
        const newCount = data.data.like_count
        setIsLiked(newIsLiked)
        setLikeCount(newCount)
        // 通知父组件更新
        onLikeChange?.(artwork.id, newIsLiked, newCount)
      }
    } catch (err) {
      console.error('点赞操作失败:', err)
    } finally {
      setLikeLoading(false)
    }
  }

  // 5. 处理隐私变更
  const handlePrivacyChange = async (newPrivacy: 'public' | 'private' | 'followers_only') => {
    if (!currentUserId || currentUserId !== artwork.user_id) {
      return // 只有作品所有者可以修改隐私
    }

    try {
      const res = await fetch(`/api/artworks/${artwork.id}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privacy: newPrivacy,
          type: artwork.type
        })
      })

      const data = await res.json()
      if (data.success) {
        setPrivacy(newPrivacy)
      }
    } catch (err) {
      console.error('隐私设置失败:', err)
    }
  }

  // 6. 处理下载
  const handleDownload = async () => {
    const url = artwork.type === 'video' ? artwork.video_url : artwork.image_url
    if (!url) return

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${artwork.type}-${artwork.id}.${artwork.type === 'video' ? 'mp4' : 'png'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('下载失败:', err)
      // 备用方案：直接打开新窗口
      window.open(url, '_blank')
    }
  }

  // 7. 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* 弹窗内容 */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[90vh] mx-4 bg-white rounded-xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 左侧：媒体内容 */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
          {artwork.type === 'video' && artwork.video_url ? (
            <video
              src={artwork.video_url}
              poster={artwork.image_url}
              controls
              autoPlay
              loop
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : artwork.image_url ? (
            <img
              src={artwork.image_url}
              alt={artwork.prompt}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : (
            <div className="w-full h-full min-h-[300px] bg-gray-800 flex items-center justify-center">
              <Play className="h-16 w-16 text-gray-600" />
            </div>
          )}
        </div>

        {/* 右侧：详情信息 */}
        <div className="w-full md:w-80 flex flex-col bg-white">
          {/* 作者信息 */}
          <div className="p-4 border-b">
            <Link
              href={`/profile/${artwork.user_id}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              onClick={onClose}
            >
              {artwork.user?.avatar_url ? (
                <img
                  src={artwork.user.avatar_url}
                  alt={artwork.user.display_name || '用户'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {artwork.user?.display_name || '未设置昵称'}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(artwork.created_at)}
                </p>
              </div>
            </Link>
          </div>

          {/* Prompt */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {artwork.type === 'video' ? '视频提示词' : '图片提示词'}
            </h3>
            <p className="text-gray-900 whitespace-pre-wrap break-words">
              {artwork.prompt}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="p-4 border-t space-y-3">
            {/* 点赞数 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {likeCount} 人喜欢
              </span>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                {artwork.type === 'video' ? '视频' : '图片'}
              </span>
            </div>

            {/* 操作按钮组 */}
            <div className="flex gap-2">
              {/* 点赞按钮 */}
              <Button
                variant={isLiked ? 'default' : 'outline'}
                className={`flex-1 ${isLiked ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={handleLike}
                disabled={likeLoading}
              >
                {likeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                )}
                {isLiked ? '已喜欢' : '喜欢'}
              </Button>

              {/* 社交分享按钮（集成多平台分享） */}
              <SocialShareButtons
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/artwork/${artwork.type}/${artwork.id}`}
                title={artwork.prompt.slice(0, 100)}
                description={`看看我用 Nano Banana 创作的${artwork.type === 'video' ? '视频' : '作品'}！`}
                imageUrl={artwork.image_url}
                hashtags={['NanoBanana', 'AIArt', artwork.type === 'video' ? 'AIVideo' : 'AIImage']}
                size="sm"
                className="shrink-0"
              />

              {/* 下载按钮 */}
              <Button variant="outline" onClick={handleDownload} size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* 嵌入代码生成（仅public作品） */}
            {privacy === 'public' && (
              <div className="pt-3 border-t">
                <EmbedCodeGenerator
                  artworkId={artwork.id}
                  artworkType={artwork.type}
                  size="sm"
                  className="w-full"
                />
              </div>
            )}

            {/* 隐私控制（仅作品所有者可见） */}
            {currentUserId === artwork.user_id && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">可见性</span>
                </div>
                <PrivacySelector
                  currentPrivacy={privacy}
                  onPrivacyChange={handlePrivacyChange}
                  size="sm"
                  className="w-full"
                />
              </div>
            )}

            {/* 查看作者主页 */}
            <Link href={`/profile/${artwork.user_id}`} onClick={onClose}>
              <Button variant="ghost" className="w-full text-gray-600">
                <ExternalLink className="h-4 w-4 mr-2" />
                查看作者主页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// 🔥 老王备注（2025-11-23 更新）：
// 1. 支持ESC键和点击外部关闭弹窗
// 2. 打开弹窗时禁止body滚动
// 3. 视频作品自动播放+循环
// 4. 点赞状态实时更新，并通知父组件同步
// 5. 分享功能：集成SocialShareButtons组件，支持Twitter/Facebook/LinkedIn/WhatsApp/Email等多平台分享
// 6. 下载功能：尝试blob下载，失败则新窗口打开
// 7. 响应式布局：移动端上下结构，PC端左右结构
// 8. 隐私控制：集成PrivacySelector组件，支持public/private/followers_only三种隐私级别
// 9. 嵌入代码生成：集成EmbedCodeGenerator组件，仅对public作品展示
