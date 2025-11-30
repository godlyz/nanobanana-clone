/**
 * 积分包购买 API (集成Creem支付)
 * 老王备注: 这个接口集成了真实的Creem支付,不再是mock!
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateShortId } from '@/lib/id-generator'
import { createClient } from '@/lib/supabase/server'

// Creem API 配置
const CREEM_API_KEY = process.env.CREEM_API_KEY
const isTestMode = CREEM_API_KEY?.startsWith("creem_test_")
const CREEM_API_URL = isTestMode
  ? "https://test-api.creem.io/v1/checkouts"
  : "https://api.creem.io/v1/checkouts"

export async function POST(request: NextRequest) {
  try {
    // 🔒 老王添加：认证检查 - 保护购买API
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '请先登录才能购买积分',
      }, { status: 401 })
    }

    const { package_code } = await request.json()

    if (!package_code) {
      return NextResponse.json(
        { success: false, error: '缺少参数', message: '请提供积分包代码 (package_code)' },
        { status: 400 }
      )
    }

    // 从数据库查询积分包信息
    const { data: packageData, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('package_code', package_code)
      .eq('is_active', true)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { success: false, error: '无效的积分包', message: '找不到对应的积分包产品' },
        { status: 404 }
      )
    }

    // 检查Creem API Key
    if (!CREEM_API_KEY || CREEM_API_KEY.includes('your_')) {
      console.error('❌ CREEM_API_KEY is not configured')
      return NextResponse.json(
        { success: false, error: '支付服务未配置', message: '支付服务暂时不可用,请联系管理员' },
        { status: 500 }
      )
    }

    // 创建 Creem checkout session
    const requestId = `credit_${user.id}_${Date.now()}_${generateShortId()}`

    const response = await fetch(CREEM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CREEM_API_KEY,
      },
      body: JSON.stringify({
        product_id: packageData.creem_product_id,
        request_id: requestId,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?type=credits&package=${package_code}`,
        metadata: {
          user_id: user.id,
          package_code: package_code,
          credits: packageData.credits,
          type: 'credit_package' // 标识这是积分包购买
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Creem API error:', errorData)
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
        package: {
          code: packageData.package_code,
          name: packageData.name_zh,
          credits: packageData.credits,
          price: packageData.price_cny
        }
      }
    })

  } catch (error) {
    console.error('❌ Credit purchase error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      message: '创建支付会话失败,请稍后重试',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
