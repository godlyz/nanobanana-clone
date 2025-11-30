-- =============================================================================
-- Supabase 安全问题修复迁移
-- 创建时间: 2025-01-30
-- 描述: 修复数据库函数 search_path 安全问题和表 RLS 缺失问题
-- 执行方式:
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
--
-- 修复内容:
-- 1. 为5个数据库函数添加 search_path 安全配置
-- 2. 为4个管理后台表启用 RLS 并设置安全策略
-- 3. 泄露密码保护需要在 Supabase Dashboard 的 Auth 设置中手动启用
-- =============================================================================

-- =============================================================================
-- 第一部分: 修复数据库函数的 search_path 安全问题
-- =============================================================================

-- 1. 修复 update_updated_at_column 函数
-- 用途: 自动更新 updated_at 字段的触发器函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔥 添加安全 search_path
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS '自动更新 updated_at 字段的触发器函数（已修复 search_path）';

-- 2. 修复 grant_registration_credits 函数
-- 用途: 用户注册时自动赠送50积分（15天有效期）
DROP FUNCTION IF EXISTS grant_registration_credits() CASCADE;
CREATE OR REPLACE FUNCTION grant_registration_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔥 添加安全 search_path
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
        NOW() + INTERVAL '15 days',
        'Registration bonus - 50 credits (valid for 15 days) / 注册赠送 - 50积分 (15天有效)'
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION grant_registration_credits() IS '用户注册时自动赠送50积分（已修复 search_path）';

-- 3. 修复 get_user_available_credits 函数
-- 用途: 获取用户可用积分（考虑过期时间）
DROP FUNCTION IF EXISTS get_user_available_credits(UUID);
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔥 添加安全 search_path
AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    -- 计算用户的可用积分 (排除已过期的积分)
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

    RETURN GREATEST(available_credits, 0);
END;
$$;

COMMENT ON FUNCTION get_user_available_credits(UUID) IS '获取用户可用积分（已修复 search_path）';

-- 4. 修复 refill_subscription_credits 函数
-- 用途: 订阅充值函数（处理月付和年付逻辑）
DROP FUNCTION IF EXISTS refill_subscription_credits(UUID, UUID);
CREATE OR REPLACE FUNCTION refill_subscription_credits(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- 🔥 添加安全 search_path
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

COMMENT ON FUNCTION refill_subscription_credits(UUID, UUID) IS '订阅充值函数（已修复 search_path）';

-- 5. 修复 get_user_active_subscription 函数
-- 用途: 获取用户活跃订阅信息
DROP FUNCTION IF EXISTS get_user_active_subscription(UUID);
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
SET search_path = public, pg_temp  -- 🔥 添加安全 search_path
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

COMMENT ON FUNCTION get_user_active_subscription(UUID) IS '获取用户活跃订阅信息（已修复 search_path）';

-- =============================================================================
-- 重新创建所有相关触发器（因为函数被重建）
-- =============================================================================

-- 重新创建 user_credits 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建 user_subscriptions 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建 credit_packages 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_credit_packages_updated_at ON credit_packages;
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建 system_configs 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_system_configs_updated_at ON system_configs;
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建 promotion_rules 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_promotion_rules_updated_at ON promotion_rules;
CREATE TRIGGER update_promotion_rules_updated_at
    BEFORE UPDATE ON promotion_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建 admin_users 的 updated_at 触发器
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建用户注册赠送积分触发器
DROP TRIGGER IF EXISTS on_user_created_grant_credits ON auth.users;
CREATE TRIGGER on_user_created_grant_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION grant_registration_credits();

-- =============================================================================
-- 第二部分: 为管理后台表启用 RLS 并设置安全策略
-- =============================================================================

-- 1. 为 admin_users 表启用 RLS 并设置策略
-- =============================================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON admin_users;

-- 管理员可以查看所有管理员用户（需要自己是管理员）
CREATE POLICY "admin_users_select_policy"
    ON admin_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND is_active = TRUE
        )
    );

-- 只有 super_admin 可以创建新管理员
CREATE POLICY "admin_users_insert_policy"
    ON admin_users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- 只有 super_admin 可以更新管理员信息
CREATE POLICY "admin_users_update_policy"
    ON admin_users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- 只有 super_admin 可以删除管理员（软删除通过 is_active 字段）
CREATE POLICY "admin_users_delete_policy"
    ON admin_users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- 服务角色可以完全管理 admin_users（用于自动化脚本）
CREATE POLICY "admin_users_service_role_policy"
    ON admin_users FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE admin_users IS '管理后台用户权限表（已启用 RLS）';

-- 2. 为 system_configs 表启用 RLS 并设置策略
-- =============================================================================

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "system_configs_select_policy" ON system_configs;
DROP POLICY IF EXISTS "system_configs_insert_policy" ON system_configs;
DROP POLICY IF EXISTS "system_configs_update_policy" ON system_configs;
DROP POLICY IF EXISTS "system_configs_delete_policy" ON system_configs;

-- 管理员可以查看所有配置
CREATE POLICY "system_configs_select_policy"
    ON system_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND is_active = TRUE
        )
    );

-- 只有 admin 及以上角色可以创建配置
CREATE POLICY "system_configs_insert_policy"
    ON system_configs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
            AND is_active = TRUE
        )
    );

-- 只有 admin 及以上角色可以更新配置
CREATE POLICY "system_configs_update_policy"
    ON system_configs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
            AND is_active = TRUE
        )
    );

-- 只有 super_admin 可以删除配置
CREATE POLICY "system_configs_delete_policy"
    ON system_configs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- 服务角色可以完全管理 system_configs
CREATE POLICY "system_configs_service_role_policy"
    ON system_configs FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE system_configs IS '系统可配置参数表（已启用 RLS）';

-- 3. 为 promotion_rules 表启用 RLS 并设置策略
-- =============================================================================

ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "promotion_rules_select_policy" ON promotion_rules;
DROP POLICY IF EXISTS "promotion_rules_public_select_policy" ON promotion_rules;
DROP POLICY IF EXISTS "promotion_rules_insert_policy" ON promotion_rules;
DROP POLICY IF EXISTS "promotion_rules_update_policy" ON promotion_rules;
DROP POLICY IF EXISTS "promotion_rules_delete_policy" ON promotion_rules;

-- 所有用户可以查看可见的活动规则
CREATE POLICY "promotion_rules_public_select_policy"
    ON promotion_rules FOR SELECT
    USING (is_visible = TRUE AND status = 'active');

-- 管理员可以查看所有活动规则
CREATE POLICY "promotion_rules_select_policy"
    ON promotion_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND is_active = TRUE
        )
    );

-- 只有 admin 及以上角色可以创建活动规则
CREATE POLICY "promotion_rules_insert_policy"
    ON promotion_rules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
            AND is_active = TRUE
        )
    );

-- 只有 admin 及以上角色可以更新活动规则
CREATE POLICY "promotion_rules_update_policy"
    ON promotion_rules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
            AND is_active = TRUE
        )
    );

-- 只有 super_admin 可以删除活动规则
CREATE POLICY "promotion_rules_delete_policy"
    ON promotion_rules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
            AND is_active = TRUE
        )
    );

-- 服务角色可以完全管理 promotion_rules
CREATE POLICY "promotion_rules_service_role_policy"
    ON promotion_rules FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE promotion_rules IS '统一活动规则引擎（已启用 RLS）';

-- 4. 为 audit_logs 表启用 RLS 并设置策略
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;

-- 管理员可以查看所有审计日志
CREATE POLICY "audit_logs_select_policy"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND is_active = TRUE
        )
    );

-- 服务角色可以插入审计日志（自动记录）
CREATE POLICY "audit_logs_insert_policy"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- 服务角色可以完全管理 audit_logs（用于维护和清理）
CREATE POLICY "audit_logs_service_role_policy"
    ON audit_logs FOR ALL
    USING (auth.role() = 'service_role');

-- 审计日志禁止更新和删除（只允许通过服务角色操作）
-- 这样可以保证审计日志的完整性

COMMENT ON TABLE audit_logs IS '管理操作审计日志（已启用 RLS，禁止普通用户修改）';

-- =============================================================================
-- 验证脚本执行结果
-- =============================================================================

-- 检查函数是否正确设置了 search_path
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE
        WHEN p.proconfig IS NOT NULL AND
             'search_path=public, pg_temp' = ANY(p.proconfig) THEN '✅ 已修复'
        ELSE '⚠️ 未修复'
    END AS search_path_status,
    p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_updated_at_column',
    'grant_registration_credits',
    'get_user_available_credits',
    'refill_subscription_credits',
    'get_user_active_subscription'
)
ORDER BY p.proname;

-- 检查表是否启用了 RLS
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ RLS已启用'
        ELSE '⚠️ RLS未启用'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('admin_users', 'system_configs', 'promotion_rules', 'audit_logs')
ORDER BY tablename;

-- 检查每个表的 RLS 策略数量
SELECT
    schemaname,
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('admin_users', 'system_configs', 'promotion_rules', 'audit_logs')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =============================================================================
-- 安全修复完成提示
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 数据库安全修复迁移执行完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '已修复内容:';
    RAISE NOTICE '1. ✅ 5个数据库函数已添加 search_path 安全配置';
    RAISE NOTICE '2. ✅ admin_users 表已启用 RLS 并设置安全策略';
    RAISE NOTICE '3. ✅ system_configs 表已启用 RLS 并设置安全策略';
    RAISE NOTICE '4. ✅ promotion_rules 表已启用 RLS 并设置安全策略';
    RAISE NOTICE '5. ✅ audit_logs 表已启用 RLS 并设置安全策略';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 待手动配置:';
    RAISE NOTICE '1. 泄露密码保护需要在 Supabase Dashboard 中手动启用:';
    RAISE NOTICE '   - 进入 Dashboard > Authentication > Policies';
    RAISE NOTICE '   - 启用 "Breach Password Protection"';
    RAISE NOTICE '   - 这将通过 HaveIBeenPwned.org 检查用户密码';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
