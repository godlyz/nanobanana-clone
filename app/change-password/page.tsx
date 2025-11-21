/**
 * 🔥 老王的修改密码页面
 * 用途: 已登录用户通过邮箱验证码修改密码
 * 老王警告: 这个是给已登录用户用的，必须验证旧密码和邮箱验证码！
 */

"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import { Turnstile } from "@/components/turnstile"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react"

export default function ChangePasswordPage() {
  const { t } = useLanguage()
  const router = useRouter()

  // 用户信息
  const [userEmail, setUserEmail] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  // 表单状态
  const [formData, setFormData] = useState({
    oldPassword: "",
    verificationCode: "",
    newPassword: ""
  })

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [requiresOldPassword, setRequiresOldPassword] = useState(true)
  const [oldPasswordVerified, setOldPasswordVerified] = useState(false)

  // 验证码倒计时
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  /**
   * 🔥 检查登录状态
   */
  useEffect(() => {
    let isMounted = true

    const ensureSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!response.ok) {
          router.push('/login?redirect=/change-password')
          return
        }

        const data = await response.json()
        const sessionToken = data.session?.token ?? null
        const expiresAt = data.session?.expiresAt ?? null
        const hasPassword = data.session?.hasPassword ?? true
        const user = data.user ?? null

        if (!sessionToken || !user) {
          router.push('/login?redirect=/change-password')
          return
        }

        localStorage.setItem('session_token', sessionToken)
        if (expiresAt) {
          localStorage.setItem('session_expires_at', expiresAt)
        }
        localStorage.setItem('user_info', JSON.stringify(user))
        localStorage.setItem('user_has_password', String(hasPassword))

        if (isMounted) {
          setUserEmail(user.email || '')
          setIsLoggedIn(true)
          setRequiresOldPassword(hasPassword)
          setOldPasswordVerified(!hasPassword)
        }
      } catch (error) {
        console.error('❌ 获取会话失败:', error)
        router.push('/login?redirect=/change-password')
      }
    }

    ensureSession()

    return () => {
      isMounted = false
    }
  }, [router])

  /**
   * 🔥 处理输入变化
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'oldPassword') {
      setOldPasswordVerified(false)
    }
    setError(null)
  }

  /**
   * 🔥 发送邮箱验证码
   */
  const handleSendCode = async () => {
    try {
      if (!userEmail) {
        setError('用户邮箱未找到，请重新登录')
        return
      }

      // 检查Turnstile
      if (!turnstileToken) {
        setError('请完成图形验证')
        return
      }

      setIsSendingCode(true)
      setError(null)

      console.log('📧 发送验证码到:', userEmail)

      // 获取会话Token
      const sessionToken = localStorage.getItem('session_token')

      if (requiresOldPassword) {
        if (!formData.oldPassword) {
          setError('请先输入当前密码')
          setIsSendingCode(false)
          return
        }

        if (!sessionToken) {
          setError('会话已失效，请重新登录')
          setIsSendingCode(false)
          return
        }

        if (!oldPasswordVerified) {
          console.log('🔒 验证当前密码...')
          const verifyResponse = await fetch('/api/auth/verify-old-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
              sessionToken,
              oldPassword: formData.oldPassword
            })
          })

          const verifyData = await verifyResponse.json().catch(() => ({}))

          if (!verifyResponse.ok) {
            console.warn('❌ 当前密码验证失败')
            setError(verifyData.error || '当前密码验证失败')
            setIsSendingCode(false)
            return
          }

          console.log('✅ 当前密码验证通过')
          setOldPasswordVerified(true)
        }
      }

      if (!sessionToken) {
        setError('会话已失效，请重新登录')
        setIsSendingCode(false)
        return
      }

      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          email: userEmail,
          purpose: 'change_password',
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
   * 🔥 处理密码修改提交
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // 验证必填字段
    if ((requiresOldPassword && !formData.oldPassword) || !formData.verificationCode || !formData.newPassword) {
      setError('请填写所有必填字段')
      return
    }

    // 验证新密码强度
    if (formData.newPassword.length < 8) {
      setError('新密码长度至少8位')
      return
    }

    const hasUppercase = /[A-Z]/.test(formData.newPassword)
    const hasLowercase = /[a-z]/.test(formData.newPassword)
    const hasNumber = /[0-9]/.test(formData.newPassword)
    const hasSpecial = /[^A-Za-z0-9]/.test(formData.newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('新密码必须包含大写字母、小写字母、数字和特殊字符')
      return
    }

    // 检查新旧密码是否相同
    if (requiresOldPassword && formData.oldPassword === formData.newPassword) {
      setError('新密码不能与旧密码相同')
      return
    }

    // 检查Turnstile
    if (!turnstileToken) {
      setError('请完成图形验证')
      return
    }

    try {
      setIsLoading(true)

      console.log('🔐 提交密码修改...')

      const passwordCheckResponse = await fetch('/api/security/password-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.newPassword })
      })

      if (!passwordCheckResponse.ok) {
        const passwordCheckResult = await passwordCheckResponse.json().catch(() => ({}))
        setError(passwordCheckResult.message || '新密码存在安全风险，请更换更强的密码')
        setIsLoading(false)
        return
      }

      // 获取会话Token
      let sessionToken = localStorage.getItem('session_token')

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          sessionToken,
          oldPassword: requiresOldPassword ? formData.oldPassword : undefined,
          newPassword: formData.newPassword,
          verificationCode: formData.verificationCode,
          turnstileToken
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '密码修改失败')
        setIsLoading(false)
        return
      }

      // 密码修改成功
      console.log('🎉 密码修改成功!')
      setSuccess('密码修改成功！即将跳转到登录页面...')

      // 删除本地会话
      localStorage.removeItem('session_token')
      localStorage.removeItem('session_expires_at')
      localStorage.removeItem('user_info')
      localStorage.removeItem('user_has_password')

      if (typeof window !== 'undefined') {
        window.location.assign('/login?message=password-changed')
      }

    } catch (error) {
      console.error('❌ 密码修改异常:', error)
      setError('密码修改失败，请稍后重试')
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

  // 未登录时显示加载
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
                修改密码
              </h1>
              <p className="text-muted-foreground">
                通过邮箱验证码修改您的密码
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userEmail}</span>
              </div>
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

            {/* 修改密码表单 */}
            <form onSubmit={handleChangePassword} className="space-y-4">
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

              {/* 旧密码 */}
              {requiresOldPassword && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    当前密码 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="请输入当前密码"
                    value={formData.oldPassword}
                    onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <p className="text-xs mt-1 text-muted-foreground">
                    {oldPasswordVerified ? '✅ 当前密码验证通过，可发送验证码' : '请输入当前密码，系统会先验证后再发送验证码'}
                  </p>
                </div>
              )}

              {/* 发送验证码 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  邮箱验证码 <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={isSendingCode || codeSent || isLoading || !turnstileToken || (requiresOldPassword && !formData.oldPassword)}
                    className="w-full"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        发送中...
                      </>
                    ) : codeSent ? (
                      `${countdown}秒后可重发`
                    ) : (
                      '发送验证码'
                    )}
                  </Button>
                </div>
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
                <p className="text-xs text-muted-foreground mt-1">
                  验证码将发送到 {userEmail}，有效期15分钟
                </p>
              </div>

              {/* 新密码 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {requiresOldPassword ? '新密码' : '设置密码'} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="至少8位，包含大小写字母、数字和特殊字符"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  新密码必须至少8位，包含大写字母、小写字母、数字和特殊字符{requiresOldPassword ? '，且不能与旧密码相同' : ''}
                </p>
              </div>

              {/* 修改密码按钮 */}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading || !turnstileToken}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    修改中...
                  </>
                ) : (
                  '确认修改'
                )}
              </Button>
            </form>

            {/* 安全提示 */}
            <div className="mt-4 p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">
                🔒 安全提示：修改密码后，所有已登录的设备会话将被清除，需要使用新密码重新登录
              </p>
            </div>

            {/* 返回个人中心链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                不想修改了？{" "}
                <Link href="/profile" className="text-primary hover:underline font-medium">
                  返回个人中心
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
