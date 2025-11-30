-- ============================================================================
-- Webhook System RPC Functions
-- Created: 2025-11-28
-- Description: RPC functions for webhook management, event triggering,
--              and delivery processing
-- ============================================================================

-- ============================================================================
-- 1. Create Webhook - 创建 webhook 并自动生成 secret
-- ============================================================================
CREATE OR REPLACE FUNCTION create_webhook(
  p_name VARCHAR(255),
  p_url TEXT,
  p_description TEXT DEFAULT NULL,
  p_event_types TEXT[] DEFAULT '{}',
  p_retry_enabled BOOLEAN DEFAULT true,
  p_max_retries INTEGER DEFAULT 3,
  p_timeout_seconds INTEGER DEFAULT 30
)
RETURNS TABLE(
  webhook_id UUID,
  webhook_secret VARCHAR(255),
  subscribed_events JSONB
) AS $$
DECLARE
  v_webhook_id UUID;
  v_secret VARCHAR(255);
  v_event_type TEXT;
  v_subscribed_events JSONB := '[]'::jsonb;
BEGIN
  -- 生成随机 secret（32字节 = 64个十六进制字符）
  v_secret := encode(gen_random_bytes(32), 'hex');

  -- 创建 webhook
  INSERT INTO webhooks (
    user_id,
    name,
    url,
    description,
    secret,
    retry_enabled,
    max_retries,
    timeout_seconds
  ) VALUES (
    auth.uid(),
    p_name,
    p_url,
    p_description,
    v_secret,
    p_retry_enabled,
    p_max_retries,
    p_timeout_seconds
  )
  RETURNING id INTO v_webhook_id;

  -- 订阅事件
  IF array_length(p_event_types, 1) > 0 THEN
    FOREACH v_event_type IN ARRAY p_event_types LOOP
      -- 验证事件类型存在
      IF EXISTS (SELECT 1 FROM webhook_events WHERE event_type = v_event_type AND is_enabled = true) THEN
        INSERT INTO webhook_event_subscriptions (webhook_id, event_type)
        VALUES (v_webhook_id, v_event_type);

        -- 添加到返回的订阅列表
        v_subscribed_events := v_subscribed_events || to_jsonb(v_event_type);
      END IF;
    END LOOP;
  END IF;

  -- 返回结果
  RETURN QUERY
  SELECT
    v_webhook_id,
    v_secret,
    v_subscribed_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Subscribe to Events - 订阅事件
-- ============================================================================
CREATE OR REPLACE FUNCTION subscribe_webhook_events(
  p_webhook_id UUID,
  p_event_types TEXT[]
)
RETURNS TABLE(
  subscribed_count INTEGER,
  subscribed_events JSONB
) AS $$
DECLARE
  v_event_type TEXT;
  v_count INTEGER := 0;
  v_subscribed_events JSONB := '[]'::jsonb;
BEGIN
  -- 验证 webhook 属于当前用户
  IF NOT EXISTS (
    SELECT 1 FROM webhooks
    WHERE id = p_webhook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Webhook not found or access denied';
  END IF;

  -- 订阅事件
  FOREACH v_event_type IN ARRAY p_event_types LOOP
    -- 验证事件类型存在且已启用
    IF EXISTS (SELECT 1 FROM webhook_events WHERE event_type = v_event_type AND is_enabled = true) THEN
      -- 使用 ON CONFLICT 避免重复订阅
      INSERT INTO webhook_event_subscriptions (webhook_id, event_type)
      VALUES (p_webhook_id, v_event_type)
      ON CONFLICT (webhook_id, event_type) DO UPDATE
      SET is_active = true, updated_at = NOW();

      v_count := v_count + 1;
      v_subscribed_events := v_subscribed_events || to_jsonb(v_event_type);
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT v_count, v_subscribed_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Unsubscribe from Events - 取消订阅事件
-- ============================================================================
CREATE OR REPLACE FUNCTION unsubscribe_webhook_events(
  p_webhook_id UUID,
  p_event_types TEXT[]
)
RETURNS TABLE(
  unsubscribed_count INTEGER
) AS $$
DECLARE
  v_event_type TEXT;
  v_count INTEGER := 0;
BEGIN
  -- 验证 webhook 属于当前用户
  IF NOT EXISTS (
    SELECT 1 FROM webhooks
    WHERE id = p_webhook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Webhook not found or access denied';
  END IF;

  -- 取消订阅
  FOREACH v_event_type IN ARRAY p_event_types LOOP
    DELETE FROM webhook_event_subscriptions
    WHERE webhook_id = p_webhook_id AND event_type = v_event_type;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Trigger Webhook Event - 触发 webhook 事件（系统内部调用）
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_webhook_event(
  p_event_type VARCHAR(100),
  p_payload JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  delivery_id UUID,
  webhook_id UUID,
  webhook_url TEXT
) AS $$
DECLARE
  v_subscription RECORD;
  v_webhook RECORD;
  v_delivery_id UUID;
  v_signature VARCHAR(255);
  v_request_headers JSONB;
BEGIN
  -- 验证事件类型存在且已启用
  IF NOT EXISTS (SELECT 1 FROM webhook_events WHERE event_type = p_event_type AND is_enabled = true) THEN
    RAISE EXCEPTION 'Event type % not found or disabled', p_event_type;
  END IF;

  -- 查找所有订阅了该事件的活跃 webhooks
  FOR v_subscription IN
    SELECT
      wes.webhook_id,
      wes.filters
    FROM webhook_event_subscriptions wes
    INNER JOIN webhooks w ON w.id = wes.webhook_id
    WHERE wes.event_type = p_event_type
      AND wes.is_active = true
      AND w.is_active = true
      AND (p_user_id IS NULL OR w.user_id = p_user_id)
  LOOP
    -- 获取 webhook 详情
    SELECT * INTO v_webhook
    FROM webhooks
    WHERE id = v_subscription.webhook_id;

    -- 生成 HMAC 签名
    v_signature := v_webhook.signature_algorithm || '=' ||
      encode(
        hmac(p_payload::text, v_webhook.secret, v_webhook.signature_algorithm),
        'hex'
      );

    -- 准备请求头
    v_request_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'User-Agent', 'NanoBanana-Webhook/1.0',
      'X-Webhook-Signature', v_signature,
      'X-Webhook-Event', p_event_type,
      'X-Webhook-ID', v_webhook.id
    );

    -- 创建 delivery 记录
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_type,
      request_url,
      request_method,
      request_headers,
      request_payload,
      request_signature,
      status,
      max_attempts,
      metadata
    ) VALUES (
      v_webhook.id,
      p_event_type,
      v_webhook.url,
      'POST',
      v_request_headers,
      p_payload,
      v_signature,
      'pending',
      CASE WHEN v_webhook.retry_enabled THEN v_webhook.max_retries ELSE 1 END,
      jsonb_build_object(
        'retry_enabled', v_webhook.retry_enabled,
        'retry_delay_seconds', v_webhook.retry_delay_seconds,
        'timeout_seconds', v_webhook.timeout_seconds
      )
    )
    RETURNING id INTO v_delivery_id;

    -- 返回创建的 delivery
    RETURN QUERY
    SELECT
      v_delivery_id,
      v_webhook.id,
      v_webhook.url;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Get Webhook Statistics - 获取 webhook 统计信息
-- ============================================================================
CREATE OR REPLACE FUNCTION get_webhook_statistics(
  p_webhook_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  success_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  deliveries_by_day JSONB,
  deliveries_by_event_type JSONB
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  -- 验证 webhook 属于当前用户
  IF NOT EXISTS (
    SELECT 1 FROM webhooks
    WHERE id = p_webhook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Webhook not found or access denied';
  END IF;

  v_start_date := NOW() - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'success') AS success,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed,
      AVG(response_time_ms) FILTER (WHERE status = 'success') AS avg_time
    FROM webhook_deliveries
    WHERE webhook_id = p_webhook_id
      AND created_at >= v_start_date
  ),
  by_day AS (
    SELECT jsonb_object_agg(
      TO_CHAR(created_at::DATE, 'YYYY-MM-DD'),
      day_count
    ) AS deliveries_by_day
    FROM (
      SELECT
        created_at::DATE,
        COUNT(*) AS day_count
      FROM webhook_deliveries
      WHERE webhook_id = p_webhook_id
        AND created_at >= v_start_date
      GROUP BY created_at::DATE
      ORDER BY created_at::DATE
    ) daily
  ),
  by_event AS (
    SELECT jsonb_object_agg(
      event_type,
      event_count
    ) AS deliveries_by_event
    FROM (
      SELECT
        event_type,
        COUNT(*) AS event_count
      FROM webhook_deliveries
      WHERE webhook_id = p_webhook_id
        AND created_at >= v_start_date
      GROUP BY event_type
    ) events
  )
  SELECT
    stats.total,
    stats.success,
    stats.failed,
    CASE
      WHEN stats.total > 0 THEN ROUND((stats.success::NUMERIC / stats.total) * 100, 2)
      ELSE 0
    END AS success_rate,
    ROUND(stats.avg_time, 2) AS avg_response_time_ms,
    COALESCE(by_day.deliveries_by_day, '{}'::jsonb),
    COALESCE(by_event.deliveries_by_event, '{}'::jsonb)
  FROM stats, by_day, by_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Retry Failed Delivery - 重试失败的 delivery
-- ============================================================================
CREATE OR REPLACE FUNCTION retry_failed_delivery(
  p_delivery_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_delivery RECORD;
BEGIN
  -- 获取 delivery 详情并验证权限
  SELECT
    wd.*,
    w.user_id
  INTO v_delivery
  FROM webhook_deliveries wd
  INNER JOIN webhooks w ON w.id = wd.webhook_id
  WHERE wd.id = p_delivery_id
    AND w.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT false, 'Delivery not found or access denied';
    RETURN;
  END IF;

  -- 检查是否可以重试
  IF v_delivery.status = 'success' THEN
    RETURN QUERY
    SELECT false, 'Cannot retry successful delivery';
    RETURN;
  END IF;

  IF v_delivery.attempt_number >= v_delivery.max_attempts THEN
    RETURN QUERY
    SELECT false, 'Max retry attempts reached';
    RETURN;
  END IF;

  -- 更新 delivery 状态为 retrying
  UPDATE webhook_deliveries
  SET
    status = 'retrying',
    next_retry_at = NOW() + INTERVAL '1 minute',
    attempt_number = attempt_number + 1
  WHERE id = p_delivery_id;

  RETURN QUERY
  SELECT true, 'Delivery scheduled for retry';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Get Pending Retries - 获取待重试的 deliveries（系统内部调用）
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_webhook_retries(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  delivery_id UUID,
  webhook_id UUID,
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  event_type VARCHAR(100),
  request_payload JSONB,
  attempt_number INTEGER,
  max_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wd.id,
    wd.webhook_id,
    w.url,
    w.secret,
    wd.event_type,
    wd.request_payload,
    wd.attempt_number,
    wd.max_attempts
  FROM webhook_deliveries wd
  INNER JOIN webhooks w ON w.id = wd.webhook_id
  WHERE wd.status = 'retrying'
    AND wd.next_retry_at <= NOW()
    AND w.is_active = true
  ORDER BY wd.next_retry_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION create_webhook IS '创建新 webhook 并自动生成 secret，可选订阅事件';
COMMENT ON FUNCTION subscribe_webhook_events IS '为 webhook 订阅事件类型';
COMMENT ON FUNCTION unsubscribe_webhook_events IS '取消 webhook 的事件订阅';
COMMENT ON FUNCTION trigger_webhook_event IS '触发 webhook 事件，创建 delivery 记录（系统内部调用）';
COMMENT ON FUNCTION get_webhook_statistics IS '获取 webhook 的统计信息（最近 N 天）';
COMMENT ON FUNCTION retry_failed_delivery IS '手动重试失败的 delivery';
COMMENT ON FUNCTION get_pending_webhook_retries IS '获取待重试的 deliveries（系统 worker 调用）';
