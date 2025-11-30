// app/api/admin/update-consume-function/route.ts
// 🔥 临时管理员工具：更新 consume_credits_smart 函数（修复 FORMAT % 转义问题）

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 🔥 使用 SERVICE_ROLE_KEY 执行 SQL
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔍 开始更新 consume_credits_smart 函数...');

    // 修复后的函数定义（使用 %s 而不是 %）
    const sqlFunction = `
CREATE OR REPLACE FUNCTION consume_credits_smart(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR(50),
    p_related_entity_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    consumed INTEGER,
    insufficient BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_credits INTEGER := 0;
    v_remaining_to_consume INTEGER := p_amount;
    v_package RECORD;
    v_consume_from_package INTEGER := 0;
    v_consumed_total INTEGER := 0;
    v_final_remaining INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 [consume_credits] 开始消费: 用户=%, 需要=%积分', p_user_id, p_amount;

    -- 🔥 步骤1：检查可用积分是否足够
    SELECT get_user_available_credits(p_user_id) INTO v_available_credits;
    RAISE NOTICE '📊 [consume_credits] 当前可用积分: %', v_available_credits;

    IF v_available_credits < p_amount THEN
        RAISE NOTICE '❌ [consume_credits] 积分不足: 需要% 但只有%', p_amount, v_available_credits;
        RETURN QUERY SELECT FALSE, 0, TRUE, FORMAT('积分不足：需要%s积分，可用%s积分', p_amount, v_available_credits);
        RETURN;
    END IF;

    -- 🔥 步骤2：按 FIFO 策略查询可用积分包（按过期时间升序）
    FOR v_package IN
        SELECT
            id,
            amount,
            remaining_amount,
            expires_at,
            transaction_type
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND remaining_amount > 0
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (
              is_frozen IS NULL
              OR is_frozen = FALSE
              OR frozen_until < NOW()
          )
        ORDER BY
            CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
            expires_at ASC
    LOOP
        -- 计算从当前包消费多少
        v_consume_from_package := LEAST(v_remaining_to_consume, v_package.remaining_amount);

        RAISE NOTICE '💳 [consume_credits] 从包 % 消费 % 积分（剩余: % → %）',
            v_package.id,
            v_consume_from_package,
            v_package.remaining_amount,
            v_package.remaining_amount - v_consume_from_package;

        -- 更新包的 remaining_amount
        UPDATE credit_transactions
        SET remaining_amount = remaining_amount - v_consume_from_package
        WHERE id = v_package.id;

        -- 创建消费记录（关联到这个包）
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            remaining_credits,
            remaining_amount,
            consumed_from_id,
            expires_at,
            related_entity_id,
            description
        )
        VALUES (
            p_user_id,
            p_transaction_type,
            -v_consume_from_package,
            v_available_credits - v_consumed_total - v_consume_from_package,
            0,
            v_package.id,
            NULL,
            p_related_entity_id,
            COALESCE(p_description,
                     FORMAT('消费%s积分（从%s包扣除）', v_consume_from_package, v_package.transaction_type))
        );

        -- 更新累计消费量
        v_consumed_total := v_consumed_total + v_consume_from_package;
        v_remaining_to_consume := v_remaining_to_consume - v_consume_from_package;

        -- 如果已经消费够了，退出循环
        EXIT WHEN v_remaining_to_consume <= 0;
    END LOOP;

    -- 🔥 步骤3：检查是否全部消费成功
    IF v_consumed_total < p_amount THEN
        RAISE NOTICE '⚠️  [consume_credits] 消费未完成: 需要% 但只消费了%', p_amount, v_consumed_total;
        RETURN QUERY SELECT FALSE, v_consumed_total, TRUE, FORMAT('积分不足：需要%s积分，只消费了%s积分', p_amount, v_consumed_total);
        RETURN;
    END IF;

    -- 🔥 步骤4：计算最终剩余积分
    v_final_remaining := v_available_credits - v_consumed_total;

    RAISE NOTICE '✅ [consume_credits] 消费成功: 消费%积分, 剩余%积分', v_consumed_total, v_final_remaining;

    RETURN QUERY SELECT TRUE, v_consumed_total, FALSE, FORMAT('成功消费%s积分，剩余%s积分', v_consumed_total, v_final_remaining);
END;
$$;
    `;

    // 执行 SQL
    const { error: sqlError } = await supabase.rpc('exec', { sql: sqlFunction });

    if (sqlError) {
      // 如果 rpc exec 不存在，尝试直接执行
      console.log('⚠️ rpc exec 不可用，尝试使用原生查询...');

      // 注意：Supabase JS 客户端不支持直接执行 DDL
      // 需要通过 SQL Editor 或 API 执行
      return NextResponse.json(
        {
          error: 'SQL 执行失败',
          message: '请手动在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：',
          sql: sqlFunction,
          sqlError: sqlError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'consume_credits_smart 函数已更新（修复 FORMAT % 转义问题）',
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ 更新函数失败:', error);
    return NextResponse.json(
      {
        error: error.message,
        sql: '请手动在 Supabase Dashboard 执行 supabase/migrations/20251111000010_smart_consumption.sql 文件',
      },
      { status: 500 }
    );
  }
}
