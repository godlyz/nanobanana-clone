import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"

// 🔥 老王优化 Day 2：EditorSection 动态导入（代码分割）
// 原因：EditorSection 包含 MiniImageEditor (740行)，影响 LCP (4.5s)
// 目标：将 LCP 从 4.5s 降低到 2.5s 以下，Performance Score 从 83 提升到 90+
// 注意：不能用 ssr:false（app/page.tsx 是 Server Component），但 dynamic() 仍会做代码分割
const EditorSection = dynamic(() => import("@/components/editor-section").then(m => ({ default: m.EditorSection })), {
  loading: () => <div className="min-h-[600px] flex items-center justify-center bg-gradient-to-b from-primary/5 to-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})

// 🔥 老王优化：首屏以下组件懒加载，提升首屏加载速度
// 用户看到Hero就算首屏，下面的内容等滚动时再加载
const FirstVisitPrompt = dynamic(() => import("@/components/tour-button").then(m => ({ default: m.FirstVisitPrompt })), {
  loading: () => null // 加载时不显示任何内容
})
const Features = dynamic(() => import("@/components/features").then(m => ({ default: m.Features })), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})
const Showcase = dynamic(() => import("@/components/showcase").then(m => ({ default: m.Showcase })), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})
const Testimonials = dynamic(() => import("@/components/testimonials").then(m => ({ default: m.Testimonials })), {
  loading: () => <div className="min-h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})
const FAQ = dynamic(() => import("@/components/faq").then(m => ({ default: m.FAQ })), {
  loading: () => <div className="min-h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})
const Footer = dynamic(() => import("@/components/footer").then(m => ({ default: m.Footer })), {
  loading: () => <div className="min-h-[200px]"></div>
})

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <EditorSection />
      <Features />
      <Showcase />
      <Testimonials />
      <FAQ />
      <Footer />
      {/* 🔥 老王新增：首次访问自动触发引导提示 */}
      <FirstVisitPrompt tourType="home" />
    </main>
  )
}
