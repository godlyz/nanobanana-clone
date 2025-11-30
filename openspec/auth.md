# 认证和登录系统

## 认证架构

### 认证提供商
- **Supabase Auth** - 核心认证服务
- **OAuth 提供商**:
  - GitHub OAuth
  - Google OAuth

### 认证流程

```
用户 → 点击登录按钮
  ↓
前端 → /auth/login (选择 GitHub 或 Google)
  ↓
Supabase → 重定向到 OAuth 提供商
  ↓
OAuth → 用户授权
  ↓
OAuth → 重定向到 /auth/callback
  ↓
后端 → 交换 code 获取 session
  ↓
后端 → 创建/更新用户记录
  ↓
后端 → 设置 cookies
  ↓
后端 → 重定向到 /profile
  ↓
用户 → 查看个人资料
```

---

## 核心文件

### 客户端
- **lib/supabase/client.ts** - 浏览器端 Supabase 客户端
- **lib/supabase/middleware.ts** - 中间件认证配置
- **middleware.ts** - Next.js 路由中间件

### 服务端
- **lib/supabase/server.ts** - 服务器端 Supabase 客户端
- **lib/supabase/service.ts** - 管理员服务客户端
- **lib/supabase/admin-client.ts** - Admin API 客户端

### API 路由
- **app/auth/login/route.ts** - 登录入口
- **app/auth/callback/route.ts** - OAuth 回调处理
- **app/auth/logout/route.ts** - 登出处理

---

## GitHub OAuth 配置

### 1. 创建 GitHub OAuth App

访问：https://github.com/settings/developers

**配置项**：
```
Application name: Nano Banana
Homepage URL: http://localhost:3000
Authorization callback URL: 
  https://<your-project>.supabase.co/auth/v1/callback
```

### 2. 配置 Supabase

访问：https://supabase.com/dashboard/project/<your-project>/auth/providers

**GitHub Provider**：
- 启用 GitHub
- 填入 `Client ID`
- 填入 `Client Secret`

### 3. 测试登录

访问：http://localhost:3000/login

点击 "Continue with GitHub" → 授权 → 重定向到 /profile

---

## Google OAuth 配置

### 1. 创建 Google OAuth 应用

访问：https://console.cloud.google.com/apis/credentials

**配置项**：
```
Application type: Web application
Name: Nano Banana
Authorized JavaScript origins:
  - http://localhost:3000
  - https://your-domain.com
Authorized redirect URIs:
  - https://<your-project>.supabase.co/auth/v1/callback
```

### 2. 配置 Supabase

访问：https://supabase.com/dashboard/project/<your-project>/auth/providers

**Google Provider**：
- 启用 Google
- 填入 `Client ID`
- 填入 `Client Secret`

### 3. 可选：环境变量

```bash
# .env.local（可选）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**配置文档**: [GOOGLE_AUTH_SETUP.md](../GOOGLE_AUTH_SETUP.md)

---

## 用户数据结构

### auth.users (Supabase 内置)
```typescript
{
  id: string;                    // UUID
  email: string;                 // 邮箱
  email_confirmed_at: timestamp; // 邮箱确认时间
  phone: string | null;          // 手机号
  created_at: timestamp;         // 创建时间
  updated_at: timestamp;         // 更新时间
  
  // OAuth 相关
  user_metadata: {
    avatar_url: string;          // 头像 URL
    full_name: string;           // 全名
    provider: string;            // github | google
    provider_id: string;         // OAuth 提供商用户 ID
  }
}
```

### 扩展用户信息

项目通过 `user_credits` 表扩展用户信息：
```typescript
{
  user_id: string;               // 外键 -> auth.users.id
  total_credits: number;         // 总可用积分
  created_at: timestamp;
  updated_at: timestamp;
}
```

---

## 路由保护

### 中间件配置

**middleware.ts**：
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 公开路由：不需要认证
  const publicPaths = ['/', '/login', '/pricing', '/api']
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }
  
  // 获取用户 session
  const supabase = createServerClient(/* ... */)
  const { data: { session } } = await supabase.auth.getSession()
  
  // 未登录：重定向到登录页
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/editor/:path*',
    '/profile',
    '/admin/:path*'
  ]
}
```

### 保护的路由

| 路由 | 权限要求 | 说明 |
|------|---------|------|
| `/editor/*` | 登录用户 | 图像编辑器 |
| `/profile` | 登录用户 | 个人资料 |
| `/admin/*` | 管理员 | 管理后台 |
| `/api/generate` | 登录用户 | AI 生成 API |
| `/api/credits/*` | 登录用户 | 积分 API |

---

## Session 管理

### Cookies 配置

Supabase 使用 HTTP-only cookies 存储 session：
```
sb-<project-id>-auth-token
```

**安全配置**：
- `HttpOnly: true` - 防止 XSS 攻击
- `Secure: true` - 生产环境 HTTPS only
- `SameSite: Lax` - CSRF 保护

### Session 有效期

- **默认**: 1 小时
- **刷新**: 自动刷新（通过 refresh token）
- **最大**: 7 天（可配置）

### 刷新 Session

客户端自动刷新：
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 监听 auth 状态变化
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed:', session)
  }
})
```

---

## 管理员认证

### 管理员表结构

**admin_users**：
```typescript
{
  id: string;                    // UUID
  user_id: string;               // 外键 -> auth.users.id
  email: string;                 // 管理员邮箱
  password_hash: string;         // 密码哈希 (bcrypt)
  role: string;                  // super_admin | admin | operator
  is_active: boolean;            // 是否启用
  last_login_at: timestamp;      // 最后登录时间
  created_at: timestamp;
  updated_at: timestamp;
}
```

### 管理员登录流程

```
管理员 → /admin/login (输入邮箱密码)
  ↓
后端 → 验证邮箱和密码 (bcrypt.compare)
  ↓
后端 → 创建 JWT token
  ↓
后端 → 设置 admin-token cookie
  ↓
后端 → 重定向到 /admin/dashboard
  ↓
管理员 → 访问管理后台
```

### 管理员 API 保护

**lib/admin-auth.ts**：
```typescript
import { NextRequest } from 'next/server'
import { verifyAdminToken } from './jwt'

export async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 }
  }
  
  const payload = await verifyAdminToken(token)
  if (!payload) {
    return { error: 'Invalid token', status: 401 }
  }
  
  return { admin: payload }
}
```

**使用示例**：
```typescript
// app/api/admin/users/route.ts
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  // 查询用户列表
  const users = await fetchUsers()
  return NextResponse.json(users)
}
```

---

## 权限系统

### 角色定义

| 角色 | 权限 | 说明 |
|------|------|------|
| `super_admin` | 所有权限 | 超级管理员 |
| `admin` | 查看、编辑用户/订阅/积分 | 普通管理员 |
| `operator` | 查看数据、处理工单 | 运营人员 |

### 权限检查

**lib/user-permission-check.ts**：
```typescript
export async function checkPermission(
  adminId: string,
  requiredRole: 'super_admin' | 'admin' | 'operator'
): Promise<boolean> {
  const admin = await getAdminUser(adminId)
  
  if (!admin || !admin.is_active) {
    return false
  }
  
  const roleHierarchy = {
    super_admin: 3,
    admin: 2,
    operator: 1
  }
  
  return roleHierarchy[admin.role] >= roleHierarchy[requiredRole]
}
```

---

## 安全最佳实践

### 1. 密码安全
- ✅ 使用 bcrypt 加密（cost factor = 10）
- ✅ 最小长度 8 字符
- ✅ 强制密码复杂度（大小写+数字+特殊字符）

### 2. Session 安全
- ✅ HTTP-only cookies
- ✅ Secure flag（生产环境）
- ✅ SameSite=Lax 防御 CSRF
- ✅ 定期刷新 token

### 3. API 安全
- ✅ 所有敏感 API 要求认证
- ✅ Rate limiting（防止暴力破解）
- ✅ Input validation（防止注入攻击）
- ✅ CORS 配置

### 4. 日志和审计
- ✅ 记录所有登录尝试
- ✅ 记录管理员操作
- ✅ 异常行为监控

**配置文档**: [ADMIN_AUTH_SETUP.md](../ADMIN_AUTH_SETUP.md)

---

## 常见问题

### Q1: 登录后立即登出
**可能原因**：
- Cookie domain 不匹配
- Supabase URL 配置错误
- Session 刷新失败

**解决方法**：
```typescript
// 检查 Supabase 客户端配置
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
)
```

### Q2: OAuth 回调失败
**可能原因**：
- Redirect URI 不匹配
- OAuth App 配置错误

**解决方法**：
- 检查 GitHub/Google OAuth App 的 Redirect URI
- 确保使用 Supabase 的回调 URL：
  `https://<project-id>.supabase.co/auth/v1/callback`

### Q3: 中间件无限重定向
**可能原因**：
- `/login` 路由也被中间件保护

**解决方法**：
```typescript
// middleware.ts
const publicPaths = ['/', '/login', '/auth/callback']
if (publicPaths.some(path => pathname.startsWith(path))) {
  return NextResponse.next()
}
```

---

## API 参考

### 客户端 Auth API

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser()

// 获取 session
const { data: { session } } = await supabase.auth.getSession()

// GitHub 登录
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})

// Google 登录
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})

// 登出
await supabase.auth.signOut()
```

### 服务端 Auth API

```typescript
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const supabase = createClient(cookies())

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser()

// 获取 session
const { data: { session } } = await supabase.auth.getSession()
```

---

## 相关文档

- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) - Supabase 配置
- [GOOGLE_AUTH_SETUP.md](../GOOGLE_AUTH_SETUP.md) - Google OAuth 配置
- [GITHUB_AUTH_README.md](../GITHUB_AUTH_README.md) - GitHub OAuth 配置
- [ADMIN_AUTH_SETUP.md](../ADMIN_AUTH_SETUP.md) - 管理员认证
- [openspec/users.md](./users.md) - 用户管理规则
