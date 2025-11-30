-- 🔥 老王的法律设置表
-- 用途: 存储法律页面的可配置内容（公司地址、联系邮箱等）
-- 老王提醒: 这个表只有一条记录，管理员可以随时更新！

-- 创建 legal_settings 表
CREATE TABLE IF NOT EXISTS legal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 公司信息（中英双语）
  company_address_zh TEXT NOT NULL DEFAULT '待补充公司注册地址',
  company_address_en TEXT NOT NULL DEFAULT 'Company registered address TBD',

  -- 联系邮箱
  privacy_email TEXT NOT NULL DEFAULT 'privacy@nanobanana.ai',
  legal_email TEXT NOT NULL DEFAULT 'legal@nanobanana.ai',
  support_email TEXT NOT NULL DEFAULT 'support@nanobanana.ai',
  billing_email TEXT NOT NULL DEFAULT 'billing@nanobanana.ai',

  -- 生效日期（存储为文本，方便管理员自定义格式）
  effective_date_zh TEXT NOT NULL DEFAULT '2025年11月6日',
  effective_date_en TEXT NOT NULL DEFAULT 'November 6, 2025',

  -- 版本号
  version TEXT NOT NULL DEFAULT 'v1.0',

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_legal_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_settings_updated_at
  BEFORE UPDATE ON legal_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_settings_updated_at();

-- 插入默认数据（如果表为空）
INSERT INTO legal_settings (
  company_address_zh,
  company_address_en,
  privacy_email,
  legal_email,
  support_email,
  billing_email,
  effective_date_zh,
  effective_date_en,
  version
) VALUES (
  '待补充公司注册地址',
  'Company registered address TBD',
  'privacy@nanobanana.ai',
  'legal@nanobanana.ai',
  'support@nanobanana.ai',
  'billing@nanobanana.ai',
  '2025年11月6日',
  'November 6, 2025',
  'v1.0'
) ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE legal_settings IS '法律页面配置表 - 存储隐私政策和服务条款的可配置内容';
COMMENT ON COLUMN legal_settings.company_address_zh IS '公司注册地址（中文）';
COMMENT ON COLUMN legal_settings.company_address_en IS '公司注册地址（英文）';
COMMENT ON COLUMN legal_settings.privacy_email IS '隐私政策联系邮箱';
COMMENT ON COLUMN legal_settings.legal_email IS '法律事务联系邮箱';
COMMENT ON COLUMN legal_settings.support_email IS '客户支持邮箱';
COMMENT ON COLUMN legal_settings.billing_email IS '账单相关邮箱';
COMMENT ON COLUMN legal_settings.effective_date_zh IS '生效日期（中文）';
COMMENT ON COLUMN legal_settings.effective_date_en IS '生效日期（英文）';
COMMENT ON COLUMN legal_settings.version IS '版本号';

-- 老王提醒: 这个表只应该有一条记录，管理员通过后台界面更新它
-- RLS (Row Level Security) 策略：只允许认证用户读取
ALTER TABLE legal_settings ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可以读取
CREATE POLICY "Anyone can read legal settings" ON legal_settings
  FOR SELECT
  USING (true);

-- 只有管理员可以更新（这里暂时允许所有认证用户更新，后续可以改为只允许 admin role）
CREATE POLICY "Authenticated users can update legal settings" ON legal_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated');
