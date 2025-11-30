import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"

// 动态导入非首屏组件（代码分割）
const EditorSection = dynamic(() => import("@/components/editor-section").then(m => ({ default: m.EditorSection })), {
  loading: () => <div className="min-h-[600px] flex items-center justify-center bg-gradient-to-b from-primary/5 to-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div></div>
})

const FirstVisitPrompt = dynamic(() => import("@/components/tour-button").then(m => ({ default: m.FirstVisitPrompt })), {
  loading: () => null
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
      <FirstVisitPrompt tourType="home" />
    </main>
  )
}
