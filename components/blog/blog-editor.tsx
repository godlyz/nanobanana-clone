"use client"

/**
 * 🔥 老王的Tiptap富文本编辑器组件
 * 用途: 博客文章编辑器，支持Markdown格式、图片插入、链接等
 * 老王警告: 这个编辑器功能强大，别tm随便改配置！
 */

import React, { useCallback, useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BlogEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

/**
 * 工具栏按钮组件
 */
const MenuButton = ({
  onClick,
  isActive,
  disabled,
  children
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
}) => (
  <Button
    type="button"
    variant={isActive ? "default" : "outline"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
  >
    {children}
  </Button>
)

/**
 * 老王的Tiptap编辑器主组件
 */
export function BlogEditor({
  content,
  onChange,
  placeholder = "开始写作...",
  className = ""
}: BlogEditorProps) {
  // 1. 初始化Tiptap编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline'
        }
      })
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[400px] px-4 py-3'
      }
    },
    onUpdate: ({ editor }) => {
      // 艹，每次内容变化都调用onChange回调
      onChange(editor.getHTML())
    }
  })

  // 2. 内容同步（当外部content变化时更新编辑器）
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // 3. 插入图片
  const addImage = useCallback(() => {
    if (!editor) return

    const url = window.prompt('图片URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // 4. 插入链接
  const addLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('链接URL:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return <div className="text-gray-500">加载编辑器...</div>
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1">
        {/* 撤销/重做 */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* 标题 */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* 文本格式 */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
        >
          <Code className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* 列表 */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* 图片和链接 */}
        <MenuButton onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={addLink}
          isActive={editor.isActive('link')}
        >
          <LinkIcon className="h-4 w-4" />
        </MenuButton>
      </div>

      {/* 编辑区域 */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
  )
}

// 🔥 老王备注：
// 1. 使用Tiptap编辑器，功能强大且可扩展
// 2. 支持Markdown快捷键（如 ## 自动转为H2）
// 3. 工具栏提供常用格式按钮（加粗、斜体、列表等）
// 4. 图片和链接通过prompt输入URL（后续可改为上传）
// 5. 内容以HTML格式存储，前端渲染用react-markdown
// 6. prose类提供美观的排版样式（来自@tailwindcss/typography）
