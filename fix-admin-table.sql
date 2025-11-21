-- =====================================================
-- 修复 admin_users 表结构
-- 添加 user_id 列并关联到 auth.users
-- =====================================================

-- 1. 添加 user_id 列（如果不存在）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 为现有记录填充 user_id（从 auth.users 中根据 email 匹配）
UPDATE admin_users 
SET user_id = auth.users.id
FROM auth.users
WHERE admin_users.email = auth.users.email
AND admin_users.user_id IS NULL;

-- 3. 为你的账号更新角色为 super_admin
UPDATE admin_users 
SET role = 'super_admin', 
    status = 'active', 
    updated_at = NOW()
WHERE email = 'kn197884@gmail.com';

-- 4. 添加唯一约束（如果 user_id 已经有值）
ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);

-- 5. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 6. 验证结果
SELECT 
  id,
  email,
  name,
  role,
  status,
  user_id,
  auth_provider,
  email_verified,
  created_at
FROM admin_users
WHERE email = 'kn197884@gmail.com';

-- =====================================================
-- 预期结果：
-- 你的账号应该显示：
-- - role: super_admin
-- - status: active  
-- - user_id: bfb8182a-6865-4c66-a89e-05711796e2b2
-- =====================================================
