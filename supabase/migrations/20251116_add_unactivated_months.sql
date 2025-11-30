-- 🔥 老王创建：添加 unactivated_months 字段到 user_subscriptions 表
-- 用途：存储年付/月付套餐的未激活月份数
-- 逻辑：
--   - 首次购买年付：第1个月立即充值，unactivated_months = 11
--   - 首次购买月付：立即充值，unactivated_months = 0
--   - 续订年付：unactivated_months += 12
--   - 续订月付：unactivated_months += 1

-- 1. 添加 unactivated_months 字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS unactivated_months INTEGER DEFAULT 0 NOT NULL;

-- 2. 添加字段注释
COMMENT ON COLUMN user_subscriptions.unactivated_months IS '未激活的月份数（年付套餐分12个月充值，首次购买第1个月立即充值，剩余11个月存入此字段；续订时增加12个月）';

-- 3. 创建索引（优化定时任务查询）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_unactivated_months
ON user_subscriptions(unactivated_months)
WHERE unactivated_months > 0 AND status = 'active';

-- 4. 初始化现有数据（可选，如果有历史数据需要初始化）
-- UPDATE user_subscriptions
-- SET unactivated_months = 0
-- WHERE unactivated_months IS NULL;
