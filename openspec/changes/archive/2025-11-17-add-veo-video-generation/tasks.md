# Video Generation Implementation Tasks

**Project Context**: This document contains implementation steps for the **Video Generation** feature,
which is part of **Nano Banana Phase 2 (Week 11-13)**.

**Global Roadmap**: See [PROJECTROADMAP.md](../../../PROJECTROADMAP.md) for complete project timeline

**Phase**: Phase 2 - Core AI Features Development
**Timeline**: Week 11-13 (15 days, Days 1-15)
**Position**: After Inpainting/Outpainting (Week 8-10), Before Upscaling/Variations (Week 14-15)

---

## Tasks: Video Generation Implementation

**Status**: Planned
**Priority**: Phase 2
**Estimated Time**: 14 working days (3 weeks)

---

## Task Overview

This document outlines all implementation tasks for adding Google Veo 3.1 video generation to the Nano Banana platform. Tasks are ordered by dependency and priority.

---

## Step 1: Infrastructure Setup (Days 1-3)

### Priority: P0 (Blocking)

---

### Task 1.1: Create Database Migrations

**Owner**: Backend Engineer
**Estimated Time**: 4 hours
**Dependencies**: None

**Description**: Create SQL migrations for all required database schema changes.

**Subtasks**:
- [ ] Create `video_generation_history` table
  - Columns: id, user_id, operation_id, status, prompt, negative_prompt, aspect_ratio, resolution, duration, credit_cost, google_video_url, permanent_video_url, file_size_bytes, error_message, error_code, retry_count, created_at, completed_at, downloaded_at
  - Indexes: idx_user_id, idx_status, idx_created_at, idx_operation_id (unique)
  - Constraints: CHECK constraints on status, aspect_ratio, resolution, duration

- [ ] Extend `credit_transactions` table
  - Add transaction types: `video_4s_generation`, `video_6s_generation`, `video_8s_generation`, `refund_video_generation`, `refund_safety_filter`
  - Update CHECK constraint to include new types

- [ ] Add system configs
  - `video_generation_credit_cost`: {"4s": 40, "6s": 60, "8s": 80}
  - `video_concurrent_limit`: {"max_concurrent_tasks": 3}
  - `video_generation_enabled`: {"enabled": true, "message": null}

**Verification**:
```bash
# Run migrations
supabase db push

# Verify tables exist
supabase db inspect

# Insert test data
INSERT INTO video_generation_history (...)

# Verify constraints
INSERT INTO credit_transactions (transaction_type = 'video_4s_generation')
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **迁移执行**：所有迁移脚本在 PostgreSQL 13+ 无错误执行
- [ ] **表结构**：`video_generation_history` 包含所有必需列，数据类型正确
- [ ] **索引创建**：4个索引（user_id, status, created_at, operation_id）已创建并可查询
- [ ] **唯一约束**：`operation_id` 唯一索引防止重复记录
- [ ] **CHECK约束验证**：
  - `status` 仅允许：processing, downloading, completed, failed
  - `aspect_ratio` 仅允许：16:9, 9:16
  - `resolution` 仅允许：720p, 1080p
  - `duration` 仅允许：4, 6, 8
- [ ] **外键完整性**：`user_id` 正确关联到 `users` 表

#### ⚡ 性能验证（Performance）
- [ ] **查询性能**：
  - `SELECT * FROM video_generation_history WHERE user_id = ? AND status = ?` < 10ms
  - `SELECT * FROM video_generation_history WHERE operation_id = ?` < 5ms（唯一索引）
- [ ] **批量插入**：1000条记录插入 < 2秒

#### 🔒 数据完整性（Data Integrity）
- [ ] **约束测试**：尝试插入无效值（如 duration=5）触发错误
- [ ] **默认值**：`created_at` 自动设置为当前时间戳
- [ ] **NULL处理**：可选字段（negative_prompt, error_message）允许NULL

#### 🛡️ 可靠性（Reliability）
- [ ] **回滚测试**：迁移可安全回滚（`supabase db reset`）
- [ ] **幂等性**：多次运行迁移不产生错误（IF NOT EXISTS）
- [ ] **数据保留**：回滚不删除既有数据（使用 ALTER TABLE ADD COLUMN IF NOT EXISTS）

#### 📊 可观测性（Observability）
- [ ] **迁移日志**：Supabase Dashboard 显示迁移历史和状态
- [ ] **元数据验证**：`supabase db inspect` 输出完整表结构

#### 📖 文档完整性（Documentation）
- [ ] **迁移文件命名**：遵循 `YYYYMMDD_description.sql` 格式
- [ ] **注释说明**：每个表、列、索引包含 COMMENT 说明用途
- [ ] **回滚脚本**：提供对应的 DOWN 迁移脚本

---

### Task 1.2: Create Supabase Storage Bucket

**Owner**: DevOps/Backend Engineer
**Estimated Time**: 1 hour
**Dependencies**: None

**Description**: Set up Supabase Storage bucket for video files.

**Subtasks**:
- [ ] Create bucket named `video-generations`
- [ ] Set public access policy (videos are publicly readable)
- [ ] Configure file size limits (max 100MB per file)
- [ ] Set up bucket policies for user-scoped paths (`{user_id}/videos/*`)

**Verification**:
```typescript
// Test upload
const { data, error } = await supabase.storage
  .from('video-generations')
  .upload('test-user/videos/test.mp4', testFile);

// Test public URL
const { data: { publicUrl } } = supabase.storage
  .from('video-generations')
  .getPublicUrl('test-user/videos/test.mp4');

console.log(publicUrl); // Should return valid URL
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **Bucket 创建**：
  - Bucket 名称：`video-generations`
  - 可通过 Supabase Dashboard 和 API 访问
  - 生成唯一 bucket ID
- [ ] **公开访问策略**：
  - 所有文件默认公开可读（无需认证）
  - 公开 URL 格式：`https://{project_id}.supabase.co/storage/v1/object/public/video-generations/{path}`
  - 公开 URL 直接可访问（不返回 403/404）
- [ ] **路径结构**：
  - 支持用户作用域路径：`{user_id}/videos/{operation_id}.mp4`
  - 路径分隔符：正斜杠 `/`
  - 文件扩展名：`.mp4`（MP4 视频格式）
- [ ] **上传功能**：
  - 支持从 Node.js 服务端上传文件
  - 支持 `File` 和 `Buffer` 类型
  - 返回上传成功响应（包含 path 和 fullPath）
- [ ] **下载功能**：
  - 通过公开 URL 下载文件（HTTP GET）
  - 下载文件与原始上传文件完全一致（MD5 校验）
  - 支持 Range 请求（部分内容下载）

#### ⚡ 性能指标（Performance）
- [ ] **上传速度**：10MB 文件上传 < 5 秒（取决于网络）
- [ ] **下载速度**：10MB 文件下载 < 3 秒（CDN 加速）
- [ ] **URL 生成**：< 10ms（getPublicUrl 调用）

#### 🔒 安全性（Security）
- [ ] **文件大小限制**：
  - 最大文件大小：100MB
  - 超出限制返回 413 Payload Too Large
- [ ] **文件类型限制**（可选）：
  - 仅允许 `video/mp4` MIME 类型
  - 拒绝其他文件类型上传
- [ ] **路径隔离**：
  - 用户只能上传到自己的路径（`{user_id}/videos/*`）
  - 使用 RLS (Row Level Security) 策略强制隔离
- [ ] **防滥用**：
  - 每用户存储配额限制（如 10GB）
  - 超出配额返回错误，不允许上传

#### 🛡️ 可靠性（Reliability）
- [ ] **上传重试**：
  - 网络错误自动重试 3 次（指数退避）
  - 上传失败返回明确错误信息
- [ ] **存储冗余**：Supabase 自动提供数据冗余（多副本存储）
- [ ] **边界条件测试**：
  - 上传 0 字节文件 → 拒绝或成功（取决于策略）
  - 上传 100MB 文件 → 成功
  - 上传 101MB 文件 → 413 错误
  - 上传到不存在的 bucket → 404 错误
  - 上传到他人路径（无权限）→ 403 错误

#### 📊 可观测性（Observability）
- [ ] **存储监控**：
  - 通过 Supabase Dashboard 查看存储使用量
  - 设置存储配额告警（如达到 80%）
- [ ] **上传日志**：每次上传记录
  ```json
  {
    "userId": "uuid",
    "fileName": "operation-xxx.mp4",
    "fileSize": 12345678,
    "uploadDuration": 2345,
    "success": true,
    "timestamp": "2025-01-05T..."
  }
  ```
- [ ] **错误追踪**：上传失败自动上报到 Sentry

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **集成测试场景**（至少 8 个）：
  1. ✅ 上传 10MB 视频文件到 `{user_id}/videos/test.mp4` → 成功
  2. ✅ 获取公开 URL → 返回有效 URL
  3. ✅ 通过公开 URL 下载文件 → 文件完整（MD5 匹配）
  4. ✅ 上传 100MB 文件 → 成功
  5. ✅ 上传 101MB 文件 → 413 错误
  6. ✅ 上传到不存在的 bucket → 404 错误
  7. ✅ 上传重复文件名（覆盖）→ 成功（最新文件）
  8. ✅ 删除文件后重新上传 → 成功

#### 📖 文档完整性（Documentation）
- [ ] **README 文档**：
  - Bucket 名称和用途说明
  - 文件路径规范（`{user_id}/videos/{operation_id}.mp4`）
  - 公开 URL 格式示例
  - 存储配额和限制说明
- [ ] **代码示例**：提供上传、获取 URL、下载的完整示例

#### 🔄 兼容性（Compatibility）
- [ ] **Supabase 版本**：兼容 Supabase Storage v1 API
- [ ] **向后兼容**：不破坏现有存储结构（如果已有其他 bucket）

---

### Task 1.3: Set Up Environment Variables

**Owner**: DevOps
**Estimated Time**: 30 minutes
**Dependencies**: None

**Description**: Configure required environment variables for video generation.

**Subtasks**:
- [ ] Verify `GOOGLE_AI_API_KEY` has Veo 3.1 access
- [ ] Add `CRON_SECRET` for Vercel Cron authentication
- [ ] Add `NEXT_PUBLIC_SUPABASE_STORAGE_URL` (if not already present)
- [ ] Document all environment variables in `.env.example`

**Environment Variables**:
```bash
# Existing (verify)
GOOGLE_AI_API_KEY=your_google_ai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# New
CRON_SECRET=randomly_generated_secret_string
```

**Verification**:
```bash
# Test Google AI API key
curl -H "x-goog-api-key: $GOOGLE_AI_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview

# Should return model info or 200 OK
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **环境变量完整性**：所有必需变量已配置
  - `GOOGLE_AI_API_KEY` - Google AI API 密钥（Veo 3.1 访问）
  - `CRON_SECRET` - Vercel Cron Job 认证密钥
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务端密钥
- [ ] **Google AI API Key 验证**：
  - 密钥格式正确（`AIza...` 开头，39 字符）
  - 通过 API 调用验证有效性（返回 200 OK）
  - 确认有 Veo 3.1 模型访问权限（调用 `veo-3.1-generate-preview`）
- [ ] **CRON_SECRET 生成**：
  - 使用强随机字符串（至少 32 字符）
  - 包含大小写字母、数字、特殊字符
  - 不与现有密钥冲突
- [ ] **Supabase 密钥验证**：
  - Anon Key 可公开访问（前端使用）
  - Service Role Key 仅服务端使用（不泄露到前端）

#### ⚡ 性能指标（Performance）
- [ ] **API 响应测试**：Google AI API 调用 < 2 秒（验证可用性）
- [ ] **环境变量读取**：< 1ms（Node.js process.env）

#### 🔒 安全性（Security）
- [ ] **密钥保密性**：
  - 所有密钥仅在 Vercel Dashboard 配置（不提交到 Git）
  - `.env.example` 仅包含占位符（`your_google_ai_api_key`）
  - 生产环境密钥与开发环境隔离
- [ ] **CRON_SECRET 强度**：
  - 最小长度 32 字符
  - 熵值 ≥ 128 bits（防暴力破解）
  - 生成方式：`openssl rand -hex 32` 或类似工具
- [ ] **密钥轮换策略**（可选）：
  - 每 90 天轮换 Google AI API Key
  - 每 180 天轮换 CRON_SECRET
- [ ] **泄露检测**：
  - 确保密钥未出现在 Git 历史中（`git log -S <key>`）
  - 确保密钥未出现在日志/错误消息中

#### 🛡️ 可靠性（Reliability）
- [ ] **环境变量可用性测试**：
  - 启动应用时自动检查所有必需变量
  - 缺失变量时抛出明确错误（而非运行时崩溃）
  - 错误消息：`Missing required environment variable: GOOGLE_AI_API_KEY`
- [ ] **边界条件测试**：
  - `GOOGLE_AI_API_KEY` 为空 → 启动失败，明确错误
  - `GOOGLE_AI_API_KEY` 格式错误 → API 调用失败，明确错误
  - `CRON_SECRET` 为空 → Cron Job 认证失败
  - `SUPABASE_SERVICE_ROLE_KEY` 无效 → 数据库操作失败

#### 📊 可观测性（Observability）
- [ ] **启动日志**：应用启动时记录已加载的环境变量（脱敏）
  ```json
  {
    "GOOGLE_AI_API_KEY": "AIza****",
    "CRON_SECRET": "****",
    "SUPABASE_URL": "https://xxx.supabase.co",
    "loaded": true
  }
  ```
- [ ] **配置验证日志**：每个密钥验证结果
  ```json
  {
    "key": "GOOGLE_AI_API_KEY",
    "valid": true,
    "hasVeoAccess": true
  }
  ```

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **集成测试场景**（至少 6 个）：
  1. ✅ 所有环境变量已设置 → 应用正常启动
  2. ✅ Google AI API Key 有效 → API 调用成功
  3. ✅ Google AI API Key 有 Veo 3.1 访问权限 → 模型调用成功
  4. ✅ CRON_SECRET 有效 → Cron Job 认证通过
  5. ✅ Supabase Service Role Key 有效 → 数据库操作成功
  6. ✅ 缺失 `GOOGLE_AI_API_KEY` → 启动失败，明确错误消息
- [ ] **手动验证脚本**：提供一键验证脚本（检查所有密钥有效性）

#### 📖 文档完整性（Documentation）
- [ ] **`.env.example` 完整性**：
  - 包含所有必需变量（带注释说明）
  - 提供示例值格式
  - 标注哪些是必需（Required）、哪些是可选（Optional）
  ```bash
  # Required: Google AI API Key for Veo 3.1
  GOOGLE_AI_API_KEY=your_google_ai_api_key

  # Required: Cron Job authentication secret (generate with: openssl rand -hex 32)
  CRON_SECRET=your_randomly_generated_secret

  # Required: Supabase credentials
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
- [ ] **README 更新**：
  - 添加"Environment Setup"章节
  - 说明如何获取 Google AI API Key
  - 说明如何生成 CRON_SECRET
  - 说明如何配置 Vercel 环境变量
- [ ] **故障排查指南**：
  - 常见错误及解决方案（如 401 Unauthorized, 403 Forbidden）
  - Google AI API Key 申请流程链接

#### 🔄 兼容性（Compatibility）
- [ ] **平台兼容性**：
  - Vercel Production Environment
  - Vercel Preview Environment
  - 本地开发环境（`.env.local`）
- [ ] **向后兼容**：不破坏现有环境变量配置

---

### Task 1.4: Configure Vercel Cron Jobs

**Owner**: DevOps
**Estimated Time**: 1 hour
**Dependencies**: Task 1.3

**Description**: Set up Vercel Cron Jobs for background polling.

**Subtasks**:
- [ ] Create `vercel.json` configuration
- [ ] Add cron job: `/api/cron/poll-video-operations` (every 1 minute)
- [ ] Deploy to Vercel
- [ ] Verify cron job appears in Vercel dashboard

**vercel.json**:
```json
{
  "crons": [
    {
      "path": "/api/cron/poll-video-operations",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Verification**:
- Check Vercel dashboard → Cron Jobs tab
- Verify cron job is listed and enabled
- Manually trigger cron job (test endpoint)

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **vercel.json 配置完整性**：
  - Cron job 路径：`/api/cron/poll-video-operations`
  - Schedule 格式：`*/1 * * * *`（Cron 表达式）
  - JSON 格式正确（无语法错误）
  - 文件位于项目根目录
- [ ] **Cron job 可见性**：
  - 部署后在 Vercel Dashboard → Cron Jobs 标签页可见
  - 显示正确的路径和时间表
  - 状态为"Enabled"（已启用）
- [ ] **执行频率**：
  - 每 1 分钟执行一次（误差 ±5 秒）
  - 连续 10 次执行间隔均在 55-65 秒范围内
- [ ] **端点响应**：
  - Cron job 调用 `/api/cron/poll-video-operations` 返回 200 OK
  - 响应时间 < 10 秒（正常处理）
  - 超时设置为 60 秒（Vercel Pro 限制）

#### ⚡ 性能指标（Performance）
- [ ] **执行时间**：每次 Cron job 执行 < 10 秒（正常情况）
- [ ] **并发控制**：同一时刻仅 1 个 Cron job 实例运行（防止重叠）
- [ ] **资源使用**：内存使用 < 256MB，CPU 使用 < 50%

#### 🔒 安全性（Security）
- [ ] **Cron job 认证**：
  - 请求头包含 `Authorization: Bearer ${CRON_SECRET}`
  - 端点验证 CRON_SECRET 与环境变量匹配
  - 认证失败返回 401 Unauthorized
- [ ] **防滥用**：
  - 仅允许来自 Vercel Cron 系统的请求（IP 白名单或 signature 验证）
  - 拒绝外部直接调用（除非提供有效 CRON_SECRET）
- [ ] **错误隔离**：
  - Cron job 异常不影响其他 API 端点
  - 错误时自动记录日志，但不中断后续执行

#### 🛡️ 可靠性（Reliability）
- [ ] **Cron job 执行日志**：
  - Vercel Logs 显示每次执行记录
  - 包含时间戳、状态（success/error）、执行时长
  - 错误时包含详细错误栈
- [ ] **失败重试**：
  - Vercel 自动重试失败的 Cron job（最多 3 次）
  - 重试间隔：1 分钟（下一个调度周期）
- [ ] **超时处理**：
  - Cron job 超过 60 秒自动终止（Vercel Pro 限制）
  - 超时时记录告警日志
  - 下次执行自动恢复（不阻塞后续任务）
- [ ] **边界条件测试**：
  - Cron job 端点直接调用（无 CRON_SECRET）→ 401 错误
  - Cron job 端点调用（有效 CRON_SECRET）→ 200 成功
  - Cron job 执行时间 > 60 秒 → 超时终止
  - 部署期间 Cron job 暂停 → 部署完成后自动恢复

#### 📊 可观测性（Observability）
- [ ] **Vercel Dashboard 监控**：
  - 查看 Cron job 执行历史（最近 100 次）
  - 查看成功率、平均执行时间、失败次数
  - 设置告警：执行失败 > 3 次连续 → 发送通知
- [ ] **结构化日志**：每次 Cron job 执行记录
  ```json
  {
    "cronJob": "poll-video-operations",
    "timestamp": "2025-01-05T12:00:00Z",
    "duration": 4567,
    "tasksProcessed": 5,
    "success": true
  }
  ```
- [ ] **指标上报**：
  - 计数器：`cron_job_executions_total{job="poll-video-operations",status="success|error"}`
  - 直方图：`cron_job_duration_seconds`
- [ ] **告警规则**：
  - 执行失败率 > 10% → 发送告警
  - 执行时间 > 30 秒 → 发送警告
  - 连续 5 次失败 → 紧急告警

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **集成测试场景**（至少 6 个）：
  1. ✅ `vercel.json` 部署后，Cron job 出现在 Dashboard
  2. ✅ Cron job 每分钟执行一次（观察 10 分钟）
  3. ✅ Cron job 调用端点返回 200 OK
  4. ✅ 直接调用端点（无 CRON_SECRET）→ 401 错误
  5. ✅ 直接调用端点（有效 CRON_SECRET）→ 200 成功
  6. ✅ Cron job 日志正确记录执行信息
- [ ] **手动触发测试**：
  - Vercel Dashboard → Cron Jobs → 点击"Trigger"手动执行
  - 验证立即执行（不等待下一个调度周期）
  - 验证执行结果与自动调度一致

#### 📖 文档完整性（Documentation）
- [ ] **vercel.json 注释**：
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/poll-video-operations",
        "schedule": "*/1 * * * *"  // Every 1 minute
      }
    ]
  }
  ```
- [ ] **README 更新**：
  - 添加"Cron Jobs"章节
  - 说明 Cron job 用途（轮询 Veo API 状态）
  - 说明如何在 Vercel Dashboard 查看执行日志
  - 说明如何手动触发 Cron job（测试用）
- [ ] **故障排查指南**：
  - Cron job 未执行 → 检查 Vercel 套餐（需要 Pro 套餐）
  - 执行失败 → 检查 CRON_SECRET 是否配置正确
  - 超时 → 优化端点逻辑或增加并发处理

#### 🔄 兼容性（Compatibility）
- [ ] **Vercel 套餐要求**：Vercel Pro 或更高套餐（免费套餐不支持 Cron Jobs）
- [ ] **Schedule 语法**：标准 Cron 表达式（`* * * * *` 格式）
- [ ] **向后兼容**：不破坏现有 `vercel.json` 配置（如果有其他 Cron jobs）

---

## Step 2: Core API Integration (Days 4-6)

### Priority: P0 (Blocking)

---

### Task 2.1: Implement Veo Client Wrapper

**Owner**: Backend Engineer
**Estimated Time**: 4 hours
**Dependencies**: Task 1.3

**Description**: Create a type-safe client wrapper for Google Veo 3.1 API.

**File**: `lib/veo-client.ts`

**Subtasks**:
- [ ] Create `VeoClient` class with methods:
  - `generate(request: VeoGenerateRequest): Promise<VeoOperation>`
  - `getOperation(operationId: string): Promise<VeoOperation>`
- [ ] Implement request/response types
- [ ] Add error handling and custom `VeoAPIError` class
- [ ] Add request timeout (60 seconds)
- [ ] Add retry logic for network errors (3 attempts)

**Unit Tests**:
```typescript
// __tests__/lib/veo-client.test.ts
describe('VeoClient', () => {
  it('should generate video successfully', async () => {
    const client = new VeoClient(process.env.GOOGLE_AI_API_KEY!);
    const operation = await client.generate({
      prompt: 'Test video',
      aspectRatio: '16:9',
      resolution: '720p',
      duration: 4
    });
    expect(operation.name).toMatch(/^operations\//);
  });

  it('should throw VeoAPIError on failure', async () => {
    // Mock failed API response
    await expect(client.generate(invalidRequest)).rejects.toThrow(VeoAPIError);
  });

  it('should get operation status', async () => {
    const operation = await client.getOperation('operations/test-123');
    expect(operation).toHaveProperty('done');
  });
});
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **generate() 方法**：
  - 接收 `VeoGenerateRequest`（prompt, aspectRatio, resolution, duration）
  - 调用 Veo 3.1 API `/v1/models/veo-3.1:generate`
  - 返回 `VeoOperation` 对象，包含 `name`, `done`, `response`/`error`
  - 参数组合测试：12种组合（2宽高比 × 2分辨率 × 3时长）全部通过
- [ ] **getOperation() 方法**：
  - 接收 `operationId`（格式：`operations/xxx`）
  - 调用 Veo 3.1 API `/v1/{operationId}`
  - 返回最新操作状态（`done: true/false`, `response`/`error`）
  - 处理操作不存在场景（404 → VeoAPIError）
- [ ] **类型定义完整性**：
  ```typescript
  interface VeoGenerateRequest {
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p';
    duration: 4 | 6 | 8;
  }

  interface VeoOperation {
    name: string; // operations/xxx
    done: boolean;
    response?: { generatedVideo: { uri: string } };
    error?: { code: number; message: string; };
  }
  ```

#### ⚡ 性能指标（Performance）
- [ ] **超时配置**：所有请求超时设置为 **60 秒**（防止长时间挂起）
- [ ] **重试机制**：
  - 网络错误（ECONNREFUSED, ETIMEDOUT）自动重试 **3 次**
  - 指数退避间隔：1秒 → 2秒 → 4秒
  - 5xx 错误（500, 502, 503）重试，4xx 错误（400, 401, 404）不重试
- [ ] **连接池**：使用 HTTP 连接复用（keep-alive），减少握手开销
- [ ] **性能基准**：
  - 本地 mock API 调用延迟 < 50ms
  - 真实 API 调用（不包括 Veo 处理时间）< 2秒

#### 🔒 安全性（Security）
- [ ] **API Key 保护**：
  - 从环境变量读取 `GOOGLE_AI_API_KEY`
  - 不在日志/错误消息中泄露完整 API Key（仅显示前4位：`AIza****`）
  - API Key 为空时立即抛出 `VeoAPIError`（初始化阶段检查）
- [ ] **输入验证**：
  - Prompt 长度：1-2000字符，超出抛出 `ValidationError`
  - Duration 必须是 4|6|8，其他值抛出错误
  - AspectRatio/Resolution 必须是枚举值
- [ ] **HTTPS 强制**：所有请求强制使用 HTTPS（拒绝 HTTP）

#### 🛡️ 可靠性（Reliability）
- [ ] **错误分类完整**：
  ```typescript
  class VeoAPIError extends Error {
    code: number; // HTTP status code
    apiCode?: string; // Veo API error code
    retryable: boolean; // 是否可重试
    details?: any; // 原始错误详情
  }
  ```
- [ ] **错误码映射**：
  - 400 Bad Request → `INVALID_REQUEST`（不可重试）
  - 401 Unauthorized → `AUTHENTICATION_FAILED`（不可重试）
  - 403 Forbidden → `QUOTA_EXCEEDED` 或 `SAFETY_FILTER`（不可重试）
  - 404 Not Found → `OPERATION_NOT_FOUND`（不可重试）
  - 429 Too Many Requests → `RATE_LIMIT`（可重试，等待60秒）
  - 500/502/503 → `SERVICE_UNAVAILABLE`（可重试）
  - Network Error → `NETWORK_ERROR`（可重试）
- [ ] **边界条件测试**：
  - 空 prompt → ValidationError
  - Prompt 长度 = 1 字符 → 成功
  - Prompt 长度 = 2000 字符 → 成功
  - Prompt 长度 = 2001 字符 → ValidationError
  - 无效 operationId（`invalid-id`）→ VeoAPIError
  - 操作已完成（done: true）→ 返回最终结果，不重新发起

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：每个 API 调用记录
  ```json
  {
    "method": "generate",
    "prompt": "A cat...",
    "duration": 4,
    "apiLatency": 1234,
    "success": true,
    "operationId": "operations/xxx",
    "timestamp": "2025-01-05T..."
  }
  ```
- [ ] **指标上报**：
  - 计数器：`veo_api_requests_total{method="generate|getOperation",status="success|error"}`
  - 直方图：`veo_api_request_duration_seconds`
  - 计量器：`veo_api_errors_total{code="400|401|500|network"}`
- [ ] **错误追踪**：所有 VeoAPIError 自动上报到 Sentry（包含请求参数和响应）
- [ ] **调试模式**：环境变量 `DEBUG=veo:*` 启用详细日志（包含完整请求/响应）

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 90%
- [ ] **核心场景测试**（至少 15 个）：
  1. ✅ 成功生成 4s/16:9/720p 视频
  2. ✅ 成功生成 6s/9:16/1080p 视频
  3. ✅ 成功生成 8s/16:9/1080p 视频
  4. ✅ 成功获取操作状态（done: false）
  5. ✅ 成功获取完成状态（done: true）
  6. ✅ API 401 错误 → VeoAPIError（不重试）
  7. ✅ API 500 错误 → 重试 3 次 → 最终抛出 VeoAPIError
  8. ✅ 网络超时 → 重试 3 次 → 抛出 NETWORK_ERROR
  9. ✅ 空 prompt → ValidationError
  10. ✅ 超长 prompt (2001字符) → ValidationError
  11. ✅ 无效 duration (5) → ValidationError
  12. ✅ API Key 缺失 → 初始化时抛出错误
  13. ✅ 操作 404 → VeoAPIError(OPERATION_NOT_FOUND)
  14. ✅ 速率限制 429 → 等待 60s → 重试
  15. ✅ Safety filter 403 → VeoAPIError(SAFETY_FILTER, 不重试)
- [ ] **Mock API 测试**：使用 `nock` 或 `msw` mock Google AI API 端点
- [ ] **重试逻辑验证**：验证指数退避间隔（1s, 2s, 4s）准确

#### 📖 文档完整性（Documentation）
- [ ] **JSDoc 注释**：所有公开方法包含详细注释
  ```typescript
  /**
   * Generate a video using Google Veo 3.1 API
   * @param request - Video generation request parameters
   * @returns Promise resolving to VeoOperation object
   * @throws {ValidationError} If request parameters are invalid
   * @throws {VeoAPIError} If API call fails
   * @example
   * const operation = await client.generate({
   *   prompt: 'A cat running',
   *   aspectRatio: '16:9',
   *   resolution: '720p',
   *   duration: 4
   * });
   */
  ```
- [ ] **错误码文档**：README 列出所有 VeoAPIError 错误码及处理建议
- [ ] **使用示例**：提供完整的使用示例（初始化、生成、轮询、错误处理）

#### 🔄 兼容性（Compatibility）
- [ ] **Node.js 版本**：支持 Node.js 18+（使用 native fetch）
- [ ] **TypeScript 严格模式**：`strict: true` 无类型错误
- [ ] **零依赖目标**：仅依赖 Node.js 内置模块（fetch, https）
- [ ] **向后兼容**：不破坏现有 API 契约（如果是更新）

---

### Task 2.2: Implement Video Service Layer

**Owner**: Backend Engineer
**Estimated Time**: 6 hours
**Dependencies**: Task 2.1

**Description**: Create service layer for video generation business logic.

**File**: `lib/video-service.ts`

**Subtasks**:
- [ ] `createVideoGeneration(userId, params)` - Validate, deduct credits, call Veo API
- [ ] `getVideoStatus(taskId, userId)` - Retrieve task status
- [ ] `listUserVideos(userId, pagination)` - Get video history
- [ ] `checkConcurrentLimit(userId)` - Validate concurrent tasks
- [ ] `refundVideoGeneration(taskId)` - Refund credits on failure
- [ ] `updateVideoTask(taskId, updates)` - Update task record

**Implementation**:
```typescript
// lib/video-service.ts
export class VideoService {
  private veoClient: VeoClient;
  private creditService: CreditService;

  async createVideoGeneration(userId: string, params: VideoParams) {
    // 1. Validate parameters
    validateVideoParams(params);

    // 2. Check concurrent limit
    await this.checkConcurrentLimit(userId);

    // 3. Calculate credit cost
    const creditCost = getCreditCost(params.duration);

    // 4. Atomic credit deduction + task creation
    const task = await db.transaction(async (tx) => {
      // Deduct credits
      await this.creditService.deductCredits(tx, userId, creditCost, {
        type: `video_${params.duration}s_generation`,
        description: `Generated ${params.duration}s video: ${params.prompt.slice(0, 50)}`
      });

      // Call Veo API
      const operation = await this.veoClient.generate(params);

      // Create task record
      const task = await tx.insert('video_generation_history').values({
        user_id: userId,
        operation_id: operation.name,
        status: 'processing',
        credit_cost: creditCost,
        ...params
      });

      return task;
    });

    return task;
  }

  // ... other methods
}
```

**Unit Tests**:
- Test credit deduction and task creation (atomic)
- Test concurrent limit enforcement
- Test refund logic
- Test error scenarios (insufficient credits, invalid params)

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **createVideoGeneration() 方法**：
  - 接收 `userId`, `VideoParams`（prompt, aspectRatio, resolution, duration）
  - 执行完整流程：参数验证 → 并发检查 → 积分计算 → 原子扣费+任务创建 → 调用 Veo API
  - 返回任务对象，包含 `taskId`, `operationId`, `status`, `creditsDeducted`, `estimatedTime`
  - **事务原子性**：积分扣除与任务创建必须在同一数据库事务中（全成功或全失败）
- [ ] **checkConcurrentLimit() 方法**：
  - 查询用户当前活跃任务数（status IN ('processing', 'downloading')）
  - 如果 ≥ 3，抛出 `ConcurrentLimitError`（HTTP 429）
  - 如果 < 3，允许继续创建
- [ ] **getVideoStatus() 方法**：
  - 接收 `taskId`, `userId`
  - 验证任务归属（userId 匹配，否则 403 Forbidden）
  - 返回任务详情：`status`, `progress`, `videoUrl`, `error`, `createdAt`, `completedAt`
- [ ] **listUserVideos() 方法**：
  - 接收 `userId`, `pagination`（page, limit）
  - 返回分页结果：`videos[]`, `total`, `page`, `hasMore`
  - 排序：按 `created_at DESC`（最新在前）
  - 过滤：仅返回该用户的视频（user_id = userId）
- [ ] **refundVideoGeneration() 方法**：
  - 接收 `taskId`
  - 查询任务记录获取 `userId`, `creditCost`
  - 原子退款：增加积分 + 创建退款交易记录
  - 更新任务状态为 `failed`，记录失败原因
- [ ] **updateVideoTask() 方法**：
  - 接收 `taskId`, `updates`（status, videoUrl, fileSize, error 等）
  - 更新数据库记录
  - 验证状态转换合法性（processing → downloading → completed/failed）

#### ⚡ 性能指标（Performance）
- [ ] **数据库查询优化**：
  - `getVideoStatus` 使用索引查询（taskId 主键）< 5ms
  - `checkConcurrentLimit` 使用复合索引（user_id + status）< 10ms
  - `listUserVideos` 使用索引（user_id + created_at）分页 < 20ms
- [ ] **事务隔离级别**：使用 `READ COMMITTED` 防止幻读
- [ ] **并发控制**：`checkConcurrentLimit` 使用 `FOR UPDATE` 行锁防止竞态条件
- [ ] **批量操作**：如果需要批量更新任务，使用批量 UPDATE（减少数据库往返）

#### 🔒 安全性（Security）
- [ ] **用户隔离**：所有查询必须包含 `user_id` 过滤（防止跨用户访问）
- [ ] **参数验证**：
  - `userId` 格式验证（UUID）
  - `prompt` 长度验证（1-2000字符）
  - `duration` 枚举验证（4|6|8）
  - `pagination.limit` 范围验证（1-100，默认 20）
- [ ] **SQL 注入防护**：使用参数化查询（ORM 自动处理）
- [ ] **积分扣除安全**：
  - 先检查余额是否足够（不允许负数）
  - 事务中再次验证余额（防止并发竞态）
  - 扣除失败时自动回滚整个事务

#### 🛡️ 可靠性（Reliability）
- [ ] **事务完整性测试**（关键场景）：
  1. ✅ 积分扣除成功 + 任务创建成功 → 事务提交
  2. ✅ 积分扣除成功 + 任务创建失败 → 事务回滚（积分未扣）
  3. ✅ 积分扣除失败（余额不足）→ 事务回滚，不创建任务
  4. ✅ Veo API 调用失败 → 事务回滚，积分未扣
  5. ✅ 数据库连接断开 → 事务回滚，返回 500 错误
- [ ] **并发竞态测试**：
  - 模拟 5 个并发请求同时创建视频（用户只有 2 个空位）
  - 预期：2 个成功 + 3 个返回 429 错误
  - 验证：无重复任务创建，积分扣除准确
- [ ] **幂等性考虑**（可选）：
  - 支持客户端传入 `idempotencyKey`
  - 相同 key 的重复请求返回相同结果，不重复扣费
- [ ] **错误恢复**：
  - Veo API 超时 → 返回错误，不创建任务记录
  - 数据库死锁 → 自动重试 3 次（指数退避）
  - 积分服务不可用 → 返回 503 错误，不创建任务

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：每个服务方法调用记录
  ```json
  {
    "method": "createVideoGeneration",
    "userId": "uuid",
    "duration": 4,
    "creditCost": 40,
    "operationId": "operations/xxx",
    "dbLatency": 12,
    "veoLatency": 1234,
    "success": true,
    "timestamp": "2025-01-05T..."
  }
  ```
- [ ] **指标上报**：
  - 计数器：`video_service_calls_total{method="create|status|list|refund",status="success|error"}`
  - 直方图：`video_service_duration_seconds{method}`
  - 计量器：`active_video_tasks_total{userId}` （可选）
- [ ] **事务监控**：记录所有数据库事务的执行时间和结果
  ```json
  {
    "transaction": "createVideoGeneration",
    "duration": 123,
    "operations": ["deductCredits", "insertTask", "callVeoAPI"],
    "success": true
  }
  ```
- [ ] **错误追踪**：所有异常自动上报到 Sentry，包含用户 ID 和请求参数

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **核心场景测试**（至少 20 个）：
  1. ✅ 成功创建 4s 视频（积分足够，无并发限制）
  2. ✅ 成功创建 6s 视频
  3. ✅ 成功创建 8s 视频
  4. ✅ 积分不足（40 积分尝试 4s）→ InsufficientCreditsError
  5. ✅ 并发限制（3 个活跃任务）→ ConcurrentLimitError
  6. ✅ 参数验证失败（duration = 5）→ ValidationError
  7. ✅ Prompt 为空 → ValidationError
  8. ✅ Prompt 超长（2001字符）→ ValidationError
  9. ✅ Veo API 调用失败 → 事务回滚，积分未扣
  10. ✅ 数据库插入失败 → 事务回滚，积分未扣
  11. ✅ 并发竞态：5 个请求同时创建，仅 2 个成功
  12. ✅ getVideoStatus：任务存在且归属正确 → 返回详情
  13. ✅ getVideoStatus：任务不存在 → 404 NotFoundError
  14. ✅ getVideoStatus：任务归属错误（userId 不匹配）→ 403 ForbiddenError
  15. ✅ listUserVideos：返回正确分页结果（总数、是否有更多）
  16. ✅ listUserVideos：空结果（用户无视频）→ 空数组
  17. ✅ refundVideoGeneration：成功退款 + 创建退款记录
  18. ✅ refundVideoGeneration：任务已退款 → 幂等（不重复退款）
  19. ✅ updateVideoTask：状态转换合法（processing → completed）
  20. ✅ updateVideoTask：状态转换非法（completed → processing）→ 拒绝
- [ ] **集成测试**：与真实数据库交互（使用测试数据库）
- [ ] **Mock 测试**：Mock VeoClient 和 CreditService 依赖

#### 📖 文档完整性（Documentation）
- [ ] **JSDoc 注释**：所有公开方法包含详细注释
  ```typescript
  /**
   * Create a new video generation task
   * @param userId - User UUID
   * @param params - Video generation parameters
   * @returns Promise resolving to created task object
   * @throws {InsufficientCreditsError} If user has insufficient credits
   * @throws {ConcurrentLimitError} If user has 3 active tasks
   * @throws {ValidationError} If parameters are invalid
   * @throws {VeoAPIError} If Veo API call fails
   */
  ```
- [ ] **业务规则文档**：README 说明业务逻辑
  - 积分计算公式：10 credits/second
  - 并发限制：3 个活跃任务/用户
  - 退款策略：失败时全额退款
- [ ] **状态机文档**：任务状态转换图（Mermaid）
  ```mermaid
  stateDiagram-v2
    [*] --> processing: createVideoGeneration
    processing --> downloading: Veo API completed
    downloading --> completed: Video uploaded to Supabase
    processing --> failed: Veo API error
    downloading --> failed: Download error
    failed --> [*]
    completed --> [*]
  ```

#### 🔄 兼容性（Compatibility）
- [ ] **数据库兼容性**：支持 PostgreSQL 13+（使用标准 SQL）
- [ ] **ORM 兼容性**：使用 Drizzle ORM 或兼容的 Prisma
- [ ] **事务支持**：确保 ORM 正确处理嵌套事务和回滚
- [ ] **向后兼容**：新增字段使用默认值，不破坏现有 API

---

### Task 2.3: Create Video Generation API Endpoint

**Owner**: Backend Engineer
**Estimated Time**: 4 hours
**Dependencies**: Task 2.2

**Description**: Implement POST /api/generate-video endpoint.

**File**: `app/api/generate-video/route.ts`

**Subtasks**:
- [ ] Implement POST handler
- [ ] Add authentication middleware (Supabase JWT)
- [ ] Validate request body with Zod schema
- [ ] Call `VideoService.createVideoGeneration`
- [ ] Return 202 Accepted with task details
- [ ] Handle errors and return appropriate HTTP status codes

**Implementation**:
```typescript
// app/api/generate-video/route.ts
import { VideoService } from '@/lib/video-service';
import { z } from 'zod';

const RequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().optional(),
  aspectRatio: z.enum(['16:9', '9:16']),
  resolution: z.enum(['720p', '1080p']).default('720p'),
  duration: z.enum([4, 6, 8])
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const params = RequestSchema.parse(body);

    // 3. Create video generation
    const videoService = new VideoService();
    const task = await videoService.createVideoGeneration(user.id, params);

    // 4. Return task details
    return Response.json({
      taskId: task.id,
      operationId: task.operation_id,
      status: 'processing',
      estimatedTime: '30-180 seconds',
      creditsDeducted: task.credit_cost,
      remainingCredits: user.available_credits - task.credit_cost
    }, { status: 202 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        error: 'INVALID_REQUEST',
        message: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof InsufficientCreditsError) {
      return Response.json({
        error: 'INSUFFICIENT_CREDITS',
        message: error.message,
        details: error.details
      }, { status: 402 });
    }

    if (error instanceof ConcurrentLimitError) {
      return Response.json({
        error: 'CONCURRENT_LIMIT_EXCEEDED',
        message: error.message,
        details: error.details
      }, { status: 429 });
    }

    console.error('Video generation error:', error);
    return Response.json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }, { status: 500 });
  }
}
```

**Integration Tests**:
```typescript
describe('POST /api/generate-video', () => {
  it('should create video generation successfully', async () => {
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validToken}` },
      body: JSON.stringify({
        prompt: 'Test video',
        aspectRatio: '16:9',
        duration: 4
      })
    });

    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data).toHaveProperty('taskId');
    expect(data).toHaveProperty('operationId');
  });

  it('should return 402 for insufficient credits', async () => {
    // User with 10 credits tries to generate 4s video (costs 40)
    const response = await fetch(...);
    expect(response.status).toBe(402);
  });

  it('should return 429 for concurrent limit', async () => {
    // User with 3 active tasks tries to create 4th
    const response = await fetch(...);
    expect(response.status).toBe(429);
  });
});
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **成功场景**：有效请求返回 HTTP 202，响应包含 `taskId`, `operationId`, `status`, `estimatedTime`, `creditsDeducted`, `remainingCredits`
- [ ] **参数组合测试**：测试所有有效组合
  - 2种宽高比（16:9, 9:16）× 2种分辨率（720p, 1080p）× 3种时长（4s, 6s, 8s）= 12种组合
- [ ] **积分扣除正确性**：
  - 4秒视频扣除 40 积分
  - 6秒视频扣除 60 积分
  - 8秒视频扣除 80 积分
  - 扣除与数据库记录原子性（同一事务）

#### ⚡ 性能指标（Performance）
- [ ] **响应时间**：P95 < 500ms（不包括Veo API调用，仅本地处理）
- [ ] **并发处理**：支持 100 req/s 无429错误（除真实并发限制场景）
- [ ] **数据库连接**：使用连接池，无连接泄漏
- [ ] **Veo API超时**：Veo客户端调用超时设置为60秒

#### 🔒 安全性（Security）
- [ ] **认证**：
  - 无JWT token → 401 UNAUTHORIZED
  - 过期token → 401 UNAUTHORIZED
  - 无效token → 401 UNAUTHORIZED
- [ ] **授权**：用户只能为自己创建视频（user_id从JWT提取，不从请求体）
- [ ] **输入验证**：
  - Prompt长度：1-2000字符，超出范围 → 400
  - 拒绝SQL注入：`'; DROP TABLE--` → 400（Zod validation）
  - 拒绝XSS payload：`<script>alert()</script>` → 转义或拒绝
  - 特殊字符处理：emoji、中文、换行符正常处理
- [ ] **速率限制**：每用户每分钟最多10个视频生成请求（防滥用）

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理完整性**：所有错误返回结构化JSON
  ```json
  {
    "error": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* contextual info */ }
  }
  ```
- [ ] **错误码覆盖**：
  - 400 INVALID_REQUEST - 参数验证失败，包含 Zod 错误详情
  - 401 UNAUTHORIZED - 未认证
  - 402 INSUFFICIENT_CREDITS - 积分不足，包含 `required`, `available`, `deficit`
  - 429 CONCURRENT_LIMIT_EXCEEDED - 并发超限，包含 `activeTaskCount: 3`, `limit: 3`
  - 503 SERVICE_UNAVAILABLE - 功能被禁用，包含维护消息
  - 500 INTERNAL_ERROR - 意外错误，已记录到日志
- [ ] **边界条件测试**：
  - 积分恰好等于成本（40积分生成4s视频）→ 成功
  - 积分少1（39积分）→ 402错误
  - 2个活跃任务 → 成功
  - 3个活跃任务 → 429错误
- [ ] **事务原子性**：积分扣除失败时不创建任务记录

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：每个请求记录包含
  ```json
  {
    "userId": "uuid",
    "operationId": "operations/xxx",
    "duration": 4,
    "cost": 40,
    "timestamp": "2025-01-05T...",
    "success": true
  }
  ```
- [ ] **指标上报**：
  - 计数器：`video_generation_requests_total{status="success|error",duration="4|6|8"}`
  - 直方图：`video_generation_request_duration_seconds`
  - 计量器：`video_generation_active_tasks_total`
- [ ] **错误追踪**：所有500错误自动上报到错误追踪系统（Sentry/Vercel）
- [ ] **请求追踪**：每个请求生成唯一 `X-Request-ID`，贯穿整个调用链

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **集成测试场景**（至少10个）：
  1. ✅ 成功创建4秒视频
  2. ✅ 成功创建6秒视频
  3. ✅ 成功创建8秒视频
  4. ✅ 积分不足（30积分尝试生成4秒）
  5. ✅ 并发限制（3个活跃任务尝试第4个）
  6. ✅ 参数验证失败（duration=5）
  7. ✅ 未认证用户
  8. ✅ Prompt为空字符串
  9. ✅ Prompt超过2000字符
  10. ✅ Veo API失败（模拟网络错误）
- [ ] **端到端测试**：完整流程（创建→轮询→完成→查询历史）

#### 📖 文档完整性（Documentation）
- [ ] **OpenAPI/Swagger**：schema 完整定义 POST /api/generate-video
- [ ] **错误码文档**：所有错误码含义、原因、解决方案
- [ ] **示例代码**：提供 curl、JavaScript、Python 调用示例

#### 🔄 兼容性（Compatibility）
- [ ] **向后兼容**：不破坏现有 API 契约
- [ ] **数据库事务**：积分扣除与任务创建在同一事务中
- [ ] **幂等性**（可选）：支持 `Idempotency-Key` 头防止重复提交

---

### Task 2.4: Create Video Status API Endpoint

**Owner**: Backend Engineer
**Estimated Time**: 2 hours
**Dependencies**: Task 2.2

**Description**: Implement GET /api/video/status/:taskId endpoint.

**File**: `app/api/video/status/[taskId]/route.ts`

**Implementation**:
```typescript
export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    // 1. Authenticate
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 2. Get task
    const task = await db
      .select()
      .from('video_generation_history')
      .where('id', params.taskId)
      .single();

    // 3. Verify ownership
    if (task.user_id !== user.id) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // 4. Return status
    return Response.json({
      taskId: task.id,
      status: task.status,
      videoUrl: task.permanent_video_url,
      errorMessage: task.error_message,
      createdAt: task.created_at,
      completedAt: task.completed_at
    });

  } catch (error) {
    if (error.name === 'NotFoundError') {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    console.error('Status check error:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **成功场景**：有效请求返回 HTTP 200，响应包含
  ```json
  {
    "taskId": "uuid",
    "status": "processing|downloading|completed|failed",
    "videoUrl": "https://..." (仅completed),
    "errorMessage": "..." (仅failed),
    "prompt": "用户prompt",
    "duration": 4,
    "aspectRatio": "16:9",
    "resolution": "720p",
    "creditCost": 40,
    "fileSize": 12345678 (仅completed),
    "createdAt": "2025-01-05T...",
    "completedAt": "2025-01-05T..." (仅completed/failed)
  }
  ```
- [ ] **任务归属验证**：仅返回当前用户的任务（user_id 匹配）
- [ ] **状态准确性**：返回的状态与数据库记录一致
- [ ] **URL 可访问性**（completed状态）：返回的 videoUrl 可直接访问（公开URL）

#### ⚡ 性能指标（Performance）
- [ ] **响应时间**：P95 < 50ms（单次主键查询）
- [ ] **数据库查询**：使用主键索引（taskId），无全表扫描
- [ ] **缓存策略**（可选）：completed 状态的任务可缓存 1 小时（减少数据库查询）

#### 🔒 安全性（Security）
- [ ] **认证**：
  - 无JWT token → 401 UNAUTHORIZED
  - 过期token → 401 UNAUTHORIZED
  - 无效token → 401 UNAUTHORIZED
- [ ] **授权**：
  - 用户只能查询自己的任务（user_id 从 JWT 提取）
  - 其他用户的 taskId → 403 FORBIDDEN（不泄露任务存在性）
- [ ] **参数验证**：
  - taskId 格式验证（UUID）
  - 非法 taskId → 400 BAD_REQUEST

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理完整性**：
  ```json
  {
    "error": "ERROR_CODE",
    "message": "Human readable message"
  }
  ```
- [ ] **错误码覆盖**：
  - 400 INVALID_REQUEST - taskId 格式错误
  - 401 UNAUTHORIZED - 未认证
  - 403 FORBIDDEN - 非任务所有者
  - 404 NOT_FOUND - 任务不存在
  - 500 INTERNAL_ERROR - 数据库错误
- [ ] **边界条件测试**：
  - 查询刚创建的任务（status = processing）→ 返回正确状态
  - 查询已完成的任务（status = completed）→ 包含 videoUrl
  - 查询失败的任务（status = failed）→ 包含 errorMessage
  - 查询不存在的 taskId → 404
  - 查询其他用户的 taskId → 403

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：每个请求记录
  ```json
  {
    "userId": "uuid",
    "taskId": "uuid",
    "status": "completed",
    "latency": 12,
    "timestamp": "2025-01-05T..."
  }
  ```
- [ ] **指标上报**：
  - 计数器：`video_status_requests_total{status="200|403|404"}`
  - 直方图：`video_status_request_duration_seconds`
- [ ] **错误追踪**：所有 500 错误自动上报到 Sentry

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **集成测试场景**（至少 8 个）：
  1. ✅ 成功查询 processing 状态任务
  2. ✅ 成功查询 downloading 状态任务
  3. ✅ 成功查询 completed 状态任务（包含 videoUrl）
  4. ✅ 成功查询 failed 状态任务（包含 errorMessage）
  5. ✅ 未认证用户 → 401
  6. ✅ 查询不存在的 taskId → 404
  7. ✅ 查询其他用户的 taskId → 403
  8. ✅ 非法 taskId 格式 → 400

#### 📖 文档完整性（Documentation）
- [ ] **OpenAPI/Swagger**：schema 完整定义 GET /api/video/status/:taskId
- [ ] **响应字段说明**：每个字段的含义和出现条件
- [ ] **示例代码**：提供 curl、JavaScript 调用示例

#### 🔄 兼容性（Compatibility）
- [ ] **向后兼容**：不破坏现有响应格式
- [ ] **字段可选性**：新增字段设为可选（optional）

---

### Task 2.5: Create Video History API Endpoint

**Owner**: Backend Engineer
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2

**Description**: Implement GET /api/video/history endpoint with pagination.

**File**: `app/api/video/history/route.ts`

**Implementation**:
```typescript
export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const statusFilter = url.searchParams.get('status') || 'all';

    // Build query
    let query = db
      .select()
      .from('video_generation_history')
      .where('user_id', user.id);

    if (statusFilter !== 'all') {
      query = query.where('status', statusFilter);
    }

    // Get total count
    const total = await query.clone().count();

    // Get paginated results
    const videos = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return Response.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('History error:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **成功场景**：有效请求返回 HTTP 200，响应包含
  ```json
  {
    "videos": [
      {
        "taskId": "uuid",
        "status": "completed",
        "videoUrl": "https://...",
        "prompt": "用户prompt",
        "duration": 4,
        "aspectRatio": "16:9",
        "resolution": "720p",
        "creditCost": 40,
        "fileSize": 12345678,
        "createdAt": "2025-01-05T...",
        "completedAt": "2025-01-05T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
  ```
- [ ] **分页正确性**：
  - `page=1, limit=20` → 返回第 1-20 条记录
  - `page=2, limit=20` → 返回第 21-40 条记录
  - 最后一页：`hasMore=false`, `totalPages` 准确
- [ ] **状态过滤**：
  - `status=all` → 返回所有状态的视频
  - `status=completed` → 仅返回已完成的视频
  - `status=processing` → 仅返回处理中的视频
  - `status=failed` → 仅返回失败的视频
- [ ] **排序**：默认按 `created_at DESC`（最新在前）
- [ ] **用户隔离**：仅返回当前用户的视频（user_id 过滤）

#### ⚡ 性能指标（Performance）
- [ ] **响应时间**：P95 < 100ms（包含分页和过滤）
- [ ] **数据库查询优化**：
  - 使用复合索引（user_id + created_at）
  - 避免 `SELECT COUNT(*)` 全表扫描（使用近似计数或缓存）
  - 使用 `LIMIT` 和 `OFFSET` 分页
- [ ] **大数据集优化**：
  - 用户有 10,000+ 视频时，响应时间仍 < 200ms
  - 支持游标分页（可选，基于 created_at）
- [ ] **缓存策略**（可选）：
  - 首页（page=1）缓存 5 分钟
  - 总数（total）缓存 10 分钟

#### 🔒 安全性（Security）
- [ ] **认证**：
  - 无JWT token → 401 UNAUTHORIZED
  - 过期token → 401 UNAUTHORIZED
  - 无效token → 401 UNAUTHORIZED
- [ ] **授权**：用户只能查询自己的视频历史（user_id 从 JWT 提取）
- [ ] **参数验证**：
  - `page` 必须 ≥ 1，非法值 → 400
  - `limit` 范围：1-100，默认 20，超出范围 → 400
  - `status` 必须是 `all|processing|downloading|completed|failed`，非法值 → 400
- [ ] **防注入**：所有查询参数使用参数化查询（ORM 自动处理）

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理完整性**：
  ```json
  {
    "error": "ERROR_CODE",
    "message": "Human readable message"
  }
  ```
- [ ] **错误码覆盖**：
  - 400 INVALID_REQUEST - 参数验证失败（非法 page/limit/status）
  - 401 UNAUTHORIZED - 未认证
  - 500 INTERNAL_ERROR - 数据库错误
- [ ] **边界条件测试**：
  - 用户无视频 → `videos: []`, `total: 0`, `totalPages: 0`
  - 用户有 1 条视频 → 正确返回
  - `page` 超出范围（如 page=999）→ `videos: []`, 但 metadata 正确
  - `limit=1` → 每页仅 1 条记录，分页正确
  - `limit=100` → 最多返回 100 条记录
  - 所有视频状态均为 `processing` 且过滤 `status=completed` → 空结果

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：每个请求记录
  ```json
  {
    "userId": "uuid",
    "page": 1,
    "limit": 20,
    "statusFilter": "all",
    "resultCount": 20,
    "totalCount": 150,
    "latency": 45,
    "timestamp": "2025-01-05T..."
  }
  ```
- [ ] **指标上报**：
  - 计数器：`video_history_requests_total{status="200|400|500"}`
  - 直方图：`video_history_request_duration_seconds`
  - 计量器：`video_history_result_count{statusFilter}`
- [ ] **慢查询监控**：响应时间 > 200ms 自动记录到慢查询日志

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **集成测试场景**（至少 12 个）：
  1. ✅ 成功返回第 1 页（默认参数）
  2. ✅ 成功返回第 2 页
  3. ✅ 成功返回最后一页（hasMore=false）
  4. ✅ 过滤 `status=completed` → 仅返回已完成视频
  5. ✅ 过滤 `status=processing` → 仅返回处理中视频
  6. ✅ 过滤 `status=failed` → 仅返回失败视频
  7. ✅ 用户无视频 → 空数组 + total=0
  8. ✅ `limit=1` → 每页 1 条记录
  9. ✅ `limit=100` → 最多 100 条记录
  10. ✅ `page=999`（超出范围）→ 空数组但 metadata 正确
  11. ✅ 未认证用户 → 401
  12. ✅ 非法 status 参数 → 400
- [ ] **性能测试**：10,000+ 视频记录的用户，响应时间 < 200ms

#### 📖 文档完整性（Documentation）
- [ ] **OpenAPI/Swagger**：schema 完整定义 GET /api/video/history
- [ ] **查询参数说明**：
  - `page` (integer, min: 1, default: 1)
  - `limit` (integer, range: 1-100, default: 20)
  - `status` (enum: all|processing|downloading|completed|failed, default: all)
- [ ] **响应字段说明**：每个字段的含义
- [ ] **示例代码**：提供 curl、JavaScript 调用示例

#### 🔄 兼容性（Compatibility）
- [ ] **向后兼容**：不破坏现有响应格式
- [ ] **分页标准**：遵循 REST API 分页最佳实践
- [ ] **字段可选性**：新增字段设为可选（optional）

---

## Step 3: Asynchronous Processing (Days 7-9)

### Priority: P1 (High)

---

### Task 3.1: Implement Polling Cron Job

**Owner**: Backend Engineer
**Estimated Time**: 6 hours
**Dependencies**: Task 2.1, Task 2.2, Task 1.4

**Description**: Implement background job to poll Veo API for video status.

**File**: `app/api/cron/poll-video-operations/route.ts`

**Subtasks**:
- [ ] Verify cron secret for authentication
- [ ] Get all `processing` tasks (limit 10 per execution)
- [ ] Poll Veo API for each task
- [ ] Handle completed, failed, and in-progress operations
- [ ] Trigger download for completed videos
- [ ] Update task status in database
- [ ] Log execution metrics

**Implementation**:
```typescript
export async function GET(request: Request) {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const veoClient = new VeoClient(process.env.GOOGLE_AI_API_KEY!);
  const startTime = Date.now();

  try {
    // 2. Get processing tasks (limit to avoid timeout)
    const tasks = await db
      .select()
      .from('video_generation_history')
      .where('status', 'processing')
      .where('created_at', '>', new Date(Date.now() - 15 * 60 * 1000)) // Within 15 min
      .orderBy('created_at', 'asc')
      .limit(10);

    const results = {
      checked: 0,
      completed: 0,
      failed: 0,
      still_processing: 0,
      errors: []
    };

    // 3. Poll each task
    for (const task of tasks) {
      try {
        const operation = await veoClient.getOperation(task.operation_id);
        results.checked++;

        if (operation.done) {
          if (operation.error) {
            // Generation failed
            await handleGenerationFailure(task.id, operation.error);
            results.failed++;
          } else if (operation.response?.generatedVideo) {
            // Generation completed, trigger download
            await handleGenerationSuccess(task.id, operation.response.generatedVideo);
            results.completed++;
          }
        } else {
          // Still processing
          results.still_processing++;
        }

      } catch (error) {
        console.error(`Error polling task ${task.id}:`, error);
        results.errors.push({ taskId: task.id, error: error.message });
      }
    }

    const duration = Date.now() - startTime;

    return Response.json({
      success: true,
      duration_ms: duration,
      ...results
    });

  } catch (error) {
    console.error('Cron execution error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function handleGenerationSuccess(taskId: string, video: any) {
  // Update status to 'downloading'
  await db
    .update('video_generation_history')
    .set({
      status: 'downloading',
      google_video_url: video.uri
    })
    .where('id', taskId);

  // Trigger download (async, don't wait)
  downloadAndStoreVideo(taskId, video.uri).catch(error => {
    console.error(`Download failed for task ${taskId}:`, error);
  });
}

async function handleGenerationFailure(taskId: string, error: any) {
  const task = await db
    .select()
    .from('video_generation_history')
    .where('id', taskId)
    .single();

  // Refund credits
  const videoService = new VideoService();
  await videoService.refundVideoGeneration(taskId);

  // Update task
  await db
    .update('video_generation_history')
    .set({
      status: 'failed',
      error_message: error.message,
      error_code: error.code
    })
    .where('id', taskId);
}
```

**Monitoring**:
- Add logs for each execution
- Track execution duration (<10s target)
- Alert if error rate > 10%

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **执行频率**：Vercel Cron每分钟准点触发（`*/1 * * * *`）
- [ ] **任务选择**：每次执行最多轮询10个 `status=processing` 的任务，按创建时间升序
- [ ] **状态处理完整性**：
  - `operation.done = false` → 保持 `processing` 状态
  - `operation.done = true && operation.response` → 触发下载流程，更新为 `downloading`
  - `operation.done = true && operation.error` → 标记为 `failed`，触发退款
- [ ] **超时检测**：标记超过15分钟的任务为 `failed`，触发退款
- [ ] **退款逻辑**：失败任务全额退款，创建 `refund_video_generation` 交易记录

#### ⚡ 性能指标（Performance）
- [ ] **执行时间**：单次执行完成时间 P95 < 10秒（轮询10个任务）
- [ ] **并发安全**：多个cron实例同时运行不产生数据竞争（使用行锁或分布式锁）
- [ ] **Veo API调用**：每个任务轮询 < 500ms（网络延迟）

#### 🔒 安全性（Security）
- [ ] **认证**：
  - 验证 `Authorization: Bearer ${CRON_SECRET}`
  - 无效secret → 401 UNAUTHORIZED
- [ ] **授权隔离**：仅能访问数据库中的任务，无其他权限

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理**：
  - 单个任务轮询失败不影响其他任务
  - 网络超时（Veo API不响应）→ 记录错误，下次继续尝试
  - 数据库错误 → 记录日志，返回500但不中断cron
- [ ] **幂等性**：多次执行相同任务不产生副作用（状态已是 completed/failed 则跳过）
- [ ] **重试机制**：Veo API调用失败自动重试（最多3次，指数退避）
- [ ] **死锁预防**：数据库操作使用 `FOR UPDATE SKIP LOCKED` 避免多实例冲突

#### 📊 可观测性（Observability）
- [ ] **执行日志**：每次执行记录摘要
  ```json
  {
    "timestamp": "2025-01-05T...",
    "duration_ms": 3420,
    "checked": 10,
    "completed": 3,
    "failed": 1,
    "still_processing": 6,
    "errors": []
  }
  ```
- [ ] **指标上报**：
  - 计数器：`cron_executions_total{status="success|error"}`
  - 直方图：`cron_execution_duration_seconds`
  - 计量器：`cron_tasks_processed_total{result="completed|failed|processing"}`
- [ ] **告警触发**：
  - 执行时间超过10秒 → 警告
  - 错误率 > 10% → 严重告警
  - 连续3次执行失败 → 紧急告警
- [ ] **Vercel Dashboard**：Cron执行历史可查询（最近100次）

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **集成测试场景**（至少6个）：
  1. ✅ 成功轮询10个任务，3个完成、2个失败、5个仍在处理
  2. ✅ 轮询发现已完成任务，触发下载
  3. ✅ 轮询发现失败任务，触发退款
  4. ✅ 检测超时任务（16分钟前创建），标记失败并退款
  5. ✅ Veo API临时不可用，记录错误但不崩溃
  6. ✅ 无 `processing` 任务时，返回空结果

#### 📖 文档完整性（Documentation）
- [ ] **Cron配置文档**：`vercel.json` 配置说明
- [ ] **监控指南**：如何在 Vercel Dashboard 查看执行历史
- [ ] **故障排查**：常见问题和解决方案（如cron未触发、执行超时）

#### 🔄 兼容性（Compatibility）
- [ ] **Vercel平台兼容**：在 Vercel Pro 计划下正常运行
- [ ] **时区处理**：UTC时间统一，避免夏令时问题

---

### Task 3.2: Implement Video Download Service

**Owner**: Backend Engineer
**Estimated Time**: 5 hours
**Dependencies**: Task 3.1

**Description**: Implement automatic video download and upload to Supabase Storage.

**File**: `lib/video-download-service.ts`

**Subtasks**:
- [ ] Download video from Google URL (60s timeout)
- [ ] Verify file integrity (valid MP4, reasonable size)
- [ ] Upload to Supabase Storage (`{userId}/videos/{operationId}.mp4`)
- [ ] Generate permanent public URL
- [ ] Update database with permanent URL and file size
- [ ] Implement retry logic (3 attempts with exponential backoff)

**Implementation**:
```typescript
export class VideoDownloadService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // ms
  private readonly DOWNLOAD_TIMEOUT = 60000; // 60 seconds

  async downloadAndStore(taskId: string, googleUrl: string): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // 1. Download from Google
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DOWNLOAD_TIMEOUT);

        const response = await fetch(googleUrl, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const videoBuffer = await response.arrayBuffer();

        // 2. Verify file integrity
        if (videoBuffer.byteLength < 1000) {
          throw new Error('Downloaded file too small, likely corrupted');
        }

        if (videoBuffer.byteLength > 100 * 1024 * 1024) { // 100 MB limit
          throw new Error('File too large');
        }

        // 3. Get task details
        const task = await db
          .select()
          .from('video_generation_history')
          .where('id', taskId)
          .single();

        // 4. Upload to Supabase Storage
        const fileName = `${task.operation_id}.mp4`;
        const filePath = `${task.user_id}/videos/${fileName}`;

        const { data, error } = await supabase.storage
          .from('video-generations')
          .upload(filePath, videoBuffer, {
            contentType: 'video/mp4',
            cacheControl: '31536000', // 1 year
            upsert: false
          });

        if (error) throw error;

        // 5. Get permanent public URL
        const { data: { publicUrl } } = supabase.storage
          .from('video-generations')
          .getPublicUrl(filePath);

        // 6. Update database
        await db
          .update('video_generation_history')
          .set({
            status: 'completed',
            permanent_video_url: publicUrl,
            file_size_bytes: videoBuffer.byteLength,
            downloaded_at: new Date(),
            completed_at: new Date()
          })
          .where('id', taskId);

        console.log(`Video ${taskId} downloaded and stored successfully`);
        return publicUrl;

      } catch (error) {
        console.error(`Download attempt ${attempt + 1} failed for task ${taskId}:`, error);

        if (attempt < this.MAX_RETRIES - 1) {
          // Retry with delay
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAYS[attempt]));
        } else {
          // All retries failed, refund user
          await this.handleDownloadFailure(taskId, error);
          throw error;
        }
      }
    }

    throw new Error('Download failed after all retries');
  }

  private async handleDownloadFailure(taskId: string, error: any) {
    // Refund credits
    const videoService = new VideoService();
    await videoService.refundVideoGeneration(taskId);

    // Update task
    await db
      .update('video_generation_history')
      .set({
        status: 'failed',
        error_message: `Download failed: ${error.message}`,
        error_code: 'DOWNLOAD_FAILED'
      })
      .where('id', taskId);

    // Alert admin
    console.error(`ALERT: Video download failed permanently for task ${taskId}`);
  }
}
```

**Unit Tests**:
- Test successful download and upload
- Test retry logic (network errors)
- Test file integrity checks
- Test refund on failure

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **下载成功**：从Google URL下载完整视频文件（MP4格式）
- [ ] **上传成功**：上传到Supabase Storage，路径：`{user_id}/videos/{operation_id}.mp4`
- [ ] **文件完整性**：
  - 验证文件大小 > 1KB（排除空文件/错误页面）
  - 验证文件大小 < 100MB（防止异常大文件）
  - 验证MP4魔数头（`0x00 0x00 0x00 XX 66 74 79 70`）
- [ ] **元数据更新**：
  - `permanent_video_url` 设置为Supabase公开URL
  - `file_size_bytes` 准确记录文件大小
  - `downloaded_at` 记录下载完成时间
  - `completed_at` 记录任务完成时间
  - `status` 更新为 `completed`

#### ⚡ 性能指标（Performance）
- [ ] **下载速度**：10MB文件下载时间 < 10秒（平均网速1MB/s）
- [ ] **超时设置**：
  - 下载超时：60秒
  - 上传超时：30秒
- [ ] **并发处理**：支持同时下载10个视频无资源耗尽

#### 🔒 安全性（Security）
- [ ] **URL验证**：仅接受 `*.googleapis.com` 域名的视频URL
- [ ] **文件类型验证**：拒绝非MP4文件（MIME类型检查）
- [ ] **路径隔离**：用户只能上传到自己的目录（`{user_id}/videos/*`）

#### 🛡️ 可靠性（Reliability）
- [ ] **重试机制**：
  - 网络错误 → 重试3次，延迟：1秒、2秒、4秒（指数退避）
  - HTTP 5xx → 重试3次
  - HTTP 4xx → 不重试，立即失败
- [ ] **错误处理**：
  - 下载失败 → 标记任务为 `failed`，触发退款
  - 上传失败 → 重试后仍失败，触发退款
  - 文件损坏 → 触发退款，记录错误码 `FILE_CORRUPTED`
- [ ] **退款逻辑**：永久失败后全额退款，创建 `refund_video_generation` 交易
- [ ] **告警机制**：连续3次下载失败 → 告警管理员

#### 📊 可观测性（Observability）
- [ ] **下载日志**：每次下载记录详细信息
  ```json
  {
    "taskId": "uuid",
    "operationId": "operations/xxx",
    "googleUrl": "https://...",
    "fileSizeBytes": 5242880,
    "downloadDurationMs": 3200,
    "uploadDurationMs": 1100,
    "retryCount": 0,
    "success": true
  }
  ```
- [ ] **指标上报**：
  - 计数器：`video_downloads_total{status="success|failure",retry="0|1|2|3"}`
  - 直方图：`video_download_duration_seconds`
  - 直方图：`video_file_size_bytes`
- [ ] **错误追踪**：所有下载失败自动上报错误追踪系统

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **集成测试场景**（至少8个）：
  1. ✅ 成功下载10MB视频并上传
  2. ✅ 网络错误重试3次后成功
  3. ✅ 网络错误重试3次全失败，触发退款
  4. ✅ 下载超时（61秒），触发重试
  5. ✅ 文件太小（< 1KB），标记为损坏
  6. ✅ 文件太大（> 100MB），拒绝上传
  7. ✅ Supabase Storage配额满，触发退款
  8. ✅ MP4文件头验证失败，标记为损坏

#### 📖 文档完整性（Documentation）
- [ ] **错误码文档**：所有下载错误码及解决方案
- [ ] **重试策略**：指数退避算法说明
- [ ] **监控指南**：如何监控下载成功率

#### 🔄 兼容性（Compatibility）
- [ ] **Google临时存储**：在2天过期前完成下载
- [ ] **Supabase Storage**：兼容当前存储API版本
- [ ] **文件格式**：支持 Google Veo 生成的所有MP4变体

---

### Task 3.3: Implement Timeout Handling

**Owner**: Backend Engineer
**Estimated Time**: 2 hours
**Dependencies**: Task 3.1

**Description**: Add timeout detection and handling for long-running generations.

**Subtasks**:
- [ ] Add timeout check in cron job (15 minutes)
- [ ] Mark timed-out tasks as failed
- [ ] Refund credits for timed-out tasks
- [ ] Log timeout events for monitoring

**Implementation**:
```typescript
// In cron job
const TIMEOUT_MINUTES = 15;

const timedOutTasks = await db
  .select()
  .from('video_generation_history')
  .where('status', 'processing')
  .where('created_at', '<', new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000));

for (const task of timedOutTasks) {
  console.warn(`Task ${task.id} timed out after ${TIMEOUT_MINUTES} minutes`);

  // Refund credits
  await videoService.refundVideoGeneration(task.id);

  // Update status
  await db
    .update('video_generation_history')
    .set({
      status: 'failed',
      error_message: `Generation timed out after ${TIMEOUT_MINUTES} minutes`,
      error_code: 'TIMEOUT'
    })
    .where('id', task.id);
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **超时检测精确性**：
  - 检测所有 `status='processing'` 且 `created_at < (now - 15分钟)` 的任务
  - 时间计算误差 ≤ 1 秒（避免浮点精度问题）
  - 不误检未超时任务（14分59秒的任务不被标记）
- [ ] **状态更新完整性**：
  - 将任务状态从 `processing` 更新为 `failed`
  - 设置 `error_code = 'TIMEOUT'`
  - 设置 `error_message = 'Generation timed out after 15 minutes'`
  - 记录 `completed_at` 时间戳
- [ ] **积分退款准确性**：
  - 退款金额 = 原始扣费金额（40/60/80 credits）
  - 创建 `credit_transactions` 记录：
    - `transaction_type = 'refund_video_generation'`
    - `amount = 原始credit_cost`（正数）
    - `reference_id = task.id`
  - 用户积分余额增加准确（无舍入误差）

#### ⚡ 性能指标（Performance）
- [ ] **批量检测性能**：
  - 查询超时任务：P95 < 100ms（使用 `created_at` 索引）
  - 单次Cron执行处理 ≤ 100 个超时任务（防止长时间阻塞）
- [ ] **并发处理优化**：
  - 使用数据库事务批量更新（非逐条更新）
  - 退款操作异步化（可选，避免阻塞主流程）

#### 🔒 安全性（Security）
- [ ] **防重复退款**：
  - 退款前检查任务状态（仅 `processing` 任务可退款）
  - 使用数据库事务确保原子性（status更新 + 退款同时成功/失败）
  - 退款记录包含幂等性校验（避免同一任务多次退款）

#### 🛡️ 可靠性（Reliability）
- [ ] **事务完整性测试**（关键场景）：
  1. ✅ 超时检测成功 + 状态更新成功 + 退款成功 → 全部提交
  2. ✅ 超时检测成功 + 状态更新失败 → 事务回滚，不退款
  3. ✅ 超时检测成功 + 退款失败 → 事务回滚，状态不变
  4. ✅ 并发场景：两个Cron实例同时检测到同一超时任务 → 仅一个成功处理
- [ ] **退款失败重试**（可选）：
  - 如退款服务暂时不可用，记录到重试队列
  - 最多重试 3 次，指数退避（1秒 → 2秒 → 4秒）
- [ ] **边界情况处理**：
  - 用户账户已删除 → 跳过退款，仅更新任务状态
  - 任务已被手动标记为 `failed` → 不重复处理

#### 📊 可观测性（Observability）
- [ ] **结构化日志**：
  ```json
  {
    "level": "warn",
    "event": "video_generation_timeout",
    "task_id": "uuid",
    "user_id": "uuid",
    "duration_minutes": 15.2,
    "credit_refunded": 40,
    "timestamp": "2025-01-05T12:34:56Z"
  }
  ```
- [ ] **超时率监控指标**：
  - `video_timeout_count`（超时任务总数）
  - `video_timeout_rate`（超时率 = 超时数 / 总创建数）
  - 按时长分组统计（4s/6s/8s超时率）
- [ ] **告警规则**：
  - 超时率 > 5% → 发送警告
  - 超时率 > 15% → 发送紧急告警（可能API服务异常）
  - 连续 10 个任务超时 → 立即告警

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **单元测试覆盖率** ≥ 85%
- [ ] **核心场景测试**（至少 8 个）：
  1. ✅ 任务运行 15 分钟整 → 被检测并标记为超时
  2. ✅ 任务运行 14 分 59 秒 → 不被标记为超时
  3. ✅ 任务运行 20 分钟 → 被检测并标记为超时
  4. ✅ 超时任务成功退款 40 credits（4s视频）
  5. ✅ 超时任务成功退款 60 credits（6s视频）
  6. ✅ 超时任务成功退款 80 credits（8s视频）
  7. ✅ 退款失败 → 事务回滚，任务状态保持 `processing`
  8. ✅ 用户账户已删除 → 跳过退款，任务仍标记为 `failed`
  9. ✅ 并发超时检测 → 仅一个Cron实例成功处理同一任务
  10. ✅ 批量超时检测（50个任务）→ 全部正确处理

#### 📖 文档完整性（Documentation）
- [ ] **代码注释**：
  - 超时阈值常量说明（为什么是15分钟）
  - 退款逻辑注释（包含事务边界说明）
  - 边界情况处理说明
- [ ] **超时策略文档**：
  - README 或 Wiki 中记录超时策略（15分钟）
  - 说明用户可见的超时错误消息
  - 记录超时率正常范围（< 5%）

#### 🔄 兼容性（Compatibility）
- [ ] **配置灵活性**：
  - 超时阈值可通过 `system_configs` 表配置（不硬编码）
  - 默认值 15 分钟，可调整为 10-30 分钟范围
- [ ] **向后兼容**：
  - 既有 `processing` 任务正确处理
  - 不影响 `completed` 或 `failed` 任务

---

## Step 4: Frontend Integration (Days 10-12)

### Priority: P2 (Medium)

---

### Task 4.1: Create Video Generation Form Component

**Owner**: Frontend Engineer
**Estimated Time**: 5 hours
**Dependencies**: Task 2.3

**Description**: Build user interface for video generation.

**File**: `components/video-generation-form.tsx`

**Subtasks**:
- [ ] Text area for prompt (max 1024 tokens, ~2000 characters)
- [ ] Text area for negative prompt (optional)
- [ ] Dropdown for aspect ratio (16:9, 9:16)
- [ ] Dropdown for resolution (720p, 1080p)
- [ ] Radio buttons for duration (4s, 6s, 8s)
- [ ] Display credit cost (40, 60, 80)
- [ ] Display user's available credits
- [ ] Submit button with loading state
- [ ] Display error messages

**Implementation**:
```typescript
'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';

export function VideoGenerationForm() {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    negativePrompt: '',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 4
  });

  const creditCost = formData.duration * 10; // 10 credits/second

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();

      // Redirect to status page
      window.location.href = `/video/status/${result.taskId}`;

    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>{t('video.prompt')}</label>
        <textarea
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          maxLength={2000}
          rows={4}
          required
        />
        <p className="text-sm text-gray-500">
          {formData.prompt.length} / 2000 characters
        </p>
      </div>

      <div>
        <label>{t('video.aspectRatio')}</label>
        <select
          value={formData.aspectRatio}
          onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
        >
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
        </select>
      </div>

      <div>
        <label>{t('video.duration')}</label>
        <div className="flex gap-4">
          {[4, 6, 8].map(duration => (
            <label key={duration} className="flex items-center">
              <input
                type="radio"
                value={duration}
                checked={formData.duration === duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
              <span>{duration}s ({duration * 10} credits)</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span>Credit Cost: {creditCost} credits</span>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Generating...' : 'Generate Video'}
        </button>
      </div>
    </form>
  );
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **表单字段完整性**：
  - Prompt输入框：
    - 支持多行文本（textarea）
    - 最大长度 2000 字符，实时显示剩余字符数
    - 必填验证（空提交显示错误提示）
  - Negative Prompt输入框（可选）：
    - 默认为空
    - 最大长度 1000 字符
  - Aspect Ratio下拉菜单：
    - 选项：16:9 (Landscape), 9:16 (Portrait)
    - 默认选中 16:9
  - Resolution下拉菜单：
    - 选项：720p, 1080p
    - 默认选中 720p
  - Duration单选按钮：
    - 选项：4s (40 credits), 6s (60 credits), 8s (80 credits)
    - 默认选中 4s
- [ ] **积分成本计算**：
  - 公式：`creditCost = duration × 10`
  - 动态更新（切换duration时立即刷新显示）
  - 数值准确无误（4s→40, 6s→60, 8s→80）
- [ ] **用户积分显示**：
  - 从API获取用户当前积分余额
  - 显示位置：表单顶部或按钮旁边
  - 余额不足时显示警告提示（如："余额不足，需要 40 credits，当前仅有 30 credits"）
- [ ] **提交流程**：
  - 点击"Generate Video"按钮触发表单提交
  - 提交前验证所有必填字段
  - 验证通过：调用 `/api/generate-video` POST 请求
  - 成功响应（200）：重定向到 `/video/status/{taskId}`
  - 失败响应（402/429/400）：显示错误消息，不重定向

#### ⚡ 性能指标（Performance）
- [ ] **首次渲染时间**：组件首次渲染 < 100ms（测量 FCP, First Contentful Paint）
- [ ] **交互响应性**：
  - 输入框输入延迟 < 16ms（60fps）
  - 下拉菜单切换延迟 < 50ms
  - 积分成本计算更新 < 10ms
- [ ] **API请求性能**：
  - 获取用户积分：P95 < 200ms
  - 提交视频生成请求：P95 < 500ms（不含Veo API调用时间）

#### 🔒 安全性（Security）
- [ ] **输入验证**：
  - Prompt最大长度 2000 字符（前端验证 + 后端验证）
  - 防止XSS攻击（使用React自动转义，不使用`dangerouslySetInnerHTML`）
  - 防止CSRF攻击（使用Next.js内置CSRF保护）
- [ ] **敏感数据保护**：
  - API请求包含认证令牌（JWT）
  - 不在前端存储敏感凭证

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理场景**：
  1. ✅ 用户积分不足（402）→ 显示错误："积分不足，请充值"
  2. ✅ 并发限制（429）→ 显示错误："已有3个视频正在生成，请稍后再试"
  3. ✅ 参数无效（400）→ 显示错误："参数错误：{具体错误信息}"
  4. ✅ 网络错误（fetch失败）→ 显示错误："网络连接失败，请重试"
  5. ✅ 服务器错误（500）→ 显示错误："服务器错误，请稍后再试"
- [ ] **加载状态管理**：
  - 提交中：按钮显示"Generating..."，禁用所有表单字段
  - 提交失败：恢复表单可编辑状态，保留用户输入内容

#### 📊 可观测性（Observability）
- [ ] **用户行为跟踪**（可选，隐私友好）：
  - 表单提交事件：记录duration和aspectRatio组合
  - 错误事件：记录错误类型和频率
  - 使用Vercel Analytics或Sentry跟踪

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **组件测试覆盖率** ≥ 85%
- [ ] **核心场景测试**（React Testing Library / Playwright）：
  1. ✅ 组件渲染：所有字段正确显示
  2. ✅ 输入验证：空prompt提交显示错误
  3. ✅ 积分计算：切换duration，creditCost正确更新（4s→40, 6s→60, 8s→80）
  4. ✅ 成功提交：填写valid表单，提交后重定向到status页面
  5. ✅ 错误处理：API返回402，显示"积分不足"错误
  6. ✅ 加载状态：提交中按钮显示"Generating..."并禁用
  7. ✅ 响应式设计：在320px宽度屏幕上表单正常显示（移动端）
  8. ✅ 无障碍性：键盘导航（Tab键）可访问所有字段

#### 📖 文档完整性（Documentation）
- [ ] **组件文档**：
  - JSDoc注释说明组件用途和Props
  - README中添加使用示例
  - 截图展示表单UI（桌面端 + 移动端）
- [ ] **错误消息文档**：
  - 列出所有可能的错误消息及其触发条件
  - 提供用户友好的错误解决指引

#### 🔄 兼容性（Compatibility）
- [ ] **浏览器兼容性**：
  - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - iOS Safari 14+, Android Chrome 90+
- [ ] **响应式设计**：
  - 移动端（320px - 767px）：单列布局，按钮全宽
  - 平板（768px - 1023px）：两列布局
  - 桌面（1024px+）：三列布局（prompt占2列）
- [ ] **无障碍性（Accessibility）**：
  - WCAG 2.1 AA标准：
    - 所有表单字段有`<label>`关联
    - 错误消息使用`aria-live="polite"`
    - 按钮有清晰的`aria-label`
    - 颜色对比度 ≥ 4.5:1
  - 键盘可访问性：Tab键导航顺序合理
  - 屏幕阅读器友好：使用语义化HTML（`<form>`, `<label>`, `<button>`）
- [ ] **国际化（i18n）**：
  - 所有文本使用`t()`函数（from `useLanguage`）
  - 支持中文和英文切换
  - 错误消息同时支持双语

---

### Task 4.2: Create Video Status Page

**Owner**: Frontend Engineer
**Estimated Time**: 4 hours
**Dependencies**: Task 2.4

**Description**: Build status tracking page for video generation.

**File**: `app/video/status/[taskId]/page.tsx`

**Subtasks**:
- [ ] Fetch task status on page load
- [ ] Display current status (processing, downloading, completed, failed)
- [ ] Show progress indicator or estimated time
- [ ] Display error message if failed
- [ ] Show video player when completed
- [ ] Allow download of video file
- [ ] Auto-refresh status every 10 seconds

**Implementation**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function VideoStatusPage() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch(`/api/video/status/${taskId}`);
        const data = await response.json();
        setTask(data);
        setIsLoading(false);

        // Auto-refresh if still processing
        if (data.status === 'processing' || data.status === 'downloading') {
          setTimeout(fetchStatus, 10000); // Poll every 10 seconds
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, [taskId]);

  if (isLoading) return <div>Loading...</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div>
      <h1>Video Generation Status</h1>

      <div className="status-card">
        <StatusIndicator status={task.status} />
        <p>Status: {task.status}</p>

        {task.status === 'processing' && (
          <p>Your video is being generated. This may take 30 seconds to 3 minutes.</p>
        )}

        {task.status === 'downloading' && (
          <p>Video generated! Downloading to permanent storage...</p>
        )}

        {task.status === 'completed' && (
          <div>
            <p>Video ready!</p>
            <video src={task.videoUrl} controls className="w-full" />
            <a href={task.videoUrl} download>Download Video</a>
          </div>
        )}

        {task.status === 'failed' && (
          <div className="error">
            <p>Generation failed: {task.errorMessage}</p>
            <p>Your credits have been refunded.</p>
            <a href="/video/generate">Try Again</a>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **状态显示完整性**：
  - `processing` 状态：
    - 显示进度指示器（spinner或进度条）
    - 显示预估时间："预计30秒 - 3分钟"
    - 显示生成参数（prompt前50字、duration、resolution）
  - `downloading` 状态：
    - 显示"视频已生成，正在保存..."
    - 显示下载进度（如有）
  - `completed` 状态：
    - 显示视频播放器（`<video>` 元素）
    - 显示"下载视频"按钮
    - 显示视频元数据（文件大小、生成时间、参数）
  - `failed` 状态：
    - 显示错误消息（从`task.errorMessage`）
    - 显示"积分已退还"提示
    - 显示"重新生成"按钮（链接到生成表单）
- [ ] **自动刷新逻辑**：
  - 仅在 `processing` 或 `downloading` 状态时启动轮询
  - 轮询间隔：10 秒
  - `completed` 或 `failed` 状态时停止轮询
  - 页面卸载时清理定时器（`clearTimeout`）
- [ ] **视频播放功能**：
  - `<video>` 元素包含 `controls` 属性
  - 视频源URL有效（从`task.videoUrl`）
  - 支持暂停、播放、全屏、音量控制
  - 视频加载失败时显示错误提示

#### ⚡ 性能指标（Performance）
- [ ] **页面加载性能**：
  - 首次渲染时间 < 200ms（FCP）
  - 首次状态API请求：P95 < 300ms
- [ ] **轮询优化**：
  - 使用`setTimeout`而非`setInterval`（避免请求堆积）
  - 请求失败时自动延长轮询间隔（10s → 20s → 30s）
- [ ] **视频加载优化**：
  - 视频预加载策略：`preload="metadata"`（仅加载元数据）
  - 大文件（> 50MB）显示加载进度条

#### 🔒 安全性（Security）
- [ ] **任务访问权限**：
  - 仅任务所有者可访问（通过JWT验证）
  - 其他用户访问返回403 Forbidden（不泄露任务存在性）
- [ ] **视频URL安全**：
  - 使用Supabase公开URL（已签名，防篡改）
  - 视频播放器使用`sandbox`属性（防止恶意脚本）

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理场景**：
  1. ✅ 任务不存在（404）→ 显示"任务不存在，请检查链接"
  2. ✅ 无权限访问（403）→ 显示"无权访问此任务"
  3. ✅ 网络错误（fetch失败）→ 显示"网络错误，正在重试..."，5秒后自动重试
  4. ✅ API超时（> 10s）→ 显示"请求超时，正在重试..."
  5. ✅ 视频加载失败 → 显示"视频加载失败，请刷新页面"
- [ ] **轮询稳定性**：
  - 连续3次请求失败 → 停止轮询，显示错误提示
  - 网络恢复后自动恢复轮询（使用`navigator.onLine`检测）
- [ ] **页面生命周期管理**：
  - 页面失焦（tab切换）时暂停轮询（可选，节省资源）
  - 页面重新聚焦时恢复轮询

#### 📊 可观测性（Observability）
- [ ] **用户行为跟踪**（可选）：
  - 页面访问事件：记录taskId和初始状态
  - 状态变化事件：记录状态转换（processing → completed）
  - 视频播放事件：记录播放次数和时长
- [ ] **错误日志**：
  - API请求失败：记录taskId、错误类型、重试次数
  - 视频加载失败：记录videoUrl和错误消息

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **组件测试覆盖率** ≥ 85%
- [ ] **核心场景测试**（React Testing Library / Playwright）：
  1. ✅ 加载中状态：页面初始渲染显示"Loading..."
  2. ✅ Processing状态：显示进度指示器和预估时间
  3. ✅ Downloading状态：显示"正在保存..."提示
  4. ✅ Completed状态：显示视频播放器和下载按钮
  5. ✅ Failed状态：显示错误消息、退款提示、重新生成按钮
  6. ✅ 自动刷新：processing状态下，10秒后自动发起第二次请求
  7. ✅ 停止轮询：completed状态下，不再发起新请求
  8. ✅ 任务不存在：显示"任务不存在"错误
  9. ✅ 网络错误：显示"网络错误"并自动重试
  10. ✅ 视频播放：点击播放按钮，视频正常播放

#### 📖 文档完整性（Documentation）
- [ ] **组件文档**：
  - JSDoc注释说明组件用途和Props
  - 状态流转图（Mermaid）：
    ```mermaid
    stateDiagram-v2
      [*] --> loading: 页面加载
      loading --> processing: API返回processing
      loading --> downloading: API返回downloading
      loading --> completed: API返回completed
      loading --> failed: API返回failed
      processing --> downloading: 轮询检测状态变化
      downloading --> completed: 轮询检测状态变化
      processing --> failed: 超时或错误
      completed --> [*]
      failed --> [*]
    ```
- [ ] **用户提示文案**：
  - 列出所有状态的用户可见提示文案
  - 提供双语版本（中文 + 英文）

#### 🔄 兼容性（Compatibility）
- [ ] **浏览器兼容性**：
  - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - iOS Safari 14+, Android Chrome 90+
  - 视频播放器兼容性：支持MP4格式（H.264编码）
- [ ] **响应式设计**：
  - 移动端（320px - 767px）：视频播放器全宽，按钮居中
  - 平板（768px - 1023px）：视频播放器最大宽度 768px
  - 桌面（1024px+）：视频播放器最大宽度 1024px，居中显示
- [ ] **无障碍性（Accessibility）**：
  - 视频播放器有清晰的`aria-label`："Video player"
  - 按钮有语义化文本（避免"点击这里"）
  - 状态变化通过`aria-live="polite"`通知屏幕阅读器
  - 键盘可访问性：Tab键可聚焦所有交互元素
- [ ] **国际化（i18n）**：
  - 所有文本使用`t()`函数
  - 时间显示根据语言格式化（中文：2025年1月5日；英文：Jan 5, 2025）
  - 错误消息同时支持双语

---

### Task 4.3: Create Video History Page

**Owner**: Frontend Engineer
**Estimated Time**: 4 hours
**Dependencies**: Task 2.5

**Description**: Build page to display user's video generation history.

**File**: `app/video/history/page.tsx`

**Subtasks**:
- [ ] Fetch paginated video list
- [ ] Display video cards with thumbnails (or placeholder)
- [ ] Show status, prompt, duration, created date
- [ ] Filter by status (all, completed, failed, processing)
- [ ] Pagination controls
- [ ] Link to status page for each video

**Implementation**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { VideoCard } from '@/components/video-card';

export default function VideoHistoryPage() {
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      const response = await fetch(
        `/api/video/history?page=${pagination.page}&limit=${pagination.limit}&status=${statusFilter}`
      );
      const data = await response.json();
      setVideos(data.videos);
      setPagination(data.pagination);
      setIsLoading(false);
    }

    fetchHistory();
  }, [pagination.page, statusFilter]);

  return (
    <div>
      <h1>Your Video History</h1>

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videos.map(video => (
              <VideoCard key={video.taskId} video={video} />
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **视频列表显示**：
  - 每个视频卡片包含：
    - 缩略图（completed状态显示第一帧，其他状态显示占位图）
    - Prompt前50字（超出显示"..."）
    - 状态标签（processing/downloading/completed/failed）
    - Duration（4s/6s/8s）
    - Resolution（720p/1080p）
    - 创建时间（相对时间："2小时前"或绝对时间："2025-01-05 14:30"）
    - 积分成本（40/60/80 credits）
  - 点击卡片：跳转到 `/video/status/{taskId}`
- [ ] **状态过滤功能**：
  - 下拉菜单选项：All, Completed, Processing, Failed
  - 切换过滤器时：
    - 重置到第1页
    - 刷新视频列表
    - 更新URL参数（如：`?status=completed`）
  - 默认选中："All"
- [ ] **分页功能**：
  - 每页显示20个视频（可配置）
  - 分页控件包含：
    - "上一页"按钮（第1页时禁用）
    - 当前页码和总页数（"第 2 页，共 5 页"）
    - "下一页"按钮（最后一页时禁用）
  - 切换页码时：
    - 滚动到页面顶部
    - 显示加载状态
    - 更新URL参数（如：`?page=2`）
- [ ] **空状态处理**：
  - 无视频时：显示"暂无视频生成记录，点击生成第一个视频"
  - 过滤结果为空：显示"无符合条件的视频"

#### ⚡ 性能指标（Performance）
- [ ] **页面加载性能**：
  - 首次渲染时间 < 200ms（FCP）
  - 首次API请求：P95 < 300ms
- [ ] **列表渲染性能**：
  - 渲染20个视频卡片 < 100ms
  - 使用虚拟滚动（可选，超过100个视频时）
- [ ] **缩略图加载优化**：
  - 使用懒加载（`loading="lazy"`）
  - 显示占位图直到图片加载完成
  - 大缩略图（> 500KB）压缩到 < 100KB

#### 🔒 安全性（Security）
- [ ] **用户隔离**：
  - 仅显示当前用户的视频（通过JWT验证）
  - 不泄露其他用户的视频信息
- [ ] **XSS防护**：
  - Prompt文本自动转义（React默认行为）
  - 不使用`dangerouslySetInnerHTML`

#### 🛡️ 可靠性（Reliability）
- [ ] **错误处理场景**：
  1. ✅ API请求失败（网络错误）→ 显示"加载失败，请刷新页面"
  2. ✅ API超时（> 10s）→ 显示"请求超时，正在重试..."
  3. ✅ 缩略图加载失败 → 显示默认占位图
  4. ✅ 无权限访问（403）→ 跳转到登录页面
- [ ] **加载状态管理**：
  - 首次加载：显示骨架屏（Skeleton）或加载动画
  - 切换页码/过滤器：显示半透明遮罩 + Spinner
  - 加载失败：恢复之前的列表内容

#### 📊 可观测性（Observability）
- [ ] **用户行为跟踪**（可选）：
  - 页面访问事件：记录过滤器和页码
  - 卡片点击事件：记录taskId和状态
  - 过滤器使用统计：记录最常用的过滤条件

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **组件测试覆盖率** ≥ 85%
- [ ] **核心场景测试**（React Testing Library / Playwright）：
  1. ✅ 列表渲染：显示20个视频卡片，每个包含所有必需字段
  2. ✅ 空状态：无视频时显示"暂无视频"提示
  3. ✅ 状态过滤：选择"Completed"，仅显示已完成视频
  4. ✅ 分页功能：点击"下一页"，显示第2页视频
  5. ✅ 第1页禁用：第1页时"上一页"按钮禁用
  6. ✅ 最后一页禁用：最后一页时"下一页"按钮禁用
  7. ✅ 卡片点击：点击卡片跳转到 `/video/status/{taskId}`
  8. ✅ 加载状态：API请求中显示加载动画
  9. ✅ 错误处理：API失败显示错误提示
  10. ✅ 缩略图懒加载：首屏仅加载可见卡片的缩略图

#### 📖 文档完整性（Documentation）
- [ ] **组件文档**：
  - JSDoc注释说明组件用途和Props
  - VideoCard组件的Props定义和示例
- [ ] **用户指南**：
  - 如何使用状态过滤器
  - 如何查看视频详情

#### 🔄 兼容性（Compatibility）
- [ ] **浏览器兼容性**：
  - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - iOS Safari 14+, Android Chrome 90+
- [ ] **响应式设计**：
  - 移动端（320px - 767px）：单列布局（1列）
  - 平板（768px - 1023px）：两列布局（2列）
  - 桌面（1024px+）：三列布局（3列）
  - 每个视频卡片等宽，自动填充空间
- [ ] **无障碍性（Accessibility）**：
  - 所有交互元素（按钮、链接）有清晰的`aria-label`
  - 状态标签使用语义化颜色（green=completed, red=failed, blue=processing）
  - 键盘可访问性：Tab键可聚焦所有卡片和分页按钮
  - 屏幕阅读器友好：使用`<nav>`包裹分页控件
- [ ] **国际化（i18n）**：
  - 所有文本使用`t()`函数
  - 相对时间本地化（中文："2小时前"；英文："2 hours ago"）
  - 日期格式本地化（中文：2025年1月5日；英文：Jan 5, 2025）

---

## Step 5: Testing and Documentation (Days 13-14)

### Priority: P2 (Medium)

---

### Task 5.1: Write Unit Tests

**Owner**: QA Engineer / Backend Engineer
**Estimated Time**: 5 hours
**Dependencies**: All Phase 2-3 tasks

**Description**: Write comprehensive unit tests for all services and utilities.

**Test Files**:
- `__tests__/lib/veo-client.test.ts`
- `__tests__/lib/video-service.test.ts`
- `__tests__/lib/video-download-service.test.ts`
- `__tests__/lib/config-cache.test.ts`

**Coverage Target**: >85% code coverage

**Test Categories**:
1. **Happy Paths**: Successful video generation, status check, history retrieval
2. **Error Scenarios**: Insufficient credits, concurrent limit, API errors
3. **Edge Cases**: Timeout, download failure, refund logic
4. **Concurrency**: Multiple simultaneous requests, race conditions

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **测试覆盖完整性**：
  - `veo-client.test.ts`：覆盖所有公开方法（generate, getOperation, 错误处理）
  - `video-service.test.ts`：覆盖核心业务逻辑（创建任务、退款、并发检查、积分计算）
  - `video-download-service.test.ts`：覆盖下载流程（fetch视频、上传Supabase、重试逻辑）
  - `config-cache.test.ts`：覆盖配置读取和缓存失效逻辑
- [ ] **测试场景完整性**（至少50个测试用例）：
  - **Happy Paths**（15个）：
    1. ✅ Veo Client成功生成4s/6s/8s视频
    2. ✅ Video Service成功创建任务并扣除积分
    3. ✅ 成功检查并发限制（2个任务 < 3个限制）
    4. ✅ 成功下载视频并上传Supabase
    5. ✅ 成功读取系统配置（积分成本、并发限制）
  - **Error Scenarios**（20个）：
    1. ✅ 用户积分不足 → 返回402错误
    2. ✅ 并发任务达到限制（3个）→ 返回429错误
    3. ✅ Veo API返回401（无效密钥）→ 不重试，抛出VeoAPIError
    4. ✅ Veo API返回500（服务器错误）→ 重试3次
    5. ✅ 视频下载失败 → 重试3次，最终标记为failed并退款
    6. ✅ Supabase上传失败（存储配额超出）→ 标记为failed，不重试
  - **Edge Cases**（10个）：
    1. ✅ 超时任务（15分钟）→ 自动标记为failed并退款
    2. ✅ 用户账户已删除 → 跳过退款，任务标记为failed
    3. ✅ 并发竞态：两个请求同时扣除积分 → 仅一个成功
    4. ✅ Safety filter拦截 → 全额退款，不计入配额
  - **Concurrency**（5个）：
    1. ✅ 5个并发请求，用户仅2个空位 → 2成功+3失败(429)
    2. ✅ 并发超时检测 → 仅一个Cron实例处理同一任务

#### ⚡ 性能指标（Performance）
- [ ] **测试执行速度**：
  - 所有单元测试执行时间 < 30秒（使用mock，无真实API调用）
  - 单个测试文件执行时间 < 5秒
- [ ] **测试并行化**：
  - 使用Jest并行执行（`--maxWorkers=4`）
  - 测试之间无依赖关系（可独立运行）

#### 🔒 安全性（Security）
- [ ] **敏感数据保护**：
  - 测试中不包含真实API密钥或凭证
  - 使用mock API密钥（如：`test-api-key-xxx`）
  - 测试代码不提交敏感信息到版本控制

#### 🛡️ 可靠性（Reliability）
- [ ] **测试稳定性**：
  - 无Flaky测试（连续运行10次，全部通过）
  - 不依赖外部服务（所有API调用使用mock）
  - 不依赖时间顺序（使用固定时间戳或mock `Date.now()`）
- [ ] **Mock策略**：
  - Veo API：使用`jest.mock('@google/generative-ai')`
  - Supabase：使用`jest.mock('@supabase/supabase-js')`
  - 文件系统：使用`jest.mock('fs')`
  - 数据库：使用内存数据库或mock（不连接真实数据库）

#### 📊 可观测性（Observability）
- [ ] **测试报告生成**：
  - 使用`jest-html-reporter`生成HTML报告
  - CI/CD流水线输出覆盖率报告（`jest --coverage`）
  - 失败测试自动截图（如适用）

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **代码覆盖率目标**：
  - **总体覆盖率** ≥ 85%（语句、分支、函数、行）
  - **关键路径100%覆盖**：
    - `videoService.createVideoGeneration()`
    - `videoService.refundVideoGeneration()`
    - `veoClient.generate()`
    - `videoDownloadService.downloadAndUpload()`
  - **分支覆盖率** ≥ 80%（所有if/else/switch分支）
- [ ] **覆盖率豁免**（Excluded）：
  - 配置文件（`config/*`）
  - 类型定义文件（`*.d.ts`）
  - 测试辅助函数（`test-utils/*`）

#### 📖 文档完整性（Documentation）
- [ ] **测试文件注释**：
  - 每个测试文件顶部包含用途说明
  - 复杂测试场景包含详细注释（如："模拟并发竞态：..."）
  - 使用`describe`和`it`清晰描述测试意图：
    ```typescript
    describe('VideoService.createVideoGeneration', () => {
      it('should deduct credits and create task atomically', async () => {
        // ...
      });
    });
    ```
- [ ] **测试报告文档**：
  - README中添加"运行测试"章节：
    ```bash
    # 运行所有单元测试
    pnpm test

    # 生成覆盖率报告
    pnpm test:coverage

    # 运行单个测试文件
    pnpm test video-service.test.ts
    ```

#### 🔄 兼容性（Compatibility）
- [ ] **测试框架版本**：
  - Jest 29+
  - TypeScript 5+
  - Node.js 18+
- [ ] **CI/CD集成**：
  - GitHub Actions配置（`.github/workflows/test.yml`）
  - 自动运行测试（每次PR和push到main）
  - 测试失败时阻止合并（required check）
  - 覆盖率报告自动发布（Codecov或Coveralls）

---

### Task 5.2: Write Integration Tests

**Owner**: QA Engineer
**Estimated Time**: 5 hours
**Dependencies**: Task 5.1

**Description**: Write end-to-end integration tests.

**Test Files**:
- `__tests__/api/generate-video.integration.test.ts`
- `__tests__/api/video-status.integration.test.ts`
- `__tests__/api/video-history.integration.test.ts`
- `__tests__/api/cron-poll.integration.test.ts`

**Test Scenarios**:
1. Complete video generation flow (mock Veo API)
2. Status tracking throughout lifecycle
3. Credit deduction and refund
4. Concurrent task limiting
5. Download and storage
6. History pagination and filtering

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **端到端流程测试**（6个完整场景）：
  1. ✅ 完整视频生成流程（创建→processing→downloading→completed）
  2. ✅ 状态追踪流程（轮询status API，状态正确转换）
  3. ✅ 积分扣除和退款流程（失败时全额退还）
  4. ✅ 并发任务限制流程（第4个任务被拒绝）
  5. ✅ 下载和存储流程（从Google下载→上传Supabase→返回永久URL）
  6. ✅ 历史分页和过滤流程（20条/页，按状态过滤）
- [ ] **Mock策略完整性**：
  - Veo API：使用MSW（Mock Service Worker）拦截HTTP请求
  - Supabase：使用测试数据库或内存数据库
  - 文件下载：mock `fetch()`，返回预定义视频Buffer
  - Cron Job：手动触发，不依赖定时器

#### ⚡ 性能指标（Performance）
- [ ] **测试执行速度**：
  - 所有集成测试执行时间 < 2分钟
  - 单个测试场景执行时间 < 10秒
- [ ] **并行执行**：
  - 测试使用独立数据库实例（避免冲突）
  - 测试之间无状态共享

#### 🛡️ 可靠性（Reliability）
- [ ] **测试稳定性**：
  - 无Flaky测试（连续运行20次，全部通过）
  - 不依赖真实外部服务（Veo API, Supabase Storage）
  - 使用固定种子数据（deterministic）
- [ ] **测试隔离性**：
  - 每个测试前：清空数据库，重置mock
  - 每个测试后：清理临时文件和数据
  - 测试之间无副作用传递

#### 📊 可观测性（Observability）
- [ ] **测试报告**：
  - 集成测试单独生成报告（与单元测试分开）
  - 记录每个测试的执行时间和状态转换日志
  - 失败测试自动保存请求/响应快照

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **API端点覆盖**：
  - `/api/generate-video`（POST）：所有参数组合 + 错误场景
  - `/api/video/status/:taskId`（GET）：所有状态 + 不存在/无权限场景
  - `/api/video/history`（GET）：分页 + 过滤 + 空列表场景
  - `/api/cron/poll-video-operations`（POST）：轮询 + 超时 + 下载场景
- [ ] **业务流程覆盖**：
  - 正常流程：创建→完成→查看历史
  - 失败流程：创建→超时→退款→重试
  - 并发流程：3个并发任务 + 第4个被拒绝

#### 📖 文档完整性（Documentation）
- [ ] **测试场景文档**：
  - 每个集成测试文件顶部说明测试目标和覆盖的业务流程
  - 复杂mock配置包含注释（如："模拟Veo API完成状态"）
- [ ] **运行指南**：
  - README添加"运行集成测试"章节：
    ```bash
    # 运行所有集成测试
    pnpm test:integration

    # 运行单个集成测试
    pnpm test:integration generate-video.integration.test.ts
    ```

#### 🔄 兼容性（Compatibility）
- [ ] **CI/CD集成**：
  - 集成测试在独立的CI job中运行（与单元测试分离）
  - 使用Docker Compose启动测试数据库
  - 测试失败时阻止部署

---

### Task 5.3: Update API Documentation

**Owner**: Technical Writer / Backend Engineer
**Estimated Time**: 3 hours
**Dependencies**: All Phase 2 tasks

**Description**: Document all new API endpoints.

**Files to Update**:
- `README.md` - Add video generation section
- `API_DOCS.md` - Add detailed endpoint documentation
- `app/api-docs/page.tsx` - Update API docs page

**Documentation Sections**:
1. **Overview**: Video generation capabilities
2. **Authentication**: Required for all endpoints
3. **Endpoints**:
   - POST /api/generate-video
   - GET /api/video/status/:taskId
   - GET /api/video/history
4. **Request/Response Examples**: Comprehensive examples
5. **Error Codes**: Complete error code reference
6. **Rate Limits**: Concurrent task limit
7. **Cost Information**: Credit costs per duration

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **API端点文档完整性**（3个端点全覆盖）：
  - **POST /api/generate-video**：
    - 请求参数：`prompt` (string, 必填, 2-2000字符), `duration` (enum: 4|6|8, 必填), `aspectRatio` (enum: "16:9"|"9:16", 可选, 默认"16:9"), `resolution` (enum: "720p"|"1080p", 可选, 默认"720p")
    - 响应Schema：`{ taskId: string, status: "processing", estimatedTime: "30s-3min", creditCost: number }`
    - 错误码：402 (INSUFFICIENT_CREDITS), 429 (TOO_MANY_REQUESTS), 400 (INVALID_PARAMETERS)
  - **GET /api/video/status/:taskId**：
    - 路径参数：`taskId` (UUID格式)
    - 响应Schema：`{ taskId, status, videoUrl?, error?, createdAt, completedAt?, metadata }`
    - 状态枚举：processing | downloading | completed | failed
  - **GET /api/video/history**：
    - 查询参数：`page` (number, 默认1), `limit` (number, 默认20, 最大100), `status` (可选过滤)
    - 响应Schema：`{ videos: VideoTask[], pagination: { total, page, limit, totalPages } }`
- [ ] **请求/响应示例完整性**：
  - 每个端点至少2个示例（成功场景 + 典型错误场景）
  - 示例包含完整的HTTP headers（Content-Type, Authorization）
  - 响应包含实际的示例数据（非占位符）
- [ ] **错误码文档详尽性**：
  - 错误码表格包含：代码（Code）、HTTP状态码、错误消息（Message）、解决方案（Solution）
  - 覆盖所有可能的错误场景（≥10个错误码）：
    - 402: INSUFFICIENT_CREDITS（"积分不足，需要X个积分"）
    - 429: TOO_MANY_REQUESTS（"并发任务已达上限3个"）
    - 400: INVALID_PARAMETERS（"参数验证失败"）
    - 401: UNAUTHORIZED（"未提供认证令牌"）
    - 403: FORBIDDEN（"无权访问此资源"）
    - 404: NOT_FOUND（"任务不存在"）
    - 500: INTERNAL_SERVER_ERROR（"服务器内部错误"）
    - 503: SERVICE_UNAVAILABLE（"视频生成服务暂停维护"）

#### ⚡ 性能指标（Performance Metrics）
- [ ] **文档页面性能**：
  - 首次加载时间 < 2 秒（在3G网络下）
  - 文档搜索响应时间 < 100ms（索引≤1000条记录）
  - 代码示例语法高亮渲染 < 50ms
- [ ] **交互式API测试器性能**：
  - 请求发送延迟 < 200ms（本地代理）
  - 支持请求历史记录（最多保存50条）

#### 🔒 安全性（Security）
- [ ] **敏感信息脱敏**：
  - 所有API密钥示例使用占位符（`sk-xxx...xxx`）
  - 用户ID使用假数据（`user_demo_12345`）
  - 视频URL使用示例域名（`https://example.com/videos/demo.mp4`）
- [ ] **安全最佳实践说明**：
  - 强调API密钥不可硬编码在前端代码
  - 建议使用环境变量存储密钥
  - 提供API密钥泄露后的应急处理流程

#### 🛡️ 可靠性（Reliability）
- [ ] **文档版本管理**：
  - 文档版本号与API版本号一致（如：v1.0）
  - 重大变更时保留旧版本文档（至少2个历史版本）
  - 文档更新日志记录所有变更（Changelog格式）
- [ ] **链接有效性**：
  - 所有内部链接可访问（无404错误）
  - 所有外部链接定期检查（每月验证一次）

#### 📊 可观测性（Observability）
- [ ] **文档使用统计**：
  - 统计各端点文档的阅读次数（Top 5端点）
  - 统计搜索关键词（识别用户常见疑问）
  - 统计跳出率（哪些页面用户快速离开）
- [ ] **反馈机制**：
  - 每个页面底部有"此文档是否有帮助？"按钮（是/否+可选文本反馈）
  - 反馈数据汇总到admin dashboard

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **文档准确性验证**：
  - 所有代码示例经过实际运行验证（100%可执行）
  - 响应Schema与实际API响应一致（自动化Schema对比测试）
  - 错误码与代码库中的错误定义一致（代码生成验证）
- [ ] **多语言代码示例测试**：
  - curl示例：在Linux/macOS/Windows Git Bash中测试通过
  - JavaScript示例：在Node.js 18+和浏览器fetch中测试通过
  - Python示例：在Python 3.9+中测试通过（使用requests库）

#### 📖 文档完整性（Documentation Completeness）
- [ ] **代码示例多样性**：
  - 每个端点提供3种语言的代码示例：
    1. **curl**（命令行快速测试）
    2. **JavaScript**（前端/Node.js集成）
    3. **Python**（后端集成）
  - 示例包含错误处理逻辑（try-catch/异常捕获）
- [ ] **交互式API测试器**：
  - 集成Swagger UI或类似工具
  - 支持在线调试（填写参数→发送请求→查看响应）
  - 自动填充认证令牌（从用户登录状态获取）
- [ ] **快速开始指南**：
  - 5分钟快速入门教程（从获取API密钥到第一个视频生成）
  - 包含完整的端到端示例（创建任务→轮询状态→下载视频）

#### 🔄 兼容性（Compatibility）
- [ ] **多语言支持**：
  - 文档支持中英双语切换
  - 所有技术术语提供中英对照（如：credit/积分）
- [ ] **响应式设计**：
  - 移动端优化（代码示例可横向滚动，字体大小适配）
  - 平板适配（侧边栏导航自动折叠）
- [ ] **浏览器兼容性**：
  - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  - 不依赖特定浏览器的实验性API

---

### Task 5.4: Create User Guide

**Owner**: Technical Writer
**Estimated Time**: 3 hours
**Dependencies**: Task 4.1, Task 4.2, Task 4.3

**Description**: Write user-facing documentation.

**File**: `docs/user-guides/video-generation.md`

**Sections**:
1. **Introduction**: What is video generation
2. **Getting Started**: Step-by-step tutorial
3. **Best Practices**: Tips for writing good prompts
4. **Understanding Results**: How to interpret status
5. **Troubleshooting**: Common issues and solutions
6. **FAQ**: Frequently asked questions
7. **Cost Calculator**: Tool to estimate credit cost

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **7个章节内容完整性**：
  1. **Introduction（简介）**：
     - 视频生成功能概述（≥200字）
     - 支持的视频时长（4s/6s/8s）和分辨率（720p/1080p）
     - 积分成本说明（10 credits/秒）
     - 应用场景示例（产品演示、UGC短视频、教育内容）
  2. **Getting Started（快速开始）**：
     - 分步教程（≥5个步骤，每步配图）：
       1. 登录账户并充值积分
       2. 进入视频生成页面
       3. 输入文本提示词（示例："一只橙色猫在森林中奔跑"）
       4. 选择时长和分辨率
       5. 点击"生成视频"并等待完成
     - 预计等待时间说明（30秒-3分钟）
  3. **Best Practices（最佳实践）**：
     - 提示词撰写技巧（≥10条建议）：
       - ✅ 使用具体的描述（"橙色猫"而非"猫"）
       - ✅ 包含动作和场景（"奔跑"+"森林"）
       - ✅ 避免过于复杂的场景（≤3个主体）
     - 常见错误与改进建议（Before/After对比）
  4. **Understanding Results（理解结果）**：
     - 4种状态解释：
       - `processing`: 正在生成（显示进度条）
       - `downloading`: 正在下载（从Google存储）
       - `completed`: 已完成（可播放和下载）
       - `failed`: 失败（显示错误原因+退款说明）
     - 视频质量评估指标（分辨率、流畅度、音频同步）
  5. **Troubleshooting（故障排除）**：
     - 常见问题与解决方案（≥8个问题）：
       1. Q: 积分不足怎么办？ A: 前往充值页面购买积分包
       2. Q: 生成超时（15分钟）？ A: 系统自动退款，请稍后重试
       3. Q: 视频质量不理想？ A: 尝试更详细的提示词或更高分辨率
       4. Q: 并发任务已满？ A: 等待已有任务完成后再提交
  6. **FAQ（常见问题）**：
     - ≥15个高频问题及详细答案
     - 涵盖功能、定价、技术限制、隐私政策
  7. **Cost Calculator（成本计算器）**：
     - 交互式计算器（输入时长→显示积分成本）
     - 批量生成成本估算（如：10个6秒视频=600 credits）
- [ ] **用户工作流覆盖**：
  - 首次使用流程（注册→充值→生成第一个视频）
  - 批量生成流程（多个提示词→队列管理）
  - 历史查看和管理流程（过滤、排序、删除）

#### ⚡ 性能指标（Performance Metrics）
- [ ] **页面加载速度**：
  - 首屏加载 < 3 秒（在4G网络下）
  - 图片/视频延迟加载（lazy loading）
  - 总页面大小 < 5MB
- [ ] **搜索功能**：
  - 全文搜索响应时间 < 200ms
  - 支持中英文混合搜索
  - 高亮搜索结果关键词

#### 🔒 安全性（Security）
- [ ] **隐私保护**：
  - 示例视频不包含真实用户数据
  - 截图中敏感信息模糊处理（用户名、邮箱）
- [ ] **链接安全**：
  - 所有外部链接使用`target="_blank" rel="noopener noreferrer"`
  - 不跳转到可疑网站

#### 🛡️ 可靠性（Reliability）
- [ ] **内容准确性**：
  - 所有步骤经过真实用户测试（≥5名测试用户）
  - 截图与当前UI版本一致（无过期界面）
  - 数字信息准确（积分成本、时长、分辨率）
- [ ] **定期更新**：
  - 每次产品更新后同步修订文档（≤7天延迟）
  - 版本号标注（如：文档版本 v1.2, 适用于产品版本 v2.0）

#### 📊 可观测性（Observability）
- [ ] **阅读分析**：
  - 统计平均阅读时长（目标：≥3分钟）
  - 统计跳出率（目标：<40%）
  - 统计最常访问的章节（Top 3）
- [ ] **用户反馈收集**：
  - 每个章节底部有"有帮助"/"无帮助"按钮
  - 收集改进建议（可选文本框）
  - 反馈响应机制（7天内回复用户建议）

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **可用性测试**：
  - ≥5名新用户按指南完成首次生成（成功率≥90%）
  - 记录用户卡点和困惑（改进文档）
  - 测试不同背景用户（技术/非技术）
- [ ] **跨设备测试**：
  - 在移动端（iOS/Android）验证截图可见性
  - 在平板上验证布局完整性
  - 在桌面端（Windows/Mac）验证视频播放

#### 📖 文档完整性（Documentation Completeness）
- [ ] **视觉元素丰富性**：
  - ≥10张高质量截图（分辨率≥1920x1080，标注关键操作）
  - ≥3个演示视频（每个≤2分钟，带字幕）：
    1. 快速开始教程（端到端演示）
    2. 提示词撰写技巧（Before/After对比）
    3. 故障排除示例（如何处理失败任务）
  - 所有截图使用一致的标注样式（箭头、高亮框、序号）
- [ ] **Help Center集成**：
  - 文档嵌入主站Help Center（URL: /help/video-generation）
  - 侧边栏导航目录（章节跳转）
  - 相关文章推荐（至少3篇相关指南）
- [ ] **可打印版本**：
  - 提供PDF下载（排版优化，无截断）
  - PDF包含目录和页码
  - 文件大小 < 10MB

#### 🔄 兼容性（Compatibility）
- [ ] **多语言支持**：
  - 中英双语完整翻译（100%覆盖）
  - 语言切换按钮显眼（右上角）
  - 技术术语中英对照表（如：credit/积分, prompt/提示词）
- [ ] **无障碍性（Accessibility）**：
  - WCAG 2.1 AA标准：
    - 所有图片有`alt`描述
    - 颜色对比度 ≥ 4.5:1
    - 键盘可导航（Tab键）
    - 屏幕阅读器友好（语义化HTML）
  - 视频包含字幕（中英双语）
- [ ] **响应式设计**：
  - 移动端（320px-767px）：单列布局，图片自适应缩放
  - 平板（768px-1023px）：侧边栏可折叠
  - 桌面（1024px+）：固定侧边栏，内容区宽度≤800px（最佳阅读宽度）

---

### Task 5.5: Create Admin Guide

**Owner**: Technical Writer
**Estimated Time**: 2 hours
**Dependencies**: Task 1.1

**Description**: Document admin configuration and monitoring.

**File**: `docs/admin-guides/video-generation-config.md`

**Sections**:
1. **Configuration**: How to update system_configs
2. **Credit Pricing**: Adjusting credit costs
3. **Concurrent Limits**: Setting user limits
4. **Feature Toggle**: Enabling/disabling feature
5. **Monitoring**: Key metrics to track
6. **Troubleshooting**: Admin troubleshooting steps
7. **Incident Response**: Handling outages

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **7个章节内容完整性**：
  1. **Configuration（配置管理）**：
     - 所有`system_configs`参数详细说明：
       - `video_generation.credit_costs`（JSON格式：`{"4s": 40, "6s": 60, "8s": 80}`）
       - `video_generation.concurrent_limit`（整数，默认3）
       - `video_generation.is_active`（布尔值，控制功能开关）
       - `video_generation.polling_interval_seconds`（整数，默认10）
       - `video_generation.generation_timeout_minutes`（整数，默认15）
     - 配置更新流程（SQL示例 + Redis缓存刷新命令）
  2. **Credit Pricing（积分定价）**：
     - 调整积分成本的步骤（4步）：
       1. 计算新的API成本（Google Veo定价变化）
       2. 更新`system_configs`表
       3. 清理Redis缓存（`FLUSHDB` 或 `DEL video_config:*`）
       4. 验证新价格在前端显示正确
     - 定价策略建议（成本+50%利润空间）
  3. **Concurrent Limits（并发限制）**：
     - 设置用户并发限制（推荐：普通用户3个，VIP用户5个）
     - 全局并发限制（防止系统过载，推荐：100个任务）
     - 动态调整策略（根据系统负载自动降级）
  4. **Feature Toggle（功能开关）**：
     - 启用/禁用功能的步骤（2步）：
       1. 更新`system_configs.video_generation.is_active`为`false`
       2. 前端自动显示维护提示："视频生成功能暂时维护中"
     - 紧急禁用场景（API成本超预算、系统故障、安全事件）
  5. **Monitoring（监控指标）**：
     - 关键指标（≥12个）：
       - 总生成任务数（按状态分组：processing/completed/failed）
       - 平均生成时间（目标：<2分钟）
       - 成功率（目标：≥95%）
       - 并发任务峰值（监控是否接近上限）
       - 积分消耗速率（credits/小时）
       - API调用成本（$/天）
       - Supabase存储使用量（GB）
       - 下载失败率（目标：<1%）
       - 超时任务数（目标：<5%）
       - 用户活跃度（生成视频的用户数/天）
     - 监控仪表板配置（Grafana/Datadog/自建）
  6. **Troubleshooting（故障排除）**：
     - 常见管理员问题（≥10个）：
       1. Q: 用户反馈生成失败率突然上升？ A: 检查Veo API状态，查看错误日志，验证API密钥有效性
       2. Q: 存储空间不足？ A: 扩容Supabase存储，或启用视频清理策略
       3. Q: 成本超预算？ A: 临时禁用功能，调整积分定价，限制并发数
       4. Q: 轮询任务卡死？ A: 检查Vercel Cron Job日志，手动触发轮询，重启Edge Function
  7. **Incident Response（事故响应）**：
     - 完整的应急流程（15分钟检测→30分钟响应→2小时解决）：
       - **P0（严重）**：功能完全不可用（0成功任务/小时）
         - 立即禁用功能 → 通知用户维护 → 排查根因 → 修复 → 逐步恢复
       - **P1（高）**：成功率<80%
         - 降低并发限制 → 通知技术团队 → 排查API/存储问题 → 修复
       - **P2（中）**：成功率80-95%
         - 监控趋势 → 记录异常模式 → 计划修复
- [ ] **常见管理任务步骤详解**（≥5个任务）：
  - 任务1: 批量退款失败任务（SQL脚本+验证步骤）
  - 任务2: 清理超过1年未访问的视频（存储优化）
  - 任务3: 导出用户生成统计报表（Excel/CSV格式）
  - 任务4: 手动重新触发失败任务（重新提交到Veo API）
  - 任务5: 检查和修复损坏的视频记录（数据修复）

#### ⚡ 性能指标（Performance Metrics）
- [ ] **文档加载速度**：
  - 首屏加载 < 2 秒
  - SQL代码片段语法高亮 < 50ms
- [ ] **配置更新响应时间**：
  - Redis缓存刷新 < 100ms
  - 前端获取新配置 < 200ms

#### 🔒 安全性（Security）
- [ ] **权限要求明确**：
  - 所有配置操作需要Admin角色（role='admin'）
  - 数据库操作需要Service Role权限
  - API密钥轮换流程（每90天一次）
- [ ] **操作审计**：
  - 所有配置变更记录到`admin_audit_logs`表
  - 记录字段：admin_id, action, old_value, new_value, timestamp
  - 审计日志保留180天
- [ ] **敏感信息保护**：
  - 文档中不包含真实的API密钥
  - SQL示例使用占位符（`YOUR_API_KEY`）

#### 🛡️ 可靠性（Reliability）
- [ ] **事故响应SLA**：
  - **检测**：15分钟内通过监控告警发现问题
  - **响应**：30分钟内管理员开始处理
  - **解决**：P0问题2小时内解决，P1问题8小时内解决
  - **沟通**：每小时向用户通报进展
- [ ] **回滚预案**：
  - 配置变更前备份旧值（存储在`config_history`表）
  - 提供一键回滚脚本（恢复到上一个稳定配置）
  - 测试环境先验证配置变更

#### 📊 可观测性（Observability）
- [ ] **监控仪表板设置指南**：
  - 推荐工具：Grafana + Prometheus / Datadog / New Relic
  - 包含配置示例（JSON格式或YAML格式）
  - 告警阈值建议：
    - 成功率<95% → 发送Slack通知
    - 并发任务≥90（接近上限100）→ 发送Email
    - API成本>$1000/天 → 发送PagerDuty
- [ ] **日志聚合**：
  - 所有错误日志集中到ELK/Splunk/CloudWatch
  - 关键事件包含trace_id（便于分布式追踪）

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **配置变更验证**：
  - 每个配置示例在测试环境实际执行（100%可用）
  - SQL语句语法正确（通过数据库引擎验证）
  - Redis命令有效（在测试Redis实例验证）
- [ ] **故障演练**：
  - ≥2次模拟事故演练（Veo API故障、存储满载等）
  - 记录实际响应时间（与SLA对比）
  - 改进响应流程（根据演练反馈）

#### 📖 文档完整性（Documentation Completeness）
- [ ] **监控仪表板说明**：
  - ≥5张仪表板截图（标注关键指标）
  - 每个指标的正常范围和异常阈值
  - 图表颜色编码说明（绿色=正常，黄色=警告，红色=严重）
- [ ] **SQL脚本库**：
  - 提供≥10个常用SQL脚本（带注释）：
    1. 查询今日生成任务数
    2. 查询失败任务列表（含错误信息）
    3. 查询积分消耗Top 10用户
    4. 批量退款脚本
    5. 视频清理脚本（删除1年前未访问）
  - 所有脚本包含WHERE条件保护（防止误删全表）
- [ ] **事故响应Playbook**：
  - 完整的决策树图（Mermaid flowchart）
  - 包含联系人信息（技术负责人、Google支持等）
  - 沟通模板（用户公告、内部报告）

#### 🔄 兼容性（Compatibility）
- [ ] **数据库兼容性**：
  - 文档标注PostgreSQL版本要求（≥14.0）
  - SQL语法兼容Supabase（不使用特定数据库扩展）
- [ ] **工具兼容性**：
  - 脚本支持跨平台（Bash脚本在Linux/macOS/WSL运行）
  - 配置示例支持多种监控工具（Grafana, Datadog, CloudWatch）

---

## Step 6: Performance Testing and Optimization (Optional)

### Priority: P3 (Low)

---

### Task 6.1: Load Testing

**Owner**: DevOps / QA Engineer
**Estimated Time**: 4 hours

**Description**: Perform load testing to verify system can handle expected traffic.

**Test Scenarios**:
1. 50 concurrent video generations
2. 100 status checks per second
3. 1000 videos in history pagination
4. Cron job with 100 processing tasks

**Tools**: k6, Artillery, or Apache JMeter

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **4个测试场景完整执行**：
  1. **场景1: 50并发视频生成**：
     - 测试步骤：
       1. 使用k6/Artillery同时发起50个`POST /api/generate-video`请求
       2. 每个请求使用不同的prompt（避免缓存影响）
       3. 监控任务创建成功率（目标：100%）
       4. 验证积分正确扣除（50个任务 × 40-80 credits）
       5. 检查并发限制是否生效（每个用户≤3个任务）
     - 验收标准：所有50个任务成功创建（status='processing'），无500错误
  2. **场景2: 100 status checks/秒**：
     - 测试步骤：
       1. 预先创建10个视频任务（获取taskId列表）
       2. 使用k6生成100 RPS（Requests Per Second）的`GET /api/video/status/:taskId`请求
       3. 持续10分钟（共60,000次请求）
       4. 记录P50/P95/P99响应时间
     - 验收标准：P95 < 200ms，P99 < 500ms，错误率 < 0.1%
  3. **场景3: 1000视频历史分页**：
     - 测试步骤：
       1. 预先生成1000条视频历史记录（使用脚本批量创建）
       2. 模拟用户翻页行为：`GET /api/video/history?page=1&limit=20`（共50页）
       3. 测试不同排序方式（created_at DESC, status, duration）
       4. 测试过滤条件（status='completed', duration=6）
     - 验收标准：每页加载时间 < 1秒，数据一致性100%（无重复/丢失记录）
  4. **场景4: Cron轮询100个processing任务**：
     - 测试步骤：
       1. 创建100个mock处理中的任务（status='processing'）
       2. 手动触发Cron Job轮询
       3. 监控Veo API调用次数（应为100次）
       4. 监控任务状态更新（完成的任务→'downloading'/'completed'）
       5. 测试并发轮询（多个Cron实例同时运行）
     - 验收标准：轮询完成时间 < 2分钟，无任务状态丢失，无重复调用

#### ⚡ 性能指标（Performance Metrics）
- [ ] **API响应时间**（分端点统计）：
  - **POST /api/generate-video**：
    - P50 < 100ms（50%请求）
    - P95 < 200ms（95%请求）
    - P99 < 500ms（99%请求）
  - **GET /api/video/status/:taskId**：
    - P50 < 50ms
    - P95 < 100ms
    - P99 < 200ms
  - **GET /api/video/history**：
    - P50 < 200ms（含数据库查询）
    - P95 < 500ms
    - P99 < 1000ms
- [ ] **数据库查询性能**：
  - 所有SELECT查询 P95 < 50ms
  - INSERT/UPDATE查询 P95 < 100ms
  - 事务性操作（积分扣除+任务创建）P95 < 150ms
  - 连接池使用率 < 80%（峰值）
- [ ] **资源使用率**：
  - **CPU使用率** < 70%（峰值时刻）
  - **内存使用率** < 80%（Node.js进程）
  - **数据库连接数** < 80个（最大连接池100）
  - **Supabase Storage带宽** < 100 MB/s
- [ ] **吞吐量指标**：
  - 视频生成吞吐量：≥10个任务/分钟
  - API总吞吐量：≥500 RPS（所有端点合计）

#### 🔒 安全性（Security）
- [ ] **速率限制验证**：
  - 单用户超过3个并发任务时返回429错误
  - 单IP超过100 RPS时触发速率限制
  - 无认证请求立即返回401（不进入业务逻辑）
- [ ] **数据隔离测试**：
  - 用户A无法访问用户B的任务（GET /api/video/status/:taskId返回403）
  - 历史列表仅返回当前用户的视频

#### 🛡️ 可靠性（Reliability）
- [ ] **错误恢复测试**：
  - 模拟Veo API短暂故障（503错误）→ 系统自动重试3次
  - 模拟数据库连接中断 → 请求返回500，不影响其他请求
  - 模拟Supabase Storage故障 → 下载任务标记为failed并退款
- [ ] **长时间压力测试**：
  - 持续运行30分钟以上
  - 错误率保持 < 0.1%
  - 无内存泄漏（内存使用稳定）
  - 无死锁或资源耗尽

#### 📊 可观测性（Observability）
- [ ] **测试报告格式**：
  - HTML Dashboard（包含图表和统计数据）：
    - 响应时间分布图（P50/P95/P99折线图）
    - 吞吐量趋势图（RPS随时间变化）
    - 错误率曲线（按错误类型分组）
    - 资源使用率图（CPU/内存/数据库连接）
  - JSON格式原始数据（便于自动化分析）
  - Markdown格式摘要（便于分享）
- [ ] **关键指标可视化**：
  - 实时监控面板（Grafana/k6 Cloud）
  - 与生产环境性能基线对比

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **测试工具配置**：
  - 优先使用k6（轻量、脚本化、云端支持）
  - k6脚本包含：
    - Virtual Users（VUs）配置
    - 测试阶段定义（ramp-up → steady → ramp-down）
    - 自定义指标（业务指标如任务成功率）
    - 断言（Thresholds）设置
- [ ] **环境一致性**：
  - 测试环境与生产环境硬件规格一致（或按比例缩减）
  - 使用生产环境的代码版本
  - 使用真实的Veo API（sandbox环境）或高保真Mock

#### 📖 文档完整性（Documentation Completeness）
- [ ] **k6测试脚本示例**：
  ```javascript
  // 示例脚本结构
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export let options = {
    stages: [
      { duration: '2m', target: 10 }, // Ramp-up
      { duration: '5m', target: 50 }, // Steady state
      { duration: '2m', target: 0 },  // Ramp-down
    ],
    thresholds: {
      'http_req_duration': ['p(95)<200'], // 95% < 200ms
      'http_req_failed': ['rate<0.01'],  // 错误率 < 1%
    },
  };

  export default function () {
    // 生成视频请求
    let res = http.post('https://api.example.com/api/generate-video', {
      prompt: 'A cat running',
      duration: 4,
    });
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
  }
  ```
- [ ] **性能测试报告模板**：
  - 执行摘要（Executive Summary）
  - 测试环境说明（硬件、网络、数据规模）
  - 测试结果（表格+图表）
  - 性能瓶颈分析
  - 优化建议

#### 🔄 兼容性（Compatibility）
- [ ] **工具兼容性**：
  - k6脚本在Windows/macOS/Linux运行通过
  - 支持Docker容器化运行（便于CI/CD集成）
- [ ] **云端执行**：
  - 支持k6 Cloud分布式负载测试（从全球多个区域发起请求）
  - 支持AWS/GCP/Azure的负载测试服务

---

### Task 6.2: Cost Optimization

**Owner**: DevOps / Backend Engineer
**Estimated Time**: 3 hours

**Description**: Optimize costs for storage and API calls.

**Optimizations**:
1. Implement video compression (reduce file size by 30-50%)
2. Implement CDN caching for frequently accessed videos
3. Implement video cleanup policy (delete after 1 year inactivity)
4. Optimize polling frequency based on historical generation times

**Acceptance Criteria**:

#### ✅ 功能正确性（Functional Correctness）
- [ ] **4个优化措施完整实施**：
  1. **视频压缩（Video Compression）**：
     - 技术选型：
       - 使用FFmpeg进行转码（H.264编码，CRF 23-28）
       - 或使用Cloudflare Stream压缩API
       - 或使用AWS MediaConvert
     - 实施步骤（5步）：
       1. 下载原始视频（从Google临时存储）
       2. 使用FFmpeg压缩：`ffmpeg -i input.mp4 -c:v libx264 -crf 25 -preset medium -c:a aac -b:a 128k output.mp4`
       3. 验证压缩后质量（SSIM ≥ 0.95，PSNR ≥ 35dB）
       4. 上传压缩后的视频到Supabase Storage
       5. 删除原始视频（节省存储空间）
     - 验收标准：
       - 平均文件大小减少30-50%（6秒视频：10MB → 5-7MB）
       - 视频质量主观评分 ≥ 4/5（5名测试用户评价）
       - 压缩时间 < 10秒/视频
  2. **CDN缓存（CDN Caching）**：
     - 技术选型：
       - Cloudflare CDN（免费计划支持视频缓存）
       - 或Vercel Edge Network（自动缓存静态资源）
       - 或AWS CloudFront
     - 实施步骤（4步）：
       1. 配置Supabase Storage为CDN源站
       2. 设置Cache-Control头：`public, max-age=31536000`（1年）
       3. 配置CDN回源策略（仅首次访问回源）
       4. 启用智能缓存预热（热门视频提前缓存）
     - 验收标准：
       - CDN缓存命中率 > 70%（统计7天数据）
       - 视频加载速度提升 ≥ 50%（首字节时间TTFB）
       - CDN带宽成本 < 回源带宽成本（证明CDN有效降本）
  3. **视频清理策略（Video Cleanup Policy）**：
     - 清理规则：
       - 删除1年内未访问的视频（last_accessed_at < now - 365天）
       - 保留最近3个月的所有视频（无论访问次数）
       - VIP用户的视频永久保留（可选）
     - 实施步骤（4步）：
       1. 创建Cron Job（每周执行一次）
       2. 查询符合清理条件的视频：`SELECT * FROM video_generation_history WHERE last_accessed_at < now() - interval '1 year' AND created_at < now() - interval '3 months'`
       3. 从Supabase Storage删除视频文件
       4. 更新数据库记录（标记为deleted，保留元数据）
     - 验收标准：
       - 清理脚本执行无错误（dry-run模式验证）
       - 删除前创建备份（存储到Glacier/冷存储）
       - 用户无法访问已删除视频（返回410 Gone）
       - 存储空间释放 ≥ 20%（执行1个月后统计）
  4. **动态轮询频率优化（Dynamic Polling Optimization）**：
     - 优化策略：
       - 分析历史数据：95%的视频在90秒内完成生成
       - 前90秒：每10秒轮询一次（高频）
       - 90-300秒：每30秒轮询一次（中频）
       - 300秒+：每60秒轮询一次（低频）
       - 超过15分钟：停止轮询并标记超时
     - 实施步骤（3步）：
       1. 修改轮询逻辑（根据任务创建时间动态调整间隔）
       2. 记录实际生成时间分布（用于持续优化）
       3. A/B测试验证优化效果（对比旧方案）
     - 验收标准：
       - Veo API调用次数减少 ≥ 30%（每月统计）
       - 平均检测延迟 < 15秒（完成时刻 - 检测到完成时刻）
       - API成本节省 ≥ $100/月（假设100个任务/天）

#### ⚡ 性能指标（Performance Metrics）
- [ ] **优化后性能**：
  - 视频加载速度（CDN加速后）：P95 < 2秒（1080p视频）
  - 压缩处理吞吐量：≥ 10个视频/分钟
  - 清理脚本执行时间：< 10分钟（处理1000条记录）
- [ ] **成本指标**：
  - **Supabase Storage成本**：
    - 优化前：$0.021/GB/月 × 100GB = $2.10/月
    - 优化后：$0.021/GB/月 × 80GB = $1.68/月（节省20%）
  - **CDN成本**：
    - Cloudflare免费计划：$0/月（带宽不限）
    - 或AWS CloudFront：$0.085/GB（优化后回源减少70%）
  - **Veo API成本**：
    - 优化前：100个任务/天 × 30天 × 10次轮询 × $0.001/请求 = $30/月
    - 优化后：100个任务/天 × 30天 × 7次轮询 × $0.001/请求 = $21/月（节省30%）

#### 🔒 安全性（Security）
- [ ] **数据备份**：
  - 删除视频前创建备份到AWS Glacier/Google Coldline
  - 备份保留30天（便于恢复误删除）
  - 备份成本 < 原存储成本的10%
- [ ] **删除审计**：
  - 所有删除操作记录到audit_logs表
  - 记录：video_id, deleted_by, deleted_at, reason, file_size
  - 提供恢复接口（管理员可回滚误删除）

#### 🛡️ 可靠性（Reliability）
- [ ] **压缩质量保证**：
  - 自动质量检测（SSIM < 0.95时重新压缩）
  - 压缩失败时使用原视频（不影响用户体验）
  - 压缩错误率 < 1%
- [ ] **CDN故障降级**：
  - CDN不可用时自动回源（用户无感知）
  - 监控CDN可用性（99.9% SLA）
- [ ] **清理安全机制**：
  - Dry-run模式先验证（不实际删除）
  - 白名单机制（某些视频永不删除）
  - 误删除恢复SLA：< 4小时

#### 📊 可观测性（Observability）
- [ ] **成本监控仪表板**：
  - 实时显示：
    - 存储成本趋势（$/月）
    - API调用成本趋势（$/月）
    - CDN流量和成本（$/月）
    - 压缩节省空间（GB）
  - 告警规则：
    - 存储成本 > $5/月 → 发送Email
    - API成本 > $50/月 → 发送Slack通知
    - CDN回源率 > 30% → 检查缓存配置
- [ ] **优化效果报告**：
  - 每周生成优化报告（对比基线数据）
  - 包含：成本节省金额、优化项执行状态、下一步优化建议

#### 🧪 测试覆盖率（Test Coverage）
- [ ] **压缩质量测试**：
  - 使用VMAF/SSIM工具自动评估视频质量
  - 测试不同CRF值（20/23/25/28）的压缩效果
  - 选择最优参数（质量vs文件大小的平衡点）
- [ ] **CDN性能测试**：
  - 从全球5个区域测试视频加载速度
  - 验证缓存命中率（首次访问vs再次访问）
  - 模拟高并发访问（1000用户同时播放）
- [ ] **清理脚本测试**：
  - 在测试环境运行完整清理流程
  - 验证备份和恢复功能
  - 测试边界条件（0条记录、10000条记录）

#### 📖 文档完整性（Documentation Completeness）
- [ ] **FFmpeg压缩脚本**：
  ```bash
  #!/bin/bash
  # 视频压缩脚本
  INPUT=$1
  OUTPUT=$2
  CRF=25  # 质量参数（越小质量越高，文件越大）

  ffmpeg -i "$INPUT" \
    -c:v libx264 -crf $CRF -preset medium \
    -c:a aac -b:a 128k \
    -movflags +faststart \  # 优化在线播放
    "$OUTPUT"

  # 验证质量
  ffmpeg -i "$INPUT" -i "$OUTPUT" \
    -lavfi "[0:v][1:v]ssim=stats_file=ssim.log" -f null -
  ```
- [ ] **清理策略SQL**：
  ```sql
  -- 查询待清理视频（Dry-run）
  SELECT
    id,
    prompt,
    file_size_bytes,
    last_accessed_at,
    created_at
  FROM video_generation_history
  WHERE
    last_accessed_at < NOW() - INTERVAL '1 year'
    AND created_at < NOW() - INTERVAL '3 months'
    AND status = 'completed'
  ORDER BY last_accessed_at ASC
  LIMIT 100;

  -- 实际删除（需要备份后执行）
  UPDATE video_generation_history
  SET
    status = 'deleted',
    deleted_at = NOW(),
    permanent_video_url = NULL
  WHERE id IN (/* 上面查询的ID列表 */);
  ```
- [ ] **成本优化手册**：
  - 包含所有优化措施的详细步骤
  - ROI分析（投入vs收益）
  - 优化路线图（短期vs长期）

#### 🔄 兼容性（Compatibility）
- [ ] **编码兼容性**：
  - H.264编码兼容所有现代浏览器（Chrome, Firefox, Safari, Edge）
  - 移动端播放流畅（iOS/Android原生播放器支持）
- [ ] **CDN兼容性**：
  - 支持多种CDN提供商（Cloudflare, AWS CloudFront, Vercel Edge）
  - 自动检测用户地理位置，选择最近的CDN节点

---

## Verification Checklist

### Pre-Launch Checklist

**Infrastructure**:
- [ ] Database migrations deployed to production
- [ ] Supabase Storage bucket created and configured
- [ ] Environment variables set in Vercel
- [ ] Vercel Cron Jobs enabled and verified
- [ ] Redis/Upstash cache configured

**API Endpoints**:
- [ ] POST /api/generate-video tested and working
- [ ] GET /api/video/status/:taskId tested and working
- [ ] GET /api/video/history tested and working
- [ ] GET /api/cron/poll-video-operations tested and working

**Frontend**:
- [ ] Video generation form functional
- [ ] Video status page functional
- [ ] Video history page functional
- [ ] Navigation links updated

**Testing**:
- [ ] All unit tests passing (>85% coverage)
- [ ] All integration tests passing
- [ ] Manual testing completed (checklist)
- [ ] Load testing completed

**Documentation**:
- [ ] API documentation updated
- [ ] User guide published
- [ ] Admin guide published
- [ ] README updated

**Monitoring**:
- [ ] Vercel Analytics tracking video events
- [ ] Error tracking configured (Sentry/LogRocket)
- [ ] Alerts configured for critical metrics
- [ ] Dashboard created for monitoring

**Security**:
- [ ] API endpoints require authentication
- [ ] User isolation verified (can only access own videos)
- [ ] Content safety filters tested
- [ ] Rate limiting enforced

### Launch Day Checklist

**Pre-Launch (1 hour before)**:
- [ ] Final smoke test in production
- [ ] Verify all environment variables
- [ ] Check monitoring dashboards
- [ ] Alert admin team of launch

**Launch**:
- [ ] Enable feature for 10% users (beta)
- [ ] Monitor error rates and performance
- [ ] Test with real users
- [ ] Collect feedback

**Post-Launch (1 hour after)**:
- [ ] Check error logs
- [ ] Verify cron job running
- [ ] Check video generation success rate
- [ ] Monitor storage usage

**Gradual Rollout**:
- [ ] Day 1: 10% users
- [ ] Day 3: 50% users
- [ ] Day 7: 100% users (full launch)

### Success Criteria

- ✅ 95%+ video generation success rate
- ✅ <5% refund rate
- ✅ <2% download failure rate
- ✅ Average generation time <3 minutes
- ✅ User satisfaction >4.5/5
- ✅ No critical incidents in first week

---

## Risk Mitigation

### Risk 1: Veo API Downtime

**Mitigation**:
- Display maintenance message to users
- Queue requests for retry when API recovers
- Provide status updates via dashboard

### Risk 2: Supabase Storage Quota Exceeded

**Mitigation**:
- Monitor storage usage daily
- Alert when usage >80%
- Implement video cleanup policy
- Purchase additional quota proactively

### Risk 3: High Refund Rate

**Mitigation**:
- Analyze failure reasons
- Improve prompt validation
- Add prompt examples and templates
- Optimize timeout settings

### Risk 4: Poor Video Quality

**Mitigation**:
- Provide prompt writing tips
- Implement preview feature (future)
- Allow regeneration at discounted rate
- Collect user feedback

---

## Post-Launch Improvements

### Week 1:
- [ ] Monitor all metrics
- [ ] Fix critical bugs
- [ ] Collect user feedback
- [ ] Optimize performance based on real usage

### Month 1:
- [ ] Implement video extension feature
- [ ] Add reference image support
- [ ] Improve prompt suggestions
- [ ] Add video thumbnails

### Month 3:
- [ ] Implement batch generation
- [ ] Add template library
- [ ] Implement basic video editing
- [ ] Add social media export

---

## Dependencies Summary

### External Dependencies:
- Google Veo 3.1 API (must have access)
- Vercel Pro plan (for Cron Jobs)
- Supabase Storage (sufficient quota)
- Redis/Upstash (for config caching)

### Internal Dependencies:
- Existing credit system (working)
- Existing authentication (Supabase Auth)
- Existing admin backend (config management)

### Team Dependencies:
- Backend Engineer (40 hours)
- Frontend Engineer (20 hours)
- QA Engineer (10 hours)
- Technical Writer (8 hours)
- DevOps (5 hours)

**Total Effort**: ~83 hours (~14 working days for single developer)

---

## Rollback Plan

If critical issues arise after launch:

1. **Immediate**: Set `video_generation_enabled = false` in system_configs
2. **Communicate**: Display maintenance message to users
3. **Investigate**: Analyze logs and error reports
4. **Fix**: Deploy fix to staging, test thoroughly
5. **Re-enable**: Gradual rollout (10% → 50% → 100%)

Rollback should complete within 5 minutes if needed.

---

## Success Metrics (Week 1)

**Usage**:
- Target: 50+ videos generated
- Target: 10+ daily active users

**Quality**:
- Target: >95% success rate
- Target: <5% refund rate
- Target: <2% download failures

**Performance**:
- Target: API response <200ms (P95)
- Target: Average generation time <3 minutes
- Target: Cron execution <10 seconds

**Business**:
- Target: $100+ revenue
- Target: 50%+ profit margin
- Target: 4.5+ user satisfaction

---

## Next Steps After Completion

1. Review this task list with team
2. Assign owners to each task
3. Create tracking board (Jira/Linear/GitHub Projects)
4. Schedule daily standups during implementation
5. Begin Phase 1 infrastructure setup

**Questions?** Contact project lead or technical architect.
