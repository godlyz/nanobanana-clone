/**
 * 订阅购买 API (集成Creem支付)
 * 老王备注: 支持月付和年付两种订阅方式
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShortId } from '@/lib/id-generator'
import {
  SUBSCRIPTION_MONTHLY_CREDITS,
  SUBSCRIPTION_YEARLY_ACTUAL_CREDITS,
  SUBSCRIPTION_YEARLY_BONUS_CREDITS,
} from '@/lib/credit-types'

// Creem API 配置
const CREEM_API_KEY = process.env.CREEM_API_KEY
const isTestMode = CREEM_API_KEY?.startsWith("creem_test_")
const CREEM_API_URL = isTestMode
  ? "https://test-api.creem.io/v1/checkouts"
  : "https://api.creem.io/v1/checkouts"

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '请先登录才能购买订阅',
      }, { status: 401 })
    }

    const { plan_tier, billing_cycle } = await request.json()

    if (!plan_tier || !billing_cycle) {
      return NextResponse.json(
        { success: false, error: '缺少参数', message: '请提供套餐等级和计费周���' },
        { status: 400 }
      )
    }

    // 验证参数
    if (!['basic', 'pro', 'max'].includes(plan_tier)) {
      return NextResponse.json(
        { success: false, error: '无效参数', message: '无效的套餐等级' },
        { status: 400 }
      )
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return NextResponse.json(
        { success: false, error: '无效参数', message: '无效的计费周期' },
        { status: 400 }
      )
    }

    // 检查Creem API Key
    if (!CREEM_API_KEY || CREEM_API_KEY.includes('your_')) {
      console.error('CREEM_API_KEY未配置')
      return NextResponse.json(
        { success: false, error: '支付服务未配置', message: '支付服务暂时不可用' },
        { status: 500 }
      )
    }

    // 获取产品ID (从环境变量)
    const productIdKey = `CREEM_${plan_tier.toUpperCase()}_${billing_cycle.toUpperCase()}_PRODUCT_ID`
    const productId = process.env[productIdKey]

    if (!productId || productId.includes('your_')) {
      console.error(`产品ID未配置: ${productIdKey}`)
      return NextResponse.json(
        { success: false, error: '产品未配置', message: '该订阅套餐暂时不可用' },
        { status: 500 }
      )
    }

    // 计算积分信息
    const monthlyCredits = SUBSCRIPTION_MONTHLY_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_MONTHLY_CREDITS]
    const totalCredits = billing_cycle === 'yearly'
      ? SUBSCRIPTION_YEARLY_ACTUAL_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_YEARLY_ACTUAL_CREDITS]
      : monthlyCredits
    const bonusCredits = billing_cycle === 'yearly'
      ? SUBSCRIPTION_YEARLY_BONUS_CREDITS[plan_tier as keyof typeof SUBSCRIPTION_YEARLY_BONUS_CREDITS]
      : 0

    // 创建 Creem checkout session
    const requestId = `subscription_${user.id}_${Date.now()}_${generateShortId()}`

    const response = await fetch(CREEM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CREEM_API_KEY,
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: requestId,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?type=subscription&plan=${plan_tier}&cycle=${billing_cycle}`,
        metadata: {
          user_id: user.id,
          plan_tier,
          billing_cycle,
          monthly_credits: monthlyCredits,
          total_credits: totalCredits,
          bonus_credits: bonusCredits,
          type: 'subscription' // 标识这是订阅购买
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Creem API错误:', errorData)
      return NextResponse.json(
        { success: false, error: '创建支付会话失败', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 返回 checkout URL
    return NextResponse.json({
      success: true,
      data: {
        checkout_url: data.url || data.checkout_url,
        session_id: data.id,
        subscription: {
          plan_tier,
          billing_cycle,
          monthly_credits: monthlyCredits,
          total_credits: totalCredits,
          bonus_credits: bonusCredits,
        }
      }
    })

  } catch (error) {
    console.error('订阅购买错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      message: '创建支付会话失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
