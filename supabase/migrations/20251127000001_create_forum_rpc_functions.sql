-- ============================================================================
-- 🔥 老王创建：论坛性能优化 - RPC函数集合
-- 日期：2025-11-27
-- 用途：将复杂的客户端聚合查询移至数据库层，减少网络传输和提升性能
-- ============================================================================

-- ============================================================================
-- 函数1：论坛分析统计（时间序列数据 + 汇总指标）
-- ============================================================================
CREATE OR REPLACE FUNCTION get_forum_analytics_timeseries(
  days_param INT DEFAULT 30
)
RETURNS TABLE (
  -- 时间序列数据（每日统计）
  date_str TEXT,
  posts_count BIGINT,
  replies_count BIGINT,
  active_users_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    -- 生成日期序列（最近N天）
    SELECT
      (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, days_param - 1))::DATE AS date
  ),
  daily_threads AS (
    -- 每日发帖数
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM forum_threads
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param
      AND deleted_at IS NULL
    GROUP BY DATE(created_at)
  ),
  daily_replies AS (
    -- 每日回复数
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM forum_replies
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param
      AND deleted_at IS NULL
    GROUP BY DATE(created_at)
  ),
  daily_users AS (
    -- 每日活跃用户数（去重）
    SELECT
      date,
      COUNT(DISTINCT user_id) AS count
    FROM (
      SELECT DATE(created_at) AS date, user_id FROM forum_threads WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param AND deleted_at IS NULL
      UNION ALL
      SELECT DATE(created_at) AS date, user_id FROM forum_replies WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param AND deleted_at IS NULL
    ) combined
    GROUP BY date
  )
  SELECT
    ds.date::TEXT AS date_str,
    COALESCE(dt.count, 0) AS posts_count,
    COALESCE(dr.count, 0) AS replies_count,
    COALESCE(du.count, 0) AS active_users_count
  FROM date_series ds
  LEFT JOIN daily_threads dt ON ds.date = dt.date
  LEFT JOIN daily_replies dr ON ds.date = dr.date
  LEFT JOIN daily_users du ON ds.date = du.date
  ORDER BY ds.date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_forum_analytics_timeseries IS '获取论坛时间序列统计数据（每日发帖数、回复数、活跃用户数）';


-- ============================================================================
-- 函数2：论坛汇总指标（总数、参与度、增长率）
-- ============================================================================
CREATE OR REPLACE FUNCTION get_forum_analytics_summary(
  days_param INT DEFAULT 30
)
RETURNS TABLE (
  total_posts BIGINT,
  total_replies BIGINT,
  engagement_rate NUMERIC,
  avg_replies_per_thread NUMERIC,
  prev_period_posts BIGINT,
  prev_period_replies BIGINT,
  thread_growth_rate NUMERIC,
  reply_growth_rate NUMERIC
) AS $$
DECLARE
  start_date TIMESTAMP;
  prev_start_date TIMESTAMP;
BEGIN
  start_date := CURRENT_DATE - INTERVAL '1 day' * days_param;
  prev_start_date := start_date - INTERVAL '1 day' * days_param;

  RETURN QUERY
  WITH current_period AS (
    SELECT
      COUNT(DISTINCT t.id) AS posts,
      COUNT(r.id) AS replies
    FROM forum_threads t
    LEFT JOIN forum_replies r ON r.thread_id = t.id AND r.deleted_at IS NULL
    WHERE t.created_at >= start_date
      AND t.deleted_at IS NULL
  ),
  previous_period AS (
    SELECT
      COUNT(DISTINCT t.id) AS posts,
      COUNT(r.id) AS replies
    FROM forum_threads t
    LEFT JOIN forum_replies r ON r.thread_id = t.id AND r.deleted_at IS NULL
    WHERE t.created_at >= prev_start_date
      AND t.created_at < start_date
      AND t.deleted_at IS NULL
  )
  SELECT
    cp.posts AS total_posts,
    cp.replies AS total_replies,
    CASE
      WHEN cp.posts > 0 THEN ROUND(cp.replies::NUMERIC / cp.posts, 2)
      ELSE 0
    END AS engagement_rate,
    CASE
      WHEN cp.posts > 0 THEN ROUND(cp.replies::NUMERIC / cp.posts, 1)
      ELSE 0
    END AS avg_replies_per_thread,
    pp.posts AS prev_period_posts,
    pp.replies AS prev_period_replies,
    CASE
      WHEN pp.posts > 0 THEN ROUND(((cp.posts - pp.posts)::NUMERIC / pp.posts) * 100, 2)
      ELSE 0
    END AS thread_growth_rate,
    CASE
      WHEN pp.replies > 0 THEN ROUND(((cp.replies - pp.replies)::NUMERIC / pp.replies) * 100, 2)
      ELSE 0
    END AS reply_growth_rate
  FROM current_period cp
  CROSS JOIN previous_period pp;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_forum_analytics_summary IS '获取论坛汇总指标（总数、参与度、增长率）';


-- ============================================================================
-- 函数3：最活跃贡献者（发帖数 + 回复数）
-- ============================================================================
CREATE OR REPLACE FUNCTION get_forum_top_contributors(
  days_param INT DEFAULT 30,
  limit_param INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  contribution_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH contributions AS (
    SELECT
      user_id,
      COUNT(*) AS count
    FROM (
      SELECT user_id FROM forum_threads WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param AND deleted_at IS NULL
      UNION ALL
      SELECT user_id FROM forum_replies WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_param AND deleted_at IS NULL
    ) combined
    GROUP BY user_id
  )
  SELECT
    c.user_id,
    COALESCE(up.display_name, 'Anonymous') AS display_name,
    up.avatar_url,
    c.count AS contribution_count
  FROM contributions c
  LEFT JOIN user_profiles up ON up.user_id = c.user_id
  ORDER BY c.count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_forum_top_contributors IS '获取最活跃贡献者（按发帖数+回复数排序）';


-- ============================================================================
-- 函数4：分类分布统计
-- ============================================================================
CREATE OR REPLACE FUNCTION get_forum_category_distribution()
RETURNS TABLE (
  category_id UUID,
  name TEXT,
  name_en TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH category_counts AS (
    SELECT
      t.category_id,
      c.name,
      c.name_en,
      COUNT(*) AS count
    FROM forum_threads t
    LEFT JOIN forum_categories c ON c.id = t.category_id
    WHERE t.deleted_at IS NULL
    GROUP BY t.category_id, c.name, c.name_en
  ),
  total_count AS (
    SELECT SUM(count) AS total FROM category_counts
  )
  SELECT
    cc.category_id,
    cc.name,
    cc.name_en,
    cc.count,
    ROUND((cc.count::NUMERIC / tc.total) * 100, 2) AS percentage
  FROM category_counts cc
  CROSS JOIN total_count tc
  ORDER BY cc.count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_forum_category_distribution IS '获取论坛分类分布统计（含百分比）';


-- ============================================================================
-- 函数5：搜索优化（全文搜索 + 相关性排序）
-- ============================================================================
CREATE OR REPLACE FUNCTION search_forum_threads_optimized(
  search_query TEXT,
  category_filter UUID DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  limit_param INT DEFAULT 20,
  offset_param INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  user_id UUID,
  category_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  view_count INT,
  reply_count INT,
  upvote_count INT,
  is_pinned BOOLEAN,
  is_featured BOOLEAN,
  relevance_score REAL
) AS $$
DECLARE
  search_tsquery TSQUERY;
BEGIN
  -- 将搜索词转换为 tsquery（支持中英文）
  search_tsquery := plainto_tsquery('simple', search_query);

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.content,
    t.user_id,
    t.category_id,
    t.created_at,
    t.updated_at,
    t.view_count,
    t.reply_count,
    t.upvote_count,
    t.is_pinned,
    t.is_featured,
    -- 相关性评分（标题权重 > 内容权重）
    (ts_rank(to_tsvector('simple', t.title), search_tsquery) * 2.0 +
     ts_rank(to_tsvector('simple', t.content), search_tsquery))::REAL AS relevance_score
  FROM forum_threads t
  WHERE t.deleted_at IS NULL
    AND (
      to_tsvector('simple', t.title) @@ search_tsquery
      OR to_tsvector('simple', t.content) @@ search_tsquery
    )
    AND (category_filter IS NULL OR t.category_id = category_filter)
  ORDER BY
    CASE
      WHEN sort_by = 'relevance' THEN relevance_score
      ELSE 0
    END DESC,
    CASE
      WHEN sort_by = 'latest' THEN EXTRACT(EPOCH FROM t.created_at)
      ELSE 0
    END DESC,
    CASE
      WHEN sort_by = 'popular' THEN t.upvote_count
      ELSE 0
    END DESC,
    -- 置顶和精华优先
    t.is_pinned DESC,
    t.is_featured DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_forum_threads_optimized IS '优化的论坛搜索（全文搜索 + 相关性评分 + 多种排序）';


-- ============================================================================
-- 权限设置（允许匿名用户和认证用户调用这些函数）
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_forum_analytics_timeseries TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_forum_analytics_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_forum_top_contributors TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_forum_category_distribution TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_forum_threads_optimized TO anon, authenticated;


-- ============================================================================
-- 回滚脚本（如果需要删除这些函数）
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_forum_analytics_timeseries;
-- DROP FUNCTION IF EXISTS get_forum_analytics_summary;
-- DROP FUNCTION IF EXISTS get_forum_top_contributors;
-- DROP FUNCTION IF EXISTS get_forum_category_distribution;
-- DROP FUNCTION IF EXISTS search_forum_threads_optimized;
