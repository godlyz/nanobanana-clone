/**
 * 🔥 老王的多图处理工具页面
 * 用途: SEO优化，展示批量处理多张图片的强大功能
 * 老王提醒: 这个功能效率高，一次处理几十张图，省时省力！
 */

"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Layers, Sparkles, CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function MultiImagePage() {
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
                <Layers className="w-4 h-4" />
                {t("multiImage.badge")}
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {t("multiImage.title")} <span className="text-primary">{t("multiImage.highlight")}</span>
                <br />
                {t("multiImage.subtitle1")}
                <br />
                {t("multiImage.subtitle2")}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("multiImage.description")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor/image-edit?tool=multi-image">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("multiImage.ctaPrimary")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("multiImage.feature1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("multiImage.feature2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("multiImage.feature3")}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg bg-muted/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Layers className="w-20 h-20 text-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold">{t("multiImage.demoTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t("multiImage.demoSubtitle")}</p>
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
            <h2 className="text-4xl font-bold mb-4">{t("multiImage.howTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("multiImage.howSubtitle")}</p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("multiImage.step1Title")}</h3>
                <p className="text-muted-foreground">
                  {t("multiImage.step1Desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("multiImage.step2Title")}</h3>
                <p className="text-muted-foreground">
                  {t("multiImage.step2Desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("multiImage.step3Title")}</h3>
                <p className="text-muted-foreground">
                  {t("multiImage.step3Desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Common Use Cases */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("multiImage.tasksTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("multiImage.tasksSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { taskKey: "multiImage.task1", descKey: "multiImage.task1Desc" },
              { taskKey: "multiImage.task2", descKey: "multiImage.task2Desc" },
              { taskKey: "multiImage.task3", descKey: "multiImage.task3Desc" },
              { taskKey: "multiImage.task4", descKey: "multiImage.task4Desc" },
              { taskKey: "multiImage.task5", descKey: "multiImage.task5Desc" },
              { taskKey: "multiImage.task6", descKey: "multiImage.task6Desc" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2 text-primary">{t(item.taskKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("multiImage.perfectForTitle")}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🛍️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase1Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase1Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase2Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase2Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase3Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase3Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🏢</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase4Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase4Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase5Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase5Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("multiImage.useCase6Title")}</h3>
              <p className="text-muted-foreground">
                {t("multiImage.useCase6Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("multiImage.featuresTitle")}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⚡", titleKey: "multiImage.feat1Title", descKey: "multiImage.feat1Desc" },
              { icon: "📊", titleKey: "multiImage.feat2Title", descKey: "multiImage.feat2Desc" },
              { icon: "🔄", titleKey: "multiImage.feat3Title", descKey: "multiImage.feat3Desc" },
              { icon: "📁", titleKey: "multiImage.feat4Title", descKey: "multiImage.feat4Desc" },
              { icon: "💾", titleKey: "multiImage.feat5Title", descKey: "multiImage.feat5Desc" },
              { icon: "⏸️", titleKey: "multiImage.feat6Title", descKey: "multiImage.feat6Desc" },
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
          <h2 className="text-4xl font-bold mb-4">{t("multiImage.finalTitle")}</h2>
          <p className="text-xl mb-8 opacity-90">{t("multiImage.finalSubtitle")}</p>
          <Link href="/editor/image-edit?tool=multi-image">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              {t("multiImage.finalCta")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
