-- 🔥 老王添加联系方式字段到法律设置表
-- 用途: 支持弹窗显示多种联系方式（电话、QQ、微信、Telegram、邮箱）
-- 老王提醒: 这些字段用于页脚的"联系客服"和"联系销售"弹窗！

-- 添加联系方式字段
ALTER TABLE legal_settings
ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '+86 xxx-xxxx-xxxx',
ADD COLUMN IF NOT EXISTS contact_qq TEXT DEFAULT '12345678',
ADD COLUMN IF NOT EXISTS contact_wechat TEXT DEFAULT 'nanobanana_service',
ADD COLUMN IF NOT EXISTS contact_telegram TEXT DEFAULT '@nanobanana_support',
ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'support@nanobanana.ai';

-- 添加销售团队联系方式字段
ALTER TABLE legal_settings
ADD COLUMN IF NOT EXISTS sales_phone TEXT DEFAULT '+86 xxx-xxxx-xxxx',
ADD COLUMN IF NOT EXISTS sales_qq TEXT DEFAULT '87654321',
ADD COLUMN IF NOT EXISTS sales_wechat TEXT DEFAULT 'nanobanana_sales',
ADD COLUMN IF NOT EXISTS sales_telegram TEXT DEFAULT '@nanobanana_sales',
ADD COLUMN IF NOT EXISTS sales_email TEXT DEFAULT 'sales@nanobanana.ai';

-- 更新现有记录（如果表中已有数据）
UPDATE legal_settings
SET
  contact_phone = '+86 xxx-xxxx-xxxx',
  contact_qq = '12345678',
  contact_wechat = 'nanobanana_service',
  contact_telegram = '@nanobanana_support',
  contact_email = 'support@nanobanana.ai',
  sales_phone = '+86 xxx-xxxx-xxxx',
  sales_qq = '87654321',
  sales_wechat = 'nanobanana_sales',
  sales_telegram = '@nanobanana_sales',
  sales_email = 'sales@nanobanana.ai'
WHERE id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN legal_settings.contact_phone IS '客服电话';
COMMENT ON COLUMN legal_settings.contact_qq IS '客服QQ号';
COMMENT ON COLUMN legal_settings.contact_wechat IS '客服微信号';
COMMENT ON COLUMN legal_settings.contact_telegram IS '客服Telegram账号';
COMMENT ON COLUMN legal_settings.contact_email IS '客服邮箱';
COMMENT ON COLUMN legal_settings.sales_phone IS '销售团队电话';
COMMENT ON COLUMN legal_settings.sales_qq IS '销售团队QQ号';
COMMENT ON COLUMN legal_settings.sales_wechat IS '销售团队微信号';
COMMENT ON COLUMN legal_settings.sales_telegram IS '销售团队Telegram账号';
COMMENT ON COLUMN legal_settings.sales_email IS '销售团队邮箱';

-- 老王提醒: 管理员可以在后台界面修改这些联系方式
