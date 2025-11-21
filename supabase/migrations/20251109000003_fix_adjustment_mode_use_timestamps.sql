-- 🔥 老王修复：调整模式字段优化（使用时间戳替代天数）
-- 创建时间: 2025-11-09
-- 用途: 将 remaining_days 替换为 original_plan_expires_at，提高时间精度

-- 1. 删除不精确的 remaining_days 字段
ALTER TABLE user_subscriptions
DROP COLUMN IF EXISTS remaining_days;

-- 2. 添加原套餐到期时间字段（用于immediate模式）
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS original_plan_expires_at TIMESTAMPTZ;

-- 3. 添加字段注释
COMMENT ON COLUMN user_subscriptions.original_plan_expires_at IS '原套餐的到期时间（用于immediate模式：basic到期后恢复到原套餐的剩余时间）';

-- 4. 更新RPC函数，返回新字段
DROP FUNCTION IF EXISTS get_user_active_subscription(UUID);

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
  -- 🔥 调整模式字段（修正版）
  adjustment_mode TEXT,
  original_plan_expires_at TIMESTAMPTZ,
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
    -- 🔥 调整模式字段（修正版）
    adjustment_mode,
    original_plan_expires_at,
    downgrade_to_plan,
    downgrade_to_billing_cycle
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;
$$;

-- 添加注释
COMMENT ON FUNCTION get_user_active_subscription(UUID) IS '获取用户的活跃订阅（包含调整模式字段 - 使用时间戳版本）';

-- 打印成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ RPC 函数更新成功: get_user_active_subscription';
  RAISE NOTICE '字段变更: remaining_days (天数) → original_plan_expires_at (时间戳)';
  RAISE NOTICE '优势: 秒级精度、实时计算、无缝切换';
END $$;
