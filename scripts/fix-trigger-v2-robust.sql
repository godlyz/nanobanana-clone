/**
 * 🔥 老王V2加强版修复脚本
 * 用途：重新创建触发器，添加超强错误容错
 *
 * 艹！原触发器虽然有EXCEPTION，但可能某个字段有问题导致整个用户创建失败！
 * 这次改成完全不影响用户创建的版本！
 */

-- ==========================================
-- 删除旧触发器和函数（彻底重来）
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ==========================================
-- 创建超级健壮的触发器函数
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- 🔥 老王添加：超级保守的字段提取
  BEGIN
    -- 尝试获取display_name
    v_display_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),  -- 邮箱@前面部分
      NEW.email  -- 最坏情况用完整邮箱
    );

    -- 尝试获取avatar_url
    v_avatar_url := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'photo_url',
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- 字段提取失败，使用默认值
    v_display_name := NEW.email;
    v_avatar_url := NULL;
  END;

  -- 🔥 老王添加：尝试插入profile，完全容错
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      display_name,
      avatar_url
    ) VALUES (
      NEW.id,
      v_display_name,
      v_avatar_url
    );
  EXCEPTION WHEN unique_violation THEN
    -- Profile已存在，忽略（可能是重试）
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
  WHEN OTHERS THEN
    -- 任何其他错误都记录但不阻止用户创建
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  -- 🔥 关键：无论如何都返回NEW，确保用户创建成功
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ==========================================
-- 添加函数注释
-- ==========================================
COMMENT ON FUNCTION public.handle_new_user() IS '自动为新用户创建profile，完全错误容错，不影响用户创建';

-- ==========================================
-- 重新创建触发器
-- ==========================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 确认INSERT RLS策略存在
-- ==========================================
-- 如果不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'Service role can insert profiles'
  ) THEN
    CREATE POLICY "Service role can insert profiles"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (true);
    RAISE NOTICE 'Created INSERT policy for user_profiles';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- ==========================================
-- 修复现有auth.users缺失的profiles（更安全）
-- ==========================================
INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1),
    au.email
  ),
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    NULL
  )
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;  -- 防止重复

-- ==========================================
-- 验证结果
-- ==========================================
-- 查看触发器
SELECT
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 查看函数
SELECT
  proname AS function_name,
  prosrc AS function_body_preview
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 统计修复结果
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM public.user_profiles) AS total_profiles,
  (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = au.id
  )) AS missing_profiles;

-- 🔥 老王验证说明：
-- 1. trigger_name应该显示: on_auth_user_created, status: Enabled
-- 2. function_name应该显示: handle_new_user
-- 3. missing_profiles应该 = 0
-- 4. 如果还有问题，可能是raw_user_meta_data字段权限问题，需要检查Supabase Auth配置
