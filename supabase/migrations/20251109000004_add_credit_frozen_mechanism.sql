-- =====================================================
-- 🔥 老王创建：积分冻结机制（支持immediate降级）
-- 创建时间: 2025-11-09
-- 用途：immediate降级时，原套餐的月度充值积分需要冻结，等新套餐结束后才解冻
-- =====================================================

-- 1. 在 credit_transactions 表添加冻结相关字段
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frozen_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS frozen_reason TEXT;

-- 创建索引以加快查询
CREATE INDEX IF NOT EXISTS idx_credit_transactions_frozen
ON credit_transactions(user_id, is_frozen)
WHERE is_frozen = TRUE;

-- 2. 更新 get_user_available_credits 函数，排除冻结的积分
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 计算用户的可用积分
    -- 排除：1) 已过期的积分  2) 被冻结的积分
    SELECT COALESCE(
        SUM(CASE
            -- 正向交易：未过期 且 未冻结
            WHEN amount > 0
                 AND (expires_at IS NULL OR expires_at > NOW())
                 AND (is_frozen = FALSE OR is_frozen IS NULL)
            THEN amount
            -- 负向交易：全部计入
            WHEN amount < 0 THEN amount
            ELSE 0
        END),
        0
    )
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id;

    RETURN GREATEST(available_credits, 0);
END;
$$;

-- 3. 创建冻结积分的函数（降级时调用）
CREATE OR REPLACE FUNCTION freeze_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID,
    p_frozen_until TIMESTAMPTZ,
    p_reason TEXT DEFAULT 'Immediate downgrade - credits frozen until new plan ends'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- 将指定订阅的月度充值积分标记为冻结
    UPDATE credit_transactions
    SET
        is_frozen = TRUE,
        frozen_until = p_frozen_until,
        frozen_reason = p_reason
    WHERE user_id = p_user_id
      AND transaction_type = 'subscription_refill'
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (is_frozen = FALSE OR is_frozen IS NULL);

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- 4. 创建解冻积分的函数（新套餐到期时调用）
CREATE OR REPLACE FUNCTION unfreeze_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- 解冻指定订阅的积分
    UPDATE credit_transactions
    SET
        is_frozen = FALSE,
        frozen_until = NULL,
        frozen_reason = NULL
    WHERE user_id = p_user_id
      AND related_entity_id = p_subscription_id
      AND is_frozen = TRUE;

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- 5. 创建自动解冻积分的定时任务函数
CREATE OR REPLACE FUNCTION auto_unfreeze_expired_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- 自动解冻已到期的冻结积分
    UPDATE credit_transactions
    SET
        is_frozen = FALSE,
        frozen_until = NULL,
        frozen_reason = COALESCE(frozen_reason, '') || ' (Auto-unfrozen at ' || NOW()::TEXT || ')'
    WHERE is_frozen = TRUE
      AND frozen_until IS NOT NULL
      AND frozen_until <= NOW();

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- =====================================================
-- 迁移完成
-- =====================================================
