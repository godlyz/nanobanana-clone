/**
 * 🔥 老王的静态Header组件
 * 用途: 为工具页面提供超快速的静态Header,避免客户端渲染拖慢LCP
 * 老王提醒: 这是服务端组件,纯HTML渲染,速度快得飞起!
 */

import Link from "next/link"

export function StaticHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <span className="font-bold text-xl text-foreground">Nano Banana</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/editor/image-edit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Editor
            </Link>
            <Link
              href="/showcase"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Showcase
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
