-- 🔥 老王恢复脚本：删除降级测试数据，恢复Pro年付订阅
-- 创建时间: 2025-11-10
-- 用途: 清理immediate降级测试产生的数据，恢复原状态

DO $$
DECLARE
    v_user_id UUID := 'bfb8182a-6865-4c66-a89e-05711796e2b2';
    v_subscription_id UUID;
    v_current_credits INTEGER;
BEGIN
    -- 步骤1：获取当前订阅ID
    SELECT id INTO v_subscription_id
    FROM user_subscriptions
    WHERE user_id = v_user_id
        AND status = 'active'
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION '未找到活跃订阅';
    END IF;

    RAISE NOTICE '✅ 找到订阅ID: %', v_subscription_id;

    -- 步骤2：删除降级测试产生的积分交易记录
    -- 删除Basic月付的150积分充值（2025-11-10 14:57）
    DELETE FROM credit_transactions
    WHERE user_id = v_user_id
        AND transaction_type = 'subscription_refill'
        AND amount = 150
        AND description LIKE '%basic%'
        AND created_at >= '2025-11-10 00:00:00'::TIMESTAMPTZ;

    RAISE NOTICE '✅ 删除Basic月付150积分充值记录';

    -- 删除冻结的777积分记录
    DELETE FROM credit_transactions
    WHERE user_id = v_user_id
        AND is_frozen = TRUE
        AND amount = 777
        AND created_at >= '2025-11-10 00:00:00'::TIMESTAMPTZ;

    RAISE NOTICE '✅ 删除777积分冻结记录';

    -- 步骤3：恢复原Pro年付的800积分（取消过期标记）
    -- 找到被标记为过期的800积分记录（在冻结时被设置为 NOW() - 1秒）
    UPDATE credit_transactions
    SET expires_at = '2025-12-10 06:57:43.345+00'::TIMESTAMPTZ  -- 恢复原过期时间
    WHERE user_id = v_user_id
        AND transaction_type = 'subscription_refill'
        AND amount = 800
        AND related_entity_id = v_subscription_id
        AND expires_at < '2025-11-10 00:00:00'::TIMESTAMPTZ;  -- 被提前过期的记录

    RAISE NOTICE '✅ 恢复Pro年付800积分的原过期时间';

    -- 步骤4：更新订阅记录，恢复为Pro yearly
    UPDATE user_subscriptions
    SET
        plan_tier = 'pro',
        billing_cycle = 'yearly',
        monthly_credits = 800,
        expires_at = '2026-10-26 10:25:15.321985+00'::TIMESTAMPTZ,  -- 恢复原到期时间
        -- 🔥 老王修复：只清除确实存在的字段
        downgrade_to_plan = NULL,
        downgrade_to_billing_cycle = NULL,
        adjustment_mode = NULL,
        original_plan_expires_at = NULL,
        updated_at = NOW()
    WHERE id = v_subscription_id;

    RAISE NOTICE '✅ 订阅已恢复为Pro yearly';

    -- 步骤5：验证恢复结果
    SELECT get_user_available_credits(v_user_id) INTO v_current_credits;
    RAISE NOTICE '✅ 当前可用积分: %', v_current_credits;
    RAISE NOTICE '   预期: 2720 (1920 + 800)';
    RAISE NOTICE '   实际: %', v_current_credits;

    -- 最终状态检查
    RAISE NOTICE '';
    RAISE NOTICE '='.repeat(60);
    RAISE NOTICE '恢复完成！';
    RAISE NOTICE '订阅: Pro yearly';
    RAISE NOTICE '到期: 2026-10-26';
    RAISE NOTICE '可用积分: % (应为2720)', v_current_credits;
    RAISE NOTICE '='.repeat(60);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '恢复失败: %', SQLERRM;
END $$;

-- 最后验证：查询当前状态
SELECT
    '当前订阅' AS category,
    plan_tier,
    billing_cycle,
    expires_at,
    monthly_credits,
    downgrade_to_plan,
    adjustment_mode
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
    AND status = 'active';

SELECT
    '积分过期明细' AS category,
    expiry_date,
    remaining_credits
FROM get_user_credits_expiry_realtime('bfb8182a-6865-4c66-a89e-05711796e2b2');

SELECT
    '当前可用积分' AS category,
    get_user_available_credits('bfb8182a-6865-4c66-a89e-05711796e2b2') AS current_credits;
