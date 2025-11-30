-- 积分系统修复脚本
-- 老王专用一键修复版本
-- 执行此脚本前请确保已执行 manual-setup-credits.sql

-- 1. 清理重复的订阅记录
-- 保留最新的订阅，删除旧的
DO $$
DECLARE
    v_user_id UUID := 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID;
    v_keep_subscription_id UUID;
BEGIN
    -- 获取最新的订阅ID
    SELECT id INTO v_keep_subscription_id
    FROM user_subscriptions
    WHERE user_id = v_user_id
        AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- 删除其他重复的订阅
    DELETE FROM user_subscriptions
    WHERE user_id = v_user_id
        AND id != v_keep_subscription_id;

    RAISE NOTICE '已删除重复订阅，保留订阅ID: %', v_keep_subscription_id;
END $$;

-- 2. 添加唯一约束防止未来重复订阅
-- 一个用户同一时间只能有一个生效的订阅
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_active_subscription
ON user_subscriptions(user_id)
WHERE status = 'active' AND expires_at > NOW();

-- 3. 更新充值函数（修正积分有效期逻辑）
CREATE OR REPLACE FUNCTION refill_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription RECORD;
    v_credits_to_add INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_description TEXT;
    v_current_balance INTEGER;
    v_is_first_refill BOOLEAN;
    v_bonus_credits INTEGER;
BEGIN
    -- 获取订阅信息
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE id = p_subscription_id
        AND user_id = p_user_id
        AND status = 'active'
        AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found or expired';
    END IF;

    -- 获取当前余额
    v_current_balance := get_user_available_credits(p_user_id);

    -- 检查是否已经有过充值记录
    SELECT NOT EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE user_id = p_user_id
            AND transaction_type IN ('subscription_refill', 'subscription_bonus')
            AND related_entity_id = p_subscription_id
    ) INTO v_is_first_refill;

    -- 年付首次开通：插入赠送积分（1年有效）
    IF v_subscription.billing_cycle = 'yearly' AND v_is_first_refill THEN
        v_bonus_credits := (v_subscription.monthly_credits * 12 * 0.2)::INTEGER;

        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            remaining_credits,
            expires_at,
            related_entity_id,
            related_entity_type,
            description
        )
        VALUES (
            p_user_id,
            'subscription_bonus',
            v_bonus_credits,
            v_current_balance + v_bonus_credits,
            NOW() + INTERVAL '1 year',
            p_subscription_id,
            'subscription',
            format('Yearly subscription bonus - %s plan (%s credits, valid for 1 year) / 年度订阅赠送 - %s套餐 (%s积分，1年有效)',
                v_subscription.plan_tier,
                v_bonus_credits,
                v_subscription.plan_tier,
                v_bonus_credits)
        );

        v_current_balance := v_current_balance + v_bonus_credits;
    END IF;

    -- 充值月度积分
    v_credits_to_add := v_subscription.monthly_credits;

    -- 所有订阅的月度积分都是30天有效（无论月付还是年付）
    v_expires_at := NOW() + INTERVAL '30 days';

    IF v_subscription.billing_cycle = 'yearly' THEN
        v_description := format(
            'Yearly subscription monthly refill - %s plan (%s credits, valid for 30 days) / 年度订阅月度充值 - %s套餐 (%s积分，30天有效)',
            v_subscription.plan_tier,
            v_credits_to_add,
            v_subscription.plan_tier,
            v_credits_to_add
        );
    ELSE
        v_description := format(
            'Monthly subscription refill - %s plan (%s credits, valid for 30 days) / 月度订阅充值 - %s套餐 (%s积分，30天有效)',
            v_subscription.plan_tier,
            v_credits_to_add,
            v_subscription.plan_tier,
            v_credits_to_add
        );
    END IF;

    -- 插入充值交易记录
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        remaining_credits,
        expires_at,
        related_entity_id,
        related_entity_type,
        description
    )
    VALUES (
        p_user_id,
        'subscription_refill',
        v_credits_to_add,
        v_current_balance + v_credits_to_add,
        v_expires_at,
        p_subscription_id,
        'subscription',
        v_description
    );

    -- 更新用户总积分
    INSERT INTO user_credits (user_id, total_credits)
    VALUES (p_user_id, v_current_balance + v_credits_to_add)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_credits = v_current_balance + v_credits_to_add,
        updated_at = NOW();

    -- 如果是月付，更新下次充值时间
    IF v_subscription.billing_cycle = 'monthly' THEN
        UPDATE user_subscriptions
        SET next_refill_at = started_at + ((EXTRACT(EPOCH FROM (NOW() - started_at)) / (30 * 86400))::INTEGER + 1) * INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = p_subscription_id;
    END IF;

END;
$$;

-- 4. 为用户充值正确的积分
-- Pro年付：1920赠送（1年有效）+ 800首月（30天有效）
DO $$
DECLARE
    v_user_id UUID := 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID;
    v_subscription_id UUID;
    v_plan_tier TEXT;
BEGIN
    -- 获取用户的生效订阅
    SELECT id, plan_tier INTO v_subscription_id, v_plan_tier
    FROM user_subscriptions
    WHERE user_id = v_user_id
        AND status = 'active'
        AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE NOTICE '用户没有生效的订阅，跳过积分充值';
        RETURN;
    END IF;

    -- 检查是否已经充值过
    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE user_id = v_user_id
            AND transaction_type IN ('subscription_refill', 'subscription_bonus')
            AND related_entity_id = v_subscription_id
    ) THEN
        RAISE NOTICE '该订阅已经充值过积分，跳过';
        RETURN;
    END IF;

    -- 执行充值
    PERFORM refill_subscription_credits(v_user_id, v_subscription_id);

    RAISE NOTICE '成功为用户 % 的 % 订阅充值积分', v_user_id, v_plan_tier;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '充值积分时出错: %', SQLERRM;
END $$;

-- 5. 验证结果
-- 查看用户的积分余额
SELECT
    user_id,
    total_credits,
    created_at,
    updated_at
FROM user_credits
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID;

-- 查看用户的积分交易记录
SELECT
    id,
    transaction_type,
    amount,
    remaining_credits,
    expires_at,
    description,
    created_at
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID
ORDER BY created_at DESC;

-- 查看用户的可用积分（排除过期的）
SELECT get_user_available_credits('bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID) AS available_credits;

-- 查看用户的订阅信息
SELECT
    id,
    plan_tier,
    monthly_credits,
    billing_cycle,
    status,
    started_at,
    expires_at,
    created_at
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'::UUID
ORDER BY created_at DESC;
