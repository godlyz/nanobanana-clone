"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export type FilterType = "all" | "earned" | "used"

export interface SubscriptionData {
  id: string
  plan: string
  status: string  // 'active' | 'frozen' | 'expired'
  startDate: string
  endDate: string
  billingPeriod: string
  billing_cycle?: 'monthly' | 'yearly' // 🔥 老王 Day 4 添加：计费周期字段（snake_case，与数据库保持一致）
  // 🔥 老王添加：降级调整模式字段
  adjustment_mode?: 'immediate' | 'scheduled' | null
  downgrade_to_plan?: string | null
  downgrade_to_billing_cycle?: string | null
  original_plan_expires_at?: string | null
  remaining_days?: number | null
  // 🔥 老王新增：冻结相关字段
  frozenUntil?: string | null
  frozenCredits?: number
  remainingMonths?: number
}

export interface CreditData {
  currentCredits: number
  totalEarned: number
  totalUsed: number
  transactions: Array<{
    id: string
    type: FilterType
    amount: number
    description: string
    timestamp: string
    // 🔥 老王新增：前端解析器需要的字段
    transaction_type?: string
    related_entity_id?: string | null
    related_entity_type?: string | null
    expires_at?: string | null
    remaining_credits?: number
  }>
  expiringSoon?: {
    credits: number
    date: string | null
    items?: Array<{
      date: string | null
      credits: number
    }>
  }
  allExpiry?: {
    items: Array<{
      date: string | null
      credits: number
    }>
  }
  pagination?: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasMore: boolean
  }
}

export interface ApiKeyData {
  id: string
  name: string
  status: string
  createdAt: string
  lastUsed?: string
  maskedKey: string
  secret?: string
}

export interface UsageStats {
  totalImages: number
  activeDays: number
}

interface UseProfileDataResult {
  loading: boolean
  user: User | null
  subscription: SubscriptionData | null  // 🔥 保留单个订阅（兼容旧代码）
  subscriptions: SubscriptionData[]  // 🔥 老王新增：所有订阅列表
  credits: CreditData | null
  apiKeys: ApiKeyData[]
  stats: UsageStats | null
  filterType: FilterType
  currentPage: number
  loadingMore: boolean
  handleFilterChange: (type: FilterType) => void
  handleLoadMore: () => void
  createApiKey: (name?: string) => Promise<ApiKeyData | null>
  deleteApiKey: (id: string) => Promise<boolean>
  toggleApiKeyStatus: (id: string, status: string) => Promise<boolean>
  rotateApiKey: (id: string) => Promise<ApiKeyData | null>
}

export function useProfileData(): UseProfileDataResult {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])  // 🔥 老王新增：所有订阅列表
  const [credits, setCredits] = useState<CreditData | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [stats, setStats] = useState<UsageStats | null>(null)

  const [filterType, setFilterType] = useState<FilterType>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const filterRef = useRef<FilterType>("all")

  const loadCreditData = useCallback(async (
    page: number = 1,
    type: FilterType = "all",
    append: boolean = false
  ) => {
    try {
      if (append) {
        setLoadingMore(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        type
      })

      const response = await fetch(`/api/credits?${params}`)

      if (!response.ok) {
        console.warn(`⚠️ API返回错误: ${response.status} ${response.statusText}`)
        const errorData = await response.json().catch(() => ({}))
        console.warn("错误详情:", errorData)
        return
      }

      const data = await response.json()

      if (!data || typeof data !== "object") {
        console.warn("⚠️ API返回的数据格式无效")
        return
      }

      if (!Array.isArray(data.transactions)) {
        console.warn("⚠️ API返回的transactions不是数组")
        return
      }

      setCredits(prevCredits => {
        if (append && prevCredits) {
          return {
            ...data,
            transactions: [
              ...(prevCredits.transactions || []),
              ...(data.transactions || [])
            ]
          }
        }
        return data
      })
    } catch (error) {
      console.warn("⚠️ Error fetching credit data:", error)
    } finally {
      if (append) {
        setLoadingMore(false)
      }
    }
  }, [])

  const loadSubscriptionData = useCallback(async () => {
    // 🔥 老王调试：在客户端打印，确认函数是否被调用
    console.log("🔍 [客户端] loadSubscriptionData 函数开始执行")

    try {
      // 🔥 老王修改：同时调用两个API（单个订阅+所有订阅）
      console.log("🔍 [客户端] 准备调用 /api/subscription/status 和 /api/subscription/all")

      // 🔥 API 1：单个订阅（兼容旧代码）
      const statusResponse = await fetch("/api/subscription/status")
      console.log("🔍 [客户端] status API响应状态:", statusResponse.status, statusResponse.statusText)
      const statusData = await statusResponse.json()
      console.log("🔍 [客户端] status API返回数据:", JSON.stringify(statusData, null, 2))

      if (statusData.subscription) {
        // 🔥 老王修复：首先检查日期字段是否存在
        if (!statusData.subscription.expires_at || !statusData.subscription.created_at) {
          console.warn("⚠️ 订阅数据缺少日期字段:", {
            has_expires_at: !!statusData.subscription.expires_at,
            has_created_at: !!statusData.subscription.created_at,
            subscription: statusData.subscription
          })
        } else {
          // 🔥 老王修复：验证日期有效性，避免 Invalid Date
          const expiresAt = new Date(statusData.subscription.expires_at)
          const createdAt = new Date(statusData.subscription.created_at)
          const now = new Date()

          // 🔥 老王修复：检查日期对象是否有效
          const isValidExpiresAt = !isNaN(expiresAt.getTime())
          const isValidCreatedAt = !isNaN(createdAt.getTime())

          if (!isValidExpiresAt || !isValidCreatedAt) {
            console.error("❌ 订阅日期数据无效:", {
              expires_at: statusData.subscription.expires_at,
              created_at: statusData.subscription.created_at,
              isValidExpiresAt,
              isValidCreatedAt
            })
          } else {
            const isExpired = expiresAt <= now
            const actualStatus = isExpired ? "expired" : statusData.subscription.status

            setSubscription({
              id: statusData.subscription.id,
              plan: statusData.subscription.plan,
              status: actualStatus,
              startDate: createdAt.toISOString(),
              endDate: expiresAt.toISOString(),
              billingPeriod: statusData.subscription.interval || "monthly",
              // 🔥 老王添加：降级调整模式字段
              adjustment_mode: statusData.subscription.adjustment_mode || null,
              downgrade_to_plan: statusData.subscription.downgrade_to_plan || null,
              downgrade_to_billing_cycle: statusData.subscription.downgrade_to_billing_cycle || null,
              original_plan_expires_at: statusData.subscription.original_plan_expires_at || null,
              remaining_days: statusData.subscription.remaining_days || null,
            })
          }
        }
      }

      // 🔥 API 2：所有订阅列表（新功能）
      const allResponse = await fetch("/api/subscription/all")
      console.log("🔍 [客户端] all API响应状态:", allResponse.status, allResponse.statusText)
      const allData = await allResponse.json()
      console.log("🔍 [客户端] all API返回数据:", JSON.stringify(allData, null, 2))

      if (allData.subscriptions && Array.isArray(allData.subscriptions)) {
        setSubscriptions(allData.subscriptions)
        console.log(`✅ [客户端] 成功加载 ${allData.subscriptions.length} 条订阅`)
      } else {
        setSubscriptions([])
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error)
    }
  }, [])

  const maskKey = useCallback((value: string | null | undefined) => {
    if (!value) {
      return "••••••••"
    }
    if (value.length <= 8) {
      return value.replace(/.(?=.{4})/g, "•")
    }
    return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`
  }, [])

  const transformServerKey = useCallback((record: any): ApiKeyData => {
    return {
      id: record.id,
      name: record.name,
      status: record.status ?? "active",
      createdAt: record.createdAt ?? record.created_at,
      lastUsed: record.lastUsed ?? record.last_used ?? undefined,
      maskedKey: record.maskedKey ?? maskKey(record.keyPrefix ?? record.maskSource ?? record.key_prefix ?? record.key_hash ?? record.id),
      secret: record.secret
    }
  }, [maskKey])

  const loadApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/api-keys")
      if (!response.ok) {
        console.warn("⚠️ API Keys 接口返回错误", response.status)
        return
      }
      const data = await response.json()
      if (Array.isArray(data.apiKeys)) {
        setApiKeys(data.apiKeys.map(transformServerKey))
      } else {
        setApiKeys([])
      }
    } catch (error) {
      console.warn("⚠️ 加载 API Keys 失败:", error)
    }
  }, [transformServerKey])

  const createApiKey = useCallback(async (name?: string) => {
    try {
      const response = await fetch("/api/profile/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        console.warn("⚠️ 创建 API Key 失败:", errorBody)
        return null
      }

      const data = await response.json()
      if (data.apiKey) {
        const formatted = transformServerKey(data.apiKey)
        setApiKeys(prev => [formatted, ...prev])
        return formatted
      }
    } catch (error) {
      console.warn("⚠️ 创建 API Key 请求异常:", error)
    }
    return null
  }, [transformServerKey])

  const deleteApiKey = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/profile/api-keys/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        console.warn("⚠️ 删除 API Key 失败:", errorBody)
        return false
      }

      setApiKeys(prev => prev.filter(key => key.id !== id))
      return true
    } catch (error) {
      console.warn("⚠️ 删除 API Key 请求异常:", error)
      return false
    }
  }, [])

  const toggleApiKeyStatus = useCallback(async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/profile/api-keys/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        console.warn("⚠️ 更新 API Key 状态失败:", errorBody)
        return false
      }

      const data = await response.json()
      if (data.apiKey) {
        setApiKeys(prev => prev.map(item => item.id === id ? transformServerKey(data.apiKey) : item))
      }

      return true
    } catch (error) {
      console.warn("⚠️ 更新 API Key 状态异常:", error)
      return false
    }
  }, [transformServerKey])

  const rotateApiKey = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/profile/api-keys/${id}/rotate`, {
        method: "POST"
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        console.warn("⚠️ 重新生成 API Key 失败:", errorBody)
        return null
      }

      const data = await response.json()
      if (data.apiKey) {
        const formatted = transformServerKey(data.apiKey)
        setApiKeys(prev => prev.map(item => item.id === id ? formatted : item))
        return formatted
      }
    } catch (error) {
      console.warn("⚠️ 重新生成 API Key 请求异常:", error)
    }
    return null
  }, [transformServerKey])

  const loadStatsData = useCallback(async () => {
    try {
      const response = await fetch("/api/stats/overview")
      if (!response.ok) {
        console.warn("⚠️ Stats API返回错误")
        return
      }
      const data = await response.json()
      if (data.success && data.data) {
        setStats({
          totalImages: data.data.totalImages,
          activeDays: data.data.activeDays
        })
      }
    } catch (error) {
      console.warn("⚠️ Error fetching stats data:", error)
    }
  }, [])

  const handleFilterChange = useCallback((type: FilterType) => {
    filterRef.current = type
    setFilterType(type)
    setCurrentPage(1)
    loadCreditData(1, type, false)
  }, [loadCreditData])

  const handleLoadMore = useCallback(() => {
    if (credits?.pagination?.hasMore && !loadingMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadCreditData(nextPage, filterType, true)
    }
  }, [credits?.pagination?.hasMore, currentPage, filterType, loadCreditData, loadingMore])

  useEffect(() => {
    filterRef.current = filterType
  }, [filterType])

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          await Promise.all([
            loadSubscriptionData(),
            loadCreditData(1, filterRef.current, false),
            loadApiKeys(),
            loadStatsData()
          ])
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: subscriptionListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadSubscriptionData()
        loadCreditData(1, filterRef.current, false)
        loadApiKeys()
        loadStatsData()
      } else {
        setSubscription(null)
        setCredits(null)
        setApiKeys([])
        setStats(null)
      }
    })

    return () => {
      subscriptionListener.subscription.unsubscribe()
    }
  }, [
    supabase,
    loadSubscriptionData,
    loadCreditData,
    loadApiKeys,
    loadStatsData
  ])

  return {
    loading,
    user,
    subscription,
    subscriptions,  // 🔥 老王新增：所有订阅列表
    credits,
    apiKeys,
    stats,
    filterType,
    currentPage,
    loadingMore,
    handleFilterChange,
    handleLoadMore,
    createApiKey,
    deleteApiKey,
    toggleApiKeyStatus,
    rotateApiKey
  }
}
