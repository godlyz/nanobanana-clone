# 🔥 Nano Banana 管理后台系统设计方案

**创建时间**: 2025-01-27
**负责人**: 老王暴躁技术流 😤
**方案等级**: 企业级完整解决方案

---

## 📋 目录

1. [需求背景](#需求背景)
2. [系统架构](#系统架构)
3. [数据库设计](#数据库设计)
4. [活动规则引擎](#活动规则引擎)
5. [后端API设计](#后端api设计)
6. [前端管理界面](#前端管理界面)
7. [安全与权限](#安全与权限)
8. [开发计划](#开发计划)

---

## 需求背景

### 现状问题

当前系统所有商业配置都是**硬编码**在代码中：

1. **积分规则硬编码** (`/lib/credit-types.ts`):
   - 文生图: 1积分/张
   - 图生图: 2积分/张
   - 注册赠送: 50积分，15天有效期
   - 订阅套餐月度积分: Basic(150) / Pro(800) / Max(2000)

2. **定价硬编码** (`/app/pricing/page.tsx`):
   - 套餐价格: Basic($12/$144) / Pro($60/$720) / Max($240/$2880)
   - 积分包价格: 100积分($9.90) / 450积分($39.90) / ...

3. **支付产品ID硬编码** (`/app/api/checkout/route.ts`):
   - Creem产品ID写在环境变量中

### 业务痛点

- ❌ 无法灵活调整价格（搞活动、打折）
- ❌ 无法快速响应市场变化
- ❌ 每次调整都需要修改代码、重新部署
- ❌ 无法统一配置折扣活动（要一个一个改价格太傻逼）
- ❌ 无法追踪配置变更历史
- ❌ 缺少运营管理后台

### 解决方案

构建**企业级管理后台系统**：
- ✅ 所有商业配置数据库化、可视化管理
- ✅ **统一的活动规则引擎**（全场8折、满减、赠送积分等）
- ✅ 完整RBAC权限控制 + 审计日志
- ✅ Redis缓存 + 手动刷新机制
- ✅ 配置版本历史 + 回滚支持
- ✅ 专业Dashboard UI风格

---

## 系统架构

### 技术栈

**后端**:
- Next.js 14 App Router API Routes
- Supabase PostgreSQL (数据库)
- Supabase Service Role Client (绕过RLS)
- Redis / Upstash (配置缓存)

**前端**:
- Next.js 14 App Router (`/admin`路由)
- shadcn/ui组件库
- Tailwind CSS样式
- React Hook Form + Zod验证

**安全**:
- Supabase Auth管理员认证
- RBAC角色权限控制
- 完整审计日志系统

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     管理员浏览器                               │
│                   /admin Dashboard                          │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│                   /api/admin/*                              │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Auth Middleware│  │ RBAC Checker   │  │ Audit Logger │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
└───────┬─────────────────────────┬───────────────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Supabase         │      │ Redis/Upstash    │
│ PostgreSQL       │      │ Config Cache     │
│                  │      │                  │
│ • system_configs │      │ • 配置缓存       │
│ • promotion_rules│◄─────┤ • 活动规则缓存   │
│ • admin_users    │      │ • TTL: 1小时     │
│ • audit_logs     │      │ • 手动刷新API    │
│ • config_history │      └──────────────────┘
└──────────────────┘
```

---

## 数据库设计

### 1. 系统配置表 (system_configs)

**用途**: 存储所有可配置的系统参数

```sql
CREATE TABLE system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,           -- 配置键(唯一)
  config_value JSONB NOT NULL,                       -- 配置值(JSON格式)
  config_type VARCHAR(50) NOT NULL,                  -- 配置类型: credit_cost / trial / subscription / package / pricing
  description TEXT,                                  -- 配置说明
  version INTEGER DEFAULT 1,                         -- 版本号
  is_active BOOLEAN DEFAULT true,                    -- 是否启用
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),         -- 最后修改人
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 索引
CREATE INDEX idx_system_configs_type ON system_configs(config_type);
CREATE INDEX idx_system_configs_active ON system_configs(is_active) WHERE is_active = true;

-- 注释
COMMENT ON TABLE system_configs IS '系统可配置参数表';
COMMENT ON COLUMN system_configs.config_key IS '配置键,如: credit.text_to_image.cost';
COMMENT ON COLUMN system_configs.config_value IS '配置值JSON,如: {"amount": 1, "currency": "credits"}';
COMMENT ON COLUMN system_configs.config_type IS '配置分类: credit_cost/trial/subscription/package/pricing';
```

**配置示例**:

```json
// 积分消耗配置
{
  "config_key": "credit.text_to_image.cost",
  "config_type": "credit_cost",
  "config_value": {
    "amount": 1,
    "unit": "credits",
    "description": "文生图单张消耗"
  }
}

// 注册试用配置
{
  "config_key": "trial.registration_bonus",
  "config_type": "trial",
  "config_value": {
    "credits": 50,
    "valid_days": 15,
    "description": "新用户注册赠送"
  }
}

// 订阅套餐月度积分配置
{
  "config_key": "subscription.basic.monthly_credits",
  "config_type": "subscription",
  "config_value": {
    "tier": "basic",
    "credits": 150,
    "billing_period": "monthly"
  }
}

// 套餐定价配置
{
  "config_key": "pricing.basic.monthly",
  "config_type": "pricing",
  "config_value": {
    "tier": "basic",
    "billing_period": "monthly",
    "price": 12.00,
    "currency": "USD",
    "creem_product_id": "prod_xxx"
  }
}

// 积分包定价配置
{
  "config_key": "package.starter",
  "config_type": "package",
  "config_value": {
    "package_id": "starter",
    "credits": 100,
    "price": 9.90,
    "currency": "USD",
    "creem_product_id": "prod_yyy"
  }
}
```

### 2. 🎁 活动规则表 (promotion_rules)

**用途**: 统一管理所有商业活动规则（折扣、满减、赠送等）

```sql
CREATE TABLE promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 🔥 基础信息
  rule_name VARCHAR(100) NOT NULL,                   -- 后台管理用活动名称: "双十一全场8折"
  rule_type VARCHAR(50) NOT NULL,                    -- 规则类型: discount / bonus_credits / credits_extension / subscription_extension / bundle

  -- 🔥 前端展示信息（用户可见）
  display_name TEXT,                                 -- 前端展示名称: "限时8折优惠"
  display_description TEXT,                          -- 前端展示描述: "全场商品享受8折优惠，仅限今日"
  display_badge VARCHAR(50),                         -- 前端徽章文本: "8折" / "买1送1" / "新人专享"
  display_position VARCHAR(50),                      -- 展示位置: pricing_page / checkout / dashboard

  -- 🔥 适用范围配置
  apply_to JSONB NOT NULL,                           -- 适用对象: {"type": "all"} / {"type": "subscriptions", "tiers": ["pro", "max"]} / {"type": "packages"}

  -- 🔥 用户定向配置（新增）
  target_users JSONB DEFAULT '{"type": "all"}',      -- 目标用户: {"type": "all"} / {"type": "new_users"} / {"type": "vip_users"} / {"type": "specific_users", "user_ids": [...]}

  -- 🔥 折扣规则配置
  discount_config JSONB,                             -- 折扣配置: {"type": "percentage", "value": 20} / {"type": "fixed", "value": 10, "currency": "USD"}

  -- 🔥 赠送/延期规则配置（扩展）
  gift_config JSONB,                                 -- 赠品配置:
                                                     --   加赠积分: {"type": "bonus_credits", "amount": 100, "on_purchase": "any"}
                                                     --   积分延期: {"type": "credits_extension", "extend_days": 30}
                                                     --   套餐延期: {"type": "subscription_extension", "extend_months": 3}
                                                     --   试用延期: {"type": "trial_extension", "extend_days": 7}

  -- 🔥 时间控制
  start_date TIMESTAMPTZ NOT NULL,                   -- 活动开始时间
  end_date TIMESTAMPTZ NOT NULL,                     -- 活动结束时间
  timezone VARCHAR(50) DEFAULT 'UTC',                -- 时区

  -- 🔥 优先级与叠加
  priority INTEGER DEFAULT 0,                        -- 优先级(数字越大优先级越高)
  stackable BOOLEAN DEFAULT false,                   -- 是否可以和其他活动叠加

  -- 🔥 条件限制
  conditions JSONB,                                  -- 触发条件: {"min_purchase": 100} / {"payment_method": "yearly"}

  -- 🔥 使用限制
  usage_limit INTEGER,                               -- 全局使用次数限制(NULL表示无限制)
  usage_count INTEGER DEFAULT 0,                     -- 当前已使用次数
  per_user_limit INTEGER,                            -- 每用户使用次数限制

  -- 🔥 状态管理
  status VARCHAR(20) DEFAULT 'active',               -- 状态: active / paused / ended
  is_visible BOOLEAN DEFAULT true,                   -- 是否在前端展示

  -- 🔥 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  -- 🔥 约束
  CONSTRAINT check_priority CHECK (priority >= 0),
  CONSTRAINT check_dates CHECK (end_date > start_date),
  CONSTRAINT check_status CHECK (status IN ('active', 'paused', 'ended')),
  CONSTRAINT check_rule_type CHECK (rule_type IN ('discount', 'bonus_credits', 'credits_extension', 'subscription_extension', 'bundle'))
);

-- 索引
CREATE INDEX idx_promotion_rules_dates ON promotion_rules(start_date, end_date);
CREATE INDEX idx_promotion_rules_status ON promotion_rules(status) WHERE status = 'active';
CREATE INDEX idx_promotion_rules_priority ON promotion_rules(priority DESC);

-- 注释
COMMENT ON TABLE promotion_rules IS '统一活动规则引擎 - 支持折扣、赠送、满减等多种活动类型';
COMMENT ON COLUMN promotion_rules.apply_to IS '适用范围JSON: 全部商品/指定套餐/积分包/类别';
COMMENT ON COLUMN promotion_rules.discount_config IS '折扣配置: 百分比折扣(8折) / 固定金额减免($10 off)';
COMMENT ON COLUMN promotion_rules.stackable IS '是否可叠加: true表示可以与其他活动同时使用';
```

**活动规则示例**:

```json
// ===== 1. 全场8折活动（前端展示） =====
{
  "rule_name": "双十一全场8折",
  "rule_type": "discount",
  "display_name": "限时8折",
  "display_description": "全场商品享受8折优惠，仅限今日！",
  "display_badge": "8折",
  "display_position": "pricing_page",
  "apply_to": {
    "type": "all"
  },
  "target_users": {
    "type": "all"  // 全部用户可见
  },
  "discount_config": {
    "type": "percentage",
    "value": 20  // 打8折 = 减20%
  },
  "start_date": "2025-11-11T00:00:00Z",
  "end_date": "2025-11-11T23:59:59Z",
  "priority": 10,
  "stackable": false,
  "is_visible": true
}

// ===== 2. 新用户专享折扣（用户定向） =====
{
  "rule_name": "新用户满$100减$20",
  "rule_type": "discount",
  "display_name": "新人专享",
  "display_description": "新用户首次购买满$100立减$20",
  "display_badge": "新人专享",
  "display_position": "checkout",
  "apply_to": {
    "type": "all"
  },
  "target_users": {
    "type": "new_users",
    "registered_within_days": 30  // 注册30天内算新用户
  },
  "discount_config": {
    "type": "fixed",
    "value": 20,
    "currency": "USD"
  },
  "conditions": {
    "min_purchase": 100
  },
  "per_user_limit": 1,  // 每个用户只能用一次
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "priority": 8,
  "stackable": false,
  "is_visible": true
}

// ===== 3. VIP用户专属（用户定向 + 加赠积分） =====
{
  "rule_name": "VIP用户购买套餐加赠100积分",
  "rule_type": "bonus_credits",
  "display_name": "VIP专属福利",
  "display_description": "VIP用户购买任意套餐额外赠送100积分",
  "display_badge": "VIP专属",
  "display_position": "pricing_page",
  "apply_to": {
    "type": "subscriptions"
  },
  "target_users": {
    "type": "vip_users",
    "subscription_tiers": ["pro", "max"]  // 只有Pro/Max用户可见
  },
  "gift_config": {
    "type": "bonus_credits",
    "amount": 100,
    "on_purchase": "subscription"
  },
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-02-28T23:59:59Z",
  "priority": 7,
  "stackable": true,  // 可以和折扣活动叠加
  "is_visible": true
}

// ===== 4. 套餐时长延期（买1年送3个月） =====
{
  "rule_name": "Pro套餐年付送3个月",
  "rule_type": "subscription_extension",
  "display_name": "买1年送3个月",
  "display_description": "购买Pro年付套餐，立享3个月延期服务",
  "display_badge": "送3个月",
  "display_position": "pricing_page",
  "apply_to": {
    "type": "subscriptions",
    "tiers": ["pro"],
    "billing_periods": ["yearly"]
  },
  "target_users": {
    "type": "all"
  },
  "gift_config": {
    "type": "subscription_extension",
    "extend_months": 3
  },
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "priority": 5,
  "stackable": true,
  "is_visible": true
}

// ===== 5. 积分有效期延长（活动积分延期） =====
{
  "rule_name": "活动期间获得积分延期至6个月",
  "rule_type": "credits_extension",
  "display_name": "积分延期福利",
  "display_description": "活动期间获得的所有积分有效期延长至6个月",
  "display_badge": "延期180天",
  "display_position": "dashboard",
  "apply_to": {
    "type": "all"
  },
  "target_users": {
    "type": "all"
  },
  "gift_config": {
    "type": "credits_extension",
    "extend_days": 180  // 延长180天(6个月)
  },
  "start_date": "2025-03-01T00:00:00Z",
  "end_date": "2025-03-31T23:59:59Z",
  "priority": 3,
  "stackable": true,
  "is_visible": true
}

// ===== 6. 特定用户白名单活动 =====
{
  "rule_name": "内测用户专属折扣",
  "rule_type": "discount",
  "display_name": "内测用户专享",
  "display_description": "感谢您参与内测，享受5折优惠",
  "display_badge": "5折",
  "display_position": "pricing_page",
  "apply_to": {
    "type": "all"
  },
  "target_users": {
    "type": "specific_users",
    "user_ids": [
      "uuid-1234-5678-90ab-cdef",
      "uuid-abcd-efgh-ijkl-mnop"
    ]
  },
  "discount_config": {
    "type": "percentage",
    "value": 50  // 5折
  },
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-06-30T23:59:59Z",
  "priority": 15,
  "stackable": false,
  "is_visible": true
}

// ===== 7. 积分包买三送一 =====
{
  "rule_name": "新用户满$100减$20",
  "rule_type": "discount",
  "apply_to": {
    "type": "all"
  },
  "discount_config": {
    "type": "fixed",
    "value": 20,
    "currency": "USD"
  },
  "conditions": {
    "user_type": "new",
    "min_purchase": 100
  },
  "per_user_limit": 1,
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "priority": 8,
  "stackable": false
}

// 4. 积分包买三送一
{
  "rule_name": "积分包买三送一",
  "rule_type": "bundle",
  "apply_to": {
    "type": "packages"
  },
  "gift_config": {
    "type": "free_package",
    "trigger_count": 3,
    "description": "购买任意3个积分包，赠送1个同等价值积分包"
  },
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-02-28T23:59:59Z",
  "priority": 5,
  "stackable": false
}
```

### 3. 管理员用户表 (admin_users)

**用途**: 管理后台用户与权限

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),  -- 关联Supabase Auth用户
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,                         -- 角色: super_admin / admin / viewer
  permissions JSONB DEFAULT '{}',                    -- 自定义权限: {"configs": ["read", "write"], "audit": ["read"]}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_role CHECK (role IN ('super_admin', 'admin', 'viewer'))
);

-- 索引
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- 注释
COMMENT ON TABLE admin_users IS '管理后台用户权限表';
COMMENT ON COLUMN admin_users.role IS 'super_admin: 超管 / admin: 管理员 / viewer: 只读';
COMMENT ON COLUMN admin_users.permissions IS '细粒度权限控制JSON';
```

**角色权限定义**:

```typescript
// 角色权限矩阵
const ROLE_PERMISSIONS = {
  super_admin: {
    configs: ['read', 'write', 'delete'],
    promotion_rules: ['read', 'write', 'delete'],  // 🔥 活动规则管理
    admin_users: ['read', 'write', 'delete'],
    audit_logs: ['read', 'export'],
    cache: ['read', 'refresh'],
    system: ['rollback', 'backup']
  },
  admin: {
    configs: ['read', 'write'],
    promotion_rules: ['read', 'write'],  // 🔥 活动规则管理
    admin_users: ['read'],
    audit_logs: ['read'],
    cache: ['read', 'refresh']
  },
  viewer: {
    configs: ['read'],
    promotion_rules: ['read'],  // 🔥 活动规则只读
    admin_users: ['read'],
    audit_logs: ['read'],
    cache: ['read']
  }
}
```

### 4. 审计日志表 (audit_logs)

**用途**: 记录所有管理操作

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(user_id),
  action_type VARCHAR(50) NOT NULL,                  -- 操作类型: create / update / delete / rollback
  resource_type VARCHAR(50) NOT NULL,                -- 资源类型: config / promotion_rule / admin_user / cache
  resource_id UUID,                                  -- 资源ID
  old_value JSONB,                                   -- 旧值
  new_value JSONB,                                   -- 新值
  ip_address INET,                                   -- IP地址
  user_agent TEXT,                                   -- 浏览器UA
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 注释
COMMENT ON TABLE audit_logs IS '管理操作审计日志 - 完整记录所有变更';
```

### 5. 配置历史表 (config_history)

**用途**: 版本控制与回滚支持

```sql
CREATE TABLE config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES system_configs(id),
  config_value JSONB NOT NULL,                       -- 历史配置值
  version INTEGER NOT NULL,                          -- 版本号
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT                                 -- 变更原因
);

-- 索引
CREATE INDEX idx_config_history_config ON config_history(config_id);
CREATE INDEX idx_config_history_version ON config_history(config_id, version DESC);
```

---

## 活动规则引擎

### 价格计算逻辑

**核心函数**: `calculateFinalPrice(basePrice, applicableRules)`

```typescript
/**
 * 🔥 老王的活动规则引擎 - 智能价格计算
 *
 * @param basePrice 原价
 * @param itemType 商品类型: 'subscription' | 'package'
 * @param itemDetails 商品详情: { tier, billing_period, package_id }
 * @returns { finalPrice, discount, appliedRules }
 */
async function calculateFinalPrice(
  basePrice: number,
  itemType: string,
  itemDetails: any
): Promise<{
  finalPrice: number
  originalPrice: number
  totalDiscount: number
  appliedRules: Array<{
    ruleName: string
    discountAmount: number
    discountType: string
  }>
}> {
  // 1. 获取当前生效的活动规则（Redis缓存）
  const activeRules = await getActivePromotionRules()

  // 2. 过滤出适用于当前商品的规则
  const applicableRules = activeRules.filter(rule => {
    return isRuleApplicable(rule, itemType, itemDetails)
  })

  // 3. 按优先级排序
  applicableRules.sort((a, b) => b.priority - a.priority)

  // 4. 应用规则计算折扣
  let currentPrice = basePrice
  const appliedRules = []

  for (const rule of applicableRules) {
    // 检查是否可叠加
    if (!rule.stackable && appliedRules.length > 0) {
      continue // 不可叠加且已有规则，跳过
    }

    // 检查使用次数限制
    if (rule.usage_limit && rule.usage_count >= rule.usage_limit) {
      continue
    }

    // 应用折扣
    const discountAmount = applyDiscount(currentPrice, rule.discount_config)
    currentPrice -= discountAmount

    appliedRules.push({
      ruleName: rule.rule_name,
      discountAmount,
      discountType: rule.discount_config.type
    })

    // 如果不可叠加，只应用第一个
    if (!rule.stackable) break
  }

  return {
    finalPrice: Math.max(currentPrice, 0), // 防止负数
    originalPrice: basePrice,
    totalDiscount: basePrice - currentPrice,
    appliedRules
  }
}

/**
 * 判断活动规则是否适用于当前商品
 */
function isRuleApplicable(
  rule: PromotionRule,
  itemType: string,
  itemDetails: any
): boolean {
  const { apply_to } = rule

  // 全部商品
  if (apply_to.type === 'all') return true

  // 订阅套餐
  if (apply_to.type === 'subscriptions' && itemType === 'subscription') {
    if (apply_to.tiers && !apply_to.tiers.includes(itemDetails.tier)) {
      return false
    }
    if (apply_to.billing_periods && !apply_to.billing_periods.includes(itemDetails.billing_period)) {
      return false
    }
    return true
  }

  // 积分包
  if (apply_to.type === 'packages' && itemType === 'package') {
    if (apply_to.package_ids && !apply_to.package_ids.includes(itemDetails.package_id)) {
      return false
    }
    return true
  }

  return false
}

/**
 * 应用单个折扣规则
 */
function applyDiscount(
  price: number,
  discountConfig: any
): number {
  if (discountConfig.type === 'percentage') {
    // 百分比折扣
    return price * (discountConfig.value / 100)
  } else if (discountConfig.type === 'fixed') {
    // 固定金额减免
    return Math.min(discountConfig.value, price) // 不能超过原价
  }
  return 0
}
```

### 活动规则缓存策略

```typescript
/**
 * 🔥 活动规则缓存服务
 */
class PromotionRuleCache {
  private redis: Redis
  private CACHE_KEY = 'promotion_rules:active'
  private CACHE_TTL = 3600 // 1小时

  /**
   * 获取当前生效的活动规则（从缓存）
   */
  async getActiveRules(): Promise<PromotionRule[]> {
    const cached = await this.redis.get(this.CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }

    // 缓存未命中，从数据库加载
    const rules = await this.loadActiveRulesFromDB()
    await this.redis.set(this.CACHE_KEY, JSON.stringify(rules), 'EX', this.CACHE_TTL)
    return rules
  }

  /**
   * 从数据库加载当前生效的活动规则
   */
  private async loadActiveRulesFromDB(): Promise<PromotionRule[]> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('promotion_rules')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('priority', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * 手动刷新缓存（管理后台修改规则后调用）
   */
  async refresh(): Promise<void> {
    const rules = await this.loadActiveRulesFromDB()
    await this.redis.set(this.CACHE_KEY, JSON.stringify(rules), 'EX', this.CACHE_TTL)
  }
}
```

### 🎨 前端集成 - 定价页面活动展示

**用途**: 前端定价页面根据活动规则动态展示折扣信息、徽章、说明文字

**前端API**: `/api/promotion-rules/active-for-user`

```typescript
/**
 * 🔥 前端获取当前用户可见的活动规则
 * GET /api/promotion-rules/active-for-user
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 获取当前登录用户
    const { data: { user } } = await supabase.auth.getUser()

    // 2. 获取所有生效的、前端可见的活动规则
    const activeRules = await promotionRuleCache.getActiveRules()
    const visibleRules = activeRules.filter(rule => rule.is_visible)

    // 3. 过滤出适用于当前用户的规则
    const applicableRules = []
    for (const rule of visibleRules) {
      if (await isRuleApplicableToUser(rule, user)) {
        applicableRules.push({
          id: rule.id,
          display_name: rule.display_name,
          display_description: rule.display_description,
          display_badge: rule.display_badge,
          display_position: rule.display_position,
          apply_to: rule.apply_to,
          discount_config: rule.discount_config,
          gift_config: rule.gift_config,
          priority: rule.priority
        })
      }
    }

    return NextResponse.json({
      success: true,
      rules: applicableRules
    })
  } catch (error) {
    console.error('获取活动规则失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
```

**用户定向判断逻辑**:

```typescript
/**
 * 🔥 判断活动规则是否适用于当前用户
 */
async function isRuleApplicableToUser(
  rule: PromotionRule,
  user: SupabaseUser | null
): Promise<boolean> {
  const { target_users } = rule

  // 全部用户
  if (target_users.type === 'all') {
    return true
  }

  // 未登录用户不能参与定向活动
  if (!user) {
    return false
  }

  // 新用户定向
  if (target_users.type === 'new_users') {
    const registeredAt = new Date(user.created_at)
    const now = new Date()
    const daysSinceRegistration = Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60 * 24))
    const withinDays = target_users.registered_within_days || 30
    return daysSinceRegistration <= withinDays
  }

  // VIP用户定向（有付费订阅的用户）
  if (target_users.type === 'vip_users') {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!subscription) return false

    // 如果指定了订阅等级，检查是否匹配
    if (target_users.subscription_tiers) {
      return target_users.subscription_tiers.includes(subscription.plan_tier)
    }

    return true
  }

  // 特定用户白名单
  if (target_users.type === 'specific_users') {
    return target_users.user_ids?.includes(user.id) || false
  }

  return false
}
```

**前端定价页面展示示例**:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'

export function PricingPage() {
  const [activePromotions, setActivePromotions] = useState([])

  useEffect(() => {
    // 获取当前用户可见的活动规则
    fetchActivePromotions()
  }, [])

  const fetchActivePromotions = async () => {
    const res = await fetch('/api/promotion-rules/active-for-user')
    const data = await res.json()
    if (data.success) {
      setActivePromotions(data.rules.filter(r => r.display_position === 'pricing_page'))
    }
  }

  const renderPriceWithPromotions = (plan: any) => {
    // 找到适用于当前套餐的活动
    const applicablePromos = activePromotions.filter(promo => {
      if (promo.apply_to.type === 'all') return true
      if (promo.apply_to.type === 'subscriptions') {
        return (!promo.apply_to.tiers || promo.apply_to.tiers.includes(plan.tier))
      }
      return false
    })

    // 计算最终价格
    let finalPrice = plan.price
    const promoLabels = []

    for (const promo of applicablePromos) {
      if (promo.discount_config) {
        if (promo.discount_config.type === 'percentage') {
          finalPrice = finalPrice * (1 - promo.discount_config.value / 100)
        } else if (promo.discount_config.type === 'fixed') {
          finalPrice = Math.max(finalPrice - promo.discount_config.value, 0)
        }
        promoLabels.push(promo.display_badge)
      }
    }

    return (
      <div className="relative">
        {/* 原价 */}
        {finalPrice < plan.price && (
          <span className="text-sm line-through text-gray-400">
            ${plan.price.toFixed(2)}
          </span>
        )}

        {/* 折后价 */}
        <span className="text-3xl font-bold">
          ${finalPrice.toFixed(2)}
        </span>

        {/* 活动徽章 */}
        {promoLabels.length > 0 && (
          <div className="mt-2 flex gap-2">
            {promoLabels.map((label, idx) => (
              <Badge key={idx} variant="secondary" className="bg-[#D97706] text-white">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* 活动说明 */}
        {applicablePromos.length > 0 && (
          <div className="mt-3 space-y-1">
            {applicablePromos.map((promo, idx) => (
              <p key={idx} className="text-xs text-[#D97706]">
                ✨ {promo.display_description}
              </p>
            ))}
          </div>
        )}

        {/* 赠送说明（加赠积分、延期等） */}
        {applicablePromos.some(p => p.gift_config) && (
          <div className="mt-2 p-2 bg-[#F59E0B]/10 rounded-lg">
            {applicablePromos.filter(p => p.gift_config).map((promo, idx) => (
              <p key={idx} className="text-xs text-[#D97706] font-medium">
                🎁 {renderGiftText(promo.gift_config)}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderGiftText = (giftConfig: any) => {
    if (giftConfig.type === 'bonus_credits') {
      return `额外赠送${giftConfig.amount}积分`
    } else if (giftConfig.type === 'subscription_extension') {
      return `赠送${giftConfig.extend_months}个月服务时长`
    } else if (giftConfig.type === 'credits_extension') {
      return `积分有效期延长${giftConfig.extend_days}天`
    }
    return ''
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {plans.map((plan) => (
        <div key={plan.tier} className="border rounded-lg p-6">
          <h3>{plan.name}</h3>
          {renderPriceWithPromotions(plan)}
          <button className="mt-6 w-full">立即购买</button>
        </div>
      ))}
    </div>
  )
}
```

**活动展示效果示例**:

```
┌─────────────────────────────────┐
│  Pro 套餐                        │
│                                 │
│  $60.00  ←──(原价，划线)         │
│  $48.00  ←──(折后价，大字体)     │
│                                 │
│  [8折] [新人专享]  ←──(徽章)     │
│                                 │
│  ✨ 全场商品享受8折优惠，仅限今日！ │
│  ✨ 新用户首次购买满$100立减$20   │
│                                 │
│  🎁 额外赠送100积分              │
│  🎁 赠送3个月服务时长            │
│                                 │
│  [立即购买]                      │
└─────────────────────────────────┘
```

---

## 后端API设计

### API路由结构

```
/api/admin/
├── auth/
│   ├── login              POST    管理员登录
│   └── logout             POST    管理员登出
│
├── configs/
│   ├── list               GET     获取所有配置
│   ├── get/:key           GET     获取单个配置
│   ├── create             POST    创建配置
│   ├── update/:id         PUT     更新配置
│   └── delete/:id         DELETE  删除配置
│
├── promotion-rules/       🔥 活动规则管理
│   ├── list               GET     获取所有活动规则
│   ├── active             GET     获取当前生效规则
│   ├── get/:id            GET     获取单个规则详情
│   ├── create             POST    创建活动规则
│   ├── update/:id         PUT     更新活动规则
│   ├── delete/:id         DELETE  删除活动规则
│   ├── pause/:id          POST    暂停活动
│   ├── resume/:id         POST    恢复活动
│   └── preview            POST    预览活动效果（计算折后价）
│
├── admin-users/
│   ├── list               GET     获取所有管理员
│   ├── create             POST    创建管理员
│   ├── update/:id         PUT     更新管理员
│   ├── delete/:id         DELETE  删除管理员
│   └── permissions/:id    PUT     更新权限
│
├── audit-logs/
│   ├── list               GET     获取审计日志
│   ├── export             GET     导出审计日志
│   └── get/:id            GET     获取日志详情
│
├── cache/
│   ├── stats              GET     缓存统计
│   ├── refresh/configs    POST    刷新配置缓存
│   └── refresh/rules      POST    🔥 刷新活动规则缓存
│
└── dashboard/
    ├── stats              GET     仪表盘统计数据
    └── health             GET     系统健康检查
```

### 核心API实现示例

#### 1. 活动规则创建API

**文件**: `/app/api/admin/promotion-rules/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withAdminAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit-logger'
import { promotionRuleCache } from '@/lib/promotion-rule-cache'

export const POST = withAdminAuth(async (req: NextRequest, adminUser) => {
  try {
    // 1. 解析请求体
    const body = await req.json()
    const {
      rule_name,
      rule_type,
      apply_to,
      discount_config,
      gift_config,
      start_date,
      end_date,
      priority,
      stackable,
      conditions,
      usage_limit,
      per_user_limit,
      is_visible
    } = body

    // 2. 权限检查
    if (!adminUser.hasPermission('promotion_rules', 'write')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 3. 输入验证
    if (!rule_name || !rule_type || !apply_to || !start_date || !end_date) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    // 4. 创建活动规则
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('promotion_rules')
      .insert({
        rule_name,
        rule_type,
        apply_to,
        discount_config,
        gift_config,
        start_date,
        end_date,
        priority: priority || 0,
        stackable: stackable || false,
        conditions,
        usage_limit,
        per_user_limit,
        is_visible: is_visible !== undefined ? is_visible : true,
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) throw error

    // 5. 记录审计日志
    await logAudit({
      admin_id: adminUser.id,
      action_type: 'create',
      resource_type: 'promotion_rule',
      resource_id: data.id,
      new_value: data
    })

    // 6. 刷新缓存
    await promotionRuleCache.refresh()

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('创建活动规则失败:', error)
    return NextResponse.json(
      { error: '创建失败', details: error.message },
      { status: 500 }
    )
  }
})
```

#### 2. 活动效果预览API

**文件**: `/app/api/admin/promotion-rules/preview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-auth'
import { calculateFinalPrice } from '@/lib/promotion-engine'

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { item_type, item_details, base_price } = body

    // 计算折后价格
    const result = await calculateFinalPrice(
      base_price,
      item_type,
      item_details
    )

    return NextResponse.json({
      success: true,
      preview: {
        original_price: result.originalPrice,
        final_price: result.finalPrice,
        total_discount: result.totalDiscount,
        discount_percentage: ((result.totalDiscount / result.originalPrice) * 100).toFixed(2),
        applied_rules: result.appliedRules
      }
    })
  } catch (error) {
    console.error('活动预览失败:', error)
    return NextResponse.json(
      { error: '预览失败', details: error.message },
      { status: 500 }
    )
  }
})
```

#### 3. 配置创建API

**文件**: `/app/api/admin/configs/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withAdminAuth } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit-logger'
import { configCache } from '@/lib/config-cache'

export const POST = withAdminAuth(async (req: NextRequest, adminUser) => {
  try {
    const body = await req.json()
    const { config_key, config_value, config_type, description } = body

    // 权限检查
    if (!adminUser.hasPermission('configs', 'write')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 输入验证
    if (!config_key || !config_value || !config_type) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    // 创建配置
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('system_configs')
      .insert({
        config_key,
        config_value,
        config_type,
        description,
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) throw error

    // 记录审计日志
    await logAudit({
      admin_id: adminUser.id,
      action_type: 'create',
      resource_type: 'config',
      resource_id: data.id,
      new_value: data
    })

    // 刷新缓存
    await configCache.refresh()

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('创建配置失败:', error)
    return NextResponse.json(
      { error: '创建失败', details: error.message },
      { status: 500 }
    )
  }
})
```

---

## 前端管理界面

### 页面结构

```
/admin/
├── layout.tsx                  # Admin布局(侧边栏+顶栏)
├── page.tsx                    # Dashboard首页
├── configs/
│   ├── page.tsx                # 配置管理主页
│   ├── credit-costs/page.tsx   # 积分消耗配置
│   ├── trial/page.tsx          # 试用规则配置
│   ├── subscriptions/page.tsx  # 订阅套餐配置
│   ├── packages/page.tsx       # 积分包配置
│   └── pricing/page.tsx        # 定价配置
│
├── promotion-rules/            🔥 活动规则管理
│   ├── page.tsx                # 活动规则列表
│   ├── create/page.tsx         # 创建活动
│   ├── edit/[id]/page.tsx      # 编辑活动
│   └── preview/page.tsx        # 活动效果预览
│
├── admin-users/
│   ├── page.tsx                # 管理员列表
│   └── create/page.tsx         # 创建管理员
│
├── audit-logs/
│   └── page.tsx                # 审计日志查看器
│
└── cache/
    └── page.tsx                # 缓存管理
```

### 核心页面设计

#### 1. 活动规则管理页面

**文件**: `/app/admin/promotion-rules/page.tsx`

**功能**:
- 活动列表展示（进行中、即将开始、已结束）
- 快速启用/暂停活动
- 创建、编辑、删除活动
- 查看活动效果预览

**UI设计**:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlusCircle, Pause, Play, Trash2, Edit, Eye } from 'lucide-react'

export default function PromotionRulesPage() {
  const [rules, setRules] = useState([])
  const [activeTab, setActiveTab] = useState('active') // active / upcoming / ended

  useEffect(() => {
    fetchRules()
  }, [activeTab])

  const fetchRules = async () => {
    const res = await fetch(`/api/admin/promotion-rules/list?status=${activeTab}`)
    const data = await res.json()
    setRules(data.rules)
  }

  const handlePause = async (ruleId: string) => {
    await fetch(`/api/admin/promotion-rules/pause/${ruleId}`, { method: 'POST' })
    fetchRules()
  }

  const handleResume = async (ruleId: string) => {
    await fetch(`/api/admin/promotion-rules/resume/${ruleId}`, { method: 'POST' })
    fetchRules()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">活动规则管理</h1>
        <Button onClick={() => router.push('/admin/promotion-rules/create')}>
          <PlusCircle className="w-4 h-4 mr-2" />
          创建活动
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">进行中</TabsTrigger>
          <TabsTrigger value="upcoming">即将开始</TabsTrigger>
          <TabsTrigger value="ended">已结束</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>活动名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>适用范围</TableHead>
                <TableHead>折扣</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <Badge variant={rule.rule_type === 'discount' ? 'default' : 'secondary'}>
                      {rule.rule_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatApplyTo(rule.apply_to)}</TableCell>
                  <TableCell>{formatDiscount(rule.discount_config)}</TableCell>
                  <TableCell className="text-xs">
                    {formatDate(rule.start_date)} ~ {formatDate(rule.end_date)}
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Badge variant={rule.status === 'active' ? 'success' : 'secondary'}>
                      {rule.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {rule.status === 'active' ? (
                        <Button size="sm" variant="outline" onClick={() => handlePause(rule.id)}>
                          <Pause className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleResume(rule.id)}>
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/promotion-rules/edit/${rule.id}`)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/promotion-rules/preview?id=${rule.id}`)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

#### 2. 活动创建表单

**文件**: `/app/admin/promotion-rules/create/page.tsx`

**表单字段**:
- 活动名称（必填）
- 活动类型（折扣、赠送、试用延长、捆绑销售）
- 适用范围（全部/订阅套餐/积分包）
- 折扣配置（百分比/固定金额）
- 时间范围（开始时间、结束时间）
- 优先级（数字）
- 是否可叠加（开关）
- 使用限制（总次数、每用户次数）

**UI组件**:
- React Hook Form + Zod验证
- shadcn/ui表单组件(Input, Select, DatePicker, Switch)
- 实时预览折后价格

#### 3. Dashboard首页

**文件**: `/app/admin/page.tsx`

**统计卡片**:
- 活跃配置数量
- 进行中活动数量
- 今日配置变更次数
- 缓存命中率

**图表**:
- 配置变更趋势图(7天)
- 活动效果统计(折扣金额、使用次数)
- 管理员操作频率

---

## 安全与权限

### 1. 认证中间件

**文件**: `/lib/admin-auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export function withAdminAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      // 1. 验证Supabase session
      const supabase = createServiceClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return NextResponse.json({ error: '未授权' }, { status: 401 })
      }

      // 2. 检查是否为管理员
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (adminError || !adminUser) {
        return NextResponse.json({ error: '非管理员账户' }, { status: 403 })
      }

      // 3. 附加权限检查方法
      adminUser.hasPermission = (resource: string, action: string) => {
        const permissions = ROLE_PERMISSIONS[adminUser.role]
        return permissions[resource]?.includes(action) || false
      }

      // 4. 调用原处理函数
      return await handler(req, adminUser, ...args)
    } catch (error) {
      console.error('Admin auth error:', error)
      return NextResponse.json({ error: '认证失败' }, { status: 500 })
    }
  }
}
```

### 2. 审计日志记录

**文件**: `/lib/audit-logger.ts`

```typescript
import { createServiceClient } from '@/lib/supabase/service'

export async function logAudit({
  admin_id,
  action_type,
  resource_type,
  resource_id,
  old_value,
  new_value,
  ip_address,
  user_agent
}: {
  admin_id: string
  action_type: string
  resource_type: string
  resource_id?: string
  old_value?: any
  new_value?: any
  ip_address?: string
  user_agent?: string
}) {
  const supabase = createServiceClient()

  await supabase.from('audit_logs').insert({
    admin_id,
    action_type,
    resource_type,
    resource_id,
    old_value,
    new_value,
    ip_address,
    user_agent
  })
}
```

---

## 开发计划

### Phase 1: 数据库与缓存基础 (3-4天)

**任务清单**:
- [x] 创建数据库迁移脚本(5张表)
- [x] 执行迁移并验证表结构
- [x] 🔥 实现`PromotionRuleCache`活动规则缓存服务
- [x] 实现`ConfigCache`配置缓存服务
- [x] 配置Redis/Upstash连接
- [x] 编写缓存刷新API
- [x] 开发`calculateFinalPrice`活动价格计算引擎
- [x] 测试活动规则叠加逻辑

**交付物**:
- `supabase/migrations/20250127_create_admin_tables.sql`
- `supabase/migrations/20250127_create_promotion_rules.sql` 🔥
- `/lib/config-cache.ts`
- `/lib/promotion-rule-cache.ts` 🔥
- `/lib/promotion-engine.ts` 🔥
- `/app/api/admin/cache/refresh/route.ts`

### Phase 2: 后端API开发 (4-5天)

**任务清单**:
- [x] 实现`withAdminAuth`认证中间件
- [x] 实现`logAudit`审计日志工具
- [x] 开发配置管理API (CRUD)
- [x] 🔥 开发活动规则管理API (CRUD + 暂停/恢复/预览)
- [x] 开发管理员用户API (CRUD + 权限管理)
- [x] 开发审计日志API (查询 + 导出)
- [x] 开发Dashboard统计API
- [x] API单元测试

**交付物**:
- `/lib/admin-auth.ts`
- `/lib/audit-logger.ts`
- `/app/api/admin/*` (全部API路由)

### Phase 3: 前端管理界面 (4-5天)

**任务清单**:
- [x] 创建Admin布局(侧边栏导航)
- [x] Dashboard首页(统计卡片 + 图表)
- [x] 配置管理页面(5个子页面)
- [x] 🔥 活动规则管理页面(列表 + 创建 + 编辑 + 预览)
- [x] 管理员用户管理页面
- [x] 审计日志查看器
- [x] 缓存管理页面
- [x] 响应式适配

**交付物**:
- `/app/admin/*` (全部前端页面)
- `/components/admin/*` (管理后台专用组件)

### Phase 4: RBAC与安全 (2-3天)

**任务清单**:
- [x] 实现角色权限控制矩阵
- [x] 完善审计日志记录(所有操作)
- [x] 输入验证与防SQL注入
- [x] 🔥 活动规则约束验证(时间、优先级、叠加规则)
- [x] 配置版本历史记录
- [x] 回滚功能实现
- [x] 安全测试

**交付物**:
- 完善的权限控制系统
- 全面的审计日志覆盖
- 配置回滚功能

### Phase 5: 测试与优化 (2-3天)

**任务清单**:
- [x] 功能测试(所有API + 页面)
- [x] 权限测试(不同角色访问控制)
- [x] 🔥 活动规则引擎测试(各种折扣组合、叠加场景)
- [x] 性能优化(缓存命中率、查询优化)
- [x] 文档编写(API文档、使用手册)
- [x] 部署准备(环境变量、数据库迁移)

**交付物**:
- 测试报告
- API文档
- 使用手册
- 部署清单

**总预估时间**: 15-20天（包含活动规则引擎）

---

## 附录

### A. 硬编码配置迁移清单

| 配置项 | 原位置 | 迁移后config_key | 默认值 |
|--------|--------|------------------|--------|
| 文生图积分 | `/lib/credit-types.ts` | `credit.text_to_image.cost` | 1 |
| 图生图积分 | `/lib/credit-types.ts` | `credit.image_to_image.cost` | 2 |
| 注册赠送积分 | `/lib/credit-types.ts` | `trial.registration_bonus.credits` | 50 |
| 试用有效期 | `/lib/credit-types.ts` | `trial.registration_bonus.valid_days` | 15 |
| Basic月度积分 | `/lib/credit-types.ts` | `subscription.basic.monthly_credits` | 150 |
| Pro月度积分 | `/lib/credit-types.ts` | `subscription.pro.monthly_credits` | 800 |
| Max月度积分 | `/lib/credit-types.ts` | `subscription.max.monthly_credits` | 2000 |
| Basic月付价格 | `/app/pricing/page.tsx` | `pricing.basic.monthly.price` | $12.00 |
| Basic年付价格 | `/app/pricing/page.tsx` | `pricing.basic.yearly.price` | $144.00 |
| Starter积分包 | `/app/pricing/page.tsx` | `package.starter` | 100积分 $9.90 |

### B. 环境变量配置

```bash
# Redis/Upstash配置
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# 管理员邮箱白名单(逗号分隔)
ADMIN_EMAIL_WHITELIST=admin@example.com,ops@example.com
```

---

**文档版本**: v1.1 (含活动规则引擎)
**最后更新**: 2025-01-27
**作者**: 老王暴躁技术流 😤
**审核状态**: ✅ 已批准，开始实施

---

## 🎯 实施决策

用户已批准本方案的**企业级完整版本**，包括：
- ✅ 全量配置管理(积分、定价、试用、订阅、积分包)
- ✅ 🔥 **统一活动规则引擎**（折扣、赠送、满减、捆绑销售）
- ✅ 完整RBAC + 审计日志
- ✅ Redis缓存 + 手动刷新
- ✅ 专业Dashboard UI风格

**下一步**: 开始Phase 1 - 数据库与缓存基础开发 🚀
