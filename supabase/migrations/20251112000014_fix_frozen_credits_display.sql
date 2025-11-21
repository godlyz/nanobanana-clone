-- =====================================================
-- 修复：冻结积分显示改用 remaining_amount
-- 日期：2025-11-12
-- 问题：订阅管理页面显示"冻结积分800"，应该是"777"（已消费23）
-- 原因：get_user_all_subscriptions 函数用 SUM(amount) 而不是 SUM(remaining_amount)
-- =====================================================

-- 先删除旧函数（因为返回类型可能不同）
DROP FUNCTION IF EXISTS get_user_all_subscriptions(UUID);

-- 重新创建函数（只修改 frozen_credits 计算逻辑）
CREATE FUNCTION get_user_all_subscriptions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    plan_tier TEXT,
    billing_cycle TEXT,
    monthly_credits INTEGER,
    status TEXT,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    creem_subscription_id TEXT,
    is_frozen BOOLEAN,
    frozen_until TIMESTAMPTZ,
    frozen_credits INTEGER,
    remaining_days INTEGER,
    remaining_months INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.user_id,
        s.plan_tier::TEXT,
        s.billing_cycle::TEXT,
        s.monthly_credits,
        s.status::TEXT,
        s.started_at,
        s.expires_at,
        s.creem_subscription_id::TEXT,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN TRUE ELSE FALSE
        END AS is_frozen,
        (
            SELECT ct.frozen_until FROM credit_transactions ct
            WHERE ct.user_id = s.user_id
              AND ct.related_entity_id = s.id
              AND ct.is_frozen = TRUE
              AND ct.frozen_until > NOW()
            ORDER BY ct.frozen_until DESC
            LIMIT 1
        ) AS frozen_until,
        -- 修复：使用 remaining_amount 而不是 amount
        (
            SELECT SUM(ct.remaining_amount) FROM credit_transactions ct
            WHERE ct.user_id = s.user_id
              AND ct.related_entity_id = s.id
              AND ct.is_frozen = TRUE
              AND ct.frozen_until > NOW()
        )::INTEGER AS frozen_credits,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                EXTRACT(DAY FROM (
                    (SELECT ct.frozen_until FROM credit_transactions ct
                     WHERE ct.user_id = s.user_id
                       AND ct.related_entity_id = s.id
                       AND ct.is_frozen = TRUE
                       AND ct.frozen_until > NOW()
                     ORDER BY ct.frozen_until DESC
                     LIMIT 1) - NOW()
                ))::INTEGER
            ELSE
                EXTRACT(DAY FROM (s.expires_at - NOW()))::INTEGER
        END AS remaining_days,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                ROUND(
                    EXTRACT(DAY FROM (
                        (SELECT ct.frozen_until FROM credit_transactions ct
                         WHERE ct.user_id = s.user_id
                           AND ct.related_entity_id = s.id
                           AND ct.is_frozen = TRUE
                           AND ct.frozen_until > NOW()
                         ORDER BY ct.frozen_until DESC
                         LIMIT 1) - NOW()
                    )) / 30.0
                )::INTEGER
            ELSE
                ROUND(EXTRACT(DAY FROM (s.expires_at - NOW())) / 30.0)::INTEGER
        END AS remaining_months
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'cancelled')
    ORDER BY
        CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
        s.expires_at DESC;
END;
$$;
