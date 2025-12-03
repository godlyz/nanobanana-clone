"use client"

/**
 * 🔥 老王迁移：语言切换器
 * 使用 next-intl 的路由系统实现语言切换
 * 通过修改URL路径（/en/ ↔ /zh/）来切换语言
 */

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { useTransition } from 'react'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const switchLanguage = (newLocale: 'en' | 'zh') => {
    startTransition(() => {
      // 🔥 老王：使用next-intl的router.replace切换语言
      // 这会自动更新URL路径从 /en/xxx 到 /zh/xxx
      router.replace(pathname, { locale: newLocale })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="language-switcher-trigger"
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isPending}
        >
          <span className="text-lg">{locale === "en" ? "🇺🇸" : "🇨🇳"}</span>
          <span className="text-sm font-medium">{locale === "en" ? "EN" : "中文"}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem
          onClick={() => switchLanguage("en")}
          className="gap-2 cursor-pointer"
          disabled={isPending}
        >
          <span className="text-lg">🇺🇸</span>
          <span>English</span>
          {locale === "en" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLanguage("zh")}
          className="gap-2 cursor-pointer"
          disabled={isPending}
        >
          <span className="text-lg">🇨🇳</span>
          <span>中文</span>
          {locale === "zh" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
