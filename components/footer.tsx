"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { ContactModal } from "@/components/contact-modal"
import { useState, useEffect } from "react"

interface ContactInfo {
  phone: string
  qq: string
  wechat: string
  telegram: string
  email: string
}

export function Footer() {
  const { t } = useLanguage()

  // 🔥 老王新增：弹窗状态管理
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showSalesModal, setShowSalesModal] = useState(false)

  // 🔥 老王新增：联系方式数据
  const [supportContact, setSupportContact] = useState<ContactInfo>({
    phone: "+86 xxx-xxxx-xxxx",
    qq: "12345678",
    wechat: "nanobanana_service",
    telegram: "@nanobanana_support",
    email: "support@nanobanana.ai",
  })

  const [salesContact, setSalesContact] = useState<ContactInfo>({
    phone: "+86 xxx-xxxx-xxxx",
    qq: "87654321",
    wechat: "nanobanana_sales",
    telegram: "@nanobanana_sales",
    email: "sales@nanobanana.ai",
  })

  // 🔥 老王新增：从API获取联系方式
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await fetch("/api/contact")
        if (response.ok) {
          const data = await response.json()
          setSupportContact(data.support)
          setSalesContact(data.sales)
        }
      } catch (error) {
        console.error("❌ 获取联系方式失败:", error)
        // 使用默认值（已经在 useState 中设置）
      }
    }

    fetchContactInfo()
  }, [])

  return (
    <footer className="bg-foreground text-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🍌</span>
              <span className="font-bold text-xl">Nano Banana</span>
            </div>
            <p className="text-background/70 text-sm">{t("footer.tagline")}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.product")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#editor" className="text-background/70 hover:text-background">
                  {t("footer.product.editor")}
                </Link>
              </li>
              <li>
                <Link href="#features" className="text-background/70 hover:text-background">
                  {t("nav.features")}
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-background/70 hover:text-background">
                  {t("footer.product.pricing")}
                </Link>
              </li>
              <li>
                <Link href="#api" className="text-background/70 hover:text-background">
                  {t("footer.product.api")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.resources")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-background/70 hover:text-background">
                  {t("footer.resources.docs")}
                </Link>
              </li>
              <li>
                <Link href="#showcase" className="text-background/70 hover:text-background">
                  {t("footer.product.showcase")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-background/70 hover:text-background">
                  {t("footer.company.blog")}
                </Link>
              </li>
              {/* 🔥 老王修复：改为弹窗而不是 mailto 链接 */}
              <li>
                <button
                  onClick={() => setShowSupportModal(true)}
                  className="text-background/70 hover:text-background transition-colors cursor-pointer"
                >
                  {t("footer.support.customer")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setShowSalesModal(true)}
                  className="text-background/70 hover:text-background transition-colors cursor-pointer"
                >
                  {t("footer.support.sales")}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-background/70 hover:text-background">
                  {t("footer.company.about")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-background/70 hover:text-background">
                  {t("footer.company.careers")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-background/70 hover:text-background">
                  {t("footer.legal.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-background/70 hover:text-background">
                  {t("footer.legal.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/70 text-sm">{t("footer.copyright")}</p>
          <p className="text-background/50 text-xs">
            Nanobanana.ai is an independent product and is not affiliate with Google or any AI brands.
          </p>
        </div>
      </div>

      {/* 🔥 老王新增：客服和销售联系弹窗 */}
      <ContactModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
        type="support"
        contactInfo={supportContact}
      />

      <ContactModal
        open={showSalesModal}
        onOpenChange={setShowSalesModal}
        type="sales"
        contactInfo={salesContact}
      />
    </footer>
  )
}
