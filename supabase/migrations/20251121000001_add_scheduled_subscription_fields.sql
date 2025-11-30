-- 🔥 老王实现：添加 scheduled 模式订阅所需的字段
-- 用于支持 upgrade/downgrade 的 scheduled（后续执行）模式

-- 1. 添加 activation_date 字段：pending 订阅的激活日期
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ;

-- 添加注释
COMMENT ON COLUMN user_subscriptions.activation_date IS 'scheduled模式：pending订阅的激活日期，等于旧订阅的expires_at';

-- 2. 添加 activated_at 字段：订阅实际激活时间
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

COMMENT ON COLUMN user_subscriptions.activated_at IS '订阅实际激活时间（由Cron Job设置）';

-- 3. 添加 frozen_remaining_seconds 字段：immediate模式冻结的剩余秒数
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS frozen_remaining_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN user_subscriptions.frozen_remaining_seconds IS 'immediate模式：冻结的旧订阅剩余时间（秒）';

-- 4. 添加 is_time_frozen 字段：标记时间是否被冻结
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS is_time_frozen BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_subscriptions.is_time_frozen IS '标记该订阅的时间是否被冻结（immediate模式升降级时）';

-- 5. 创建索引加速 pending 订阅查询
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_pending_activation
ON user_subscriptions (status, activation_date)
WHERE status = 'pending';

-- 6. 创建索引加速冻结订阅查询
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_frozen
ON user_subscriptions (user_id, is_time_frozen)
WHERE is_time_frozen = TRUE;
