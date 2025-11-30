# 🚀 Quick Start Guide - Video Generation Feature Implementation

**Purpose**: 下次启动时快速恢复工作状态并开始实施

**Last Updated**: 2025-11-18 01:20 (环境变量统一为 GOOGLE_AI_API_KEY)
**Current Phase**: ✅ Documentation Complete → Ready for Implementation

---

## 📂 文件位置

```bash
项目根目录: /Users/kening/biancheng/nanobanana-clone

Feature归档目录:
/Users/kening/biancheng/nanobanana-clone/openspec/changes/archive/2025-11-17-add-veo-video-generation/

核心文件:
├── TASKS-DETAILED.md         # 主索引 (必读！)
├── implementation-plan.md     # 高层架构
├── QUICK-START.md            # 本文件
├── tasks/
│   ├── STATUS.md             # 详细状态
│   └── stage*.md             # 22个详细任务文件
```

---

## ⚡ 30秒快速恢复

### 1. 打开主文档
```bash
cd /Users/kening/biancheng/nanobanana-clone
open openspec/changes/archive/2025-11-17-add-veo-video-generation/TASKS-DETAILED.md
```

### 2. 查看当前状态
```bash
cat openspec/changes/archive/2025-11-17-add-veo-video-generation/tasks/STATUS.md
```

### 3. 开始实施（如果环境已准备好）
```bash
# 创建feature分支（如果还没创建）
git checkout -b feature/veo-video-generation

# 开始Stage 1, Task 1.1
# 代码在 TASKS-DETAILED.md 第19-211行
```

---

## 📋 实施检查清单

### ⚠️ 开始前必须确认

- [ ] **Google Veo API Key** 已获取并配置
- [ ] **Supabase项目** 已创建（生产环境）
- [ ] **Vercel账号** 可用（需要Pro计划用于Cron Jobs）
- [ ] **开发环境** 正常运行 (`pnpm dev` 无报错)
- [ ] **Git状态** 干净 (`git status` 无未提交更改)

### 环境变量准备

创建 `.env.local` 并添加：
```bash
# Google AI API (统一的 API Key，图片和视频共用)
GOOGLE_AI_API_KEY=your_api_key_here

# Supabase (应该已存在)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Vercel Cron Secret
CRON_SECRET=$(openssl rand -base64 32)
```

---

## 🎯 实施顺序

### Stage 1: Database & Infrastructure (必须先完成)

**位置**: TASKS-DETAILED.md 第19-625行

1. ✅ Task 1.1: 创建 `video_generation_history` 表
2. ✅ Task 1.2: 扩展 `credit_transactions` 表
3. ✅ Task 1.3: 添加视频配置到 `system_configs`
4. ✅ Task 1.4: 创建Supabase Storage bucket
5. ✅ Task 1.5: 配置环境变量

**验证命令**:
```bash
# 运行数据库迁移
supabase db push

# 验证表创建成功
psql $DATABASE_URL -c "\d video_generation_history"
```

### Stage 2: Backend API (核心逻辑)

**位置**:
- Task 2.1: TASKS-DETAILED.md 第629-907行
- Task 2.2-2.8: 独立文件 `tasks/stage2-task2.*.md`

**关键任务**:
1. Task 2.1: Veo Client实现 (API调用封装)
2. Task 2.2: VideoService (业务逻辑)
3. Task 2.4: API端点 (POST /generate, GET /status)
4. Task 2.5: Vercel Cron轮询作业 (每2分钟)
5. Task 2.6: 自动下载作业 (每1分钟)

### Stage 3-5: 前端、管理、测试

**位置**: 所有任务使用独立文件 `tasks/stage*.md`

**按主文档顺序执行** → 点击链接跳转到详细文件

---

## 🔥 关键技术点提醒

### 1. Credit定价公式
```typescript
credits = duration × 10 × (resolution === '1080p' ? 1.5 : 1.0)

// 示例：
// 4s @ 720p  = 4 × 10 × 1.0 = 40 credits
// 6s @ 1080p = 6 × 10 × 1.5 = 90 credits
```

### 2. Google Veo API成本
- **$0.75 per second** of generated video
- 生成时间：11秒 - 6分钟
- 视频URL有效期：**2天**（必须下载到Supabase Storage）

### 3. 并发限制
- 每用户最多 **3个并发** 视频生成任务
- 通过数据库查询 `status IN ('processing', 'downloading')` 检查

### 4. 错误处理策略
- **Deduct-First, Refund-Later**：先扣费，失败后退款
- 下载失败：最多重试 **3次**，间隔30秒
- 安全过滤器触发：自动退款并标记错误

---

## 📊 进度追踪方式

### 方法1: 在TASKS-DETAILED.md中勾选
```markdown
- [x] Task 1.1 completed  ← 完成后勾选
- [ ] Task 1.2 pending     ← 未完成
```

### 方法2: 更新STATUS.md
```markdown
**Current Stage**: Stage 2, Task 2.3
**Last Completed**: Task 2.2 (VideoService)
**Blockers**: None
```

### 方法3: Git提交记录
```bash
git commit -m "feat(video): complete Task 2.2 - VideoService implementation"
```

---

## 🚨 常见坑点预警

1. **Supabase RLS策略**
   - Service role可以绕过RLS
   - 用户只能看到自己的视频
   - Cron jobs必须使用service role key

2. **Vercel Cron Jobs**
   - 本地开发无法测试cron（需要部署到Vercel）
   - 必须添加 `CRON_SECRET` 防止未授权访问
   - Cron job路径：`/api/cron/poll-video-status`

3. **Google Veo视频URL过期**
   - 2天后失效，必须立即下载
   - 下载失败后无法恢复（需要退款给用户）

4. **类型安全**
   - 所有API使用TypeScript严格类型
   - Zod schema验证所有用户输入

---

## 📖 推荐阅读顺序

第一次实施建议按此顺序阅读：

1. **TASKS-DETAILED.md** (主索引) - 了解整体结构
2. **implementation-plan.md** - 理解架构设计
3. **tasks/stage2-task2.2.md** (VideoService) - 核心业务逻辑
4. **tasks/stage2-task2.4.md** (API端点) - API设计
5. **tasks/stage3-task3.1.md** (表单组件) - 前端交互

---

## ✅ 完成标志

当所有以下条件满足时，功能开发完成：

- [ ] 所有28个任务的 Acceptance Criteria 全部通过
- [ ] E2E测试全部通过 (Stage 5, Task 5.1)
- [ ] Lighthouse性能评分 >= 90 (Stage 5, Task 5.2)
- [ ] Sentry错误监控已配置 (Stage 5, Task 5.3)
- [ ] 文档已更新 (Stage 5, Task 5.4)
- [ ] 已部署到生产环境并验证

---

## 🎉 下次启动时

**只需3步**：

```bash
# 1. 打开主文档
open openspec/changes/archive/2025-11-17-add-veo-video-generation/TASKS-DETAILED.md

# 2. 检查环境
pnpm dev

# 3. 开始实施
# 从当前未完成的任务开始，按顺序执行
```

---

**备注**：所有代码都是 **copy-paste ready**，直接复制到对应文件即可运行（需要先配置环境变量）

**估计时间**：14个工作日（112小时）- 可根据实际进度调整

**问题反馈**：遇到问题时，检查对应任务文件的 "Verification Steps" 和 "Troubleshooting" 部分
