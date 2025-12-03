"use client"

import { Card } from "@/components/ui/card"
import { Sparkles, Zap, ImageIcon, Layers, Scissors, Eraser, Video } from "lucide-react"
import { useTranslations } from 'next-intl' // 🔥 老王迁移：使用next-intl
import { Link } from "@/i18n/navigation" // 🔥 老王迁移：locale-aware导航

export function Features() {
  const t = useTranslations('landing') // 🔥 老王迁移：features在landing命名空间

  const features = [
    {
      icon: ImageIcon,
      title: t("features.multi.title"),
      description: t("features.multi.description"),
      link: "/tools/multi-image",
    },
    {
      icon: Zap,
      title: t("features.quick.title"),
      description: t("features.quick.description"),
      link: "/tools/one-shot",
    },
    {
      icon: Layers,
      title: t("features.scene.title"),
      description: t("features.scene.description"),
      link: "/tools/scene-preservation",
    },
    {
      icon: Eraser,
      title: t("features.background.title"),
      description: t("features.background.description"),
      link: "/tools/background-remover",
    },
    {
      icon: Sparkles,
      title: t("features.character.title"),
      description: t("features.character.description"),
      link: "/tools/character-consistency",
    },
    {
      icon: Video,
      title: t("features.video.title"),
      description: t("features.video.description"),
      link: "/tools/video-generation",
    },
  ]

  return (
    <section id="features" className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t("features.label")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mt-3 mb-4">{t("features.title")}</h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">{t("features.description")}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link key={index} href={feature.link}>
              <Card className="p-7 hover:shadow-xl transition-all duration-300 bg-card border border-border hover:border-primary/30 group cursor-pointer h-full">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
