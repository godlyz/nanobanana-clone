/**
 * 🔥 老王的审核员手册页面
 * 用途: 为志愿审核员和社区管理员提供详细的操作指南
 * 老王提醒: 这手册巨tm专业 - 从权限分级到案例研究，全都齐活了！
 */

"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function ModerationManualPage() {
  const [markdown, setMarkdown] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // 🔥 老王新增：加载审核员手册markdown文件
  useEffect(() => {
    async function loadMarkdown() {
      try {
        const response = await fetch("/MODERATION_MANUAL.md")
        if (response.ok) {
          const text = await response.text()
          setMarkdown(text)
        } else {
          console.error("❌ 加载审核员手册失败:", response.status)
        }
      } catch (error) {
        console.error("❌ 加载审核员手册出错:", error)
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
              {/* 🔥 老王提示: 专业审核员操作手册，含4级权限、6步流程、3个详细案例 */}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
