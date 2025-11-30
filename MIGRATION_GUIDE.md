# 后台登录系统迁移指南

本指南适用于已有旧版 `admin_users` 表的项目，需要迁移到新的后台独立登录系统。

## 问题诊断

如果你遇到以下错误：

```
ERROR: column admin_users.user_id does not exist
```

说明现有 `admin_users` 表缺少 `user_id` 列，需要执行迁移。

## 迁移步骤

### 1. 备份现有数据

在开始迁移前，先备份 `admin_users` 表：

```sql
-- 在 Supabase Dashboard -> SQL Editor 中执行
CREATE TABLE admin_users_backup AS 
SELECT * FROM admin_users;

-- 验证备份
SELECT COUNT(*) FROM admin_users_backup;
```

### 2. 检查表结构

运行检查脚本：

```bash
node scripts/check-admin-table-structure.js
```

**旧表结构**（需要迁移）：
```
id, email, name, role, status, auth_provider, email_verified, created_at, updated_at
```

**新表结构**（目标）：
```
id, user_id, email, name, role, status, auth_provider, email_verified, created_at, updated_at
```

### 3. 执行迁移 SQL

在 **Supabase Dashboard -> SQL Editor** 中执行：

```sql
-- ==========================================
-- 迁移 admin_users 表到新结构
-- ==========================================

-- 步骤 1: 添加 user_id 列
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 步骤 2: 填充 user_id（从 auth.users 根据 email 匹配）
UPDATE admin_users 
SET user_id = auth.users.id
FROM auth.users
WHERE admin_users.email = auth.users.email
AND admin_users.user_id IS NULL;

-- 步骤 3: 检查未匹配的记录
SELECT id, email, name, role, user_id
FROM admin_users
WHERE user_id IS NULL;

-- 如果有未匹配的记录，说明这些邮箱在 auth.users 中不存在
-- 需要先在 Supabase Auth 中创建这些用户

-- 步骤 4: 添加唯一约束
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_user_id_unique;

ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);

-- 步骤 5: 添加索引以提高性能
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 步骤 6: 验证迁移结果
SELECT 
  a.id,
  a.email,
  a.name,
  a.role,
  a.status,
  a.user_id,
  u.email as auth_email,
  u.email_confirmed_at
FROM admin_users a
LEFT JOIN auth.users u ON a.user_id = u.id
ORDER BY a.created_at;

-- ==========================================
-- 迁移完成！
-- ==========================================
```

### 4. 处理 OAuth 账号密码

如果管理员账号是通过 OAuth（Google/GitHub）创建的，需要设置密码才能登录后台：

```sql
-- 为指定邮箱设置密码
UPDATE auth.users 
SET encrypted_password = crypt('YourStrongPassword123!', gen_salt('bf'))
WHERE email = 'admin@example.com';  -- 替换为实际邮箱

-- 验证密码已设置
SELECT 
  id, 
  email, 
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at
FROM auth.users
WHERE email = 'admin@example.com';
```

### 5. 提升账号权限

将你的账号设置为超级管理员：

```sql
-- 设置为超级管理员
UPDATE admin_users 
SET role = 'super_admin', 
    status = 'active', 
    updated_at = NOW()
WHERE email = 'your-email@example.com';  -- 替换为你的邮箱

-- 验证权限
SELECT id, email, name, role, status, user_id
FROM admin_users
WHERE email = 'your-email@example.com';
```

### 6. 测试登录

1. 访问 `http://localhost:3000/admin/login`
2. 输入邮箱和密码
3. 点击登录

如果成功，应该跳转到 `/admin` 仪表板。

## 常见问题

### Q1: 有些管理员邮箱在 auth.users 中不存在怎么办？

**解决方案**：

```sql
-- 查找不存在的邮箱
SELECT email 
FROM admin_users 
WHERE user_id IS NULL;

-- 为这些邮箱创建 auth.users 记录
-- 方法 1: 使用 Supabase Dashboard -> Authentication -> Users -> Create User
-- 方法 2: 使用 SQL（需要设置密码）
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',  -- 替换为实际邮箱
  crypt('TempPassword123!', gen_salt('bf')),  -- 设置临时密码
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
);

-- 然后重新运行步骤 2 填充 user_id
```

### Q2: 迁移后无法登录，提示"该账号不是管理员"

**解决方案**：

```sql
-- 检查 user_id 是否正确填充
SELECT * FROM admin_users WHERE email = 'your-email@example.com';

-- 如果 user_id 为 NULL，手动填充
UPDATE admin_users 
SET user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
WHERE email = 'your-email@example.com';
```

### Q3: 想要回滚迁移怎么办？

**解决方案**：

```sql
-- 从备份恢复
DROP TABLE admin_users;

CREATE TABLE admin_users AS 
SELECT * FROM admin_users_backup;

-- 恢复索引和约束
CREATE UNIQUE INDEX admin_users_email_key ON admin_users(email);
-- 添加其他需要的约束和索引...
```

### Q4: 迁移后中间件报错

**问题**：中间件尝试访问 `admin_users.user_id` 但查询失败

**解决方案**：

1. 确认迁移 SQL 已完全执行
2. 检查 `user_id` 列是否存在：

```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'admin_users' AND column_name = 'user_id';
```

3. 如果列不存在，重新执行步骤 3 的迁移 SQL

## 验证清单

迁移完成后，检查以下项目：

- [ ] `admin_users` 表有 `user_id` 列
- [ ] 所有管理员记录的 `user_id` 都已填充（不为 NULL）
- [ ] `user_id` 有唯一约束
- [ ] 至少有一个 `super_admin` 账号
- [ ] 管理员账号在 `auth.users` 中有密码
- [ ] 可以在 `/admin/login` 成功登录
- [ ] 登录后可以访问 `/admin` 仪表板
- [ ] 审计日志正常记录登录操作

## 相关文件

迁移相关的脚本和文件：

- `scripts/check-admin-table-structure.js` - 检查表结构
- `scripts/add-admin-to-existing-table.js` - 添加管理员（适配旧表）
- `fix-admin-table-clean.sql` - 迁移 SQL（干净版）
- `set-admin-password.sql` - 设置密码 SQL

## 获取帮助

如果迁移过程中遇到问题：

1. 查看浏览器控制台的错误信息
2. 查看服务器日志
3. 运行检查脚本：`node scripts/check-admin-table-structure.js`
4. 在 Supabase SQL Editor 中查询表状态：

```sql
-- 查看完整的管理员信息
SELECT 
  a.*,
  u.email as auth_email,
  u.email_confirmed_at,
  u.encrypted_password IS NOT NULL as has_password
FROM admin_users a
LEFT JOIN auth.users u ON a.user_id = u.id;
```

## 迁移后的下一步

迁移成功后：

1. 阅读 [ADMIN_AUTH_SETUP.md](./ADMIN_AUTH_SETUP.md) 了解完整功能
2. 阅读 [ADMIN_TESTING_GUIDE.md](./ADMIN_TESTING_GUIDE.md) 进行测试
3. 配置更多管理员账号
4. 设置强密码策略
5. 定期检查审计日志

---

**迁移版本**: v1.0  
**最后更新**: 2025-10-27  
**适用于**: 从旧版 admin_users 表迁移到新的后台独立登录系统
