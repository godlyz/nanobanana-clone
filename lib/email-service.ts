/**
 * 🔥 老王的通用邮件服务
 * 用途: 订阅相关邮件发送（欢迎、取消、发票、支付失败）
 * 老王警告: 这个模块复用Resend配置和Phase 4邮件架构，保持DRY原则！
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

// 复用现有的Resend客户端（单例模式）
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.warn('⚠️ Resend API未配置，邮件发送功能将被禁用')
    return null
  }

  try {
    resendClient = new Resend(apiKey)
    console.log('✅ Resend客户端已初始化')
    return resendClient
  } catch (error) {
    console.error('❌ Resend客户端初始化失败:', error)
    return null
  }
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'noreply@nanobanana.app'
}

/**
 * 获取用户邮箱（从auth.users表）
 * 复用challenge-email-service.ts的实现
 * 🔥 老王修改：异常场景下抛出原始异常，而不是返回null
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error) {
      console.error(`❌ 获取用户邮箱失败: ${userId}`, error)
      return null
    }

    return data?.user?.email || null
  } catch (error) {
    // 🔥 老王修改：不吞掉异常，直接抛出原始错误
    console.error(`❌ 获取用户邮箱异常: ${userId}`, error)
    throw error // 让调用方的catch块处理原始异常
  }
}

/**
 * 邮件发送结果接口
 */
export interface EmailResult {
  success: boolean
  error?: string
  email?: string
}

// ============================================================
// 📧 邮件模板 1: 欢迎邮件（订阅成功）
// ============================================================

function generateWelcomeEmailContent(params: {
  userName: string
  planName: string
  planPrice: string
  billingCycle: 'monthly' | 'yearly'
}): { subject: string; html: string; text: string } {
  const subject = `🎉 欢迎加入 Nano Banana ${params.planName} 计划！`

  const billingCycleText = params.billingCycle === 'monthly' ? '月度订阅' : '年度订阅'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .plan-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .plan-name { font-size: 28px; font-weight: bold; color: #764ba2; margin: 10px 0; }
    .plan-price { font-size: 20px; color: #667eea; margin: 10px 0; }
    .action-button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #764ba2; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .emoji { font-size: 1.2em; }
    .feature-list { text-align: left; padding: 0 20px; }
    .feature-item { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="emoji">🎉</span> 欢迎加入 Nano Banana！Welcome!</h1>
      <p>感谢您订阅我们的服务 / Thank you for subscribing</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${params.userName}</strong>，</p>
      <p>您已成功订阅 Nano Banana <strong>${params.planName}</strong> 计划！</p>

      <div class="plan-box">
        <h3><span class="emoji">💎</span> 您的订阅详情 / Subscription Details</h3>
        <div class="plan-name">${params.planName}</div>
        <div class="plan-price">${params.planPrice} / ${billingCycleText}</div>
        <div class="feature-list">
          <div class="feature-item">✅ AI 图像编辑功能</div>
          <div class="feature-item">✅ 高级特效和滤镜</div>
          <div class="feature-item">✅ 优先客户支持</div>
        </div>
      </div>

      <p>现在您可以开始使用所有强大的 AI 功能，创作出令人惊艳的作品！</p>
      <p>Now you can start using all powerful AI features to create amazing works!</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nanobanana.app/editor" class="action-button">
          开始创作 / Start Creating
        </a>
      </div>

      <div class="footer">
        <p>如有任何问题，请随时联系我们的支持团队</p>
        <p>If you have any questions, feel free to contact our support team</p>
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p><span class="emoji">🍌</span> 用AI创造无限可能 / Create infinitely with AI</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `🎉 欢迎加入 Nano Banana ${params.planName} 计划！

您已成功订阅！

订阅详情：
- 计划: ${params.planName}
- 价格: ${params.planPrice} / ${billingCycleText}
- 功能: AI 图像编辑、高级特效、优先客户支持

现在您可以开始使用所有强大的 AI 功能，创作出令人惊艳的作品！

🍌 Nano Banana - 用AI创造无限可能
访问 https://nanobanana.app/editor 开始创作`

  return { subject, html, text }
}

/**
 * 🔥 发送欢迎邮件
 */
export async function sendWelcomeEmail(params: {
  userId: string
  planName: string
  planPrice: string
  billingCycle: 'monthly' | 'yearly'
}): Promise<EmailResult> {
  const startTime = Date.now()

  try {
    console.log(`📧 [邮件服务] 准备发送欢迎邮件: 用户 ${params.userId}`)

    // 1. 获取用户邮箱
    const userEmail = await getUserEmail(params.userId)
    if (!userEmail) {
      const errorMsg = '无法获取用户邮箱'
      console.error(`❌ [邮件服务] ${errorMsg}: 用户 ${params.userId}`)
      return { success: false, error: errorMsg }
    }

    console.log(`📧 [邮件服务] 用户邮箱获取成功: ${userEmail}`)

    // 2. 获取Resend客户端
    const resend = getResendClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [邮件服务] 开发模式：Resend未配置，跳过邮件发送')
        console.log(`📧 [模拟邮件] 欢迎邮件 -> ${userEmail} (计划: ${params.planName})`)
        return { success: true, email: userEmail }
      } else {
        const errorMsg = '邮件服务未配置'
        console.error(`❌ [邮件服务] ${errorMsg}`)
        return { success: false, error: errorMsg }
      }
    }

    // 3. 生成邮件内容
    const { subject, html, text } = generateWelcomeEmailContent({
      userName: userEmail.split('@')[0],
      planName: params.planName,
      planPrice: params.planPrice,
      billingCycle: params.billingCycle
    })

    // 4. 发送邮件
    const fromEmail = getFromEmail()
    const { error: emailError } = await resend.emails.send({
      from: `Nano Banana <${fromEmail}>`,
      to: userEmail,
      subject,
      html,
      text
    })

    if (emailError) {
      console.error('❌ [邮件服务] 发送欢迎邮件失败:', emailError)
      return {
        success: false,
        error: emailError.message || '邮件发送失败',
        email: userEmail
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [邮件服务] 欢迎邮件已发送: ${userEmail} (耗时: ${duration}ms)`)

    return { success: true, email: userEmail }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [邮件服务] 发送欢迎邮件异常 (耗时: ${duration}ms):`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// ============================================================
// 📧 邮件模板 2: 取消确认邮件
// ============================================================

function generateCancellationEmailContent(params: {
  userName: string
  planName: string
  expirationDate: string
}): { subject: string; html: string; text: string } {
  const subject = `😢 您的 ${params.planName} 订阅已取消`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .action-button { background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #f093fb; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="emoji">😢</span> 订阅已取消 / Subscription Cancelled</h1>
      <p>我们很遗憾看到您离开 / We're sorry to see you go</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${params.userName}</strong>，</p>
      <p>您的 <strong>${params.planName}</strong> 订阅已成功取消。</p>

      <div class="info-box">
        <h3><span class="emoji">📅</span> 重要信息 / Important Information</h3>
        <p><strong>服务有效期至：</strong> ${params.expirationDate}</p>
        <p>在此日期前，您仍可继续使用所有订阅功能。</p>
        <p>Before this date, you can still use all subscription features.</p>
      </div>

      <p>如果您改变主意，随时欢迎您回来！我们会为您保留账户数据。</p>
      <p>If you change your mind, you're always welcome back! We'll keep your account data.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nanobanana.app/pricing" class="action-button">
          重新订阅 / Resubscribe
        </a>
      </div>

      <div class="footer">
        <p>如有任何问题，请随时联系我们的支持团队</p>
        <p>If you have any questions, feel free to contact our support team</p>
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p><span class="emoji">🍌</span> 用AI创造无限可能 / Create infinitely with AI</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `😢 您的 ${params.planName} 订阅已取消

您的订阅已成功取消。

重要信息：
- 服务有效期至：${params.expirationDate}
- 在此日期前，您仍可继续使用所有订阅功能

如果您改变主意，随时欢迎您回来！我们会为您保留账户数据。

🍌 Nano Banana - 用AI创造无限可能
访问 https://nanobanana.app/pricing 重新订阅`

  return { subject, html, text }
}

/**
 * 🔥 发送取消确认邮件
 */
export async function sendCancellationEmail(params: {
  userId: string
  planName: string
  expirationDate: string
}): Promise<EmailResult> {
  const startTime = Date.now()

  try {
    console.log(`📧 [邮件服务] 准备发送取消确认邮件: 用户 ${params.userId}`)

    // 1. 获取用户邮箱
    const userEmail = await getUserEmail(params.userId)
    if (!userEmail) {
      const errorMsg = '无法获取用户邮箱'
      console.error(`❌ [邮件服务] ${errorMsg}: 用户 ${params.userId}`)
      return { success: false, error: errorMsg }
    }

    // 2. 获取Resend客户端
    const resend = getResendClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [邮件服务] 开发模式：Resend未配置，跳过邮件发送')
        console.log(`📧 [模拟邮件] 取消确认邮件 -> ${userEmail}`)
        return { success: true, email: userEmail }
      } else {
        return { success: false, error: '邮件服务未配置' }
      }
    }

    // 3. 生成邮件内容
    const { subject, html, text } = generateCancellationEmailContent({
      userName: userEmail.split('@')[0],
      planName: params.planName,
      expirationDate: params.expirationDate
    })

    // 4. 发送邮件
    const fromEmail = getFromEmail()
    const { error: emailError } = await resend.emails.send({
      from: `Nano Banana <${fromEmail}>`,
      to: userEmail,
      subject,
      html,
      text
    })

    if (emailError) {
      console.error('❌ [邮件服务] 发送取消确认邮件失败:', emailError)
      return {
        success: false,
        error: emailError.message || '邮件发送失败',
        email: userEmail
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [邮件服务] 取消确认邮件已发送: ${userEmail} (耗时: ${duration}ms)`)

    return { success: true, email: userEmail }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [邮件服务] 发送取消确认邮件异常 (耗时: ${duration}ms):`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// ============================================================
// 📧 邮件模板 3: 发票生成邮件
// ============================================================

function generateInvoiceEmailContent(params: {
  userName: string
  planName: string
  amount: string
  invoiceNumber: string
  invoiceDate: string
  billingCycle: 'monthly' | 'yearly'
}): { subject: string; html: string; text: string } {
  const subject = `🧾 您的 Nano Banana 发票 #${params.invoiceNumber}`

  const billingCycleText = params.billingCycle === 'monthly' ? '月度订阅' : '年度订阅'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .invoice-box { background: white; border: 2px solid #4facfe; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .invoice-total { font-size: 20px; font-weight: bold; color: #00f2fe; margin-top: 15px; }
    .action-button { background: #4facfe; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #00f2fe; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="emoji">🧾</span> 发票 / Invoice</h1>
      <p>感谢您的订阅 / Thank you for your subscription</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${params.userName}</strong>，</p>
      <p>您的订阅已成功续费，以下是您的发票详情：</p>

      <div class="invoice-box">
        <h3><span class="emoji">📄</span> 发票详情 / Invoice Details</h3>
        <div class="invoice-row">
          <span>发票号码 / Invoice Number:</span>
          <strong>${params.invoiceNumber}</strong>
        </div>
        <div class="invoice-row">
          <span>日期 / Date:</span>
          <strong>${params.invoiceDate}</strong>
        </div>
        <div class="invoice-row">
          <span>项目 / Item:</span>
          <strong>${params.planName} - ${billingCycleText}</strong>
        </div>
        <div class="invoice-total">
          <div class="invoice-row" style="border-bottom: none;">
            <span>总计 / Total:</span>
            <strong style="color: #00f2fe;">${params.amount}</strong>
          </div>
        </div>
      </div>

      <p>发票记录已保存到您的账户，您可以随时下载。</p>
      <p>The invoice has been saved to your account and can be downloaded anytime.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nanobanana.app/account/billing" class="action-button">
          查看所有发票 / View All Invoices
        </a>
      </div>

      <div class="footer">
        <p>如有任何问题，请随时联系我们的支持团队</p>
        <p>If you have any questions, feel free to contact our support team</p>
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p><span class="emoji">🍌</span> 用AI创造无限可能 / Create infinitely with AI</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `🧾 您的 Nano Banana 发票 #${params.invoiceNumber}

发票详情：
- 发票号码: ${params.invoiceNumber}
- 日期: ${params.invoiceDate}
- 项目: ${params.planName} - ${billingCycleText}
- 总计: ${params.amount}

发票记录已保存到您的账户，您可以随时下载。

🍌 Nano Banana - 用AI创造无限可能
访问 https://nanobanana.app/account/billing 查看所有发票`

  return { subject, html, text }
}

/**
 * 🔥 发送发票邮件
 */
export async function sendInvoiceEmail(params: {
  userId: string
  planName: string
  amount: string
  invoiceNumber: string
  invoiceDate: string
  billingCycle: 'monthly' | 'yearly'
}): Promise<EmailResult> {
  const startTime = Date.now()

  try {
    console.log(`📧 [邮件服务] 准备发送发票邮件: 用户 ${params.userId}`)

    // 1. 获取用户邮箱
    const userEmail = await getUserEmail(params.userId)
    if (!userEmail) {
      const errorMsg = '无法获取用户邮箱'
      console.error(`❌ [邮件服务] ${errorMsg}: 用户 ${params.userId}`)
      return { success: false, error: errorMsg }
    }

    // 2. 获取Resend客户端
    const resend = getResendClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [邮件服务] 开发模式：Resend未配置，跳过邮件发送')
        console.log(`📧 [模拟邮件] 发票邮件 -> ${userEmail} (发票号: ${params.invoiceNumber})`)
        return { success: true, email: userEmail }
      } else {
        return { success: false, error: '邮件服务未配置' }
      }
    }

    // 3. 生成邮件内容
    const { subject, html, text } = generateInvoiceEmailContent({
      userName: userEmail.split('@')[0],
      planName: params.planName,
      amount: params.amount,
      invoiceNumber: params.invoiceNumber,
      invoiceDate: params.invoiceDate,
      billingCycle: params.billingCycle
    })

    // 4. 发送邮件
    const fromEmail = getFromEmail()
    const { error: emailError } = await resend.emails.send({
      from: `Nano Banana <${fromEmail}>`,
      to: userEmail,
      subject,
      html,
      text
    })

    if (emailError) {
      console.error('❌ [邮件服务] 发送发票邮件失败:', emailError)
      return {
        success: false,
        error: emailError.message || '邮件发送失败',
        email: userEmail
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [邮件服务] 发票邮件已发送: ${userEmail} (耗时: ${duration}ms)`)

    return { success: true, email: userEmail }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [邮件服务] 发送发票邮件异常 (耗时: ${duration}ms):`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// ============================================================
// 📧 邮件模板 4: 支付失败通知邮件
// ============================================================

function generatePaymentFailureEmailContent(params: {
  userName: string
  planName: string
  failureReason: string
  retryDate: string
}): { subject: string; html: string; text: string } {
  const subject = `⚠️ 支付失败通知 - ${params.planName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning-box { background: #fff3cd; border: 2px solid #ff9a56; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .action-button { background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #ff9a56; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="emoji">⚠️</span> 支付失败通知 / Payment Failure Notification</h1>
      <p>需要您的关注 / Requires your attention</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${params.userName}</strong>，</p>
      <p>我们在处理您的 <strong>${params.planName}</strong> 订阅付款时遇到问题。</p>

      <div class="warning-box">
        <h3><span class="emoji">❌</span> 失败原因 / Failure Reason</h3>
        <p><strong>${params.failureReason}</strong></p>
        <p style="margin-top: 15px;">
          <strong>自动重试时间：</strong> ${params.retryDate}
        </p>
        <p>我们将在上述时间自动重试支付。为避免服务中断，请确保您的支付方式有效。</p>
        <p>We will automatically retry the payment at the above time. To avoid service interruption, please ensure your payment method is valid.</p>
      </div>

      <p><strong>如何解决：</strong></p>
      <ul>
        <li>检查您的支付方式余额是否充足</li>
        <li>确认信用卡未过期</li>
        <li>更新您的支付信息</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nanobanana.app/account/billing" class="action-button">
          更新支付方式 / Update Payment Method
        </a>
      </div>

      <div class="footer">
        <p>如有任何问题，请随时联系我们的支持团队</p>
        <p>If you have any questions, feel free to contact our support team</p>
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p><span class="emoji">🍌</span> 用AI创造无限可能 / Create infinitely with AI</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `⚠️ 支付失败通知 - ${params.planName}

我们在处理您的订阅付款时遇到问题。

失败原因：${params.failureReason}

自动重试时间：${params.retryDate}

如何解决：
- 检查您的支付方式余额是否充足
- 确认信用卡未过期
- 更新您的支付信息

🍌 Nano Banana - 用AI创造无限可能
访问 https://nanobanana.app/account/billing 更新支付方式`

  return { subject, html, text }
}

/**
 * 🔥 发送支付失败通知邮件
 */
export async function sendPaymentFailureEmail(params: {
  userId: string
  planName: string
  failureReason: string
  retryDate: string
}): Promise<EmailResult> {
  const startTime = Date.now()

  try {
    console.log(`📧 [邮件服务] 准备发送支付失败通知邮件: 用户 ${params.userId}`)

    // 1. 获取用户邮箱
    const userEmail = await getUserEmail(params.userId)
    if (!userEmail) {
      const errorMsg = '无法获取用户邮箱'
      console.error(`❌ [邮件服务] ${errorMsg}: 用户 ${params.userId}`)
      return { success: false, error: errorMsg }
    }

    // 2. 获取Resend客户端
    const resend = getResendClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [邮件服务] 开发模式：Resend未配置，跳过邮件发送')
        console.log(`📧 [模拟邮件] 支付失败通知邮件 -> ${userEmail} (原因: ${params.failureReason})`)
        return { success: true, email: userEmail }
      } else {
        return { success: false, error: '邮件服务未配置' }
      }
    }

    // 3. 生成邮件内容
    const { subject, html, text } = generatePaymentFailureEmailContent({
      userName: userEmail.split('@')[0],
      planName: params.planName,
      failureReason: params.failureReason,
      retryDate: params.retryDate
    })

    // 4. 发送邮件
    const fromEmail = getFromEmail()
    const { error: emailError } = await resend.emails.send({
      from: `Nano Banana <${fromEmail}>`,
      to: userEmail,
      subject,
      html,
      text
    })

    if (emailError) {
      console.error('❌ [邮件服务] 发送支付失败通知邮件失败:', emailError)
      return {
        success: false,
        error: emailError.message || '邮件发送失败',
        email: userEmail
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [邮件服务] 支付失败通知邮件已发送: ${userEmail} (耗时: ${duration}ms)`)

    return { success: true, email: userEmail }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [邮件服务] 发送支付失败通知邮件异常 (耗时: ${duration}ms):`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}
