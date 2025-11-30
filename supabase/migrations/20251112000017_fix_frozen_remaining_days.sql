-- =====================================================
-- 修复：冻结订阅的剩余天数计算
-- 日期：2025-11-12
-- 问题：remaining_days 显示"距离解冻还有多少天"，应该显示"包的剩余有效期天数"
-- 修复：使用 frozen_remaining_seconds 字段（记录冻结时包的剩余有效期）
-- =====================================================

-- 先删除旧函数（因为返回类型可能不同）
DROP FUNCTION IF EXISTS get_user_all_subscriptions(UUID);

-- 重新创建函数
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
        (
            SELECT SUM(ct.remaining_amount) FROM credit_transactions ct
            WHERE ct.user_id = s.user_id
              AND ct.related_entity_id = s.id
              AND ct.is_frozen = TRUE
              AND ct.frozen_until > NOW()
        )::INTEGER AS frozen_credits,
        -- 修复：冻结订阅使用 frozen_remaining_seconds 字段
        CASE
            WHEN EXISTS (
                SELECT 1 FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                FLOOR((
                    SELECT ct.frozen_remaining_seconds FROM credit_transactions ct
                     WHERE ct.user_id = s.user_id
                       AND ct.related_entity_id = s.id
                       AND ct.is_frozen = TRUE
                       AND ct.frozen_until > NOW()
                     ORDER BY ct.frozen_until DESC LIMIT 1
                ) / 86400.0)::INTEGER
            ELSE
                CEIL(EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 86400)::INTEGER
        END AS remaining_days,
        -- remaining_months：订阅的剩余月数（不是包的剩余月数！）
        -- 冻结订阅：从 frozen_until 到订阅结束的月数
        -- 激活订阅：从 NOW() 到订阅结束的月数
        CASE
            WHEN EXISTS (
                SELECT 1 FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                CEIL(EXTRACT(EPOCH FROM (s.expires_at - (
                    SELECT ct.frozen_until FROM credit_transactions ct
                     WHERE ct.user_id = s.user_id
                       AND ct.related_entity_id = s.id
                       AND ct.is_frozen = TRUE
                       AND ct.frozen_until > NOW()
                     ORDER BY ct.frozen_until DESC LIMIT 1
                ))) / 86400 / 30)::INTEGER
            ELSE
                CEIL(EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 86400 / 30)::INTEGER
        END AS remaining_months
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'cancelled')
    ORDER BY
        CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
        s.expires_at DESC;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION get_user_all_subscriptions IS '获取用户所有订阅（冻结订阅的剩余天数 = 冻结时包的剩余有效期）';
