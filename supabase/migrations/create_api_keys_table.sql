-- 🔥 老王注释：API密钥管理表，用于开发者门户
-- 这个表存储用户创建的API密钥，用于调用我们的AI图像编辑API

-- 创建api_keys表
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 密钥名称，用户自定义
  key_hash TEXT NOT NULL, -- 密钥的SHA-256哈希值，绝不存明文！
  key_preview VARCHAR(20) NOT NULL, -- 密钥预览(sk_...last4)，用于界面显示
  last_used_at TIMESTAMPTZ, -- 最后使用时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true, -- 是否激活

  -- 🔥 老王约束：一个用户最多创建10个密钥，防止滥用
  CONSTRAINT unique_user_key_name UNIQUE(user_id, name)
);

-- 创建索引，提升查询性能（老王我可不想API慢得跟蜗牛一样）
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active) WHERE is_active = true;

-- 🔥 老王安全策略：启用行级安全(RLS)，用户只能访问自己的密钥
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 查询策略：用户只能查看自己的密钥
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- 插入策略：用户只能创建自己的密钥
CREATE POLICY "Users can create their own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 删除策略：用户只能删除自己的密钥
CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 更新策略：用户只能更新自己的密钥（主要用于last_used_at）
CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 🔥 老王函数：检查用户密钥数量限制
CREATE OR REPLACE FUNCTION check_api_key_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.api_keys WHERE user_id = NEW.user_id AND is_active = true) >= 10 THEN
    RAISE EXCEPTION 'API key limit reached. Maximum 10 active keys per user.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，插入前检查数量限制
CREATE TRIGGER enforce_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION check_api_key_limit();

-- 🔥 老王注释：添加注释，方便后续维护
COMMENT ON TABLE public.api_keys IS '存储用户的API密钥，用于API认证';
COMMENT ON COLUMN public.api_keys.key_hash IS 'API密钥的SHA-256哈希值，用于验证';
COMMENT ON COLUMN public.api_keys.key_preview IS 'API密钥预览，格式: sk_...last4';
COMMENT ON COLUMN public.api_keys.last_used_at IS '密钥最后使用时间，用于监控和清理不活跃密钥';
