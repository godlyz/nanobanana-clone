-- =====================================================
-- 🔥 老王的订阅表手动创建脚本
-- 使用方法：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制粘贴整个脚本
-- 4. 点击 Run 执行
-- =====================================================

-- 1. 创建 user_subscriptions 表
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 订阅计划: 'basic', 'pro', 'max'
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'max')),

    -- 计费周期: 'monthly', 'yearly'
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- 订阅状态: 'active', 'cancelled', 'expired', 'paused'
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),

    -- 订阅开始时间
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 订阅结束时间
    expires_at TIMESTAMPTZ NOT NULL,

    -- 下次充值时间 (仅月付)
    next_refill_at TIMESTAMPTZ,

    -- 每月积分额度
    monthly_credits INTEGER NOT NULL,

    -- 是否自动续费
    auto_renew BOOLEAN DEFAULT TRUE,

    -- Creem 订阅ID
    creem_subscription_id TEXT,

    -- 取消时间
    cancelled_at TIMESTAMPTZ,

    -- 取消原因
    cancellation_reason TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);

-- 3. 启用 RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略
CREATE POLICY "Users can view own subscriptions"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON user_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- 5. updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 触发器
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 创建 RPC 函数
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
-- 8. 🔥 插入测试订阅（一年专业版）
-- 注意：把下面的 'YOUR_USER_ID' 替换成你的真实用户ID
-- =====================================================

-- 方法1：如果你知道用户ID，直接插入
-- INSERT INTO user_subscriptions (
--     user_id,
--     plan_tier,
--     billing_cycle,
--     status,
--     started_at,
--     expires_at,
--     monthly_credits,
--     auto_renew
-- )
-- VALUES (
--     'YOUR_USER_ID'::UUID,
--     'pro',
--     'yearly',
--     'active',
--     NOW(),
--     NOW() + INTERVAL '1 year',
--     800,
--     TRUE
-- );

-- 方法2：为当前登录用户插入（在网站登录后在SQL Editor执行）
INSERT INTO user_subscriptions (
    user_id,
    plan_tier,
    billing_cycle,
    status,
    started_at,
    expires_at,
    monthly_credits,
    auto_renew
)
SELECT
    auth.uid(),
    'pro',
    'yearly',
    'active',
    NOW(),
    NOW() + INTERVAL '1 year',
    800,
    TRUE
WHERE auth.uid() IS NOT NULL; -- 确保已登录

-- =====================================================
-- 9. 验证结果
-- =====================================================

-- 查看所有订阅
SELECT * FROM user_subscriptions ORDER BY created_at DESC;

-- 查看当前用户的订阅
SELECT * FROM get_user_active_subscription(auth.uid());

-- =====================================================
-- 完成！
-- =====================================================
