"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Copy, Zap, Code, Shield, Clock, ArrowRight, Sparkles, Key, Send, Image as ImageIcon, FileText } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ContactModal } from "@/components/contact-modal"
import Link from "next/link"

const codeExamples = {
  curl: `curl -X POST https://api.nanobanana.ai/v1/image-edit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "将人物背景改为海滩风景",
    "image_url": "https://example.com/image.jpg",
    "strength": 0.8
  }'`,

  python: `import requests

response = requests.post(
    "https://api.nanobanana.ai/v1/image-edit",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "prompt": "将人物背景改为海滩风景",
        "image_url": "https://example.com/image.jpg",
        "strength": 0.8
    }
)

result = response.json()
print(result["image_url"])`,

  javascript: `const response = await fetch('https://api.nanobanana.ai/v1/image-edit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: '将人物背景改为海滩风景',
    image_url: 'https://example.com/image.jpg',
    strength: 0.8
  })
});

const result = await response.json();
console.log(result.image_url);`,

  nodejs: `const axios = require('axios');

const response = await axios.post('https://api.nanobanana.ai/v1/image-edit', {
  prompt: '将人物背景改为海滩风景',
  image_url: 'https://example.com/image.jpg',
  strength: 0.8
}, {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

console.log(response.data.image_url);`
}

export default function APIPage() {
  const { t } = useLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState("curl")
  const [apiKey, setApiKey] = useState("")

  // 🔥 老王添加：联系销售弹窗状态
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactInfo, setContactInfo] = useState({
    support: { phone: "", qq: "", wechat: "", telegram: "", email: "" },
    sales: { phone: "", qq: "", wechat: "", telegram: "", email: "" }
  })

  // 🔥 老王添加：获取联系信息
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await fetch("/api/contact")
        const data = await response.json()
        if (data.support && data.sales) {
          setContactInfo(data)
        }
      } catch (error) {
        console.error("Error fetching contact info:", error)
      }
    }

    fetchContactInfo()
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(t("apiPage.codeCopied"))
    } catch (error) {
      console.error(t("apiPage.copyFailed"), error)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Zap className="w-3 h-3 mr-1" />
            {t("apiPage.nowOpen")}
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-balance">
            <span className="text-primary">Nano Banana</span> API
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            {t("apiPage.heroDescription")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/profile">
              <Button size="lg" className="px-8 rounded-full">
                <Key className="w-4 h-4 mr-2" />
                {t("apiPage.getApiKey")}
              </Button>
            </Link>
            <Link href="/api-docs">
              <Button size="lg" variant="outline" className="px-8 rounded-full bg-transparent">
                <FileText className="w-4 h-4 mr-2" />
                {t("apiPage.viewDocumentation")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("apiPage.whyChoose")}</h2>
            <p className="text-muted-foreground">{t("apiPage.whyChooseDescription")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.naturalLanguage.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.naturalLanguage.description")}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.enterpriseSecurity.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.enterpriseSecurity.description")}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.fastResponse.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.fastResponse.description")}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.highQuality.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.highQuality.description")}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.easyIntegration.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.easyIntegration.description")}
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("apiPage.features.realTimeSupport.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("apiPage.features.realTimeSupport.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* API Documentation */}
      <section className="py-16 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("apiPage.quickStart")}</h2>
            <p className="text-muted-foreground">{t("apiPage.quickStartDescription")}</p>
          </div>

          <Tabs defaultValue="authentication" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="authentication">{t("apiPage.tabs.authentication")}</TabsTrigger>
              <TabsTrigger value="image-edit">{t("apiPage.tabs.imageEdit")}</TabsTrigger>
              <TabsTrigger value="text-to-image">{t("apiPage.tabs.textToImage")}</TabsTrigger>
              <TabsTrigger value="examples">{t("apiPage.tabs.codeExamples")}</TabsTrigger>
            </TabsList>

            <TabsContent value="authentication" className="mt-8">
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t("apiPage.auth.title")}</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.auth.step1.title")}</h4>
                    <p className="text-muted-foreground mb-4">
                      {t("apiPage.auth.step1.description")}
                    </p>
                    <Link href="/profile">
                      <Button className="mb-6">
                        <Key className="w-4 h-4 mr-2" />
                        {t("apiPage.getApiKey")}
                      </Button>
                    </Link>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.auth.step2.title")}</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      Authorization: Bearer YOUR_API_KEY
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.auth.step3.title")}</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• {t("apiPage.auth.step3.point1")}</li>
                      <li>• {t("apiPage.auth.step3.point2")}</li>
                      <li>• {t("apiPage.auth.step3.point3")}</li>
                      <li>• {t("apiPage.auth.step3.point4")}</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="image-edit" className="mt-8">
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t("apiPage.imageEdit.title")}</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.imageEdit.endpoint")}</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      POST https://api.nanobanana.ai/v1/image-edit
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.imageEdit.parameters")}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">{t("apiPage.table.parameter")}</th>
                            <th className="text-left py-2">{t("apiPage.table.type")}</th>
                            <th className="text-left py-2">{t("apiPage.table.required")}</th>
                            <th className="text-left py-2">{t("apiPage.table.description")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-mono">prompt</td>
                            <td className="py-2">string</td>
                            <td className="py-2">{t("apiPage.table.yes")}</td>
                            <td className="py-2">{t("apiPage.imageEdit.param.prompt")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">image_url</td>
                            <td className="py-2">string</td>
                            <td className="py-2">{t("apiPage.table.yes")}</td>
                            <td className="py-2">{t("apiPage.imageEdit.param.imageUrl")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">strength</td>
                            <td className="py-2">float</td>
                            <td className="py-2">{t("apiPage.table.no")}</td>
                            <td className="py-2">{t("apiPage.imageEdit.param.strength")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">preserve_scene</td>
                            <td className="py-2">boolean</td>
                            <td className="py-2">{t("apiPage.table.no")}</td>
                            <td className="py-2">{t("apiPage.imageEdit.param.preserveScene")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.imageEdit.response")}</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      {`{
  "success": true,
  "image_url": "https://cdn.nanobanana.ai/results/xxxxx.jpg",
  "task_id": "task_xxxxx",
  "processing_time": 2.3
}`}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="text-to-image" className="mt-8">
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t("apiPage.textToImage.title")}</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.imageEdit.endpoint")}</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      POST https://api.nanobanana.ai/v1/text-to-image
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t("apiPage.imageEdit.parameters")}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">{t("apiPage.table.parameter")}</th>
                            <th className="text-left py-2">{t("apiPage.table.type")}</th>
                            <th className="text-left py-2">{t("apiPage.table.required")}</th>
                            <th className="text-left py-2">{t("apiPage.table.description")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-mono">prompt</td>
                            <td className="py-2">string</td>
                            <td className="py-2">{t("apiPage.table.yes")}</td>
                            <td className="py-2">{t("apiPage.textToImage.param.prompt")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">width</td>
                            <td className="py-2">integer</td>
                            <td className="py-2">{t("apiPage.table.no")}</td>
                            <td className="py-2">{t("apiPage.textToImage.param.width")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">height</td>
                            <td className="py-2">integer</td>
                            <td className="py-2">{t("apiPage.table.no")}</td>
                            <td className="py-2">{t("apiPage.textToImage.param.height")}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-mono">style</td>
                            <td className="py-2">string</td>
                            <td className="py-2">{t("apiPage.table.no")}</td>
                            <td className="py-2">{t("apiPage.textToImage.param.style")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="mt-8">
              <Card className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">{t("apiPage.codeExamples.title")}</h3>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curl">cURL</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="nodejs">Node.js</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <pre className="bg-muted p-6 rounded-lg overflow-x-auto text-sm">
                    <code>{codeExamples[selectedLanguage as keyof typeof codeExamples]}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(codeExamples[selectedLanguage as keyof typeof codeExamples])}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("apiPage.codeExamples.copy")}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">{t("apiPage.cta.title")}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("apiPage.cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/profile">
              <Button size="lg" className="px-10 rounded-full">
                <Key className="w-4 h-4 mr-2" />
                {t("apiPage.cta.getApiKey")}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="px-10 rounded-full bg-transparent"
              onClick={() => setContactModalOpen(true)}
            >
              {t("apiPage.cta.contactSales")}
            </Button>
          </div>
        </div>
      </section>

      {/* 🔥 老王添加：联系销售团队弹窗 */}
      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        type="sales"
        contactInfo={contactInfo.sales}
      />

      <Footer />
    </main>
  )
}
