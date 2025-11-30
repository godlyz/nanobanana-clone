-- 🔥 老王诊断：检查auth.users表上的所有触发器
-- 用途：查看是否有其他触发器导致用户创建失败

-- 1. 查看auth.users表的所有触发器
SELECT
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END AS status,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND NOT t.tgisinternal  -- 排除内部触发器
ORDER BY t.tgname;

-- 2. 查看user_profiles表的RLS策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 3. 测试：尝试直接插入user_profiles（模拟触发器行为）
-- 这个会失败因为没有实际用户ID，但能看到是否是权限问题
DO $$
BEGIN
  -- 尝试插入一个测试profile（使用随机UUID）
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    gen_random_uuid(),
    'Test User',
    NULL
  );
  RAISE NOTICE 'Test insert successful - RLS allows insertion';

  -- 清理测试数据
  DELETE FROM public.user_profiles WHERE display_name = 'Test User';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Test insert failed: %', SQLERRM;
END $$;

-- 4. 检查handle_new_user函数的权限
SELECT
  proname AS function_name,
  proowner::regrole AS owner,
  prosecdef AS security_definer,
  proconfig AS config_settings
FROM pg_proc
WHERE proname = 'handle_new_user';
