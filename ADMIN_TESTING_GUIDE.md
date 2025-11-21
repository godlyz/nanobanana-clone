# 后台独立登录系统测试指南

本指南帮助你测试前后台分离的登录系统。

## 测试准备

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

确保 `.env.local` 文件包含以下配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 创建管理员账号

运行创建管理员脚本：

```bash
node scripts/create-admin-user.js
```

按提示输入：
- 邮箱地址（例如：admin@test.com）
- 密码（至少8位）
- 角色（super_admin/admin/viewer，默认 admin）

**示例输出**：
```
=== 创建后台管理员账号 ===

邮箱地址: admin@test.com
密码 (至少8位): Test1234!
角色 (super_admin/admin/viewer, 默认: admin): super_admin

正在创建管理员账号...

步骤 1/2: 创建 Auth 用户...
✅ Auth 用户创建成功
  - 用户ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

步骤 2/2: 添加到管理员表...
✅ 管理员账号创建成功!

管理员信息:
  - 邮箱: admin@test.com
  - 密码: ******** (已设置)
  - 角色: super_admin
  - 用户ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

现在可以使用该账号登录后台: http://localhost:3000/admin/login
```

### 4. 启动开发服务器

```bash
pnpm dev
```

## 测试场景

### 场景 1: 后台独立登录

**目标**：验证后台可以使用邮箱密码登录

**步骤**：
1. 访问 `http://localhost:3000/admin/login`
2. 输入管理员邮箱和密码
3. 点击"登录"按钮

**预期结果**：
- ✅ 登录成功，跳转到 `/admin` 仪表板
- ✅ 可以看到管理员信息和系统统计
- ✅ 浏览器 Cookies 中有 `admin-access-token` 和 `admin-refresh-token`

**失败排查**：
- 如果显示"邮箱或密码错误"：检查输入是否正确
- 如果显示"该账号不是管理员"：检查 `admin_users` 表中是否有该用户
- 如果登录后立即跳回登录页：检查浏览器控制台错误信息

### 场景 2: 后台权限保护

**目标**：验证未登录无法访问后台页面

**步骤**：
1. 在浏览器隐私模式中访问 `http://localhost:3000/admin`
2. 观察是否被重定向

**预期结果**：
- ✅ 自动重定向到 `/admin/login` 登录页
- ✅ URL 变为 `http://localhost:3000/admin/login`

### 场景 3: 后台登出

**目标**：验证登出功能正常

**步骤**：
1. 在已登录的后台页面
2. 点击右上角"退出"按钮
3. 观察页面跳转

**预期结果**：
- ✅ 跳转到 `/admin/login` 登录页
- ✅ 浏览器 Cookies 中的 `admin-access-token` 和 `admin-refresh-token` 被清除
- ✅ 访问 `/admin` 会被重定向到登录页

### 场景 4: 前后台隔离测试

**目标**：验证前后台登录互不影响

**步骤**：
1. 打开浏览器标签页 A，访问 `http://localhost:3000/admin/login`
2. 使用管理员账号登录后台（admin@test.com）
3. 打开浏览器标签页 B，访问 `http://localhost:3000/login`
4. 使用普通用户账号登录前台（使用 GitHub 或 Google OAuth）
5. 分别在两个标签页刷新

**预期结果**：
- ✅ 标签页 A 仍然显示后台仪表板，管理员身份保持
- ✅ 标签页 B 显示前台内容，用户身份保持
- ✅ 两个登录状态互不影响
- ✅ 后台 cookies (`admin-access-token`) 和前台 cookies (`sb-access-token`) 分别存在

**检查 Cookies**：
在浏览器开发者工具 -> Application -> Cookies 中查看：

**后台 Cookies（标签页 A）**：
- `admin-access-token` - 路径: `/admin`
- `admin-refresh-token` - 路径: `/admin`

**前台 Cookies（标签页 B）**：
- `sb-access-token` - 路径: `/`
- `sb-refresh-token` - 路径: `/`

### 场景 5: 不同角色权限测试

**目标**：验证不同角色的权限控制

**步骤**：
1. 创建三个不同角色的管理员账号：
   - super_admin@test.com (超级管理员)
   - admin@test.com (管理员)
   - viewer@test.com (查看者)

2. 分别登录每个账号，尝试访问不同功能

**预期结果**：

**super_admin（超级管理员）**：
- ✅ 可以查看所有页面
- ✅ 可以创建/编辑/删除配置
- ✅ 可以创建/编辑/删除活动规则
- ✅ 可以管理其他管理员
- ✅ 可以查看和导出审计日志

**admin（管理员）**：
- ✅ 可以查看所有页面
- ✅ 可以创建/编辑配置（但不能删除）
- ✅ 可以创建/编辑活动规则
- ❌ 不能管理其他管理员
- ✅ 可以查看审计日志（但不能导出）

**viewer（查看者）**：
- ✅ 可以查看所有页面
- ❌ 不能创建/编辑/删除任何内容
- ❌ 所有操作按钮应该被禁用或隐藏

### 场景 6: 会话过期测试

**目标**：验证会话过期后的行为

**步骤**：
1. 登录后台
2. 手动删除 `admin-access-token` cookie（开发者工具 -> Application -> Cookies）
3. 刷新页面或点击导航链接

**预期结果**：
- ✅ 自动重定向到 `/admin/login` 登录页
- ✅ 显示未登录状态

### 场景 7: 直接访问 API 测试

**目标**：验证未登录无法访问后台 API

**步骤**：
使用 curl 或 Postman 测试：

```bash
# 测试：未登录访问后台 API
curl http://localhost:3000/api/admin/dashboard

# 预期：返回 401 或重定向
```

```bash
# 测试：使用错误的 token
curl http://localhost:3000/api/admin/dashboard \
  -H "Cookie: admin-access-token=invalid_token"

# 预期：返回 401 或错误信息
```

## 常见问题排查

### 问题 1: 无法登录，一直显示"加载中"

**可能原因**：
- Supabase 连接失败
- 环境变量配置错误

**解决方案**：
1. 检查 `.env.local` 文件中的 Supabase 配置
2. 在浏览器控制台查看错误信息
3. 检查网络请求是否成功

### 问题 2: 登录后立即被踢出

**可能原因**：
- 用户不在 `admin_users` 表中
- 用户状态为 `inactive`

**解决方案**：
```sql
-- 在 Supabase SQL Editor 中检查
SELECT * FROM admin_users WHERE email = 'your-email@example.com';

-- 如果状态是 inactive，更新为 active
UPDATE admin_users 
SET status = 'active' 
WHERE email = 'your-email@example.com';
```

### 问题 3: 前台和后台登录冲突

**可能原因**：
- Cookie 路径配置错误
- 中间件配置错误

**解决方案**：
1. 清除所有浏览器 cookies
2. 检查 `lib/supabase/admin-client.ts` 中 cookie 路径设置
3. 检查 `middleware.ts` 配置

### 问题 4: 创建管理员脚本失败

**可能原因**：
- 缺少 `@supabase/supabase-js` 包
- 环境变量未设置

**解决方案**：
```bash
# 安装依赖
pnpm install @supabase/supabase-js

# 检查环境变量
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)"
```

## 审计日志验证

登录成功后，可以在数据库中查看审计日志：

```sql
-- 查看最近的登录日志
SELECT 
  al.*,
  au.email
FROM audit_logs al
JOIN admin_users au ON al.admin_id = au.user_id
WHERE al.action_type IN ('admin_login', 'admin_logout')
ORDER BY al.created_at DESC
LIMIT 10;
```

**预期结果**：
- 每次登录都会记录 `admin_login` 事件
- 每次登出都会记录 `admin_logout` 事件
- 包含 IP 地址和 User-Agent 信息

## 性能测试

### 中间件性能

**测试方法**：
```bash
# 使用 Apache Bench 测试中间件性能
ab -n 1000 -c 10 http://localhost:3000/admin/login
```

**预期结果**：
- 平均响应时间 < 100ms
- 无错误请求

### 数据库查询性能

**检查点**：
1. 中间件中的管理员验证查询是否有索引
2. 登录时的查询次数（应该 ≤ 3 次）

```sql
-- 确保有适当的索引
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status) WHERE status = 'active';
```

## 安全检查清单

- [ ] 密码长度至少 8 位
- [ ] 管理员账号邮箱非公开
- [ ] 生产环境使用 HTTPS
- [ ] Session cookies 设置 `httpOnly: true`
- [ ] Session cookies 设置 `secure: true`（生产环境）
- [ ] 中间件正确验证所有 `/admin` 路由
- [ ] API 端点有权限检查
- [ ] 审计日志记录所有敏感操作
- [ ] 管理员登录有日志记录

## 测试完成标准

✅ 所有 7 个测试场景都通过
✅ 前后台登录完全隔离
✅ 权限控制正常工作
✅ 审计日志正确记录
✅ 无安全漏洞

## 下一步

测试通过后：
1. 在生产环境重复测试
2. 配置管理员邮箱白名单（可选）
3. 设置强密码策略
4. 启用两步验证（如需要）
5. 定期审查审计日志

## 报告问题

如果遇到问题，请提供：
1. 错误截图
2. 浏览器控制台日志
3. 服务器日志（如果可访问）
4. 环境信息（Node 版本、浏览器版本等）
