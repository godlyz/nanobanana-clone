# Project Context

## Purpose

Nano Banana 是一个 **AI 驱动的图像编辑应用**，支持：
- 自然语言图像编辑
- 角色一致性保持
- 场景保留
- 背景移除
- 一键编辑
- 多图处理
- AI UGC 创作

**核心目标**：提供简单易用的 AI 图像编辑工具，支持中英双语，面向全球用户。

## Tech Stack

### 前端框架
- **Next.js 14.2.16** (App Router)
- **TypeScript 5** (strict mode)
- **React 18.3.1**

### 样式和 UI
- **Tailwind CSS v4.1.9** + PostCSS
- **shadcn/ui** (基于 Radix UI)
- **Lucide React** (图标库)
- **next-themes** (主题系统)
- **Geist Sans & Geist Mono** (字体)

### 认证和数据
- **Supabase Auth** (OAuth: GitHub, Google)
- **Supabase Client** (@supabase/ssr)

### 支付系统
- **Creem.io** (订阅支付集成)

### AI 服务
- **Google Gemini API** (@google/generative-ai)
- **OpenAI API** (备用)

### 表单和验证
- **React Hook Form**
- **Zod** (schema 验证)

### 工具链
- **pnpm** (包管理器，版本 9+)
- **ESLint** + **Prettier**
- **Vercel Analytics**

## Project Conventions

### Code Style

**TypeScript 规范**：
- 严格模式 (`strict: true`)
- 路径别名：`@/*` 映射到项目根目录
- 禁止 `any` 类型，使用类型推断或明确类型定义

**命名约定**：
- 组件文件：PascalCase (如 `EditorSection.tsx`)
- 工具函数：camelCase (如 `createClient.ts`)
- 常量：UPPER_SNAKE_CASE (如 `API_ENDPOINT`)
- 类型/接口：PascalCase，前缀 `T` 或 `I` (可选)

**组件结构**：
```typescript
// 客户端组件必须声明
"use client"

import { ... } from "..."

export default function ComponentName() {
  // hooks 在顶部
  const { t } = useLanguage()

  // 状态声明
  const [state, setState] = useState()

  // 事件处理函数
  const handleClick = () => { ... }

  // JSX 渲染
  return <div>...</div>
}
```

**样式规范**：
- 优先使用 Tailwind 工具类
- 响应式设计：mobile-first (`md:`, `lg:`)
- CSS 变量统一在 `globals.css` 的 `:root` 中定义

### Architecture Patterns

**App Router 架构**：
- `app/` - 路由和页面组件
- `components/` - 共享 UI 组件
- `lib/` - 工具函数、Context、配置
- `public/` - 静态资源

**组件分离原则**：
- **服务器组件 (默认)**：静态内容、数据获取
- **客户端组件 (`"use client"`)**：交互、状态管理、hooks

**国际化系统**：
- Context: `lib/language-context.tsx`
- 翻译键值对集中管理
- 使用 `t("key")` 函数访问翻译

**API 路由模式**：
```typescript
// app/api/[endpoint]/route.ts
export async function POST(request: Request) {
  // 1. 验证请求
  // 2. 调用外部服务
  // 3. 返回结构化响应
  return NextResponse.json({ ... })
}
```

**认证流程**：
- 中间件：`middleware.ts` 保护路由
- 客户端：`lib/supabase/client.ts`
- 服务端：`lib/supabase/server.ts`

### Testing Strategy

**当前状态**：
- 暂无自动化测试覆盖
- 手动测试为主

**未来计划**：
- 单元测试：Vitest + Testing Library
- E2E 测试：Playwright
- 测试覆盖率目标：>80%

### Git Workflow

**分支策略**：
- `main` - 主分支（生产环境）
- `feature/*` - 功能分支
- `fix/*` - 修复分支

**提交约定**：
- 使用语义化提交 (Semantic Commits)
- 格式：`type: description`
- 类型：`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**重要约束**：
- ⚠️ **未经用户明确要求，不要执行 git commit/push 操作**
- 提交前必须确认代码无 TypeScript 错误
- 提交前必须更新相关文档（README.md, CLAUDE.md）

## Domain Context

**图像编辑领域**：
- 用户通过自然语言描述编辑意图
- 支持多种编辑模式：背景移除、风格转换、对象替换
- 角色一致性：保持同一角色在不同场景中的外观
- 场景保留：在修改对象时保持背景和光照

**用户角色**：
- 设计师：快速原型制作
- 内容创作者：UGC 内容生成
- 普通用户：简单图像编辑需求

**业务模式**：
- 免费试用 (有限额度)
- 订阅制：Basic / Pro / Max 套餐
- 按量计费：额外积分购买

## Important Constraints

**技术约束**：
- 图片优化：`unoptimized: true`（禁用 Next.js 图片优化）
- 构建忽略错误：`ignoreBuildErrors: true` 和 `ignoreDuringBuilds: true`
  - ⚠️ **生产环境需手动检查所有 TypeScript 和 ESLint 错误**
- 包管理器锁定：必须使用 `pnpm`

**性能约束**：
- AI 图像生成响应时间：通常 5-15 秒
- 支持图片大小：最大 10MB
- 并发请求限制：根据订阅套餐

**安全约束**：
- 环境变量不得提交到代码库
- API Key 通过服务端路由访问
- 用户上传内容需验证格式和大小

**业务约束**：
- 支付：仅支持 Creem.io 集成
- 认证：仅支持 GitHub 和 Google OAuth
- 多语言：仅支持中文和英文

## External Dependencies

### Supabase (认证和数据)
- **服务**：用户认证、OAuth、数据库
- **配置文件**：`lib/supabase/client.ts`, `lib/supabase/server.ts`
- **环境变量**：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **文档**：[SUPABASE_SETUP.md](../SUPABASE_SETUP.md)

### Creem.io (支付)
- **服务**：订阅支付、Webhook
- **API 端点**：
  - `/api/checkout` - 创建支付会话
  - `/api/webhooks/creem` - 处理支付事件
- **环境变量**：
  - `CREEM_API_KEY`
  - `CREEM_WEBHOOK_SECRET`
  - `CREEM_*_PRODUCT_ID` (各套餐产品 ID)
- **文档**：[CREEM_SETUP.md](../CREEM_SETUP.md)

### Google Gemini API (AI 图像生成)
- **服务**：图像编辑和生成
- **模型**：Gemini Pro Vision
- **API 端点**：`/api/generate`
- **环境变量**：
  - `GOOGLE_AI_API_KEY`
- **文档**：[GOOGLE_AI_SETUP.md](../GOOGLE_AI_SETUP.md)

### Vercel (部署)
- **服务**：静态托管、Serverless Functions、Analytics
- **环境变量**：通过 Vercel Dashboard 配置
- **域名**：需配置自定义域名和 SSL
