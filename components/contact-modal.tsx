"use client"

/**
 * 🔥 老王的联系方式弹窗组件
 * 用途: 显示客服或销售团队的联系方式（电话、QQ、微信、Telegram、邮箱）
 * 老王提醒: 这个弹窗支持一键复制联系方式，方便用户快速联系！
 */

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Phone, Mail, Copy, Check } from "lucide-react"
import { useState } from "react"

interface ContactInfo {
  phone: string
  qq: string
  wechat: string
  telegram: string
  email: string
}

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "support" | "sales"
  contactInfo: ContactInfo
}

export function ContactModal({ open, onOpenChange, type, contactInfo }: ContactModalProps) {
  const { t } = useLanguage()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // 🔥 老王的复制功能：点击复制联系方式
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000) // 2秒后恢复
    } catch (error) {
      console.error("❌ 复制失败:", error)
    }
  }

  const title = type === "support" ? t("contact.modal.title.support") : t("contact.modal.title.sales")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === "support"
              ? "Choose your preferred contact method to reach our customer service team."
              : "Choose your preferred contact method to reach our sales team."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 电话 */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("contact.modal.phone")}</p>
                <p className="text-sm text-muted-foreground">{contactInfo.phone}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(contactInfo.phone, "phone")}
            >
              {copiedField === "phone" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* QQ */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <circle cx="12" cy="12" r="5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{t("contact.modal.qq")}</p>
                <p className="text-sm text-muted-foreground">{contactInfo.qq}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(contactInfo.qq, "qq")}
            >
              {copiedField === "qq" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 微信 */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.5 8.5c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1zm7 0c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{t("contact.modal.wechat")}</p>
                <p className="text-sm text-muted-foreground">{contactInfo.wechat}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(contactInfo.wechat, "wechat")}
            >
              {copiedField === "wechat" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Telegram */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{t("contact.modal.telegram")}</p>
                <p className="text-sm text-muted-foreground">{contactInfo.telegram}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(contactInfo.telegram, "telegram")}
            >
              {copiedField === "telegram" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 邮箱 */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("contact.modal.email")}</p>
                <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(contactInfo.email, "email")}
            >
              {copiedField === "email" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("contact.modal.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
