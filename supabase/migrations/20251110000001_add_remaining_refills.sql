-- 🔥 老王新增：年付订阅剩余充值次数追踪
-- 创建时间: 2025-11-10
-- 用途: 实现"积分过期触发下次充值"机制

-- 1. 添加剩余充值次数字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS remaining_refills INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_refill_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_refill_date TIMESTAMPTZ;

-- 2. 为字段添加注释
COMMENT ON COLUMN user_subscriptions.remaining_refills IS '剩余充值次数（年付12次，月付1次）';
COMMENT ON COLUMN user_subscriptions.last_refill_date IS '上次充值日期';
COMMENT ON COLUMN user_subscriptions.next_refill_date IS '下次充值触发日期（当前积分过期时间）';

-- 3. 创建自动充值检查函数
CREATE OR REPLACE FUNCTION check_and_refill_expired_subscriptions()
RETURNS TABLE (
    user_id UUID,
    subscription_id UUID,
    refilled_credits INTEGER,
    new_remaining_refills INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription RECORD;
    v_credits INTEGER;
    v_expiry_date TIMESTAMPTZ;
BEGIN
    -- 查找需要充值的订阅
    -- 条件：1) 订阅活跃 2) 有剩余次数 3) 已到触发时间
    FOR v_subscription IN
        SELECT
            us.id,
            us.user_id,
            us.plan_tier,
            us.billing_cycle,
            us.monthly_credits,
            us.remaining_refills,
            us.next_refill_date
        FROM user_subscriptions us
        WHERE us.status = 'active'
            AND us.remaining_refills > 0
            AND us.next_refill_date <= NOW()
        ORDER BY us.next_refill_date ASC
    LOOP
        -- 获取充值金额
        v_credits := v_subscription.monthly_credits;

        -- 计算过期时间（30天后）
        v_expiry_date := NOW() + INTERVAL '30 days';

        -- 充值积分
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            remaining_credits,
            related_entity_type,
            related_entity_id,
            expires_at,
            description
        ) VALUES (
            v_subscription.user_id,
            'subscription_refill',
            v_credits,
            v_credits,
            'subscription',
            v_subscription.id,
            v_expiry_date,
            format('Monthly auto-refill - %s %s (%s credits, valid for 30 days) / 月度自动充值 - %s套餐 (%s积分，30天有效)',
                v_subscription.plan_tier,
                v_subscription.billing_cycle,
                v_credits,
                CASE v_subscription.plan_tier
                    WHEN 'basic' THEN 'Basic'
                    WHEN 'pro' THEN 'Pro'
                    WHEN 'max' THEN 'Max'
                    ELSE v_subscription.plan_tier
                END,
                v_credits
            )
        );

        -- 更新订阅记录
        UPDATE user_subscriptions
        SET
            remaining_refills = remaining_refills - 1,
            last_refill_date = NOW(),
            next_refill_date = v_expiry_date,  -- 下次触发时间 = 本次积分过期时间
            updated_at = NOW()
        WHERE id = v_subscription.id;

        -- 记录到返回结果
        user_id := v_subscription.user_id;
        subscription_id := v_subscription.id;
        refilled_credits := v_credits;
        new_remaining_refills := v_subscription.remaining_refills - 1;

        RETURN NEXT;

        RAISE NOTICE '✅ 自动充值: user_id=%, credits=%, remaining_refills=%',
            v_subscription.user_id, v_credits, v_subscription.remaining_refills - 1;
    END LOOP;

    RETURN;
END;
$$;

COMMENT ON FUNCTION check_and_refill_expired_subscriptions IS '检查并自动充值到期订阅（由定时任务调用）';

-- 4. 更新现有订阅的初始值（仅针对已有的年付订阅）
UPDATE user_subscriptions
SET
    remaining_refills = CASE
        WHEN billing_cycle = 'yearly' THEN 11  -- 购买时已充值1次，剩余11次
        WHEN billing_cycle = 'monthly' THEN 0  -- 月付没有自动充值
        ELSE 0
    END,
    last_refill_date = created_at,
    next_refill_date = CASE
        WHEN billing_cycle = 'yearly' THEN
            -- 查找最近一次充值的过期时间
            (
                SELECT expires_at
                FROM credit_transactions
                WHERE user_id = user_subscriptions.user_id
                    AND related_entity_id = user_subscriptions.id
                    AND transaction_type = 'subscription_refill'
                ORDER BY created_at DESC
                LIMIT 1
            )
        ELSE NULL
    END
WHERE status = 'active'
    AND remaining_refills IS NULL;  -- 只更新还没设置的记录

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_refill
ON user_subscriptions (next_refill_date, status, remaining_refills)
WHERE status = 'active' AND remaining_refills > 0;

COMMENT ON INDEX idx_subscriptions_auto_refill IS '自动充值查询优化索引';
