"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

/**
 * useAuth - 认证状态管理 Hook
 *
 * Features:
 * - 获取当前登录用户
 * - 监听认证状态变化
 * - 提供登录/登出方法
 * - 加载状态管理
 *
 * Usage:
 * const { user, isLoading, signIn, signOut } = useAuth()
 */

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // 获取当前用户
    const getUser = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Failed to get user:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // 监听认证状态变化
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // 登录方法（跳转到登录页面）
  const signIn = () => {
    window.location.href = "/login"
  }

  // 登出方法
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      window.location.href = "/"
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  return {
    user,
    userId: user?.id,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut
  }
}
