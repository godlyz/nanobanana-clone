# ADR-003: 订阅升级积分冻结逻辑

**状态**: 已实施 ✅
**日期**: 2025-11-09
**决策者**: 技术团队 + 产品团队
**关联Issue**: Subscription System Refactoring
**相关文档**: `docs/archived/work-logs-2025-11/ISSUES_2025-11-11.md`

---

## 背景 (Context)

### 问题描述

**场景**: 用户从 Basic 月付升级到 Pro 年付

**漏洞**:
1. 用户购买 Basic 月付（100 积分，30 天有效期）
2. 使用 50 积分后，剩余 50 积分
3. 立即升级到 Pro 年付（2000 积分/年）
4. **问题**: 旧的 Basic 订阅还有 20 天过期，剩余 50 积分仍可使用
5. 用户可以重复"购买 → 使用一半 → 升级"，无限囤积积分

**财务影响**:
- 用户可以用月付价格获得远超套餐的积分
- 估算损失：约 30% 的订阅收入

### 业务需求

产品团队要求：
1. **升级时冻结旧订阅剩余积分**，防止囤积
2. **降级时自动解冻**，保护用户权益
3. **过期时自动解冻**，避免积分永久冻结

---

## 决策 (Decision)

**实施订阅升级时的积分冻结机制**

### 核心逻辑

#### 1. 升级检测规则

| 操作 | 判断标准 | 是否冻结旧订阅 |
|------|----------|---------------|
| 升级 | `新套餐价格 > 旧套餐价格` | ✅ 是 |
| 降级 | `新套餐价格 < 旧套餐价格` | ❌ 否（旧订阅保持冻结） |
| 续费 | `新套餐 == 旧套餐` | ❌ 否 |

**套餐价格表**:
```
Basic 月付: $9.99
Basic 年付: $99.99 ($8.33/月)
Pro 月付: $29.99
Pro 年付: $299.99 ($25/月)
Max 月付: $59.99
Max 年付: $599.99 ($50/月)
```

#### 2. 冻结流程（Webhook 处理）

```typescript
// app/api/webhooks/creem/route.ts

async function handleCheckoutCompleted(eventData: any) {
  const { userId, plan, billing } = eventData.metadata

  // 1. 查询当前活跃订阅
  const activeSubscriptions = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_frozen', false)
    .gt('expires_at', new Date().toISOString())

  // 2. 判断是否升级
  const newPrice = getPlanPrice(plan, billing)
  const oldSubscription = activeSubscriptions[0]

  if (oldSubscription) {
    const oldPrice = getPlanPrice(oldSubscription.plan_type, oldSubscription.billing_cycle)

    if (newPrice > oldPrice) {
      // 3. 冻结旧订阅
      await supabase
        .from('subscriptions')
        .update({
          is_frozen: true,
          freeze_start_time: new Date().toISOString()
        })
        .eq('id', oldSubscription.id)

      // 4. 冻结关联积分
      await supabase
        .from('credits')
        .update({
          frozen_amount: supabase.raw('remaining_amount')
        })
        .eq('subscription_id', oldSubscription.id)
    }
  }

  // 5. 创建新订阅和积分
  // ...
}
```

#### 3. 解冻规则

**自动解冻触发条件**:
1. **旧订阅到期**: `expires_at < NOW()`
2. **新订阅取消/过期**: 用户降级或取消订阅

**解冻流程**:
```sql
-- 数据库定时任务（每小时执行）
CREATE OR REPLACE FUNCTION auto_unfreeze_expired_subscriptions()
RETURNS void AS $$
BEGIN
  -- 解冻已过期的订阅
  UPDATE credits
  SET frozen_amount = 0
  WHERE subscription_id IN (
    SELECT id FROM subscriptions
    WHERE is_frozen = true
      AND expires_at < NOW()
  );

  -- 更新订阅状态
  UPDATE subscriptions
  SET is_frozen = false
  WHERE is_frozen = true
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

#### 4. 可用积分计算

```typescript
// lib/credit-service.ts

function getAvailableCredits(userId: string): number {
  // 查询所有未过期的积分
  const credits = await supabase
    .from('credits')
    .select('remaining_amount, frozen_amount')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  // 计算可用积分 = 剩余积分 - 冻结积分
  return credits.reduce((sum, c) => {
    return sum + (c.remaining_amount - c.frozen_amount)
  }, 0)
}
```

---

## 备选方案 (Alternatives Considered)

### 方案 A: 升级时直接删除旧积分
- **优点**: 实现简单，无冻结/解冻逻辑
- **缺点**: 用户损失已支付的剩余积分，投诉风险高
- **结论**: ❌ 不可行（用户体验极差）

### 方案 B: 升级时退款旧订阅剩余金额
- **优点**: 用户无损失，退款后重新购买
- **缺点**:
  - 退款流程复杂（需对接 Creem 退款 API）
  - 税务处理麻烦
  - 用户可能误解为"取消订阅"
- **结论**: ⏸️ 延后，当前业务量不足以支撑复杂退款系统

### 方案 C: 冻结逻辑（当前方案）
- **优点**:
  - 保护用户权益（过期后自动解冻）
  - 防止漏洞滥用
  - 实现简单，易于测试
- **缺点**:
  - 需要额外的数据库字段（`is_frozen`, `freeze_start_time`）
  - 需要定时任务处理解冻
- **结论**: ✅ **当前方案**

### 方案 D: 积分叠加但限制使用速率
- **优点**: 用户感知好（积分叠加）
- **缺点**: 无法防止囤积，只是延缓滥用
- **结论**: ❌ 治标不治本

---

## 取舍理由 (Rationale)

### 为什么选择冻结方案？

1. **业务合理性**:
   - 用户购买高价套餐 = 享受更高权益
   - 旧套餐积分保留但暂停使用 = 公平
   - 过期后自动解冻 = 保护用户权益

2. **技术可行性**:
   - 数据库字段变更简单（2 个字段）
   - 解冻逻辑可通过 Supabase Function 实现
   - 无需对接外部退款 API

3. **风险可控**:
   - 冻结逻辑在 Webhook 中处理，失败会重试
   - 定时任务确保过期积分及时解冻
   - 用户可在个人中心查看冻结状态

### 数据模型变更

**subscriptions 表新增字段**:
```sql
ALTER TABLE subscriptions
ADD COLUMN is_frozen BOOLEAN DEFAULT false,
ADD COLUMN freeze_start_time TIMESTAMP;
```

**credits 表新增字段**:
```sql
ALTER TABLE credits
ADD COLUMN frozen_amount INTEGER DEFAULT 0;
```

---

## 实施结果 (Consequences)

### 正面影响 ✅
- **漏洞修复**: 无限囤积积分漏洞关闭
- **用户体验**: 降级/过期后自动解冻，无损用户权益
- **财务安全**: 预计防止 30% 的收入损失
- **透明度**: 用户可在个人中心查看冻结状态

### 负面影响 ⚠️
- **用户困惑**: 部分用户不理解为什么积分"消失"了
  - **解决方案**: 添加 UI 提示"冻结至 YYYY-MM-DD"
- **技术复杂度**: 新增 2 个数据库字段 + 定时任务
  - **可接受**: 相比退款方案仍简单得多

### 技术债务
- ⏸️ **P2**: 冻结积分的前端展示优化（当前仅显示"已冻结"）
- ⏸️ **P3**: 添加用户自助解冻功能（当前仅自动解冻）
- ⏸️ **P3**: 积分冻结历史记录（audit log）

---

## 验证方式 (Validation)

### 测试用例

#### 测试 1: 升级冻结
```typescript
// 前置条件
用户有 Basic 月付订阅，剩余 50 积分，20 天过期

// 操作
用户购买 Pro 年付

// 预期结果
1. Basic 订阅标记为 is_frozen = true
2. 50 积分冻结（frozen_amount = 50）
3. 可用积分 = Pro 的 2000 积分（不包含冻结的 50）
4. 个人中心显示"冻结至 2025-12-01"
```

#### 测试 2: 降级不冻结
```typescript
// 前置条件
用户有 Pro 月付订阅

// 操作
用户购买 Basic 月付

// 预期结果
1. Pro 订阅保持 is_frozen = false（不冻结，因为是降级）
2. 可用积分 = Basic 100 积分 + Pro 剩余积分
```

#### 测试 3: 过期自动解冻
```typescript
// 前置条件
用户有冻结的 Basic 订阅（2025-11-01 过期）

// 操作
系统时间到达 2025-11-02

// 预期结果
1. 定时任务自动执行
2. is_frozen = false
3. frozen_amount = 0
4. 剩余积分恢复可用
```

### 测试脚本

```bash
# 运行测试
pnpm test:subscription-freeze

# 手动测试（开发环境）
node scripts/test-immediate-upgrade-freeze.ts
```

### 实际测试结果

详见：`docs/archived/work-logs-2025-11/WORK_LOG_2025-11-12.md`

---

## 回滚策略 (Rollback Plan)

如果冻结逻辑导致严重问题（如用户投诉过多）：

### 回滚步骤

1. **禁用冻结逻辑**:
```typescript
// 临时修改 Webhook 处理，跳过冻结步骤
if (newPrice > oldPrice) {
  // await freezeOldSubscription()  // 注释掉
  console.log('[ROLLBACK] 冻结逻辑已禁用')
}
```

2. **解冻所有已冻结积分**:
```sql
UPDATE credits SET frozen_amount = 0;
UPDATE subscriptions SET is_frozen = false, freeze_start_time = NULL;
```

3. **通知用户**:
发送邮件通知所有受影响用户：
> "由于系统升级，您的冻结积分已全部恢复可用。感谢您的耐心等待！"

4. **重新评估方案**:
启用方案 B（退款）或方案 D（限速）

---

## 参考链接 (References)

- [Supabase Functions: Cron Jobs](https://supabase.com/docs/guides/database/functions#cron-jobs)
- [PostgreSQL: Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Creem Webhook Documentation](https://docs.creem.io/webhooks)
- [工作日志：订阅系统重构](../../docs/archived/work-logs-2025-11/WORK_LOG_2025-11-12.md)

---

**相关 ADR**:
- ADR-001: 性能优化策略
- ADR-002: i18n Cookie 持久化策略

**更新记录**:
- 2025-11-09: 初始创建
- 2025-11-11: 发现 Webhook 事件字段错误，修复并更新文档
- 2025-11-12: 实施完成，所有测试通过
- 2025-11-13: 优化 remaining_days 计算逻辑
- 2025-11-14: 归档到 ADR 系统
