# 开发环境脚本

## 视频状态轮询脚本（dev-poll-video-status.sh）

### 🔥 问题背景

在本地开发环境中，Vercel Cron任务不会自动运行。这导致：

1. **视频生成后状态卡住**：Google Veo API已经生成好视频，但数据库状态一直是`processing`
2. **前端无限轮询**：前端每10秒轮询一次`/api/v1/video/status/{taskId}`，但数据库状态永远不更新
3. **用户看不到视频**：即使视频已经生成成功，用户也看不到（因为数据库status='processing'）

### 💡 解决方案

在本地开发环境中，需要**手动触发Cron任务**来检查视频状态、下载视频并更新数据库。

### 📝 使用方法

#### 方式1：使用脚本（推荐）

```bash
# 在项目根目录执行
bash scripts/dev-poll-video-status.sh
```

脚本会：
1. ✅ 自动读取`.env.local`中的`CRON_SECRET`
2. ✅ 检查Next.js dev server是否运行
3. ✅ 调用Cron接口处理所有待处理任务
4. ✅ 显示彩色的执行结果（总计/已完成/已失败/处理中）

#### 方式2：手动调用API

```bash
# 从.env.local读取CRON_SECRET
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2)

# 调用Cron接口
curl -X GET "http://localhost:3000/api/cron/poll-video-status" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 🎯 典型使用场景

#### 场景1：视频生成后一直显示"处理中"

**症状**：
- 前端显示"处理中"超过5分钟
- 历史记录里看不到视频

**解决**：
```bash
bash scripts/dev-poll-video-status.sh
```

执行后，脚本会：
1. 检查Google Veo API的任务状态
2. 如果已完成：下载视频 → 上传到Supabase → 更新数据库status='completed'
3. 如果失败：标记为failed → 自动退款
4. 如果超时（>10分钟）：标记为failed → 自动退款

#### 场景2：开发过程中定期检查

**建议**：
- 每次生成视频后等待1-2分钟
- 执行脚本检查状态
- 刷新前端页面查看结果

### ⚙️ Cron任务工作原理

#### 生产环境（Vercel）

```
vercel.json配置:
{
  "path": "/api/cron/poll-video-status",
  "schedule": "* * * * *"  // 每分钟执行一次
}
```

#### 本地开发环境

- ❌ Vercel Cron不运行
- ✅ 需要手动执行脚本

### 🔍 Cron任务执行逻辑

1. **查询待处理任务**：status='processing' 或 'downloading'
2. **调用Google Veo API**：检查每个任务的实际状态
3. **根据状态处理**：
   - ✅ **已完成**：标记downloading → 触发下载任务 → 上传Supabase → status='completed'
   - ❌ **失败**：status='failed' → 自动退款积分
   - ⏳ **处理中**：继续等待
   - ⏰ **超时（>10分钟）**：status='failed' → 自动退款

### 🚨 常见错误

#### 错误1：CRON_SECRET_MISSING

```
❌ .env.local 文件不存在！
❌ CRON_SECRET 未配置！
```

**解决**：
1. 复制 `.env.local.example` 为 `.env.local`
2. 配置 `CRON_SECRET`（可以是任意长字符串）

#### 错误2：Next.js dev server未运行

```
❌ Next.js dev server 未运行！请先执行 pnpm dev
```

**解决**：
```bash
pnpm dev  # 先启动dev server
```

#### 错误3：HTTP 401 Unauthorized

```
❌ Cron任务执行失败 (HTTP 401)
```

**解决**：
1. 检查 `.env.local` 中的 `CRON_SECRET` 是否正确
2. 重启 Next.js dev server

### 📊 执行结果示例

```
🔥 老王的本地Cron任务模拟器
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CRON_SECRET 已加载
✅ Next.js dev server 正在运行

⏳ 触发Cron任务: /api/cron/poll-video-status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 响应结果:
{
  "success": true,
  "message": "Cron job completed",
  "results": {
    "total": 3,
    "completed": 3,
    "failed": 0,
    "still_processing": 0,
    "errors": []
  },
  "duration_ms": 26788
}

✅ Cron任务执行成功 (HTTP 200)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 任务统计:
  总计:     3
  已完成:   3
  已失败:   0
  处理中:   0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 完成！现在可以刷新前端页面查看视频了
```

### 💰 积分退款说明

#### 什么情况会退款？

1. **Google Veo API失败**：任务status='failed'
2. **超时（>10分钟）**：任务创建后10分钟仍未完成

#### 退款金额

- 按照原始扣除金额全额退款
- 4秒720p = 40积分
- 4秒1080p = 60积分

#### 防止重复退款

- 每个任务只会退款一次
- 退款记录存储在 `credit_transactions` 表
- transaction_type='video_refund'

### 🎓 最佳实践

#### 开发流程建议

```bash
# 1. 启动dev server
pnpm dev

# 2. 创建视频任务（通过前端或API）
# ...

# 3. 等待1-2分钟

# 4. 手动触发Cron检查状态
bash scripts/dev-poll-video-status.sh

# 5. 刷新前端页面查看结果
```

#### 定时自动检查（可选）

如果需要自动定期检查（类似生产环境），可以使用 `watch` 命令：

```bash
# 每60秒自动执行一次（需要先安装watch: brew install watch）
watch -n 60 bash scripts/dev-poll-video-status.sh
```

**注意**：
- 这会一直运行，需要手动Ctrl+C停止
- 仅用于开发调试，生产环境使用Vercel Cron

---

**老王提示**：艹，这个脚本救了老王多少次了！每次视频卡住就跑一遍，立马搞定！
