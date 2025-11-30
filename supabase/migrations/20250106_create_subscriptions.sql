-- 🔥 老王注释：此迁移文件原本创建 user_subscriptions 表，但已移至 20250123_refactor_credit_validity.sql
-- 保留此文件仅为了定义通用函数

-- 创建更新时间触发器函数（被后续迁移使用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
