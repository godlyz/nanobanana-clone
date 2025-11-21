# 📧 邮箱认证系统使用指南

> **老王提醒**：这个邮箱认证系统功能完整、安全可靠，跟着这个文档配置，绝对没问题！

## 🎯 系统功能

### ✅ 已实现的功能

1. **用户注册**
   - 邮箱验证码验证
   - Cloudflare Turnstile 图形验证码
   - 临时邮箱检测和黑名单
   - IP限流（每天最多3次注册）
   - 密码强度验证

2. **用户登录**
   - 支持邮箱/用户名登录
   - Cloudflare Turnstile 图形验证码
   - 会话管理（JWT Token）
   - IP绑定（可配置）
   - 7天有效期（可配置）
   - 登录失败限流（15分钟内最多5次）

3. **修改密码**
   - 需要验证旧密码
   - 需要邮箱验证码
   - 会话验证
   - 修改成功后强制重新登录

4. **重置密码（忘记密码）**
   - 需要邮箱验证码
   - 重置成功后强制重新登录
   - 限流保护（每天最多3次）

5. **安全特性**
   - 多层限流保护
   - 临时邮箱检测
   - IP绑定验证
   - 会话过期检查
   - 登录日志记录

## 📦 安装依赖

所有必要的依赖已经安装：

```bash
pnpm add resend bcryptjs @upstash/redis
```

## 🔧 环境变量配置

### 1. 复制环境变量模板

```bash
cp .env.local.example .env.local
```

### 2. 配置必需的环境变量

#### Resend（邮件服务）

**注册地址**: https://resend.com

**获取步骤**:
1. 注册账号
2. 验证域名（或使用测试域名）
3. 生成 API Key

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### Cloudflare Turnstile（图形验证码）

**注册地址**: https://dash.cloudflare.com

**获取步骤**:
1. 进入 Cloudflare Dashboard
2. 选择 Turnstile
3. 添加站点
4. 获取 Site Key 和 Secret Key

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAxxxxx
TURNSTILE_SECRET_KEY=0x4AAAAAAAxxxxx
```

#### AbstractAPI（临时邮箱检测）

**注册地址**: https://www.abstractapi.com/api/email-validation-api

**获取步骤**:
1. 注册账号
2. 选择 Email Validation API
3. 获取 API Key（免费版每月100次）

```env
ABSTRACTAPI_EMAIL_VALIDATION_KEY=xxxxxxxxxxxxxx
```

#### Upstash Redis（限流和缓存）

**注册地址**: https://console.upstash.com

**获取步骤**:
1. 注册账号
2. 创建 Redis 数据库
3. 复制 REST URL 和 Token

```env
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxx
```

#### JWT Secret（会话加密）

**生成方法**:

```bash
# 方法1: 使用 OpenSSL
openssl rand -base64 32

# 方法2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```env
JWT_SECRET=你生成的随机密钥
```

⚠️ **重要**: 生产环境必须使用强密钥，不能使用默认值！

### 3. 可选配置（高级）

```env
# 邮箱验证码配置
EMAIL_CODE_LENGTH=6                    # 验证码长度（默认6位）
EMAIL_CODE_EXPIRY_MINUTES=15          # 验证码有效期（默认15分钟）
EMAIL_RATE_LIMIT_PER_IP=2             # 每个IP每天最多发送验证码次数（默认2次）

# 会话配置
SESSION_EXPIRY_DAYS=7                  # 会话有效期（默认7天）
SESSION_CHECK_IP=true                  # 是否检查IP变化（默认true）

# 登录安全配置
MAX_LOGIN_ATTEMPTS=5                   # 最大登录失败次数（默认5次）
LOGIN_LOCKOUT_MINUTES=15              # 登录锁定时长（默认15分钟）

# 临时邮箱黑名单（逗号分隔）
TEMP_EMAIL_BLACKLIST=tempmail.com,guerrillamail.com,10minutemail.com
```

## 🗄️ 数据库迁移

### 1. 运行迁移文件

在 Supabase Dashboard 中运行迁移文件：

```
supabase/migrations/20250131_create_email_auth_tables.sql
```

这将创建以下表：
- `user_sessions` - 用户会话
- `email_verification_codes` - 邮箱验证码
- `login_logs` - 登录日志
- `rate_limit_logs` - 速率限制日志

### 2. 验证表创建

在 Supabase Dashboard 中确认表已创建，并且 RLS 策略已启用。

## 🚀 API 接口文档

### 1. 发送验证码

**接口**: `POST /api/auth/send-code`

**请求体**:
```json
{
  "email": "user@example.com",
  "purpose": "register",  // register | reset_password | change_password
  "turnstileToken": "0.xxx"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送，请查收邮件",
  "expiresAt": "2025-01-31T10:00:00.000Z"
}
```

### 2. 用户注册

**接口**: `POST /api/auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "username": "myusername",  // 可选
  "verificationCode": "123456",
  "turnstileToken": "0.xxx"
}
```

**响应**:
```json
{
  "success": true,
  "message": "注册成功！请前往登录",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername"
  }
}
```

### 3. 用户登录

**接口**: `POST /api/auth/login`

**请求体**:
```json
{
  "identifier": "user@example.com",  // 邮箱或用户名
  "password": "StrongPass123",
  "turnstileToken": "0.xxx"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "session": {
    "token": "会话Token",
    "expiresAt": "2025-02-07T10:00:00.000Z"
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername"
  }
}
```

### 4. 修改密码

**接口**: `POST /api/auth/change-password`

**请求体**:
```json
{
  "sessionToken": "会话Token",
  "oldPassword": "OldPass123",
  "newPassword": "NewPass456",
  "verificationCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

### 5. 重置密码（忘记密码）

**接口**: `POST /api/auth/reset-password`

**请求体**:
```json
{
  "email": "user@example.com",
  "newPassword": "NewPass456",
  "verificationCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码重置成功，请使用新密码登录"
}
```

## 🔒 安全特性说明

### 1. 图形验证码（Cloudflare Turnstile）

- **用途**: 防止机器人攻击
- **应用场景**: 注册、登录、发送验证码
- **配置**: 必须配置，否则开发模式放行

### 2. 临时邮箱检测

- **用途**: 防止使用临时邮箱注册
- **检测方式**:
  1. 本地黑名单（免费，快速）
  2. AbstractAPI 在线检测（花钱，准确）
- **配置**: AbstractAPI 可选，未配置时只使用本地黑名单

### 3. IP 限流

- **注册限流**: 每个IP每天最多3次注册
- **验证码限流**: 每个IP每天最多2次发送验证码
- **登录限流**: 每个IP 15分钟内最多5次登录尝试
- **密码重置限流**: 每个邮箱每天最多3次重置密码
- **配置**: 基于 Upstash Redis

### 4. 会话管理

- **有效期**: 默认7天（可配置）
- **IP绑定**: 默认启用（可配置）
- **自动过期**: 到期后自动失效
- **强制登出**: 修改密码后清除所有会话

### 5. 密码安全

- **最小长度**: 8位
- **复杂度要求**: 必须包含字母和数字
- **加密存储**: 使用 bcrypt 加密
- **防重复**: 新旧密码不能相同

## 📊 数据库表说明

### user_sessions（用户会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| session_token | TEXT | 会话Token |
| ip_address | TEXT | IP地址 |
| user_agent | TEXT | User-Agent |
| expires_at | TIMESTAMP | 过期时间 |
| last_activity_at | TIMESTAMP | 最后活跃时间 |

### email_verification_codes（邮箱验证码）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | TEXT | 邮箱地址 |
| code | TEXT | 验证码 |
| purpose | TEXT | 用途 |
| expires_at | TIMESTAMP | 过期时间 |
| used | BOOLEAN | 是否已使用 |

### login_logs（登录日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| email | TEXT | 邮箱地址 |
| ip_address | TEXT | IP地址 |
| user_agent | TEXT | User-Agent |
| success | BOOLEAN | 是否成功 |
| failure_reason | TEXT | 失败原因 |

## 🐛 常见问题

### Q1: 验证码收不到？

**可能原因**:
1. Resend API Key 未配置或无效
2. 发件人邮箱未验证
3. 邮件被拦截到垃圾箱

**解决方法**:
1. 检查 `.env.local` 中的 `RESEND_API_KEY`
2. 在 Resend Dashboard 中验证发件人域名
3. 检查垃圾邮件文件夹
4. 查看服务器日志

### Q2: 图形验证码不显示？

**可能原因**:
1. Turnstile Site Key 未配置
2. 域名未添加到 Turnstile

**解决方法**:
1. 检查 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
2. 在 Cloudflare Dashboard 中添加当前域名

### Q3: 登录后立即过期？

**可能原因**:
1. IP 地址变化（VPN/代理）
2. SESSION_CHECK_IP 配置过于严格

**解决方法**:
1. 关闭 VPN/代理
2. 设置 `SESSION_CHECK_IP=false` 关闭IP检查

### Q4: 限流太严格？

**解决方法**:

在 `.env.local` 中调整限流配置：

```env
EMAIL_RATE_LIMIT_PER_IP=5           # 增加发送次数
MAX_LOGIN_ATTEMPTS=10               # 增加登录尝试次数
```

### Q5: Redis 连接失败？

**可能原因**:
1. Upstash Redis 未配置
2. URL 或 Token 无效

**解决方法**:
1. 检查 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
2. 未配置时系统会自动降级（限流功能禁用）

## 🎯 开发模式

开发环境下的特殊行为：

1. **验证码**: 在响应中返回验证码（生产环境不返回）
2. **图形验证码**: 未配置时自动放行
3. **临时邮箱检测**: AbstractAPI 未配置时跳过在线检测
4. **Redis 限流**: 未配置时自动禁用限流

⚠️ **重要**: 生产环境必须配置所有必需的服务！

## 📝 工具函数说明

### lib/email-validation.ts

- `validateEmail()` - 综合邮箱验证（推荐）
- `quickValidateEmail()` - 快速验证（仅本地黑名单）
- `isValidEmailFormat()` - 格式验证
- `isEmailDomainBlacklisted()` - 黑名单检查

### lib/rate-limit.ts

- `checkRateLimit()` - 检查限流
- `resetRateLimit()` - 重置限流
- `getRateLimitStatus()` - 获取限流状态

### lib/email-verification-code.ts

- `sendVerificationCode()` - 发送验证码
- `verifyCode()` - 验证验证码
- `cleanupExpiredCodes()` - 清理过期验证码

### lib/turnstile.ts

- `verifyTurnstileToken()` - 验证图形验证码
- `isTurnstileConfigured()` - 检查是否配置
- `getTurnstileSiteKey()` - 获取 Site Key

### lib/session-manager.ts

- `createSession()` - 创建会话
- `verifySession()` - 验证会话
- `deleteSession()` - 删除会话
- `deleteAllUserSessions()` - 删除用户所有会话

## 🎉 完成！

恭喜！你已经成功配置了完整的邮箱认证系统！

---

**老王提醒**: 生产环境上线前，务必检查所有环境变量配置，特别是 JWT_SECRET！

如有问题，请查看服务器日志或联系技术支持。
