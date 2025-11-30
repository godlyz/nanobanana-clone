-- 🔥 老王诊断：检查grant_registration_credits函数
-- 用途：查看这个触发器函数的代码，找出问题

-- 1. 查看函数完整定义
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'grant_registration_credits';

-- 2. 检查这个触发器是否可以安全禁用
SELECT
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END AS status,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
WHERE t.tgname = 'on_user_created_grant_credits';

-- 🔥 老王说明：
-- 如果这个函数有问题，我们可以暂时禁用这个触发器
-- 或者修复它的代码
