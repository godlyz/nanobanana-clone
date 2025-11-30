/**
 * 🔥 老王的Cloudflare Turnstile组件
 * 用途: 图形验证码，防止机器人注册
 * 老王警告: 这个组件是安全防护的关键，别tm搞坏了！
 */

"use client"

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

// Turnstile配置
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

// Turnstile回调类型
interface TurnstileCallbacks {
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
}

// Turnstile组件Props
interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  onTimeout?: () => void
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

// Turnstile Window扩展
declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: {
        sitekey: string
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact'
        callback?: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        'timeout-callback'?: () => void
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

/**
 * 🔥 Turnstile组件
 * 老王核心功能: 渲染Cloudflare Turnstile验证码
 */
export function Turnstile({
  onVerify,
  onError,
  onExpire,
  onTimeout,
  className = '',
  theme = 'auto',
  size = 'normal'
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const isDevBypass = !TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!isDevBypass) {
      return
    }

    console.warn('⚠️ Turnstile Site Key未配置，开发模式自动放行')
    const timer = setTimeout(() => {
      onVerify('dev-mode-bypass-token')
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDevBypass, onVerify])

  // 渲染Turnstile Widget
  useEffect(() => {
    if (isDevBypass || !isScriptLoaded || !containerRef.current || !window.turnstile) {
      return
    }

    // 如果已经渲染过，先清理
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch (err) {
        console.warn('Failed to remove previous Turnstile widget:', err)
      }
      widgetIdRef.current = null
    }

    try {
      // 渲染新的Widget
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        size,
        callback: (token: string) => {
          console.log('✅ Turnstile验证成功')
          onVerify(token)
        },
        'error-callback': () => {
          console.error('❌ Turnstile验证出错')
          onError?.()
        },
        'expired-callback': () => {
          console.warn('⚠️ Turnstile验证过期')
          onExpire?.()
        },
        'timeout-callback': () => {
          console.warn('⏱️ Turnstile验证超时')
          onTimeout?.()
        }
      })

      widgetIdRef.current = widgetId
      console.log('🔒 Turnstile Widget已渲染:', widgetId)
    } catch (error) {
      console.error('❌ Turnstile渲染失败:', error)
      onError?.()
    }

    // 清理函数
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (err) {
          console.warn('Failed to remove Turnstile widget:', err)
        }
        widgetIdRef.current = null
      }
    }
  }, [isDevBypass, isScriptLoaded, theme, size, onVerify, onError, onExpire, onTimeout])

  if (isDevBypass) {
    return (
      <div className={`p-4 border border-dashed border-yellow-500 rounded ${className}`}>
        <p className="text-xs text-yellow-600">
          ⚠️ Turnstile未配置（开发模式）
        </p>
      </div>
    )
  }

  return (
    <>
      {/* 加载Turnstile脚本 */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={() => {
          console.log('✅ Turnstile脚本加载完成')
          setIsScriptLoaded(true)
        }}
        onError={() => {
          console.error('❌ Turnstile脚本加载失败')
          onError?.()
        }}
      />

      {/* Turnstile容器 */}
      <div ref={containerRef} className={className} />
    </>
  )
}

/**
 * 🔥 重置Turnstile Widget
 * 老王注释: 用于重新验证
 */
export function resetTurnstile(widgetId: string) {
  if (window.turnstile && widgetId) {
    window.turnstile.reset(widgetId)
  }
}

/**
 * 🔥 获取Turnstile Token
 * 老王注释: 用于手动获取验证Token
 */
export function getTurnstileResponse(widgetId: string): string {
  if (window.turnstile && widgetId) {
    return window.turnstile.getResponse(widgetId)
  }
  return ''
}
