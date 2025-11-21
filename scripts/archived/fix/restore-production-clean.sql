-- 🔥 老王生产环境清理脚本：删除测试污染数据
-- 创建时间: 2025-11-10
-- 用途: 清理生产环境中的测试数据（150积分 + 冻结的800积分）
-- 目标: 恢复到原始状态（2720总积分，已用23，剩余2697可用）

DO $$
DECLARE
    v_user_id UUID := 'bfb8182a-6865-4c66-a89e-05711796e2b2';
    v_subscription_id UUID;
    v_current_credits INTEGER;
    v_deleted_150 INTEGER := 0;
    v_deleted_frozen INTEGER := 0;
    v_restored_800 INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔥 开始清理生产环境测试数据...';
    RAISE NOTICE '============================================================';

    -- 步骤1：查看清理前状态
    SELECT get_user_available_credits(v_user_id) INTO v_current_credits;
    RAISE NOTICE '清理前可用积分: %', v_current_credits;

    -- 步骤2：查询当前订阅ID
    SELECT id INTO v_subscription_id
    FROM user_subscriptions
    WHERE user_id = v_user_id
        AND status = 'active'
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION '❌ 未找到活跃订阅';
    END IF;

    RAISE NOTICE '✅ 找到订阅ID: %', v_subscription_id;

    -- 步骤3：删除测试产生的150积分（Basic月付）
    -- 特征：amount=150, description包含'basic', 创建时间在2025-11-10之后
    DELETE FROM credit_transactions
    WHERE user_id = v_user_id
        AND transaction_type = 'subscription_refill'
        AND amount = 150
        AND (
            description ILIKE '%basic%'
            OR description ILIKE '%测试%'
            OR description ILIKE '%test%'
        )
        AND created_at >= '2025-11-10 00:00:00'::TIMESTAMPTZ;

    GET DIAGNOSTICS v_deleted_150 = ROW_COUNT;
    RAISE NOTICE '✅ 删除150积分测试记录: % 条', v_deleted_150;

    -- 步骤4：删除冻结的积分记录
    -- 特征：is_frozen=TRUE, 创建时间在2025-11-10之后
    DELETE FROM credit_transactions
    WHERE user_id = v_user_id
        AND is_frozen = TRUE
        AND created_at >= '2025-11-10 00:00:00'::TIMESTAMPTZ;

    GET DIAGNOSTICS v_deleted_frozen = ROW_COUNT;
    RAISE NOTICE '✅ 删除冻结积分记录: % 条', v_deleted_frozen;

    -- 步骤5：恢复被提前过期的800积分
    -- 特征：amount=800, expires_at被设置为过去时间（冻结操作会设置为NOW()-1秒）
    UPDATE credit_transactions
    SET expires_at = (
        -- 根据创建时间推算原始过期时间
        CASE
            -- 如果是Pro yearly，过期时间应该是创建时间+1年
            WHEN transaction_type = 'subscription_refill' THEN created_at + INTERVAL '1 year'
            ELSE expires_at  -- 保持原值
        END
    )
    WHERE user_id = v_user_id
        AND transaction_type = 'subscription_refill'
        AND amount = 800
        AND expires_at < NOW()  -- 已经过期的记录
        AND created_at < '2025-11-10 00:00:00'::TIMESTAMPTZ;  -- 只恢复旧记录

    GET DIAGNOSTICS v_restored_800 = ROW_COUNT;
    RAISE NOTICE '✅ 恢复800积分过期时间: % 条', v_restored_800;

    -- 步骤6：清除订阅表中的测试字段
    UPDATE user_subscriptions
    SET
        downgrade_to_plan = NULL,
        downgrade_to_billing_cycle = NULL,
        adjustment_mode = NULL,
        original_plan_expires_at = NULL,
        updated_at = NOW()
    WHERE id = v_subscription_id
        AND (
            downgrade_to_plan IS NOT NULL
            OR adjustment_mode IS NOT NULL
        );

    RAISE NOTICE '✅ 清除订阅表测试字段';

    -- 步骤7：验证清理结果
    SELECT get_user_available_credits(v_user_id) INTO v_current_credits;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🎉 清理完成！';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '操作统计:';
    RAISE NOTICE '  - 删除150积分测试记录: % 条', v_deleted_150;
    RAISE NOTICE '  - 删除冻结积分记录: % 条', v_deleted_frozen;
    RAISE NOTICE '  - 恢复800积分: % 条', v_restored_800;
    RAISE NOTICE '';
    RAISE NOTICE '清理后可用积分: %', v_current_credits;
    RAISE NOTICE '预期可用积分: 2697 (2720总积分 - 23已用)';
    RAISE NOTICE '';

    IF v_current_credits BETWEEN 2690 AND 2700 THEN
        RAISE NOTICE '✅ 积分正常！误差在合理范围内';
    ELSE
        RAISE NOTICE '⚠️  积分可能仍有问题，请检查明细';
    END IF;

    RAISE NOTICE '============================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ 清理失败: %', SQLERRM;
END $$;

-- 最后验证：查询当前状态
SELECT
    '当前订阅状态' AS info,
    plan_tier,
    billing_cycle,
    monthly_credits,
    expires_at,
    downgrade_to_plan,
    adjustment_mode
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
    AND status = 'active';

SELECT '积分过期明细' AS info;
SELECT
    expiry_date,
    remaining_credits
FROM get_user_credits_expiry_realtime('bfb8182a-6865-4c66-a89e-05711796e2b2');

SELECT '最近的积分交易' AS info;
SELECT
    transaction_type,
    amount,
    remaining_credits,
    expires_at,
    is_frozen,
    description,
    created_at
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
ORDER BY created_at DESC
LIMIT 10;
