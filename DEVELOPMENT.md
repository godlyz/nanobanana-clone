# Nano Banana 开发文档

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [开发环境搭建](#开发环境搭建)
4. [项目架构](#项目架构)
5. [核心功能模块](#核心功能模块)
6. [API 文档](#api-文档)
7. [开发规范](#开发规范)
8. [部署指南](#部署指南)
9. [故障排除](#故障排除)
10. [贡献指南](#贡献指南)

---

## 项目概述

Nano Banana 是一个基于 AI 的图像编辑平台，提供智能图像处理、背景移除、角色一致性保持等功能。项目采用 Next.js 14 + TypeScript 构建，支持中英双语。

### 主要特性

- 🎨 **AI 图像编辑**: 基于自然语言的智能图像编辑
- 🖼️ **背景移除**: 3秒极速AI智能抠图
- 👤 **角色一致性**: 保持角色特征的多图生成
- 🌍 **场景保留**: 智能保留场景的图像编辑
- 🔑 **API 服务**: 完整的 RESTful API 支持
- 💳 **订阅系统**: 灵活的付费订阅模式
- 🌐 **国际化**: 中英双语支持

---

## 技术栈

### 前端技术

- **框架**: Next.js 14.2.16 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4.1.9 + PostCSS
- **UI组件**: shadcn/ui (基于 Radix UI)
- **状态管理**: React Context + Hooks
- **表单**: React Hook Form + Zod
- **图标**: Lucide React

### 后端技术

- **API**: Next.js API Routes
- **AI服务**: Google Gemini API
- **认证**: Supabase Auth
- **支付**: Creem.io
- **数据库**: Supabase (PostgreSQL)

### 开发工具

- **包管理**: pnpm
- **代码检查**: ESLint + TypeScript
- **样式处理**: PostCSS + Tailwind CSS
- **构建工具**: Next.js 内置

---

## 开发环境搭建

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 快速开始

1. **克隆项目**
```bash
git clone <repository-url>
cd nanobanana-clone
```

2. **安装依赖**
```bash
pnpm install
```

3. **环境变量配置**
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，配置必要的环境变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI 配置
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Creem 支付配置
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **启动开发服务器**
```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

---

## 项目架构

### 目录结构

```
nanobanana-clone/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── generate/             # AI 图像生成 API
│   │   ├── checkout/             # 支付会话创建
│   │   ├── webhooks/             # Webhook 处理
│   │   └── subscription/         # 订阅管理
│   ├── auth/                     # 认证相关页面
│   ├── editor/                   # 编辑器页面
│   ├── profile/                  # 用户个人信息
│   ├── tools/                    # 工具页面集合
│   └── layout.tsx                # 根布局
├── components/                   # React 组件
│   ├── ui/                       # 基础 UI 组件
│   └── [feature].tsx             # 功能组件
├── lib/                          # 工具库和配置
│   ├── language-context.tsx      # 国际化上下文
│   ├── supabase/                 # Supabase 客户端
│   └── [utils].ts                # 工具函数
├── public/                       # 静态资源
├── styles/                       # 样式文件
└── docs/                         # 文档文件
```

### 核心架构模式

#### 1. 页面路由结构

采用 Next.js App Router，支持：
- 服务器组件 (SSR)
- 客户端组件 (CSR)
- 路由级布局
- 并行路由

#### 2. 状态管理

使用 React Context 进行全局状态管理：
- `LanguageContext`: 国际化语言状态
- `ThemeContext`: 主题切换状态
- 组件级状态: useState + useEffect

#### 3. 样式系统

- **Tailwind CSS v4**: 原子化CSS
- **CSS Variables**: 主题变量
- **shadcn/ui**: 组件库基础
- **响应式设计**: 移动优先

---

## 核心功能模块

### 1. 图像编辑器

**文件位置**: `app/editor/page.tsx`

**核心功能**:
- 图像上传和预览
- 自然语言编辑输入
- AI 处理结果展示
- 历史记录管理

**技术实现**:
```typescript
// 图像编辑状态
const [images, setImages] = useState<string[]>([])
const [prompt, setPrompt] = useState("")
const [result, setResult] = useState<string | null>(null)

// API 调用
const handleGenerate = async () => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, prompt })
  })
}
```

### 2. 认证系统

**文件位置**: `lib/supabase/`, `app/auth/`

**核心功能**:
- GitHub/Google OAuth 登录
- 用户会话管理
- 中间件路由保护

**技术实现**:
```typescript
// 客户端认证
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createClientComponentClient()

// 服务端认证
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createServerComponentClient({ cookies })
```

### 3. 支付系统

**文件位置**: `app/api/checkout/`, `app/api/webhooks/`

**核心功能**:
- 订阅计划管理
- 支付会话创建
- Webhook 事件处理

**订阅计划**:
- **Basic**: 基础功能，月付/年付
- **Pro**: 专业功能，更多积分
- **Max**: 企业功能，无限使用

### 4. API 服务

**文件位置**: `app/api/generate/route.ts`

**核心功能**:
- Google Gemini API 集成
- 图像处理和编辑
- 错误处理和响应格式化

**API 端点**:
```typescript
// 图像生成 API
POST /api/generate
Request: {
  images: string[]      // Base64 编码图像
  prompt: string        // 编辑指令
}
Response: {
  success: boolean
  type: "image" | "text"
  result: string        // 处理结果
  text: string          // 描述文本
}
```

---

## API 文档

### 认证 API

#### 用户登录
```http
GET /auth/login
```
重定向到 OAuth 提供商登录页面。

#### 认证回调
```http
GET /auth/callback
```
处理 OAuth 回调并设置用户会话。

#### 用户登出
```http
GET /auth/logout
```
清除用户会话并重定向到首页。

### 图像生成 API

#### 创建图像编辑任务
```http
POST /api/generate
Content-Type: application/json

{
  "images": ["data:image/jpeg;base64,..."],
  "prompt": "将背景改为海滩风景"
}
```

**响应示例**:
```json
{
  "success": true,
  "type": "image",
  "result": "data:image/jpeg;base64,/9j/4AAQ...",
  "text": "已成功将背景替换为海滩风景"
}
```

### 支付 API

#### 创建支付会话
```http
POST /api/checkout
Content-Type: application/json

{
  "planId": "pro_monthly",
  "billingPeriod": "monthly"
}
```

#### 获取订阅状态
```http
GET /api/subscription/status
```

**响应示例**:
```json
{
  "isLoggedIn": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com"
  },
  "subscription": {
    "plan_id": "pro_monthly",
    "status": "active",
    "billing_period": "monthly"
  }
}
```

---

## 开发规范

### 代码规范

#### 1. TypeScript 规范
- 使用严格模式: `"strict": true`
- 优先使用接口 `interface` 而非类型 `type`
- 明确的函数返回类型声明

#### 2. React 组件规范
- 函数组件优先，避免类组件
- 使用 Props 接口定义组件属性
- 客户端组件必须添加 `"use client"`

```typescript
interface ComponentProps {
  title: string
  onSubmit: (data: FormData) => void
}

export default function MyComponent({ title, onSubmit }: ComponentProps) {
  // 组件实现
}
```

#### 3. 文件命名规范
- 组件文件: PascalCase (`UserProfile.tsx`)
- 工具文件: camelCase (`formatDate.ts`)
- 页面文件: `page.tsx`
- 布局文件: `layout.tsx`

### 样式规范

#### 1. Tailwind CSS 使用
- 优先使用原子化类名
- 避免内联样式
- 响应式设计采用移动优先

```tsx
<div className="flex flex-col md:flex-row items-center justify-center gap-4 p-4">
```

#### 2. 组件样式
- 使用 shadcn/ui 作为基础组件库
- 自定义样式使用 CSS 变量
- 保持一致的设计令牌

### 国际化规范

#### 1. 翻译键命名
```typescript
const translations = {
  "page.section.feature.title": "功能标题",
  "page.section.feature.description": "功能描述"
}
```

#### 2. 使用翻译函数
```tsx
const { t } = useLanguage()
const title = t("page.section.feature.title")
```

---

## 部署指南

### 生产环境部署

#### 1. 环境准备

**Vercel 部署 (推荐)**:
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到 Vercel
vercel --prod
```

**Docker 部署**:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. 环境变量配置

生产环境必须配置的环境变量：
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Google AI
GOOGLE_AI_API_KEY=your_production_api_key

# Creem 支付
CREEM_API_KEY=your_production_creem_key
CREEM_WEBHOOK_SECRET=your_webhook_secret

# 应用 URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### 3. 数据库配置

Supabase 数据库表结构：
- `users`: 用户信息
- `subscriptions`: 订阅记录
- `credits`: 积分记录
- `api_keys`: API 密钥管理

#### 4. Webhook 配置

配置 Creem Webhook：
```bash
# Webhook URL
https://your-domain.com/api/webhooks/creem

# 支持的事件
- payment.created
- payment.succeeded
- payment.failed
- subscription.created
- subscription.updated
- subscription.cancelled
```

---

## 故障排除

### 常见问题

#### 1. 开发环境问题

**问题**: `pnpm dev` 启动失败
```bash
# 解决方案
rm -rf .next
rm -rf node_modules
pnpm install
pnpm dev
```

**问题**: 环境变量不生效
```bash
# 检查环境变量
cat .env.local

# 重启开发服务器
pnpm dev
```

#### 2. API 问题

**问题**: Google AI API 调用失败
- 检查 `GOOGLE_AI_API_KEY` 是否正确
- 确认 API 配额是否充足
- 查看控制台错误日志

**问题**: Supabase 认证失败
- 检查 Supabase URL 和密钥配置
- 确认 OAuth 应用配置正确
- 检查重定向 URL 设置

#### 3. 构建问题

**问题**: TypeScript 编译错误
```bash
# 检查类型错误
pnpm run lint

# 查看详细错误信息
pnpm run build
```

**问题**: 样式构建失败
```bash
# 检查 Tailwind 配置
cat tailwind.config.js
cat postcss.config.mjs
```

### 调试技巧

#### 1. 浏览器调试
- 使用 React DevTools
- 检查网络请求
- 查看控制台错误

#### 2. 服务端调试
```typescript
// 添加调试日志
console.log("Debug info:", data)

// 检查 API 响应
return NextResponse.json({ debug: data })
```

#### 3. 性能优化
- 使用 Next.js Image 组件
- 实现代码分割
- 优化 API 响应时间

---

## 贡献指南

### 开发流程

#### 1. 创建功能分支
```bash
git checkout -b feature/new-feature
```

#### 2. 提交规范
```bash
# 功能开发
git commit -m "feat: 添加新的图像编辑功能"

# 问题修复
git commit -m "fix: 修复 API 调用错误"

# 文档更新
git commit -m "docs: 更新 API 文档"
```

#### 3. 代码审查
- 确保通过所有测试
- 检查代码风格一致性
- 更新相关文档

### 测试指南

#### 1. 功能测试
- 手动测试核心功能
- 测试响应式设计
- 验证国际化功能

#### 2. API 测试
```bash
# 测试图像生成 API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"images": ["base64..."], "prompt": "测试"}'
```

#### 3. 性能测试
- 使用 Lighthouse 检查性能
- 测试页面加载时间
- 监控内存使用情况

---

## 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 联系方式

- 项目仓库: [GitHub Repository]
- 问题反馈: [GitHub Issues]
- 文档站点: [Documentation Site]

---

*最后更新: 2024年*