// components/social-share-buttons.tsx
// 🔥 老王创建：社交分享按钮组件
// 功能: 支持 Twitter, Facebook, Pinterest, LinkedIn, WhatsApp, Email

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Mail,
  Link as LinkIcon,
  Check
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"

interface SocialShareButtonsProps {
  url: string
  title: string
  description?: string
  imageUrl?: string
  hashtags?: string[]
  className?: string
  size?: "default" | "sm" | "lg"
}

export function SocialShareButtons({
  url,
  title,
  description = "",
  imageUrl,
  hashtags = [],
  className = "",
  size = "default"
}: SocialShareButtonsProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  // 编码URL和文本
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description)
  const hashtagString = hashtags.length > 0 ? hashtags.join(',') : 'NanoBanana,AIArt'

  // 社交平台分享链接
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${hashtagString}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    pinterest: imageUrl
      ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(imageUrl)}&description=${encodedTitle}`
      : `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
  }

  // 打开分享窗口
  const handleShare = (platform: keyof typeof shareLinks) => {
    const shareUrl = shareLinks[platform]

    if (platform === 'email') {
      window.location.href = shareUrl
    } else {
      const width = 600
      const height = 400
      const left = (window.innerWidth - width) / 2
      const top = (window.innerHeight - height) / 2

      window.open(
        shareUrl,
        'share',
        `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`
      )
    }
  }

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 使用 Web Share API（移动端）
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        })
      } catch (err) {
        console.log('分享取消或失败:', err)
      }
    } else {
      // 降级到复制链接
      handleCopyLink()
    }
  }

  const buttonSizes = {
    sm: "w-8 h-8 min-w-[32px] min-h-[32px]",
    default: "w-10 h-10 min-w-[40px] min-h-[40px]",
    lg: "w-12 h-12 min-w-[48px] min-h-[48px]"
  }

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4",
    lg: "w-5 h-5"
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
          className={`flex items-center gap-2 ${className}`}
        >
          <Share2 className={iconSizes[size]} />
          <span className="hidden sm:inline">
            {t("share.button") || "Share"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">
            {t("share.title") || "Share this"}
          </h4>

          {/* 主要社交平台 */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleShare('twitter')}
              className={`${buttonSizes[size]} rounded-lg bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white flex items-center justify-center transition-colors`}
              aria-label="Share on Twitter"
              title="Twitter"
            >
              <Twitter className={iconSizes[size]} />
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className={`${buttonSizes[size]} rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white flex items-center justify-center transition-colors`}
              aria-label="Share on Facebook"
              title="Facebook"
            >
              <Facebook className={iconSizes[size]} />
            </button>

            <button
              onClick={() => handleShare('linkedin')}
              className={`${buttonSizes[size]} rounded-lg bg-[#0A66C2] hover:bg-[#095196] text-white flex items-center justify-center transition-colors`}
              aria-label="Share on LinkedIn"
              title="LinkedIn"
            >
              <Linkedin className={iconSizes[size]} />
            </button>

            <button
              onClick={() => handleShare('whatsapp')}
              className={`${buttonSizes[size]} rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors`}
              aria-label="Share on WhatsApp"
              title="WhatsApp"
            >
              <MessageCircle className={iconSizes[size]} />
            </button>
          </div>

          {/* Pinterest (如果有图片) */}
          {imageUrl && (
            <button
              onClick={() => handleShare('pinterest')}
              className="w-full h-10 rounded-lg bg-[#E60023] hover:bg-[#c9001e] text-white flex items-center justify-center gap-2 transition-colors"
              aria-label="Share on Pinterest"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              Pinterest
            </button>
          )}

          {/* Email */}
          <button
            onClick={() => handleShare('email')}
            className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
            aria-label="Share via Email"
          >
            <Mail className="w-4 h-4" />
            {t("share.email") || "Email"}
          </button>

          {/* 复制链接 */}
          <button
            onClick={handleCopyLink}
            className="w-full h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
            aria-label="Copy link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">
                  {t("share.copied") || "Copied!"}
                </span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                {t("share.copyLink") || "Copy link"}
              </>
            )}
          </button>

          {/* 原生分享（移动端） - 🔥 老王修复：改用'share' in navigator检查API存在 */}
          {typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
              {t("share.more") || "More options"}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
