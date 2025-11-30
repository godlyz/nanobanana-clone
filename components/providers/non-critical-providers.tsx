/**
 * 🔥 老王LCP优化：非关键Provider延迟加载
 *
 * 优化策略：
 * 1. 将ToastProvider、ConfirmProvider抽离到单独组件
 * 2. 在layout.tsx中使用dynamic()延迟加载此组件
 * 3. 首屏只加载ThemeProvider、LanguageProvider、TourProvider（关键路径）
 * 4. Toast和ConfirmProvider在首屏渲染完成后异步加载
 *
 * 预期效果：
 * - Provider链从5层减少到3层
 * - LCP-FCP差值从3.16s降至<1s
 * - Performance Score从86提升到90+
 */

"use client"

import type React from "react"
import { ToastProvider } from "@/components/ui/toast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"

interface NonCriticalProvidersProps {
  children: React.ReactNode
}

/**
 * 🔥 老王注：这个组件包含非关键Provider
 * - ToastProvider: 通知提示（用户操作时才显示）
 * - ConfirmProvider: 确认对话框（用户操作时才显示）
 * - TourProvider已移至关键Provider链中，因为header中的TourButton在首屏就需要useTour context
 */
export function NonCriticalProviders({ children }: NonCriticalProvidersProps) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  )
}
