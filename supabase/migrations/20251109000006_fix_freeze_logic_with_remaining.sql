-- =====================================================
-- 🔥 老王修复：immediate降级时正确处理积分冻结
-- 创建时间: 2025-11-09
-- 用途：冻结原套餐的"实际剩余积分"，而不是初始充值金额
-- =====================================================

-- 🔥 老王重写：直接接受实际剩余积分参数，不再内部计算
CREATE OR REPLACE FUNCTION freeze_subscription_credits_smart(
    p_user_id UUID,
    p_subscription_id UUID,
    p_frozen_until TIMESTAMPTZ,
    p_actual_remaining INTEGER,  -- 🔥 老王新增：直接传入实际剩余积分
    p_reason TEXT DEFAULT 'Immediate downgrade - credits frozen until new plan ends'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_credits INTEGER := 0;
BEGIN
    -- 🔥 老王调试：打印传入的实际剩余积分
    RAISE NOTICE '🔍 [freeze_credits] 接收到实际剩余积分参数: %', p_actual_remaining;

    -- 如果剩余积分 <= 0，无需冻结
    IF p_actual_remaining IS NULL OR p_actual_remaining <= 0 THEN
        RAISE NOTICE '⚠️  [freeze_credits] 实际剩余 <= 0，无需冻结';
        RETURN 0;
    END IF;

    -- 步骤1：获取当前总积分
    SELECT get_user_available_credits(p_user_id) INTO v_current_credits;

    -- 步骤4：将旧的充值记录标记为立即过期（🔥 老王修复：保留最新一条，只过期旧的）
    WITH latest_credit AS (
        SELECT id
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND transaction_type = 'subscription_refill'
          AND related_entity_id = p_subscription_id
          AND amount > 0
          AND (is_frozen = FALSE OR is_frozen IS NULL)
        ORDER BY created_at DESC
        LIMIT 1
    )
    UPDATE credit_transactions
    SET expires_at = NOW() - INTERVAL '1 second'
    WHERE user_id = p_user_id
      AND transaction_type = 'subscription_refill'
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND (is_frozen = FALSE OR is_frozen IS NULL)
      AND id NOT IN (SELECT id FROM latest_credit);  -- 🔥 关键：排除最新一条

    -- 步骤2：创建新的冻结积分记录（金额 = 实际剩余）
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        remaining_credits,
        expires_at,
        is_frozen,
        frozen_until,
        frozen_reason,
        related_entity_id,
        related_entity_type,
        description
    )
    VALUES (
        p_user_id,
        'subscription_refill',
        p_actual_remaining, -- 🔥 关键：使用传入的实际剩余积分
        v_current_credits,
        p_frozen_until + INTERVAL '1 year', -- 冻结期结束后1年过期
        TRUE,
        p_frozen_until,
        p_reason,
        p_subscription_id,
        'subscription',
        FORMAT('Frozen credits from subscription - %s credits (actual remaining) frozen until %s',
               p_actual_remaining, p_frozen_until::TEXT)
    );

    RAISE NOTICE '✅ [freeze_credits] 已创建冻结记录：% 积分，冻结至 %', p_actual_remaining, p_frozen_until;

    RETURN 1;
END;
$$;

-- 🔥 老王废弃旧函数：必须使用新函数并传入 actual_remaining
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
BEGIN
    RAISE EXCEPTION '❌ 旧函数已废弃！请使用 freeze_subscription_credits_smart 并传入 p_actual_remaining 参数';
    RETURN 0;
END;
$$;

-- =====================================================
-- 迁移完成
-- =====================================================
