# 前后台分离实现总结

## 概述

本项目已成功实现前后台分离，后台拥有独立的登录系统，与前台 OAuth 登录完全隔离。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       用户访问层                              │
│                                                             │
│  前台 (/)                           后台 (/admin)           │
│  ├─ OAuth 登录 (GitHub/Google)      ├─ 邮箱密码登录         │
│  ├─ 普通用户功能                     ├─ 管理员功能           │
│  └─ 使用标准 Supabase cookies       └─ 使用独立 cookies     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Middleware                       │
│                                                             │
│  ├─ 前台路由: 使用 updateSession()                          │
│  └─ 后台路由: 验证 admin-access-token + admin_users 表      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│                                                             │
│  ├─ auth.users (共用)                                       │
│  ├─ admin_users (后台专用)                                  │
│  └─ audit_logs (后台审计)                                   │
└─────────────────────────────────────────────────────────────┘
```

## 技术实现

### 1. Cookie 隔离

**前台 Cookies**：
- `sb-access-token` - 路径: `/`
- `sb-refresh-token` - 路径: `/`
- 由 Supabase Auth 标准流程管理

**后台 Cookies**：
- `admin-access-token` - 路径: `/admin`
- `admin-refresh-token` - 路径: `/admin`
- 由后台专用登录 API 管理

### 2. 认证流程

#### 前台登录流程

```
1. 用户访问 /login
2. 选择 OAuth 提供商 (GitHub/Google)
3. OAuth 回调处理 (/auth/callback)
4. Supabase 创建标准 session
5. 设置前台 cookies (sb-*)
6. 重定向到前台页面
```

#### 后台登录流程

```
1. 管理员访问 /admin/login
2. 输入邮箱密码
3. POST /api/admin/auth/login
4. 验证邮箱密码（Supabase Auth）
5. 检查 admin_users 表
6. 设置后台 cookies (admin-*)
7. 记录审计日志
8. 重定向到 /admin
```

### 3. 中间件保护

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 后台路由保护
  if (pathname.startsWith('/admin')) {
    // 允许登录页和登出页
    if (pathname === '/admin/login' || pathname === '/admin/logout') {
      return NextResponse.next()
    }

    // 验证 admin-access-token
    const adminAccessToken = request.cookies.get('admin-access-token')
    
    if (!adminAccessToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // 验证用户是否为管理员
    const { isAdmin } = await verifyAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return NextResponse.next()
  }

  // 前台路由使用标准 session 更新
  return await updateSession(request)
}
```

## 文件结构

### 新增文件

```
app/
├── admin/
│   ├── login/
│   │   └── page.tsx                    # 后台登录页面
│   └── logout/
│       └── page.tsx                    # 后台登出页面
│
├── api/
│   └── admin/
│       └── auth/
│           ├── login/
│           │   └── route.ts            # 后台登录 API
│           └── logout/
│               └── route.ts            # 后台登出 API
│
lib/
└── supabase/
    └── admin-client.ts                 # 后台专用 Supabase Client

scripts/
└── create-admin-user.js                # 创建管理员账号脚本

middleware.ts                           # 更新：添加后台路由保护

ADMIN_AUTH_SETUP.md                     # 后台认证设置指南
ADMIN_TESTING_GUIDE.md                  # 测试指南
.env.admin.example                      # 环境变量示例
```

### 修改文件

```
app/admin/layout.tsx                    # 添加登出按钮
middleware.ts                           # 添加后台路由保护逻辑
```

## 数据库表

### admin_users 表

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,                    -- super_admin / admin / viewer
  status VARCHAR(20) DEFAULT 'active',          -- active / inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_logs 表

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type VARCHAR(50) NOT NULL,             -- admin_login / admin_logout / config_write 等
  resource_type VARCHAR(50) NOT NULL,           -- auth / config / promotion 等
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 管理员角色权限

### super_admin（超级管理员）
- 所有权限
- 可以管理其他管理员
- 可以删除配置和活动规则

### admin（管理员）
- 可以创建/编辑配置
- 可以创建/编辑活动规则
- 可以查看用户信息
- 不能删除或管理其他管理员

### viewer（查看者）
- 只读权限
- 可以查看所有数据
- 不能进行任何修改

## 快速开始

### 0. 检查是否需要迁移（重要！）

如果你的项目已经有 `admin_users` 表，先检查是否需要迁移：

```bash
node scripts/check-admin-table-structure.js
```

如果输出显示缺少 `user_id` 列，请先阅读 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 执行迁移。

### 1. 创建管理员账号

**新项目**：

```bash
node scripts/create-admin-user.js
```

按提示输入管理员信息。

**已有项目（需要迁移）**：

参考 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 执行迁移步骤。

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 登录后台

访问 `http://localhost:3000/admin/login`，使用创建的管理员账号登录。

### 4. 测试前后台隔离

- 标签页 A：登录后台 `/admin/login`（使用管理员邮箱密码）
- 标签页 B：登录前台 `/login`（使用 OAuth）
- 两个登录状态应该互不影响

## 安全特性

### 1. Cookie 安全
- `httpOnly: true` - 防止 XSS 攻击
- `secure: true` - 生产环境强制 HTTPS
- `sameSite: 'lax'` - 防止 CSRF 攻击
- 路径限制 - 后台 cookies 仅限 `/admin` 路径

### 2. 认证安全
- 密码使用 Supabase Auth 加密存储
- 双重验证：Auth 用户 + admin_users 表
- Session 自动过期和刷新

### 3. 审计日志
- 记录所有登录/登出操作
- 记录 IP 地址和 User-Agent
- 可追溯所有管理员操作

### 4. 权限控制
- 基于角色的访问控制（RBAC）
- 中间件级别的路由保护
- API 级别的权限检查

## API 文档

### POST /api/admin/auth/login

**请求**：
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**成功响应（200）**：
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

**错误响应**：
- 400: 缺少必填字段
- 401: 邮箱或密码错误
- 403: 该账号不是管理员或未激活
- 500: 服务器错误

### POST /api/admin/auth/logout

**成功响应（200）**：
```json
{
  "success": true,
  "message": "已成功登出"
}
```

## 环境变量

```bash
# Supabase 配置（前后台共用）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 生产环境
NODE_ENV=production
```

## 测试清单

- [x] 后台独立登录功能
- [x] 后台登出功能
- [x] 前后台登录隔离
- [x] 中间件路由保护
- [x] 管理员权限验证
- [x] Cookie 安全设置
- [x] 审计日志记录
- [x] 会话过期处理
- [x] 错误提示和处理

## 常见问题

### Q: 前台和后台可以同时登录吗？

A: 可以！前后台使用不同的 cookies 和认证系统，完全独立。你可以在前台以普通用户身份登录，同时在后台以管理员身份登录。

### Q: 如何重置管理员密码？

A: 有两种方式：
1. 使用 Supabase Dashboard 的 Auth 面板重置
2. 运行脚本删除旧账号，创建新账号

### Q: 管理员账号可以使用 OAuth 登录吗？

A: 不可以。后台管理员必须使用邮箱密码登录，这样更安全，也便于管理。

### Q: 前台普通用户可以访问后台吗？

A: 不可以。即使前台用户已登录，访问 `/admin` 也会被重定向到 `/admin/login`，因为中间件会检查 `admin_users` 表。

### Q: 如何添加更多管理员？

A: 运行 `node scripts/create-admin-user.js` 脚本，输入新管理员的信息即可。

## 下一步改进

### 短期（可选）
- [ ] 添加管理员密码重置功能
- [ ] 添加两步验证（2FA）
- [ ] 添加登录失败次数限制
- [ ] 添加管理员在线状态显示

### 长期（可选）
- [ ] 支持 SSO 单点登录
- [ ] 支持 LDAP/Active Directory
- [ ] 添加管理员操作审批流程
- [ ] 添加管理员权限分组管理

## 相关文档

- [ADMIN_AUTH_SETUP.md](./ADMIN_AUTH_SETUP.md) - 后台认证设置详细指南
- [ADMIN_TESTING_GUIDE.md](./ADMIN_TESTING_GUIDE.md) - 完整测试指南
- [ADMIN_BACKEND_PLAN.md](./ADMIN_BACKEND_PLAN.md) - 后台系统整体设计
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 配置指南

## 技术栈

- **框架**: Next.js 14 (App Router)
- **认证**: Supabase Auth
- **数据库**: PostgreSQL (Supabase)
- **语言**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS

## 联系与支持

如有问题或建议，请：
1. 查看相关文档
2. 检查测试指南
3. 查看浏览器控制台和服务器日志
4. 提交 Issue 或联系技术支持

---

**文档版本**: v1.0  
**最后更新**: 2025-10-27  
**状态**: ✅ 已完成并测试
