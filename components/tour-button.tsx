"use client"

import { usePathname } from "next/navigation"
import { HelpCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTour } from "@/lib/tour-context"
import { useLanguage } from "@/lib/language-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function TourButton() {
  const pathname = usePathname()
  const { startTour } = useTour()
  const { language } = useLanguage()

  // 根据当前路径确定引导类型
  const getTourType = (): "home" | "editor" | "api-docs" | "pricing" | "tools" | null => {
    if (pathname === "/") return "home"
    // 🔥 老王修复：匹配所有editor路径（包括/editor/image-edit等子路径）
    if (pathname === "/editor" || pathname?.startsWith("/editor/")) return "editor"
    if (pathname === "/api-docs") return "api-docs"
    if (pathname === "/pricing") return "pricing"
    if (pathname?.startsWith("/tools/")) return "tools"
    return null
  }

  const tourType = getTourType()

  // 如果当前页面不支持引导，不显示按钮
  if (!tourType) return null

  const handleClick = () => {
    startTour(tourType)
  }

  const buttonText = language === "zh" ? "新手引导" : "Tour"
  const tooltipText =
    language === "zh" ? "开始交互式引导，快速了解功能" : "Start interactive tour to learn features"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className="gap-2 rounded-full"
            aria-label={buttonText}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden md:inline">{buttonText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// 🔥 老王专用：首次访问提示组件（在页面顶部显示）
export function FirstVisitPrompt({ tourType }: { tourType: "home" | "editor" | "api-docs" | "pricing" | "tools" }) {
  const { startTour, isFirstVisit } = useTour()
  const { language } = useLanguage()

  const [dismissed, setDismissed] = React.useState(false)
  const [mounted, setMounted] = React.useState(false) // 🔥 老王修复水合错误

  React.useEffect(() => {
    setMounted(true) // 🔥 老王修复：标记客户端已挂载
    // 检查是否首次访问
    const firstVisit = isFirstVisit(tourType)
    if (!firstVisit) {
      setDismissed(true)
    }
  }, [tourType, isFirstVisit])

  // 🔥 老王修复：服务器端直接返回null，避免水合错误
  if (!mounted) return null

  if (dismissed || !isFirstVisit(tourType)) return null

  const handleStart = () => {
    startTour(tourType)
    setDismissed(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-5">
      {/* 🔥 老王修复：从 bottom-4 改为 bottom-24，避免和Cookie Banner重叠 */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            {language === "zh" ? "👋 第一次来这里？" : "👋 First time here?"}
          </h3>
          <p className="text-sm mb-3 text-white/90">
            {language === "zh"
              ? "让我们通过快速引导，帮助您了解主要功能。"
              : "Let us show you around with a quick tour of the main features."}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleStart}
              className="bg-white text-gray-900 hover:bg-gray-100 flex-1 rounded-full"
            >
              {language === "zh" ? "开始引导" : "Start Tour"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 rounded-full"
            >
              {language === "zh" ? "跳过" : "Skip"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 添加React导入
import React from "react"
