/**
 * useProfileData Hook 测试套件
 * 老王备注: 这个SB测试文件覆盖个人资料数据Hook的所有功能
 *
 * 测试范围:
 * 1. Hook初始化和用户认证
 * 2. 积分数据加载（成功、失败、分页、筛选）
 * 3. 订阅数据加载（成功、失败、过期处理）
 * 4. API Key管理（CRUD、脱敏、轮换）
 * 5. 统计数据加载
 * 6. 交互功能（筛选切换、加载更多）
 * 7. 认证状态变化监听
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useProfileData } from '@/hooks/use-profile-data'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('useProfileData Hook', () => {
  let mockSupabase: any
  let mockAuthStateCallback: ((event: string, session: any) => void) | null = null

  beforeEach(() => {
    // 创建 Mock Supabase 客户端
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        onAuthStateChange: vi.fn((callback) => {
          // 保存回调以便后续测试中调用
          mockAuthStateCallback = callback
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn()
              }
            }
          }
        }),
      },
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)

    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
    mockAuthStateCallback = null
  })

  describe('初始化和用户认证', () => {
    it('应该初始化时loading为true', () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
    })

    it('应该成功获取已登录用户并加载所有数据', async () => {
      // Arrange
      const mockUser = { id: 'user_123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock所有API响应
      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              subscription: {
                id: 'sub_1',
                plan: 'pro',
                status: 'active',
                created_at: '2025-01-01T00:00:00Z',
                expires_at: '2025-12-31T23:59:59Z',
                interval: 'monthly'
              }
            }),
          } as Response)
        } else if (urlStr.includes('/api/credits')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              currentCredits: 100,
              totalEarned: 150,
              totalUsed: 50,
              transactions: [
                {
                  id: 'tx_1',
                  type: 'earned',
                  amount: 50,
                  description: '注册奖励',
                  timestamp: '2025-01-01T00:00:00Z'
                }
              ],
              pagination: {
                currentPage: 1,
                totalPages: 1,
                totalCount: 1,
                limit: 20,
                hasMore: false
              }
            }),
          } as Response)
        } else if (urlStr.includes('/api/profile/api-keys')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              apiKeys: [
                {
                  id: 'key_1',
                  name: 'Test Key',
                  status: 'active',
                  createdAt: '2025-01-01T00:00:00Z',
                  maskedKey: 'nana••••1234'
                }
              ]
            }),
          } as Response)
        } else if (urlStr.includes('/api/stats/overview')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                totalImages: 42,
                activeDays: 7
              }
            }),
          } as Response)
        }
        return Promise.resolve({ ok: false } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert - 等待异步加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.subscription).toMatchObject({
        plan: 'pro',
        status: 'active'
      })
      expect(result.current.credits?.currentCredits).toBe(100)
      expect(result.current.apiKeys).toHaveLength(1)
      expect(result.current.stats).toMatchObject({
        totalImages: 42,
        activeDays: 7
      })
    })

    it('应该处理未登录用户', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.subscription).toBeNull()
      expect(result.current.credits).toBeNull()
      expect(result.current.apiKeys).toEqual([])
      expect(result.current.stats).toBeNull()
    })

    it('应该处理认证错误', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth failed'))

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user data:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('积分数据加载', () => {
    it('应该处理API返回错误状态', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/credits')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'Database error' }),
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert - 老王修复：代码会打印两次日志（错误+详情）
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalled()
        // 检查第一次调用包含错误信息
        expect(consoleWarnSpy.mock.calls[0][0]).toContain('API返回错误')
      })

      expect(result.current.credits).toBeNull()

      consoleWarnSpy.mockRestore()
    })

    it('应该处理API返回无效数据格式', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/credits')) {
          return Promise.resolve({
            ok: true,
            json: async () => null, // 无效数据
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ API返回的数据格式无效')
      })

      consoleWarnSpy.mockRestore()
    })

    it('应该处理transactions不是数组的情况', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/credits')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              currentCredits: 100,
              transactions: null, // 不是数组
            }),
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ API返回的transactions不是数组')
      })

      consoleWarnSpy.mockRestore()
    })

    it('应该处理网络请求异常', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/credits')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ Error fetching credit data:',
          expect.any(Error)
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })

  describe('订阅数据加载', () => {
    it('应该正确处理过期订阅', async () => {
      // Arrange
      const pastDate = new Date('2020-01-01T00:00:00Z').toISOString()

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/subscription/status')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              subscription: {
                id: 'sub_1',
                plan: 'pro',
                status: 'active', // 原始状态
                created_at: '2019-01-01T00:00:00Z',
                expires_at: pastDate, // 过期日期
                interval: 'monthly'
              }
            }),
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(result.current.subscription?.status).toBe('expired')
      })
    })

    it('应该处理订阅数据加载错误', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/subscription/status')) {
          return Promise.reject(new Error('Subscription API error'))
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching subscription data:',
          expect.any(Error)
        )
      })

      expect(result.current.subscription).toBeNull()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('API Key管理功能', () => {
    describe('maskKey 脱敏功能', () => {
      it('应该处理null/undefined值', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  {
                    id: 'key_1',
                    name: 'Test Key',
                    status: 'active',
                    createdAt: '2025-01-01',
                    keyPrefix: null, // null值测试
                  }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert - 老王修复：当keyPrefix为null时会回退到record.id ('key_1')
        // 'key_1'长度为5，maskKey会保留最后4个字符，所以结果是'•ey_1'
        await waitFor(() => {
          expect(result.current.apiKeys[0]?.maskedKey).toBe('•ey_1')
        })
      })

      it('应该处理短字符串（≤8字符）', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  {
                    id: 'key_1',
                    name: 'Test Key',
                    status: 'active',
                    createdAt: '2025-01-01',
                    keyPrefix: 'abcd1234', // 8字符
                  }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert
        await waitFor(() => {
          // 应该保留最后4个字符，其他替换为•
          expect(result.current.apiKeys[0]?.maskedKey).toMatch(/^••••1234$/)
        })
      })

      it('应该处理长字符串（>8字符）', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  {
                    id: 'key_1',
                    name: 'Test Key',
                    status: 'active',
                    createdAt: '2025-01-01',
                    keyPrefix: 'nanobanana123456', // >8字符
                  }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert
        await waitFor(() => {
          // 应该显示前4个和后4个字符，中间用••••
          expect(result.current.apiKeys[0]?.maskedKey).toBe('nano••••3456')
        })
      })
    })

    describe('loadApiKeys', () => {
      it('应该处理API返回错误', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: false,
              status: 500,
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            '⚠️ API Keys 接口返回错误',
            500
          )
        })

        expect(result.current.apiKeys).toEqual([])

        consoleWarnSpy.mockRestore()
      })

      it('应该处理API返回非数组数据', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: null, // 非数组
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert
        await waitFor(() => {
          expect(result.current.apiKeys).toEqual([])
        })
      })

      it('应该处理加载失败', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        // Assert
        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            '⚠️ 加载 API Keys 失败:',
            expect.any(Error)
          )
        })

        consoleWarnSpy.mockRestore()
      })
    })

    describe('createApiKey', () => {
      it('应该成功创建API Key', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // 重置 mock 并设置创建API的响应
        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys') && options?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKey: {
                  id: 'new_key_1',
                  name: 'New API Key',
                  status: 'active',
                  createdAt: '2025-01-01',
                  keyPrefix: 'nana',
                  secret: 'nanobanana_secret_123456'
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        let newKey: any = null
        await act(async () => {
          newKey = await result.current.createApiKey('New API Key')
        })

        // Assert
        expect(newKey).toMatchObject({
          id: 'new_key_1',
          name: 'New API Key',
          status: 'active',
        })
        expect(result.current.apiKeys).toHaveLength(1)
        expect(result.current.apiKeys[0].id).toBe('new_key_1')
      })

      it('应该处理创建失败（API错误）', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys') && options?.method === 'POST') {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'Creation failed' }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        let newKey: any = null
        await act(async () => {
          newKey = await result.current.createApiKey('Failed Key')
        })

        // Assert
        expect(newKey).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 创建 API Key 失败:',
          expect.anything()
        )

        consoleWarnSpy.mockRestore()
      })

      it('应该处理创建异常', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys') && options?.method === 'POST') {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        let newKey: any = null
        await act(async () => {
          newKey = await result.current.createApiKey()
        })

        // Assert
        expect(newKey).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 创建 API Key 请求异常:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })
    })

    describe('deleteApiKey', () => {
      it('应该成功删除API Key', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  { id: 'key_1', name: 'Key 1', status: 'active', createdAt: '2025-01-01', keyPrefix: 'nana' }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.apiKeys).toHaveLength(1)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/key_1') && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: true,
              json: async () => ({ success: true }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let deleteResult = false
        await act(async () => {
          deleteResult = await result.current.deleteApiKey('key_1')
        })

        // Assert
        expect(deleteResult).toBe(true)
        expect(result.current.apiKeys).toHaveLength(0)
      })

      it('应该处理删除失败', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ apiKeys: [{ id: 'key_1', name: 'Key 1' }] }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/key_1') && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'Delete failed' }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let deleteResult = true
        await act(async () => {
          deleteResult = await result.current.deleteApiKey('key_1')
        })

        // Assert
        expect(deleteResult).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalled()

        consoleWarnSpy.mockRestore()
      })

      it('应该处理删除异常', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/') && options?.method === 'DELETE') {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let deleteResult = true
        await act(async () => {
          deleteResult = await result.current.deleteApiKey('key_1')
        })

        // Assert
        expect(deleteResult).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 删除 API Key 请求异常:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })
    })

    describe('toggleApiKeyStatus', () => {
      it('应该成功切换API Key状态', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  { id: 'key_1', name: 'Key 1', status: 'active', createdAt: '2025-01-01', keyPrefix: 'nana' }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.apiKeys[0]?.status).toBe('active')
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/key_1') && options?.method === 'PATCH') {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKey: {
                  id: 'key_1',
                  name: 'Key 1',
                  status: 'inactive',
                  createdAt: '2025-01-01',
                  keyPrefix: 'nana'
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let toggleResult = false
        await act(async () => {
          toggleResult = await result.current.toggleApiKeyStatus('key_1', 'inactive')
        })

        // Assert
        expect(toggleResult).toBe(true)
        expect(result.current.apiKeys[0].status).toBe('inactive')
      })

      it('应该处理切换状态失败', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/') && options?.method === 'PATCH') {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'Update failed' }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let toggleResult = true
        await act(async () => {
          toggleResult = await result.current.toggleApiKeyStatus('key_1', 'inactive')
        })

        // Assert
        expect(toggleResult).toBe(false)

        consoleWarnSpy.mockRestore()
      })

      it('应该处理切换状态异常', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/') && options?.method === 'PATCH') {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let toggleResult = true
        await act(async () => {
          toggleResult = await result.current.toggleApiKeyStatus('key_1', 'inactive')
        })

        // Assert
        expect(toggleResult).toBe(false)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 更新 API Key 状态异常:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })
    })

    describe('rotateApiKey', () => {
      it('应该成功重新生成API Key', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKeys: [
                  { id: 'key_1', name: 'Key 1', status: 'active', createdAt: '2025-01-01', keyPrefix: 'old_' }
                ]
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.apiKeys).toHaveLength(1)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/profile/api-keys/key_1/rotate') && options?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                apiKey: {
                  id: 'key_1',
                  name: 'Key 1',
                  status: 'active',
                  createdAt: '2025-01-01',
                  keyPrefix: 'new_',
                  secret: 'new_secret_123'
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let rotatedKey: any = null
        await act(async () => {
          rotatedKey = await result.current.rotateApiKey('key_1')
        })

        // Assert
        expect(rotatedKey).toMatchObject({
          id: 'key_1',
          maskedKey: expect.stringContaining('new_'),
        })
        expect(result.current.apiKeys[0].maskedKey).toContain('new_')
      })

      it('应该处理重新生成失败', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/rotate') && options?.method === 'POST') {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'Rotation failed' }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let rotatedKey: any = 'should_be_null'
        await act(async () => {
          rotatedKey = await result.current.rotateApiKey('key_1')
        })

        // Assert
        expect(rotatedKey).toBeNull()

        consoleWarnSpy.mockRestore()
      })

      it('应该处理重新生成异常', async () => {
        // Arrange
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        const initialFetch = vi.mocked(global.fetch).mockImplementation((url) => {
          return Promise.resolve({ ok: true, json: async () => ({ apiKeys: [] }) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        initialFetch.mockImplementation((url, options) => {
          const urlStr = url.toString()
          if (urlStr.includes('/rotate') && options?.method === 'POST') {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        let rotatedKey: any = 'should_be_null'
        await act(async () => {
          rotatedKey = await result.current.rotateApiKey('key_1')
        })

        // Assert
        expect(rotatedKey).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 重新生成 API Key 请求异常:',
          expect.any(Error)
        )

        consoleWarnSpy.mockRestore()
      })
    })
  })

  describe('统计数据加载', () => {
    it('应该处理stats API错误', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/stats/overview')) {
          return Promise.resolve({
            ok: false,
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Stats API返回错误')
      })

      expect(result.current.stats).toBeNull()

      consoleWarnSpy.mockRestore()
    })

    it('应该处理stats数据加载异常', async () => {
      // Arrange
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123' } },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation((url) => {
        const urlStr = url.toString()
        if (urlStr.includes('/api/stats/overview')) {
          return Promise.reject(new Error('Stats error'))
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      // Assert
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ Error fetching stats data:',
          expect.any(Error)
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })

  describe('交互功能', () => {
    describe('handleFilterChange', () => {
      it('应该成功切换筛选类型', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        let callCount = 0
        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/credits')) {
            callCount++
            const params = new URLSearchParams(urlStr.split('?')[1])
            return Promise.resolve({
              ok: true,
              json: async () => ({
                currentCredits: 100,
                totalEarned: 150,
                totalUsed: 50,
                transactions: [],
                pagination: {
                  currentPage: parseInt(params.get('page') || '1'),
                  totalPages: 1,
                  totalCount: 0,
                  limit: 20,
                  hasMore: false
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        const initialCallCount = callCount

        await act(async () => {
          result.current.handleFilterChange('earned')
        })

        // Assert
        await waitFor(() => {
          expect(result.current.filterType).toBe('earned')
          expect(result.current.currentPage).toBe(1)
          expect(callCount).toBe(initialCallCount + 1) // 应该重新加载数据
        })
      })
    })

    describe('handleLoadMore', () => {
      it('应该成功加载更多数据', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/credits')) {
            const params = new URLSearchParams(urlStr.split('?')[1])
            const page = parseInt(params.get('page') || '1')

            return Promise.resolve({
              ok: true,
              json: async () => ({
                currentCredits: 100,
                totalEarned: 150,
                totalUsed: 50,
                transactions: [
                  {
                    id: `tx_page${page}`,
                    type: 'earned',
                    amount: 10,
                    description: `Transaction page ${page}`,
                    timestamp: '2025-01-01'
                  }
                ],
                pagination: {
                  currentPage: page,
                  totalPages: 3,
                  totalCount: 50,
                  limit: 20,
                  hasMore: page < 3
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.credits?.transactions).toHaveLength(1)
          expect(result.current.credits?.pagination?.hasMore).toBe(true)
        })

        await act(async () => {
          result.current.handleLoadMore()
        })

        // Assert
        await waitFor(() => {
          expect(result.current.currentPage).toBe(2)
          expect(result.current.credits?.transactions).toHaveLength(2) // 追加模式
          expect(result.current.loadingMore).toBe(false)
        })
      })

      it('应该在无更多数据时不加载', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        let callCount = 0
        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/credits')) {
            callCount++
            return Promise.resolve({
              ok: true,
              json: async () => ({
                currentCredits: 100,
                transactions: [],
                pagination: {
                  currentPage: 1,
                  totalPages: 1,
                  totalCount: 0,
                  limit: 20,
                  hasMore: false // 无更多数据
                }
              }),
            } as Response)
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.credits?.pagination?.hasMore).toBe(false)
        })

        const initialCallCount = callCount

        await act(async () => {
          result.current.handleLoadMore()
        })

        // Assert
        expect(callCount).toBe(initialCallCount) // 不应该再次调用
      })

      it('应该在loading时不重复加载', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        })

        let callCount = 0
        vi.mocked(global.fetch).mockImplementation((url) => {
          const urlStr = url.toString()
          if (urlStr.includes('/api/credits')) {
            callCount++
            // 模拟慢速响应
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => ({
                    currentCredits: 100,
                    transactions: [],
                    pagination: {
                      currentPage: 1,
                      totalPages: 2,
                      totalCount: 30,
                      limit: 20,
                      hasMore: true
                    }
                  }),
                } as Response)
              }, 100)
            })
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
        })

        // Act
        const { result } = renderHook(() => useProfileData())

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        const initialCallCount = callCount

        // 老王修复：分开调用，确保第一次调用设置了loadingMore后再调用第二次
        await act(async () => {
          result.current.handleLoadMore()
        })

        // 等待loadingMore变为true
        await waitFor(() => {
          expect(result.current.loadingMore).toBe(true)
        })

        // 第二次调用应该被忽略（因为loadingMore=true）
        await act(async () => {
          result.current.handleLoadMore()
        })

        await waitFor(() => {
          expect(result.current.loadingMore).toBe(false)
        })

        // Assert - 应该只调用一次（第二次被忽略）
        expect(callCount).toBe(initialCallCount + 1)
      })
    })
  })

  describe('认证状态变化监听', () => {
    it('应该在认证状态变化时重新加载数据', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      let callCount = 0
      vi.mocked(global.fetch).mockImplementation((url) => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: async () => ({
            currentCredits: 100,
            transactions: [],
            apiKeys: [],
            pagination: { hasMore: false }
          }),
        } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toBeNull()
      })

      const initialCallCount = callCount

      // 模拟用户登录
      const newUser = { id: 'new_user', email: 'new@example.com' }
      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('SIGNED_IN', { user: newUser })
        }
      })

      // Assert
      await waitFor(() => {
        expect(result.current.user).toEqual(newUser)
        expect(callCount).toBeGreaterThan(initialCallCount) // 应该重新加载所有数据
      })
    })

    it('应该在用户登出时清空数据', async () => {
      // Arrange
      const mockUser = { id: 'user_123', email: 'test@example.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(global.fetch).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            currentCredits: 100,
            transactions: [],
            apiKeys: [{ id: 'key_1' }],
            subscription: { plan: 'pro' },
            pagination: { hasMore: false }
          }),
        } as Response)
      })

      // Act
      const { result } = renderHook(() => useProfileData())

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.apiKeys).toHaveLength(1)
      })

      // 模拟用户登出
      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('SIGNED_OUT', null)
        }
      })

      // Assert
      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.subscription).toBeNull()
        expect(result.current.credits).toBeNull()
        expect(result.current.apiKeys).toEqual([])
        expect(result.current.stats).toBeNull()
      })
    })
  })
})
