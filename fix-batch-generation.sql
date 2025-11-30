-- =============================================================================
-- 修复批量生成功能脚本
-- 问题：缺少 get_user_active_subscription 函数导致前端无法验证订阅状态
-- 解决：创建必要的 RPC 函数
-- =============================================================================
-- 执行方式：
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
-- =============================================================================

-- 创建获取用户活跃订阅的 RPC 函数
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
SECURITY DEFINER  -- 使用定义者权限执行，绕过 RLS
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

-- =============================================================================
-- 验证脚本执行结果
-- =============================================================================

-- 测试函数是否正常工作（确保你已登录）
SELECT * FROM get_user_active_subscription(auth.uid());

-- 如果有结果返回，说明函数创建成功！
-- 现在刷新前端页面，批量生成功能应该可以正常使用了！
