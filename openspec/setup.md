# 项目启动配置指南

## 环境要求

### 必需软件
- **Node.js**: v18.17+ 或 v20.3+
- **pnpm**: v9+ （包管理器）
- **Git**: v2.0+

### 推荐工具
- **VS Code**: 推荐编辑器
- **Vercel CLI**: 用于部署

---

## 环境变量配置

### 必需配置

#### 1. Supabase 配置
```bash
# 获取方式：https://supabase.com/dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**配置文档**: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)

#### 2. Google AI API
```bash
# 获取方式：https://makersuite.google.com/app/apikey
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

**配置文档**: [GOOGLE_AI_SETUP.md](../GOOGLE_AI_SETUP.md)

#### 3. 应用基础配置
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Nano Banana
NODE_ENV=development
```

### 可选配置

#### 4. Creem 支付系统
```bash
# 获取方式：https://creem.io/dashboard
CREEM_API_KEY=your_creem_api_key_here
CREEM_WEBHOOK_SECRET=your_webhook_secret_here

# 产品 ID（在 Creem Dashboard 创建产品后获取）
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_BASIC_YEARLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_YEARLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_YEARLY_PRODUCT_ID=prod_xxx
```

**配置文档**: [CREEM_SETUP.md](../CREEM_SETUP.md)

#### 5. Redis 缓存（管理后台使用）
```bash
# Upstash Redis（可选，用于配置缓存）
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

#### 6. Google OAuth（可选）
```bash
# 在 Supabase Dashboard > Authentication > Providers 配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd nanobanana-clone
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
```bash
# 复制示例文件
cp .env.local.example .env.local

# 编辑 .env.local，填入实际配置
nano .env.local
```

### 4. 配置数据库

#### 执行 Supabase 迁移
```bash
# 方法1: 使用 Supabase CLI（推荐）
supabase db push

# 方法2: 在 Supabase Dashboard 执行 SQL
# 访问：https://supabase.com/dashboard/project/<your-project>/sql
# 执行以下脚本：
```

**必需的 SQL 脚本**（按顺序执行）：
1. `setup-complete-credits-system.sql` - 积分系统
2. `admin-system-setup.sql` - 管理员系统
3. `setup-storage-bucket.sql` - 存储桶配置

**配置文档**: [DATABASE_SETUP_GUIDE.md](../DATABASE_SETUP_GUIDE.md)

### 5. 启动开发服务器
```bash
pnpm dev
```

访问：http://localhost:3000

---

## 验证配置

### 检查 Supabase 连接
访问：http://localhost:3000/api/test-supabase

预期响应：
```json
{
  "success": true,
  "user": null
}
```

### 检查 AI API 连接
访问：http://localhost:3000/api/test-ai

预期响应：
```json
{
  "success": true,
  "model": "gemini-pro-vision"
}
```

### 检查数据库表
在 Supabase Dashboard > Table Editor 中应该能看到：
- `user_credits`
- `credit_transactions`
- `credit_packages`
- `user_subscriptions`
- `generation_history`
- `admin_users`

---

## 部署配置

### Vercel 部署

#### 1. 连接 Git 仓库
访问：https://vercel.com/new

#### 2. 配置环境变量
在 Vercel Dashboard > Settings > Environment Variables 中添加所有 `.env.local` 中的变量

#### 3. 配置构建设置
```bash
# Framework Preset: Next.js
# Build Command: pnpm build
# Output Directory: .next
# Install Command: pnpm install
```

#### 4. 配置自定义域名
Vercel Dashboard > Settings > Domains

**重要**: 更新环境变量：
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 配置 Webhook

#### Creem Webhook
```bash
# Webhook URL: https://your-domain.com/api/webhooks/creem
# 在 Creem Dashboard > Settings > Webhooks 添加
```

---

## 常见问题

### Q1: pnpm 命令找不到
```bash
# 安装 pnpm
npm install -g pnpm
```

### Q2: Supabase 连接失败
- 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否正确
- 检查 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否有效
- 验证网络连接

### Q3: Google AI API 配额不足
- 检查 API Key 是否有效
- 查看配额限制：https://makersuite.google.com/app/apikey
- 考虑升级到付费计划

### Q4: 构建时 TypeScript 错误
项目配置了 `ignoreBuildErrors: true`，但生产环境建议修复所有错误：
```bash
# 检查 TypeScript 错误
pnpm tsc --noEmit

# 检查 ESLint 错误
pnpm lint
```

---

## 开发命令

```bash
# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# TypeScript 类型检查
pnpm tsc --noEmit

# 添加 shadcn/ui 组件
npx shadcn@latest add [component-name]
```

---

## 配置文件说明

| 文件 | 用途 | 注意事项 |
|------|------|---------|
| `.env.local` | 开发环境变量 | **不要提交到 Git** |
| `.env.local.example` | 环境变量模板 | 可以提交 |
| `.env.admin.example` | 管理后台变量模板 | 可以提交 |
| `next.config.mjs` | Next.js 配置 | 生产环境注意 `ignoreBuildErrors` |
| `components.json` | shadcn/ui 配置 | 添加组件时自动更新 |
| `tailwind.config.ts` | Tailwind 配置 | 样式主题配置 |
| `middleware.ts` | 路由中间件 | 认证保护逻辑 |

---

## 下一步

配置完成后，建议阅读：
- [openspec/auth.md](./auth.md) - 认证系统详解
- [openspec/credits.md](./credits.md) - 积分系统规则
- [openspec/users.md](./users.md) - 用户管理规则
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 架构设计文档
