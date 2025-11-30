-- =====================================================
-- 老王的积分系统手动创建脚本
-- 使用方法：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制粘贴整个脚本
-- 4. 点击 Run 执行
-- =====================================================

-- 前置条件检查：确保 update_updated_at_column() 函数存在
-- 如果之前已经执行过订阅表脚本，这个函数应该已经存在了

-- 1. 创建用户积分表 (user_credits)
-- 用途: 存储用户的总积分余额 (实时汇总)
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- 总可用积分 (实时计算汇总,包含未过期的所有积分)
    total_credits INTEGER NOT NULL DEFAULT 0 CHECK (total_credits >= 0),

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 user_credits 创建索引
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- user_credits RLS 策略
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略（避免重复创建错误）
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can update credits" ON user_credits;

-- 用户只能查看自己的积分
CREATE POLICY "Users can view own credits"
    ON user_credits FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能插入自己的积分记录 (注册时创建)
CREATE POLICY "Users can insert own credits"
    ON user_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 服务角色可以更新积分 (用于积分充值和扣减)
CREATE POLICY "Service role can update credits"
    ON user_credits FOR UPDATE
    USING (auth.role() = 'service_role');

-- user_credits updated_at 触发器
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 2. 创建积分交易记录表 (credit_transactions)
-- 用途: 记录所有积分变动的流水账,支持审计和历史查询
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 交易类型
    -- 'register_bonus' - 注册赠送
    -- 'subscription_refill' - 订阅月度充值
    -- 'package_purchase' - 积分包购买
    -- 'text_to_image' - 文生图消费
    -- 'image_to_image' - 图生图消费
    -- 'admin_adjustment' - 管理员调整
    -- 'refund' - 退款
    transaction_type VARCHAR(50) NOT NULL,

    -- 积分变动量 (正数=增加, 负数=扣减)
    amount INTEGER NOT NULL,

    -- 操作后剩余可用积分 (快照,用于快速查询)
    remaining_credits INTEGER NOT NULL CHECK (remaining_credits >= 0),

    -- 过期时间 (NULL=永久有效)
    -- 注册赠送: NOW() + 15天
    -- 订阅充值: NOW() + 1年
    -- 积分包: NOW() + 1年
    expires_at TIMESTAMPTZ,

    -- 关联实体ID (用于追溯来源)
    related_entity_id UUID,
    -- 关联实体类型: 'subscription', 'order', 'generation', 'admin'
    related_entity_type VARCHAR(50),

    -- 描述信息 (中英文双语)
    description TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 credit_transactions 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_expires_at ON credit_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- credit_transactions RLS 策略
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON credit_transactions;

-- 用户只能查看自己的交易记录
CREATE POLICY "Users can view own transactions"
    ON credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- 服务角色可以插入交易记录 (用于所有积分操作)
CREATE POLICY "Service role can insert transactions"
    ON credit_transactions FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================

-- 3. 创建积分包产品表 (credit_packages)
-- 用途: 管理可购买的积分包产品配置
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 产品代码 (唯一标识)
    package_code VARCHAR(50) UNIQUE NOT NULL,

    -- 产品名称 (中英文)
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255) NOT NULL,

    -- 产品描述 (中英文)
    description_en TEXT,
    description_zh TEXT,

    -- 积分数量
    credits INTEGER NOT NULL CHECK (credits > 0),

    -- 价格 (USD和CNY)
    price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
    price_cny DECIMAL(10,2) NOT NULL CHECK (price_cny > 0),

    -- Creem产品ID (用于支付集成)
    creem_product_id TEXT NOT NULL,

    -- 状态 (是否启用)
    is_active BOOLEAN DEFAULT TRUE,

    -- 排序顺序 (越小越靠前)
    sort_order INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 credit_packages 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_packages_code ON credit_packages(package_code);
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_credit_packages_sort ON credit_packages(sort_order);

-- credit_packages RLS 策略
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Anyone can view active packages" ON credit_packages;
DROP POLICY IF EXISTS "Service role can manage packages" ON credit_packages;

-- 所有人都可以查看启用的积分包
CREATE POLICY "Anyone can view active packages"
    ON credit_packages FOR SELECT
    USING (is_active = TRUE);

-- 只有服务角色可以管理积分包
CREATE POLICY "Service role can manage packages"
    ON credit_packages FOR ALL
    USING (auth.role() = 'service_role');

-- credit_packages updated_at 触发器
DROP TRIGGER IF EXISTS update_credit_packages_updated_at ON credit_packages;
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 4. 插入初始积分包数据
-- 注意: Creem Product ID 使用占位符，实际使用需要替换
INSERT INTO credit_packages (package_code, name_en, name_zh, description_en, description_zh, credits, price_usd, price_cny, creem_product_id, sort_order)
VALUES
    (
        'starter',
        'Starter Pack',
        '入门包',
        'Perfect for light use and trial',
        '适合轻度使用和体验',
        100,
        9.90,
        69.90,
        'CREEM_STARTER_PRODUCT_ID',
        1
    ),
    (
        'growth',
        'Growth Pack',
        '成长包',
        'Great for moderate users',
        '适合中度使用',
        500,
        39.90,
        279.90,
        'CREEM_GROWTH_PRODUCT_ID',
        2
    ),
    (
        'professional',
        'Professional Pack',
        '专业包',
        'Ideal for professional users',
        '适合专业用户',
        1200,
        79.90,
        559.90,
        'CREEM_PROFESSIONAL_PRODUCT_ID',
        3
    ),
    (
        'enterprise',
        'Enterprise Pack',
        '企业包',
        'Perfect for teams and businesses',
        '适合团队和企业',
        5000,
        299.90,
        2099.90,
        'CREEM_ENTERPRISE_PRODUCT_ID',
        4
    )
ON CONFLICT (package_code) DO NOTHING; -- 避免重复插入

-- =====================================================

-- 5. 创建用户注册触发器函数 (自动赠送50积分，15天有效)
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

    -- 记录注册赠送交易 (15天有效期)
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
        NOW() + INTERVAL '15 days', -- 15天有效期
        'Registration bonus - 50 credits (valid for 15 days) / 注册赠送 - 50积分 (15天有效)'
    );

    RETURN NEW;
END;
$$;

-- 创建触发器 (用户注册后自动执行)
DROP TRIGGER IF EXISTS on_user_created_grant_credits ON auth.users;
CREATE TRIGGER on_user_created_grant_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION grant_registration_credits();

-- =====================================================

-- 6. 创建获取用户可用积分的函数 (考虑过期时间)
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 计算用户的可用积分 (排除已过期的积分)
    -- 策略: 汇总所有未过期的正向交易 - 所有负向交易
    SELECT COALESCE(
        SUM(CASE
            WHEN amount > 0 AND (expires_at IS NULL OR expires_at > NOW()) THEN amount
            WHEN amount < 0 THEN amount
            ELSE 0
        END),
        0
    )
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id;

    RETURN GREATEST(available_credits, 0); -- 确保不返回负数
END;
$$;

-- =====================================================

-- 7. 创建订阅充值函数 (处理月付和年付逻辑)
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

-- =====================================================

-- 8. 为当前用户的订阅充值积分
-- 注意：这会查找当前登录用户的生效订阅并自动充值
-- 年付订阅：赠送积分（1年有效）+ 首月积分（30天有效）
-- 月付订阅：首月积分（30天有效）

DO $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_current_balance INTEGER;
BEGIN
    -- 获取当前登录用户ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE NOTICE '当前没有登录用户，跳过积分充值';
        RETURN;
    END IF;

    -- 查找用户的生效订阅
    SELECT id INTO v_subscription_id
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
            AND transaction_type = 'subscription_refill'
            AND related_entity_id = v_subscription_id
    ) THEN
        RAISE NOTICE '该订阅已经充值过积分，跳过';
        RETURN;
    END IF;

    -- 执行充值
    PERFORM refill_subscription_credits(v_user_id, v_subscription_id);

    RAISE NOTICE '成功为用户 % 的订阅 % 充值积分', v_user_id, v_subscription_id;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '充值积分时出错: %', SQLERRM;
END $$;

-- =====================================================
-- 9. 验证结果
-- =====================================================

-- 查看当前用户的积分余额
SELECT * FROM user_credits WHERE user_id = auth.uid();

-- 查看当前用户的积分交易记录
SELECT
    id,
    transaction_type,
    amount,
    remaining_credits,
    expires_at,
    description,
    created_at
FROM credit_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 查看当前用户的可用积分 (排除过期的)
SELECT get_user_available_credits(auth.uid()) AS available_credits;

-- =====================================================
-- 完成！
-- =====================================================
