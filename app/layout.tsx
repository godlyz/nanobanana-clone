import type React from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LanguageProvider } from "@/lib/language-context"
import { ThemeProvider } from "@/lib/theme-context"
import { ToastProvider } from "@/components/ui/toast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import { CookieConsentBanner } from "@/components/cookie-consent"
import { TourProvider } from "@/lib/tour-context"
import "./globals.css"

// 🔥 老王优化：增强 SEO 和性能元数据
export const metadata: Metadata = {
  title: "Nano Banana - AI Image Editor",
  description:
    "Transform any image with simple text prompts. Advanced AI-powered image editing with character consistency and scene preservation.",
  generator: "v0.app",
  keywords: ["AI", "image editor", "photo editing", "AI art", "image generation"],
  authors: [{ name: "Nano Banana Team" }],
  // 🔥 性能提示：预连接到常用域名
  other: {
    "format-detection": "telephone=no",
  },
}

// 🔥 老王修复：Next.js 16 要求 viewport 单独导出（不能放在 metadata 里）
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // 允许用户放大，提升可访问性
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 🔥 老王彻底修复水合错误：服务器端读取 cookie，确保 SSR 和客户端渲染一致
  const cookieStore = await cookies()
  const languageCookie = cookieStore.get("language")?.value
  const initialLanguage = languageCookie === "zh" ? "zh" : "en"

  return (
    <html lang={initialLanguage}>
      <head>
        {/* 🔥 老王优化：预连接到关键域名，减少 DNS 查询和 TLS 握手时间 */}
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        {/* Vercel Analytics 预连接 */}
        <link rel="preconnect" href="https://vercel.live" />
        <link rel="dns-prefetch" href="https://vercel.live" />

        {/* 🔥 老王性能优化：提示浏览器优先加载关键CSS和字体 */}
        {/* Next.js会自动处理CSS，这里添加fetchpriority提示 */}
      </head>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <TourProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <Suspense fallback={null}>{children}</Suspense>
                  <CookieConsentBanner />
                </ConfirmProvider>
              </ToastProvider>
            </TourProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
