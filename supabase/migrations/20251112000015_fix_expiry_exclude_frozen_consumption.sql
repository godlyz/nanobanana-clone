-- =====================================================
-- 修复：积分过期计算排除从冻结包中消费的积分
-- 日期：2025-11-12
-- 问题：2000包显示1977（2000-23），但23积分是从800冻结包消费的
-- 修复：计算总消费时，排除 consumed_from_id 指向冻结包的消费
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
    WITH
    -- 步骤1：获取所有冻结的充值包ID
    frozen_package_ids AS (
        SELECT ct.id
        FROM credit_transactions ct
        WHERE ct.user_id = p_user_id
          AND ct.amount > 0
          AND ct.is_frozen = TRUE
          AND ct.frozen_until > NOW()
    ),
    -- 步骤2：获取所有非冻结的充值包（用于显示过期信息）
    positive_txs AS (
        SELECT
            ct.id,
            ct.amount,
            ct.expires_at,
            ct.is_frozen
        FROM credit_transactions ct
        WHERE ct.user_id = p_user_id
          AND ct.amount > 0
          AND (ct.expires_at IS NULL OR ct.expires_at > NOW())
          AND (ct.is_frozen = FALSE OR ct.is_frozen IS NULL)
        ORDER BY ct.expires_at ASC NULLS LAST
    ),
    -- 步骤3：计算总消费（排除冻结操作 + 排除从冻结包消费的积分）
    total_used AS (
        SELECT COALESCE(SUM(ABS(ct.amount)), 0) AS used_amount
        FROM credit_transactions ct
        WHERE ct.user_id = p_user_id
          AND ct.amount < 0
          AND (ct.is_frozen = FALSE OR ct.is_frozen IS NULL)  -- 排除冻结操作
          AND (ct.consumed_from_id IS NULL OR ct.consumed_from_id NOT IN (SELECT id FROM frozen_package_ids))  -- 排除从冻结包消费的
    ),
    -- 步骤4：按"先到期先消耗"算法计算每笔充值的剩余
    credits_with_remaining AS (
        SELECT
            p.expires_at AS exp_date,
            p.amount AS original_amount,
            p.amount - GREATEST(0,
                (SELECT used_amount FROM total_used) -
                (SELECT COALESCE(SUM(p2.amount), 0)
                 FROM positive_txs p2
                 WHERE (p2.expires_at < p.expires_at)
                    OR (p2.expires_at = p.expires_at AND p2.id < p.id)
                    OR (p2.expires_at IS NULL AND p.expires_at IS NOT NULL)
                )
            ) AS remaining_amount
        FROM positive_txs p
    )
    -- 步骤5：按过期时间分组，只返回剩余>0的记录
    SELECT
        cwr.exp_date,
        SUM(cwr.remaining_amount)::INTEGER AS remaining_credits
    FROM credits_with_remaining cwr
    WHERE cwr.remaining_amount > 0
    GROUP BY cwr.exp_date
    ORDER BY cwr.exp_date ASC NULLS LAST;
END;
$$;
