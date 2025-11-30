-- =====================================================
-- 修复：剩余月数计算逻辑 - 修正冻结订阅参考时间
-- 日期：2025-11-13
-- 问题：
--   1. 冻结订阅用 frozen_until 作为参考时间，包含了后延时间
--   2. 公式中多了 +1
-- 修复：
--   1. 冻结订阅用 frozen_until - frozen_remaining_seconds（冻结开始时间）
--   2. 去掉 +1
-- =====================================================
--
-- 示例（Pro订阅）：
-- - 订阅开始：2025-10-26
-- - 升级到Max：2025-11-27（实际使用31.93天）
-- - 冻结至：2025-12-11（后延14.3天）
--
-- 错误计算（当前）：
--   参考时间 = frozen_until = 2025-12-11
--   已过天数 = 2025-12-11 - 2025-10-26 = 46.23 天（包含后延）
--   已用月数 = FLOOR(46.23 / 30) + 1 = 2
--   剩余月数 = 12 - 2 = 10 ❌
--
-- 正确计算（修复后）：
--   参考时间 = frozen_until - frozen_remaining_seconds = 2025-11-27
--   已过天数 = 2025-11-27 - 2025-10-26 = 31.93 天（只算实际使用）
--   已用月数 = FLOOR(31.93 / 30) = 1
--   剩余月数 = 12 - 1 = 11 ✅
-- =====================================================

DROP FUNCTION IF EXISTS get_user_all_subscriptions(UUID);

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
        -- remaining_days：冻结订阅用frozen_remaining_seconds，激活订阅用expires_at-NOW()
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
        -- 🔥 修复：remaining_months = 总月数 - 已用月数
        -- 总月数：monthly=1, yearly=12
        -- 已用月数：FLOOR((参考时间-started_at)/30天) ← 去掉了 +1
        -- 参考时间：
        --   - 冻结订阅：frozen_until - frozen_remaining_seconds（冻结开始时间）
        --   - 激活订阅：NOW()
        (
            CASE s.billing_cycle
                WHEN 'monthly' THEN 1
                WHEN 'yearly' THEN 12
                ELSE 1
            END
            - (
                FLOOR(
                    EXTRACT(EPOCH FROM (
                        CASE
                            WHEN EXISTS (
                                SELECT 1 FROM credit_transactions ct
                                WHERE ct.user_id = s.user_id
                                  AND ct.related_entity_id = s.id
                                  AND ct.is_frozen = TRUE
                                  AND ct.frozen_until > NOW()
                            ) THEN (
                                -- 🔥 修复：用冻结开始时间，不包含后延
                                SELECT (ct.frozen_until - (ct.frozen_remaining_seconds || ' seconds')::INTERVAL)
                                FROM credit_transactions ct
                                WHERE ct.user_id = s.user_id
                                  AND ct.related_entity_id = s.id
                                  AND ct.is_frozen = TRUE
                                  AND ct.frozen_until > NOW()
                                ORDER BY ct.frozen_until DESC LIMIT 1
                            )
                            ELSE NOW()
                        END - s.started_at
                    )) / 86400 / 30
                )  -- 🔥 去掉了 + 1
            )
        )::INTEGER AS remaining_months
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'cancelled')
    ORDER BY
        CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
        s.expires_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_all_subscriptions IS '获取用户所有订阅（修复：冻结订阅用冻结开始时间，去掉+1）';
