"use client"

import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import Image from "next/image"

export function Testimonials() {
  const { t } = useLanguage()

  const testimonials = [
    {
      name: t("testimonials.sarah.name"),
      role: t("testimonials.sarah.role"),
      avatar: "/professional-woman-portrait.png",
      content: t("testimonials.sarah.content"),
      rating: 5,
    },
    {
      name: t("testimonials.marcus.name"),
      role: t("testimonials.marcus.role"),
      avatar: "/professional-man-portrait.png",
      content: t("testimonials.marcus.content"),
      rating: 5,
    },
    {
      name: t("testimonials.emily.name"),
      role: t("testimonials.emily.role"),
      avatar: "/confident-businesswoman.png",
      content: t("testimonials.emily.content"),
      rating: 5,
    },
    {
      name: t("testimonials.david.name"),
      role: t("testimonials.david.role"),
      avatar: "/photographer-portrait.png",
      content: t("testimonials.david.content"),
      rating: 5,
    },
  ]

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wide">{t("testimonials.label")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">{t("testimonials.title")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("testimonials.description")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
