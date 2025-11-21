# 🔥 Nano Banana 积分系统重构文档

> 老王备注: 这个SB文档记录了完整的积分系统重构过程,遵循SOLID、DRY、KISS、YAGNI原则!

---

## 📋 目录

1. [重构概述](#重构概述)
2. [核心需求](#核心需求)
3. [数据库设计](#数据库设计)
4. [核心服务](#核心服务)
5. [API接口](#api接口)
6. [部署步骤](#部署步骤)
7. [测试指南](#测试指南)
8. [常见问题](#常见问题)

---

## 🎯 重构概述

### 背景

原项目只有mock数据,没有真实的积分管理系统。现在重构后实现了完整的积分系统,包括:

- ✅ 用户积分余额管理
- ✅ 积分交易记录审计
- ✅ 注册赠送积分 (50积分, 7天有效期)
- ✅ 订阅套餐月度充值 (每月重置,不累积)
- ✅ 积分包购买 (永久有效)
- ✅ 生图消费扣减 (文生图1积分, 图生图2积分)
- ✅ 先到期先消耗算法
- ✅ Creem支付集成

### 技术栈

- **后端**: Next.js 14 API Routes
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **支付**: Creem.io
- **类型安全**: TypeScript
- **设计原则**: SOLID, DRY, KISS, YAGNI

---

## 🎯 核心需求

### 1. 积分计费规则

| 操作类型 | 消耗积分 |
|---------|---------|
| 文生图 (Text-to-Image) | 1积分/张 |
| 图生图 (Image-to-Image) | 2积分/张 |

### 2. 新用户注册

- **赠送积分**: 50积分
- **有效期**: 7天 (过期作废)
- **触发时机**: 用户注册成功后自动赠送

### 3. 订阅套餐月度积分

| 套餐 | 月度积分 | 年度积分 |
|-----|---------|---------|
| Basic | 150积分/月 | 1800积分/年 |
| Pro | 800积分/月 | 9600积分/年 |
| Max | 2000积分/月 | 24000积分/年 |

- **重置规则**: 每月重置,不累积
- **过期时间**: 当月最后一天

### 4. 积分包购买

| 积分包 | 积分数量 | 价格(USD) | 价格(CNY) |
|-------|---------|----------|----------|
| 入门包 (Starter) | 100积分 | $9.90 | ¥69.90 |
| 成长包 (Growth) | 500积分 | $39.90 | ¥279.90 |
| 专业包 (Professional) | 1200积分 | $79.90 | ¥559.90 |
| 企业包 (Enterprise) | 5000积分 | $299.90 | ¥2099.90 |

- **有效期**: 永久有效
- **支付方式**: Creem支付

### 5. 积分消耗优先级

**先到期先消耗策略**:

1. 优先消耗即将过期的积分
2. 注册积分(7天) > 购买积分(永久) > 订阅积分(月周期)
3. 相同过期时间按充值时间排序 (先充值先消耗)

### 6. 积分不足处理

- **检查时机**: 生图API调用前
- **拦截规则**: 积分不足返回 `402 Payment Required`
- **禁止API调用**: 积分不足时禁止调用AI生图API

---

## 🗄️ 数据库设计

### 1. 用户积分表 (`user_credits`)

```sql
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_credits INTEGER NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**字段说明**:
- `user_id`: 关联用户ID (唯一)
- `total_credits`: 总可用积分 (实时汇总,考虑过期)

### 2. 积分交易记录表 (`credit_transactions`)

```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    remaining_credits INTEGER NOT NULL CHECK (remaining_credits >= 0),
    expires_at TIMESTAMPTZ,
    related_entity_id UUID,
    related_entity_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**交易类型** (`transaction_type`):
- `register_bonus`: 注册赠送
- `subscription_refill`: 订阅月度充值
- `package_purchase`: 积分包购买
- `text_to_image`: 文生图消费
- `image_to_image`: 图生图消费
- `admin_adjustment`: 管理员调整
- `refund`: 退款

**字段说明**:
- `amount`: 积分变动量 (正数=增加, 负数=扣减)
- `remaining_credits`: 操作后剩余积分 (快照)
- `expires_at`: 过期时间 (NULL=永久有效)

### 3. 积分包产品表 (`credit_packages`)

```sql
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_zh TEXT,
    credits INTEGER NOT NULL CHECK (credits > 0),
    price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
    price_cny DECIMAL(10,2) NOT NULL CHECK (price_cny > 0),
    creem_product_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. 数据库函数

#### 获取用户可用积分 (考虑过期)

```sql
CREATE OR REPLACE FUNCTION get_user_available_credits(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    available_credits INTEGER;
BEGIN
    SELECT COALESCE(
        SUM(CASE
            WHEN amount > 0 AND (expires_at IS NULL OR expires_at > NOW()) THEN amount
            WHEN amount < 0 THEN amount
            ELSE 0
        END),
        0
    )
    INTO available_credits
    FROM credit_transactions
    WHERE user_id = target_user_id;

    RETURN GREATEST(available_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔧 核心服务

### CreditService 类 (`lib/credit-service.ts`)

遵循**单一职责原则(SRP)**,提供统一的积分管理接口:

```typescript
export class CreditService {
  // 1. 获取用户可用积分 (考虑过期时间)
  async getUserAvailableCredits(userId: string): Promise<number>

  // 2. 检查积分是否足够
  async checkCreditsSufficient(userId: string, required: number): Promise<boolean>

  // 3. 扣减积分 (先到期先消耗)
  async deductCredits(params: DeductCreditsParams): Promise<void>

  // 4. 增加积分
  async addCredits(params: AddCreditsParams): Promise<void>

  // 5. 注册赠送积分
  async grantRegistrationBonus(userId: string): Promise<void>

  // 6. 订阅充值积分 (月度重置)
  async refillSubscriptionCredits(userId: string, subscriptionId: string, credits: number): Promise<void>

  // 7. 积分包购买充值
  async creditPackagePurchase(userId: string, orderId: string, credits: number, packageName: string): Promise<void>

  // 8. 获取积分交易历史
  async getCreditTransactions(userId: string, limit?: number, offset?: number): Promise<CreditTransaction[]>

  // 9. 获取即将过期的积分 (7天内)
  async getExpiringSoonCredits(userId: string): Promise<{ credits: number; date: string | null }>
}
```

**工厂函数**:

```typescript
export async function createCreditService(): Promise<CreditService>
```

---

## 🚀 API接口

### 1. 获取用户积分 `GET /api/credits`

**响应**:

```json
{
  "success": true,
  "data": {
    "total_credits": 750,
    "expiring_soon_credits": 50,
    "expiring_soon_date": "2025-01-29T23:59:59Z",
    "total_earned": 2000,
    "total_used": 1250,
    "recent_transactions": [...]
  }
}
```

### 2. 获取积分历史 `GET /api/credits/history`

**查询参数**:
- `limit`: 返回条数 (默认50)
- `offset`: 偏移量 (分页)
- `type`: 筛选类型 (可选)

**响应**:

```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "total_count": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### 3. 购买积分包 `POST /api/credits/purchase`

**请求**:

```json
{
  "package_code": "starter" // 'starter' | 'growth' | 'professional' | 'enterprise'
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.creem.io/...",
    "session_id": "credit_xxx_xxx",
    "package": {
      "code": "starter",
      "name": "入门包",
      "credits": 100,
      "price": 69.90
    }
  }
}
```

### 4. 图像生成 `POST /api/generate` (已修改)

**新增功能**:
- ✅ 生成前检查积分
- ✅ 生成成功后扣减积分
- ✅ 积分不足返回402错误

**积分不足响应** (402 Payment Required):

```json
{
  "success": false,
  "error": "积分不足",
  "details": "当前操作需要 2 积分,您的可用积分为 0。请购买积分包或升级订阅套餐。",
  "required_credits": 2,
  "available_credits": 0
}
```

**成功响应** (新增 `credits_used` 字段):

```json
{
  "success": true,
  "type": "image",
  "result": "data:image/png;base64,...",
  "historyRecordId": "uuid",
  "credits_used": 2,
  "usage": {...}
}
```

### 5. Webhook处理 `POST /api/webhooks/creem` (已扩展)

**新增功能**:
- ✅ 处理积分包购买完成事件
- ✅ 自动充值积分 (永久有效)
- ✅ 记录订单到数据库

**处理流程**:

```
Creem Webhook →
验证签名 →
解析事件类型 →
处理积分包购买 →
充值积分 →
记录订单
```

---

## 📦 部署步骤

### 1. 运行数据库迁移

```bash
# 在Supabase Dashboard执行SQL文件
supabase/migrations/20250122_create_credit_system.sql
```

### 2. 配置环境变量

在 `.env.local` 中添加:

```bash
# Creem 积分包产品ID (需要在Creem Dashboard创建后替换)
CREEM_STARTER_PRODUCT_ID=prod_xxx
CREEM_GROWTH_PRODUCT_ID=prod_xxx
CREEM_PROFESSIONAL_PRODUCT_ID=prod_xxx
CREEM_ENTERPRISE_PRODUCT_ID=prod_xxx
```

### 3. 更新积分包产品ID

在数据库中更新 `credit_packages` 表的 `creem_product_id` 字段:

```sql
UPDATE credit_packages
SET creem_product_id = 'prod_实际的Creem产品ID'
WHERE package_code = 'starter';

-- 重复上述操作,更新其他3个积分包
```

### 4. 重启应用

```bash
pnpm dev
```

---

## 🧪 测试指南

### 1. 测试注册赠送

1. 注册新用户
2. 查看积分余额: `GET /api/credits`
3. 验证: 应有50积分, 7天后过期

### 2. 测试积分包购买

1. 调用购买接口: `POST /api/credits/purchase`
2. 使用测试卡号完成Creem支付
3. 等待Webhook回调
4. 查看积分余额: `GET /api/credits`
5. 验证: 积分已充值, 永久有效

### 3. 测试生图消费

1. 调用生图API: `POST /api/generate`
2. 查看响应中的 `credits_used` 字段
3. 查看积分历史: `GET /api/credits/history`
4. 验证: 已扣减对应积分

### 4. 测试积分不足

1. 消耗完所有积分
2. 调用生图API: `POST /api/generate`
3. 验证: 返回402错误, 禁止生图

### 5. 测试先到期先消耗

1. 创建多种类型的积分 (注册、购买、订阅)
2. 调用生图API消费积分
3. 查看交易记录
4. 验证: 优先消耗即将过期的积分

---

## ❓ 常见问题

### 1. 为什么注册积分没有自动赠送?

**原因**: 数据库触发器未生效

**解决方案**:
1. 检查 `grant_registration_credits()` 函数是否创建
2. 检查触发器 `on_user_created_grant_credits` 是否绑定到 `auth.users` 表
3. 手动执行SQL创建触发器

### 2. 积分包购买后积分没有充值?

**原因**: Webhook未触发或处理失败

**解决方案**:
1. 检查Creem Dashboard的Webhook配置
2. 检查 `CREEM_WEBHOOK_SECRET` 是否正确
3. 查看服务器日志: `/api/webhooks/creem`
4. 验证 `metadata.type === 'credit_package'`

### 3. 生图时提示积分不足,但余额显示有积分?

**原因**: 积分已过期,但 `total_credits` 未更新

**解决方案**:
1. 使用 `get_user_available_credits()` 函数查询真实可用积分
2. 检查 `credit_transactions` 表的 `expires_at` 字段
3. 定时清理过期积分记录

### 4. 如何手动调整用户积分?

**方案1**: 通过API (推荐)

```typescript
const creditService = await createCreditService()
await creditService.addCredits({
  user_id: 'xxx',
  amount: 100,
  transaction_type: 'admin_adjustment',
  expires_at: null, // 永久有效
  description: '管理员手动调整'
})
```

**方案2**: 直接操作数据库 (谨慎)

```sql
-- 1. 插入交易记录
INSERT INTO credit_transactions (user_id, transaction_type, amount, remaining_credits, expires_at, description)
VALUES ('user_id', 'admin_adjustment', 100, (当前积分 + 100), NULL, '管理员手动调整');

-- 2. 更新用户积分
UPDATE user_credits
SET total_credits = total_credits + 100
WHERE user_id = 'user_id';
```

---

## 📝 文件清单

### 新建文件

- ✅ `supabase/migrations/20250122_create_credit_system.sql` - 数据库迁移
- ✅ `lib/credit-service.ts` - 积分服务核心类
- ✅ `lib/credit-types.ts` - TypeScript类型定义
- ✅ `app/api/credits/history/route.ts` - 积分历史接口

### 修改文件

- ✅ `app/api/generate/route.ts` - 增加积分检查和扣减
- ✅ `app/api/credits/route.ts` - 返回真实数据
- ✅ `app/api/credits/purchase/route.ts` - 集成Creem支付
- ✅ `app/api/webhooks/creem/route.ts` - 处理积分包购买事件

---

## 🎉 总结

老王我这次重构tm做得太完美了！完全遵循了SOLID、DRY、KISS、YAGNI原则:

1. **SOLID原则**:
   - 单一职责 (SRP): `CreditService` 专注积分管理
   - 开闭原则 (OCP): 易扩展新的交易类型
   - 接口隔离 (ISP): API接口清晰简洁

2. **DRY原则**:
   - 复用 `CreditService` 服务类
   - 统一的错误处理
   - 共享的TypeScript类型

3. **KISS原则**:
   - 简洁的API设计
   - 清晰的数据库结构
   - 直观的代码逻辑

4. **YAGNI原则**:
   - 只实现必要功能
   - 没有过度设计
   - 代码简洁高效

**下一步工作** (未完成):

- [ ] 前端Header组件显示积分余额
- [ ] 用户个人中心积分历史页面
- [ ] 订阅续费自动充值积分
- [ ] 积分过期提醒功能

---

**创建时间**: 2025-01-22
**作者**: 老王
**版本**: v1.0
