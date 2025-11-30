/**
 * 🔥 老王的视频生成工具页面
 * 用途: SEO优化，展示Google Veo 3.1视频生成功能
 * 老王提醒: 这个功能牛逼，文本变视频，图像变视频，几分钟搞定专业级视频！
 */

"use client"

import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Video, Sparkles, CheckCircle, Clock, Zap } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function VideoGenerationPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-muted/10 mt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Video className="w-4 h-4" />
                {t("videoGeneration.badge")}
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {t("videoGeneration.title")}
                <br />
                <span className="text-primary">{t("videoGeneration.highlight")}</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("videoGeneration.description")}
              </p>

              {/* CTA按钮 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor/image-edit?mode=video-generation">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("videoGeneration.cta")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/showcase">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("videoGeneration.examples")}
                  </Button>
                </Link>
              </div>

              {/* 快速功能点 */}
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("videoGeneration.feature1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("videoGeneration.feature2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("videoGeneration.feature3")}</span>
                </div>
              </div>
            </div>

            {/* 预览图区域 */}
            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg bg-muted/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse" />
                    <p className="text-lg font-semibold">{t("videoGeneration.previewTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t("videoGeneration.previewDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("videoGeneration.howTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("videoGeneration.howSubtitle")}</p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.step1Title")}</h3>
                <p className="text-muted-foreground">{t("videoGeneration.step1Desc")}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.step2Title")}</h3>
                <p className="text-muted-foreground">{t("videoGeneration.step2Desc")}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.step3Title")}</h3>
                <p className="text-muted-foreground">{t("videoGeneration.step3Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("videoGeneration.useCasesTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("videoGeneration.useCasesSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.useCase1Title")}</h3>
              <p className="text-muted-foreground">{t("videoGeneration.useCase1Desc")}</p>
            </div>

            {/* Use Case 2 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.useCase2Title")}</h3>
              <p className="text-muted-foreground">{t("videoGeneration.useCase2Desc")}</p>
            </div>

            {/* Use Case 3 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("videoGeneration.useCase3Title")}</h3>
              <p className="text-muted-foreground">{t("videoGeneration.useCase3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("videoGeneration.whyTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("videoGeneration.whySubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">🎥</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit1Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit1Desc")}</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit2Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit2Desc")}</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit3Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit3Desc")}</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">💎</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit4Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit4Desc")}</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">📐</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit5Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit5Desc")}</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="font-semibold mb-2">{t("videoGeneration.benefit6Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("videoGeneration.benefit6Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">{t("videoGeneration.finalTitle")}</h2>
          <p className="text-xl mb-8 opacity-90">{t("videoGeneration.finalSubtitle")}</p>
          <Link href="/editor/image-edit?mode=video-generation">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              {t("videoGeneration.finalCta")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
