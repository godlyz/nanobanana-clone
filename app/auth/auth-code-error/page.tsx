"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AuthCodeErrorPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">认证失败</h1>
              <p className="text-muted-foreground">
                登录过程中出现了问题，请重试或联系支持
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium text-foreground mb-2">可能的原因：</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 授权链接已过期</li>
                  <li>• 授权被用户取消</li>
                  <li>• 网络连接问题</li>
                  <li>• 认证服务暂时不可用</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新登录
                </Button>
              </Link>

              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回首页
                </Button>
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                如果问题持续存在，请联系我们的
                <a href="mailto:support@nanobanana.ai" className="text-primary hover:underline ml-1">
                  客服团队
                </a>
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}