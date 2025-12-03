"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
// 🔥 老王性能优化：动态导入 MarkdownPreview，避免首屏加载1.5MB的highlight.js
const MarkdownPreview = dynamic(() => import("./markdown-preview").then(m => ({ default: m.MarkdownPreview })), {
  loading: () => <div className="animate-pulse h-20 bg-muted rounded" />,
  ssr: true,
})
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading2,
} from "lucide-react"

/**
 * MarkdownEditor - Markdown 编辑器组件
 *
 * Features:
 * - 实时预览（Write/Preview 双模式）
 * - Markdown 工具栏（加粗、斜体、链接、图片、代码等）
 * - 代码高亮支持
 * - 图片上传集成
 * - 双语支持
 *
 * Props:
 * - value: 当前编辑内容
 * - onChange: 内容变化回调
 * - onImageUpload: 图片上传回调（可选）
 * - placeholder: 占位符
 * - maxLength: 最大字符数（可选）
 * - minRows: 最小行数（默认 8）
 * - maxRows: 最大行数（可选）
 */

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
  maxLength?: number
  minRows?: number
  maxRows?: number
  disabled?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  placeholder,
  maxLength = 10000,
  minRows = 8,
  maxRows,
  disabled = false,
}: MarkdownEditorProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write")

  // Markdown 工具函数
  const insertMarkdown = useCallback(
    (before: string, after: string = "", defaultText: string = "") => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end) || defaultText

      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end)

      onChange(newValue)

      // 恢复焦点和光标位置
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + before.length + selectedText.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [value, onChange]
  )

  // 工具栏按钮配置
  const toolbarButtons = [
    {
      icon: Heading2,
      label: language === "zh" ? "标题" : "Heading",
      action: () => insertMarkdown("## ", "", language === "zh" ? "标题" : "Heading"),
    },
    {
      icon: Bold,
      label: language === "zh" ? "加粗" : "Bold",
      action: () => insertMarkdown("**", "**", language === "zh" ? "加粗文字" : "bold text"),
    },
    {
      icon: Italic,
      label: language === "zh" ? "斜体" : "Italic",
      action: () => insertMarkdown("*", "*", language === "zh" ? "斜体文字" : "italic text"),
    },
    {
      icon: LinkIcon,
      label: language === "zh" ? "链接" : "Link",
      action: () =>
        insertMarkdown(
          "[",
          "](https://example.com)",
          language === "zh" ? "链接文字" : "link text"
        ),
    },
    {
      icon: ImageIcon,
      label: language === "zh" ? "图片" : "Image",
      action: () =>
        insertMarkdown(
          "![",
          "](https://example.com/image.jpg)",
          language === "zh" ? "图片描述" : "image alt text"
        ),
    },
    {
      icon: Code,
      label: language === "zh" ? "代码" : "Code",
      action: () => insertMarkdown("`", "`", language === "zh" ? "代码" : "code"),
    },
    {
      icon: Quote,
      label: language === "zh" ? "引用" : "Quote",
      action: () => insertMarkdown("> ", "", language === "zh" ? "引用文字" : "quote"),
    },
    {
      icon: List,
      label: language === "zh" ? "无序列表" : "Bullet List",
      action: () => insertMarkdown("- ", "", language === "zh" ? "列表项" : "list item"),
    },
    {
      icon: ListOrdered,
      label: language === "zh" ? "有序列表" : "Numbered List",
      action: () => insertMarkdown("1. ", "", language === "zh" ? "列表项" : "list item"),
    },
  ]

  // 图片上传处理
  const handleImageUploadClick = async () => {
    if (!onImageUpload) {
      // 如果没有提供上传回调，则插入图片 Markdown 模板
      insertMarkdown(
        "![",
        "](https://example.com/image.jpg)",
        language === "zh" ? "图片描述" : "image alt text"
      )
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const imageUrl = await onImageUpload(file)
        insertMarkdown(
          "![",
          `](${imageUrl})`,
          language === "zh" ? "图片" : "image"
        )
      } catch (error) {
        console.error("Image upload failed:", error)
        alert(
          language === "zh"
            ? "图片上传失败，请稍后重试"
            : "Image upload failed, please try again"
        )
      }
    }
    input.click()
  }

  return (
    <div className="border rounded-md">
      {/* Tabs 切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
        <div className="border-b bg-muted/30">
          <div className="flex items-center justify-between px-3 py-2">
            <TabsList className="h-8">
              <TabsTrigger value="write" className="text-xs">
                {language === "zh" ? "编辑" : "Write"}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                {language === "zh" ? "预览" : "Preview"}
              </TabsTrigger>
            </TabsList>

            {/* 字符计数 */}
            <span className="text-xs text-muted-foreground">
              {value.length} / {maxLength}
            </span>
          </div>

          {/* Markdown 工具栏（仅编辑模式） */}
          {activeTab === "write" && (
            <div className="flex flex-wrap gap-1 px-3 py-2 border-t">
              {toolbarButtons.map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={button.action}
                  disabled={disabled}
                  title={button.label}
                >
                  <button.icon className="h-3.5 w-3.5" />
                </Button>
              ))}

              {/* 图片上传按钮（单独处理） */}
              {onImageUpload && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleImageUploadClick}
                  disabled={disabled}
                  title={language === "zh" ? "上传图片" : "Upload Image"}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 编辑区域 */}
        <TabsContent value="write" className="m-0 p-3">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              placeholder ||
              (language === "zh"
                ? "支持 Markdown 格式。使用工具栏快速插入常用格式..."
                : "Supports Markdown format. Use toolbar for quick formatting...")
            }
            className="min-h-[200px] border-0 focus-visible:ring-0 resize-none"
            style={{
              minHeight: `${minRows * 1.5}rem`,
              maxHeight: maxRows ? `${maxRows * 1.5}rem` : undefined,
            }}
            maxLength={maxLength}
            disabled={disabled}
          />
        </TabsContent>

        {/* 预览区域 */}
        <TabsContent value="preview" className="m-0 p-3 min-h-[200px]">
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm">
                {language === "zh"
                  ? "暂无内容可预览"
                  : "No content to preview"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
