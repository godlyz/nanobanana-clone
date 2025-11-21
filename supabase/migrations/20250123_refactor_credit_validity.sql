-- =====================================================
-- 积分有效期重构迁移
-- 创建时间: 2025-01-23
-- 描述: 重构积分有效期规则，新增订阅管理表
-- 新规则:
--   1. 注册赠送: 50积分，15天有效期
--   2. 积分包: 1年有效期（从购买时间算起）
--   3. 订阅月付: 每月充值，1年内有效
--   4. 订阅年付: 一次性充值12个月+赠送，1年有效
-- =====================================================

-- 1. 创建用户订阅表 (user_subscriptions)
-- 用途: 管理用户的订阅状态和历史
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 订阅计划: 'basic', 'pro', 'max'
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'max')),

    -- 计费周期: 'monthly', 'yearly'
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- 订阅状态: 'active', 'cancelled', 'expired', 'paused'
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),

    -- 订阅开始时间 (购买时间)
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 订阅结束时间 (根据billing_cycle计算)
    -- 月付: started_at + 1个月
    -- 年付: started_at + 1年
    expires_at TIMESTAMPTZ NOT NULL,

    -- 下次充值时间 (仅月付)
    -- 月付: 每月这个时间充值积分
    -- 年付: NULL (一次性充值)
    next_refill_at TIMESTAMPTZ,

    -- 每月积分额度
    monthly_credits INTEGER NOT NULL,

    -- 是否自动续费
    auto_renew BOOLEAN DEFAULT TRUE,

    -- Creem 订阅ID (用于支付集成)
    creem_subscription_id TEXT,

    -- 取消时间
    cancelled_at TIMESTAMPTZ,

    -- 取消原因
    cancellation_reason TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 user_subscriptions 创建索引
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_refill ON user_subscriptions(next_refill_at) WHERE next_refill_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);

-- user_subscriptions RLS 策略
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的订阅
CREATE POLICY "Users can view own subscriptions"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- 服务角色可以管理订阅
CREATE POLICY "Service role can manage subscriptions"
    ON user_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- user_subscriptions updated_at 触发器
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 2. 更新注册触发器函数 (改为15天有效期)
CREATE OR REPLACE FUNCTION grant_registration_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 插入用户积分记录
    INSERT INTO user_credits (user_id, total_credits)
    VALUES (NEW.id, 50)
    ON CONFLICT (user_id) DO NOTHING;

    -- 记录注册赠送交易 (改为15天有效期)
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        remaining_credits,
        expires_at,
        description
    )
    VALUES (
        NEW.id,
        'register_bonus',
        50,
        50,
        NOW() + INTERVAL '15 days', -- 🔥 改为15天有效期
        'Registration bonus - 50 credits (valid for 15 days) / 注册赠送 - 50积分 (15天有效)'
    );

    RETURN NEW;
END;
$$;

-- =====================================================

-- 3. 创建订阅充值函数 (处理月付和年付逻辑)
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

    -- 计算充值积分和有效期
    v_credits_to_add := v_subscription.monthly_credits;

    -- 所有订阅积分都是1年有效期 (从充值时间算起)
    v_expires_at := NOW() + INTERVAL '1 year';

    -- 生成描述
    IF v_subscription.billing_cycle = 'yearly' THEN
        v_description := format(
            'Yearly subscription refill - %s plan (%s credits for 12 months, valid for 1 year) / 年度订阅充值 - %s套餐 (12个月共%s积分，1年有效)',
            v_subscription.plan_tier,
            v_credits_to_add,
            v_subscription.plan_tier,
            v_credits_to_add
        );
    ELSE
        v_description := format(
            'Monthly subscription refill - %s plan (%s credits, valid for 1 year) / 月度订阅充值 - %s套餐 (每月%s积分，1年有效)',
            v_subscription.plan_tier,
            v_subscription.monthly_credits,
            v_subscription.plan_tier,
            v_subscription.monthly_credits
        );
    END IF;

    -- 获取当前余额
    v_current_balance := get_user_available_credits(p_user_id);

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
    UPDATE user_credits
    SET total_credits = v_current_balance + v_credits_to_add,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 如果是月付，更新下次充值时间
    IF v_subscription.billing_cycle = 'monthly' THEN
        UPDATE user_subscriptions
        SET next_refill_at = started_at + ((EXTRACT(EPOCH FROM (NOW() - started_at)) / (30 * 86400))::INTEGER + 1) * INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = p_subscription_id;
    END IF;

END;
$$;

-- =====================================================

-- 4. 创建定时任务函数 (每天执行一次，检查需要充值的月付订阅)
CREATE OR REPLACE FUNCTION process_monthly_subscription_refills()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    -- 查找所有需要充值的月付订阅
    FOR v_subscription IN
        SELECT id, user_id
        FROM user_subscriptions
        WHERE status = 'active'
            AND billing_cycle = 'monthly'
            AND next_refill_at IS NOT NULL
            AND next_refill_at <= NOW()
            AND expires_at > NOW()
    LOOP
        -- 执行充值
        BEGIN
            PERFORM refill_subscription_credits(v_subscription.user_id, v_subscription.id);

            RAISE NOTICE 'Successfully refilled credits for subscription %', v_subscription.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to refill credits for subscription %: %', v_subscription.id, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- =====================================================

-- 5. 创建年付赠送积分计算函数
-- 年付赠送积分 = (月付价格 × 12 - 年付价格) / 每积分价格
-- 简化计算: 年付比月付优惠的部分转换为积分
CREATE OR REPLACE FUNCTION calculate_yearly_bonus_credits(
    p_plan_tier VARCHAR,
    p_monthly_credits INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_bonus_percentage DECIMAL := 0.20; -- 年付赠送20%积分
BEGIN
    -- 根据套餐计算赠送积分
    RETURN (p_monthly_credits * 12 * v_bonus_percentage)::INTEGER;
END;
$$;

-- =====================================================

-- 6. 创建获取用户订阅信息的函数
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    plan_tier VARCHAR,
    billing_cycle VARCHAR,
    status VARCHAR,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    next_refill_at TIMESTAMPTZ,
    monthly_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.plan_tier,
        s.billing_cycle,
        s.status,
        s.started_at,
        s.expires_at,
        s.next_refill_at,
        s.monthly_credits
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND s.expires_at > NOW()
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$;

-- =====================================================

-- 7. 更新积分包有效期注释 (代码中已体现，这里只是文档说明)
COMMENT ON COLUMN credit_transactions.expires_at IS '过期时间规则:
- 注册赠送: NOW() + 15天
- 订阅充值: NOW() + 1年 (所有订阅积分)
- 积分包: NOW() + 1年 (从购买时间算起)
- 消费扣减: NULL (负数交易无过期时间)';

-- =====================================================
-- 迁移完成
-- =====================================================
