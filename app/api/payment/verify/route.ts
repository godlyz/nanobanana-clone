import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from '@/lib/supabase/server'

const CREEM_API_KEY = process.env.CREEM_API_KEY

/**
 * 验证 Creem 支付签名
 * @param payload 支付载荷数据
 * @param signature 签名
 * @param apiKey API密钥
 * @returns 验证结果
 */
function verifyCreemSignature(
  payload: Record<string, any>,
  signature: string,
  apiKey: string
): boolean {
  try {
    // 将载荷按键排序并拼接成字符串
    const sortedKeys = Object.keys(payload).sort()
    const payloadString = sortedKeys
      .map(key => `${key}=${payload[key]}`)
      .join('&')

    // 使用 HMAC-SHA256 计算预期签名
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(payloadString)
      .digest('hex')

    // 比较签名（安全的字符串比较）
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )

    console.log(`[Signature] 验证详情:`, {
      payload: payloadString,
      received: signature,
      expected: expectedSignature,
      isValid
    })

    return isValid
  } catch (error) {
    console.error('[Signature] 签名验证异常:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkout_id, order_id, customer_id, subscription_id, product_id, request_id, signature } = body

    if (!CREEM_API_KEY) {
      return NextResponse.json({ error: "Payment service not configured" }, { status: 500 })
    }

    // 验证签名
    // 注意: Creem 文档未明确说明回调 URL 的签名算法
    // 暂时记录签名信息供调试，主要依赖 webhook 进行订单验证
    console.log("Payment callback received:", {
      checkout_id,
      order_id,
      customer_id,
      subscription_id,
      product_id,
      request_id,
      signature,
    })

    // ✅ 已实现 - 签名验证算法
    const isValid = verifyCreemSignature(
      {
        checkout_id,
        order_id,
        customer_id,
        subscription_id,
        product_id,
        request_id,
      },
      signature,
      CREEM_API_KEY
    )

    if (!isValid) {
      console.warn(`[Payment] 签名验证失败: order_id=${order_id}, signature=${signature}`)
      return NextResponse.json({
        error: "Invalid signature",
        details: "支付签名验证失败，可能存在安全风险"
      }, { status: 400 })
    }

    console.log(`[Payment] 签名验证通过: order_id=${order_id}`)

    // TODO: 在这里处理支付成功后的业务逻辑
    // 1. 更新用户订阅状态
    // 2. 增加用户积分
    // 3. 发送确认邮件等

    // 返回支付详情
    return NextResponse.json({
      success: true,
      orderId: order_id,
      customerId: customer_id,
      subscriptionId: subscription_id,
      productId: product_id,
      plan: getPlanName(product_id),
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 根据产品 ID 获取计划名称
function getPlanName(productId?: string): string {
  if (!productId) return "Unknown"

  // 这里需要根据实际的产品 ID 映射
  const productIdMap: Record<string, string> = {
    [process.env.CREEM_BASIC_MONTHLY_PRODUCT_ID || ""]: "Basic (Monthly)",
    [process.env.CREEM_BASIC_YEARLY_PRODUCT_ID || ""]: "Basic (Yearly)",
    [process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || ""]: "Pro (Monthly)",
    [process.env.CREEM_PRO_YEARLY_PRODUCT_ID || ""]: "Pro (Yearly)",
    [process.env.CREEM_MAX_MONTHLY_PRODUCT_ID || ""]: "Max (Monthly)",
    [process.env.CREEM_MAX_YEARLY_PRODUCT_ID || ""]: "Max (Yearly)",
  }

  return productIdMap[productId] || "Unknown"
}
