"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Zap, Target, Video } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      {/* 🔥 老王移动端优化：emoji装饰延迟渲染（非LCP元素） */}
      <div className="absolute top-20 left-10 text-7xl opacity-10 rotate-12 select-none" style={{ willChange: 'transform' }}>🍌</div>
      <div className="absolute bottom-10 right-10 text-7xl opacity-10 -rotate-12 select-none" style={{ willChange: 'transform' }}>🍌</div>

      <div className="container mx-auto max-w-5xl text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
          <Sparkles className="w-4 h-4" />
          <span>{t("hero.badge")}</span>
        </div>

        {/* 🔥 老王移动端LCP优化：大标题是LCP元素，移动端先用系统字体显示（font-display:swap生效） */}
        <h1
          className="text-6xl md:text-7xl font-bold text-foreground mb-6 text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
          style={{ contentVisibility: 'auto' }}
        >
          {t("hero.title")}
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-pretty leading-relaxed">
          {t("hero.description")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/editor/image-edit">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              {t("hero.cta.start")}
            </Button>
          </Link>
          <Link href="/editor/image-edit?mode=video-generation">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white hover:from-[#B45309] hover:to-[#D97706] px-10 py-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <Video className="w-5 h-5 mr-2" />
              {t("hero.cta.video")}
            </Button>
          </Link>
          <Link href="/api">
            <Button
              size="lg"
              variant="outline"
              className="px-10 py-6 text-base font-semibold rounded-full border-2 bg-transparent"
            >
              {t("hero.cta.docs")}
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{t("hero.feature.oneshot")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{t("hero.feature.multi")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{t("hero.feature.precise")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">{t("hero.feature.video")}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
