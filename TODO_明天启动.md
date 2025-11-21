# 🔥 明天启动提示 - 订阅调整模式测试

**日期**: 2025-11-10
**上次工作**: 2025-11-09（遇到数据库RPC函数问题，已创建修复迁移）

---

## ⚡ 第一件事：验证修复结果

### ✅ 步骤1：执行 Supabase RPC 更新迁移（已完成）

**文件**：`supabase/migrations/20251109000002_update_rpc_add_downgrade_fields.sql`

**状态**：✅ **已执行成功**（2025-11-09 23:xx）

---

### 步骤2：验证修复结果（首要任务）

**刷新页面**：`http://localhost:3000/profile`

**浏览器控制台执行**：
```javascript
const response = await fetch('/api/subscription/status')
const data = await response.json()

console.log('=== 降级标记验证 ===')
console.log('降级目标套餐:', data.subscription?.downgrade_to_plan)
console.log('降级计费周期:', data.subscription?.downgrade_to_billing_cycle)
console.log('调整模式:', data.subscription?.adjustment_mode)
console.log('剩余天数:', data.subscription?.remaining_days)
```

**预期结果**：
```
降级目标套餐: "basic"
降级计费周期: "monthly"
调整模式: "scheduled"
剩余天数: 352
```

✅ **如果验证通过**：继续步骤3
❌ **如果验证失败**：查看 `WORK_LOG_2025-11-09.md` 的问题排查清单

---

### 步骤3：继续手动测试（验证通过后）

**参考文件**：`TEST_REPORT_SUBSCRIPTION_ADJUSTMENT.md`

**待完成场景**（共9个，已完成0个）：
- ⏳ 场景 2.4: 降级 Scheduled（已执行API，待验证数据）
- ⏳ 场景 1.1: 升级 Immediate（月付 → 月付）
- ⏳ 场景 1.2: 升级 Scheduled（月付 → 年付）
- ⏳ 场景 1.3: 升级 Immediate（年付 → 年付）
- ⏳ 场景 1.4: 升级 Scheduled（月付 → 月付）
- ⏳ 场景 2.1: 降级 Immediate（Pro → Basic）
- ⏳ 场景 2.2: 降级 Scheduled（Max → Pro）
- ⏳ 场景 2.3: 降级 Immediate（年付 → 月付）
- ⏳ 场景 3.1-3.3: 边界情况

**测试工具**：
- SQL查询：`scripts/test-subscription-queries.sql`
- 浏览器脚本：`scripts/test-subscription-browser-console.js`

---

## 📝 相关文档

- **工作日志**：`WORK_LOG_2025-11-09.md` - 详细记录今天的问题和修复
- **测试报告**：`TEST_REPORT_SUBSCRIPTION_ADJUSTMENT.md` - 测试结果记录
- **迁移文件**：
  - `supabase/migrations/20251109000001_add_adjustment_mode_fields.sql` - ✅ 已执行
  - `supabase/migrations/20251109000002_update_rpc_add_downgrade_fields.sql` - ⏳ 待执行

---

## 🐛 已知低优先级问题（不影响主线）

1. Next.js Metadata 警告（viewport/themeColor）
2. Radix UI 水合错误（DropdownMenuTrigger ID不匹配）

**修复时机**：主线测试全部通过后

---

## 🎯 今天的目标

- [ ] 解除测试阻塞（执行RPC迁移）
- [ ] 验证降级数据返回
- [ ] 完成至少5个测试场景
- [ ] 填写测试报告

---

**加油！老王相信你能搞定这些SB问题！**
