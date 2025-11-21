/**
 * 管理后台布局组件
 * 老王修复: 移除了多余的 html/body 标签,避免 hydration 错误
 */

import { AdminLayoutContent } from './layout-content'

export const metadata = {
  title: 'Nano Banana 管理后台',
  description: '智能图像编辑应用管理后台系统',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 老王提醒: Next.js App Router 中只有根 layout 才能有 html/body 标签
  // 嵌套 layout 直接返回内容就行了,别tm搞重复的标签!
  return <AdminLayoutContent>{children}</AdminLayoutContent>
}
