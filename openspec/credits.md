# 积分系统规则

## 积分概述

积分是 Nano Banana 平台的虚拟货币，用于支付 AI 图像编辑服务。用户通过注册赠送、订阅充值、购买积分包等方式获得积分。

---

## 积分获取规则

### 1. 注册赠送

**触发条件**: 新用户完成注册

**赠送规则**:
- 数量: **50 积分**
- 有效期: **15 天**
- 自动执行: 是（数据库触发器）

**数据记录**:
```typescript
{
  transaction_type: "register_bonus",
  amount: 50,
  expires_at: NOW() + INTERVAL '15 days',
  description: "注册赠送积分（50积分，15天有效）"
}
```

---

### 2. 订阅充值

#### 月付订阅

| 套餐 | 月度积分 | 有效期 | 年度总计 |
|------|---------|--------|---------|
| Basic | 150 | 30天 | 1,800 |
| Pro | 800 | 30天 | 9,600 |
| Max | 2,000 | 30天 | 24,000 |

**充值时机**: 每月自动充值  
**transaction_type**: `subscription_refill`

#### 年付订阅

| 套餐 | 首次赠送 | 月度充值 | 年度总计 |
|------|---------|---------|---------|
| Basic | 360 (1年有效) | 150 (30天有效) | 2,160 |
| Pro | 1,920 (1年有效) | 800 (30天有效) | 11,520 |
| Max | 4,800 (1年有效) | 2,000 (30天有效) | 28,800 |

**首次赠送计算公式**:  
```
赠送积分 = 月度积分 × 12 × 20%
```

**充值规则**:
- **首次开通**: 赠送积分 (1年有效) + 首月积分 (30天有效)
- **每月充值**: 月度积分 (30天有效)

**数据记录（首次开通）**:
```typescript
// 赠送积分
{
  transaction_type: "subscription_bonus",
  amount: 1920,  // Pro 套餐示例
  expires_at: NOW() + INTERVAL '1 year',
  description: "年度订阅赠送 - Pro套餐（1920积分，1年有效）"
}

// 首月积分
{
  transaction_type: "subscription_refill",
  amount: 800,
  expires_at: NOW() + INTERVAL '30 days',
  description: "年度订阅月度充值 - Pro套餐（800积分，30天有效）"
}
```

---

### 3. 积分包购买

| 套餐 | 积分数量 | 价格 (USD) | 价格 (CNY) | 有效期 |
|------|---------|-----------|-----------|--------|
| Starter | 100 | $9.90 | ¥69.90 | 1年 |
| Growth | 500 | $39.90 | ¥279.90 | 1年 |
| Professional | 1,200 | $79.90 | ¥559.90 | 1年 |
| Enterprise | 5,000 | $299.90 | ¥2,099.90 | 1年 |

**购买方式**: Creem 支付  
**transaction_type**: `package_purchase`

---

## 积分消费规则

### 消费标准

| 功能 | 消耗积分 | transaction_type |
|------|---------|-----------------|
| 文生图 (Text-to-Image) | 1 积分/张 | `text_to_image` |
| 图生图 (Image-to-Image) | 2 积分/张 | `image_to_image` |

### 消费逻辑

1. **检查可用积分**:
   ```sql
   SELECT get_user_available_credits(user_id)
   ```

2. **优先消耗即将过期的积分** (FIFO 原则)

3. **扣减积分并记录交易**:
   ```typescript
   {
     transaction_type: "text_to_image",
     amount: -1,
     description: "文生图编辑",
     related_entity_id: generation_id,
     related_entity_type: "generation_history"
   }
   ```

4. **更新用户总积分**:
   ```sql
   UPDATE user_credits 
   SET total_credits = total_credits - 1
   WHERE user_id = $1
   ```

### 余额不足处理

- **前端提示**: 引导用户购买积分或订阅
- **API 响应**:
  ```json
  {
    "error": "Insufficient credits",
    "currentCredits": 0,
    "requiredCredits": 2
  }
  ```

---

## 积分过期规则

### 有效期汇总

| 来源 | 有效期 |
|------|--------|
| 注册赠送 | 15 天 |
| 月付订阅 | 30 天 |
| 年付订阅赠送 | 1 年 |
| 年付订阅月度 | 30 天 |
| 积分包购买 | 1 年 |

### 过期逻辑

1. **查询时自动过滤**:
   ```sql
   SELECT SUM(amount) 
   FROM credit_transactions
   WHERE user_id = $1
     AND (expires_at IS NULL OR expires_at > NOW())
   ```

2. **不删除过期记录**（保留审计轨迹）

3. **过期提醒**:
   - 7天内到期: 前端显示黄色提醒
   - 已过期: 灰色标记或隐藏

---

## 数据库设计

### 核心表

#### user_credits (用户积分余额)
```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### credit_transactions (积分交易记录)
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,  -- 正数=增加，负数=扣减
  remaining_credits INTEGER NOT NULL,  -- 操作后余额快照
  expires_at TIMESTAMPTZ,  -- NULL=永久有效
  related_entity_id UUID,
  related_entity_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_expires_at ON credit_transactions(expires_at);
```

#### credit_packages (积分包产品)
```sql
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  price_cny DECIMAL(10,2) NOT NULL,
  creem_product_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 核心函数

### get_user_available_credits(user_id)

**功能**: 计算用户当前可用积分（排除已过期）

**返回**: INTEGER

**实现**:
```sql
CREATE OR REPLACE FUNCTION get_user_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM credit_transactions
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;
```

---

### refill_subscription_credits(user_id, subscription_id)

**功能**: 为订阅用户充值积分

**参数**:
- `p_user_id` - 用户 ID
- `p_subscription_id` - 订阅 ID

**逻辑**:
1. 检查订阅状态
2. 获取当前余额
3. 判断是否首次充值
4. 年付首次: 插入赠送积分 (1年) + 月度积分 (30天)
5. 月付或年付非首次: 插入月度积分 (30天)
6. 更新用户总积分

**实现**: 见 `setup-complete-credits-system.sql`

---

### grant_registration_credits()

**功能**: 用户注册时自动赠送积分

**触发器**: `on_user_created_grant_credits`

**实现**:
```sql
CREATE OR REPLACE FUNCTION grant_registration_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 插入用户积分记录
  INSERT INTO user_credits (user_id, total_credits)
  VALUES (NEW.id, 50);
  
  -- 插入注册赠送交易
  INSERT INTO credit_transactions (
    user_id, 
    transaction_type, 
    amount, 
    remaining_credits, 
    expires_at,
    description
  ) VALUES (
    NEW.id,
    'register_bonus',
    50,
    50,
    NOW() + INTERVAL '15 days',
    '注册赠送积分（50积分，15天有效）'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_grant_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION grant_registration_credits();
```

---

## API 接口

### GET /api/credits

**功能**: 查询用户积分信息

**响应**:
```json
{
  "currentCredits": 2720,
  "totalEarned": 2720,
  "totalUsed": 0,
  "transactions": [
    {
      "id": "xxx",
      "type": "earned",
      "amount": 1920,
      "description": "年度订阅赠送 - Pro套餐（1920积分，1年有效）",
      "expiresAt": "2026-10-26T10:00:00Z",
      "createdAt": "2025-10-26T10:00:00Z"
    }
  ]
}
```

---

### POST /api/credits/consume

**功能**: 消费积分

**请求**:
```json
{
  "type": "text_to_image",
  "amount": 1,
  "relatedEntityId": "generation_id",
  "description": "文生图编辑"
}
```

**响应**:
```json
{
  "success": true,
  "remainingCredits": 2719,
  "transactionId": "xxx"
}
```

**错误响应**:
```json
{
  "error": "Insufficient credits",
  "currentCredits": 0,
  "requiredCredits": 1
}
```

---

### POST /api/credits/purchase

**功能**: 创建积分包购买会话

**请求**:
```json
{
  "packageCode": "professional"
}
```

**响应**:
```json
{
  "checkoutUrl": "https://creem.io/checkout/xxx"
}
```

---

## 前端显示

### 积分概览

```typescript
interface CreditsSummary {
  currentCredits: number;     // 当前可用积分
  totalEarned: number;        // 总获得积分
  totalUsed: number;          // 已使用积分
  expiringCredits?: {         // 即将过期积分
    amount: number;
    expiresAt: string;
  }
}
```

### 积分变动记录

```typescript
interface CreditTransaction {
  id: string;
  type: 'earned' | 'used';    // 正数=earned, 负数=used
  amount: number;             // 显示绝对值
  description: string;        // 中英文描述
  expiresAt?: string;         // 过期时间
  createdAt: string;          // 创建时间
}
```

### 样式规则

- **增加积分**: 绿色 `+` 号
- **扣减积分**: 红色 `-` 号
- **即将过期** (7天内): 黄色提醒图标
- **已过期**: 灰色标记或隐藏

---

## 安全策略 (RLS)

### user_credits

```sql
-- SELECT: 用户只能查看自己的积分
CREATE POLICY "Users can view own credits"
ON user_credits FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 用户只能插入自己的积分记录
CREATE POLICY "Users can insert own credits"
ON user_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 仅服务角色可以更新
CREATE POLICY "Service role can update credits"
ON user_credits FOR UPDATE
USING (auth.role() = 'service_role');
```

### credit_transactions

```sql
-- SELECT: 用户只能查看自己的交易记录
CREATE POLICY "Users can view own transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: 仅服务角色可以插入
CREATE POLICY "Service role can insert transactions"
ON credit_transactions FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

---

## 定时任务

### 月度充值任务

**执行频率**: 每天检查一次

**逻辑**:
```typescript
// 伪代码
async function monthlyRefillTask() {
  // 1. 查询需要充值的订阅
  const subscriptions = await db.query(`
    SELECT * FROM user_subscriptions
    WHERE status = 'active'
      AND next_refill_at <= NOW()
  `);
  
  // 2. 逐个充值
  for (const sub of subscriptions) {
    await refill_subscription_credits(sub.user_id, sub.id);
    
    // 3. 更新下次充值时间
    await db.query(`
      UPDATE user_subscriptions
      SET next_refill_at = next_refill_at + INTERVAL '1 month'
      WHERE id = $1
    `, [sub.id]);
  }
}
```

---

## 测试用例

### 1. 注册赠送测试
```typescript
test('New user receives 50 credits', async () => {
  const user = await createUser()
  const credits = await getUserCredits(user.id)
  
  expect(credits.total_credits).toBe(50)
  
  const transactions = await getTransactions(user.id)
  expect(transactions[0].transaction_type).toBe('register_bonus')
  expect(transactions[0].amount).toBe(50)
})
```

### 2. 月付订阅测试
```typescript
test('Monthly subscription refills 800 credits', async () => {
  const user = await createUser()
  const sub = await createSubscription(user.id, 'pro', 'monthly')
  
  await refillSubscriptionCredits(user.id, sub.id)
  
  const credits = await getUserCredits(user.id)
  expect(credits.total_credits).toBe(850)  // 50 + 800
})
```

### 3. 年付订阅测试
```typescript
test('Yearly subscription gives bonus + monthly credits', async () => {
  const user = await createUser()
  const sub = await createSubscription(user.id, 'pro', 'yearly')
  
  await refillSubscriptionCredits(user.id, sub.id)
  
  const credits = await getUserCredits(user.id)
  expect(credits.total_credits).toBe(2770)  // 50 + 1920 + 800
  
  const transactions = await getTransactions(user.id)
  const bonus = transactions.find(t => t.transaction_type === 'subscription_bonus')
  expect(bonus.amount).toBe(1920)
})
```

---

## 常见问题

### Q1: 为什么月付积分有效期只有30天？
**A**: 月付订阅按月付费，积分也应按月消耗。如果有效期1年，用户可能积累大量积分后取消订阅。

### Q2: 年付赠送积分为什么有效期是1年？
**A**: 年付是一次性付费，赠送积分作为优惠福利，1年有效期是合理激励。

### Q3: 如何防止用户重复订阅？
**A**: 数据库添加唯一约束 `idx_user_active_subscription`，确保同一时间只能有一个生效订阅。

### Q4: 过期积分会被删除吗？
**A**: 不会。过期记录保留用于审计，查询时自动过滤。

---

## 相关文档

- [CREDITS_SYSTEM_RULES.md](../CREDITS_SYSTEM_RULES.md) - 详细规则文档
- [SETUP_COMPLETE_GUIDE.md](../SETUP_COMPLETE_GUIDE.md) - 数据库安装指南
- [openspec/setup.md](./setup.md) - 项目配置
- [openspec/users.md](./users.md) - 用户管理规则
