-- 🔥 老王修复：更新 RPC 函数，添加降级调整模式字段
-- 创建时间: 2025-11-09
-- 用途: 修复 get_user_active_subscription RPC 函数，返回降级相关字段

-- 删除旧版本 RPC 函数
DROP FUNCTION IF EXISTS get_user_active_subscription(UUID);

-- 重新创建 RPC 函数，添加降级字段
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  plan_tier TEXT,
  billing_cycle TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  next_refill_at TIMESTAMPTZ,
  monthly_credits INTEGER,
  -- 🔥 老王添加：降级调整模式字段
  adjustment_mode TEXT,
  remaining_days INTEGER,
  downgrade_to_plan TEXT,
  downgrade_to_billing_cycle TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    plan_tier,
    billing_cycle,
    status,
    started_at,
    expires_at,
    next_refill_at,
    monthly_credits,
    -- 🔥 老王添加：降级调整模式字段
    adjustment_mode,
    remaining_days,
    downgrade_to_plan,
    downgrade_to_billing_cycle
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;
$$;

-- 添加注释
COMMENT ON FUNCTION get_user_active_subscription(UUID) IS '获取用户的活跃订阅（包含降级调整模式字段）';

-- 打印成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ RPC 函数更新成功: get_user_active_subscription';
  RAISE NOTICE '新增返回字段: adjustment_mode, remaining_days, downgrade_to_plan, downgrade_to_billing_cycle';
END $$;
