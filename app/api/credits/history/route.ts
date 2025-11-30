/**
 * 获取用户积分交易历史 API
 * 老王备注: 这个接口返回分页的交易记录,支持筛选和排序
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createCreditService } from '@/lib/credit-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        requiresAuth: true
      }, { status: 401 })
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const transactionType = searchParams.get('type') || undefined

    // 创建积分服务实例
    const creditService = await createCreditService()

    // 获取交易记录
    const { transactions, total_count } = await creditService.getCreditTransactions(
      user.id,
      limit,
      offset,
      transactionType as any
    )

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        total_count,
        limit,
        offset,
        has_more: (offset + limit) < total_count
      }
    })

  } catch (error) {
    console.error("❌ Credit history API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
