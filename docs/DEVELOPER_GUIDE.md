# Nano Banana 论坛开发文档

> **版本**: v1.0
> **最后更新**: 2025-11-25
> **适用范围**: Nano Banana 论坛系统开发者

---

## 目录

1. [项目架构](#项目架构)
2. [开发环境配置](#开发环境配置)
3. [组件架构](#组件架构)
4. [API 设计规范](#api-设计规范)
5. [数据库设计](#数据库设计)
6. [测试策略](#测试策略)
7. [部署指南](#部署指南)
8. [常见问题](#常见问题)

---

## 项目架构

### 技术栈

**前端**:
- **框架**: Next.js 14.2.16 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4.1.9
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **表单**: React Hook Form + Zod 验证
- **状态管理**: React Context + SWR（数据缓存）

**后端**:
- **Runtime**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth + OAuth (GitHub/Google)
- **文件存储**: Supabase Storage

**开发工具**:
- **包管理器**: pnpm
- **代码检查**: ESLint + Prettier
- **测试**: Vitest + Testing Library
- **Git 提交规范**: Conventional Commits

### 目录结构

```
nanobanana-clone/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── forum/                # 论坛 API
│   │   │   ├── categories/       # 分类 CRUD
│   │   │   ├── threads/          # 帖子 CRUD + 回复列表
│   │   │   ├── replies/          # 回复 CRUD
│   │   │   ├── votes/            # 投票
│   │   │   ├── tags/             # 标签
│   │   │   └── search/           # 搜索
│   ├── forum/                    # 论坛页面
│   │   ├── page.tsx              # 论坛首页
│   │   ├── category/[slug]/      # 分类页
│   │   ├── tag/[slug]/           # 标签页
│   │   ├── threads/[slug]/       # 帖子详情页
│   │   ├── search/               # 搜索结果页
│   │   └── new/                  # 创建帖子页
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
│
├── components/                   # React 组件
│   ├── forum/                    # 论坛相关组件
│   │   ├── thread-list.tsx       # 帖子列表
│   │   ├── thread-card.tsx       # 帖子卡片
│   │   ├── reply-form.tsx        # 回复表单
│   │   ├── reply-item.tsx        # 单个回复
│   │   ├── reply-list.tsx        # 回复列表
│   │   ├── sidebar.tsx           # 侧边栏
│   │   ├── search-bar.tsx        # 搜索栏
│   │   ├── filter-bar.tsx        # 筛选栏
│   │   ├── pagination.tsx        # 分页器
│   │   └── breadcrumb.tsx        # 面包屑导航
│   ├── ui/                       # 通用 UI 组件（shadcn/ui）
│   ├── header.tsx                # 全局导航栏
│   └── footer.tsx                # 全局页脚
│
├── lib/                          # 工具库
│   ├── supabase/                 # Supabase 客户端
│   │   ├── client.ts             # 客户端配置
│   │   ├── server.ts             # 服务端配置
│   │   └── middleware.ts         # 中间件配置
│   ├── language-context.tsx      # 国际化上下文
│   └── utils.ts                  # 工具函数
│
├── types/                        # TypeScript 类型定义
│   └── forum.ts                  # 论坛相关类型
│
├── __tests__/                    # 测试文件
│   ├── api/                      # API 测试
│   │   └── forum/                # 论坛 API 测试
│   └── e2e/                      # E2E 测试
│
├── docs/                         # 项目文档
│   ├── API_DOCUMENTATION_PART2_REPLIES_VOTES.md
│   ├── USER_MANUAL.md
│   └── DEVELOPER_GUIDE.md (本文件)
│
├── public/                       # 静态资源
├── supabase/                     # Supabase 配置
│   └── migrations/               # 数据库迁移文件
│
├── .env.local                    # 环境变量（不提交）
├── .env.local.example            # 环境变量示例
├── next.config.mjs               # Next.js 配置
├── tailwind.config.ts            # Tailwind CSS 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # 项目依赖
```

---

## 开发环境配置

### 前置条件

- **Node.js**: >= 18.x
- **pnpm**: >= 8.x
- **Git**: 最新版本

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/your-org/nanobanana-clone.git
cd nanobanana-clone
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入以下配置：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **启动开发服务器**

```bash
pnpm dev
```

访问 http://localhost:3000

### 数据库设置

参考 [数据库设计](#数据库设计) 部分，在 Supabase 中创建必要的表和 RLS 策略。

---

## 组件架构

### 设计原则

1. **单一职责**：每个组件只负责一个功能
2. **可复用性**：抽象通用组件，减少重复代码
3. **类型安全**：所有组件都有完整的 TypeScript 类型定义
4. **客户端/服务端分离**：明确标注 `"use client"` 或默认服务端组件

### 核心组件

#### 1. ForumThreadList（帖子列表）

**路径**: `components/forum/thread-list.tsx`

**用途**: 展示帖子列表，支持不同的排序和筛选

**Props**:
```typescript
interface ForumThreadListProps {
  threads: ForumThread[]        // 帖子数组
  showCategory?: boolean        // 是否显示分类标签
  showTags?: boolean            // 是否显示标签
  showAuthor?: boolean          // 是否显示作者信息
}
```

**关键功能**:
- 展示帖子卡片（标题、摘要、作者、时间、回复数、投票数）
- 点击跳转到帖子详情页
- 置顶帖子优先显示

#### 2. ForumReplyList（回复列表）

**路径**: `components/forum/reply-list.tsx`

**用途**: 展示帖子的回复，支持嵌套回复

**Props**:
```typescript
interface ForumReplyListProps {
  threadId: string              // 帖子ID
  threadAuthorId: string        // 帖子作者ID（用于判断最佳答案权限）
  currentUserId?: string        // 当前登录用户ID
  replies: ForumReply[]         // 回复数组
  bestAnswerId?: string         // 最佳答案ID
  totalCount: number            // 总回复数
  onVote: (replyId: string, voteType: 'upvote' | 'downvote') => Promise<void>
  onMarkBest?: (replyId: string) => Promise<void>
  onReport: (replyId: string) => Promise<void>
  onPostReply: (content: string, parentReplyId?: string) => Promise<void>
  onEditReply: (replyId: string, newContent: string) => Promise<void>
  onDeleteReply: (replyId: string) => Promise<void>
}
```

**关键功能**:
- 排序：最佳答案始终在最前面
- 嵌套回复：支持多层回复（UI上限制显示层级）
- 内联编辑：直接在回复卡片中编辑
- 投票：upvote/downvote，实时更新
- 举报：非作者可举报不当内容

#### 3. ForumReplyForm（回复表单）

**路径**: `components/forum/reply-form.tsx`

**用途**: 创建新回复或嵌套回复

**Props**:
```typescript
interface ForumReplyFormProps {
  threadId: string              // 帖子ID
  parentReplyId?: string        // 父回复ID（嵌套回复时提供）
  onSubmit: (content: string) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}
```

**关键功能**:
- Markdown 编辑器（支持图片上传）
- 字符数限制：10-5000
- 表单验证
- 提交后清空表单

#### 4. ForumFilterBar（筛选栏）

**路径**: `components/forum/filter-bar.tsx`

**用途**: 提供分类、标签、排序、状态筛选

**Props**:
```typescript
interface ForumFilterBarProps {
  categories: ForumCategory[]
  tags: ForumTag[]
  showStatusFilter?: boolean    // 是否显示状态筛选（open/closed）
}
```

**关键功能**:
- 分类下拉菜单
- 标签下拉菜单（支持多选）
- 排序选择（latest/hot/unanswered/top）
- 状态筛选（open/closed/all）
- URL 参数同步（使用 Next.js `useRouter` 和 `useSearchParams`）

#### 5. ForumPagination（分页器）

**路径**: `components/forum/pagination.tsx`

**用途**: 智能分页导航

**Props**:
```typescript
interface ForumPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
}
```

**关键功能**:
- 显示页码按钮（当前页前后各2页）
- 首页/末页快速跳转
- 上一页/下一页按钮
- 总页数和总条数显示
- URL 参数同步

### 组件最佳实践

#### 1. 客户端 vs 服务端组件

**服务端组件**（默认）:
- 只展示数据，无交互
- 不使用 React Hooks（useState, useEffect 等）
- 可以直接访问数据库（通过 Supabase Server 客户端）

示例：
```typescript
// app/forum/page.tsx (服务端组件)
import { createClient } from '@/lib/supabase/server'

export default async function ForumPage() {
  const supabase = createClient()
  const { data: threads } = await supabase
    .from('forum_threads')
    .select('*')
    .limit(20)

  return <ForumThreadList threads={threads} />
}
```

**客户端组件**（添加 `"use client"`）:
- 使用 React Hooks
- 处理用户交互（点击、输入等）
- 使用 Context（如 `useLanguage`）

示例：
```typescript
// components/forum/reply-form.tsx (客户端组件)
"use client"

import { useState } from 'react'

export function ForumReplyForm({ onSubmit }: Props) {
  const [content, setContent] = useState("")

  const handleSubmit = async () => {
    await onSubmit(content)
    setContent("") // 清空表单
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">发布</button>
    </form>
  )
}
```

#### 2. 数据获取模式

**服务端组件**：直接使用 Supabase Server 客户端
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('forum_threads').select('*')
  return <div>{data.map(...)}</div>
}
```

**客户端组件**：使用 SWR 缓存 + Supabase Client 客户端
```typescript
"use client"

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

export function ThreadList() {
  const { data, error } = useSWR('/api/forum/threads', fetcher)

  if (error) return <div>加载失败</div>
  if (!data) return <div>加载中...</div>

  return <div>{data.map(...)}</div>
}
```

#### 3. 错误处理

使用 `try-catch` 包裹异步操作，并提供用户友好的错误提示：

```typescript
const handlePostReply = async (content: string) => {
  try {
    const res = await fetch('/api/forum/threads/123/replies', {
      method: 'POST',
      body: JSON.stringify({ content })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || '回复失败')
    }

    const data = await res.json()
    // 成功处理
  } catch (err: any) {
    // 错误提示
    alert(err.message || '网络错误，请重试')
  }
}
```

---

## API 设计规范

### REST API 约定

1. **统一响应格式**

所有 API 响应使用以下格式：

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// 错误响应
interface ErrorResponse {
  success: false
  error: string
  details?: any
}
```

2. **HTTP 状态码规范**

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 OK | 成功 | GET/PUT/DELETE 成功 |
| 201 Created | 创建成功 | POST 创建资源成功 |
| 400 Bad Request | 请求参数错误 | 缺少必填字段、格式错误 |
| 401 Unauthorized | 未认证 | 未登录或 token 过期 |
| 403 Forbidden | 无权限 | 权限不足 |
| 404 Not Found | 资源不存在 | 帖子/回复不存在 |
| 500 Internal Server Error | 服务器错误 | 未预期的异常 |

3. **RESTful 路由设计**

```
# 帖子
GET    /api/forum/threads              # 获取帖子列表
POST   /api/forum/threads              # 创建帖子
GET    /api/forum/threads/:id          # 获取单个帖子
PUT    /api/forum/threads/:id          # 更新帖子
DELETE /api/forum/threads/:id          # 删除帖子（软删除）

# 回复
GET    /api/forum/threads/:id/replies  # 获取帖子的回复列表
POST   /api/forum/threads/:id/replies  # 创建回复
PUT    /api/forum/replies/:id          # 更新回复
DELETE /api/forum/replies/:id          # 删除回复（软删除）

# 投票
POST   /api/forum/votes                # 创建/更新/删除投票

# 分类
GET    /api/forum/categories           # 获取分类列表
GET    /api/forum/categories/:id       # 获取单个分类

# 标签
GET    /api/forum/tags                 # 获取标签列表
GET    /api/forum/tags/:slug           # 获取单个标签

# 搜索
GET    /api/forum/search?q=keyword     # 全文搜索
```

### API 实现示例

#### 创建帖子 API

```typescript
// app/api/forum/threads/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, CreateThreadRequest } from '@/types/forum'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 1. 认证检查
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    const body: CreateThreadRequest = await request.json()
    const { category_id, title, content, tags } = body

    // 3. 参数验证
    if (!category_id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }

    if (!title || title.trim().length < 3 || title.trim().length > 200) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Title must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Content must be at least 10 characters' },
        { status: 400 }
      )
    }

    // 4. 生成 slug
    const slug = generateSlug(title)

    // 5. 检查 slug 冲突
    const { data: existingThread } = await supabase
      .from('forum_threads')
      .select('id')
      .eq('slug', slug)
      .single()

    const finalSlug = existingThread ? `${slug}-${Date.now()}` : slug

    // 6. 创建帖子
    const { data: thread, error } = await supabase
      .from('forum_threads')
      .insert({
        category_id,
        user_id: user.id,
        title: title.trim(),
        slug: finalSlug,
        content: content.trim(),
        status: 'open'
      })
      .select(`
        *,
        category:forum_categories(id, name, slug),
        author:user_profiles(user_id, display_name, avatar_url)
      `)
      .single()

    if (error) throw error

    // 7. 添加标签（如有）
    if (tags && tags.length > 0) {
      // 标签逻辑省略...
    }

    // 8. 返回成功响应
    return NextResponse.json<ApiResponse<ForumThread>>(
      { success: true, data: thread },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create thread error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### 关键要点

1. **认证检查**：所有需要登录的端点先验证用户
2. **输入验证**：严格验证所有输入参数
3. **错误处理**：使用 try-catch 捕获异常
4. **类型安全**：所有 API 都有 TypeScript 类型定义
5. **返回规范**：统一使用 `ApiResponse<T>` 类型

---

## 数据库设计

### 核心表结构

#### 1. forum_categories（分类表）

```sql
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,                  -- 分类名称（中文）
  name_en VARCHAR(100),                        -- 分类名称（英文）
  slug VARCHAR(100) UNIQUE NOT NULL,           -- URL slug
  description TEXT,                            -- 描述
  icon VARCHAR(50),                            -- 图标（emoji或icon类名）
  color VARCHAR(20),                           -- 颜色（HEX）
  sort_order INTEGER DEFAULT 0,               -- 排序序号
  is_visible BOOLEAN DEFAULT TRUE,            -- 是否可见
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_visible ON forum_categories(is_visible);
```

#### 2. forum_threads（帖子表）

```sql
CREATE TABLE forum_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL CHECK (length(title) >= 3),
  slug VARCHAR(250) UNIQUE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) >= 10),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  is_pinned BOOLEAN DEFAULT FALSE,            -- 是否置顶
  is_locked BOOLEAN DEFAULT FALSE,            -- 是否锁定（锁定后不能回复）
  is_featured BOOLEAN DEFAULT FALSE,          -- 是否精选
  view_count INTEGER DEFAULT 0,               -- 浏览次数
  reply_count INTEGER DEFAULT 0,              -- 回复数
  upvote_count INTEGER DEFAULT 0,             -- 赞成票数
  downvote_count INTEGER DEFAULT 0,           -- 反对票数
  best_answer_id UUID,                        -- 最佳答案ID（外键在后面添加）
  last_reply_at TIMESTAMPTZ,                  -- 最后回复时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                      -- 软删除
);

CREATE INDEX idx_threads_category ON forum_threads(category_id);
CREATE INDEX idx_threads_user ON forum_threads(user_id);
CREATE INDEX idx_threads_status ON forum_threads(status);
CREATE INDEX idx_threads_created_at ON forum_threads(created_at DESC);
CREATE INDEX idx_threads_deleted_at ON forum_threads(deleted_at);
```

#### 3. forum_replies（回复表）

```sql
CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES forum_replies(id) ON DELETE SET NULL,  -- 父回复ID（嵌套回复）
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 10000),
  is_accepted_answer BOOLEAN DEFAULT FALSE,   -- 是否为最佳答案
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                      -- 软删除
);

CREATE INDEX idx_replies_thread ON forum_replies(thread_id);
CREATE INDEX idx_replies_user ON forum_replies(user_id);
CREATE INDEX idx_replies_parent ON forum_replies(parent_id);
CREATE INDEX idx_replies_deleted_at ON forum_replies(deleted_at);

-- 添加 best_answer_id 外键约束
ALTER TABLE forum_threads
  ADD CONSTRAINT fk_threads_best_answer
  FOREIGN KEY (best_answer_id) REFERENCES forum_replies(id) ON DELETE SET NULL;
```

#### 4. forum_votes（投票表）

```sql
CREATE TABLE forum_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id UUID NOT NULL,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束：每个用户对每个目标只能投一票
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_votes_user_target ON forum_votes(user_id, target_type, target_id);
CREATE INDEX idx_votes_target ON forum_votes(target_type, target_id);
```

#### 5. forum_tags（标签表）

```sql
CREATE TABLE forum_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,           -- 标签名称（中文）
  name_en VARCHAR(50),                        -- 标签名称（英文）
  slug VARCHAR(60) UNIQUE NOT NULL,           -- URL slug
  description TEXT,
  use_count INTEGER DEFAULT 0,                -- 使用次数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_use_count ON forum_tags(use_count DESC);
```

#### 6. forum_thread_tags（帖子-标签关联表）

```sql
CREATE TABLE forum_thread_tags (
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (thread_id, tag_id)
);

CREATE INDEX idx_thread_tags_tag ON forum_thread_tags(tag_id);
```

### Row Level Security (RLS) 策略

#### forum_threads RLS

```sql
-- 启用 RLS
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看公开帖子（未删除）
CREATE POLICY "Public threads are viewable by everyone"
  ON forum_threads
  FOR SELECT
  USING (deleted_at IS NULL);

-- 登录用户可以创建帖子
CREATE POLICY "Logged in users can create threads"
  ON forum_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 作者、管理员、版主可以更新帖子
CREATE POLICY "Users can update own threads"
  ON forum_threads
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- 作者、管理员、版主可以删除帖子（软删除）
CREATE POLICY "Users can delete own threads"
  ON forum_threads
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );
```

#### forum_replies RLS

```sql
-- 启用 RLS
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看公开回复（未删除）
CREATE POLICY "Public replies are viewable by everyone"
  ON forum_replies
  FOR SELECT
  USING (deleted_at IS NULL);

-- 登录用户可以创建回复
CREATE POLICY "Logged in users can create replies"
  ON forum_replies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 作者、管理员、版主可以更新回复
CREATE POLICY "Users can update own replies"
  ON forum_replies
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- 作者、管理员、版主可以删除回复（软删除）
CREATE POLICY "Users can delete own replies"
  ON forum_replies
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );
```

---

## 测试策略

### 测试类型

1. **单元测试**：测试独立的函数和组件
2. **集成测试**：测试 API 端点（需要运行 Next.js 服务器）
3. **E2E 测试**：测试完整的用户流程（使用 Playwright）

### 测试工具

- **Vitest**: 单元测试和集成测试框架
- **Testing Library**: React 组件测试
- **Playwright**: E2E 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test __tests__/api/forum/threads.test.ts

# 监听模式（开发时使用）
pnpm test --watch

# 测试覆盖率
pnpm test --coverage
```

### 集成测试示例

```typescript
// __tests__/api/forum/threads.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

let testCategoryId: string
let testThreadId: string
let testUserToken: string

describe('Forum Threads API Tests', () => {
  beforeAll(async () => {
    // 创建测试用户和测试数据
    const { data: userData } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'TestPass123!',
      email_confirm: true
    })

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPass123!'
    })

    testUserToken = sessionData.session?.access_token || ''

    // 创建测试分类
    const { data: category } = await supabase
      .from('forum_categories')
      .insert({ name: '测试分类', slug: 'test-' + Date.now() })
      .select()
      .single()

    testCategoryId = category?.id || ''
  })

  afterAll(async () => {
    // 清理测试数据
    if (testThreadId) {
      await supabase.from('forum_threads').delete().eq('id', testThreadId)
    }
    if (testCategoryId) {
      await supabase.from('forum_categories').delete().eq('id', testCategoryId)
    }
  })

  it('应该成功创建帖子', async () => {
    const response = await fetch(`${testApiUrl}/api/forum/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        category_id: testCategoryId,
        title: '测试帖子',
        content: '这是测试内容，足够长了。'
      })
    })

    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('id')

    testThreadId = data.data.id
  })
})
```

---

## 部署指南

### Vercel 部署（推荐）

1. **连接 GitHub 仓库**

登录 Vercel，导入 GitHub 仓库。

2. **配置环境变量**

在 Vercel 项目设置中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

3. **部署**

Vercel 会自动检测 Next.js 项目并部署。

### 生产环境检查清单

- [ ] 环境变量已正确配置
- [ ] Supabase RLS 策略已启用
- [ ] API 速率限制已配置
- [ ] 图片上传已配置 CDN
- [ ] 错误监控已集成（如 Sentry）
- [ ] 分析工具已集成（如 Vercel Analytics）
- [ ] 所有测试已通过
- [ ] SEO 优化已完成

---

## 常见问题

### 1. 如何添加新的分类？

**方式一：通过 Supabase Dashboard**

1. 登录 Supabase
2. 进入 `forum_categories` 表
3. 点击 "Insert Row"
4. 填写字段（name, slug, icon, color等）
5. 保存

**方式二：通过 SQL**

```sql
INSERT INTO forum_categories (name, name_en, slug, icon, color, sort_order)
VALUES ('技术问答', 'Tech Q&A', 'tech-qa', '💻', '#3b82f6', 1);
```

### 2. 如何将用户设置为管理员/版主？

更新 `user_profiles` 表的 `role` 字段：

```sql
UPDATE user_profiles
SET role = 'admin'  -- 或 'moderator'
WHERE user_id = 'user-uuid-here';
```

### 3. 如何备份数据库？

**使用 Supabase CLI**：

```bash
supabase db dump > backup.sql
```

**恢复备份**：

```bash
supabase db reset < backup.sql
```

### 4. 如何优化查询性能？

1. **添加索引**：为常用查询字段添加索引
2. **使用分页**：避免一次性加载大量数据
3. **缓存**：使用 SWR 缓存数据
4. **CDN**：图片和静态资源使用 CDN

### 5. 如何处理大量图片上传？

1. **使用 Supabase Storage**：配置图片上传到 Supabase Storage
2. **图片压缩**：前端上传前压缩图片
3. **限制大小**：单张图片最大 5MB
4. **CDN 分发**：Supabase Storage 自带 CDN

---

## 贡献指南

### Git 提交规范

遵循 Conventional Commits 规范：

```
feat: 添加回复功能
fix: 修复投票计数错误
docs: 更新 API 文档
style: 格式化代码
refactor: 重构回复组件
test: 添加 API 测试
chore: 更新依赖
```

### Pull Request 流程

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交代码：`git commit -m "feat: add my feature"`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

### 代码审查要点

- 所有组件有 TypeScript 类型定义
- 所有 API 有错误处理
- 关键功能有测试覆盖
- 代码符合项目风格（使用 ESLint + Prettier）

---

**文档结束**

如有问题，请提交 Issue 或联系开发团队。
