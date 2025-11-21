/**
 * 获取用户积分余额 API
 * 老王备注: 这个接口返回真实的积分数据,不再是mock!
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createCreditService } from '@/lib/credit-service'

export async function GET(request: Request) {
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

    // 🔥 老王新增：解析URL参数（分页和筛选）
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filterType = searchParams.get('type') || 'all' // all, earned, used

    // 创建积分服务实例
    const creditService = await createCreditService()

    // 获取用户可用积分
    const totalCredits = await creditService.getUserAvailableCredits(user.id)

    // 获取即将过期的积分
    const expiringSoon = await creditService.getExpiringSoonCredits(user.id)

    // 🔥 老王新增：获取所有积分的过期信息
    const allExpiry = await creditService.getAllCreditsExpiry(user.id)

    // 🔥 老王修复：直接用 supabase 客户端查询，避免 creditService 的fetch问题
    const { data: allTransactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (txError) {
      console.error('❌ 查询交易记录失败:', txError)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch transactions"
      }, { status: 500 })
    }

    // 🔥 查询冻结的积分总数和详情
    const { data: frozenPackages } = await supabase
      .from('credit_transactions')
      .select('id, amount, remaining_amount, created_at, frozen_until, related_entity_id')
      .eq('user_id', user.id)
      .eq('is_frozen', true)
      .gt('frozen_until', new Date().toISOString())

    const totalFrozen = (frozenPackages || [])
      .reduce((sum, pkg) => sum + (pkg.remaining_amount || 0), 0)

    // 🔥 老王新增：查询用户所有订阅，用于确定冻结时间
    const { data: allSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('id, started_at, plan_tier')
      .eq('user_id', user.id)
      .order('started_at', { ascending: true })

    // 🔥 老王修复：正确计算总获得和已使用
    // 总获得 = 所有充值记录 - 冻结的积分
    const totalEarnedRaw = (allTransactions || [])
      .filter(tx => tx.amount > 0)  // 所有充值记录
      .reduce((sum, tx) => sum + tx.amount, 0)

    const totalEarned = totalEarnedRaw - totalFrozen

    // 已使用 = 所有消费记录的绝对值（所有负数交易）
    const totalUsed = Math.abs(
      (allTransactions || [])
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    )

    // 🔥 老王新增：为冻结的积分包创建虚拟交易记录
    const frozenVirtualTransactions = (frozenPackages || []).map(pkg => {
      // 找到触发冻结的新订阅（在被冻结订阅之后创建的订阅）
      const frozenSubId = pkg.related_entity_id
      const frozenSub = allSubscriptions?.find(s => s.id === frozenSubId)
      const newSub = allSubscriptions?.find(s =>
        frozenSub && new Date(s.started_at) > new Date(frozenSub.started_at)
      )

      // 使用新订阅的开始时间作为冻结时间
      const freezeTime = newSub?.started_at || pkg.created_at

      return {
        id: `frozen-${pkg.id}`,
        user_id: user.id,
        amount: -(pkg.remaining_amount || 0),  // 负数表示冻结
        remaining_amount: 0,
        description: `积分冻结 - ${pkg.remaining_amount}积分（订阅升级，冻结至${new Date(pkg.frozen_until).toLocaleDateString('zh-CN')}）`,
        created_at: freezeTime,  // 使用升级时间
        transaction_type: 'freeze' as any,
        is_frozen: true,
        related_entity_id: null,
        related_entity_type: null,
        expires_at: null,
        remaining_credits: 0
      }
    })

    // 🔥 老王新增：根据筛选条件过滤交易记录
    let filteredTransactions = [...(allTransactions || []), ...frozenVirtualTransactions]
    if (filterType === 'earned') {
      filteredTransactions = filteredTransactions.filter(tx => tx.amount > 0)
    } else if (filterType === 'used') {
      filteredTransactions = filteredTransactions.filter(tx => tx.amount < 0 || tx.transaction_type === 'freeze')
    }

    // 按时间倒序排序
    filteredTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 🔥 老王新增：分页处理
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(filteredTransactions.length / limit)
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit)


    // 🔥 老王删除：relatedEntityIds和generationRecordsMap相关代码是死代码（未被使用）
    // 原代码查询generation_history表但查询结果从未被使用，违背YAGNI原则

    // 🔥 老王新方案：返回完整的transaction对象，让前端用解析器处理国际化
    const formattedTransactions = paginatedTransactions.map(tx => {
      // 🔥 保留原始描述，前端会用解析器处理
      return {
        id: tx.id,
        type: tx.amount > 0 ? 'earned' as const : 'used' as const,
        amount: tx.amount,
        description: tx.description || '',  // 原始描述（混合语言）
        transaction_type: tx.transaction_type,  // 🔥 新增：交易类型
        timestamp: tx.created_at,
        // 🔥 新增：前端解析器可能需要的其他字段
        related_entity_id: tx.related_entity_id,
        related_entity_type: tx.related_entity_type,
        expires_at: tx.expires_at,
        remaining_credits: tx.remaining_credits
      }
    })

    return NextResponse.json({
      currentCredits: totalCredits,
      totalEarned: totalEarned,
      totalUsed: totalUsed,
      transactions: formattedTransactions,
      expiringSoon: expiringSoon, // 🔥 老王新增：返回即将过期的积分信息
      allExpiry: allExpiry, // 🔥 老王新增：返回所有积分的过期信息
      // 🔥 老王新增：分页信息
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: filteredTransactions.length,
        limit: limit,
        hasMore: page < totalPages
      }
    })

  } catch (error) {
    console.error("❌ Credits API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
