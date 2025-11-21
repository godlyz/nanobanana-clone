-- =====================================================
-- 🔥 老王重构：条件延长冻结时间 + 更新冻结函数
-- 创建时间: 2025-11-11
-- 用途：
--   1. 创建 extend_frozen_credits_if_immediate 函数（条件延长冻结时间）
--   2. 更新 freeze_subscription_credits_smart 函数（记录剩余秒数）
-- =====================================================

-- 🔥 步骤1：创建条件延长冻结时间函数
-- 功能：如果是即时调整，延长冻结时间；如果是后续调整，不延长
CREATE OR REPLACE FUNCTION extend_frozen_credits_if_immediate(
    p_user_id UUID,
    p_subscription_id UUID,
    p_new_frozen_until TIMESTAMPTZ,
    p_is_immediate BOOLEAN  -- 🔥 关键参数：是否是即时调整
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_extended_count INTEGER := 0;
BEGIN
    IF p_is_immediate THEN
        RAISE NOTICE '🔄 [extend_freeze] 即时调整模式：延长冻结时间至 %', p_new_frozen_until;

        -- 更新所有该订阅的冻结记录的 frozen_until
        UPDATE credit_transactions
        SET frozen_until = p_new_frozen_until
        WHERE user_id = p_user_id
          AND related_entity_id = p_subscription_id
          AND is_frozen = TRUE
          AND frozen_until IS NOT NULL;

        GET DIAGNOSTICS v_extended_count = ROW_COUNT;

        RAISE NOTICE '✅ [extend_freeze] 已延长 % 条冻结记录的冻结时间', v_extended_count;
    ELSE
        RAISE NOTICE '⏭️  [extend_freeze] 后续调整模式：不延长冻结时间，保持原解冻时间';
        v_extended_count := 0;
    END IF;

    RETURN v_extended_count;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION extend_frozen_credits_if_immediate IS '条件延长冻结时间：即时调整延长frozen_until，后续调整不延长';

-- =====================================================

-- 🔥 步骤2：更新 freeze_subscription_credits_smart 函数
-- 新增功能：记录 frozen_remaining_seconds 和 original_expires_at
CREATE OR REPLACE FUNCTION freeze_subscription_credits_smart(
    p_user_id UUID,
    p_subscription_id UUID,
    p_frozen_until TIMESTAMPTZ,
    p_actual_remaining INTEGER,  -- 实际剩余积分
    p_reason TEXT DEFAULT 'Immediate downgrade - credits frozen until new plan ends'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_credits INTEGER := 0;
    v_original_expires TIMESTAMPTZ;
    v_frozen_seconds INTEGER;
BEGIN
    RAISE NOTICE '🔍 [freeze_credits] 接收到实际剩余积分参数: %', p_actual_remaining;

    -- 如果剩余积分 <= 0，无需冻结
    IF p_actual_remaining IS NULL OR p_actual_remaining <= 0 THEN
        RAISE NOTICE '⚠️  [freeze_credits] 实际剩余 <= 0，无需冻结';
        RETURN 0;
    END IF;

    -- 获取当前总积分
    SELECT get_user_available_credits(p_user_id) INTO v_current_credits;

    -- 🔥 新增：查询最新一条未冻结的充值记录的过期时间
    -- 用于计算 frozen_remaining_seconds
    SELECT expires_at
    INTO v_original_expires
    FROM credit_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'subscription_refill'
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND (is_frozen = FALSE OR is_frozen IS NULL)
    ORDER BY created_at DESC
    LIMIT 1;

    -- 🔥 新增：计算 frozen_remaining_seconds（按秒）
    -- frozen_remaining_seconds = (expires_at - NOW()) 的秒数
    IF v_original_expires IS NOT NULL AND v_original_expires > NOW() THEN
        v_frozen_seconds := EXTRACT(EPOCH FROM (v_original_expires - NOW()))::INTEGER;
        RAISE NOTICE '⏰ [freeze_credits] 原过期时间: %, 剩余秒数: %', v_original_expires, v_frozen_seconds;
    ELSE
        v_frozen_seconds := NULL;
        v_original_expires := NULL;
        RAISE NOTICE '⚠️  [freeze_credits] 无有效过期时间，不记录剩余秒数';
    END IF;

    -- 步骤1：将旧的充值记录标记为立即过期（保留最新一条，只过期旧的）
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
      AND id NOT IN (SELECT id FROM latest_credit);

    -- 步骤2：创建新的冻结积分记录（金额 = 实际剩余）
    -- 🔥 新增字段：
    --   - frozen_remaining_seconds: 冻结时的剩余秒数
    --   - original_expires_at: 原始过期时间
    --   - remaining_amount: 初始值 = amount
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        remaining_credits,
        remaining_amount,  -- 🔥 新增：初始剩余 = amount
        expires_at,
        is_frozen,
        frozen_until,
        frozen_remaining_seconds,  -- 🔥 新增：剩余秒数
        original_expires_at,  -- 🔥 新增：原始过期时间
        frozen_reason,
        related_entity_id,
        related_entity_type,
        description
    )
    VALUES (
        p_user_id,
        'subscription_refill',
        p_actual_remaining,  -- 金额 = 实际剩余
        v_current_credits,
        p_actual_remaining,  -- 🔥 初始 remaining_amount = amount
        p_frozen_until + INTERVAL '1 year',  -- 冻结期结束后1年过期
        TRUE,
        p_frozen_until,
        v_frozen_seconds,  -- 🔥 记录剩余秒数
        v_original_expires,  -- 🔥 记录原始过期时间
        p_reason,
        p_subscription_id,
        'subscription',
        FORMAT('Frozen credits from subscription - %s credits (actual remaining) frozen until %s, remaining seconds: %s',
               p_actual_remaining, p_frozen_until::TEXT, COALESCE(v_frozen_seconds::TEXT, 'N/A'))
    );

    RAISE NOTICE '✅ [freeze_credits] 已创建冻结记录：% 积分，冻结至 %，剩余秒数: %',
        p_actual_remaining, p_frozen_until, COALESCE(v_frozen_seconds::TEXT, 'N/A');

    RETURN 1;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION freeze_subscription_credits_smart IS '冻结订阅积分：记录实际剩余、剩余秒数、原始过期时间';

-- =====================================================
-- 迁移完成
-- =====================================================
