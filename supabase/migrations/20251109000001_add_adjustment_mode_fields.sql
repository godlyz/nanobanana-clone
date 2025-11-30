-- 🔥 老王创建：添加订阅调整模式所需的字段
-- 创建时间: 2025-11-09
-- 用途: 支持订阅升级/降级的两种调整模式（即时调整 / 后续调整）

-- 1. 添加调整模式字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS adjustment_mode TEXT CHECK (adjustment_mode IN ('immediate', 'scheduled')),
ADD COLUMN IF NOT EXISTS remaining_days INTEGER,
ADD COLUMN IF NOT EXISTS downgrade_to_plan TEXT,
ADD COLUMN IF NOT EXISTS downgrade_to_billing_cycle TEXT CHECK (downgrade_to_billing_cycle IN ('monthly', 'yearly'));

-- 2. 添加字段注释（方便理解）
COMMENT ON COLUMN user_subscriptions.adjustment_mode IS '调整模式: immediate(立即生效,剩余时间延续) | scheduled(当前周期结束后生效)';
COMMENT ON COLUMN user_subscriptions.remaining_days IS '当前订阅剩余天数（用于即时调整模式的时间计算）';
COMMENT ON COLUMN user_subscriptions.downgrade_to_plan IS '计划降级到的套餐（降级操作设置，续订时应用）';
COMMENT ON COLUMN user_subscriptions.downgrade_to_billing_cycle IS '降级目标计费周期（monthly/yearly）';

-- 3. 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_adjustment_mode
ON user_subscriptions(user_id, adjustment_mode)
WHERE adjustment_mode = 'immediate';

-- 4. 打印迁移成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库迁移成功: 已添加订阅调整模式字段';
  RAISE NOTICE '新增字段: adjustment_mode (即时调整/后续调整), remaining_days (剩余天数)';
  RAISE NOTICE '新增字段: downgrade_to_plan (降级目标套餐), downgrade_to_billing_cycle (降级计费周期)';
  RAISE NOTICE '所有字段均为可选，默认值为NULL';
END $$;
