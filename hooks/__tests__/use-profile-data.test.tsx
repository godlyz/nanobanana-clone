import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useProfileData } from "@/hooks/use-profile-data"

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
  last_sign_in_at: new Date("2024-01-05T00:00:00Z").toISOString(),
  user_metadata: {},
  app_metadata: {}
} as const

const unsubscribe = vi.fn()

const supabaseMock = {
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn()
  }
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseMock
}))

const originalFetch = global.fetch

let fetchMock!: ReturnType<typeof vi.fn>

const buildResponse = (body: unknown, init: ResponseInit = { status: 200 }) => {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init
  })
}

type ServerApiKeyRecord = {
  id: string
  name: string
  status: string
  created_at: string
  last_used: string | null
  key_hash: string
  key_prefix: string
}

let serverApiKeys: ServerApiKeyRecord[] = []

const resetServerApiKeys = () => {
  serverApiKeys = [
    {
      id: "key-1",
      name: "API Key 1",
      status: "active",
      created_at: "2024-01-08T00:00:00Z",
      last_used: null,
      key_hash: "hash-key-1",
      key_prefix: "nb_test_"
    }
  ]
}

const maskKey = (source: string) => {
  if (!source || source.length <= 8) {
    return source || "••••"
  }
  return `${source.slice(0, 4)}••••${source.slice(-4)}`
}

const defaultFetchImplementation = async (input: RequestInfo | URL, init?: RequestInit) => {
  const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method?.toUpperCase() ?? (typeof input === "object" && "method" in input ? (input as Request).method?.toUpperCase() : "GET")
  const urlObj = new URL(target, "http://localhost")
  const pathname = urlObj.pathname

  const rotateMatch = pathname.match(/\/api\/profile\/api-keys\/([^/]+)\/rotate$/)
  if (rotateMatch && method === "POST") {
    const keyId = rotateMatch[1]
    const record = serverApiKeys.find(item => item.id === keyId)
    if (!record) {
      return buildResponse({ error: "Not found" }, { status: 404 })
    }
    const secret = `nb_rotated_${Math.random().toString(16).slice(2, 10)}`
    record.key_hash = `hash-${secret}`
    record.key_prefix = secret.substring(0, 8)
    record.status = "active"
    record.last_used = null
    return buildResponse({
      apiKey: {
        id: record.id,
        name: record.name,
        status: record.status,
        createdAt: record.created_at,
        lastUsed: record.last_used,
        maskedKey: maskKey(record.key_prefix),
        maskSource: record.key_prefix,
        keyPrefix: record.key_prefix,
        secret
      }
    })
  }

  if (pathname === "/api/profile/api-keys" && method === "GET") {
    return buildResponse({
      apiKeys: serverApiKeys.map(record => ({
        id: record.id,
        name: record.name,
        status: record.status,
        createdAt: record.created_at,
        lastUsed: record.last_used,
        maskedKey: maskKey(record.key_prefix),
        maskSource: record.key_prefix,
        keyPrefix: record.key_prefix
      }))
    })
  }

  if (pathname === "/api/profile/api-keys" && method === "POST") {
    const bodyText = init?.body ? init.body.toString() : ""
    const parsed = bodyText ? JSON.parse(bodyText) : {}
    const newId = `key-${serverApiKeys.length + 1}`
    const secret = `nb_demo_${serverApiKeys.length + 1}`
    const now = new Date("2024-01-12T00:00:00Z").toISOString()
    const record: ServerApiKeyRecord = {
      id: newId,
      name: parsed.name || "新密钥",
      status: "active",
      created_at: now,
      last_used: null,
      key_hash: `hash-${newId}`,
      key_prefix: secret.substring(0, 8)
    }
    serverApiKeys = [record, ...serverApiKeys]

    return buildResponse({
      apiKey: {
        id: record.id,
        name: record.name,
        status: record.status,
        createdAt: record.created_at,
        lastUsed: record.last_used,
        maskedKey: maskKey(record.key_prefix),
        maskSource: record.key_prefix,
        keyPrefix: record.key_prefix,
        secret
      }
    })
  }

  const idMatch = pathname.match(/\/api\/profile\/api-keys\/([^/]+)$/)
  if (idMatch && method === "PATCH") {
    const keyId = idMatch[1]
    const bodyText = init?.body ? init.body.toString() : ""
    const parsed = bodyText ? JSON.parse(bodyText) : {}
    const record = serverApiKeys.find(item => item.id === keyId)
    if (!record) {
      return buildResponse({ error: "Not found" }, { status: 404 })
    }
    if (parsed.status && (parsed.status === "active" || parsed.status === "inactive")) {
      record.status = parsed.status
    }
    return buildResponse({
      apiKey: {
        id: record.id,
        name: record.name,
        status: record.status,
        createdAt: record.created_at,
        lastUsed: record.last_used,
        maskedKey: maskKey(record.key_prefix),
        maskSource: record.key_prefix,
        keyPrefix: record.key_prefix
      }
    })
  }

  if (idMatch && method === "DELETE") {
    const keyId = idMatch[1]
    const index = serverApiKeys.findIndex(item => item.id === keyId)
    if (index === -1) {
      return buildResponse({ error: "Not found" }, { status: 404 })
    }
    serverApiKeys.splice(index, 1)
    return buildResponse({ success: true })
  }

  if (target.includes("/api/credits")) {
    const url = new URL(target, "http://localhost")
    const page = url.searchParams.get("page") ?? "1"
    if (page === "1") {
      return buildResponse({
        currentCredits: 120,
        totalEarned: 300,
        totalUsed: 180,
        transactions: [
          {
            id: "tx-1",
            type: "earned",
            amount: 120,
            description: "首批积分",
            timestamp: "2024-01-10T00:00:00Z"
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalCount: 2,
          limit: 20,
          hasMore: true
        }
      })
    }

    return buildResponse({
      currentCredits: 120,
      totalEarned: 300,
      totalUsed: 180,
      transactions: [
        {
          id: "tx-2",
          type: "used",
          amount: 60,
          description: "追加积分",
          timestamp: "2024-01-11T00:00:00Z"
        }
      ],
      pagination: {
        currentPage: Number(page),
        totalPages: 2,
        totalCount: 2,
        limit: 20,
        hasMore: false
      }
    })
  }

  if (target.includes("/api/subscription/status")) {
    return buildResponse({
      subscription: {
        id: "sub-1",
        plan: "basic",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        expires_at: "2099-01-01T00:00:00Z",
        interval: "monthly"
      }
    })
  }

  if (target.includes("/api/stats/overview")) {
    return buildResponse({
      success: true,
      data: {
        totalImages: 15,
        activeDays: 5
      }
    })
  }

  return buildResponse({})
}

describe("useProfileData", () => {
  beforeEach(() => {
    unsubscribe.mockReset()
    resetServerApiKeys()

    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    })

    supabaseMock.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: { user: typeof mockUser } | null) => void) => {
      callback("SIGNED_IN", { user: mockUser })
      return {
        data: {
          subscription: {
            unsubscribe
          }
        }
      }
    })

    fetchMock = vi.fn(defaultFetchImplementation)

    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("在切换筛选类型时会重置页码并触发新的积分请求", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.credits?.transactions.length).toBe(1))

    expect(
      fetchMock.mock.calls.some(([url]) => typeof url === "string" && url.includes("/api/credits?"))
    ).toBe(true)

    fetchMock.mockClear()

    act(() => {
      result.current.handleFilterChange("earned")
    })

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => typeof url === "string" && url.includes("type=earned"))
      ).toBe(true)
    })

    expect(result.current.filterType).toBe("earned")
    expect(result.current.currentPage).toBe(1)
  })

  it("在加载更多时会追加交易记录并更新页码", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.credits?.transactions.length).toBe(1))

    fetchMock.mockClear()

    act(() => {
      result.current.handleLoadMore()
    })

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => typeof url === "string" && url.includes("page=2"))
      ).toBe(true)
    })

    await waitFor(() => expect(result.current.currentPage).toBe(2))
    await waitFor(() => expect(result.current.loadingMore).toBe(false))
    await waitFor(() => expect(result.current.credits?.transactions.length).toBe(2))
  })

  it("在积分接口出错时保持积分状态为空并记录告警", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (target.includes("/api/credits")) {
        return buildResponse({ message: "server error" }, { status: 500, statusText: "Internal Server Error" })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.credits).toBeNull()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("⚠️ API返回错误"))

    warnSpy.mockRestore()
  })

  it("在无交易记录时不会重复触发加载更多", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (target.includes("/api/credits")) {
        return buildResponse({
          currentCredits: 0,
          totalEarned: 0,
          totalUsed: 0,
          transactions: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            limit: 20,
            hasMore: false
          }
        })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.credits?.transactions).toEqual([])

    const callCount = fetchMock.mock.calls.length

    act(() => {
      result.current.handleLoadMore()
    })

    expect(fetchMock.mock.calls.length).toBe(callCount)
  })

  it("创建 API Key 成功时会插入列表并返回密钥", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    let createdKey: Awaited<ReturnType<typeof result.current.createApiKey>> | undefined

    await act(async () => {
      createdKey = await result.current.createApiKey("测试密钥")
    })

    expect(createdKey?.secret).toBeDefined()
    expect(result.current.apiKeys.length).toBe(2)
    expect(result.current.apiKeys[0].id).toBe(createdKey?.id)
    expect(result.current.apiKeys[0].maskedKey).toBeDefined()
  })

  it("创建 API Key 失败时保持列表不变", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method?.toUpperCase()
      if (target.includes("/api/profile/api-keys") && method === "POST") {
        return buildResponse({ error: "failed" }, { status: 500 })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    let createdKey: Awaited<ReturnType<typeof result.current.createApiKey>> | undefined
    await act(async () => {
      createdKey = await result.current.createApiKey("失败用例")
    })

    expect(createdKey).toBeNull()
    expect(result.current.apiKeys.length).toBe(1)
  })

  it("删除 API Key 成功时会从列表移除", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const firstId = result.current.apiKeys[0].id

    let deleteResult: boolean | undefined
    await act(async () => {
      deleteResult = await result.current.deleteApiKey(firstId)
    })

    expect(deleteResult).toBe(true)
    expect(result.current.apiKeys.some(key => key.id === firstId)).toBe(false)
  })

  it("删除 API Key 失败时保持列表不变", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method?.toUpperCase()
      if (target.includes("/api/profile/api-keys") && method === "DELETE") {
        return buildResponse({ error: "failed" }, { status: 500 })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const firstId = result.current.apiKeys[0].id

    let deleteResult: boolean | undefined
    await act(async () => {
      deleteResult = await result.current.deleteApiKey(firstId)
    })

    expect(deleteResult).toBe(false)
    expect(result.current.apiKeys.some(key => key.id === firstId)).toBe(true)
  })

  it("切换 API Key 状态成功时会更新本地列表", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const firstKey = result.current.apiKeys[0]
    expect(firstKey.status).toBe("active")

    let toggleResult: boolean | undefined
    await act(async () => {
      toggleResult = await result.current.toggleApiKeyStatus(firstKey.id, "inactive")
    })

    expect(toggleResult).toBe(true)
    expect(result.current.apiKeys[0].status).toBe("inactive")

    await act(async () => {
      await result.current.toggleApiKeyStatus(firstKey.id, "active")
    })

    expect(result.current.apiKeys[0].status).toBe("active")
  })

  it("切换 API Key 状态失败时保持原状态", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method?.toUpperCase()
      if (target.includes("/api/profile/api-keys") && method === "PATCH") {
        return buildResponse({ error: "failed" }, { status: 500 })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const firstKey = result.current.apiKeys[0]

    let toggleResult: boolean | undefined
    await act(async () => {
      toggleResult = await result.current.toggleApiKeyStatus(firstKey.id, "inactive")
    })

    expect(toggleResult).toBe(false)
    expect(result.current.apiKeys[0].status).toBe(firstKey.status)
  })

  it("重新生成 API Key 成功时返回新密钥", async () => {
    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const firstId = result.current.apiKeys[0].id

    let rotatedKey: Awaited<ReturnType<typeof result.current.rotateApiKey>> | undefined
    await act(async () => {
      rotatedKey = await result.current.rotateApiKey(firstId)
    })

    expect(rotatedKey?.secret).toBeDefined()
    expect(result.current.apiKeys[0].secret).toBe(rotatedKey?.secret)
    expect(result.current.apiKeys[0].maskedKey).toBeDefined()
  })

  it("重新生成 API Key 失败时保持原状态", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method?.toUpperCase()
      if (target.includes("/api/profile/api-keys") && target.endsWith("/rotate") && method === "POST") {
        return buildResponse({ error: "failed" }, { status: 500 })
      }
      return defaultFetchImplementation(input, init)
    })

    const { result } = renderHook(() => useProfileData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.apiKeys.length).toBe(1))

    const before = result.current.apiKeys[0]

    let rotatedKey: Awaited<ReturnType<typeof result.current.rotateApiKey>> | undefined
    await act(async () => {
      rotatedKey = await result.current.rotateApiKey(before.id)
    })

    expect(rotatedKey).toBeNull()
    expect(result.current.apiKeys[0].maskedKey).toBe(before.maskedKey)
  })
})
