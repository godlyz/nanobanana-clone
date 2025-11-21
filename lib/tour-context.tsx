"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import Joyride, { CallBackProps, STATUS, Step, Styles } from "react-joyride"
import { useLanguage } from "./language-context"

// 引导步骤类型定义
interface TourStep extends Step {
  target: string
  content: string
  title?: string
  disableBeacon?: boolean
  placement?: "top" | "bottom" | "left" | "right" | "center"
  locale?: {
    skip: string
    back: string
    next: string
    last: string
    close: string
  }
}

// 不同页面的引导步骤配置
type TourType = "home" | "editor" | "api-docs" | "pricing" | "tools"

interface TourContextType {
  runTour: boolean
  startTour: (type: TourType) => void
  stopTour: () => void
  resetTour: (type: TourType) => void
  isFirstVisit: (type: TourType) => boolean
}

const TourContext = createContext<TourContextType | undefined>(undefined)

// 自定义样式（遵循项目设计系统）
// 🔥 老王 Day 4 修复：react-joyride Styles 接口要求更多字段
const tourStyles: Styles = {
  options: {
    primaryColor: "#f59e0b", // 黄色主题色
    textColor: "#1f2937",
    backgroundColor: "#ffffff",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    arrowColor: "#ffffff",
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: "12px",
    padding: "20px",
    fontSize: "16px",
  },
  tooltipTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  tooltipContent: {},  // 🔥 添加缺失字段
  tooltipContainer: {},  // 🔥 添加缺失字段
  tooltipFooter: {},  // 🔥 添加缺失字段
  tooltipFooterSpacer: {},  // 🔥 添加缺失字段
  buttonNext: {
    backgroundColor: "#f59e0b",
    borderRadius: "9999px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600",
  },
  buttonBack: {
    color: "#6b7280",
    marginRight: "10px",
  },
  buttonSkip: {
    color: "#9ca3af",
  },
  buttonClose: {},  // 🔥 添加缺失字段
  beacon: {},  // 🔥 添加缺失字段
  beaconInner: {},  // 🔥 添加缺失字段
  beaconOuter: {},  // 🔥 添加缺失字段
  overlay: {},  // 🔥 添加缺失字段
  overlayLegacy: {},  // 🔥 添加缺失字段
  overlayLegacyCenter: {},  // 🔥 添加缺失字段 - overlayLegacyCenter
  spotlight: {},  // 🔥 添加缺失字段
  spotlightLegacy: {},  // 🔥 添加缺失字段
}

// 定义所有页面的引导步骤
const getTourSteps = (type: TourType, language: "en" | "zh"): TourStep[] => {
  const isZh = language === "zh"

  const homeSteps: TourStep[] = [
    {
      target: "body",
      content: isZh
        ? "欢迎来到 Nano Banana！让我们快速了解一下平台的主要功能和内容。这个引导将带您浏览首页的核心区域。"
        : "Welcome to Nano Banana! Let's quickly explore the platform's main features and content. This tour will guide you through the core sections of the homepage.",
      title: isZh ? "🎉 欢迎使用" : "🎉 Welcome",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "section.relative.pt-32",
      content: isZh
        ? "这是我们的主页横幅区域，展示了 Nano Banana 的核心价值：AI驱动的图像编辑工具，支持自然语言指令、多图处理和精准编辑。"
        : "This is our hero section, showcasing Nano Banana's core value: AI-powered image editing tool with natural language commands, multi-image processing, and precise editing.",
      title: isZh ? "🌟 平台介绍" : "🌟 Platform Overview",
      placement: "bottom",
    },
    {
      target: '[href="/editor/image-edit"]',
      content: isZh
        ? "点击这个按钮可以立即开始使用AI编辑器！无需注册即可体验基础功能。"
        : "Click this button to start using the AI editor immediately! Try basic features without registration.",
      title: isZh ? "🚀 开始使用" : "🚀 Get Started",
      placement: "bottom",
    },
    {
      target: "#editor",
      content: isZh
        ? "这是编辑器演示区域，您可以在这里体验迷你版图像编辑器的功能：上传图片、输入编辑指令、查看AI生成结果。"
        : "This is the editor demo section where you can try the mini image editor: upload images, input editing instructions, and view AI-generated results.",
      title: isZh ? "🎨 编辑器体验" : "🎨 Editor Demo",
      placement: "top",
    },
    {
      target: "#features",
      content: isZh
        ? "浏览我们的6大核心功能：自然语言编辑、多图处理、一键编辑、场景保留、背景移除、角色一致性。每个功能都有专门的工具页面。"
        : "Explore our 6 core features: natural language editing, multi-image processing, one-shot editing, scene preservation, background removal, and character consistency. Each feature has a dedicated tool page.",
      title: isZh ? "✨ 核心功能" : "✨ Core Features",
      placement: "top",
    },
    {
      target: "#showcase",
      content: isZh
        ? "查看由AI生成的精美图片案例，包括雪山、日本庭院、热带海滩、北极光等场景，获取创作灵感。"
        : "View stunning AI-generated image examples, including snow mountains, Japanese gardens, tropical beaches, aurora borealis, and more for creative inspiration.",
      title: isZh ? "🖼️ 案例展示" : "🖼️ Showcase Gallery",
      placement: "top",
    },
    {
      target: '[href="/editor"]',
      content: isZh
        ? "导航栏的编辑器入口可以快速跳转到完整版AI图像编辑器，提供更多高级功能和工具。"
        : "The editor link in the navigation bar quickly takes you to the full-featured AI image editor with advanced tools and options.",
      title: isZh ? "🎯 编辑器入口" : "🎯 Editor Access",
      placement: "bottom",
    },
    {
      target: '[href="/showcase"]',
      content: isZh
        ? "访问完整的案例画廊，查看更多用户作品和AI生成的精彩图片。"
        : "Visit the full showcase gallery to view more user creations and amazing AI-generated images.",
      title: isZh ? "📸 案例画廊" : "📸 Full Gallery",
      placement: "bottom",
    },
    {
      target: '[href="/pricing"]',
      content: isZh
        ? "查看我们的定价方案（Basic、Pro、Max），选择适合您的订阅计划，解锁更多功能和配额。"
        : "Check our pricing plans (Basic, Pro, Max) and choose the subscription that fits your needs to unlock more features and quotas.",
      title: isZh ? "💎 定价方案" : "💎 Pricing Plans",
      placement: "bottom",
    },
    {
      target: '[href="/api"]',
      content: isZh
        ? "开发者可以通过API文档了解如何将Nano Banana的AI能力集成到自己的应用中，包括认证、速率限制、端点说明等。"
        : "Developers can learn how to integrate Nano Banana's AI capabilities into their apps through API documentation, including authentication, rate limits, endpoint descriptions, and more.",
      title: isZh ? "🔌 API集成" : "🔌 API Integration",
      placement: "bottom",
    },
    {
      target: ".language-switcher",
      content: isZh
        ? "点击这里可以切换界面语言（中文/English），所有内容都支持双语显示。"
        : "Click here to switch the interface language (中文/English). All content is available in both languages.",
      title: isZh ? "🌐 语言切换" : "🌐 Language Switcher",
      placement: "bottom",
    },
  ]

  const editorSteps: TourStep[] = [
    {
      target: "body",
      content: isZh
        ? "欢迎来到AI图像编辑器！这里提供强大的图像处理功能，包括图生图、文生图、批量处理、多种专业工具等。让我们逐步了解各项功能。"
        : "Welcome to the AI Image Editor! Powerful image processing features are available here, including image-to-image, text-to-image, batch processing, and various professional tools. Let's explore each feature step by step.",
      title: isZh ? "🎨 编辑器教程" : "🎨 Editor Tutorial",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "aside",
      content: isZh
        ? "这是工具箱侧边栏，包含7种专业工具：背景移除、场景保留、角色一致性、一键编辑、风格迁移、对话编辑、智能提示词。每个工具都有特定用途。"
        : "This is the toolbox sidebar with 7 professional tools: background removal, scene preservation, character consistency, one-shot editing, style transfer, chat editing, and smart prompt. Each tool serves a specific purpose.",
      title: isZh ? "🛠️ 工具箱" : "🛠️ Toolbox",
      placement: "right",
    },
    {
      target: '[href*="image-to-image"]',
      content: isZh
        ? "图生图模式：上传参考图片，通过AI编辑生成新图片。支持背景替换、风格转换、细节调整等操作。"
        : "Image-to-Image mode: Upload reference images and generate new ones through AI editing. Supports background replacement, style conversion, detail adjustments, and more.",
      title: isZh ? "🖼️ 图生图模式" : "🖼️ Image-to-Image Mode",
      placement: "bottom",
    },
    {
      target: '[href*="text-to-image"]',
      content: isZh
        ? "文生图模式：仅用文字描述就能生成图片，无需上传参考图。适合创意灵感转换为视觉作品。"
        : "Text-to-Image mode: Generate images from text descriptions only, no reference images needed. Perfect for turning creative ideas into visual works.",
      title: isZh ? "✍️ 文生图模式" : "✍️ Text-to-Image Mode",
      placement: "bottom",
    },
    {
      target: '[type="file"]',
      content: isZh
        ? "在图生图模式下，点击这里上传您想要编辑的参考图片。支持拖拽上传，可上传多张图片进行批量处理。"
        : "In image-to-image mode, click here to upload your reference images for editing. Supports drag-and-drop upload and multiple images for batch processing.",
      title: isZh ? "📤 上传图片" : "📤 Upload Images",
      placement: "bottom",
    },
    {
      target: '.w-12.h-6.rounded-full',
      content: isZh
        ? "批量模式开关（Pro功能）：开启后可以一次生成多张图片（最多9张），提高创作效率。需要Pro或Max订阅计划。"
        : "Batch mode toggle (Pro feature): Enable to generate multiple images at once (up to 9), improving creative efficiency. Requires Pro or Max subscription plan.",
      title: isZh ? "🔄 批量处理" : "🔄 Batch Processing",
      placement: "left",
    },
    {
      target: 'select, [role="combobox"]',
      content: isZh
        ? "长宽比选择：根据用途选择图片尺寸，包括1:1方形、16:9横屏、9:16竖屏、4:3经典、3:4肖像等多种比例。"
        : "Aspect ratio selection: Choose image dimensions based on your needs, including 1:1 square, 16:9 landscape, 9:16 portrait, 4:3 classic, 3:4 portrait, and more.",
      title: isZh ? "📐 长宽比" : "📐 Aspect Ratio",
      placement: "left",
    },
    {
      target: "textarea",
      content: isZh
        ? '提示词输入区：用自然语言详细描述您想要的编辑效果。例如："将背景改为海滩日落，增强色彩饱和度，添加柔和光晕效果"。提示词越详细，生成效果越精准。'
        : 'Prompt input area: Describe your desired editing effects in natural language in detail. For example: "Change background to beach sunset, enhance color saturation, add soft glow effect". The more detailed the prompt, the more precise the result.',
      title: isZh ? "✏️ 编辑指令" : "✏️ Edit Instructions",
      placement: "left",
    },
    {
      target: 'button:has(.lucide-sparkles)',
      content: isZh
        ? "生成按钮：完成所有设置后，点击这里开始AI处理。按钮会显示所需积分数量。生成过程通常需要10-30秒，请耐心等待。"
        : "Generate button: Click here to start AI processing after completing all settings. The button shows the required credit amount. Generation typically takes 10-30 seconds, please be patient.",
      title: isZh ? "🚀 开始生成" : "🚀 Start Generation",
      placement: "top",
    },
    {
      target: '[class*="history"]',
      content: isZh
        ? "历史记录缩略图：这里显示您最近生成的图片。点击可以查看大图、下载、重新生成或推荐到案例展示。历史记录按生成时间排序。"
        : "History thumbnails: Recently generated images are shown here. Click to view full size, download, regenerate, or submit to showcase. History is sorted by generation time.",
      title: isZh ? "📜 历史记录" : "📜 History",
      placement: "top",
    },
    {
      target: '[href="/history"]',
      content: isZh
        ? "完整历史记录：点击这里可以查看所有历史生成记录，支持按类型筛选（文生图/图生图）、按工具筛选、搜索等高级功能。"
        : "Full history: Click here to view all generation history with advanced features like filtering by type (text-to-image/image-to-image), filtering by tool, search, and more.",
      title: isZh ? "🗂️ 历史页面" : "🗂️ History Page",
      placement: "bottom",
    },
  ]

  const apiDocsSteps: TourStep[] = [
    {
      target: "body",
      content: isZh
        ? "欢迎查看API文档！这里包含了所有API端点的详细说明。"
        : "Welcome to API Documentation! Here you'll find detailed information about all API endpoints.",
      title: isZh ? "📚 API文档" : "📚 API Docs",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "aside",
      content: isZh
        ? "使用这个侧边栏可以快速跳转到不同的文档章节。"
        : "Use this sidebar to quickly navigate to different documentation sections.",
      title: isZh ? "🧭 导航栏" : "🧭 Navigation",
    },
    {
      target: "#authentication",
      content: isZh
        ? "这里介绍了如何进行API认证，获取API密钥后请妥善保管。"
        : "Learn how to authenticate with the API here. Keep your API key secure after obtaining it.",
      title: isZh ? "🔐 认证" : "🔐 Authentication",
    },
    {
      target: "#rate-limits",
      content: isZh
        ? "查看不同订阅计划的速率限制和配额。"
        : "Check rate limits and quotas for different subscription plans.",
      title: isZh ? "⏱️ 速率限制" : "⏱️ Rate Limits",
    },
    {
      target: "#image-edit",
      content: isZh
        ? "这是图像编辑API的完整文档，包含参数说明和代码示例。"
        : "Complete documentation for the image editing API, including parameter descriptions and code examples.",
      title: isZh ? "🎨 图像编辑API" : "🎨 Image Edit API",
    },
  ]

  const pricingSteps: TourStep[] = [
    {
      target: "body",
      content: isZh
        ? "我们提供三种订阅计划，满足不同规模的使用需求。"
        : "We offer three subscription plans to meet different usage needs.",
      title: isZh ? "💎 定价方案" : "💎 Pricing Plans",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-plan="basic"]',
      content: isZh
        ? "Basic计划适合个人用户和小型项目，包含基础AI编辑功能。"
        : "Basic plan is suitable for individual users and small projects, including basic AI editing features.",
      title: isZh ? "🌱 Basic计划" : "🌱 Basic Plan",
    },
    {
      target: '[data-plan="pro"]',
      content: isZh
        ? "Pro计划提供更高的速率限制和高级功能，适合专业用户。"
        : "Pro plan offers higher rate limits and advanced features for professional users.",
      title: isZh ? "⚡ Pro计划" : "⚡ Pro Plan",
    },
    {
      target: '[data-plan="max"]',
      content: isZh
        ? "Max计划提供最高配额和优先支持，适合企业级应用。"
        : "Max plan provides the highest quota and priority support for enterprise applications.",
      title: isZh ? "🚀 Max计划" : "🚀 Max Plan",
    },
  ]

  const toolsSteps: TourStep[] = [
    {
      target: "body",
      content: isZh
        ? "Nano Banana 提供7种专业AI工具，满足不同的图像处理需求。"
        : "Nano Banana offers 7 professional AI tools for different image processing needs.",
      title: isZh ? "🛠️ AI工具" : "🛠️ AI Tools",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[href*="background-remover"]',
      content: isZh
        ? "背景移除工具可以一键去除图片背景，保留主体。"
        : "Background Remover tool removes image backgrounds with one click while keeping the subject.",
      title: isZh ? "✂️ 背景移除" : "✂️ Background Removal",
    },
    {
      target: '[href*="one-shot"]',
      content: isZh
        ? "一键编辑工具提供快速的图像增强和修复功能。"
        : "One-shot editing tool provides quick image enhancement and repair features.",
      title: isZh ? "⚡ 一键编辑" : "⚡ One-Shot Edit",
    },
  ]

  const tourMap: Record<TourType, TourStep[]> = {
    home: homeSteps,
    editor: editorSteps,
    "api-docs": apiDocsSteps,
    pricing: pricingSteps,
    tools: toolsSteps,
  }

  return tourMap[type] || []
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage()
  const [runTour, setRunTour] = useState(false)
  const [currentTourType, setCurrentTourType] = useState<TourType>("home")
  const [steps, setSteps] = useState<TourStep[]>([])
  const [mounted, setMounted] = useState(false)

  // 🔥 老王修复：确保Joyride只在客户端渲染，避免水合错误
  useEffect(() => {
    setMounted(true)
  }, [])

  // 检查是否首次访问某个页面
  const isFirstVisit = (type: TourType): boolean => {
    if (typeof window === "undefined") return false
    const visited = localStorage.getItem(`tour-completed-${type}`)
    return visited !== "true"
  }

  // 启动引导
  const startTour = (type: TourType) => {
    setCurrentTourType(type)
    const tourSteps = getTourSteps(type, language)
    setSteps(tourSteps)
    setRunTour(true)
  }

  // 停止引导
  const stopTour = () => {
    setRunTour(false)
  }

  // 重置引导（清除完成记录）
  const resetTour = (type: TourType) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`tour-completed-${type}`)
    }
    startTour(type)
  }

  // 处理引导回调
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      setRunTour(false)

      // 标记为已完成
      if (typeof window !== "undefined") {
        localStorage.setItem(`tour-completed-${currentTourType}`, "true")
      }

      // 记录完成事件（可用于分析）
      if (status === STATUS.FINISHED && typeof window !== "undefined") {
        const completionRate = localStorage.getItem("tour-completion-rate") || "0"
        const completedCount = parseInt(completionRate) + 1
        localStorage.setItem("tour-completion-rate", completedCount.toString())
      }
    }
  }

  // 根据语言更新步骤
  useEffect(() => {
    if (runTour) {
      const tourSteps = getTourSteps(currentTourType, language)
      setSteps(tourSteps)
    }
  }, [language, currentTourType, runTour])

  const value: TourContextType = {
    runTour,
    startTour,
    stopTour,
    resetTour,
    isFirstVisit,
  }

  return (
    <TourContext.Provider value={value}>
      {children}
      {mounted && (
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          scrollToFirstStep
          showProgress
          showSkipButton
          styles={tourStyles}
          callback={handleJoyrideCallback}
          locale={{
            skip: language === "zh" ? "跳过" : "Skip",
            back: language === "zh" ? "上一步" : "Back",
            next: language === "zh" ? "下一步" : "Next",
            last: language === "zh" ? "完成" : "Finish",
            close: language === "zh" ? "关闭" : "Close",
          }}
        />
      )}
    </TourContext.Provider>
  )
}

// 自定义Hook
export function useTour() {
  const context = useContext(TourContext)
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider")
  }
  return context
}
