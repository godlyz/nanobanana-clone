/**
 * 🔥 老王的忘记密码页面
 * 用途: 通过邮箱验证码重置密码
 * 老王警告: 重置密码流程要严格，别tm让人随便改密码！
 */

"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import { Turnstile } from "@/components/turnstile"
import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const router = useRouter()

  // 表单状态
  const [formData, setFormData] = useState({
    email: "",
    verificationCode: "",
    newPassword: ""
  })

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>("")

  // 验证码倒计时
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  /**
   * 🔥 处理输入变化
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  /**
   * 🔥 发送邮箱验证码
   */
  const handleSendCode = async () => {
    try {
      // 验证邮箱格式
      if (!formData.email) {
        setError('请输入邮箱地址')
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('邮箱格式无效')
        return
      }

      // 检查Turnstile
      if (!turnstileToken) {
        setError('请完成图形验证')
        return
      }

      setIsSendingCode(true)
      setError(null)

      console.log('📧 发送验证码到:', formData.email)

      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          purpose: 'reset_password',
          turnstileToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '发送验证码失败')
        setIsSendingCode(false)
        return
      }

      // 开发环境显示验证码
      if (data.code) {
        console.log('🔑 验证码（开发模式）:', data.code)
        setSuccess(`验证码已发送！（开发模式：${data.code}）`)
      } else {
        setSuccess('验证码已发送，请查收邮件')
      }

      // 开始倒计时
      setCodeSent(true)
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setCodeSent(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setIsSendingCode(false)
    } catch (error) {
      console.error('❌ 发送验证码异常:', error)
      setError('发送验证码失败，请稍后重试')
      setIsSendingCode(false)
    }
  }

  /**
   * 🔥 处理密码重置提交
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // 验证必填字段
    if (!formData.email || !formData.verificationCode || !formData.newPassword) {
      setError('请填写所有必填字段')
      return
    }

    // 验证密码强度
    if (formData.newPassword.length < 8) {
      setError('密码长度至少8位')
      return
    }

    const hasLetter = /[a-zA-Z]/.test(formData.newPassword)
    const hasNumber = /[0-9]/.test(formData.newPassword)

    if (!hasLetter || !hasNumber) {
      setError('密码必须包含字母和数字')
      return
    }

    // 检查Turnstile
    if (!turnstileToken) {
      setError('请完成图形验证')
      return
    }

    try {
      setIsLoading(true)

      console.log('🔐 提交密码重置...')

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          verificationCode: formData.verificationCode,
          newPassword: formData.newPassword,
          turnstileToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '密码重置失败')
        setIsLoading(false)
        return
      }

      // 密码重置成功
      console.log('🎉 密码重置成功!')
      setSuccess('密码重置成功！即将跳转到登录页面...')

      // 2秒后跳转到登录页面
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (error) {
      console.error('❌ 密码重置异常:', error)
      setError('密码重置失败，请稍后重试')
      setIsLoading(false)
    }
  }

  /**
   * 🔥 Turnstile验证成功回调
   */
  const handleTurnstileVerify = useCallback((token: string) => {
    console.log('✅ Turnstile验证成功')
    setTurnstileToken(token)
  }, [])

  /**
   * 🔥 Turnstile验证失败回调
   */
  const handleTurnstileError = useCallback(() => {
    console.error('❌ Turnstile验证失败')
    setError('图形验证失败，请刷新页面重试')
    setTurnstileToken('')
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card className="p-8">
            {/* 页面标题 */}
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🍌</div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                重置密码
              </h1>
              <p className="text-muted-foreground">
                通过邮箱验证码重置您的密码
              </p>
            </div>

            {/* 错误消息 */}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 成功消息 */}
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* 重置密码表单 */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Turnstile图形验证码（第一步） */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  图形验证 <span className="text-destructive">*</span>
                </label>
                <Turnstile
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                  className="flex justify-center"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  👆 请先完成图形验证，才能发送邮箱验证码
                </p>
              </div>

              {/* 邮箱地址（第二步） */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  邮箱地址 <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    disabled={isLoading || !turnstileToken}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={isSendingCode || codeSent || isLoading || !formData.email || !turnstileToken}
                    className="w-32"
                  >
                    {isSendingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : codeSent ? (
                      `${countdown}秒`
                    ) : (
                      '发送验证码'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  验证码将发送到此邮箱，有效期15分钟
                </p>
              </div>

              {/* 邮箱验证码 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  邮箱验证码 <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="请输入6位验证码"
                  value={formData.verificationCode}
                  onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                  required
                  disabled={isLoading}
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
              </div>

              {/* 新密码 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  新密码 <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="至少8位，包含字母和数字"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  密码必须至少8位，包含字母和数字
                </p>
              </div>

              {/* 重置密码按钮 */}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading || !turnstileToken}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重置中...
                  </>
                ) : (
                  '重置密码'
                )}
              </Button>
            </form>

            {/* 安全提示 */}
            <div className="mt-4 p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">
                💡 提示：重置密码后，所有已登录的设备会话将被清除，需要重新登录
              </p>
            </div>

            {/* 返回登录链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                记起密码了？{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  返回登录
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
