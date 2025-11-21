-- =====================================================
-- 🔥 老王修复：积分过期计算排除冻结操作产生的消费
-- 创建时间: 2025-11-12
-- 问题：total_used 包含了冻结操作产生的负数交易(-777)
-- 修复：排除 is_frozen=TRUE 的负数交易
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
    -- 步骤1：获取所有正向交易（充值），排除冻结的
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
    -- 步骤2：计算总消费金额（排除冻结操作产生的负数交易）
    -- 🔥 老王修复：冻结操作产生的负数交易（is_frozen=TRUE）不应该计入真实消费
    total_used AS (
        SELECT COALESCE(SUM(ABS(ct.amount)), 0) AS used_amount
        FROM credit_transactions ct
        WHERE ct.user_id = p_user_id
          AND ct.amount < 0
          AND (ct.is_frozen = FALSE OR ct.is_frozen IS NULL)  -- 🔥 排除冻结操作
    ),
    -- 步骤3：按"先到期先消耗"算法计算每笔充值的剩余
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
    -- 步骤4：按过期时间分组，只返回剩余>0的记录
    SELECT
        cwr.exp_date,
        SUM(cwr.remaining_amount)::INTEGER AS remaining_credits
    FROM credits_with_remaining cwr
    WHERE cwr.remaining_amount > 0
    GROUP BY cwr.exp_date
    ORDER BY cwr.exp_date ASC NULLS LAST;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_credits_expiry_realtime IS '实时计算每个过期日期的剩余积分（排除冻结操作产生的消费）';

-- =====================================================
-- 迁移完成
-- =====================================================
