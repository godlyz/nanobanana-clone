/**
 * 🔥 老王的背景移除工具页面
 * 用途: SEO优化，展示背景移除功能和使用场景
 * 老王提醒: 这个页面要快，LCP必须≤2s，别tm搞那些花里胡哨的东西！
 */

"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function BackgroundRemoverPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-muted/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                {t("bgRemover.badge")}
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {t("bgRemover.title")}
                <br />
                <span className="text-primary">{t("bgRemover.highlight")}</span>
                <br />
                {t("bgRemover.subtitle")}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("bgRemover.description")}
              </p>

              {/* CTA按钮 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("bgRemover.ctaPrimary")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("bgRemover.ctaSecondary")}
                  </Button>
                </Link>
              </div>

              {/* 快速功能点 */}
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("bgRemover.feature1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("bgRemover.feature2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("bgRemover.feature3")}</span>
                </div>
              </div>
            </div>

            {/* 预览图区域 */}
            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg bg-muted/20">
                {/* 这里可以放实际的before/after对比图 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Zap className="w-20 h-20 text-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold">{t("bgRemover.demoTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t("bgRemover.demoSubtitle")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("bgRemover.useCasesTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("bgRemover.useCasesSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🛍️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("bgRemover.useCase1Title")}</h3>
              <p className="text-muted-foreground">
                {t("bgRemover.useCase1Desc")}
              </p>
            </div>

            {/* Use Case 2 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("bgRemover.useCase2Title")}</h3>
              <p className="text-muted-foreground">
                {t("bgRemover.useCase2Desc")}
              </p>
            </div>

            {/* Use Case 3 */}
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("bgRemover.useCase3Title")}</h3>
              <p className="text-muted-foreground">
                {t("bgRemover.useCase3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("bgRemover.howTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("bgRemover.howSubtitle")}</p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("bgRemover.step1Title")}</h3>
                <p className="text-muted-foreground">
                  {t("bgRemover.step1Desc")}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("bgRemover.step2Title")}</h3>
                <p className="text-muted-foreground">
                  {t("bgRemover.step2Desc")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("bgRemover.step3Title")}</h3>
                <p className="text-muted-foreground">
                  {t("bgRemover.step3Desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("bgRemover.whyTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("bgRemover.whySubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⚡", titleKey: "bgRemover.feature1Title", descKey: "bgRemover.feature1Desc" },
              { icon: "🎯", titleKey: "bgRemover.feature2Title", descKey: "bgRemover.feature2Desc" },
              { icon: "🆓", titleKey: "bgRemover.feature3Title", descKey: "bgRemover.feature3Desc" },
              { icon: "📱", titleKey: "bgRemover.feature4Title", descKey: "bgRemover.feature4Desc" },
              { icon: "🔒", titleKey: "bgRemover.feature5Title", descKey: "bgRemover.feature5Desc" },
              { icon: "💎", titleKey: "bgRemover.feature6Title", descKey: "bgRemover.feature6Desc" },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">{t("bgRemover.finalTitle")}</h2>
          <p className="text-xl mb-8 opacity-90">{t("bgRemover.finalSubtitle")}</p>
          <Link href="/editor/image-edit?tool=background-remover">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              {t("bgRemover.finalCta").replace(" - It's Free", "").replace(" - 完全免费", "")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
