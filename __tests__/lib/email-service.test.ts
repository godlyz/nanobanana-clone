/**
 * 🔥 老王的通用邮件服务测试套件
 * 老王备注: 复用Phase 4的完美测试架构（vi.hoisted() + class-based mock）
 * 测试覆盖: 欢迎邮件、取消邮件、发票邮件、支付失败通知
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
import {
  sendWelcomeEmail,
  sendCancellationEmail,
  sendInvoiceEmail,
  sendPaymentFailureEmail
} from '@/lib/email-service'

describe('🔥 Email Service - 通用邮件服务测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 🔥 重要：重置环境变量和模块状态
    process.env.RESEND_API_KEY = 'test_resend_api_key'
    process.env.RESEND_FROM_EMAIL = 'test@nanobanana.app'
    process.env.NODE_ENV = 'test'

    // 🔥 重置mockSend的返回值
    mockSend.mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
  })

  describe('📧 sendWelcomeEmail - 欢迎邮件', () => {
    it('✅ 应该成功发送欢迎邮件（Basic月付）', async () => {
      // Mock用户邮箱获取
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'newuser@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendWelcomeEmail({
        userId: 'user-123',
        planName: 'Basic',
        planPrice: '$9.99/月',
        billingCycle: 'monthly'
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('newuser@example.com')
      expect(result.error).toBeUndefined()
      expect(mockGetUserById).toHaveBeenCalledWith('user-123')
      expect(mockSend).toHaveBeenCalled()

      // 验证邮件内容
      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.to).toBe('newuser@example.com')
      expect(callArg.subject).toContain('欢迎')
      expect(callArg.subject).toContain('Basic')
      expect(callArg.html).toContain('$9.99/月')
      expect(callArg.html).toContain('月度订阅')
    })

    it('✅ 应该成功发送欢迎邮件（Pro年付）', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            email: 'prouser@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendWelcomeEmail({
        userId: 'user-456',
        planName: 'Pro',
        planPrice: '$249/年',
        billingCycle: 'yearly'
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('prouser@example.com')

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.html).toContain('Pro')
      expect(callArg.html).toContain('$249/年')
      expect(callArg.html).toContain('年度订阅')
    })

    it('❌ 应该处理用户邮箱获取失败', async () => {
      mockGetUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found', name: 'AuthError', status: 404 }
      })

      const result = await sendWelcomeEmail({
        userId: 'non-existent-user',
        planName: 'Basic',
        planPrice: '$9.99/月',
        billingCycle: 'monthly'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('无法获取用户邮箱')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('❌ 应该处理Resend发送失败的情况', async () => {
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

      const result = await sendWelcomeEmail({
        userId: 'user-123',
        planName: 'Max',
        planPrice: '$99.99/月',
        billingCycle: 'monthly'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('API rate limit exceeded')
      expect(result.email).toBe('fail@example.com')
    })
  })

  describe('📧 sendCancellationEmail - 取消确认邮件', () => {
    it('✅ 应该成功发送取消确认邮件', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-789',
            email: 'canceluser@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendCancellationEmail({
        userId: 'user-789',
        planName: 'Pro',
        expirationDate: '2025年1月31日'
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('canceluser@example.com')

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.subject).toContain('Pro')
      expect(callArg.subject).toContain('取消')
      expect(callArg.html).toContain('2025年1月31日')
      expect(callArg.html).toContain('服务有效期至')
    })

    it('✅ 应该正确包含到期日期', async () => {
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

      const expirationDate = '2025年12月25日'

      await sendCancellationEmail({
        userId: 'user-123',
        planName: 'Basic',
        expirationDate
      })

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.html).toContain(expirationDate)
      expect(callArg.text).toContain(expirationDate)
    })
  })

  describe('📧 sendInvoiceEmail - 发票邮件', () => {
    it('✅ 应该成功发送发票邮件', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-invoice',
            email: 'invoice@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendInvoiceEmail({
        userId: 'user-invoice',
        planName: 'Max',
        amount: '$99.99',
        invoiceNumber: 'INV-20251201-12345678',
        invoiceDate: '2025年12月1日',
        billingCycle: 'monthly'
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('invoice@example.com')

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.subject).toContain('发票')
      expect(callArg.subject).toContain('INV-20251201-12345678')
      expect(callArg.html).toContain('Max')
      expect(callArg.html).toContain('$99.99')
      expect(callArg.html).toContain('INV-20251201-12345678')
      expect(callArg.html).toContain('2025年12月1日')
    })

    it('✅ 应该正确显示年度订阅', async () => {
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

      await sendInvoiceEmail({
        userId: 'user-123',
        planName: 'Pro',
        amount: '$249.00',
        invoiceNumber: 'INV-20251201-99999999',
        invoiceDate: '2025年12月1日',
        billingCycle: 'yearly'
      })

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.html).toContain('Pro')
      expect(callArg.html).toContain('年度订阅')
      expect(callArg.html).toContain('$249.00')
    })
  })

  describe('📧 sendPaymentFailureEmail - 支付失败通知', () => {
    it('✅ 应该成功发送支付失败通知邮件', async () => {
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-fail',
            email: 'failed@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {}
          }
        },
        error: null
      })

      const result = await sendPaymentFailureEmail({
        userId: 'user-fail',
        planName: 'Pro',
        failureReason: '信用卡余额不足',
        retryDate: '2025年12月4日'
      })

      expect(result.success).toBe(true)
      expect(result.email).toBe('failed@example.com')

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.subject).toContain('支付失败')
      expect(callArg.subject).toContain('Pro')
      expect(callArg.html).toContain('信用卡余额不足')
      expect(callArg.html).toContain('2025年12月4日')
      expect(callArg.html).toContain('自动重试时间')
    })

    it('✅ 应该包含失败原因和重试日期', async () => {
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

      const failureReason = 'Payment gateway timeout'
      const retryDate = '2025年12月5日'

      await sendPaymentFailureEmail({
        userId: 'user-123',
        planName: 'Basic',
        failureReason,
        retryDate
      })

      const callArg = mockSend.mock.calls[0][0]
      expect(callArg.html).toContain(failureReason)
      expect(callArg.html).toContain(retryDate)
      expect(callArg.text).toContain(failureReason)
      expect(callArg.text).toContain(retryDate)
    })
  })

  describe('🎯 边界情况测试', () => {
    it('✅ 应该处理测试环境（Resend未配置）', async () => {
      // 🔥 模拟测试环境
      process.env.NODE_ENV = 'test'
      delete process.env.RESEND_API_KEY

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

      const result = await sendWelcomeEmail({
        userId: 'user-123',
        planName: 'Basic',
        planPrice: '$9.99/月',
        billingCycle: 'monthly'
      })

      // 🔥 测试环境下，即使Resend未配置也应该返回成功（模拟发送）
      expect(result.success).toBe(true)
      expect(result.email).toBe('test@example.com')
    })

    it('✅ 应该正确处理异常情况', async () => {
      mockGetUserById.mockRejectedValue(new Error('Database connection failed'))

      const result = await sendWelcomeEmail({
        userId: 'user-error',
        planName: 'Pro',
        planPrice: '$24.99/月',
        billingCycle: 'monthly'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })

  describe('📧 邮件内容生成测试', () => {
    it('✅ 欢迎邮件应该包含所有必需的HTML元素', async () => {
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

      await sendWelcomeEmail({
        userId: 'user-123',
        planName: 'Max',
        planPrice: '$999/年',
        billingCycle: 'yearly'
      })

      const callArg = mockSend.mock.calls[0][0]
      const html = callArg.html as string

      // 验证关键HTML元素
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('欢迎') // 中文Header
      expect(html).toContain('Welcome') // 英文Header
      expect(html).toContain('Max') // 计划名称
      expect(html).toContain('$999/年') // 价格
      expect(html).toContain('年度订阅') // 计费周期
      expect(html).toContain('https://nanobanana.app/editor') // 行动按钮链接
      expect(html).toContain('Nano Banana') // 品牌名称
      expect(html).toContain('🍌') // Emoji
    })

    it('✅ 取消邮件应该包含正确的文本内容', async () => {
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

      await sendCancellationEmail({
        userId: 'user-123',
        planName: 'Pro',
        expirationDate: '2025年2月1日'
      })

      const callArg = mockSend.mock.calls[0][0]
      const text = callArg.text as string

      // 验证纯文本版本
      expect(text).toContain('Pro')
      expect(text).toContain('2025年2月1日')
      expect(text).toContain('订阅已取消')
      expect(text).not.toContain('<html>') // 不应包含HTML标签
    })
  })
})
