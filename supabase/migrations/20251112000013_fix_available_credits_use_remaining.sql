-- =====================================================
-- 修复：可用积分计算改用 remaining_amount
-- 日期：2025-11-12
-- 问题：原来用 SUM(amount) 累加充值积分，应该用 SUM(remaining_amount) 累加剩余积分
-- 示例：800积分包已消费23，应该算777而不是800
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 累加剩余积分（remaining_amount），排除：消费记录、过期积分、冻结积分
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id
      AND amount > 0  -- 只计算充值/赠送
      AND (expires_at IS NULL OR expires_at > NOW())  -- 排除已过期
      AND (is_frozen IS NULL OR is_frozen = FALSE OR frozen_until < NOW());  -- 排除冻结中

    RETURN GREATEST(available_credits, 0);
END;
$$;
