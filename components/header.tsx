"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { TourButton } from "@/components/tour-button"
import { ChevronDown, User, LogOut, Sun, Moon } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { UserAvatar } from "@/components/ui/user-avatar" // 🔥 老王优化：使用带 fallback 的头像组件

export function Header() {
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // 避免水化不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting user:', error)
      }
    }

    getUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    try {
      // 调用服务器端退出 API
      await fetch('/auth/logout', {
        method: 'POST',
      })

      // 客户端也退出
      await supabase.auth.signOut()

      // 刷新页面确保清除所有状态
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <span className="font-bold text-xl text-foreground">Nano Banana</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/editor/image-edit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.editor")}
            </Link>
            <Link href="/showcase" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.showcase")}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                id="header-toolbox-menu"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("nav.toolbox")}
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?mode=video-generation" className="cursor-pointer font-medium text-primary">
                    🎬 {t("nav.videoGeneration")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?mode=image-to-image&batch=true" className="cursor-pointer">
                    {t("nav.batchEdit")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=style-transfer" className="cursor-pointer">
                    {t("nav.styleTransfer")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=background-remover" className="cursor-pointer">
                    {t("nav.backgroundRemover")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=scene-preservation" className="cursor-pointer">
                    {t("nav.scenePreservation")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=consistent-generation" className="cursor-pointer">
                    {t("nav.consistentGeneration")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=text-to-image-with-text" className="cursor-pointer">
                    {t("nav.textToImageWithText")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=chat-edit" className="cursor-pointer">
                    {t("nav.chatEdit")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/editor/image-edit?tool=smart-prompt" className="cursor-pointer">
                    {t("nav.smartPrompt")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </Link>
            <Link href="/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.api")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* 🔥 老王新增：用户引导按钮 */}
            <TourButton />

            {/* 主题切换按钮 */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full"
                aria-label="切换主题"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            )}

            <LanguageSwitcher />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  id="header-user-menu"
                  className="flex items-center gap-2"
                >
                  {/* 🔥 老王优化：使用带 fallback 的头像组件，自动处理加载失败和超时 */}
                  <UserAvatar
                    src={user.user_metadata?.avatar_url}
                    alt={user.user_metadata?.name || user.email || "User avatar"}
                    size={32}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.user_metadata?.name || user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {t("header.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("header.signin")}
                  </Button>
                </Link>
                <Link href="/editor/image-edit">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {t("header.getstarted")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
