import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 🔥 老王：GET - 获取统计概览
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录或会话已过期' },
        { status: 401 }
      )
    }

    // 🔥 老王：计算活跃天数（真实数据）
    const createdAt = new Date(user.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdAt.getTime())
    const activeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 🔥 老王：查询真实统计数据
    // 1. 查询总图像生成数（从 generation_history 表）
    const { count: totalImages, error: imagesError } = await supabase
      .from('generation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (imagesError) {
      console.error('⚠️ 查询图像生成记录失败:', imagesError)
    }

    // 2. 查询总 API 调用次数（从 generation_history 表，一次生成=一次调用）
    const totalApiCalls = totalImages || 0

    // 3. 查询积分消耗总数（从 credit_transactions 表，amount < 0 的记录）
    const { data: creditsData, error: creditsError } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .lt('amount', 0) // 只查询消费记录（负数）

    if (creditsError) {
      console.error('⚠️ 查询积分交易记录失败:', creditsError)
    }

    // 计算积分使用总数（取绝对值求和）
    const creditsUsed = creditsData
      ? creditsData.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
      : 0

    // 🔥 老王：返回真实数据
    const realData = {
      totalImages: totalImages || 0,
      totalApiCalls: totalApiCalls,
      creditsUsed: creditsUsed,
      activeDays: activeDays
    }

    console.log('✅ 统计概览（真实数据）:', realData)

    return NextResponse.json({
      success: true,
      data: realData
    })
  } catch (error) {
    console.error('⚠️ Error fetching stats overview:', error)
    return NextResponse.json(
      { error: '获取统计概览失败' },
      { status: 500 }
    )
  }
}
