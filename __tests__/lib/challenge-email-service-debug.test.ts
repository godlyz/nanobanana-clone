/**
 * 🔥 老王的Resend Mock调试测试
 * 目的：验证Resend mock是否正确工作
 */

import { describe, it, expect, vi } from 'vitest'

// 🔥 使用 vi.hoisted() 确保mockSend在hoisting之前定义
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mockSend
    }
  }
}))

// 导入Resend
import { Resend } from 'resend'

describe('🔥 Resend Mock调试测试', () => {
  it('✅ Resend构造函数应该可以被调用', () => {
    const resend = new Resend('test-api-key')
    expect(resend).toBeDefined()
    console.log('Resend实例:', resend)
  })

  it('✅ Resend实例应该有emails属性', () => {
    const resend = new Resend('test-api-key')
    expect(resend.emails).toBeDefined()
    console.log('resend.emails:', resend.emails)
  })

  it('✅ Resend.emails.send应该可以被调用', async () => {
    // 🔥 重新设置mockResolvedValue - 可能被清空了
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null })

    const resend = new Resend('test-api-key')
    expect(resend.emails.send).toBeDefined()

    console.log('调用前 mockSend.mock.calls:', mockSend.mock.calls)
    console.log('调用前 mockSend.mock.results:', mockSend.mock.results)
    console.log('调用前 mockSend是否有implementation:', mockSend.getMockImplementation())

    const result = await resend.emails.send({
      from: 'test@example.com',
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test'
    })

    console.log('调用后 result:', result)
    console.log('调用后 mockSend.mock.calls:', mockSend.mock.calls)
    console.log('调用后 mockSend.mock.results:', mockSend.mock.results)

    expect(mockSend).toHaveBeenCalled()
    expect(result).toEqual({ data: { id: 'test-id' }, error: null })
  })
})
