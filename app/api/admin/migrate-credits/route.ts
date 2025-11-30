// app/api/admin/migrate-credits/route.ts
// 🔥 临时管理员工具：迁移旧的 credit_packages 数据到 credit_transactions
// 用途：将旧积分包系统的数据迁移到新的 FIFO 系统

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log('🔍 开始迁移 credit_packages 数据...');

    // 1. 查询所有需要迁移的积分包（旧表：credit_packages）
    const { data: packages, error: queryError } = await supabase
      .from('credit_packages')
      .select('*')
      .gt('remaining_credits', 0)
      .neq('status', 'migrated')
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error('❌ 查询 credit_packages 失败:', queryError);
      return NextResponse.json(
        { error: `查询失败: ${queryError.message}` },
        { status: 500 }
      );
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json(
        { success: true, message: '没有需要迁移的积分包', migrated: 0 },
        { status: 200 }
      );
    }

    console.log(`🔍 找到 ${packages.length} 个需要迁移的积分包`);

    const results = [];

    // 2. 为每个积分包创建 credit_transactions 记录
    for (const pkg of packages) {
      console.log(`🔄 迁移积分包: user_id=${pkg.user_id}, credits=${pkg.remaining_credits}`);

      // 获取当前用户的可用积分
      const { data: currentCreditData } = await supabase
        .rpc('get_user_available_credits', { target_user_id: pkg.user_id });

      const currentCredits = currentCreditData || 0;

      // 插入到 credit_transactions 表
      const { error: insertError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: pkg.user_id,
          transaction_type: 'subscription_refill', // 标记为订阅充值
          amount: pkg.remaining_credits, // 正数表示充值
          remaining_credits: currentCredits + pkg.remaining_credits,
          remaining_amount: pkg.remaining_credits, // 🔥 FIFO 需要
          expires_at: pkg.expires_at,
          description: `积分包迁移: 从 credit_packages 表迁移 ${pkg.remaining_credits} 积分`,
        });

      if (insertError) {
        console.error(`❌ 插入失败 (user_id=${pkg.user_id}):`, insertError);
        results.push({
          user_id: pkg.user_id,
          success: false,
          error: insertError.message,
        });
        continue;
      }

      // 更新 credit_packages 表，标记为已迁移
      const { error: updateError } = await supabase
        .from('credit_packages')
        .update({
          status: 'migrated', // 新状态：已迁移
          used_credits: pkg.total_credits, // 标记为已全部使用
          remaining_credits: 0,
        })
        .eq('package_id', pkg.package_id);

      if (updateError) {
        console.error(`⚠️ 更新 credit_packages 失败 (package_id=${pkg.package_id}):`, updateError);
      }

      results.push({
        user_id: pkg.user_id,
        credits: pkg.remaining_credits,
        expires_at: pkg.expires_at,
        success: true,
      });

      console.log(`✅ 迁移成功: user_id=${pkg.user_id}, credits=${pkg.remaining_credits}`);
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json(
      {
        success: true,
        message: `成功迁移 ${successCount}/${packages.length} 个积分包`,
        results,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ 迁移失败:', error);
    return NextResponse.json(
      { error: `迁移失败: ${error.message}` },
      { status: 500 }
    );
  }
}
