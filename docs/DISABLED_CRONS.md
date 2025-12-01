# 已禁用的 Cron Jobs

## 说明

由于 Vercel 免费计划限制（最多2个cron jobs），以下cron jobs已被禁用。如需启用，请升级到付费计划或改为手动/webhook触发。

## 当前启用的 Cron Jobs（2个）

1. **activate-monthly-credits**
   - 路径: `/api/cron/activate-monthly-credits`
   - 时间: `0 0 * * *`（每天凌晨00:00）
   - 说明: 激活月度订阅积分

2. **activate-pending-subscriptions**
   - 路径: `/api/cron/activate-pending-subscriptions`
   - 时间: `0 1 * * *`（每天凌晨01:00）
   - 说明: 激活待处理的订阅

## 已禁用的 Cron Jobs（3个）

### 1. refill-credits
- **路径**: `/api/cron/refill-credits`
- **原计划时间**: `0 2 * * *`（每天凌晨02:00）
- **禁用原因**: 可合并到 `activate-monthly-credits` 逻辑中
- **替代方案**: 在 `activate-monthly-credits` API中添加补充积分逻辑

### 2. check-success-rate
- **路径**: `/api/cron/check-success-rate`
- **原计划时间**: `0 2 * * *`（每天凌晨02:00）
- **禁用原因**: 改为手动运行或用户触发
- **替代方案**:
  - 手动访问 `/api/cron/check-success-rate` 触发检查
  - 或通过管理后台按钮触发

### 3. distribute-challenge-prizes
- **路径**: `/api/cron/distribute-challenge-prizes`
- **原计划时间**: `0 * * * *`（每小时执行一次）
- **禁用原因**: 频率太高，改为手动发放或webhook触发
- **替代方案**:
  - 挑战结束时手动触发奖励发放
  - 使用 webhook 在特定事件发生时触发
  - 或通过管理后台手动发放奖励

## 如何重新启用

如果需要重新启用这些cron jobs，有以下几种方案：

### 方案1：升级到 Vercel Pro 计划
- Pro 计划支持更多 cron jobs
- 在 `vercel.json` 的 `crons` 数组中添加对应配置

### 方案2：使用外部 Cron 服务
- 使用 [cron-job.org](https://cron-job.org)
- 使用 GitHub Actions
- 使用 Cloudflare Workers

### 方案3：合并逻辑
- 将多个cron job的逻辑合并到现有的2个cron中
- 通过参数或查询字符串区分不同任务

### 方案4：改为事件驱动
- 使用 Webhook 触发
- 使用用户操作触发
- 使用管理后台手动触发

## 维护记录

- **2025-12-01**: 创建此文档，记录禁用的3个cron jobs
- 原配置已从 `vercel.json` 移除以符合 schema 验证要求
