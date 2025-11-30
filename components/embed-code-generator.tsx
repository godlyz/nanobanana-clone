"use client"

/**
 * 🔥 老王的作品嵌入代码生成器组件
 * 用途: 生成iframe嵌入代码，让用户能把作品分享到外部网站
 * 老王警告: 生成的代码必须安全，不能有XSS漏洞！
 */

import React, { useState } from 'react'
import { Check, Copy, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EmbedCodeGeneratorProps {
  artworkId: string
  artworkType: 'image' | 'video'
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function EmbedCodeGenerator({
  artworkId,
  artworkType,
  className = '',
  size = 'default'
}: EmbedCodeGeneratorProps) {
  const { t, language } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [embedSize, setEmbedSize] = useState<'small' | 'medium' | 'large'>('medium')

  // 嵌入代码的尺寸配置
  const sizeConfig = {
    small: { width: 400, height: 300 },
    medium: { width: 600, height: 450 },
    large: { width: 800, height: 600 }
  }

  const selectedSize = sizeConfig[embedSize]
  const embedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${artworkType}/${artworkId}`

  // 生成嵌入代码
  const embedCode = `<iframe
  src="${embedUrl}"
  width="${selectedSize.width}"
  height="${selectedSize.height}"
  frameborder="0"
  allowfullscreen
  sandbox="allow-scripts allow-same-origin"
  title="${language === 'zh' ? 'Nano Banana 作品' : 'Nano Banana Artwork'}"
></iframe>`

  // 复制嵌入代码
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const buttonSizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${buttonSizes[size]} ${className}`}
        >
          <Code className="h-4 w-4" />
          <span className="hidden sm:inline">
            {language === 'zh' ? '嵌入代码' : 'Embed Code'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'zh' ? '生成嵌入代码' : 'Generate Embed Code'}
          </DialogTitle>
          <DialogDescription>
            {language === 'zh'
              ? '将此作品嵌入到您的网站或博客中'
              : 'Embed this artwork on your website or blog'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 尺寸选择器 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {language === 'zh' ? '选择尺寸' : 'Select Size'}
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((s) => (
                <Button
                  key={s}
                  variant={embedSize === s ? 'default' : 'outline'}
                  onClick={() => setEmbedSize(s)}
                  className="flex-1"
                  size="sm"
                >
                  {s === 'small' && (language === 'zh' ? '小 (400×300)' : 'Small (400×300)')}
                  {s === 'medium' && (language === 'zh' ? '中 (600×450)' : 'Medium (600×450)')}
                  {s === 'large' && (language === 'zh' ? '大 (800×600)' : 'Large (800×600)')}
                </Button>
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {language === 'zh' ? '预览' : 'Preview'}
            </label>
            <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center">
              <iframe
                src={embedUrl}
                width={Math.min(selectedSize.width, 500)}
                height={Math.min(selectedSize.height, 375)}
                frameBorder="0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin"
                title={language === 'zh' ? 'Nano Banana 作品' : 'Nano Banana Artwork'}
                className="rounded shadow-lg"
              />
            </div>
          </div>

          {/* 嵌入代码 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {language === 'zh' ? '嵌入代码' : 'Embed Code'}
            </label>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                onClick={handleCopy}
                variant={copied ? 'default' : 'secondary'}
                size="sm"
                className="absolute top-2 right-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    {language === 'zh' ? '已复制' : 'Copied'}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    {language === 'zh' ? '复制代码' : 'Copy Code'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium">
              {language === 'zh' ? '使用说明：' : 'Instructions:'}
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                {language === 'zh'
                  ? '复制上方的嵌入代码'
                  : 'Copy the embed code above'}
              </li>
              <li>
                {language === 'zh'
                  ? '粘贴到您的网站HTML中'
                  : 'Paste it into your website HTML'}
              </li>
              <li>
                {language === 'zh'
                  ? '作品将自动显示在iframe中'
                  : 'The artwork will be displayed in an iframe'}
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 🔥 老王备注（2025-11-23）：
// 1. Dialog弹窗模式，提供友好的嵌入代码生成界面
// 2. 三种尺寸选择：small(400×300), medium(600×450), large(800×600)
// 3. 实时预览iframe效果
// 4. 一键复制功能（带复制成功反馈）
// 5. 安全的iframe配置：sandbox="allow-scripts allow-same-origin"
// 6. 完整i18n支持（中英双语）
// 7. 响应式设计：移动端只显示图标
