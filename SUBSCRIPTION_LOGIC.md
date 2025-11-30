# 订阅逻辑设计文档

## 📋 用户状态分类

### 1. 未登录用户
- **定价页面行为**: 所有套餐按钮显示"登录以订阅"或"开始使用"
- **点击行为**: 跳转到登录页面 (`/login`)
- **登录后**: 返回定价页面，进入"已登录未订阅"状态

### 2. 已登录未订阅用户
- **定价页面行为**: 所有套餐按钮显示"开始使用"
- **点击行为**: 创建 Creem checkout session，跳转支付页面
- **支付成功后**:
  - Webhook 更新用户订阅状态到 Supabase
  - 返回成功页面，显示订阅信息
  - 再次访问定价页面时进入"已订阅"状态

### 3. 已订阅用户

#### 3.1 查看当前套餐
- **当前套餐卡片**:
  - 显示"当前套餐"标签
  - 按钮文字: "续订" (同等级) 或 "管理订阅"
  - 高亮显示（不同的边框颜色）

#### 3.2 查看更低套餐
- **按钮文字**: "降级到此套餐"
- **点击行为**:
  - 显示确认对话框
  - 确认后创建降级订单
  - 说明: "降级将在当前订阅周期结束后生效"

#### 3.3 查看更高套餐
- **按钮文字**: "升级到此套餐"
- **点击行为**:
  - 创建升级订单
  - 立即生效，按比例计费
  - 说明: "升级立即生效，将按比例计算剩余时间的费用"

#### 3.4 查看同等级不同周期
- **例如**: 当前是 Pro Monthly，查看 Pro Yearly
- **按钮文字**: "切换到年付"
- **点击行为**:
  - 显示确认对话框
  - 说明周期变更规则

## 🗄️ 数据库设计

### Supabase 表结构

#### `user_subscriptions` 表
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Creem 订阅信息
  creem_subscription_id TEXT UNIQUE NOT NULL,
  creem_customer_id TEXT NOT NULL,
  creem_product_id TEXT NOT NULL,

  -- 套餐信息
  plan_tier TEXT NOT NULL, -- 'basic' | 'pro' | 'max'
  billing_period TEXT NOT NULL, -- 'monthly' | 'yearly'

  -- 状态
  status TEXT NOT NULL, -- 'active' | 'cancelled' | 'expired' | 'past_due'

  -- 时间
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_creem_subscription_id ON user_subscriptions(creem_subscription_id);
```

#### `subscription_orders` 表（订单历史）
```sql
CREATE TABLE subscription_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id),

  -- Creem 订单信息
  creem_order_id TEXT UNIQUE NOT NULL,
  creem_checkout_id TEXT NOT NULL,

  -- 订单详情
  product_id TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',

  -- 状态
  status TEXT NOT NULL, -- 'pending' | 'completed' | 'failed' | 'refunded'

  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## 🔄 状态流转

### 支付流程
```
1. 用户点击"开始使用"
   → 检查登录状态
   → 未登录: 跳转 /login
   → 已登录: 调用 /api/checkout

2. /api/checkout
   → 从 Supabase 获取用户信息
   → 检查是否已有订阅
   → 创建 Creem checkout session
   → 返回 checkout URL

3. Creem 支付页面
   → 用户输入支付信息
   → 支付成功/失败

4. 支付成功 → Creem 触发两个回调:
   a) 重定向到 success_url (浏览器跳转)
      → /payment/success 页面
      → 显示成功信息
      → 轮询订阅状态（等待 webhook 处理完成）

   b) Webhook 回调 (服务器端)
      → /api/webhooks/creem
      → 验证签名
      → 更新/创建订阅记录到 Supabase
      → 创建订单记录

5. 用户返回定价页面
   → 从 Supabase 读取订阅状态
   → 显示对应的按钮和状态
```

### Webhook 事件处理

#### `checkout.completed` (一次性支付完成)
- 创建订单记录
- 如果是订阅产品，等待 `subscription.created` 事件

#### `subscription.created` (订阅创建)
- 创建 `user_subscriptions` 记录
- 设置状态为 `active`
- 记录周期开始/结束时间

#### `subscription.updated` (订阅更新)
- 更新 `user_subscriptions` 记录
- 可能的场景：
  - 升级/降级套餐
  - 切换计费周期
  - 价格调整

#### `subscription.cancelled` (订阅取消)
- 更新状态为 `cancelled`
- 设置 `cancel_at_period_end = true`
- 订阅在当前周期结束时失效

#### `payment.succeeded` (支付成功)
- 更新订单状态
- 如果是续订，更新订阅周期

#### `payment.failed` (支付失败)
- 更新订阅状态为 `past_due`
- 发送通知给用户

## 🎨 UI 状态设计

### 定价卡片按钮状态

```typescript
type UserSubscriptionStatus = 'none' | 'active' | 'cancelled' | 'expired' | 'past_due';

interface PlanButtonState {
  text: string;
  variant: 'default' | 'outline' | 'secondary';
  disabled?: boolean;
  action: 'login' | 'subscribe' | 'upgrade' | 'downgrade' | 'renew' | 'manage';
}

function getPlanButtonState(
  isLoggedIn: boolean,
  currentSubscription: UserSubscription | null,
  planTier: 'basic' | 'pro' | 'max',
  billingPeriod: 'monthly' | 'yearly'
): PlanButtonState {
  // 未登录
  if (!isLoggedIn) {
    return {
      text: '登录以订阅',
      variant: 'outline',
      action: 'login'
    };
  }

  // 已登录但无订阅
  if (!currentSubscription || currentSubscription.status === 'expired') {
    return {
      text: '开始使用',
      variant: 'default',
      action: 'subscribe'
    };
  }

  // 有订阅
  const tierOrder = { basic: 1, pro: 2, max: 3 };
  const currentTier = tierOrder[currentSubscription.plan_tier];
  const targetTier = tierOrder[planTier];

  const isSameTier = currentSubscription.plan_tier === planTier;
  const isSamePeriod = currentSubscription.billing_period === billingPeriod;

  // 当前套餐
  if (isSameTier && isSamePeriod) {
    return {
      text: currentSubscription.cancel_at_period_end ? '重新订阅' : '当前套餐',
      variant: 'secondary',
      disabled: !currentSubscription.cancel_at_period_end,
      action: 'renew'
    };
  }

  // 同等级不同周期
  if (isSameTier && !isSamePeriod) {
    return {
      text: billingPeriod === 'yearly' ? '切换到年付' : '切换到月付',
      variant: 'outline',
      action: 'subscribe'
    };
  }

  // 升级
  if (targetTier > currentTier) {
    return {
      text: '升级',
      variant: 'default',
      action: 'upgrade'
    };
  }

  // 降级
  return {
    text: '降级',
    variant: 'outline',
    action: 'downgrade'
  };
}
```

## 🔐 权限控制

### API 路由保护
```typescript
// middleware 或 API 路由中
async function requireAuth(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return user;
}

async function requireSubscription(userId: string, minTier?: 'basic' | 'pro' | 'max') {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 403 });
  }

  if (minTier) {
    const tierOrder = { basic: 1, pro: 2, max: 3 };
    if (tierOrder[subscription.plan_tier] < tierOrder[minTier]) {
      return NextResponse.json({ error: 'Insufficient subscription tier' }, { status: 403 });
    }
  }

  return subscription;
}
```

## 📍 实现优先级

### Phase 1: 基础认证和订阅流程 (当前)
- [x] 登录/注册功能
- [ ] 检查用户登录状态
- [ ] 未登录用户跳转登录
- [ ] 创建订阅数据表
- [ ] Webhook 更新订阅状态

### Phase 2: 订阅状态展示
- [ ] 获取用户当前订阅
- [ ] 定价页面根据订阅状态显示按钮
- [ ] 支付成功页面优化

### Phase 3: 订阅管理
- [ ] 升级/降级逻辑
- [ ] 取消订阅
- [ ] 续订功能
- [ ] 订阅历史页面

### Phase 4: 高级功能
- [ ] 发票管理
- [ ] 用量统计
- [ ] 邮件通知
- [ ] 客户门户集成
