-- =====================================================
-- 简化积分过期计算：直接使用 remaining_amount 字段
-- 日期：2025-11-12
-- 原因：remaining_amount 已由 consume_credits_smart 维护，无需重新计算
-- 逻辑：显示所有未冻结、未过期、有剩余的积分包
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_credits_expiry_realtime(p_user_id UUID)
RETURNS TABLE (
    expiry_date TIMESTAMPTZ,
    remaining_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.expires_at AS expiry_date,
        SUM(ct.remaining_amount)::INTEGER AS remaining_credits
    FROM credit_transactions ct
    WHERE ct.user_id = p_user_id
      AND ct.amount > 0  -- 只查充值记录
      AND ct.remaining_amount > 0  -- 只显示有剩余的
      AND (ct.expires_at IS NULL OR ct.expires_at > NOW())  -- 排除已过期
      AND (
        ct.is_frozen = FALSE  -- 未冻结
        OR ct.is_frozen IS NULL  -- 或无冻结标记
        OR ct.frozen_until <= NOW()  -- 或冻结已到期（已解冻）
      )
    GROUP BY ct.expires_at
    ORDER BY ct.expires_at ASC NULLS LAST;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION get_user_credits_expiry_realtime IS '获取用户积分过期信息（直接使用 remaining_amount，排除冻结中的积分）';
