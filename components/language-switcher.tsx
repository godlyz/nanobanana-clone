"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="language-switcher-trigger"
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          <span className="text-lg">{language === "en" ? "🇺🇸" : "🇨🇳"}</span>
          <span className="text-sm font-medium">{language === "en" ? "EN" : "中文"}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setLanguage("en")} className="gap-2 cursor-pointer">
          <span className="text-lg">🇺🇸</span>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("zh")} className="gap-2 cursor-pointer">
          <span className="text-lg">🇨🇳</span>
          <span>中文</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
