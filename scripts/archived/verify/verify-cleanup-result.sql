-- 🔍 老王验证脚本：查看清理后的完整状态

-- 1. 当前可用积分
SELECT
    '📊 当前可用积分' AS "检查项",
    get_user_available_credits('bfb8182a-6865-4c66-a89e-05711796e2b2') AS "积分数",
    '预期: 2697 (2720-23)' AS "预期值"
;

-- 2. 订阅状态
SELECT
    '📋 订阅状态' AS "检查项",
    plan_tier AS "套餐",
    billing_cycle AS "计费周期",
    monthly_credits AS "月度配额",
    expires_at::DATE AS "到期日期",
    CASE
        WHEN downgrade_to_plan IS NULL THEN '✅ 正常'
        ELSE '⚠️ 有降级标记'
    END AS "状态"
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
    AND status = 'active';

-- 3. 积分过期明细
SELECT
    '📅 积分过期明细' AS "检查项",
    expiry_date::DATE AS "过期日期",
    remaining_credits AS "剩余积分"
FROM get_user_credits_expiry_realtime('bfb8182a-6865-4c66-a89e-05711796e2b2')
ORDER BY expiry_date;

-- 4. 检查是否还有测试数据残留
SELECT
    '🔍 测试数据残留检查' AS "检查项",
    COUNT(*) FILTER (WHERE amount = 150 AND created_at >= '2025-11-10') AS "150积分记录数",
    COUNT(*) FILTER (WHERE is_frozen = TRUE AND created_at >= '2025-11-10') AS "冻结积分记录数",
    COUNT(*) FILTER (WHERE amount = 800 AND expires_at < NOW() AND created_at < '2025-11-10') AS "过期的800积分数",
    CASE
        WHEN COUNT(*) FILTER (WHERE amount = 150 AND created_at >= '2025-11-10') = 0
             AND COUNT(*) FILTER (WHERE is_frozen = TRUE AND created_at >= '2025-11-10') = 0
             AND COUNT(*) FILTER (WHERE amount = 800 AND expires_at < NOW() AND created_at < '2025-11-10') = 0
        THEN '✅ 清理干净'
        ELSE '⚠️ 仍有残留'
    END AS "清理状态"
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2';

-- 5. 最近5条积分充值记录（应该看不到测试的150积分）
SELECT
    '💰 最近充值记录' AS "检查项",
    amount AS "金额",
    expires_at::DATE AS "过期日期",
    is_frozen AS "是否冻结",
    description AS "描述",
    created_at::TIMESTAMP AS "创建时间"
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
    AND transaction_type = 'subscription_refill'
ORDER BY created_at DESC
LIMIT 5;
