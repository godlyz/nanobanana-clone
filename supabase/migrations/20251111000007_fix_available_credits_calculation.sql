-- =====================================================
-- 🔥 老王修复：可用积分计算逻辑
-- 创建时间: 2025-11-11
-- 用途：可用积分只计算充值/赠送，不包括消费记录
-- =====================================================

-- 🔥 老王重写：可用积分只统计未过期、未冻结的充值/赠送
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 🔥 老王修复：可用积分 = 只计算未过期、未冻结的充值/赠送记录的剩余积分
    -- 不包括消费记录（amount < 0）
    -- 不包括已过期的记录（expires_at <= NOW()）
    -- 不包括冻结中的记录（is_frozen = TRUE AND frozen_until > NOW()）
    -- 🔥 2025-11-12 修复：使用 remaining_amount 而不是 amount
    SELECT COALESCE(
        SUM(remaining_amount),  -- 🔥 修复：累加剩余积分，而不是初始充值积分
        0
    )
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id
      AND amount > 0  -- 🔥 关键：只计算充值/赠送（正数），不包括消费（负数）
      AND (expires_at IS NULL OR expires_at > NOW())  -- 排除已过期
      AND (
          is_frozen IS NULL  -- 未冻结
          OR is_frozen = FALSE  -- 明确标记为未冻结
          OR frozen_until < NOW()  -- 冻结期已结束
      );

    RETURN GREATEST(available_credits, 0); -- 确保不返回负数
END;
$$;

-- =====================================================
-- 迁移完成
-- =====================================================
