// app/api/admin/check-user-credits/route.ts
// 🔥 临时管理员工具：检查用户的积分状态
// 用途：帮助诊断为什么用户积分不可用

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 🔥 使用 SERVICE_ROLE_KEY 绕过 RLS 限制
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId 参数' }, { status: 400 });
    }

    console.log(`🔍 检查用户积分: userId=${userId}`);

    // 1. 查询 credit_transactions 表中该用户的所有记录
    const { data: allTransactions, error: allError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (allError) {
      console.error('❌ 查询所有交易失败:', allError);
      return NextResponse.json(
        { error: `查询失败: ${allError.message}` },
        { status: 500 }
      );
    }

    // 2. 查询可用的积分包（remaining_amount > 0, 未过期, 未冻结）
    const { data: availablePackages, error: availError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .gt('remaining_amount', 0)
      .order('expires_at', { ascending: true, nullsFirst: false });

    if (availError) {
      console.error('❌ 查询可用积分包失败:', availError);
      return NextResponse.json(
        { error: `查询可用积分包失败: ${availError.message}` },
        { status: 500 }
      );
    }

    // 3. 调用 RPC 获取可用积分总数
    const { data: availableCreditsData, error: rpcError } = await supabase
      .rpc('get_user_available_credits', { target_user_id: userId });

    if (rpcError) {
      console.error('❌ 调用 get_user_available_credits 失败:', rpcError);
    }

    const totalAvailableCredits = availableCreditsData || 0;

    // 4. 分析积分状态
    const rechargeTransactions = allTransactions?.filter(t => t.amount > 0) || [];
    const consumptionTransactions = allTransactions?.filter(t => t.amount < 0) || [];

    const analysis = {
      userId,
      totalAvailableCredits,
      allTransactionsCount: allTransactions?.length || 0,
      rechargeCount: rechargeTransactions.length,
      consumptionCount: consumptionTransactions.length,
      availablePackagesCount: availablePackages?.length || 0,
      rechargeTransactions: rechargeTransactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        remaining_amount: t.remaining_amount,
        expires_at: t.expires_at,
        is_frozen: t.is_frozen,
        frozen_until: t.frozen_until,
        created_at: t.created_at,
        description: t.description,
      })),
      availablePackages: availablePackages?.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        remaining_amount: t.remaining_amount,
        expires_at: t.expires_at,
        is_frozen: t.is_frozen,
        frozen_until: t.frozen_until,
        created_at: t.created_at,
        description: t.description,
      })),
      consumptionTransactions: consumptionTransactions.slice(0, 10).map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        consumed_from_id: t.consumed_from_id,
        created_at: t.created_at,
        description: t.description,
      })),
    };

    return NextResponse.json(
      {
        success: true,
        message: `用户 ${userId} 的积分分析`,
        analysis,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ 检查失败:', error);
    return NextResponse.json(
      { error: `检查失败: ${error.message}` },
      { status: 500 }
    );
  }
}
