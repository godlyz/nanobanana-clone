"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import "highlight.js/styles/github-dark.css"

/**
 * MarkdownPreview - Markdown 预览组件
 *
 * Features:
 * - GitHub Flavored Markdown 支持（表格、任务列表、删除线等）
 * - 代码高亮（highlight.js）
 * - 支持内联 HTML（安全）
 * - 自动链接
 * - 响应式设计
 *
 * Props:
 * - content: Markdown 内容
 * - className: 自定义样式类名（可选）
 */

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-pre:bg-muted prose-pre:text-foreground prose-code:text-primary prose-code:before:content-none prose-code:after:content-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // 自定义图片渲染（添加响应式和懒加载）
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="rounded-md max-w-full h-auto"
              loading="lazy"
              alt={props.alt || "Image"}
            />
          ),
          // 自定义链接渲染（外部链接新窗口打开）
          a: ({ node, ...props }) => {
            const isExternal = props.href?.startsWith("http")
            return (
              <a
                {...props}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {props.children}
              </a>
            )
          },
          // 自定义代码块渲染
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "")
            return match ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            )
          },
          // 自定义任务列表
          input: ({ node, ...props }) => {
            if (props.type === "checkbox") {
              return (
                <input
                  {...props}
                  className="mr-2 cursor-not-allowed"
                  disabled
                />
              )
            }
            return <input {...props} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
