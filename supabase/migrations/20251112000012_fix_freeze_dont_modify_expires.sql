-- =====================================================
-- 🔥 老王修复：冻结函数不修改旧包到期时间
-- 创建时间: 2025-11-12
-- 用途：
--   1. 修复 freeze_subscription_credits_smart 函数
--   2. 不修改任何现有包的 expires_at
--   3. 只创建新的冻结记录
-- =====================================================

-- 🔥 修复：删除修改旧包到期时间的逻辑
CREATE OR REPLACE FUNCTION freeze_subscription_credits_smart(
    p_user_id UUID,
    p_subscription_id UUID,
    p_frozen_until TIMESTAMPTZ,
    p_actual_remaining INTEGER,  -- 实际剩余积分（FIFO第一个包的剩余）
    p_reason TEXT DEFAULT 'Immediate upgrade/downgrade - credits frozen until new plan ends'
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

    -- 🔥 查询FIFO第一个包的过期时间（最早过期的未冻结充值包）
    SELECT expires_at
    INTO v_original_expires
    FROM credit_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'subscription_refill'
      AND related_entity_id = p_subscription_id
      AND amount > 0
      AND remaining_amount > 0
      AND (is_frozen = FALSE OR is_frozen IS NULL)
    ORDER BY expires_at ASC  -- FIFO：最早过期的
    LIMIT 1;

    -- 🔥 计算 frozen_remaining_seconds（剩余秒数）
    IF v_original_expires IS NOT NULL AND v_original_expires > NOW() THEN
        v_frozen_seconds := EXTRACT(EPOCH FROM (v_original_expires - NOW()))::INTEGER;
        RAISE NOTICE '⏰ [freeze_credits] FIFO第一个包原过期时间: %, 剩余秒数: %', v_original_expires, v_frozen_seconds;
    ELSE
        v_frozen_seconds := NULL;
        v_original_expires := NULL;
        RAISE NOTICE '⚠️  [freeze_credits] 无有效过期时间，不记录剩余秒数';
    END IF;

    -- 🔥 老王修复：不修改任何现有包的到期时间！
    -- 删除了原来的 UPDATE expires_at = NOW() - INTERVAL '1 second' 逻辑

    -- 🔥 只创建新的冻结积分记录
    -- 记录字段：
    --   - frozen_remaining_seconds: 冻结时的剩余秒数
    --   - original_expires_at: 原始过期时间
    --   - remaining_amount: 初始值 = amount
    --   - expires_at: 解冻后到期时间 = frozen_until + 剩余秒数
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        remaining_credits,
        remaining_amount,  -- 🔥 初始剩余 = amount
        expires_at,  -- 🔥 解冻后到期时间
        is_frozen,
        frozen_until,
        frozen_remaining_seconds,  -- 🔥 剩余秒数
        original_expires_at,  -- 🔥 原始过期时间
        frozen_reason,
        related_entity_id,
        related_entity_type,
        description
    )
    VALUES (
        p_user_id,
        'subscription_refill',
        p_actual_remaining,  -- 金额 = FIFO第一个包的剩余积分
        v_current_credits,
        p_actual_remaining,  -- 🔥 初始 remaining_amount = amount
        -- 🔥 解冻后到期时间 = frozen_until + 剩余秒数
        CASE
            WHEN v_frozen_seconds IS NOT NULL THEN
                p_frozen_until + (v_frozen_seconds || ' seconds')::INTERVAL
            ELSE
                p_frozen_until + INTERVAL '1 year'  -- 如果没有剩余秒数，默认+1年
        END,
        TRUE,  -- is_frozen
        p_frozen_until,  -- frozen_until
        v_frozen_seconds,  -- 剩余秒数
        v_original_expires,  -- 原始过期时间
        p_reason,
        p_subscription_id,
        'subscription',
        FORMAT('Frozen credits from subscription - %s credits (FIFO first package remaining) frozen until %s, remaining seconds: %s',
               p_actual_remaining, p_frozen_until::TEXT, COALESCE(v_frozen_seconds::TEXT, 'N/A'))
    );

    RAISE NOTICE '✅ [freeze_credits] 已创建冻结记录：% 积分，冻结至 %，剩余秒数: %，解冻后到期: %',
        p_actual_remaining, p_frozen_until, COALESCE(v_frozen_seconds::TEXT, 'N/A'),
        CASE
            WHEN v_frozen_seconds IS NOT NULL THEN
                (p_frozen_until + (v_frozen_seconds || ' seconds')::INTERVAL)::TEXT
            ELSE
                (p_frozen_until + INTERVAL '1 year')::TEXT
        END;

    RETURN 1;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION freeze_subscription_credits_smart IS '冻结订阅积分：只冻结FIFO第一个包的剩余，不修改现有包的到期时间';

-- =====================================================
-- 迁移完成
-- =====================================================
