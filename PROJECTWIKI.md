# PROJECTWIKI.md - Nano Banana 项目知识库

> **最后更新**: 2025-11-20
> **项目版本**: 0.2.0-beta (Day3视频生成功能)
> **状态**: Phase 1 完成 90%, Phase 2 进行中, Day3视频生成已上线

---

## 1. 项目概述

### 目标 (Goal)
构建一个 AI 驱动的图像编辑 SaaS 平台，支持自然语言图像编辑、角色一致性保持、场景保留等高级功能。

### 背景 (Background)
- **市场定位**: 面向创作者和设计师的专业 AI 图像编辑工具
- **核心竞争力**: 自然语言交互、高度可控的生成结果、订阅制商业模式
- **技术优势**: 基于 Google Gemini API，集成 Supabase 全栈解决方案

### 范围 (In-Scope) 与非目标 (Out-of-Scope)

**In-Scope:**
- ✅ 自然语言图像编辑
- ✅ 角色一致性保持
- ✅ 场景保留编辑
- ✅ 背景移除工具
- ✅ 风格迁移
- ✅ 订阅付费系统（积分制）
- ✅ 中英双语支持
- ✅ **视频生成 (Google Veo 3.1)** - Day3已完成
- 🚧 图像修复 (Inpainting) - Phase 2
- 🚧 批量处理 - Phase 2

**Out-of-Scope:**
- ❌ 3D 模型生成
- ❌ 实时视频编辑
- ❌ 移动端原生应用（当前仅Web）

### 角色 / 干系人 (Stakeholders)
- **最终用户**: 创作者、设计师、营销人员
- **技术团队**: 全栈开发（Next.js + Supabase）
- **支付服务商**: Creem.io
- **AI 服务商**: Google Gemini API

### 运行环境 / 平台
- **前端**: Vercel 部署 (Next.js 16.0.1)
- **后端**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini 1.5 Flash/Pro
- **支付**: Creem.io 支付网关
- **浏览器要求**: 现代浏览器（Chrome/Safari/Firefox 最新版）

---

## 2. 架构设计

### 总体架构

```mermaid
flowchart TD
    User[用户浏览器] -->|HTTPS| Vercel[Vercel CDN]
    Vercel --> NextJS[Next.js App Router]

    NextJS --> Auth[Supabase Auth]
    NextJS --> API[API Routes]
    NextJS --> Storage[Supabase Storage]

    API --> Gemini[Google Gemini AI]
    API --> DB[(Supabase PostgreSQL)]
    API --> Creem[Creem Payment Gateway]

    Auth -->|OAuth| GitHub[GitHub OAuth]
    Auth -->|OAuth| Google[Google OAuth]

    DB --> Credits[积分管理系统]
    DB --> Subs[订阅管理系统]

    Credits -->|冻结/解冻| Freeze[冻结逻辑]
    Subs -->|自动充值| AutoRefill[年付自动充值]

    Creem -->|Webhook| WebhookHandler[/api/webhooks/creem]
    WebhookHandler --> DB

    API --> Veo[Google Veo 3.1 API]
    Veo -->|异步处理| VeoOp[Operation Status]

    Vercel -->|Cron每分钟| CronPoll[/api/cron/poll-video-status]
    CronPoll --> VeoOp
    CronPoll -->|下载视频| CronDL[/api/cron/download-video]
    CronDL --> Storage
    CronDL --> DB
```

### 关键流程

#### 用户注册与登录流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant F as 前端
    participant A as Auth API
    participant S as Supabase Auth
    participant D as Database

    U->>F: 访问/register
    F->>U: 显示注册表单（邮箱验证码）
    U->>F: 填写邮箱+密码
    F->>A: POST /api/auth/send-code
    A->>U: 发送验证码邮件
    U->>F: 输入验证码
    F->>A: POST /api/auth/register
    A->>S: createUser()
    S->>D: 插入users表
    D-->>S: 用户ID
    S-->>A: 注册成功
    A->>D: 分配初始积分（免费套餐）
    A-->>F: 返回session
    F->>U: 跳转到/editor
```

#### 订阅升级与积分冻结流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant F as 前端
    participant C as /api/checkout
    participant Creem as Creem.io
    participant W as Webhook
    participant D as Database

    U->>F: 点击升级到Pro套餐
    F->>C: POST /api/checkout {plan: 'pro'}
    C->>Creem: createCheckoutSession()
    Creem-->>C: sessionUrl
    C-->>F: 返回支付链接
    F->>U: 重定向到Creem支付页面
    U->>Creem: 完成支付
    Creem->>W: POST /api/webhooks/creem
    W->>D: 查询旧订阅剩余积分
    W->>D: 冻结旧订阅（is_frozen=true, freeze_start_time）
    W->>D: 创建新订阅（Pro套餐）
    W->>D: 添加新积分
    D-->>W: 更新成功
    W-->>Creem: 200 OK
    F->>D: 查询最新积分
    D-->>F: 返回可用积分（排除冻结）
    F->>U: 显示新套餐积分
```

#### 视频生成与Cron轮询流程 (Day3)

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant F as 前端
    participant API as /api/v1/video/generate
    participant CS as CreditService
    participant Veo as Google Veo 3.1 API
    participant DB as Database
    participant Cron as Vercel Cron (每分钟)
    participant DL as /api/cron/download-video
    participant S3 as Supabase Storage

    U->>F: 提交视频生成请求
    F->>API: POST /api/v1/video/generate {prompt, image?, duration}

    API->>CS: checkAvailableCredits()
    CS->>DB: 查询可用积分
    DB-->>CS: available = remaining - frozen

    alt 积分不足
        CS-->>API: 错误：积分不足
        API-->>F: 402 Payment Required
        F->>U: 提示购买积分
    else 积分充足
        API->>DB: 扣除积分（4秒720p=40分，4秒1080p=60分）
        DB-->>API: 扣除成功

        API->>Veo: generateVideo(prompt, image?, config)
        Veo-->>API: 返回operation_id (异步任务ID)

        API->>DB: 插入video_generation_history
        Note over API,DB: status='processing'<br/>operation_id, task_id, credit_cost

        API-->>F: 返回task_id
        F->>U: 显示"生成中"页面（轮询开始）

        loop 前端每10秒轮询（最多10分钟）
            F->>API: GET /api/v1/video/status/:taskId
            API->>DB: 查询video_generation_history
            DB-->>API: status='processing'
            API-->>F: 返回status='processing'
            F->>U: 显示进度和耗时
        end

        loop Vercel Cron每分钟执行
            Cron->>DB: 查询status='processing'或'downloading'的任务
            DB-->>Cron: 返回待处理任务列表

            Cron->>Veo: checkOperationStatus(operation_id)
            Veo-->>Cron: 返回status和videoUrl

            alt 视频已完成
                Cron->>DB: 更新status='downloading', google_video_url
                Cron->>DL: POST触发下载任务
                DL->>Veo: 下载视频文件
                Veo-->>DL: 返回视频二进制
                DL->>S3: 上传到Supabase Storage
                S3-->>DL: 返回永久URL
                DL->>DB: 更新status='completed', video_url, thumbnail_url
                DB-->>DL: 更新成功
                DL-->>Cron: 下载完成
            else 任务失败
                Cron->>DB: 更新status='failed', error_message
                Cron->>CS: refundFailedTask(task_id, user_id, credit_cost)
                CS->>DB: 退还积分
                DB-->>CS: 退款成功
            else 任务超时（>10分钟）
                Cron->>DB: 更新status='failed', error_code='TIMEOUT'
                Cron->>CS: refundFailedTask()
                CS->>DB: 退还积分
            end
        end

        F->>API: GET /api/v1/video/status/:taskId
        API->>DB: 查询video_generation_history
        DB-->>API: status='completed', video_url
        API-->>F: 返回完成状态和视频URL
        F->>U: 显示视频播放器（可下载）
    end
```

**关键设计决策**:
- **异步架构**: Google Veo API采用异步模式，避免长时间阻塞请求
- **Cron轮询**: Vercel Cron每分钟检查任务状态，生产环境自动化
- **超时机制**: 前端10分钟超时，后端10分钟强制标记失败并退款
- **积分预扣**: 提交时立即扣除积分，失败时自动退还
- **本地开发**: 需手动执行`scripts/dev-poll-video-status.sh`模拟Cron任务

---

## 3. 架构决策记录 (ADR)

ADR 文档位置：`docs/adr/`
模板格式：MADR (`YYYYMMDD-title.md`)

### 已记录的 ADR

1. **20251106-performance-optimization.md**
   - 决策：采用 WebP/AVIF 图片格式 + 懒加载策略
   - 理由：提升移动端性能（目标 Lighthouse 80+）
   - 状态：已实施，桌面端达到 95 分

2. **20251107-i18n-cookie-strategy.md**
   - 决策：使用 js-cookie 代替 localStorage 存储语言偏好
   - 理由：解决 SSR/CSR hydration 错误
   - 状态：已实施，hydration 错误率 0%

3. **20251109-credit-freeze-logic.md**
   - 决策：订阅升级时立即冻结旧套餐剩余积分
   - 理由：防止用户利用降级漏洞无限囤积积分
   - 状态：已实施，冻结逻辑通过测试

4. **20251120-video-generation-architecture.md (Day3)**
   - 决策：采用异步+Cron轮询架构实现视频生成
   - 理由：Google Veo API响应时间11秒~6分钟，同步请求会超时
   - 技术方案：
     - 前端：立即返回task_id，轮询status（10秒间隔，10分钟超时）
     - 后端：Vercel Cron每分钟检查待处理任务，下载视频并上传到Supabase Storage
     - 积分：提交时预扣，失败时自动退还（防止用户恶意重试）
   - 状态：已实施，Day3上线
   - 技术债务：本地开发环境需手动执行脚本模拟Cron任务

---

## 4. 设计决策 & 技术债务

### 当前技术债务清单

| 类型 | 描述 | 优先级 | 计划处理时间 | 负责人 |
|------|------|--------|-------------|--------|
| 性能 | 移动端 Lighthouse 60 分（目标 80+） | P1 | Phase 2 Week 1 | - |
| 测试 | 订阅系统缺少 E2E 测试 | P2 | Phase 2 Week 2 | - |
| 构建 | TypeScript 错误被 ignoreBuildErrors 忽略 | P2 | Phase 2 Week 3 | - |
| 数据库 | 20 个迁移文件需合并优化 | P3 | Phase 2 Week 4 | - |
| 代码质量 | Webhook 事件处理缺少单元测试 | P2 | Phase 2 Week 2 | - |
| 文档 | API 文档缺少 OpenAPI 规范 | P3 | Phase 3 | - |
| **视频生成** | **本地开发Cron任务需手动触发（脚本已提供）** | **P2** | **Day4优化** | **-** |
| **视频生成** | **视频缩略图自动生成（当前使用视频URL）** | **P3** | **Phase 3** | **-** |

### 已完成的优化

- ✅ **性能优化** (2025-11-06)
  - 图片格式优化：WebP/AVIF
  - 懒加载 12 个组件
  - DNS preconnect
  - 结果：Desktop 95/100, SEO 100/100

- ✅ **国际化完善** (2025-11-07 至 11-13)
  - 中英双语覆盖所有页面
  - Cookie 持久化方案
  - 100+ 翻译键新增

- ✅ **订阅系统重构** (2025-11-09 至 11-13)
  - 积分冻结逻辑
  - 年付自动充值
  - Webhook 事件字段修复

- ✅ **视频生成功能上线 (Day3)** (2025-11-20)
  - Google Veo 3.1 API集成
  - 异步+Cron轮询架构
  - 前端状态追踪组件（10秒轮询+10分钟超时）
  - 自动积分退款机制
  - Supabase Storage视频存储
  - 历史记录视频/图片混合展示
  - 本地开发Cron模拟脚本

---

## 5. 模块文档

### 5.1 订阅系统 (lib/credit-service.ts)

**职责**:
- 管理用户订阅生命周期
- 处理积分冻结/解冻逻辑
- 计算剩余天数（支持冻结模式）
- 年付订阅自动充值

**入口点**:
- `lib/credit-service.ts` - 核心服务层
- `hooks/use-profile-data.ts` - React Hook 封装

**关键函数**:

```typescript
// 升级时冻结旧套餐积分
function freezeCreditsOnUpgrade(
  userId: string,
  oldSubscriptionId: string
): Promise<void>

// 计算剩余天数（区分普通/冻结模式）
function calculateRemainingDays(
  subscription: Subscription
): number

// 年付订阅自动充值（每月1号）
function autoRefillYearlySubscription(
  subscriptionId: string
): Promise<void>
```

**外部依赖**:
- Supabase Client
- lib/credit-types.ts (类型定义)

**测试覆盖基线**:
- 单元测试：85%+
- 集成测试：缺失 (P2 技术债务)

**风险与扩展点**:
- 🔴 高风险：积分计算逻辑错误可能导致财务损失
- 🟡 扩展点：支持更多套餐类型（当前仅支持 Basic/Pro/Max）

---

### 5.2 国际化系统 (lib/language-context.tsx)

**职责**:
- 双语支持（中文/英文）
- Cookie 持久化语言偏好
- SSR/CSR 一致性保证

**关键 API**:
```typescript
// React Hook
const { language, setLanguage, t } = useLanguage()

// 翻译函数
const text = t("login.title") // 返回当前语言的翻译
```

**SSR 兼容方案**:
- 使用 `js-cookie` 替代 `localStorage`
- 避免 React hydration 错误
- 服务端渲染时默认使用英文

**翻译键组织**:
```
translations
├── en (英文)
│   ├── login.*
│   ├── register.*
│   ├── profile.*
│   └── ...
└── zh (中文)
    ├── login.*
    ├── register.*
    └── ...
```

**扩展点**:
- 支持更多语言（日语、韩语等）
- 集成 i18next 进行专业化管理

---

### 5.3 视频生成服务 (lib/video-service.ts) - Day3

**职责**:
- 调用 Google Veo 3.1 API 生成视频
- 管理视频任务状态追踪
- 处理积分扣除和退款
- 从Google下载视频并上传到Supabase Storage

**入口点**:
- `lib/video-service.ts` - 核心服务层
- `app/api/v1/video/generate/route.ts` - 创建视频任务
- `app/api/v1/video/status/[taskId]/route.ts` - 查询任务状态
- `app/api/cron/poll-video-status/route.ts` - Cron轮询任务
- `app/api/cron/download-video/route.ts` - Cron下载视频

**关键函数**:

```typescript
// 创建视频生成任务
async function createVideoTask(
  userId: string,
  prompt: string,
  imageUrl?: string,
  config?: VideoConfig
): Promise<{ taskId: string, operationId: string }>

// 查询任务状态
async function getTaskStatus(
  taskId: string,
  userId: string
): Promise<VideoTask>

// 检查Google Veo API状态
async function checkOperationStatus(
  operationId: string
): Promise<{ status: string, videoUrl?: string }>

// 下载视频并上传到Supabase Storage
async function downloadAndUploadVideo(
  taskId: string,
  googleVideoUrl: string
): Promise<{ videoUrl: string, thumbnailUrl: string }>

// 退款失败任务
async function refundFailedTask(
  taskId: string,
  userId: string,
  creditCost: number
): Promise<void>
```

**外部依赖**:
- Google Veo 3.1 API (`@google-cloud/video-intelligence`)
- Supabase Client (Storage)
- lib/credit-service.ts (积分管理)

**测试覆盖基线**:
- 单元测试：75%+ (Day3初版)
- 集成测试：API接口测试已通过
- E2E测试：待添加 (P2)

**风险与扩展点**:
- 🔴 **高风险**：Google Veo API超时（>10分钟）需自动退款
- 🟡 **扩展点**：支持更多视频时长（当前仅4秒）
- 🟡 **扩展点**：视频缩略图自动生成（当前使用视频URL）
- 🟢 **本地开发**：需手动执行`scripts/dev-poll-video-status.sh`

**积分消耗规则 (Day3)**:
- 4秒 720p 视频：40 积分
- 4秒 1080p 视频：60 积分
- 失败时全额退款

---

### 5.4 Webhook 处理 (app/api/webhooks/creem/route.ts)

**职责**:
- 接收 Creem 支付回调
- 验证 Webhook 签名
- 处理订阅创建/更新/取消事件

**关键修复** (2025-11-11):
```typescript
// 🔥 老王修复：Creem 实际使用 eventType，不是 type
type CreemWebhookEvent = {
  id: string
  eventType: string  // ✅ 修正字段名
  object: {           // ✅ 修正字段名（原为 data）
    id: string
    // ...
  }
}
```

**安全措施**:
- HMAC-SHA256 签名验证
- IP 白名单（建议添加）
- 幂等性处理（防止重复处理）

**事件处理流程**:
1. `checkout.completed` → 创建订阅 + 分配积分
2. `subscription.created` → 激活订阅
3. `subscription.updated` → 更新订阅信息
4. `subscription.cancelled` → 冻结剩余积分

---

## 6. API 手册

### 6.1 认证相关

#### POST /api/auth/register
注册新用户（邮箱验证码方式）

**请求**:
```typescript
{
  email: string,          // 邮箱地址
  password: string,       // 密码（需符合安全策略）
  username?: string,      // 可选用户名
  verificationCode: string,  // 6位数字验证码
  turnstileToken: string  // Cloudflare Turnstile 令牌
}
```

**响应**:
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    username: string
  }
}
```

**错误码**:
- `400` - 参数错误或验证码无效
- `409` - 邮箱已注册
- `500` - 服务器错误

---

#### POST /api/auth/login
用户登录（支持邮箱/用户名）

**请求**:
```typescript
{
  identifier: string,     // 邮箱或用户名
  password: string,
  turnstileToken: string
}
```

**响应**:
```typescript
{
  success: true,
  session: {
    token: string,        // JWT Token
    expiresAt: string
  },
  user: { /* ... */ },
  supabaseSession: {      // Supabase 会话信息
    access_token: string,
    refresh_token: string
  }
}
```

---

### 6.2 支付相关

#### POST /api/checkout
创建 Creem 支付会话

**请求**:
```typescript
{
  plan: 'basic' | 'pro' | 'max',
  billing: 'monthly' | 'yearly'
}
```

**响应**:
```typescript
{
  sessionUrl: string,  // Creem 支付页面 URL
  sessionId: string
}
```

**业务逻辑**:
1. 验证用户登录状态
2. 查询对应套餐的 Product ID
3. 调用 Creem API 创建支付会话
4. 返回支付链接给前端

---

#### POST /api/webhooks/creem
Creem 支付回调 Webhook

**请求头**:
```
X-Creem-Signature: <HMAC-SHA256 签名>
```

**请求体**:
```typescript
{
  id: string,
  eventType: 'checkout.completed' | 'subscription.created' | ...,
  object: {
    id: string,
    metadata: { userId: string, plan: string }
  }
}
```

**响应**:
```typescript
{ received: true }
```

**幂等性保证**:
- 基于 `event.id` 去重
- 数据库事务确保原子性

---

### 6.3 AI 功能

#### POST /api/generate
Google Gemini 图像编辑 API

**请求**:
```typescript
{
  prompt: string,               // 自然语言指令
  image?: string,               // Base64 编码图像
  model?: 'gemini-1.5-flash' | 'gemini-1.5-pro'
}
```

**响应**:
```typescript
{
  success: true,
  result: {
    image: string,              // Base64 编码生成图像
    description: string         // AI 生成的描述
  },
  creditsUsed: number           // 消耗的积分数
}
```

**积分消耗规则**:
- Flash 模型：1 积分/次
- Pro 模型：2 积分/次
- 高分辨率：+1 积分

---

### 6.4 视频生成 (Day3)

#### POST /api/v1/video/generate
创建视频生成任务（Google Veo 3.1）

**请求头**:
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求体**:
```typescript
{
  prompt: string,                    // 文本提示词（必填）
  image_url?: string,                // 参考图片URL（可选）
  aspect_ratio?: '16:9' | '9:16',   // 宽高比，默认16:9
  resolution?: '720p' | '1080p',     // 分辨率，默认720p
  duration?: 4,                      // 时长（秒），当前仅支持4秒
  first_frame_image_url?: string,    // 首帧图片URL（可选）
  last_frame_image_url?: string      // 尾帧图片URL（可选）
}
```

**响应**:
```typescript
{
  success: true,
  task_id: string,                   // 任务ID，用于查询状态
  operation_id: string,              // Google Veo API的operation ID
  credit_cost: number,               // 消耗的积分数（720p=40, 1080p=60）
  estimated_time: string             // 预估完成时间（11s - 6min）
}
```

**错误码**:
- `400` - 参数错误
- `402` - 积分不足
- `500` - Google Veo API错误
- `503` - 服务暂时不可用

---

#### GET /api/v1/video/status/:taskId
查询视频生成任务状态

**请求头**:
```
Authorization: Bearer <JWT Token>
```

**路径参数**:
- `taskId` - 任务ID（由`/api/v1/video/generate`返回）

**响应**:
```typescript
{
  task_id: string,
  status: 'processing' | 'downloading' | 'completed' | 'failed',
  prompt: string,
  aspect_ratio: string,
  resolution: string,
  duration: number,
  credit_cost: number,
  created_at: string,
  completed_at?: string,             // 完成时间
  video_url?: string,                // Supabase Storage永久URL
  thumbnail_url?: string,            // 缩略图URL
  error_message?: string,            // 失败原因
  error_code?: string,               // 错误码（TIMEOUT, API_ERROR等）
  refund_confirmed?: boolean         // 是否已退款
}
```

**状态说明**:
- `processing` - 视频正在生成中
- `downloading` - Google Veo已完成，正在下载到Supabase
- `completed` - 视频已完成，可观看
- `failed` - 生成失败，积分已退还

---

#### GET /api/history/videos
获取用户视频历史记录

**请求头**:
```
Authorization: Bearer <JWT Token>
```

**查询参数**:
```
?limit=20&offset=0&status=completed
```

**响应**:
```typescript
{
  total: number,
  videos: [
    {
      id: string,
      task_id: string,
      prompt: string,
      video_url: string,
      thumbnail_url: string,
      resolution: string,
      duration: number,
      created_at: string
    }
  ]
}
```

---

#### GET /api/cron/poll-video-status (Cron专用)
Vercel Cron任务：轮询视频生成状态

**请求头**:
```
Authorization: Bearer <CRON_SECRET>
```

**响应**:
```typescript
{
  success: true,
  message: "Cron job completed",
  results: {
    total: number,                   // 检查的任务总数
    completed: number,               // 成功完成的任务数
    failed: number,                  // 失败的任务数
    still_processing: number,        // 仍在处理中的任务数
    errors: string[]                 // 错误信息列表
  },
  duration_ms: number                // 执行耗时（毫秒）
}
```

**执行频率**: 每分钟一次（vercel.json配置）

**业务逻辑**:
1. 查询所有`status='processing'`或`'downloading'`的任务
2. 调用Google Veo API检查每个任务状态
3. 如果已完成：触发下载任务 → 上传到Supabase → 更新status='completed'
4. 如果失败：更新status='failed' → 自动退款
5. 如果超时（>10分钟）：标记失败 → 自动退款

---

#### POST /api/cron/download-video (Cron专用)
Cron任务：下载视频并上传到Supabase Storage

**请求头**:
```
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json
```

**请求体**:
```typescript
{
  task_id: string                    // 视频任务ID
}
```

**响应**:
```typescript
{
  success: true,
  video_url: string,                 // Supabase Storage永久URL
  thumbnail_url: string,
  file_size_mb: number               // 文件大小（MB）
}
```

**错误码**:
- `400` - task_id缺失或任务不存在
- `500` - 下载或上传失败
- `503` - Google Veo视频URL无效

---

### 6.5 订阅查询

#### GET /api/subscription/all
获取用户所有订阅（包括冻结的）

**响应**:
```typescript
{
  isLoggedIn: true,
  subscriptions: [
    {
      id: string,
      plan: 'basic' | 'pro' | 'max',
      billingCycle: 'monthly' | 'yearly',
      status: 'active' | 'frozen' | 'expired',
      startDate: string,
      endDate: string,
      frozenUntil?: string,      // 冻结至时间
      frozenCredits?: number,    // 冻结的积分
      remainingDays: number      // 剩余天数
    }
  ]
}
```

---

## 7. 数据模型

### 7.1 ER 图

```mermaid
erDiagram
    USERS ||--o{ SUBSCRIPTIONS : has
    USERS ||--o{ CREDIT_TRANSACTIONS : has
    USERS ||--o{ VIDEO_GENERATION_HISTORY : has
    SUBSCRIPTIONS ||--o{ CREDITS : manages
    SUBSCRIPTIONS ||--o{ CREDIT_TRANSACTIONS : generates

    USERS {
        uuid id PK
        string email UK
        string username
        timestamp created_at
        jsonb metadata
    }

    VIDEO_GENERATION_HISTORY {
        uuid id PK
        uuid user_id FK
        string task_id UK
        string operation_id
        string status
        text prompt
        string aspect_ratio
        string resolution
        int duration
        int credit_cost
        string video_url
        string thumbnail_url
        string google_video_url
        string error_code
        text error_message
        boolean refund_confirmed
        timestamp created_at
        timestamp completed_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        string plan_type
        string billing_cycle
        timestamp starts_at
        timestamp expires_at
        timestamp original_expires_at
        boolean is_frozen
        timestamp freeze_start_time
        int remaining_months
    }

    CREDITS {
        uuid id PK
        uuid user_id FK
        uuid subscription_id FK
        int total_amount
        int remaining_amount
        int frozen_amount
        timestamp expires_at
        timestamp created_at
    }

    CREDIT_TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        uuid subscription_id FK
        string type
        int amount
        string description_en
        string description_zh
        timestamp created_at
    }
```

### 7.2 核心表说明

#### subscriptions 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| plan_type | text | 套餐类型：basic/pro/max |
| billing_cycle | text | 计费周期：monthly/yearly |
| starts_at | timestamp | 订阅开始时间 |
| expires_at | timestamp | 订阅过期时间（可能被冻结延长） |
| original_expires_at | timestamp | 原始过期时间（不受冻结影响） |
| is_frozen | boolean | 是否已冻结 |
| freeze_start_time | timestamp | 冻结开始时间 |
| remaining_months | int | 剩余月数（年付订阅用） |

**关键逻辑**:
- `expires_at` 会随着冻结时长延长
- `original_expires_at` 始终保持不变，用于计算 remaining_days
- `remaining_months` 用于年付订阅自动充值判断

---

#### credits 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| subscription_id | uuid | 关联订阅 |
| total_amount | int | 总积分数 |
| remaining_amount | int | 剩余积分数 |
| frozen_amount | int | 已冻结积分数 |
| expires_at | timestamp | 积分过期时间 |

**重要字段关系**:
```
available_credits = remaining_amount - frozen_amount
consumed_credits = total_amount - remaining_amount
```

---

#### credit_transactions 表（交易记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| subscription_id | uuid | 关联订阅 |
| type | text | 交易类型：grant/consume/freeze/unfreeze/refund |
| amount | int | 积分数量（正数=增加，负数=减少） |
| description_en | text | 英文描述 |
| description_zh | text | 中文描述 |

**交易类型说明**:
- `grant` - 分配积分（订阅购买、续费）
- `consume` - 消耗积分（使用 AI 功能）
- `freeze` - 冻结积分（订阅升级）
- `unfreeze` - 解冻积分（冻结订阅到期）
- `refund` - 退款
- `video_refund` - 视频生成失败退款（Day3新增）

---

#### video_generation_history 表 (Day3)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| task_id | text | 任务ID（对外暴露，唯一索引） |
| operation_id | text | Google Veo API的Operation ID |
| status | text | 任务状态：processing/downloading/completed/failed |
| prompt | text | 文本提示词 |
| aspect_ratio | text | 宽高比：16:9 或 9:16 |
| resolution | text | 分辨率：720p 或 1080p |
| duration | int | 视频时长（秒），当前固定为4 |
| credit_cost | int | 消耗的积分数（720p=40, 1080p=60） |
| video_url | text | Supabase Storage永久URL |
| thumbnail_url | text | 视频缩略图URL |
| google_video_url | text | Google Veo临时下载URL |
| error_code | text | 错误码（TIMEOUT, API_ERROR等） |
| error_message | text | 失败原因描述 |
| refund_confirmed | boolean | 是否已退款（防止重复退款） |
| created_at | timestamp | 任务创建时间 |
| completed_at | timestamp | 任务完成时间 |

**索引**:
- `task_id` - 唯一索引（UNIQUE）
- `user_id, status` - 复合索引（用于Cron查询待处理任务）
- `operation_id` - 普通索引（用于Google Veo API回调）

**RLS策略**:
- 用户只能查询自己的视频记录（`user_id = auth.uid()`）
- Cron任务使用service_role_key跳过RLS

**状态流转**:
```
processing → downloading → completed
           ↓
         failed (超时/API错误)
```

**关键逻辑**:
- `refund_confirmed=true`：标记已退款，防止重复退款
- `google_video_url`：临时URL，仅用于Cron下载
- `video_url`：Supabase Storage永久URL，供前端播放

---

## 8. 核心流程

### 8.1 积分消耗流程

当用户使用 AI 功能时：

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant F as 前端
    participant API as /api/generate
    participant CS as CreditService
    participant DB as Database
    participant Gemini as Gemini API

    U->>F: 提交编辑请求
    F->>API: POST /api/generate
    API->>CS: checkAvailableCredits()
    CS->>DB: 查询可用积分（排除冻结）
    DB-->>CS: available = remaining - frozen

    alt 积分不足
        CS-->>API: 错误：积分不足
        API-->>F: 402 Payment Required
        F->>U: 提示购买积分
    else 积分充足
        CS-->>API: 积分充足，继续
        API->>Gemini: generateImage()
        Gemini-->>API: 返回图像
        API->>CS: consumeCredits(amount)
        CS->>DB: 更新 remaining_amount
        CS->>DB: 插入 transaction 记录
        DB-->>CS: 更新成功
        CS-->>API: 消耗成功
        API-->>F: 返回生成图像
        F->>U: 显示结果
    end
```

---

### 8.2 订阅降级与积分解冻流程

当用户从 Pro 降级到 Basic：

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant W as Webhook
    participant DB as Database

    U->>Creem: 购买 Basic 月付（当前有 Pro 年付）
    Creem->>W: checkout.completed 事件
    W->>DB: 查询当前活跃订阅（Pro）
    DB-->>W: Pro 订阅（expires_at: 2026-05-01）

    W->>DB: 冻结 Pro 订阅
    Note over W,DB: is_frozen = true<br/>freeze_start_time = NOW()

    W->>DB: 冻结 Pro 剩余积分
    Note over W,DB: frozen_amount = remaining_amount

    W->>DB: 创建 Basic 订阅
    Note over W,DB: starts_at = NOW()<br/>expires_at = NOW() + 30 days

    W->>DB: 分配 Basic 积分（100）

    DB-->>W: 所有操作成功
    W-->>Creem: 200 OK

    Note over U: 用户现在可用积分 = Basic 100 分<br/>Pro 剩余积分已冻结至 2026-05-01
```

**关键点**:
- Pro 的 `expires_at` **不变**，仍为 2026-05-01
- Pro 积分全部冻结，用户只能使用 Basic 的 100 分
- 当 Basic 订阅到期后，自动解冻 Pro 积分

---

## 9. 依赖图谱

### 9.1 生产依赖

| 包名 | 版本 | 用途 | 许可证 | 备注 |
|------|------|------|--------|------|
| next | 16.0.1 | Web 框架 | MIT | 使用 Turbopack |
| react | 19.0.0 | UI 库 | MIT | - |
| @supabase/supabase-js | 2.48.1 | 后端服务 | MIT | Auth + DB + Storage |
| @google/generative-ai | 0.21.0 | AI 图像生成 | Apache-2.0 | Gemini API |
| react-hook-form | 7.54.2 | 表单管理 | MIT | - |
| zod | 3.24.1 | 表单验证 | MIT | - |
| js-cookie | 3.0.5 | Cookie 管理 | MIT | i18n 持久化 |
| react-joyride | 2.9.2 | 用户引导 | MIT | Tour 系统 |
| react-cookie-consent | 9.0.0 | Cookie 同意 | MIT | GDPR 合规 |

### 9.2 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| @testing-library/react | 16.1.0 | 单元测试 |
| jest | 29.7.0 | 测试框架 |
| typescript | 5 | 类型系统 |
| eslint | 9 | 代码检查 |
| tailwindcss | 4.1.9 | CSS 框架 |

### 9.3 潜在冲突与替代方案

**已知问题**:
- React 19 为候选版本（RC），可能存在稳定性风险
  - **替代方案**: 降级到 React 18.3.1（稳定版）

**许可证兼容性**:
- ✅ 所有依赖均为 MIT/Apache-2.0，商业使用无限制

---

## 10. 维护建议

### 10.1 运维监控

**性能监控**:
- Lighthouse CI 集成（目标：移动端 80+，桌面端 95+）
- Vercel Analytics 已启用
- 建议集成 Sentry 进行错误追踪

**告警规则**:
- API 响应时间 > 2s → 告警
- 数据库连接数 > 80% → 预警
- Webhook 失败率 > 1% → 立即告警

**日志策略**:
- 前端：仅记录错误和关键业务日志
- 后端：API 请求、Webhook 事件、积分变更全量记录
- 敏感数据脱敏（密码、支付信息）

---

### 10.2 容量规划

**当前资源使用**:
- Supabase 免费套餐：数据库用量 < 10%
- Vercel Hobby 套餐：构建分钟数充足
- Google Gemini API：按量计费，月成本 < $50

**扩展阈值**:
- 用户数 > 1000 → 升级 Supabase Pro ($25/月)
- 图片生成次数 > 10000/月 → 考虑缓存策略
- 并发请求 > 100 → 启用 CDN 缓存

---

### 10.3 成本控制

**优化策略**:
1. 图片压缩：WebP/AVIF 格式，减少存储成本
2. API 调用优化：
   - 优先使用 Gemini Flash（成本更低）
   - 高分辨率请求增加积分消耗
3. 数据库查询优化：
   - 索引优化（user_id, subscription_id）
   - 分页查询（每页 20 条）

**成本预警**:
- Gemini API 月消耗 > $100 → 告警
- Supabase 存储 > 5GB → 预警

---

## 11. 术语表和缩写

| 术语 | 定义 |
|------|------|
| ADR | Architecture Decision Record（架构决策记录） |
| i18n | Internationalization（国际化） |
| SSR | Server-Side Rendering（服务端渲染） |
| CSR | Client-Side Rendering（客户端渲染） |
| hydration | React 客户端激活过程，SSR 生成的 HTML 绑定事件 |
| freeze | 积分冻结，订阅升级时保留旧积分但禁止使用 |
| unfreeze | 积分解冻，冻结订阅到期后恢复可用 |
| remaining_days | 剩余天数，基于 original_expires_at 和当前时间计算 |
| remaining_amount | 剩余积分数，未消耗的积分总数 |
| frozen_amount | 已冻结积分数，不可使用的积分 |
| available_credits | 可用积分 = remaining_amount - frozen_amount |
| Turnstile | Cloudflare 图形验证码服务 |
| Creem | 支付网关服务商 |
| Gemini | Google 的多模态 AI 模型 |
| Veo | Google Veo 3.1 视频生成模型 (Day3) |
| operation_id | Google Veo API异步任务的唯一标识符 |
| task_id | Nano Banana内部视频任务ID（对外暴露） |
| Cron轮询 | Vercel Cron每分钟检查待处理任务的机制 |
| processing | 视频生成中状态（Google Veo API处理中） |
| downloading | 视频下载中状态（从Google下载并上传到Supabase） |
| video_refund | 视频生成失败时的积分退款记录 |
| refund_confirmed | 防止重复退款的标志位 |

---

## 12. 变更日志

参见 [CHANGELOG.md](./CHANGELOG.md)（与本节建立双向链接）

### 最新版本

**[0.2.0-beta] - 2025-11-20 (Day3视频生成功能)**
- 🎬 Google Veo 3.1 视频生成集成
- 异步+Cron轮询架构
- 视频状态追踪组件（10秒轮询+10分钟超时）
- 自动积分退款机制
- Supabase Storage视频存储
- 历史记录视频/图片混合展示
- 5个新API接口（视频生成+状态查询+Cron任务）
- 本地开发Cron模拟脚本

详见：[CHANGELOG.md](./CHANGELOG.md#unreleased) - Day3视频生成功能

**[0.0.14] - 2025-11-13**
- 订阅系统冻结逻辑优化
- 年付订阅自动充值机制
- 积分过期计算修复
- Creem Webhook 事件字段修复
- 国际化系统完善（100+ 翻译键）

详见：[CHANGELOG.md](./CHANGELOG.md#0014---2025-11-13)

---

## 附录

### A. 快速开始

```bash
# 克隆仓库
git clone <repo-url>
cd nanobanana-clone

# 安装依赖
pnpm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填写 Supabase、Gemini、Creem 凭证

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### B. 常见问题 (FAQ)

**Q: 为什么移动端性能只有 60 分？**
A: 主要因为图片体积大和 JS bundle 未优化。Phase 2 Week 1 会处理。

**Q: 积分冻结后还能用吗？**
A: 不能。冻结积分在 `frozen_amount` 字段，不计入 `available_credits`。

**Q: Webhook 签名验证失败怎么办？**
A: 检查 `CREEM_WEBHOOK_SECRET` 是否正确，确保使用 HMAC-SHA256 算法。

**Q: 如何添加新的翻译键？**
A: 编辑 `lib/language-context.tsx` 的 `translations` 对象，同时为 `en` 和 `zh` 添加对应文本。

**Q: 视频生成需要多久？(Day3)**
A: Google Veo API响应时间11秒~6分钟不等，前端会显示实时进度和耗时。

**Q: 视频生成失败会退款吗？**
A: 会。失败时自动全额退还积分，防止用户损失。超时（>10分钟）也会自动退款。

**Q: 本地开发视频一直卡在"处理中"怎么办？**
A: 本地环境没有Vercel Cron任务，需手动执行 `bash scripts/dev-poll-video-status.sh` 模拟Cron检查。

**Q: 生产环境视频会卡住吗？**
A: 不会。Vercel Cron每分钟自动检查任务状态，下载完成的视频并更新数据库。

**Q: 视频生成消耗多少积分？**
A: 4秒720p视频消耗40积分，4秒1080p视频消耗60积分。

---

**文档维护**:
- 每次代码提交后更新对应章节
- ADR 需在决策实施前创建
- 技术债务表每月审查一次

**联系方式**:
- GitHub Issues: <repo-url>/issues
- 项目文档: 本文件 (PROJECTWIKI.md)
