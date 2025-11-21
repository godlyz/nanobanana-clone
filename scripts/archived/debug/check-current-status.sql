-- 🔍 老王诊断脚本：查看当前订阅和积分状态

-- 1. 查看当前订阅记录
SELECT
    id,
    user_id,
    plan_tier,
    billing_cycle,
    monthly_credits,
    created_at,
    expires_at,
    status,
    downgrade_to_plan,
    downgrade_to_billing_cycle,
    adjustment_mode,
    original_plan_expires_at
FROM user_subscriptions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
    AND status = 'active'
ORDER BY created_at DESC;

-- 2. 查看所有积分交易记录
SELECT
    id,
    transaction_type,
    amount,
    remaining_credits,
    expires_at,
    is_frozen,
    frozen_until,
    frozen_reason,
    description,
    created_at
FROM credit_transactions
WHERE user_id = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
ORDER BY created_at DESC
LIMIT 20;

-- 3. 查看实时积分过期明细
SELECT * FROM get_user_credits_expiry_realtime('bfb8182a-6865-4c66-a89e-05711796e2b2');

-- 4. 查看当前可用积分
SELECT get_user_available_credits('bfb8182a-6865-4c66-a89e-05711796e2b2') as current_credits;
