// app/api/blog/rss/route.ts
// 🔥 老王创建：博客 RSS Feed
// 功能: 生成标准 RSS 2.0 格式的博客订阅源
// 验证: https://validator.w3.org/feed/

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/blog/rss
 * 返回博客的 RSS 2.0 Feed
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 获取已发布的博客文章（按发布时间倒序）
    // 🔥 老王修复：先不join user_profiles，避免关联错误
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        published_at,
        updated_at,
        user_id
      `)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50) // RSS最多50篇

    if (error) {
      console.error('❌ RSS获取文章失败:', error)
      throw error
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nanobanana.com'
    const siteName = 'Nano Banana'
    const siteDescription = 'AI-powered image and video editing platform - tutorials, tips, and creative inspiration'

    // 构建 RSS 2.0 XML
    const rssItems = (posts || []).map(post => {
      // 🔥 老王修复：暂时使用默认作者名
      const authorName = 'Nano Banana Team'
      const pubDate = new Date(post.published_at!).toUTCString()
      const postUrl = `${siteUrl}/blog/${post.slug}`

      // 清理内容（移除HTML标签作为description）
      const description = post.excerpt ||
        (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : '')

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${authorName}</author>
      <description><![CDATA[${description}]]></description>
    </item>`
    }).join('')

    const lastBuildDate = posts && posts.length > 0
      ? new Date(posts[0].published_at!).toUTCString()
      : new Date().toUTCString()

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>${siteDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/blog/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/logo.png</url>
      <title>${siteName}</title>
      <link>${siteUrl}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // 缓存1小时
      }
    })

  } catch (error: any) {
    console.error('❌ RSS生成失败:', error)
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
  }
}
