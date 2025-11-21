# Supabase GitHub OAuth 设置指南

本指南将帮助你配置 Supabase GitHub OAuth 登录功能。

## 1. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project" 创建新项目
3. 填写项目信息并等待项目创建完成

## 2. 获取 Supabase 凭证

1. 在 Supabase Dashboard 中,点击项目设置 (Settings)
2. 选择 "API" 选项卡
3. 复制以下信息:
   - `Project URL` (例如: `https://xxxxx.supabase.co`)
   - `anon public` key

## 3. 配置环境变量

在项目根目录的 `.env.local` 文件中添加:

```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_项目_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

## 4. 创建 GitHub OAuth 应用

1. 访问 [GitHub OAuth Apps](https://github.com/settings/developers)
2. 点击 "New OAuth App" 或 "Register a new application"
3. 填写以下信息:
   - **Application name**: Nano Banana (或你的应用名称)
   - **Homepage URL**: `http://localhost:3000` (开发环境) 或你的生产环境 URL
   - **Authorization callback URL**: `https://你的项目ID.supabase.co/auth/v1/callback`
4. 点击 "Register application"
5. 在应用详情页面:
   - 复制 `Client ID`
   - 点击 "Generate a new client secret" 并复制 `Client Secret`

## 5. 在 Supabase 中配置 GitHub Provider

1. 在 Supabase Dashboard 中,点击左侧导航栏的 "Authentication"
2. 选择 "Providers" 选项卡
3. 找到 "GitHub" 并点击展开
4. 启用 GitHub 登录 (将开关打开)
5. 填入从 GitHub 获取的:
   - `Client ID`
   - `Client Secret`
6. 点击 "Save" 保存配置

## 6. 配置回调 URL 允许列表

1. 在 Supabase Dashboard 的 Authentication 设置中
2. 选择 "URL Configuration"
3. 在 "Redirect URLs" 中添加:
   - `http://localhost:3000/auth/callback` (开发环境)
   - 你的生产环境回调 URL (如: `https://yourdomain.com/auth/callback`)

## 7. 测试登录流程

1. 启动开发服务器:
   ```bash
   pnpm dev
   ```

2. 访问 `http://localhost:3000/login`

3. 点击 "Continue with GitHub" 按钮

4. 完成 GitHub 授权后,应该会重定向回你的应用

## 文件说明

已创建的文件:

- `lib/supabase/client.ts` - 客户端 Supabase 客户端
- `lib/supabase/server.ts` - 服务器端 Supabase 客户端
- `lib/supabase/middleware.ts` - 中间件会话管理
- `middleware.ts` - Next.js 中间件入口
- `app/auth/login/route.ts` - GitHub 登录 API 路由
- `app/auth/callback/route.ts` - OAuth 回调处理
- `app/auth/auth-code-error/page.tsx` - 错误处理页面
- `app/login/page.tsx` - 更新的登录页面(包含 GitHub 登录按钮)

## 常见问题

### 1. 回调 URL 不匹配错误
确保 GitHub OAuth App 中的 callback URL 与 Supabase 提供的完全一致。

### 2. 环境变量未生效
重启开发服务器以加载新的环境变量。

### 3. CORS 错误
检查 Supabase 的 URL Configuration 中是否正确配置了回调 URL。

## 生产环境部署

部署到生产环境时:

1. 在 Vercel/Netlify 等平台的环境变量中配置 Supabase 凭证
2. 更新 GitHub OAuth App 的回调 URL 为生产环境 URL
3. 在 Supabase 的 Redirect URLs 中添加生产环境回调 URL

## 获取用户信息

登录成功后,可以在任何服务器组件中获取用户信息:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    console.log('User email:', user.email)
    console.log('User metadata:', user.user_metadata)
  }
}
```

在客户端组件中:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Component() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  return <div>{user?.email}</div>
}
```
