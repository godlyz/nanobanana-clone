/**
 * 🔥 老王的Cookie同意横幅
 * 用途: GDPR合规，询问用户是否接受Cookie
 * 老王提醒: 这个SB横幅必须在首次访问时显示，不能偷偷摸摸地收集数据！
 *
 * 🔥 老王修复 (2025-11-08):
 * - 添加独立的"×"关闭按钮，用户可以不做选择直接关闭
 * - 简化Cookie存储逻辑，避免 localStorage 和 Cookie 冲突
 * - 添加客户端状态管理，确保横幅关闭后不再重新显示
 */

"use client"

import { useState, useEffect } from "react"
import CookieConsent from "react-cookie-consent"
import Link from "next/link"
import { X } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function CookieConsentBanner() {
  const { language } = useLanguage()
  const [visible, setVisible] = useState(false)

  // 🔥 老王修复：客户端检测Cookie状态，避免水合错误
  useEffect(() => {
    const checkCookie = () => {
      // 检查Cookie是否已经设置
      const cookieValue = document.cookie
        .split("; ")
        .find(row => row.startsWith("nanobanana-cookie-consent="))

      if (!cookieValue) {
        setVisible(true)
      }
    }

    checkCookie()
  }, [])

  // 🔥 老王修复：添加手动关闭功能
  const handleClose = () => {
    // 设置一个"dismissed"状态的Cookie，表示用户手动关闭了横幅
    document.cookie = "nanobanana-cookie-consent=dismissed; path=/; max-age=31536000" // 1年
    setVisible(false)
    console.log("🍪 用户手动关闭了Cookie横幅（未做选择）")
  }

  const handleAccept = () => {
    // 用户接受所有Cookie，启用分析和追踪
    setVisible(false)
    console.log("🍪 用户接受了所有Cookie")
  }

  const handleDecline = () => {
    // 用户只接受必要Cookie，禁用非必要追踪
    setVisible(false)
    console.log("🍪 用户只接受必要Cookie")
  }

  // 🔥 老王修复：服务器端渲染时不显示，避免水合错误
  if (!visible) {
    return null
  }

  return (
    <CookieConsent
      location="bottom"
      buttonText={language === "zh" ? "接受所有Cookie" : "Accept All Cookies"}
      declineButtonText={language === "zh" ? "仅必要Cookie" : "Essential Only"}
      enableDeclineButton
      cookieName="nanobanana-cookie-consent"
      style={{
        background: "hsl(var(--foreground))",
        alignItems: "center",
        padding: "1rem 1.5rem",
        position: "fixed", // 🔥 老王修复CLS: 强制fixed定位，防止布局偏移
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999, // 🔥 确保在最顶层
      }}
      buttonStyle={{
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        fontSize: "14px",
        fontWeight: "600",
        padding: "0.5rem 1.5rem",
        borderRadius: "0.5rem",
        border: "none",
        cursor: "pointer",
      }}
      declineButtonStyle={{
        background: "transparent",
        color: "hsl(var(--background))",
        fontSize: "14px",
        fontWeight: "500",
        padding: "0.5rem 1.5rem",
        borderRadius: "0.5rem",
        border: "1px solid hsl(var(--background) / 0.3)",
        cursor: "pointer",
      }}
      expires={365} // Cookie有效期1年
      onAccept={handleAccept}
      onDecline={handleDecline}
    >
      {/* 🔥 老王添加：独立的关闭按钮（使用fixed定位，确保始终可见） */}
      <button
        onClick={handleClose}
        className="fixed bottom-2 right-2 md:bottom-4 md:right-4 p-2 rounded-full hover:bg-background/10 transition-colors z-[10000]"
        style={{ background: "transparent" }}
        aria-label={language === "zh" ? "关闭" : "Close"}
      >
        <X className="h-5 w-5 text-background" />
      </button>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 max-w-6xl mx-auto pr-12">
        <div className="flex-1">
          <p className="text-background text-sm leading-relaxed">
            {language === "zh" ? (
              <>
                我们使用Cookie来改善您的体验、分析网站流量和提供个性化内容。通过点击"接受所有Cookie"，您同意我们使用所有Cookie。您也可以选择"仅必要Cookie"来限制Cookie的使用。
                {" "}
                <Link href="/privacy" className="underline hover:text-background/80">
                  了解更多
                </Link>
              </>
            ) : (
              <>
                We use cookies to improve your experience, analyze site traffic, and provide personalized content. By clicking "Accept All Cookies", you consent to our use of all cookies. You can also select "Essential Only" to limit cookie usage.
                {" "}
                <Link href="/privacy" className="underline hover:text-background/80">
                  Learn more
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </CookieConsent>
  )
}
