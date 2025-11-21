-- 🔥 老王创建：添加订阅管理所需的新字段
-- 创建时间: 2025-11-09
-- 用途: 支持订阅降级、取消功能

-- 1. 添加降级相关字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS downgrade_to_plan TEXT,
ADD COLUMN IF NOT EXISTS downgrade_to_billing_cycle TEXT;

-- 2. 添加取消相关字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancel_feedback TEXT,
ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;

-- 3. 添加字段注释（方便理解）
COMMENT ON COLUMN user_subscriptions.downgrade_to_plan IS '降级目标计划（basic|pro|max），在当前周期结束后生效';
COMMENT ON COLUMN user_subscriptions.downgrade_to_billing_cycle IS '降级目标计费周期（monthly|yearly）';
COMMENT ON COLUMN user_subscriptions.cancel_reason IS '取消订阅的原因';
COMMENT ON COLUMN user_subscriptions.cancel_feedback IS '用户取消订阅时提供的反馈';
COMMENT ON COLUMN user_subscriptions.cancel_requested_at IS '取消订阅的请求时间';

-- 4. 更新status枚举类型（如果需要添加pending_cancel状态）
-- 🔥 老王注意：这取决于现有的status字段类型
-- 如果status是TEXT类型，不需要修改
-- 如果status是ENUM类型，需要添加新值：
-- ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_cancel';

-- 5. 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_downgrade
ON user_subscriptions(user_id, downgrade_to_plan)
WHERE downgrade_to_plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancel
ON user_subscriptions(user_id, status)
WHERE status = 'pending_cancel';

-- 6. 打印迁移成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库迁移成功: 已添加订阅管理字段';
  RAISE NOTICE '新增字段: downgrade_to_plan, downgrade_to_billing_cycle, cancel_reason, cancel_feedback, cancel_requested_at';
END $$;
