-- ==========================================
-- 修复管理员账号设置
-- 为 kn197884@gmail.com 设置管理员权限
-- ==========================================

-- 第一步：检查用户是否在 auth.users 表中
-- 在 Supabase Dashboard 中执行以下查询查看你的 user_id:
-- SELECT id, email FROM auth.users WHERE email = 'kn197884@gmail.com';

-- 第二步：使用查询到的 user_id 插入或更新 admin_users 表
-- 将 'YOUR_USER_ID_HERE' 替换为上一步查询到的实际 UUID

-- 方式1: 如果你已经知道 user_id，直接执行：
INSERT INTO admin_users (
  user_id,
  email,
  role,
  permissions,
  is_active,
  created_at,
  updated_at
) VALUES (
  'YOUR_USER_ID_HERE',  -- 替换为实际的 user_id
  'kn197884@gmail.com',
  'super_admin',  -- 超级管理员角色
  '{}',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 方式2: 如果你不知道 user_id，使用子查询自动获取：
INSERT INTO admin_users (
  user_id,
  email,
  role,
  permissions,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'super_admin',
  '{}',
  true,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'kn197884@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 第三步：验证设置
SELECT 
  au.id,
  au.user_id,
  au.email,
  au.role,
  au.is_active,
  u.email as auth_email,
  u.created_at as user_created_at
FROM admin_users au
LEFT JOIN auth.users u ON au.user_id = u.id
WHERE au.email = 'kn197884@gmail.com';

-- 第四步：如果用户不存在于 auth.users 表中
-- 你需要先通过前台使用 Google OAuth 登录一次
-- 访问: http://localhost:3000/login
-- 使用 kn197884@gmail.com 登录后，再执行上面的插入语句
