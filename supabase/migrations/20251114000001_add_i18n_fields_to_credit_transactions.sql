-- 🔥 老王的积分交易国际化 schema 升级
-- 目的: 添加 description_key 和 metadata 字段支持多语言
-- 日期: 2025-11-14

-- 1. 添加 description_key 字段（翻译键）
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS description_key TEXT;

-- 2. 添加 metadata 字段（JSON 格式存储参数）
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_credit_transactions_description_key
ON credit_transactions(description_key);

-- 4. 添加注释说明字段用途
COMMENT ON COLUMN credit_transactions.description_key IS '国际化翻译键，用于前端动态生成多语言描述';
COMMENT ON COLUMN credit_transactions.metadata IS 'JSON格式存储交易元数据（金额、套餐、日期等参数）';

-- 5. 🔥 老王：保持向后兼容 - description 字段仍然保留，但新记录优先使用 description_key
-- 说明：现有数据不受影响，新数据同时填充 description 和 description_key
