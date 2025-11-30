/**
 * 🔥 老王的用户资料表
 * 用途: 存储用户的个人资料信息
 * 老王警告: 这个表一定要和auth.users表关联好，别tm搞混了！
 */

-- 1. 创建user_profiles表
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  github_handle TEXT,
  location TEXT,

  -- 统计字段（通过触发器自动更新）
  follower_count INTEGER DEFAULT 0 NOT NULL,
  following_count INTEGER DEFAULT 0 NOT NULL,
  post_count INTEGER DEFAULT 0 NOT NULL,
  artwork_count INTEGER DEFAULT 0 NOT NULL,
  total_likes INTEGER DEFAULT 0 NOT NULL,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 添加注释
COMMENT ON TABLE public.user_profiles IS '用户个人资料表';
COMMENT ON COLUMN public.user_profiles.user_id IS '用户ID（外键关联auth.users）';
COMMENT ON COLUMN public.user_profiles.display_name IS '显示名称';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '头像URL';
COMMENT ON COLUMN public.user_profiles.bio IS '个人简介';
COMMENT ON COLUMN public.user_profiles.website_url IS '个人网站';
COMMENT ON COLUMN public.user_profiles.twitter_handle IS 'Twitter用户名';
COMMENT ON COLUMN public.user_profiles.instagram_handle IS 'Instagram用户名';
COMMENT ON COLUMN public.user_profiles.github_handle IS 'GitHub用户名';
COMMENT ON COLUMN public.user_profiles.location IS '所在地';
COMMENT ON COLUMN public.user_profiles.follower_count IS '粉丝数量';
COMMENT ON COLUMN public.user_profiles.following_count IS '关注数量';
COMMENT ON COLUMN public.user_profiles.post_count IS '博客文章数量';
COMMENT ON COLUMN public.user_profiles.artwork_count IS '作品数量';
COMMENT ON COLUMN public.user_profiles.total_likes IS '获赞总数';

-- 3. 创建索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_follower_count ON public.user_profiles(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_likes ON public.user_profiles(total_likes DESC);

-- 4. 创建触发器函数：自动更新updated_at
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- 6. 创建触发器函数：新用户自动创建profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建触发器：auth.users新用户时自动创建profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. 启用RLS（行级安全）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 9. RLS策略：所有人都可以查看用户资料
DROP POLICY IF EXISTS "User profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "User profiles are viewable by everyone"
  ON public.user_profiles
  FOR SELECT
  USING (true);

-- 10. RLS策略：用户只能更新自己的资料
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 11. RLS策略：用户可以删除自己的资料
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 🔥 老王备注：
-- 1. user_id是主键，直接关联auth.users表
-- 2. 新用户注册时会自动创建对应的profile记录（触发器）
-- 3. 统计字段（follower_count等）通过触发器自动更新，不要手动修改
-- 4. RLS策略确保安全：所有人可查看，但只能修改自己的资料
-- 5. 索引优化了常用查询（按粉丝数、点赞数排序等）
