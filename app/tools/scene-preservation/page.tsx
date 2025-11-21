/**
 * 🔥 老王的场景保留工具页面
 * 用途: SEO优化，展示AI编辑时如何智能保留原始场景
 * 老王提醒: 这个功能很重要，改人物不改背景，改背景不改人物，精准控制！
 */

"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Sparkles, CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function ScenePreservationPage() {
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
                <Shield className="w-4 h-4" />
                {t("scenePreserve.badge")}
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {t("scenePreserve.title")}
                <br />
                <span className="text-primary">{t("scenePreserve.highlight")}</span>
                <br />
                {t("scenePreserve.subtitle")}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("scenePreserve.description")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor/image-edit?tool=scene-preservation">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                    {t("scenePreserve.ctaPrimary")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("scenePreserve.feature1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("scenePreserve.feature2")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{t("scenePreserve.feature3")}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg bg-muted/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Shield className="w-20 h-20 text-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold">{t("scenePreserve.demoTitle")}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t("scenePreserve.demoSubtitle")}</p>
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
            <h2 className="text-4xl font-bold mb-4">{t("scenePreserve.howTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("scenePreserve.howSubtitle")}</p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.step1Title")}</h3>
                <p className="text-muted-foreground">
                  {t("scenePreserve.step1Desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.step2Title")}</h3>
                <p className="text-muted-foreground">
                  {t("scenePreserve.step2Desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.step3Title")}</h3>
                <p className="text-muted-foreground">
                  {t("scenePreserve.step3Desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example Scenarios */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("scenePreserve.scenariosTitle")}</h2>
            <p className="text-xl text-muted-foreground">{t("scenePreserve.scenariosSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { scenarioKey: "scenePreserve.scenario1", exampleKey: "scenePreserve.scenario1Ex" },
              { scenarioKey: "scenePreserve.scenario2", exampleKey: "scenePreserve.scenario2Ex" },
              { scenarioKey: "scenePreserve.scenario3", exampleKey: "scenePreserve.scenario3Ex" },
              { scenarioKey: "scenePreserve.scenario4", exampleKey: "scenePreserve.scenario4Ex" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2 text-primary">{t(item.scenarioKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(item.exampleKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("scenePreserve.perfectForTitle")}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase1Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase1Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase2Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase2Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🏠</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase3Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase3Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🛍️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase4Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase4Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase5Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase5Desc")}
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("scenePreserve.useCase6Title")}</h3>
              <p className="text-muted-foreground">
                {t("scenePreserve.useCase6Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("scenePreserve.featuresTitle")}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🎯", titleKey: "scenePreserve.feat1Title", descKey: "scenePreserve.feat1Desc" },
              { icon: "🌈", titleKey: "scenePreserve.feat2Title", descKey: "scenePreserve.feat2Desc" },
              { icon: "💡", titleKey: "scenePreserve.feat3Title", descKey: "scenePreserve.feat3Desc" },
              { icon: "🔍", titleKey: "scenePreserve.feat4Title", descKey: "scenePreserve.feat4Desc" },
              { icon: "🎭", titleKey: "scenePreserve.feat5Title", descKey: "scenePreserve.feat5Desc" },
              { icon: "📐", titleKey: "scenePreserve.feat6Title", descKey: "scenePreserve.feat6Desc" },
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
          <h2 className="text-4xl font-bold mb-4">{t("scenePreserve.finalTitle")}</h2>
          <p className="text-xl mb-8 opacity-90">{t("scenePreserve.finalSubtitle")}</p>
          <Link href="/editor/image-edit?tool=scene-preservation">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              {t("scenePreserve.finalCta")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
