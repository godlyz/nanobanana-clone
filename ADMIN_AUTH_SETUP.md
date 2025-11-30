# 后台独立登录系统设置指南

本指南说明如何设置和使用后台独立登录系统。

## ⚠️ 重要提示

如果你的项目已经有 `admin_users` 表但结构不同，请先阅读 [现有表迁移](#现有表迁移) 章节。

## 系统架构

### 前后台分离

- **前台**：使用 OAuth 登录（GitHub、Google），访问路径：`/`, `/editor`, `/profile` 等
- **后台**：使用邮箱密码登录，访问路径：`/admin`, `/admin/config`, `/admin/promotions` 等
- **认证隔离**：前后台使用独立的 session cookies，互不干扰

### 技术实现

1. **后台专用 Cookie**：
   - `admin-access-token`：后台访问令牌
   - `admin-refresh-token`：后台刷新令牌
   - Cookie 路径限制为 `/admin`

2. **中间件保护**：
   - 所有 `/admin/*` 路由（除了 `/admin/login` 和 `/admin/logout`）需要验证管理员权限
   - 未登录或非管理员会被重定向到 `/admin/login`

3. **后台专用 Supabase Client**：
   - 位置：`lib/supabase/admin-client.ts`
   - 使用后台专用 cookies
   - 提供 `verifyAdminAccess()` 函数验证管理员权限

## 现有表迁移

### 检查现有表结构

如果你的项目已经有 `admin_users` 表，先检查表结构：

```bash
node scripts/check-admin-table-structure.js
```

如果输出显示表结构为：
```
['id', 'email', 'name', 'role', 'status', 'auth_provider', 'email_verified', 'created_at', 'updated_at']
```

说明缺少 `user_id` 列，需要执行迁移。

### 执行迁移脚本

**步骤 1：在 Supabase Dashboard -> SQL Editor 中执行**：

```sql
-- 添加 user_id 列
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 填充 user_id（从 auth.users 匹配）
UPDATE admin_users 
SET user_id = auth.users.id
FROM auth.users
WHERE admin_users.email = auth.users.email
AND admin_users.user_id IS NULL;

-- 添加唯一约束
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_user_id_unique;

ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- 验证结果
SELECT id, email, name, role, status, user_id 
FROM admin_users;
```

**步骤 2：提升现有账号为管理员**：

```sql
-- 将你的账号设置为超级管理员
UPDATE admin_users 
SET role = 'super_admin', 
    status = 'active', 
    updated_at = NOW()
WHERE email = 'your-email@example.com';  -- 替换为你的邮箱
```

**步骤 3：为 OAuth 账号设置密码**：

如果你的账号是通过 Google/GitHub OAuth 创建的，需要设置密码：

```sql
-- 设置密码（请修改为强密码）
UPDATE auth.users 
SET encrypted_password = crypt('YourStrongPassword123!', gen_salt('bf'))
WHERE email = 'your-email@example.com';  -- 替换为你的邮箱
```

**步骤 4：验证设置**：

```sql
-- 验证管理员账号
SELECT 
  a.id,
  a.email,
  a.name,
  a.role,
  a.status,
  a.user_id,
  u.email as auth_email
FROM admin_users a
LEFT JOIN auth.users u ON a.user_id = u.id
WHERE a.email = 'your-email@example.com';
```

迁移完成后，继续阅读下面的"创建管理员账号"章节（新项目使用）。

---

## 创建管理员账号

### 方式一：使用 Supabase Dashboard（推荐）

1. **创建 Auth 用户**：
   ```sql
   -- 在 Supabase SQL Editor 中执行
   -- 注意：请使用强密码
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
     raw_user_meta_data,
     is_super_admin,
     confirmation_token,
     email_change,
     email_change_token_new,
     recovery_token
   ) VALUES (
     '00000000-0000-0000-0000-000000000000',
     gen_random_uuid(),
     'authenticated',
     'authenticated',
     'kn197884@gmail.com', -- 修改为你的邮箱
     crypt('Godsskps84', gen_salt('bf')), -- 修改为你的密码
     now(),
     now(),
     now(),
     '{"provider":"email","providers":["email"]}',
     '{}',
     false,
     '',
     '',
     '',
     ''
   )
   RETURNING id;
   ```

2. **将用户添加到管理员表**：
   ```sql
   -- 使用上一步返回的 user_id
   INSERT INTO admin_users (
     user_id,
     email,
     role,
     status
   ) VALUES (
     'user-id-from-previous-step', -- 替换为实际的 user_id
     'admin@example.com', -- 修改为你的邮箱
     'super_admin', -- 角色：super_admin / admin / viewer
     'active'
   );
   ```

### 方式二：使用 Supabase Auth API

1. **在前台注册一个账号**（使用 OAuth 或邮箱注册）

2. **将该用户提升为管理员**：
   ```sql
   -- 在 Supabase SQL Editor 中执行
   INSERT INTO admin_users (
     user_id,
     email,
     role,
     status
   )
   SELECT 
     id,
     email,
     'super_admin', -- 角色：super_admin / admin / viewer
     'active'
   FROM auth.users
   WHERE email = 'your-email@example.com'; -- 修改为你的邮箱
   ```

### 方式三：使用脚本（已有脚本）

如果项目中有 `scripts/upgrade-google-user-to-admin.js`：

```bash
# 运行脚本
node scripts/upgrade-google-user-to-admin.js
```

## 管理员角色说明

### super_admin（超级管理员）
- 拥有所有权限
- 可以创建/编辑/删除所有配置
- 可以管理其他管理员账号
- 可以查看和导出审计日志

### admin（管理员）
- 可以创建/编辑配置和活动规则
- 可以查看用户信息
- 可以查看审计日志
- 不能删除配置或管理其他管理员

### viewer（查看者）
- 只读权限
- 可以查看所有配置和数据
- 不能进行任何修改操作

## 登录流程

1. 访问 `http://localhost:3000/admin/login`（开发环境）或 `https://your-domain.com/admin/login`（生产环境）

2. 输入管理员邮箱和密码

3. 点击"登录"按钮

4. 登录成功后自动跳转到 `/admin` 仪表板

## 登出流程

1. 在后台页面点击右上角的"退出"按钮

2. 自动清除后台 session cookies

3. 重定向到 `/admin/login` 登录页

## 安全建议

### 密码要求
- 至少 12 个字符
- 包含大小写字母、数字和特殊字符
- 不要使用常见密码或个人信息

### 环境变量保护
确保以下环境变量已正确配置：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 生产环境设置
NODE_ENV=production
```

### 审计日志
- 所有管理员操作都会记录在 `audit_logs` 表中
- 包括登录、登出、配置修改等操作
- 定期检查审计日志以发现异常活动

## 故障排查

### 问题：无法登录，提示"邮箱或密码错误"

**解决方案**：
1. 确认邮箱拼写正确
2. 确认密码正确
3. 检查用户是否在 `admin_users` 表中且状态为 `active`

### 问题：登录成功但立即被重定向到登录页

**解决方案**：
1. 检查浏览器是否禁用了 cookies
2. 检查 `admin_users` 表中用户的 `status` 字段是否为 `active`
3. 检查浏览器控制台是否有错误信息

### 问题：前台和后台登录冲突

**解决方案**：
- 不会冲突！前后台使用独立的 cookies：
  - 前台使用 Supabase 标准 cookies
  - 后台使用 `admin-access-token` 和 `admin-refresh-token`
- 可以同时在前台和后台登录不同的账号

### 问题：中间件一直重定向

**解决方案**：
1. 检查 `middleware.ts` 是否正确配置
2. 确认 `/admin/login` 和 `/admin/logout` 被排除在保护之外
3. 清除浏览器 cookies 后重新登录

## 开发调试

### 查看后台 Cookies

在浏览器开发者工具 -> Application -> Cookies 中查看：
- `admin-access-token`
- `admin-refresh-token`

### 测试管理员权限

```typescript
// 在后台页面的 Server Component 中
import { verifyAdminAccess } from '@/lib/supabase/admin-client'

export default async function AdminPage() {
  const { isAdmin, user, adminUser, error } = await verifyAdminAccess()

  if (!isAdmin) {
    console.log('非管理员:', error)
    return <div>权限不足</div>
  }

  console.log('管理员信息:', adminUser)
  return <div>欢迎, {adminUser.email}</div>
}
```

### 手动清除后台 Session

在浏览器控制台中执行：
```javascript
document.cookie = 'admin-access-token=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
document.cookie = 'admin-refresh-token=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
location.reload()
```

## API 端点

### POST /api/admin/auth/login
登录接口

**请求**：
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**响应**：
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "super_admin"
  }
}
```

### POST /api/admin/auth/logout
登出接口

**响应**：
```json
{
  "success": true,
  "message": "已成功登出"
}
```

## 相关文件

- 登录页面：`app/admin/login/page.tsx`
- 登出页面：`app/admin/logout/page.tsx`
- 登录 API：`app/api/admin/auth/login/route.ts`
- 登出 API：`app/api/admin/auth/logout/route.ts`
- 后台 Client：`lib/supabase/admin-client.ts`
- 中间件：`middleware.ts`
- 后台布局：`app/admin/layout.tsx`

## 下一步

1. 创建第一个管理员账号
2. 访问 `/admin/login` 登录
3. 在后台仪表板查看系统状态
4. 配置系统参数和活动规则

如有问题，请查看项目文档或联系技术支持。
