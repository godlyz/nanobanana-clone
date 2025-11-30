"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Smartphone, Sparkles } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { MiniImageEditor } from "@/components/mini-image-editor"

export function EditorSection() {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [hasPaidPlan, setHasPaidPlan] = useState<boolean>(false)
  const supabase = useMemo(() => createClient(), [])

  // 🔥 避免主题相关的水合错误：仅在客户端挂载完成后再渲染主要内容
  useEffect(() => {
    setMounted(true)
  }, [])

  // 检查用户订阅状态
  const checkSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: subscription, error } = await supabase
          .rpc('get_user_active_subscription', { p_user_id: user.id })
        if (!error && subscription) {
          const expiresAt = new Date(subscription.expires_at)
          const now = new Date()
          if (expiresAt > now && subscription.status === 'active') {
            setHasPaidPlan(true)
          } else {
            setHasPaidPlan(false)
          }
        } else {
          setHasPaidPlan(false)
        }
      }
    } catch (error) {
      console.error('检查订阅状态失败:', error)
    }
  }, [supabase])

  useEffect(() => {
    checkSubscription()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, checkSubscription])

  const handleGetStarted = () => {
    // 跳转到完整版图像编辑器
    window.location.href = "/editor/image-edit"
  }

  const bgClass = theme === "light"
    ? "bg-[#FFFEF5]"
    : "bg-[var(--editor-bg)]"

  const textClass = theme === "light"
    ? "text-[#1E293B]"
    : "text-[var(--editor-text)]"

  const mutedClass = theme === "light"
    ? "text-[#64748B]"
    : "text-[var(--editor-muted)]"

  const accentClass = theme === "light"
    ? "text-[#D97706]"
    : "text-[var(--editor-primary)]"

  // 🔥 避免主题相关的水合错误：仅在客户端挂载完成后再渲染主要内容
  if (!mounted) {
    return null
  }

  return (
    <section id="editor" className={`py-24 px-4 ${bgClass} transition-colors duration-300`}>
      <div className="container mx-auto max-w-6xl">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <span className={`font-semibold text-sm uppercase tracking-wider ${accentClass}`}>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              {hasPaidPlan ? "快捷出图" : "试用AI编辑器"}
            </div>
          </span>
          <h2 className={`text-4xl md:text-5xl font-bold mt-3 mb-4 ${textClass}`}>
            {hasPaidPlan ? "快速生成精美图片" : t("editor.title")}
          </h2>
          <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${mutedClass}`}>
            {t("editor.description")}
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="space-y-8">
          {/* 精简版图像编辑器 */}
          <div className="max-w-5xl mx-auto">
            <MiniImageEditor onGetStarted={handleGetStarted} />
          </div>
        </div>
      </div>
    </section>
  )
}
