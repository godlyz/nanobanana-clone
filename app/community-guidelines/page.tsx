/**
 * 🔥 老王的社区规范页面
 * 用途: 展示社区行为准则和内容规范
 * 老王提醒: 这规范覆盖了从核心价值观到违规处理的所有内容，中英双语！
 */

"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function CommunityGuidelinesPage() {
  const [markdown, setMarkdown] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // 🔥 老王新增：加载社区规范markdown文件
  useEffect(() => {
    async function loadMarkdown() {
      try {
        const response = await fetch("/COMMUNITY_GUIDELINES.md")
        if (response.ok) {
          const text = await response.text()
          setMarkdown(text)
        } else {
          console.error("❌ 加载社区规范失败:", response.status)
        }
      } catch (error) {
        console.error("❌ 加载社区规范出错:", error)
      } finally {
        setLoading(false)
      }
    }
    loadMarkdown()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">加载中... / Loading...</p>
            </div>
          ) : (
            <article className="prose prose-lg max-w-none dark:prose-invert">
              {/* 🔥 老王提示: 双语社区规范，从核心价值到违规处理全覆盖 */}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
