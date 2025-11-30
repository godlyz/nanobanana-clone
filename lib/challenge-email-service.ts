/**
 * 🔥 老王的挑战邮件通知系统
 * 用途: 挑战获奖邮件发送
 * 老王警告: 这个模块直接复用Resend配置，别tm重复造轮子！
 */

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

// 复用现有的Resend客户端
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
    console.error(`❌ 获取用户邮箱异常: ${userId}`, error)
    return null
  }
}

/**
 * 生成挑战获奖邮件内容
 */
function generateChallengePrizeEmailContent(params: {
  userName: string;
  challengeTitle: string;
  rank: number;
  credits: number;
}): { subject: string; html: string; text: string } {
  const subject = `🏆 恭喜您在"${params.challengeTitle}"挑战中获得第${params.rank}名！`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .prize-box { background: white; border: 2px solid #f39c12; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .prize-info { font-size: 24px; font-weight: bold; color: #e74c3c; margin: 15px 0; }
    .action-button { background: #f39c12; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #e67e22; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
    .emoji { font-size: 1.2em; }
    .rank-badge { background: #f39c12; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="emoji">🏆</span> 恭喜获奖！Congratulations!</h1>
      <p>您在挑战中表现出色 / You performed excellently in the challenge</p>
    </div>
    <div class="content">
      <p>亲爱的 <strong>${params.userName}</strong>，</p>
      <p>您在挑战 <strong>"${params.challengeTitle}"</strong> 中获得了优异的成绩！</p>

      <div class="prize-box">
        <h3><span class="emoji">🎁</span> 您的奖品 / Your Prize</h3>
        <div class="rank-badge">第 ${params.rank} 名</div>
        <div class="prize-info">
          ${params.credits} 积分 / ${params.credits} Credits
        </div>
        <p>积分已自动添加到您的账户，可用于创作更多精彩作品！</p>
      </div>

      <p>再次感谢您的参与，期待您在未来的挑战中创造更多惊喜！</p>
      <p>Thank you for your participation. We look forward to your future creations!</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nanobanana.app/challenges" class="action-button">
          查看更多挑战 / View More Challenges
        </a>
      </div>

      <div class="footer">
        <p>© 2025 Nano Banana. All rights reserved.</p>
        <p><span class="emoji">🍌</span> 用AI创造无限可能 / Create infinitely with AI</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `🏆 恭喜您在"${params.challengeTitle}"挑战中获得第${params.rank}名！

🎁 您的奖品：${params.credits} 积分
积分已自动添加到您的账户，可用于创作更多精彩作品！

感谢您的参与，期待您在未来的挑战中创造更多惊喜！

🍌 Nano Banana - 用AI创造无限可能`

  return { subject, html, text }
}

/**
 * 邮件发送结果接口
 */
export interface EmailResult {
  success: boolean
  error?: string
  email?: string
  challengeTitle?: string
}

/**
 * 🔥 发送挑战获奖邮件
 */
export async function sendChallengePrizeEmail(params: {
  userId: string;
  challengeId: string;
  challengeTitle: string;
  rank: number;
  credits: number;
}): Promise<EmailResult> {
  const startTime = Date.now()

  try {
    console.log(`📧 [邮件服务] 准备发送挑战获奖邮件: 用户 ${params.userId}`)

    // 1. 获取用户邮箱
    const userEmail = await getUserEmail(params.userId)
    if (!userEmail) {
      const errorMsg = '无法获取用户邮箱'
      console.error(`❌ [邮件服务] ${errorMsg}: 用户 ${params.userId}`)
      return {
        success: false,
        error: errorMsg
      }
    }

    console.log(`📧 [邮件服务] 用户邮箱获取成功: ${userEmail}`)

    // 2. 获取Resend客户端
    const resend = getResendClient()
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [邮件服务] 开发模式：Resend未配置，跳过邮件发送')
        console.log(`📧 [模拟邮件] 收件人: ${userEmail}`)
        console.log(`📧 [模拟邮件] 内容: 用户在挑战 "${params.challengeTitle}" 获得第${params.rank}名，获得${params.credits}积分`)
        return {
          success: true,
          email: userEmail,
          challengeTitle: params.challengeTitle
        }
      } else {
        const errorMsg = '邮件服务未配置'
        console.error(`❌ [邮件服务] ${errorMsg}`)
        return {
          success: false,
          error: errorMsg
        }
      }
    }

    // 3. 生成邮件内容
    const { subject, html, text } = generateChallengePrizeEmailContent({
      userName: userEmail.split('@')[0], // 使用邮箱前缀作为用户名
      challengeTitle: params.challengeTitle,
      rank: params.rank,
      credits: params.credits
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
      console.error('❌ [邮件服务] 发送挑战获奖邮件失败:', emailError)
      return {
        success: false,
        error: emailError.message || '邮件发送失败',
        email: userEmail
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [邮件服务] 挑战获奖邮件已发送: ${userEmail} (耗时: ${duration}ms)`)

    return {
      success: true,
      email: userEmail,
      challengeTitle: params.challengeTitle
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ [邮件服务] 发送挑战获奖邮件异常 (耗时: ${duration}ms):`, error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 🔥 批量发送挑战获奖邮件
 * 用于处理多个获奖者的情况，避免并发过高
 */
export async function sendBatchChallengePrizeEmails(
  prizeList: Array<{
    userId: string;
    challengeId: string;
    challengeTitle: string;
    rank: number;
    credits: number;
  }>,
  concurrency: number = 5
): Promise<{ total: number; success: number; failed: number; errors: string[] }> {
  const results = {
    total: prizeList.length,
    success: 0,
    failed: 0,
    errors: [] as string[]
  }

  console.log(`📧 [邮件服务] 开始批量发送 ${prizeList.length} 封获奖邮件 (并发数: ${concurrency})`)

  // 分批处理，控制并发数量
  for (let i = 0; i < prizeList.length; i += concurrency) {
    const batch = prizeList.slice(i, i + concurrency)

    const promises = batch.map(async (prize) => {
      const result = await sendChallengePrizeEmail(prize)

      if (result.success) {
        results.success++
      } else {
        results.failed++
        results.errors.push(`用户 ${prize.userId}: ${result.error}`)
      }

      return result
    })

    await Promise.allSettled(promises)

    // 批次间隔，避免触发频率限制
    if (i + concurrency < prizeList.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    }
  }

  console.log(`📧 [邮件服务] 批量发送完成: 成功 ${results.success}/${results.total}, 失败 ${results.failed}`)

  return results
}
