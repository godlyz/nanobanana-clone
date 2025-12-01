"use client"

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 🔥 老王修复水合错误：初始主题从服务端渲染的HTML读取（避免闪烁）
  const [theme, setTheme] = useState<Theme>(() => {
    // 服务端渲染时默认返回light，客户端会立即从HTML读取真实值
    if (typeof window === "undefined") return "light"

    // 客户端首次渲染：从HTML元素读取服务端设置的主题（避免水合错误）
    const htmlTheme = document.documentElement.getAttribute("data-theme") as Theme | null
    return htmlTheme || "light"
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 🔥 老王修复：客户端挂载后，优先使用HTML上的主题（服务端SSR传递的值）
    const htmlTheme = document.documentElement.getAttribute("data-theme") as Theme | null
    if (htmlTheme) {
      setTheme(htmlTheme)
    } else {
      // 如果HTML上没有主题属性，再从localStorage读取
      const savedTheme = localStorage.getItem("theme") as Theme | null
      if (savedTheme) {
        setTheme(savedTheme)
      } else {
        // 最后才检测系统主题偏好
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setTheme(prefersDark ? "dark" : "light")
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    // 保存主题偏好到 localStorage
    localStorage.setItem("theme", theme)

    // 更新 HTML 根元素的 data-theme 属性
    document.documentElement.setAttribute("data-theme", theme)

    // 同时更新 class 以支持 Tailwind dark: 前缀
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light")
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  }

  // 始终提供 ThemeContext，即使在服务端渲染期间
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
