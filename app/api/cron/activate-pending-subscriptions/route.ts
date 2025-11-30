import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * 🔥 老王实现：定时任务 - 自动激活 pending 订阅
 *
 * GET/POST /api/cron/activate-pending-subscriptions
 *
 * 功能：
 * 1. 查询所有 status = 'pending' 且 activation_date <= NOW() 的订阅
 * 2. 将订阅状态改为 active
 * 3. 充值首月积分（或年付的第1个月积分）
 * 4. 如果是年付，还要充值赠送积分
 *
 * 使用场景：
 * - scheduled 模式的升级/降级订阅，在旧订阅到期后自动激活
 *
 * 调用方式：
 * - Vercel Cron: 配置在 vercel.json 中，每天运行一次
 * - 手动触发: curl -X POST http://localhost:3000/api/cron/activate-pending-subscriptions
 *
 * 安全：
 * - 生产环境：需要验证 Vercel Cron Secret (CRON_SECRET)
 * - 开发环境：允许直接调用
 */

export async function GET(request: NextRequest) {
  return handleCronJob(request)
}

export async function POST(request: NextRequest) {
  return handleCronJob(request)
}

async function handleCronJob(request: NextRequest) {
  try {
    // 🔥 安全验证（生产环境需要验证 Cron Secret）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('🔄 [Cron] 开始自动激活 pending 订阅...')

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // 1. 查询所有到期需要激活的 pending 订阅
    const { data: pendingSubs, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .lte('activation_date', now)  // 激活日期 <= 当前时间

    if (fetchError) {
      console.error('❌ [Cron] 查询 pending 订阅失败:', fetchError)
      return NextResponse.json(
        { success: false, error: '查询 pending 订阅失败', details: fetchError },
        { status: 500 }
      )
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      console.log('✅ [Cron] 没有需要激活的 pending 订阅')
      return NextResponse.json({
        success: true,
        message: '没有需要激活的 pending 订阅',
        activated: 0,
      })
    }

    console.log(`📋 [Cron] 找到 ${pendingSubs.length} 个需要激活的 pending 订阅`)

    // 导入服务和常量
    const { createCreditService } = await import('@/lib/credit-service')
    const {
      SUBSCRIPTION_MONTHLY_CREDITS,
      SUBSCRIPTION_YEARLY_ACTUAL_CREDITS
    } = await import('@/lib/credit-types')

    const creditService = await createCreditService(true)  // 使用 Service Role Client
    const results = []

    // 2. 遍历每个 pending 订阅，执行激活
    for (const sub of pendingSubs) {
      try {
        console.log(`⚡ [Cron] 激活 pending 订阅: ID=${sub.id}, 用户=${sub.user_id}, 套餐=${sub.plan_tier} ${sub.billing_cycle}`)

        const monthlyCredits = SUBSCRIPTION_MONTHLY_CREDITS[sub.plan_tier as keyof typeof SUBSCRIPTION_MONTHLY_CREDITS]

        // Step 1: 将状态改为 active
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            activated_at: now,
          })
          .eq('id', sub.id)

        if (updateError) {
          console.error(`❌ [Cron] 更新订阅状态失败 (订阅=${sub.id}):`, updateError)
          results.push({ subscriptionId: sub.id, status: 'error', error: updateError.message })
          continue
        }

        // Step 2: 充值首月积分（30天有效期）
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)  // 30天有效期

        await creditService.addCredits({
          user_id: sub.user_id,
          amount: monthlyCredits,
          transaction_type: 'subscription_refill',
          expires_at: expiresAt,
          related_entity_id: sub.id,
          description: `scheduled模式激活首月积分 - ${sub.plan_tier}套餐 (${monthlyCredits}积分，30天有效) / Scheduled activation first month credits - ${sub.plan_tier} plan (${monthlyCredits} credits, valid for 30 days)`,
        })

        console.log(`✅ [Cron] 首月积分充值成功: ${monthlyCredits}`)

        // Step 3: 如果是年付，充值赠送积分
        if (sub.billing_cycle === 'yearly') {
          const yearlyBonusCredits = SUBSCRIPTION_YEARLY_ACTUAL_CREDITS[sub.plan_tier as keyof typeof SUBSCRIPTION_YEARLY_ACTUAL_CREDITS] - (monthlyCredits * 12)

          if (yearlyBonusCredits > 0) {
            const bonusExpiresAt = new Date()
            bonusExpiresAt.setFullYear(bonusExpiresAt.getFullYear() + 1)  // 1年有效期

            await creditService.addCredits({
              user_id: sub.user_id,
              amount: yearlyBonusCredits,
              transaction_type: 'subscription_bonus',
              expires_at: bonusExpiresAt,
              related_entity_id: sub.id,
              description: `scheduled模式激活年付赠送积分 - ${sub.plan_tier}套餐 (${yearlyBonusCredits}积分，1年有效) / Scheduled activation yearly bonus - ${sub.plan_tier} plan (${yearlyBonusCredits} credits, valid for 1 year)`,
            })

            console.log(`🎁 [Cron] 年付赠送积分充值成功: ${yearlyBonusCredits}`)
          }

          // 更新未激活月份为 11（第1个月已激活）
          await supabase
            .from('user_subscriptions')
            .update({ unactivated_months: 11 })
            .eq('id', sub.id)
        } else {
          // 月付：更新未激活月份为 0
          await supabase
            .from('user_subscriptions')
            .update({ unactivated_months: 0 })
            .eq('id', sub.id)
        }

        console.log(`✅ [Cron] 订阅激活成功: ID=${sub.id}`)
        results.push({
          subscriptionId: sub.id,
          userId: sub.user_id,
          planTier: sub.plan_tier,
          billingCycle: sub.billing_cycle,
          status: 'activated',
          creditsAdded: monthlyCredits,
        })

      } catch (error) {
        console.error(`❌ [Cron] 处理 pending 订阅失败 (订阅=${sub.id}):`, error)
        results.push({
          subscriptionId: sub.id,
          status: 'error',
          error: error instanceof Error ? error.message : '未知错误',
        })
      }
    }

    // 统计结果
    const activated = results.filter(r => r.status === 'activated').length
    const errors = results.filter(r => r.status === 'error').length

    console.log(`✅ [Cron] 激活完成：激活=${activated}, 错误=${errors}`)

    return NextResponse.json({
      success: true,
      message: `激活完成：激活=${activated}, 错误=${errors}`,
      activated,
      errors,
      results,
    })

  } catch (error) {
    console.error('❌ [Cron] 定时任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '定时任务失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
