-- 🔥 老王修复：forum_categories表RLS策略缺失
-- 原因：Service Role无法插入category数据，阻止测试运行

-- 检查现有策略
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'forum_categories'
ORDER BY policyname;

-- 添加Service Role INSERT策略（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'forum_categories'
    AND policyname = 'Service role can insert categories'
  ) THEN
    CREATE POLICY "Service role can insert categories"
      ON public.forum_categories
      FOR INSERT
      WITH CHECK (true);
    RAISE NOTICE 'Created INSERT policy for forum_categories';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- 同样检查forum_threads的INSERT策略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'forum_threads'
    AND policyname = 'Service role can insert threads'
  ) THEN
    CREATE POLICY "Service role can insert threads"
      ON public.forum_threads
      FOR INSERT
      WITH CHECK (true);
    RAISE NOTICE 'Created INSERT policy for forum_threads';
  ELSE
    RAISE NOTICE 'forum_threads INSERT policy already exists';
  END IF;
END $$;

-- 同样检查forum_replies的INSERT策略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'forum_replies'
    AND policyname = 'Service role can insert replies'
  ) THEN
    CREATE POLICY "Service role can insert replies"
      ON public.forum_replies
      FOR INSERT
      WITH CHECK (true);
    RAISE NOTICE 'Created INSERT policy for forum_replies';
  ELSE
    RAISE NOTICE 'forum_replies INSERT policy already exists';
  END IF;
END $$;

-- 验证所有策略
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('forum_categories', 'forum_threads', 'forum_replies', 'user_profiles')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- 🔥 老王说明：
-- 1. Service Role需要能插入测试数据
-- 2. 这些策略只允许Service Role绕过RLS
-- 3. 普通用户仍然受原有RLS策略限制
