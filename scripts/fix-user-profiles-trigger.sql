/**
 * 🔥 老王紧急修复脚本
 * 用途：手动创建user_profiles触发器和RLS策略
 * 使用方式：复制此文件内容到Supabase Dashboard的SQL Editor执行
 *
 * 艹！这个SB migration没有自动执行，导致触发器缺失！
 */

-- ==========================================
-- 第1步：重新创建触发器函数
-- ==========================================
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
EXCEPTION WHEN OTHERS THEN
  -- 老王添加：即使失败也不阻止用户创建
  RAISE WARNING '触发器执行失败: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 第2步：删除旧触发器（如果存在）
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ==========================================
-- 第3步：创建新触发器
-- ==========================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 第4步：添加INSERT RLS策略（保险起见）
-- ==========================================
-- 允许Service Role绕过RLS插入profile
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);  -- service_role自动绕过RLS

-- ==========================================
-- 第5步：修复现有auth.users缺失的profiles
-- ==========================================
-- 查找所有没有profile的用户并创建
INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'avatar_url', NULL)
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- ==========================================
-- 验证结果
-- ==========================================
-- 查看触发器
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 查看函数
SELECT proname
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 查看RLS策略
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 统计修复结果
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM public.user_profiles) AS total_profiles,
  (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = au.id
  )) AS missing_profiles;

-- 🔥 老王验证说明：
-- 1. 如果total_users = total_profiles，说明修复成功
-- 2. 如果missing_profiles > 0，说明还有用户缺少profile，需要再次运行第5步
-- 3. 执行完毕后，测试创建新用户应该自动生成profile
