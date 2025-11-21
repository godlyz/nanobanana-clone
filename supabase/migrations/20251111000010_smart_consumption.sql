-- =====================================================
-- 🔥 老王重构：智能消费函数（FIFO + 按包扣减）
-- 创建时间: 2025-11-11
-- 用途：
--   1. 实现 FIFO 消费策略（优先消耗最早过期的包）
--   2. 按包扣减 remaining_amount
--   3. 创建消费记录并关联 consumed_from_id
--   4. 更新 get_user_available_credits 使用 remaining_amount
-- =====================================================

-- 🔥 步骤1：创建智能消费函数
-- 功能：按 FIFO 策略消费积分，更新 remaining_amount，创建消费记录
CREATE OR REPLACE FUNCTION consume_credits_smart(
    p_user_id UUID,
    p_amount INTEGER,  -- 需要消费的积分数
    p_transaction_type VARCHAR(50),  -- 消费类型（text_to_image, image_to_image）
    p_related_entity_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    consumed INTEGER,
    insufficient BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_credits INTEGER := 0;
    v_remaining_to_consume INTEGER := p_amount;
    v_package RECORD;
    v_consume_from_package INTEGER := 0;
    v_consumed_total INTEGER := 0;
    v_final_remaining INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 [consume_credits] 开始消费: 用户=%, 需要=%积分', p_user_id, p_amount;

    -- 🔥 步骤1：检查可用积分是否足够
    SELECT get_user_available_credits(p_user_id) INTO v_available_credits;
    RAISE NOTICE '📊 [consume_credits] 当前可用积分: %', v_available_credits;

    IF v_available_credits < p_amount THEN
        RAISE NOTICE '❌ [consume_credits] 积分不足: 需要% 但只有%', p_amount, v_available_credits;
        RETURN QUERY SELECT FALSE, 0, TRUE, FORMAT('积分不足：需要%s积分，可用%s积分', p_amount, v_available_credits);
        RETURN;
    END IF;

    -- 🔥 步骤2：按 FIFO 策略查询可用积分包（按过期时间升序）
    -- 规则：
    --   1. remaining_amount > 0（有剩余）
    --   2. 未过期 (expires_at IS NULL OR expires_at > NOW())
    --   3. 未冻结 (is_frozen = FALSE OR is_frozen IS NULL OR frozen_until < NOW())
    --   4. 按 expires_at ASC 排序（NULL 排最后，先消耗最早过期的）
    FOR v_package IN
        SELECT
            id,
            amount,
            remaining_amount,
            expires_at,
            transaction_type
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND remaining_amount > 0
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (
              is_frozen IS NULL
              OR is_frozen = FALSE
              OR frozen_until < NOW()
          )
        ORDER BY
            CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,  -- NULL 排最后
            expires_at ASC  -- 最早过期的排最前
    LOOP
        -- 计算从当前包消费多少
        v_consume_from_package := LEAST(v_remaining_to_consume, v_package.remaining_amount);

        RAISE NOTICE '💳 [consume_credits] 从包 % 消费 % 积分（剩余: % → %）',
            v_package.id,
            v_consume_from_package,
            v_package.remaining_amount,
            v_package.remaining_amount - v_consume_from_package;

        -- 更新包的 remaining_amount
        UPDATE credit_transactions
        SET remaining_amount = remaining_amount - v_consume_from_package
        WHERE id = v_package.id;

        -- 创建消费记录（关联到这个包）
        -- 注意：amount 为负数，remaining_amount = 0
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            remaining_credits,
            remaining_amount,  -- 🔥 消费记录的 remaining_amount = 0
            consumed_from_id,  -- 🔥 关联到被消费的包
            expires_at,
            related_entity_id,
            description
        )
        VALUES (
            p_user_id,
            p_transaction_type,
            -v_consume_from_package,  -- 负数表示消费
            v_available_credits - v_consumed_total - v_consume_from_package,  -- 剩余可用
            0,  -- 消费记录不持有积分
            v_package.id,  -- 关联到被消费的包
            NULL,  -- 消费记录无过期时间
            p_related_entity_id,
            COALESCE(p_description,
                     FORMAT('消费%s积分（从%s包扣除）', v_consume_from_package, v_package.transaction_type))
        );

        -- 更新累计消费量
        v_consumed_total := v_consumed_total + v_consume_from_package;
        v_remaining_to_consume := v_remaining_to_consume - v_consume_from_package;

        -- 如果已经消费够了，退出循环
        EXIT WHEN v_remaining_to_consume <= 0;
    END LOOP;

    -- 🔥 步骤3：检查是否全部消费成功
    IF v_consumed_total < p_amount THEN
        RAISE NOTICE '⚠️  [consume_credits] 消费未完成: 需要% 但只消费了%', p_amount, v_consumed_total;
        RETURN QUERY SELECT FALSE, v_consumed_total, TRUE, FORMAT('积分不足：需要%s积分，只消费了%s积分', p_amount, v_consumed_total);
        RETURN;
    END IF;

    -- 🔥 步骤4：计算最终剩余积分
    v_final_remaining := v_available_credits - v_consumed_total;

    RAISE NOTICE '✅ [consume_credits] 消费成功: 消费%积分, 剩余%积分', v_consumed_total, v_final_remaining;

    RETURN QUERY SELECT TRUE, v_consumed_total, FALSE, FORMAT('成功消费%s积分，剩余%s积分', v_consumed_total, v_final_remaining);
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION consume_credits_smart IS '智能消费积分：FIFO策略，按包扣减remaining_amount，创建消费记录并关联consumed_from_id';

-- =====================================================

-- 🔥 步骤2：更新 get_user_available_credits 函数
-- 改为使用 remaining_amount 而不是 amount
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 🔥 老王修复：可用积分 = SUM(remaining_amount)
    -- 条件：
    --   1. remaining_amount > 0
    --   2. 未过期 (expires_at IS NULL OR expires_at > NOW())
    --   3. 未冻结 (is_frozen = FALSE OR is_frozen IS NULL OR frozen_until < NOW())
    SELECT COALESCE(
        SUM(remaining_amount),
        0
    )
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id
      AND remaining_amount > 0  -- 🔥 关键：只计算有剩余的包
      AND (expires_at IS NULL OR expires_at > NOW())  -- 排除已过期
      AND (
          is_frozen IS NULL  -- 未冻结
          OR is_frozen = FALSE  -- 明确标记为未冻结
          OR frozen_until < NOW()  -- 冻结期已结束
      );

    RETURN GREATEST(available_credits, 0); -- 确保不返回负数
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION get_user_available_credits IS '计算用户可用积分：SUM(remaining_amount) 而不是 amount，只计算未过期、未冻结的包';

-- =====================================================
-- 迁移完成
-- =====================================================
