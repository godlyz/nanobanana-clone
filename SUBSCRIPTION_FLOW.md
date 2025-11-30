# 订阅流程说明

## 功能概述

定价页面现已实现完整的订阅状态检测和智能按钮逻辑,支持未登录、已登录未订阅、已订阅等多种场景。

## 用户场景与按钮逻辑

### 1. 未登录用户
**按钮显示**: "登录开始使用" / "Sign In to Get Started"

**行为**: 点击后跳转到登录页面 `/login`

**适用场景**: 用户未登录时访问定价页面

---

### 2. 已登录但未订阅
**按钮显示**: "立即订阅" / "Subscribe Now"

**行为**: 点击后创建 Creem checkout session 并跳转到支付页面

**适用场景**: 用户已登录但没有任何活跃订阅

---

### 3. 已订阅用户

#### 3.1 当前套餐(相同计费周期)
**按钮显示**: "当前套餐" / "Current Plan"

**行为**: 按钮禁用,无法点击

**适用场景**: 用户当前订阅的套餐和计费周期与选择的一致

**示例**: 用户订阅了 Pro 月付,在 Pro 套餐月付选项上显示

---

#### 3.2 当前套餐(不同计费周期)
**按钮显示**: "续订套餐" / "Renew Plan"

**行为**: 创建新的 checkout session,更改计费周期

**适用场景**: 用户当前订阅的套餐相同但计费周期不同

**示例**: 用户订阅了 Pro 月付,在 Pro 套餐年付选项上显示

---

#### 3.3 升级套餐
**按钮显示**: "升级套餐" / "Upgrade"

**行为**: 创建 checkout session,升级到更高级别套餐

**适用场景**: 用户选择比当前更高级的套餐

**套餐等级**: Basic(1级) < Pro(2级) < Max(3级)

**示例**: 用户订阅了 Basic,在 Pro 或 Max 上显示

---

#### 3.4 降级/更换套餐
**按钮显示**: "更换套餐" / "Change Plan"

**行为**: 创建 checkout session,更换到其他套餐

**适用场景**: 用户选择比当前更低级的套餐

**示例**: 用户订阅了 Pro,在 Basic 上显示

---

## 技术实现

### API 端点

#### GET /api/subscription/status
返回用户的登录状态和订阅信息:

```typescript
{
  isLoggedIn: boolean
  user?: {
    id: string
    email: string
  }
  subscription?: {
    plan_id: string        // "basic" | "pro" | "max"
    status: string         // "active" | "past_due" | ...
    billing_period: string // "monthly" | "yearly"
  } | null
}
```

### 核心逻辑

```typescript
const getButtonConfig = (planId: string) => {
  // 1. 未登录 -> 跳转登录
  if (!isLoggedIn) {
    return { text: "登录", action: goToLogin }
  }

  // 2. 未订阅 -> 订阅
  if (!subscription) {
    return { text: "订阅", action: subscribe }
  }

  const currentPlan = subscription.plan_id
  const currentPeriod = subscription.billing_period

  // 3. 相同套餐相同周期 -> 当前套餐(禁用)
  if (currentPlan === planId && currentPeriod === billingPeriod) {
    return { text: "当前套餐", disabled: true }
  }

  // 4. 相同套餐不同周期 -> 续订
  if (currentPlan === planId) {
    return { text: "续订", action: subscribe }
  }

  // 5. 不同套餐 -> 升级/降级
  const levels = { basic: 1, pro: 2, max: 3 }
  if (levels[planId] > levels[currentPlan]) {
    return { text: "升级", action: subscribe }
  } else {
    return { text: "更换", action: subscribe }
  }
}
```

## 测试场景

### 场景 1: 未登录用户访问
1. 访问 https://loathly-insupportable-britni.ngrok-free.dev/pricing
2. 所有套餐按钮显示 "登录开始使用"
3. 点击任意按钮跳转到登录页

### 场景 2: 已登录未订阅
1. 登录后访问定价页面
2. 所有套餐按钮显示 "立即订阅"
3. 点击后进入 Creem 支付流程

### 场景 3: 已订阅 Basic 月付
1. 当前 Basic 月付: 显示 "当前套餐" (禁用)
2. 当前 Basic 年付: 显示 "续订套餐"
3. Pro 套餐: 显示 "升级套餐"
4. Max 套餐: 显示 "升级套餐"

### 场景 4: 已订阅 Pro 年付
1. Basic 套餐: 显示 "更换套餐"
2. 当前 Pro 月付: 显示 "续订套餐"
3. 当前 Pro 年付: 显示 "当前套餐" (禁用)
4. Max 套餐: 显示 "升级套餐"

### 场景 5: 支付成功后
1. 用户完成支付
2. Webhook 更新订阅状态
3. 刷新定价页面,按钮状态自动更新

## 相关文件

- [app/pricing/page.tsx](app/pricing/page.tsx) - 定价页面主逻辑
- [app/api/subscription/status/route.ts](app/api/subscription/status/route.ts) - 订阅状态 API
- [lib/language-context.tsx](lib/language-context.tsx) - 翻译文本
- [SUBSCRIPTION_LOGIC.md](SUBSCRIPTION_LOGIC.md) - 订阅逻辑详细说明
