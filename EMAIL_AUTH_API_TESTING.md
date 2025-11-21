# 📡 邮箱认证系统 API 接口测试指南

> **老王提醒**：这个文档包含所有认证API的测试方法，照着测就完事了！

## 🎯 测试前准备

### 1. 环境配置检查

确保 `.env.local` 中配置了以下必需项：

```bash
# JWT Secret（必需）
JWT_SECRET=your_jwt_secret_here

# Supabase（必需）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend Email Service（必需）
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Cloudflare Turnstile（必需）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

### 2. 数据库迁移

确保已执行数据库迁移（参考 `DATABASE_MIGRATION_GUIDE.md`）：

```bash
# 检查表是否存在
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
AND tablename IN ('user_sessions', 'email_verification_codes', 'login_logs', 'rate_limit_logs');
```

### 3. 启动开发服务器

```bash
pnpm dev
```

服务器运行在：`http://localhost:3000`

## 📋 API 接口列表

| 接口 | 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|------|
| 发送验证码 | POST | `/api/auth/send-code` | ❌ | 发送邮箱验证码 |
| 用户注册 | POST | `/api/auth/register` | ❌ | 注册新用户 |
| 用户登录 | POST | `/api/auth/login` | ❌ | 用户登录 |
| 重置密码 | POST | `/api/auth/reset-password` | ❌ | 忘记密码重置 |
| 修改密码 | POST | `/api/auth/change-password` | ✅ | 已登录用户修改密码 |
| 用户登出 | POST | `/api/auth/logout` | ✅ | 登出当前会话 |
| 验证会话 | POST | `/api/auth/verify` | ✅ | 验证会话Token |

## 🧪 详细测试步骤

### 1. 发送验证码接口

**端点**: `POST /api/auth/send-code`

**功能**: 发送邮箱验证码（用于注册、重置密码、修改密码）

**请求参数**:
```json
{
  "email": "test@example.com",
  "purpose": "register",
  "turnstileToken": "dev-mode-bypass-token"
}
```

**参数说明**:
- `email` (必需): 邮箱地址
- `purpose` (必需): 用途，可选值：`register` | `reset_password` | `change_password`
- `turnstileToken` (必需): Turnstile验证Token（开发模式可用 `dev-mode-bypass-token`）

**curl 测试命令**:
```bash
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "purpose": "register",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "验证码已发送",
  "code": "123456"
}
```

**注意**: `code` 字段仅在开发环境返回，生产环境不会返回验证码。

**错误响应示例**:

- **邮箱格式无效** (400):
```json
{
  "error": "邮箱格式无效"
}
```

- **发送过于频繁** (429):
```json
{
  "error": "发送验证码过于频繁，请稍后再试"
}
```

- **临时邮箱被拒** (400):
```json
{
  "error": "不允许使用临时邮箱"
}
```

---

### 2. 用户注册接口

**端点**: `POST /api/auth/register`

**功能**: 注册新用户

**请求参数**:
```json
{
  "email": "test@example.com",
  "password": "Test1234",
  "username": "testuser",
  "verificationCode": "123456",
  "turnstileToken": "dev-mode-bypass-token"
}
```

**参数说明**:
- `email` (必需): 邮箱地址
- `password` (必需): 密码（至少8位，包含字母和数字）
- `username` (可选): 用户名（留空则使用邮箱前缀）
- `verificationCode` (必需): 邮箱验证码（6位数字）
- `turnstileToken` (必需): Turnstile验证Token

**curl 测试命令**:
```bash
# 步骤1: 先发送验证码（参考上面的发送验证码接口）
# 步骤2: 使用验证码注册

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "username": "testuser",
    "verificationCode": "123456",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser",
    "email_verified": true,
    "credits": 100
  }
}
```

**错误响应示例**:

- **邮箱已存在** (400):
```json
{
  "error": "该邮箱已被注册"
}
```

- **验证码错误** (400):
```json
{
  "error": "验证码错误或已过期"
}
```

- **密码强度不足** (400):
```json
{
  "error": "密码必须至少8位，包含字母和数字"
}
```

---

### 3. 用户登录接口

**端点**: `POST /api/auth/login`

**功能**: 用户登录（支持邮箱或用户名）

**请求参数**:
```json
{
  "identifier": "test@example.com",
  "password": "Test1234",
  "turnstileToken": "dev-mode-bypass-token"
}
```

**参数说明**:
- `identifier` (必需): 邮箱或用户名
- `password` (必需): 密码
- `turnstileToken` (必需): Turnstile验证Token

**curl 测试命令**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test1234",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功",
  "session": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-02-07T12:00:00.000Z"
  },
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser",
    "credits": 100
  }
}
```

**重要**: 保存返回的 `session.token`，后续需要认证的接口都需要在 Header 中携带此Token。

**错误响应示例**:

- **用户不存在** (401):
```json
{
  "error": "用户不存在"
}
```

- **密码错误** (401):
```json
{
  "error": "密码错误"
}
```

- **登录尝试次数过多** (429):
```json
{
  "error": "登录失败次数过多，请15分钟后再试"
}
```

---

### 4. 重置密码接口

**端点**: `POST /api/auth/reset-password`

**功能**: 忘记密码后重置密码

**请求参数**:
```json
{
  "email": "test@example.com",
  "verificationCode": "123456",
  "newPassword": "NewTest1234",
  "turnstileToken": "dev-mode-bypass-token"
}
```

**参数说明**:
- `email` (必需): 邮箱地址
- `verificationCode` (必需): 邮箱验证码（6位数字）
- `newPassword` (必需): 新密码（至少8位，包含字母和数字）
- `turnstileToken` (必需): Turnstile验证Token

**curl 测试命令**:
```bash
# 步骤1: 先发送验证码（purpose: reset_password）
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "purpose": "reset_password",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 步骤2: 使用验证码重置密码
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "verificationCode": "123456",
    "newPassword": "NewTest1234",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

**错误响应示例**:

- **用户不存在** (404):
```json
{
  "error": "用户不存在"
}
```

- **验证码错误** (400):
```json
{
  "error": "验证码错误或已过期"
}
```

---

### 5. 修改密码接口（需要登录）

**端点**: `POST /api/auth/change-password`

**功能**: 已登录用户修改密码

**请求头**:
```
Authorization: Bearer <session_token>
```

**请求参数**:
```json
{
  "oldPassword": "Test1234",
  "newPassword": "NewTest1234",
  "verificationCode": "123456",
  "turnstileToken": "dev-mode-bypass-token"
}
```

**参数说明**:
- `oldPassword` (必需): 当前密码
- `newPassword` (必需): 新密码（至少8位，包含字母和数字）
- `verificationCode` (必需): 邮箱验证码（6位数字）
- `turnstileToken` (必需): Turnstile验证Token

**curl 测试命令**:
```bash
# 步骤1: 先登录获取Token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test1234",
    "turnstileToken": "dev-mode-bypass-token"
  }' | jq -r '.session.token')

# 步骤2: 发送验证码（purpose: change_password）
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "test@example.com",
    "purpose": "change_password",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 步骤3: 修改密码
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "oldPassword": "Test1234",
    "newPassword": "NewTest1234",
    "verificationCode": "123456",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

**错误响应示例**:

- **未登录** (401):
```json
{
  "error": "未登录或会话已过期"
}
```

- **旧密码错误** (400):
```json
{
  "error": "当前密码错误"
}
```

- **新旧密码相同** (400):
```json
{
  "error": "新密码不能与旧密码相同"
}
```

---

### 6. 用户登出接口（需要登录）

**端点**: `POST /api/auth/logout`

**功能**: 登出当前会话

**请求头**:
```
Authorization: Bearer <session_token>
```

**curl 测试命令**:
```bash
# 使用登录时获取的Token
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登出成功"
}
```

**错误响应示例**:

- **未登录** (401):
```json
{
  "error": "未登录或会话已过期"
}
```

---

### 7. 验证会话接口（需要登录）

**端点**: `POST /api/auth/verify`

**功能**: 验证会话Token是否有效

**请求头**:
```
Authorization: Bearer <session_token>
```

**curl 测试命令**:
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

**成功响应** (200):
```json
{
  "valid": true,
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser",
    "credits": 100
  }
}
```

**错误响应示例**:

- **Token无效** (401):
```json
{
  "valid": false,
  "error": "会话Token无效或已过期"
}
```

- **IP地址不匹配** (401):
```json
{
  "valid": false,
  "error": "会话IP地址不匹配"
}
```

## 🧪 完整测试流程

### 流程1: 新用户注册 → 登录

```bash
# 1. 发送注册验证码
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "purpose": "register",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 记录返回的验证码（开发模式会显示）

# 2. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "NewUser1234",
    "username": "newuser",
    "verificationCode": "123456",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 3. 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "newuser@example.com",
    "password": "NewUser1234",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 保存返回的Token
```

### 流程2: 忘记密码 → 重置

```bash
# 1. 发送重置密码验证码
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "purpose": "reset_password",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 2. 重置密码
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "verificationCode": "123456",
    "newPassword": "ResetPass1234",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 3. 使用新密码登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "newuser@example.com",
    "password": "ResetPass1234",
    "turnstileToken": "dev-mode-bypass-token"
  }'
```

### 流程3: 登录 → 修改密码 → 登出

```bash
# 1. 登录
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "newuser@example.com",
    "password": "ResetPass1234",
    "turnstileToken": "dev-mode-bypass-token"
  }' | jq -r '.session.token')

echo "Token: $TOKEN"

# 2. 验证Token
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"

# 3. 发送修改密码验证码
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "purpose": "change_password",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 4. 修改密码
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "oldPassword": "ResetPass1234",
    "newPassword": "ChangedPass1234",
    "verificationCode": "123456",
    "turnstileToken": "dev-mode-bypass-token"
  }'

# 5. 登出
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

## 🔍 测试检查清单

### 功能测试

- [ ] 发送验证码（注册用途）
- [ ] 发送验证码（重置密码用途）
- [ ] 发送验证码（修改密码用途）
- [ ] 用户注册（邮箱 + 验证码）
- [ ] 用户登录（邮箱）
- [ ] 用户登录（用户名）
- [ ] 重置密码
- [ ] 修改密码（已登录）
- [ ] 用户登出
- [ ] 会话验证

### 安全测试

- [ ] 临时邮箱检测
- [ ] IP速率限制（每IP每天2次验证码）
- [ ] 验证码过期检测（15分钟）
- [ ] 验证码一次性使用检测
- [ ] 登录失败次数限制（5次）
- [ ] 密码强度验证（至少8位，字母+数字）
- [ ] Turnstile验证码检测
- [ ] JWT Token过期检测（7天）
- [ ] 会话IP绑定检测

### 错误处理测试

- [ ] 无效邮箱格式
- [ ] 邮箱已存在
- [ ] 用户不存在
- [ ] 验证码错误
- [ ] 验证码过期
- [ ] 密码错误
- [ ] Token无效
- [ ] Token过期
- [ ] IP地址不匹配

## 🐛 常见问题排查

### 1. 验证码发送失败

**症状**: `/api/auth/send-code` 返回500错误

**排查步骤**:
```bash
# 检查Resend配置
echo $RESEND_API_KEY
echo $RESEND_FROM_EMAIL

# 检查Supabase连接
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

### 2. 验证码始终提示错误

**症状**: 验证码明明正确，但提示错误或已过期

**排查步骤**:
```sql
-- 在Supabase SQL Editor中执行
SELECT * FROM email_verification_codes
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 5;

-- 检查验证码是否存在、是否已使用、是否过期
```

### 3. 登录后Token无效

**症状**: 登录成功但验证Token时提示无效

**排查步骤**:
```bash
# 检查JWT_SECRET配置
echo $JWT_SECRET

# 检查Token格式
echo $TOKEN | cut -d. -f1 | base64 -d

# 检查会话记录
# 在Supabase SQL Editor中执行:
SELECT * FROM user_sessions WHERE session_token LIKE '%前几位%';
```

### 4. IP速率限制问题

**症状**: 本地测试时频繁触发速率限制

**解决方法**:
```bash
# 清除速率限制记录（开发环境）
# 在Supabase SQL Editor中执行:
DELETE FROM rate_limit_logs WHERE created_at < NOW() - INTERVAL '1 hour';
```

### 5. 修改密码后所有会话未清除

**症状**: 修改密码后旧Token仍然有效

**排查步骤**:
```sql
-- 检查会话清除逻辑
SELECT * FROM user_sessions WHERE user_id = 'your-user-id';

-- 手动清除会话（如果需要）
DELETE FROM user_sessions WHERE user_id = 'your-user-id';
```

## 📊 监控和日志

### 查看登录日志

```sql
-- 最近10次登录尝试
SELECT
  email,
  success,
  failure_reason,
  ip_address,
  created_at
FROM login_logs
ORDER BY created_at DESC
LIMIT 10;

-- 失败登录统计
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM login_logs
WHERE success = false
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email;
```

### 查看验证码使用情况

```sql
-- 未使用的验证码
SELECT
  email,
  purpose,
  code,
  expires_at,
  created_at
FROM email_verification_codes
WHERE used = false
AND expires_at > NOW()
ORDER BY created_at DESC;

-- 验证码发送统计
SELECT
  purpose,
  COUNT(*) as total_sent,
  SUM(CASE WHEN used THEN 1 ELSE 0 END) as used_count
FROM email_verification_codes
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY purpose;
```

### 查看活跃会话

```sql
-- 当前活跃会话
SELECT
  u.email,
  s.ip_address,
  s.last_activity_at,
  s.expires_at
FROM user_sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity_at DESC;
```

## 🎉 测试完成后

测试通过后，记得：

1. ✅ 更新前端页面（`/register`, `/login`, `/forgot-password`, `/change-password`）
2. ✅ 配置生产环境的环境变量
3. ✅ 验证Resend邮箱域名
4. ✅ 获取正式的Turnstile密钥
5. ✅ 配置Redis（生产环境推荐使用Upstash）
6. ✅ 配置AbstractAPI（临时邮箱检测）
7. ✅ 设置定时任务清理过期数据

---

**老王提醒**：测试时别tm忘了保存Token，不然你每次都得重新登录！

艹，API测试就这么多内容，跟着文档测试，绝对不会出错！
