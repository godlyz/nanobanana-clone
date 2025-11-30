# 🔥 视频生成成功率监控系统

**创建时间**: 2025-11-23
**负责人**: 老王
**状态**: ✅ 已完成实现
**目标**: 确保视频生成成功率 ≥ 95%

---

## 📋 概述

本系统实时监控视频生成成功率，提供多时间段统计分析和智能告警功能。

**核心功能**:
- ✅ 多时间段成功率统计（1小时、24小时、7天、30天）
- ✅ 失败原因自动分析（Top错误码统计）
- ✅ 四级告警系统（OK/WARNING/CRITICAL/EMERGENCY）
- ✅ 管理员仪表板API
- ✅ 定时检查脚本（可配置Cron）

**告警规则**:
| 成功率 | 告警级别 | 说明 |
|-------|---------|------|
| ≥95% | ✅ OK | 系统运行正常 |
| 90%-95% | ⚠️ WARNING | 需要关注 |
| 85%-90% | ⛔ CRITICAL | 需要立即处理 |
| <85% | 🚨 EMERGENCY | 紧急情况 |

---

## 🛠️ 核心文件

1. **监控服务**: `lib/video-success-rate-monitor.ts`
   - `VideoSuccessRateMonitor` 类
   - 成功率统计、失败分析、告警检查

2. **管理员API**: `app/api/admin/success-rate/route.ts`
   - GET `/api/admin/success-rate`
   - 仅管理员可访问

3. **定时检查脚本**: `scripts/check-video-success-rate.ts`
   - 可通过Cron定期运行
   - 输出详细报告并发送告警

---

## 💻 使用方式

### 1. 在代码中使用

```typescript
import {
  getSuccessRateReport,
  checkSystemHealth
} from '@/lib/video-success-rate-monitor'

// 获取完整成功率报告
const report = await getSuccessRateReport()

console.log('最近24小时统计:')
console.log('  总请求:', report.stats.last24Hours.totalRequests)
console.log('  成功率:', report.stats.last24Hours.successRate, '%')
console.log('  告警级别:', report.stats.last24Hours.alertLevel)

// 检查失败原因
if (report.failureBreakdown.length > 0) {
  console.log('\nTop失败原因:')
  report.failureBreakdown.slice(0, 3).forEach(failure => {
    console.log(`  ${failure.errorCode}: ${failure.count}次 (${failure.percentage}%)`)
  })
}

// 查看智能建议
console.log('\n建议:')
report.recommendations.forEach(rec => console.log(`  ${rec}`))

// 快速检查系统健康状态
const isHealthy = await checkSystemHealth()
if (!isHealthy) {
  console.log('⚠️ 警告：24小时成功率低于95%')
}
```

### 2. 通过管理员API查询

**请求**:
```bash
curl -X GET http://localhost:3000/api/admin/success-rate \
  -H "Cookie: <session-cookie>"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "last1Hour": {
        "timeRange": "1h",
        "totalRequests": 45,
        "successfulRequests": 43,
        "failedRequests": 2,
        "successRate": 95.56,
        "alertLevel": "OK",
        "timestamp": "2025-11-23T10:00:00Z"
      },
      "last24Hours": {
        "timeRange": "24h",
        "totalRequests": 1024,
        "successfulRequests": 980,
        "failedRequests": 44,
        "successRate": 95.7,
        "alertLevel": "OK",
        "timestamp": "2025-11-23T10:00:00Z"
      },
      "last7Days": { /* ... */ },
      "last30Days": { /* ... */ }
    },
    "failureBreakdown": [
      {
        "errorCode": "VEO_API_TIMEOUT",
        "errorMessage": "Google Veo API request timed out",
        "count": 25,
        "percentage": 56.82
      },
      {
        "errorCode": "INSUFFICIENT_CREDITS",
        "errorMessage": "Insufficient credits for video generation",
        "count": 10,
        "percentage": 22.73
      },
      {
        "errorCode": "DATABASE_ERROR",
        "errorMessage": "Database query failed",
        "count": 9,
        "percentage": 20.45
      }
    ],
    "recommendations": [
      "✅ 最近7天成功率达标，系统运行良好"
    ]
  },
  "timestamp": "2025-11-23T10:00:00Z"
}
```

### 3. 运行定时检查脚本

**手动运行**:
```bash
pnpm tsx scripts/check-video-success-rate.ts
```

**输出示例**:
```
🔍 开始检查视频成功率...

检查时间: 2025-11-23T10:00:00.000Z

📊 成功率统计:

  最近1小时:
    总请求: 45
    成功: 43
    失败: 2
    成功率: 95.56%
    告警级别: OK

  最近24小时:
    总请求: 1024
    成功: 980
    失败: 44
    成功率: 95.7%
    告警级别: OK

  最近7天:
    总请求: 5420
    成功: 5180
    失败: 240
    成功率: 95.57%
    告警级别: OK

  最近30天:
    总请求: 18560
    成功: 17732
    失败: 828
    成功率: 95.54%
    告警级别: OK

🔍 失败原因分析（Top 5）:

  1. VEO_API_TIMEOUT
     消息: Google Veo API request timed out
     数量: 25 (56.82%)

  2. INSUFFICIENT_CREDITS
     消息: Insufficient credits for video generation
     数量: 10 (22.73%)

  3. DATABASE_ERROR
     消息: Database query failed
     数量: 9 (20.45%)

💡 建议:

  ✅ 最近7天成功率达标，系统运行良好

✅ [OK] 视频成功率正常: 95.7 %

✅ 系统健康：24小时成功率≥95%
```

### 4. 配置定时任务（Cron）

**本地 Cron（示例）**  

**每小时检查一次**:
```bash
# 编辑crontab
crontab -e

# 添加以下行（每小时第0分钟运行）
0 * * * * cd /path/to/nanobanana-clone && pnpm tsx scripts/check-video-success-rate.ts >> /var/log/success-rate-check.log 2>&1
```

**每30分钟检查一次**:
```bash
*/30 * * * * cd /path/to/nanobanana-clone && pnpm tsx scripts/check-video-success-rate.ts >> /var/log/success-rate-check.log 2>&1
```

**每天上午9点检查一次**:
```bash
0 9 * * * cd /path/to/nanobanana-clone && pnpm tsx scripts/check-video-success-rate.ts >> /var/log/success-rate-check.log 2>&1
```

**Vercel Cron（生产环境，免费版限制：每日一次）**:

1) 在 `vercel.json` 中已添加定时任务（每日 02:00 UTC 执行一次）：
```json
{
  "path": "/api/cron/check-success-rate",
  "schedule": "0 2 * * *"
}
```

2) API：`GET /api/cron/check-success-rate`  
   - 认证：`Authorization: Bearer <CRON_SECRET>`  
   - 返回：24h 成功率、告警级别、Top5 失败原因、建议列表  
   - 成功率 <95% 时返回 `202`，便于外部告警。

3) 环境变量：在 Vercel Dashboard 设置 `CRON_SECRET`（本地放 `.env.local`）。

4) 如果需要按小时检查且保持免费版，可用 **GitHub Actions / cron-job.org** 等外部定时器定时 `curl` 该接口。仓库已提供 GitHub Actions 示例：`.github/workflows/check-success-rate.yml`（需在仓库 Secrets 配置 `CRON_ENDPOINT` 与 `CRON_SECRET`）。

---

## 📊 成功率报告结构

### SuccessRateStats（单个时间段统计）

```typescript
interface SuccessRateStats {
  timeRange: '1h' | '24h' | '7d' | '30d';  // 时间范围
  totalRequests: number;                    // 总请求数
  successfulRequests: number;               // 成功数
  failedRequests: number;                   // 失败数
  successRate: number;                      // 成功率（0-100）
  alertLevel: 'OK' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  timestamp: string;                        // 统计时间
}
```

### FailureBreakdown（失败原因分析）

```typescript
interface FailureBreakdown {
  errorCode: string;        // 错误码
  errorMessage: string;     // 错误消息
  count: number;            // 失败次数
  percentage: number;       // 占所有失败的百分比
}
```

### SuccessRateReport（完整报告）

```typescript
interface SuccessRateReport {
  stats: {
    last1Hour: SuccessRateStats;
    last24Hours: SuccessRateStats;
    last7Days: SuccessRateStats;
    last30Days: SuccessRateStats;
  };
  failureBreakdown: FailureBreakdown[];  // 失败原因（按数量降序）
  recommendations: string[];              // 智能建议
}
```

---

## 🔍 常见问题排查

### 成功率突然下降怎么办？

1. **查看失败原因分析**:
   ```bash
   pnpm tsx scripts/check-video-success-rate.ts
   ```

2. **根据Top错误码采取行动**:

   | 错误码 | 可能原因 | 解决方案 |
   |-------|---------|---------|
   | `VEO_API_TIMEOUT` | Google Veo API超时 | 检查API配额、增加超时时间 |
   | `VEO_API_UNAVAILABLE` | Veo服务不可用 | 检查Google Cloud状态页面 |
   | `DATABASE_ERROR` | 数据库连接失败 | 检查Supabase连接 |
   | `INSUFFICIENT_CREDITS` | 用户积分不足 | 正常业务错误，无需处理 |
   | `CONCURRENT_LIMIT_EXCEEDED` | 并发超限 | 检查并发限制配置 |

3. **查看详细日志**:
   ```bash
   # 如果设置了Cron任务
   tail -f /var/log/success-rate-check.log
   ```

### 如何设置告警通知？

在 `lib/video-success-rate-monitor.ts` 的 `checkAndSendAlert()` 方法中添加：

```typescript
async checkAndSendAlert(): Promise<void> {
  const stats24h = await this.getSuccessRateStats(24);

  if (stats24h.alertLevel === 'EMERGENCY') {
    console.error('🚨 [EMERGENCY] 视频成功率严重下降:', stats24h.successRate, '%');

    // TODO: 发送紧急告警
    // await sendEmail({
    //   to: 'admin@example.com',
    //   subject: '[紧急] 视频成功率严重下降',
    //   body: `当前成功率: ${stats24h.successRate}%`
    // });

    // await sendSMS({
    //   phone: '+1234567890',
    //   message: `紧急：视频成功率${stats24h.successRate}%`
    // });
  }
  // ... 其他告警级别
}
```

---

## ✅ 完成检查清单

- [x] VideoSuccessRateMonitor 类实现
- [x] 多时间段统计（1h/24h/7d/30d）
- [x] 失败原因分析
- [x] 四级告警系统
- [x] 管理员API端点
- [x] 定时检查脚本
- [x] 完整文档
- [ ] 告警通知集成（邮件/短信）- 需要手动配置
- [ ] Grafana仪表板集成（可选）

---

## 📚 参考资源

- [视频生成服务文档](./lib/video-service.ts)
- [视频历史表结构](./supabase/migrations/*video_generation_history*)
- [错误码定义](./lib/video-error-codes.ts)

---

**🔥 老王总结：这套成功率监控系统能实时追踪视频生成质量，自动分析失败原因，并提供智能建议。建议配置Cron每小时运行一次检查脚本，确保系统稳定运行在95%+成功率！**
