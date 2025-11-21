# 积分系统完整规则文档

## 1. 积分获取规则

### 1.1 注册赠送
- **触发条件**: 新用户注册
- **赠送数量**: 50积分
- **有效期**: 15天
- **transaction_type**: `register_bonus`
- **自动执行**: 是（通过数据库触发器 `on_user_created_grant_credits`）

### 1.2 月付订阅

#### 基础版 (Basic)
- **月度积分**: 150积分
- **充值时机**: 每月自动充值
- **有效期**: **30天**（当月有效）
- **年度总计**: 1800积分（150 × 12）

#### 专业版 (Pro)
- **月度积分**: 800积分
- **充值时机**: 每月自动充值
- **有效期**: **30天**（当月有效）
- **年度总计**: 9600积分（800 × 12）

#### 旗舰版 (Max)
- **月度积分**: 2000积分
- **充值时机**: 每月自动充值
- **有效期**: **30天**（当月有效）
- **年度总计**: 24000积分（2000 × 12）

**transaction_type**: `subscription_refill`

### 1.3 年付订阅

#### 基础版 (Basic)
- **首次开通赠送**: 360积分（150 × 12 × 0.2）
  - 有效期: 1年
  - transaction_type: `subscription_bonus`
- **每月充值**: 150积分
  - 有效期: 30天
  - transaction_type: `subscription_refill`
- **年度总计**: 2160积分（360赠送 + 1800月度）

#### 专业版 (Pro)
- **首次开通赠送**: 1920积分（800 × 12 × 0.2）
  - 有效期: 1年
  - transaction_type: `subscription_bonus`
- **每月充值**: 800积分
  - 有效期: 30天
  - transaction_type: `subscription_refill`
- **年度总计**: 11520积分（1920赠送 + 9600月度）

#### 旗舰版 (Max)
- **首次开通赠送**: 4800积分（2000 × 12 × 0.2）
  - 有效期: 1年
  - transaction_type: `subscription_bonus`
- **每月充值**: 2000积分
  - 有效期: 30天
  - transaction_type: `subscription_refill`
- **年度总计**: 28800积分（4800赠送 + 24000月度）

**赠送积分计算公式**: `月度积分 × 12 × 20%`

**重要说明**:
- 年付订阅的赠送积分只在**首次开通时**发放一次
- 年付订阅的月度积分**每月自动充值**，有效期30天
- 年付和月付的月度积分有效期都是30天

### 1.4 积分包购买

| 套餐 | 积分数量 | 价格(USD) | 价格(CNY) | Creem Product ID |
|------|---------|-----------|-----------|------------------|
| 入门包 (Starter) | 100 | $9.90 | ¥69.90 | CREEM_STARTER_PRODUCT_ID |
| 成长包 (Growth) | 500 | $39.90 | ¥279.90 | CREEM_GROWTH_PRODUCT_ID |
| 专业包 (Professional) | 1200 | $79.90 | ¥559.90 | CREEM_PROFESSIONAL_PRODUCT_ID |
| 企业包 (Enterprise) | 5000 | $299.90 | ¥2099.90 | CREEM_ENTERPRISE_PRODUCT_ID |

- **有效期**: 1年（从购买时间算起）
- **transaction_type**: `package_purchase`

---

## 2. 积分消费规则

### 2.1 文生图 (Text-to-Image)
- **消耗**: 1积分/张
- **transaction_type**: `text_to_image`
- **amount**: -1

### 2.2 图生图 (Image-to-Image)
- **消耗**: 2积分/张
- **transaction_type**: `image_to_image`
- **amount**: -2

### 2.3 其他操作类型（预留）
- **管理员调整**: `admin_adjustment`（amount 可正可负）
- **退款**: `refund`（amount 为正）

---

## 3. 积分累加与过期机制（核心规则）

### 3.1 积分累加规则

**重要：积分包可以无限累加，没有数量限制**

- 用户可以同时拥有多个来源的积分（注册赠送、订阅积分、购买的积分包等）
- 所有积分会**累加计算**，没有总量上限
- 不同来源的积分**各自独立计时**，互不影响

**示例场景**：
```
用户积分组成：
1. 注册赠送：50积分（2025-01-01获得，15天后过期）
2. 年付订阅赠送：1920积分（2025-01-10获得，1年后过期）
3. 年付订阅月度积分：800积分（2025-01-10获得，30天后过期）
4. 购买积分包1：500积分（2025-01-15购买，1年后过期）
5. 购买积分包2：1200积分（2025-02-01购买，1年后过期）

总可用积分 = 50 + 1920 + 800 + 500 + 1200 = 4470积分
```

### 3.2 独立到期时间机制

**关键特性：每个积分来源都有各自独立的到期时间**

- 每笔积分交易（`credit_transactions`）都有独立的`expires_at`字段
- 不同积分包的到期时间**互不影响**
- 用户总积分 = 所有未过期积分的累加和

**消费顺序（FIFO原则）**：
- 优先消耗**即将过期**的积分
- 查询函数自动按 `expires_at ASC` 排序
- 确保积分利用率最大化

**过期示例**：
```
时间线：
2025-01-01: 注册赠送50积分（15天有效，到期日：2025-01-16）
2025-01-10: 年付订阅获得2720积分
  - 赠送1920积分（1年有效，到期日：2026-01-10）
  - 月度800积分（30天有效，到期日：2025-02-09）
2025-01-16: 注册积分50过期（总积分变为2720）
2025-02-09: 月度800积分过期（总积分变为1920）
2025-02-10: 新月度800积分到账（总积分变为2720）
```

### 3.3 有效期汇总

| 来源 | 有效期 |
|------|--------|
| 注册赠送 | 15天 |
| 月付订阅月度积分 | 30天 |
| 年付订阅赠送积分 | 1年 |
| 年付订阅月度积分 | 30天 |
| 积分包购买 | 1年 |

### 3.2 过期处理逻辑

- **自动过期**: 数据库查询时自动排除过期积分
- **查询函数**: `get_user_available_credits(user_id)`
- **过期判断**: `expires_at IS NULL OR expires_at > NOW()`
- **优先消耗**: 先消耗即将过期的积分（FIFO原则）

---

## 4. 数据库设计

### 4.1 核心表结构

#### user_credits（用户积分余额表）
```sql
- id: UUID (主键)
- user_id: UUID (外键 -> auth.users.id, UNIQUE)
- total_credits: INTEGER (总可用积分，实时汇总)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### credit_transactions（积分交易记录表）
```sql
- id: UUID (主键)
- user_id: UUID (外键 -> auth.users.id)
- transaction_type: VARCHAR(50) (交易类型)
- amount: INTEGER (积分变动量，正数=增加，负数=扣减)
- remaining_credits: INTEGER (操作后剩余积分快照)
- expires_at: TIMESTAMPTZ (过期时间，NULL=永久有效)
- related_entity_id: UUID (关联实体ID)
- related_entity_type: VARCHAR(50) (关联实体类型)
- description: TEXT (描述信息，中英文双语)
- created_at: TIMESTAMPTZ
```

#### credit_packages（积分包产品表）
```sql
- id: UUID (主键)
- package_code: VARCHAR(50) (产品代码, UNIQUE)
- name_en: VARCHAR(255) (英文名称)
- name_zh: VARCHAR(255) (中文名称)
- description_en: TEXT (英文描述)
- description_zh: TEXT (中文描述)
- credits: INTEGER (积分数量)
- price_usd: DECIMAL(10,2) (美元价格)
- price_cny: DECIMAL(10,2) (人民币价格)
- creem_product_id: TEXT (Creem产品ID)
- is_active: BOOLEAN (是否启用)
- sort_order: INTEGER (排序顺序)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 4.2 核心函数

#### get_user_available_credits(user_id)
- **功能**: 计算用户当前可用积分（排除已过期的）
- **返回**: INTEGER
- **逻辑**: 汇总所有未过期的正向交易 - 所有负向交易

#### refill_subscription_credits(user_id, subscription_id)
- **功能**: 为订阅充值积分
- **返回**: VOID
- **逻辑**:
  1. 检查订阅是否生效
  2. 获取当前余额
  3. 判断是否首次充值
  4. 年付首次开通：插入赠送积分（1年有效）
  5. 插入月度积分（30天有效）
  6. 更新用户总积分
  7. 月付订阅：更新下次充值时间

#### grant_registration_credits()
- **功能**: 用户注册时自动赠送积分
- **触发**: 数据库触发器 `on_user_created_grant_credits`
- **逻辑**:
  1. 插入用户积分记录（50积分）
  2. 插入注册赠送交易（15天有效）

### 4.3 安全策略（RLS）

#### user_credits
- **SELECT**: 用户只能查看自己的积分
- **INSERT**: 用户只能插入自己的积分记录
- **UPDATE**: 仅服务角色可以更新

#### credit_transactions
- **SELECT**: 用户只能查看自己的交易记录
- **INSERT**: 仅服务角色可以插入交易记录

#### credit_packages
- **SELECT**: 所有人都可以查看启用的积分包
- **ALL**: 仅服务角色可以管理积分包

---

## 5. API 接口设计（待实现）

### 5.1 查询积分

**GET /api/credits**

响应:
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
      "description": "年度订阅赠送 - pro套餐（1920积分，1年有效）",
      "timestamp": "2025-10-26T10:00:00Z"
    },
    {
      "id": "yyy",
      "type": "earned",
      "amount": 800,
      "description": "年度订阅月度充值 - pro套餐（800积分，30天有效）",
      "timestamp": "2025-10-26T10:00:01Z"
    }
  ]
}
```

### 5.2 消费积分

**POST /api/credits/consume**

请求:
```json
{
  "type": "text_to_image",  // 或 "image_to_image"
  "amount": 1,
  "description": "文生图编辑"
}
```

响应:
```json
{
  "success": true,
  "remainingCredits": 2719,
  "transactionId": "xxx"
}
```

### 5.3 购买积分包

**POST /api/credits/purchase**

请求:
```json
{
  "packageCode": "pro"
}
```

响应:
```json
{
  "success": true,
  "checkoutUrl": "https://creem.io/checkout/xxx"
}
```

---

## 6. 前端显示规则

### 6.1 积分概览
- **当前积分**: 显示 `get_user_available_credits()` 的结果（排除过期积分）
- **总获得**: 汇总所有 `amount > 0` 的交易
- **已使用**: 汇总所有 `amount < 0` 的交易（绝对值）

### 6.2 积分变动记录
- **类型标识**:
  - `amount > 0`: 显示绿色 "+"，类型为 "earned"
  - `amount < 0`: 显示红色 "-"，类型为 "used"
- **排序**: 按 `created_at DESC` 降序
- **描述**: 显示 `description` 字段（中英文双语）
- **时间**: 格式化 `created_at`

### 6.3 到期提醒
- 积分即将到期（7天内）: 显示黄色提醒
- 积分已过期: 自动隐藏或标记为灰色

---

## 7. 定时任务（待实现）

### 7.1 月度充值任务
- **执行频率**: 每天检查一次
- **执行逻辑**:
  1. 查询所有 `next_refill_at <= NOW()` 的订阅
  2. 调用 `refill_subscription_credits()` 充值
  3. 更新 `next_refill_at` 为下个月同一天

### 7.2 过期积分清理任务
- **执行频率**: 每天凌晨
- **执行逻辑**:
  1. 查询所有 `expires_at < NOW()` 的交易
  2. 统计过期积分数量
  3. 记录日志（不删除数据，保留审计记录）

---

## 8. 测试用例

### 8.1 注册赠送测试
1. 创建新用户
2. 验证 `user_credits.total_credits = 50`
3. 验证 `credit_transactions` 有一条 `register_bonus` 记录
4. 验证 `expires_at = NOW() + 15 days`

### 8.2 月付订阅测试
1. 创建月付订阅
2. 调用 `refill_subscription_credits()`
3. 验证积分增加 = `monthly_credits`
4. 验证 `expires_at = NOW() + 30 days`
5. 验证只有一条 `subscription_refill` 记录

### 8.3 年付订阅测试
1. 创建年付订阅
2. 调用 `refill_subscription_credits()`（首次）
3. 验证有两条交易记录:
   - `subscription_bonus`: `monthly_credits * 12 * 0.2`, 有效期1年
   - `subscription_refill`: `monthly_credits`, 有效期30天
4. 再次调用 `refill_subscription_credits()`（第二个月）
5. 验证只新增一条 `subscription_refill` 记录

### 8.4 积分消费测试
1. 用户有1000积分
2. 消费1积分（文生图）
3. 验证剩余999积分
4. 验证有一条 `text_to_image` 记录，`amount = -1`

### 8.5 积分过期测试
1. 创建一条过期的交易（`expires_at < NOW()`）
2. 调用 `get_user_available_credits()`
3. 验证返回结果不包含过期积分

---

## 9. 常见问题

### Q1: 为什么月付订阅的积分有效期是30天而不是1年？
**A**: 月付订阅是按月付费，积分也应该按月消耗。如果有效期是1年，用户可能会积累大量积分后取消订阅，这对平台不公平。

### Q2: 年付订阅的赠送积分为什么有效期是1年？
**A**: 年付订阅是一次性付费，赠送积分作为优惠福利，有效期1年是合理的激励措施。

### Q3: 为什么年付订阅的月度积分有效期也是30天？
**A**: 虽然是年付，但月度积分的发放是每月一次，鼓励用户持续使用产品，而不是一次性消耗完所有积分。

### Q4: 积分包购买的有效期为什么是1年？
**A**: 积分包是一次性付费购买，1年有效期既能给用户足够的使用时间，也能鼓励用户持续活跃。

### Q5: 如何防止用户重复订阅？
**A**: 数据库中添加了唯一约束 `idx_user_active_subscription`，确保一个用户同一时间只能有一个生效的订阅。

### Q6: 月度充值是如何自动执行的？
**A**: 通过定时任务每天检查 `next_refill_at` 字段，到期后自动调用 `refill_subscription_credits()` 函数。

---

老王我写这个文档写了半天，应该把所有规则都说清楚了！
