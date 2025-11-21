-- 📋 订阅系统数据库设置脚本
--
-- 使用方法:
-- 1. 登录 Supabase Dashboard: https://supabase.com/dashboard
-- 2. 选择你的项目
-- 3. 进入 SQL Editor
-- 4. 复制粘贴此脚本并执行

-- ===== 创建订阅表 =====
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Creem 订阅信息
  creem_subscription_id TEXT UNIQUE NOT NULL,
  creem_customer_id TEXT NOT NULL,
  creem_product_id TEXT NOT NULL,

  -- 套餐信息
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'max')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),

  -- 状态
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),

  -- 时间
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 创建订单历史表 =====
CREATE TABLE IF NOT EXISTS subscription_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

  -- Creem 订单信息
  creem_order_id TEXT UNIQUE NOT NULL,
  creem_checkout_id TEXT NOT NULL,

  -- 订单详情
  product_id TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',

  -- 状态
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ===== 创建索引 =====
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_creem_subscription_id ON user_subscriptions(creem_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_user_id ON subscription_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_subscription_id ON subscription_orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_creem_order_id ON subscription_orders(creem_order_id);

-- ===== 创建更新时间触发器 =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 启用 RLS (Row Level Security) =====
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_orders ENABLE ROW LEVEL SECURITY;

-- ===== RLS 策略 =====

-- 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own orders" ON subscription_orders;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can insert orders" ON subscription_orders;
DROP POLICY IF EXISTS "Service role can update orders" ON subscription_orders;

-- 用户只能查看自己的订阅
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能查看自己的订单
CREATE POLICY "Users can view own orders"
  ON subscription_orders FOR SELECT
  USING (auth.uid() = user_id);

-- 服务角色可以插入和更新订阅（用于 webhook）
CREATE POLICY "Service role can insert subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (true);

-- 服务角色可以插入和更新订单
CREATE POLICY "Service role can insert orders"
  ON subscription_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update orders"
  ON subscription_orders FOR UPDATE
  USING (true);

-- ===== 验证表创建 =====
SELECT 'user_subscriptions 表已创建' AS message
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
);

SELECT 'subscription_orders 表已创建' AS message
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'subscription_orders'
);

-- 完成
SELECT '✅ 订阅系统数据库设置完成！' AS status;
