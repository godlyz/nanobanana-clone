-- =====================================================
-- 🔥 老王重构：添加包追踪字段，支持按包消费和时间冻结
-- 创建时间: 2025-11-11
-- 用途：
--   1. remaining_amount - 记录每个积分包的实际剩余
--   2. consumed_from_id - 消费记录关联到具体的包
--   3. frozen_remaining_seconds - 冻结时的剩余秒数
--   4. original_expires_at - 原始过期时间（备份，用于计算）
-- =====================================================

-- 🔥 步骤1：添加 remaining_amount 字段（每个包的实际剩余积分）
-- 用途：实时追踪每个积分包还剩多少积分
-- 规则：
--   - 充值/赠送记录: remaining_amount = amount（初始值）
--   - 消费记录: remaining_amount = 0（消费记录不持有积分）
--   - 随着消费，会逐步减少对应包的 remaining_amount
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS remaining_amount INTEGER DEFAULT 0;

-- 初始化现有记录的 remaining_amount
-- 正数记录（充值/赠送）: remaining_amount = amount
-- 负数记录（消费）: remaining_amount = 0
UPDATE credit_transactions
SET remaining_amount = CASE
    WHEN amount > 0 THEN amount
    ELSE 0
END
WHERE remaining_amount = 0 OR remaining_amount IS NULL;

-- 🔥 步骤2：添加 consumed_from_id 字段（消费记录关联到具体的包）
-- 用途：记录这笔消费是从哪个积分包扣除的
-- 规则：
--   - 充值/赠送记录: consumed_from_id = NULL
--   - 消费记录: consumed_from_id = 被消费的包的ID
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS consumed_from_id UUID REFERENCES credit_transactions(id) ON DELETE SET NULL;

-- 🔥 步骤3：添加 frozen_remaining_seconds 字段（冻结时的剩余秒数）
-- 用途：记录积分包被冻结时，距离过期还剩多少秒
-- 规则：
--   - 普通记录: frozen_remaining_seconds = NULL
--   - 冻结记录: frozen_remaining_seconds = 冻结时计算的 (expires_at - NOW()) 秒数
--   - 解冻时: 新的 expires_at = NOW() + frozen_remaining_seconds
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS frozen_remaining_seconds INTEGER DEFAULT NULL;

-- 🔥 步骤4：添加 original_expires_at 字段（原始过期时间备份）
-- 用途：备份原始过期时间，用于调试和审计
-- 规则：
--   - 普通记录: original_expires_at = NULL
--   - 冻结记录: original_expires_at = 冻结前的 expires_at
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS original_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 🔥 步骤5：添加索引优化查询性能
-- remaining_amount 索引：用于查找有剩余积分的包
CREATE INDEX IF NOT EXISTS idx_credit_transactions_remaining_amount
    ON credit_transactions(user_id, remaining_amount)
    WHERE remaining_amount > 0;

-- consumed_from_id 索引：用于追踪消费来源
CREATE INDEX IF NOT EXISTS idx_credit_transactions_consumed_from
    ON credit_transactions(consumed_from_id)
    WHERE consumed_from_id IS NOT NULL;

-- frozen_remaining_seconds 索引：用于查找冻结记录
CREATE INDEX IF NOT EXISTS idx_credit_transactions_frozen_seconds
    ON credit_transactions(user_id, frozen_remaining_seconds)
    WHERE frozen_remaining_seconds IS NOT NULL;

-- 复合索引：用于 FIFO 消费查询（按过期时间排序）
CREATE INDEX IF NOT EXISTS idx_credit_transactions_fifo_query
    ON credit_transactions(user_id, expires_at, remaining_amount)
    WHERE remaining_amount > 0 AND (expires_at IS NULL OR expires_at > NOW());

-- 🔥 步骤6：添加注释说明
COMMENT ON COLUMN credit_transactions.remaining_amount IS '当前包的实际剩余积分（充值/赠送记录有效，消费记录为0）';
COMMENT ON COLUMN credit_transactions.consumed_from_id IS '消费记录关联到的积分包ID（仅消费记录有值）';
COMMENT ON COLUMN credit_transactions.frozen_remaining_seconds IS '冻结时距离过期的剩余秒数（仅冻结记录有值）';
COMMENT ON COLUMN credit_transactions.original_expires_at IS '冻结前的原始过期时间（仅冻结记录有值，用于审计）';

-- =====================================================
-- 迁移完成
-- =====================================================
