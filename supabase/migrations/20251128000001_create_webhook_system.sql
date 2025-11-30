-- ============================================================================
-- Webhook System Tables
-- Created: 2025-11-28
-- Description: Complete webhook system with event subscriptions, delivery
--              tracking, retry mechanism, and HMAC signature verification
-- ============================================================================

-- ============================================================================
-- 1. Webhooks Table - Main webhook registration
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Webhook 基本信息
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,

  -- 安全配置
  secret VARCHAR(255) NOT NULL, -- HMAC 签名密钥
  signature_algorithm VARCHAR(50) DEFAULT 'sha256' CHECK (signature_algorithm IN ('sha256', 'sha512')),

  -- 状态管理
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- URL 验证状态
  verification_token VARCHAR(255), -- URL 验证 token
  verified_at TIMESTAMPTZ,

  -- 重试配置
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0 AND max_retries <= 10),
  retry_delay_seconds INTEGER DEFAULT 60 CHECK (retry_delay_seconds >= 1 AND retry_delay_seconds <= 3600),

  -- 超时配置
  timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 1 AND timeout_seconds <= 300),

  -- 统计信息
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,

  -- 元数据
  metadata JSONB DEFAULT '{}',

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_name CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255)
);

-- 索引
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_created_at ON webhooks(created_at DESC);

-- RLS 策略
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhooks"
  ON webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks"
  ON webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks"
  ON webhooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Webhook Events Table - Available event types
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 事件信息
  event_type VARCHAR(100) NOT NULL UNIQUE, -- 例如: 'video.generated', 'credit.added'
  category VARCHAR(50) NOT NULL, -- 例如: 'video', 'credit', 'subscription'
  description TEXT,

  -- 事件配置
  is_enabled BOOLEAN DEFAULT true,
  payload_schema JSONB, -- JSON Schema for event payload

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_event_type CHECK (LENGTH(event_type) >= 3 AND LENGTH(event_type) <= 100),
  CONSTRAINT valid_category CHECK (LENGTH(category) >= 2 AND LENGTH(category) <= 50)
);

-- 索引
CREATE INDEX idx_webhook_events_category ON webhook_events(category);
CREATE INDEX idx_webhook_events_is_enabled ON webhook_events(is_enabled);

-- RLS 策略（事件类型对所有认证用户可见）
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event types"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. Webhook Event Subscriptions Table - Event subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL REFERENCES webhook_events(event_type) ON DELETE CASCADE,

  -- 订阅配置
  is_active BOOLEAN DEFAULT true,

  -- 过滤器（可选）
  filters JSONB DEFAULT '{}', -- 事件过滤条件，例如: {"status": "completed"}

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束
  UNIQUE(webhook_id, event_type)
);

-- 索引
CREATE INDEX idx_webhook_event_subs_webhook_id ON webhook_event_subscriptions(webhook_id);
CREATE INDEX idx_webhook_event_subs_event_type ON webhook_event_subscriptions(event_type);
CREATE INDEX idx_webhook_event_subs_is_active ON webhook_event_subscriptions(is_active);

-- RLS 策略
ALTER TABLE webhook_event_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook subscriptions"
  ON webhook_event_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_event_subscriptions.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their webhook subscriptions"
  ON webhook_event_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_event_subscriptions.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Webhook Deliveries Table - Delivery history and logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,

  -- 请求信息
  request_url TEXT NOT NULL,
  request_method VARCHAR(10) DEFAULT 'POST',
  request_headers JSONB DEFAULT '{}',
  request_payload JSONB NOT NULL,
  request_signature VARCHAR(255), -- HMAC 签名

  -- 响应信息
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_time_ms INTEGER, -- 响应时间（毫秒）

  -- 状态管理
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'retrying')),

  -- 重试信息
  attempt_number INTEGER DEFAULT 1 CHECK (attempt_number >= 1),
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- 错误信息
  error_message TEXT,
  error_code VARCHAR(50),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ, -- 成功投递时间
  failed_at TIMESTAMPTZ, -- 失败时间

  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'retrying';

-- RLS 策略
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Trigger Functions - Auto-update timestamps
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_updated_at();

CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_updated_at();

CREATE TRIGGER update_webhook_event_subs_updated_at
  BEFORE UPDATE ON webhook_event_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_updated_at();

-- ============================================================================
-- 6. Helper Functions - Statistics and utilities
-- ============================================================================

-- Function: Update webhook statistics after delivery
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 仅在状态变为 success 或 failed 时更新统计
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    UPDATE webhooks
    SET
      total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + 1,
      last_delivery_at = NOW(),
      last_success_at = NOW()
    WHERE id = NEW.webhook_id;
  ELSIF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    UPDATE webhooks
    SET
      total_deliveries = total_deliveries + 1,
      failed_deliveries = failed_deliveries + 1,
      last_delivery_at = NOW(),
      last_failure_at = NOW()
    WHERE id = NEW.webhook_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_stats
  AFTER INSERT OR UPDATE ON webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_stats();

-- ============================================================================
-- 7. Initial Event Types - Seed data
-- ============================================================================

INSERT INTO webhook_events (event_type, category, description, payload_schema) VALUES
  -- Video events
  ('video.generated', 'video', 'Video generation completed', '{
    "type": "object",
    "properties": {
      "video_id": {"type": "string"},
      "user_id": {"type": "string"},
      "status": {"type": "string"},
      "url": {"type": "string"}
    }
  }'::jsonb),
  ('video.failed', 'video', 'Video generation failed', '{
    "type": "object",
    "properties": {
      "video_id": {"type": "string"},
      "user_id": {"type": "string"},
      "error": {"type": "string"}
    }
  }'::jsonb),

  -- Credit events
  ('credit.added', 'credit', 'Credits added to account', '{
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "amount": {"type": "number"},
      "source": {"type": "string"}
    }
  }'::jsonb),
  ('credit.consumed', 'credit', 'Credits consumed', '{
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "amount": {"type": "number"},
      "reason": {"type": "string"}
    }
  }'::jsonb),

  -- Subscription events
  ('subscription.created', 'subscription', 'New subscription created', '{
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "plan": {"type": "string"},
      "billing_cycle": {"type": "string"}
    }
  }'::jsonb),
  ('subscription.renewed', 'subscription', 'Subscription renewed', '{
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "plan": {"type": "string"}
    }
  }'::jsonb),
  ('subscription.cancelled', 'subscription', 'Subscription cancelled', '{
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "plan": {"type": "string"},
      "reason": {"type": "string"}
    }
  }'::jsonb)
ON CONFLICT (event_type) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE webhooks IS 'Webhook 注册表，存储用户创建的 webhook 端点';
COMMENT ON TABLE webhook_events IS 'Webhook 事件类型定义表';
COMMENT ON TABLE webhook_event_subscriptions IS 'Webhook 事件订阅关系表';
COMMENT ON TABLE webhook_deliveries IS 'Webhook 调用记录和日志表';

COMMENT ON COLUMN webhooks.secret IS 'HMAC 签名密钥，用于验证 webhook 请求的真实性';
COMMENT ON COLUMN webhooks.signature_algorithm IS 'HMAC 签名算法，支持 sha256 和 sha512';
COMMENT ON COLUMN webhooks.is_verified IS 'Webhook URL 是否已通过验证';
COMMENT ON COLUMN webhooks.verification_token IS 'URL 验证 token，用于验证 webhook 端点所有权';

COMMENT ON COLUMN webhook_deliveries.request_signature IS '请求的 HMAC 签名，格式: sha256=xxxxx';
COMMENT ON COLUMN webhook_deliveries.attempt_number IS '当前尝试次数（1-based）';
COMMENT ON COLUMN webhook_deliveries.next_retry_at IS '下次重试时间（仅当 status = retrying 时有效）';
