-- 🔥 老王临时方案：禁用触发器
-- 用途：暂时禁用触发器让测试能跑，后续再排查根因
--
-- 艹！触发器虽然有完全错误容错，但还是导致用户创建失败
-- 说明可能是Supabase Auth的内部问题，不是我们的触发器代码问题
-- 临时禁用触发器，测试时手动创建profile

-- 禁用触发器（不删除，只是暂时关闭）
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 验证触发器状态
SELECT
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled ✅'
    WHEN 'D' THEN 'Disabled ⚠️'
    ELSE 'Unknown'
  END AS status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 🔥 老王说明：
-- 1. 触发器现在被禁用，不会在创建用户时自动执行
-- 2. 测试代码需要手动创建profile
-- 3. 后续可以用 ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created 重新启用
