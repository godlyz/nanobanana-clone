-- =====================================================
-- 🔥 老王新增：获取用户所有订阅（包括冻结的）
-- 创建时间: 2025-11-12
-- 用途：前端订阅管理页面显示所有订阅状态
-- =====================================================

-- 🔥 功能：获取用户所有订阅（包括激活和冻结状态的）
CREATE OR REPLACE FUNCTION get_user_all_subscriptions(p_user_id UUID)
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
    -- 🔥 新增：冻结相关字段
    is_frozen BOOLEAN,
    frozen_until TIMESTAMPTZ,
    frozen_credits INTEGER,
    -- 🔥 新增：剩余天数/月数
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
        s.plan_tier,
        s.billing_cycle,
        s.monthly_credits,
        s.status,
        s.started_at,
        s.expires_at,
        s.creem_subscription_id,
        -- 🔥 判断是否冻结：存在冻结积分且冻结期未结束
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN TRUE
            ELSE FALSE
        END AS is_frozen,
        -- 🔥 冻结至时间（从冻结积分记录中获取）
        (
            SELECT ct.frozen_until
            FROM credit_transactions ct
            WHERE ct.user_id = s.user_id
              AND ct.related_entity_id = s.id
              AND ct.is_frozen = TRUE
              AND ct.frozen_until > NOW()
            ORDER BY ct.frozen_until DESC
            LIMIT 1
        ) AS frozen_until,
        -- 🔥 冻结的积分数量
        (
            SELECT SUM(ct.amount)
            FROM credit_transactions ct
            WHERE ct.user_id = s.user_id
              AND ct.related_entity_id = s.id
              AND ct.is_frozen = TRUE
              AND ct.frozen_until > NOW()
        )::INTEGER AS frozen_credits,
        -- 🔥 剩余天数（如果冻结，计算到frozen_until；否则计算到expires_at）
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                CEIL(EXTRACT(EPOCH FROM (
                    (
                        SELECT ct.frozen_until
                        FROM credit_transactions ct
                        WHERE ct.user_id = s.user_id
                          AND ct.related_entity_id = s.id
                          AND ct.is_frozen = TRUE
                          AND ct.frozen_until > NOW()
                        ORDER BY ct.frozen_until DESC
                        LIMIT 1
                    ) - NOW()
                )) / 86400)::INTEGER
            ELSE
                CEIL(EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 86400)::INTEGER
        END AS remaining_days,
        -- 🔥 剩余月数（天数 / 30 向上取整）
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM credit_transactions ct
                WHERE ct.user_id = s.user_id
                  AND ct.related_entity_id = s.id
                  AND ct.is_frozen = TRUE
                  AND ct.frozen_until > NOW()
            ) THEN
                CEIL(
                    EXTRACT(EPOCH FROM (
                        (
                            SELECT ct.frozen_until
                            FROM credit_transactions ct
                            WHERE ct.user_id = s.user_id
                              AND ct.related_entity_id = s.id
                              AND ct.is_frozen = TRUE
                              AND ct.frozen_until > NOW()
                            ORDER BY ct.frozen_until DESC
                            LIMIT 1
                        ) - NOW()
                    )) / 86400 / 30
                )::INTEGER
            ELSE
                CEIL(EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 86400 / 30)::INTEGER
        END AS remaining_months
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'cancelled')  -- 🔥 包括活跃和取消的订阅
    ORDER BY
        -- 🔥 排序规则：激活的排前面，冻结的排后面
        CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
        s.expires_at DESC;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_all_subscriptions IS '获取用户所有订阅（包括激活和冻结状态），用于前端订阅管理页面';

-- =====================================================
-- 迁移完成
-- =====================================================
