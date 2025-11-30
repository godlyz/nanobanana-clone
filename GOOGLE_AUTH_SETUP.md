# Google OAuth 登录配置指南

## 配置步骤

### 1. 在 Google Cloud Platform 创建项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API

### 2. 创建 OAuth 2.0 凭据

1. 访问 [Google Auth Platform Console](https://console.cloud.google.com/auth/clients)
2. 点击 "Create OAuth client ID"
3. 选择应用类型: **Web application**
4. 配置以下信息:

   **Authorized JavaScript origins** (允许的 JavaScript 来源):
   - `http://localhost:3000` (开发环境)
   - `https://yourdomain.com` (生产环境)

   **Authorized redirect URIs** (授权回调 URI):
   - `https://gtpvyxrgkuccgpcaeeyt.supabase.co/auth/v1/callback` (Supabase 回调)
   - `http://localhost:3000/auth/callback` (本地开发可选)

5. 保存 **Client ID** 和 **Client Secret**

### 3. 在 Supabase 中配置 Google Provider

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard/project/gtpvyxrgkuccgpcaeeyt/auth/providers)
2. 点击 **Authentication** → **Providers**
3. 找到 **Google** 并启用
4. 填入刚才获取的:
   - **Client ID**
   - **Client Secret**
5. 点击 **Save**

### 4. 配置回调 URL 白名单

在 Supabase Dashboard → Authentication → **URL Configuration**:

添加以下回调 URL:
- `http://localhost:3000/auth/callback` (开发环境)
- `https://yourdomain.com/auth/callback` (生产环境)

### 5. 配置 Google OAuth 同意屏幕 (可选但推荐)

1. 访问 [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. 选择用户类型:
   - **Internal**: 仅限组织内部用户
   - **External**: 任何 Google 用户
3. 配置应用信息:
   - 应用名称
   - 用户支持电子邮件
   - 应用 Logo (可选)
   - 授权域名
4. 配置 Scopes (作用域):
   - `openid` (必需)
   - `.../auth/userinfo.email` (必需)
   - `.../auth/userinfo.profile` (必需)

### 6. 测试登录

1. 访问 http://localhost:3000/login
2. 点击 "使用 Google 登录"
3. 选择 Google 账号并授权
4. 应该会重定向回首页并自动登录

## 常见问题

### 1. 回调 URL 不匹配

**错误**: `redirect_uri_mismatch`

**解决**:
- 确保 Google OAuth 配置中的回调 URI 与 Supabase 提供的完全一致
- 检查是否包含 `https://`
- 确保没有多余的斜杠

### 2. 未验证的应用警告

Google 会显示"此应用未经验证"的警告。这是正常的,用户可以点击"高级" → "转到应用"继续。

要移除此警告:
1. 访问 [Google Auth Verification](https://console.cloud.google.com/auth/verification)
2. 提交应用进行验证(可能需要数天)

### 3. 作用域权限问题

如果需要访问更多 Google 服务(如 Gmail, Calendar),需要:
1. 在 OAuth 同意屏幕添加额外的 Scopes
2. 在登录时请求这些权限
3. 注意:敏感权限可能需要 Google 审核

## 生产环境部署

1. 更新 Google OAuth 配置:
   - 添加生产环境的 JavaScript origins
   - 添加生产环境的 redirect URIs
2. 在 Supabase 添加生产环境回调 URL
3. 考虑设置自定义域名以提高用户信任度
4. 提交应用验证以移除"未验证"警告

## 获取用户信息

登录成功后,可以在服务器组件中获取用户:

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  console.log('Google 用户:', user.user_metadata)
  // user.user_metadata.avatar_url - Google 头像
  // user.user_metadata.name - Google 用户名
  // user.email - 邮箱
}
```

## 参考链接

- [Supabase Google Auth 文档](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
