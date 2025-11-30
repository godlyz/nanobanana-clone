-- ============================================================================
-- Webhook Worker RPC Functions
-- Created: 2025-11-29
-- Description: RPC functions for webhook delivery workers (BullMQ integration)
-- Author: 老王（暴躁技术流）
-- ============================================================================

-- ============================================================================
-- 1. Record Webhook Delivery - 记录Webhook投递结果
-- ============================================================================
CREATE OR REPLACE FUNCTION record_webhook_delivery(
  p_webhook_id UUID,
  p_event_type TEXT,
  p_payload JSONB,
  p_attempt_number INTEGER,
  p_status_code INTEGER,
  p_response_body TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_delivered_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  id UUID,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_delivery_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- 插入投递记录
  INSERT INTO webhook_deliveries (
    webhook_id,
    event_type,
    payload,
    attempt_number,
    status_code,
    response_body,
    error_message,
    response_time_ms,
    delivered_at
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    p_attempt_number,
    p_status_code,
    p_response_body,
    p_error_message,
    p_response_time_ms,
    p_delivered_at
  )
  RETURNING webhook_deliveries.id, webhook_deliveries.created_at
  INTO v_delivery_id, v_created_at;

  -- 更新Webhook统计（总调用次数+1）
  UPDATE webhooks
  SET total_deliveries = total_deliveries + 1
  WHERE id = p_webhook_id;

  -- 如果成功，更新成功次数
  IF p_status_code >= 200 AND p_status_code < 300 THEN
    UPDATE webhooks
    SET successful_deliveries = successful_deliveries + 1
    WHERE id = p_webhook_id;
  ELSE
    -- 如果失败，更新失败次数
    UPDATE webhooks
    SET failed_deliveries = failed_deliveries + 1
    WHERE id = p_webhook_id;
  END IF;

  -- 返回结果
  RETURN QUERY
  SELECT v_delivery_id, v_created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Increment Webhook Success - 增加成功次数（用于重试成功）
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_webhook_success(
  p_webhook_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhooks
  SET
    successful_deliveries = successful_deliveries + 1,
    failed_deliveries = GREATEST(failed_deliveries - 1, 0) -- 失败次数-1（不能小于0）
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Increment Webhook Failure - 增加失败次数（用于重试失败）
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_webhook_failure(
  p_webhook_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhooks
  SET failed_deliveries = failed_deliveries + 1
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Get Active Webhooks for Event - 获取订阅某事件的活跃Webhook列表
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_webhooks_for_event(
  p_event_type TEXT
)
RETURNS TABLE(
  webhook_id UUID,
  webhook_url TEXT,
  secret VARCHAR(255),
  signature_algorithm VARCHAR(50),
  timeout_seconds INTEGER,
  retry_enabled BOOLEAN,
  max_retries INTEGER,
  retry_delay_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.url,
    w.secret,
    w.signature_algorithm,
    w.timeout_seconds,
    w.retry_enabled,
    w.max_retries,
    w.retry_delay_seconds
  FROM webhooks w
  INNER JOIN webhook_event_subscriptions wes ON w.id = wes.webhook_id
  WHERE
    wes.event_type = p_event_type
    AND w.is_active = true
    AND w.is_verified = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Get Webhook Delivery Statistics - 获取Webhook投递统计
-- ============================================================================
CREATE OR REPLACE FUNCTION get_webhook_delivery_statistics(
  p_webhook_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  success_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  p50_response_time_ms NUMERIC,
  p95_response_time_ms NUMERIC,
  p99_response_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_deliveries,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::BIGINT AS successful_deliveries,
    COUNT(*) FILTER (WHERE status_code < 200 OR status_code >= 300)::BIGINT AS failed_deliveries,
    ROUND(
      (COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time_ms,
    MIN(response_time_ms) AS min_response_time_ms,
    MAX(response_time_ms) AS max_response_time_ms,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time_ms) AS p50_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_response_time_ms
  FROM webhook_deliveries
  WHERE
    webhook_id = p_webhook_id
    AND (p_start_date IS NULL OR delivered_at >= p_start_date)
    AND (p_end_date IS NULL OR delivered_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Get Recent Webhook Deliveries - 获取最近的投递记录
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recent_webhook_deliveries(
  p_webhook_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  status_code INTEGER,
  attempt_number INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wd.id,
    wd.event_type,
    wd.status_code,
    wd.attempt_number,
    wd.response_time_ms,
    wd.error_message,
    wd.delivered_at,
    wd.created_at
  FROM webhook_deliveries wd
  WHERE wd.webhook_id = p_webhook_id
  ORDER BY wd.delivered_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Clean Old Webhook Deliveries - 清理旧的投递记录（保留策略）
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_old_webhook_deliveries(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  deleted_count BIGINT
) AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY
  SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
-- 艹！授权：允许认证用户调用这些函数
GRANT EXECUTE ON FUNCTION record_webhook_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION increment_webhook_success TO authenticated;
GRANT EXECUTE ON FUNCTION increment_webhook_failure TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_webhooks_for_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_delivery_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_webhook_deliveries TO authenticated;

-- 艹！清理函数仅限服务角色调用（定时任务）
GRANT EXECUTE ON FUNCTION clean_old_webhook_deliveries TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION record_webhook_delivery IS '记录Webhook投递结果到数据库';
COMMENT ON FUNCTION increment_webhook_success IS '增加Webhook成功次数（重试成功时调用）';
COMMENT ON FUNCTION increment_webhook_failure IS '增加Webhook失败次数（重试失败时调用）';
COMMENT ON FUNCTION get_active_webhooks_for_event IS '获取订阅某事件的活跃Webhook列表';
COMMENT ON FUNCTION get_webhook_delivery_statistics IS '获取Webhook投递统计（成功率、响应时间等）';
COMMENT ON FUNCTION get_recent_webhook_deliveries IS '获取最近的投递记录';
COMMENT ON FUNCTION clean_old_webhook_deliveries IS '清理超过保留期的旧投递记录';
