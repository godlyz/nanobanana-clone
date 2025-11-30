/**
 * 🔥 老王的挑战邮件服务测试套件
 * 老王备注: 这个SB测试覆盖所有邮件发送场景，确保万无一失！
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 🔥 使用 vi.hoisted() 确保mock在hoisting之前定义
const { mockSend, mockGetUserById } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetUserById: vi.fn()
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mockSend
    }
  }
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        getUserById: mockGetUserById
      }
    }
  })
}))

// 现在才import被测试的模块
import { sendChallengePrizeEmail, sendBatchChallengePrizeEmails } from '@/lib/challenge-email-service'

describe('🔥 Challenge Email Service - 邮件服务核心功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 🔥 重要：重置环境变量和模块状态
    process.env.RESEND_API_KEY = 'test_resend_api_key'
    process.env.RESEND_FROM_EMAIL = 'test@nanobanana.app'
    process.env.NODE_ENV = 'test'

    // 🔥 重置mockSend的返回值
    mockSend.mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
  })

  describe('📨 sendChallengePrizeEmail - 单个邮件发送', () => {
    it('✅ 应该成功发送获奖邮件', async () => {
      // Mock用户邮箱获取
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'winner@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'challenge-456',
        challengeTitle: '测试挑战',
        rank: 1,
        credits: 500
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('winner@example.com')
      expect(result.challengeTitle).toBe('测试挑战')
      expect(result.error).toBeUndefined()
      expect(mockGetUserById).toHaveBeenCalledWith('user-123')
      expect(mockSend).toHaveBeenCalled()
    })

    it('❌ 应该处理用户邮箱获取失败', async () => {
      mockGetUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found', name: 'AuthError', status: 404 }
      })

      const result = await sendChallengePrizeEmail({
        userId: 'non-existent-user',
        challengeId: 'challenge-456',
        challengeTitle: '测试挑战',
        rank: 1,
        credits: 500
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('无法获取用户邮箱')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('✅ 应该正确生成双语邮件内容', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'bilingual@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'challenge-789',
        challengeTitle: '双语测试挑战 Bilingual Test',
        rank: 3,
        credits: 200
      })

      const callArg = mockSend.mock.calls[0][0]

      expect(callArg).toMatchObject({
        to: 'bilingual@example.com',
        subject: expect.stringContaining('双语测试挑战 Bilingual Test'),
        from: expect.stringContaining('Nano Banana')
      })

      // 验证HTML内容包含双语信息
      expect(callArg.html).toContain('200 积分')
      expect(callArg.html).toContain('200 Credits')
      expect(callArg.html).toContain('第 3 名')

      // 验证纯文本版本
      expect(callArg.text).toContain('双语测试挑战 Bilingual Test')
      expect(callArg.text).toContain('200 积分')
      expect(callArg.text).not.toContain('<html>')
    })

    it('⚠️ 测试环境下成功发送邮件（模拟Resend API）', async () => {
      // 🔥 在测试环境下，因为有mock，所以总是能成功发送
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test-env@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'challenge-456',
        challengeTitle: '测试环境挑战',
        rank: 2,
        credits: 300
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('test-env@example.com')
      expect(mockSend).toHaveBeenCalled() // 测试环境通过mock发送
    })

    it('❌ 应该处理Resend发送失败的情况', async () => {
      // 🔥 模拟Resend API返回错误
      mockSend.mockResolvedValueOnce({ data: null, error: { message: 'API rate limit exceeded' } })

      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'fail@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'challenge-456',
        challengeTitle: 'API失败挑战',
        rank: 1,
        credits: 500
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('API rate limit exceeded')
      expect(result.email).toBe('fail@example.com')
    })
  })

  describe('📬 sendBatchChallengePrizeEmails - 批量邮件发送', () => {
    it('✅ 应该成功批量发送邮件（并发控制）', async () => {
      // Mock多个用户
      mockGetUserById.mockImplementation((userId: string) => {
        const userMap: Record<string, string> = {
          'user-1': 'winner1@example.com',
          'user-2': 'winner2@example.com',
          'user-3': 'winner3@example.com'
        }

        return Promise.resolve({
          data: {
            user: {
              id: userId,
              email: userMap[userId],
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          },
          error: null
        })
      })

      const prizeList = [
        { userId: 'user-1', challengeId: 'ch-1', challengeTitle: '批量测试1', rank: 1, credits: 500 },
        { userId: 'user-2', challengeId: 'ch-1', challengeTitle: '批量测试1', rank: 2, credits: 300 },
        { userId: 'user-3', challengeId: 'ch-1', challengeTitle: '批量测试1', rank: 3, credits: 100 }
      ]

      const result = await sendBatchChallengePrizeEmails(prizeList, 2) // 并发数2

      expect(result.total).toBe(3)
      expect(result.success).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('⚠️ 应该处理部分失败场景', async () => {
      mockGetUserById.mockImplementation((userId: string) => {
        if (userId === 'user-fail') {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'User not found', name: 'AuthError', status: 404 }
          })
        }

        return Promise.resolve({
          data: {
            user: {
              id: userId,
              email: `${userId}@example.com`,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {}
            }
          },
          error: null
        })
      })

      const prizeList = [
        { userId: 'user-ok', challengeId: 'ch-1', challengeTitle: '混合测试', rank: 1, credits: 500 },
        { userId: 'user-fail', challengeId: 'ch-1', challengeTitle: '混合测试', rank: 2, credits: 300 }
      ]

      const result = await sendBatchChallengePrizeEmails(prizeList, 5)

      expect(result.total).toBe(2)
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('user-fail')
    })
  })

  describe('🎯 边界情况测试', () => {
    it('✅ 应该处理空标题场景', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'ch-1',
        challengeTitle: '',
        rank: 1,
        credits: 500
      })

      expect(result.success).toBe(true) // 空标题也应该能发送
      expect(mockSend).toHaveBeenCalled()
    })

    it('✅ 应该处理超长挑战标题', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const longTitle = '这是一个非常非常非常非常非常非常非常非常非常长的挑战标题'.repeat(10)

      const result = await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'ch-long',
        challengeTitle: longTitle,
        rank: 1,
        credits: 500
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('test@example.com')
    })
  })

  describe('📧 邮件内容生成测试', () => {
    it('✅ 应该包含所有必需的HTML元素', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'content@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      await sendChallengePrizeEmail({
        userId: 'user-123',
        challengeId: 'ch-html',
        challengeTitle: 'HTML测试挑战',
        rank: 1,
        credits: 500
      })

      const callArg = mockSend.mock.calls[0][0]
      const html = callArg.html as string

      // 验证关键HTML元素
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('恭喜获奖') // 中文Header
      expect(html).toContain('Congratulations') // 英文Header
      expect(html).toContain('HTML测试挑战') // 挑战标题
      expect(html).toContain('500 积分') // 中文积分
      expect(html).toContain('500 Credits') // 英文积分
      expect(html).toContain('第 1 名') // 中文排名
      expect(html).toContain('https://nanobanana.app/challenges') // 行动按钮链接
      expect(html).toContain('Nano Banana') // 品牌名称
      expect(html).toContain('🍌') // Emoji
    })
  })
})
