"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Upload, Sparkles, ImageIcon, Wand2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import Image from "next/image"

export default function ImageEditorPage() {
  const [prompt, setPrompt] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">{t("imageEditor.title")}</h1>
            </div>
            <p className="text-muted-foreground text-lg">{t("imageEditor.description")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Prompt Engine */}
            <Card className="p-8 bg-card border-2 border-primary/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t("editor.prompt.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("editor.prompt.subtitle")}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    {t("editor.batch.label")}
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {t("editor.batch.new")}
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">{t("editor.batch.description")}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    {t("editor.reference.label")}
                  </label>
                  <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      ref={fileInputRef}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{t("editor.upload.text")}</p>
                      <p className="text-xs text-muted-foreground">{t("editor.upload.size")}</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">{t("editor.prompt.label")}</label>
                  <Textarea
                    placeholder={t("editor.prompt.placeholder")}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] resize-none text-sm"
                  />
                </div>

                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("editor.generate")}
                </Button>
              </div>
            </Card>

            {/* Output Gallery */}
            <Card className="p-8 bg-card border-2 border-primary/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t("editor.output.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("editor.output.subtitle")}</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-border rounded-xl aspect-square flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                {uploadedImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded"
                      fill
                      className="object-cover rounded-xl"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-2">{t("editor.output.ready")}</p>
                    <p className="text-sm text-muted-foreground">{t("editor.output.description")}</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={triggerFileInput}
                className="w-full mt-6 py-6 text-base font-semibold border-2 hover:bg-primary/5 bg-transparent"
              >
                <Upload className="w-5 h-5 mr-2" />
                {t("editor.upload.button")}
              </Button>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
