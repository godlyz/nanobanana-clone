<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Nano Banana 是一个 AI 驱动的图像编辑应用，基于 Next.js 14 构建，支持自然语言图像编辑、角色一致性保持、场景保留等高级功能。应用支持中英双语。

## 技术栈

- **框架**: Next.js 14.2.16 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4.1.9 + PostCSS
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **字体**: Geist Sans & Geist Mono
- **表单**: React Hook Form + Zod 验证
- **分析**: Vercel Analytics
- **认证**: Supabase Auth + OAuth
- **支付**: Creem.io 支付集成
- **AI**: OpenAI API 集成

## 常用命令

### 开发和构建
```bash
# 启动开发服务器 (http://localhost:3000)
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查 (注意: next.config.mjs 中配置了忽略 ESLint 和 TypeScript 错误)
pnpm lint
```

### 包管理
项目使用 `pnpm` 作为包管理器。

## 架构设计

### 1. 国际化 (i18n) 系统

**核心实现**: [lib/language-context.tsx](lib/language-context.tsx)

- 使用 React Context 提供全局语言状态
- 支持语言: 英文 (`en`) 和中文 (`zh`)
- 语言偏好存储在 `localStorage`
- 翻译键值对集中管理在 `language-context.tsx` 的 `translations` 对象中

**使用方式**:
```typescript
import { useLanguage } from "@/lib/language-context"

const { language, setLanguage, t } = useLanguage()
const text = t("translation.key")
```

**添加新翻译**:
1. 在 `lib/language-context.tsx` 的 `translations` 对象中添加键值对
2. 同时为 `en` 和 `zh` 添加对应的翻译文本
3. 在组件中使用 `t("your.key")` 调用

### 2. 路由结构

采用 Next.js App Router:

```
app/
├── page.tsx                    # 首页 (Hero + Features + Showcase)
├── layout.tsx                  # 根布局 (LanguageProvider + Analytics)
├── editor/page.tsx             # 图像编辑器主页面
├── showcase/page.tsx           # 案例展示画廊
├── pricing/page.tsx            # 定价页面
├── login/page.tsx              # 登录页面
├── api/page.tsx                # API 介绍页面
├── api-docs/page.tsx           # API 文档页面
├── mobile-editor/
│   ├── page.tsx                # 移动编辑器入口
│   ├── chat/page.tsx           # 移动对话编辑
│   └── image/page.tsx          # 移动图像编辑
└── tools/
    ├── background-remover/     # 背景移除工具
    ├── one-shot/               # 一键编辑工具
    ├── natural-language/       # 自然语言编辑
    ├── character-consistency/  # 角色一致性工具
    ├── scene-preservation/     # 场景保留工具
    ├── multi-image/            # 多图处理工具
    └── ai-ugc/                 # AI UGC 创作工具
```

### 3. 组件架构

**共享组件** ([components/](components/)):
- `header.tsx` - 全局导航栏,包含语言切换器和导航菜单
- `footer.tsx` - 全局页脚
- `hero.tsx` - 首页英雄区块
- `features.tsx` - 特性展示组件
- `showcase.tsx` - 案例展示轮播
- `testimonials.tsx` - 用户评价组件
- `faq.tsx` - 常见问题组件
- `editor-section.tsx` - 编辑器演示区块
- `language-switcher.tsx` - 语言切换下拉菜单
- `theme-provider.tsx` - 主题提供者 (next-themes)

**UI 组件库** ([components/ui/](components/ui/)):
- 基于 shadcn/ui 的可复用组件
- 配置文件: [components.json](components.json)
- 使用 `lucide-react` 图标库
- 样式风格: `new-york`

### 4. 样式系统

- **Tailwind v4** 配置在 [postcss.config.mjs](postcss.config.mjs)
- **全局样式**: [app/globals.css](app/globals.css)
- **设计令牌**: CSS 变量定义在 `globals.css` 的 `:root` 中
- **响应式**: 使用 Tailwind 断点 (`md:`, `lg:` 等)
- **动画**: `tailwindcss-animate` 插件

### 5. TypeScript 配置

- 路径别名: `@/*` 映射到项目根目录
- 严格模式: `strict: true`
- **注意**: `next.config.mjs` 配置了 `ignoreBuildErrors: true`,生产环境需谨慎

## 开发规范

### 添加新页面
1. 在 `app/` 下创建路由文件夹
2. 添加 `page.tsx` (必须是 React 服务器组件,除非需要客户端交互)
3. 如需客户端功能,在文件顶部添加 `"use client"`
4. 在 `lib/language-context.tsx` 中添加翻译文本
5. 更新 `components/header.tsx` 导航菜单

### 添加 shadcn/ui 组件
```bash
# 使用 shadcn CLI 添加组件
npx shadcn@latest add [component-name]
```

### 图片资源
- 静态图片放在 [public/](public/) 目录
- 配置了 `unoptimized: true`,不使用 Next.js 图片优化

### 表单处理模式
使用 React Hook Form + Zod:
```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({ /* ... */ })
const form = useForm({ resolver: zodResolver(schema) })
```

### 6. 认证系统 (Supabase + GitHub OAuth)

**配置文档**: [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 和 [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md)

- **认证服务**: Supabase Auth
- **OAuth 提供商**: GitHub, Google
- **核心功能**:
  - GitHub OAuth 登录: `/auth/login`
  - 认证回调: `/auth/callback`
  - 登出功能: `/auth/logout`
  - 中间件认证保护: `middleware.ts`

**核心文件**:

- [lib/supabase/client.ts](lib/supabase/client.ts) - 客户端 Supabase 配置
- [lib/supabase/server.ts](lib/supabase/server.ts) - 服务端 Supabase 配置
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts) - 中间件配置
- [app/auth/callback/route.ts](app/auth/callback/route.ts) - OAuth 回调处理

**环境变量配置**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 7. 支付系统 (Creem 集成)

**配置文档**: [CREEM_SETUP.md](CREEM_SETUP.md) 和 [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)

- **支付服务**: Creem.io
- **支持计划**: Basic, Pro, Max (月付/年付)
- **主要功能**:
  - 创建支付会话: `/api/checkout`
  - 验证支付结果: `/api/payment/verify`
  - 订阅状态管理: `/api/subscription/status`
  - Webhook 处理: `/api/webhooks/creem`

**核心文件**:

- [app/api/checkout/route.ts](app/api/checkout/route.ts) - 创建支付会话
- [app/api/payment/verify/route.ts](app/api/payment/verify/route.ts) - 支付验证
- [app/api/subscription/status/route.ts](app/api/subscription/status/route.ts) - 订阅状态
- [app/api/webhooks/creem/route.ts](app/api/webhooks/creem/route.ts) - Webhook 处理

**环境变量配置**:
```bash
CREEM_API_KEY=your_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_BASIC_YEARLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_YEARLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_YEARLY_PRODUCT_ID=prod_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

参考 `.env.local.example` 文件配置环境变量。

### 8. AI 图像生成 (Google Gemini API)

**配置文档**: [GOOGLE_AI_SETUP.md](GOOGLE_AI_SETUP.md)

- **AI 服务**: Google Gemini API
- **SDK**: `@google/generative-ai`
- **核心功能**:
  - 图像编辑和生成: `/api/generate`
  - 多模态输入: 支持文本+图像
  - 结构化输出: Base64图像+文本描述

**核心文件**:

- [app/api/generate/route.ts](app/api/generate/route.ts) - Gemini API 集成
- [GOOGLE_AI_SETUP.md](GOOGLE_AI_SETUP.md) - 配置指南

**环境变量配置**:

```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 9. API 路由

项目包含多个 API 路由用于核心功能:

**认证相关**:

- `/auth/login` - GitHub OAuth 登录入口
- `/auth/callback` - OAuth 回调处理
- `/auth/logout` - 用户登出

**支付相关**:

- `/api/checkout` - 创建 Creem 支付会话
- `/api/payment/verify` - 验证支付结果
- `/api/subscription/status` - 获取订阅状态
- `/api/webhooks/creem` - Creem Webhook 处理

**AI 功能**:

- `/api/generate` - Google Gemini 图像编辑 API

## 关键注意事项

1. **客户端组件标识**: 所有使用 hooks (useState, useEffect, useLanguage 等) 的组件必须添加 `"use client"`
2. **语言切换**: 更新文本时始终使用 `t()` 函数,不要硬编码文本
3. **构建忽略错误**: 当前配置忽略 TypeScript 和 ESLint 错误,提交前需手动检查
4. **包管理器**: 项目锁定了 `pnpm-lock.yaml`,使用 pnpm 而非 npm/yarn
5. **认证配置**: 使用前需配置 Supabase 凭证,详见 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
6. **支付配置**: 使用前需配置 Creem API Key 和产品 ID,详见 [CREEM_SETUP.md](CREEM_SETUP.md)
7. **中间件保护**: 某些页面可能受认证中间件保护,需要登录才能访问
