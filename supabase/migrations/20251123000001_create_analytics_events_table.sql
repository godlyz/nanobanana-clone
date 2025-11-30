-- 🔥 老王创建：Analytics Events 表
-- 用途: 存储用户引导流程的所有分析事件
-- 这个表会记录大量数据，注意定期清理

-- 创建analytics_events表
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'tour_started',
    'tour_completed',
    'tour_skipped',
    'tour_step_view',
    'tour_step_back',
    'tour_step_next',
    'tour_error'
  )),
  tour_type TEXT NOT NULL CHECK (tour_type IN (
    'home',
    'editor',
    'api-docs',
    'pricing',
    'tools'
  )),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  step INTEGER,
  total_steps INTEGER,
  time_spent INTEGER, -- 秒
  completion_rate INTEGER, -- 百分比 (0-100)
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引提升查询性能
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_tour_type ON analytics_events(tour_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);

-- 创建复合索引用于常见查询
CREATE INDEX idx_analytics_events_tour_event ON analytics_events(tour_type, event_type);

-- 创建分区表（可选，用于大数据量场景）
-- 按月分区，方便数据清理
-- CREATE TABLE analytics_events_2025_11 PARTITION OF analytics_events
--   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 设置RLS策略（Row Level Security）
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 允许所有人插入（匿名用户也可以）
CREATE POLICY "允许所有人插入分析事件"
  ON analytics_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 只有管理员可以查看
CREATE POLICY "只有管理员可以查看分析事件"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- 只有管理员可以删除（用于数据清理）
CREATE POLICY "只有管理员可以删除分析事件"
  ON analytics_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- 创建视图：Tour完成率统计
CREATE OR REPLACE VIEW tour_completion_stats AS
SELECT
  tour_type,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'tour_started') AS total_starts,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'tour_completed') AS total_completions,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'tour_skipped') AS total_skips,
  ROUND(
    100.0 * COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'tour_completed') /
    NULLIF(COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'tour_started'), 0),
    2
  ) AS completion_rate,
  ROUND(AVG(time_spent) FILTER (WHERE event_type = 'tour_completed'), 2) AS avg_completion_time
FROM analytics_events
GROUP BY tour_type;

-- 创建视图：每日Tour统计
CREATE OR REPLACE VIEW tour_daily_stats AS
SELECT
  DATE(timestamp) AS date,
  tour_type,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) AS unique_users
FROM analytics_events
GROUP BY DATE(timestamp), tour_type, event_type
ORDER BY date DESC, tour_type, event_type;

-- 创建函数：获取Tour漏斗数据
CREATE OR REPLACE FUNCTION get_tour_funnel(p_tour_type TEXT)
RETURNS TABLE (
  step INTEGER,
  views INTEGER,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.step,
    COUNT(DISTINCT e.session_id)::INTEGER AS views,
    ROUND(
      100.0 * COUNT(DISTINCT e.session_id) /
      NULLIF((
        SELECT COUNT(DISTINCT session_id)
        FROM analytics_events
        WHERE tour_type = p_tour_type
        AND event_type = 'tour_started'
      ), 0),
      2
    ) AS completion_rate
  FROM analytics_events e
  WHERE e.tour_type = p_tour_type
  AND e.event_type = 'tour_step_view'
  GROUP BY e.step
  ORDER BY e.step;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：清理过期数据（保留90天）
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 🔥 老王备注：
-- 1. 表结构支持所有tour事件类型
-- 2. RLS策略：任何人可插入（包括匿名用户），只有管理员可查看
-- 3. 索引优化：event_type, tour_type, session_id, user_id, timestamp
-- 4. 创建了2个视图方便统计查询：完成率、每日统计
-- 5. 创建了2个函数：获取漏斗数据、清理过期数据
-- 6. 可选分区表设计（注释掉了），适合超大数据量场景
-- 7. 数据保留策略：90天，可以定期调用cleanup_old_analytics_events()
