import type { Metadata } from 'next'

/**
 * 🔥 老王的Blog Layout
 * 用途: 为所有/blog路由提供统一的SEO metadata
 * 老王警告: 这个layout只负责SEO，不要在这里加多余的UI组件！
 */

export const metadata: Metadata = {
  title: 'Blog - Nano Banana | 探索精彩内容，分享知识与见解',
  description: '浏览 Nano Banana 博客，探索AI图像编辑、视频生成、产品更新和技术分享。学习如何使用AI工具创作精彩内容。',
  keywords: ['AI博客', 'AI图像编辑', '视频生成', 'Nano Banana', '技术分享', '产品更新'],
  openGraph: {
    title: 'Blog - Nano Banana',
    description: '探索精彩内容，分享知识与见解',
    type: 'website',
    url: 'https://nanobanana.ai/blog',
    siteName: 'Nano Banana',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - Nano Banana',
    description: '探索精彩内容，分享知识与见解',
  },
  alternates: {
    canonical: 'https://nanobanana.ai/blog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

// 🔥 老王备注：
// 1. metadata导出提供SEO优化（title, description, OG tags）
// 2. layout组件只是简单的透传children，不添加额外UI
// 3. robots配置允许Google完整索引博客内容
// 4. 使用中文locale（zh_CN）和关键词优化
// 5. canonical URL指向正式域名
