-- 🔥 老王创建：论坛性能优化索引
-- 日期：2025-11-27
-- 用途：提升论坛搜索和分析API性能

-- 1. forum_threads 表索引
-- 时间范围查询优化（分析API常用）
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at
  ON forum_threads(created_at DESC)
  WHERE deleted_at IS NULL;

-- 全文搜索优化（已有search_vector的GIN索引，这里补充组合索引）
CREATE INDEX IF NOT EXISTS idx_forum_threads_search_deleted
  ON forum_threads(deleted_at, is_pinned DESC, is_featured DESC, created_at DESC);

-- 分类查询优化
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id
  ON forum_threads(category_id)
  WHERE deleted_at IS NULL;

-- 用户帖子查询优化
CREATE INDEX IF NOT EXISTS idx_forum_threads_user_id
  ON forum_threads(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. forum_replies 表索引
-- 时间范围查询优化
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at
  ON forum_replies(created_at DESC)
  WHERE deleted_at IS NULL;

-- 用户回复查询优化
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id
  ON forum_replies(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 帖子回复查询优化（已有thread_id索引，补充组合索引）
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_deleted
  ON forum_replies(thread_id, deleted_at, created_at DESC);

-- 3. user_profiles 表索引（用于手动JOIN优化）
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON user_profiles(user_id);

-- 添加索引使用说明注释
COMMENT ON INDEX idx_forum_threads_created_at IS '优化分析API的时间范围查询';
COMMENT ON INDEX idx_forum_threads_search_deleted IS '优化搜索API的排序和过滤';
COMMENT ON INDEX idx_forum_threads_category_id IS '优化分类筛选查询';
COMMENT ON INDEX idx_forum_threads_user_id IS '优化用户帖子列表查询';
COMMENT ON INDEX idx_forum_replies_created_at IS '优化分析API的回复统计';
COMMENT ON INDEX idx_forum_replies_user_id IS '优化用户回复列表查询';
COMMENT ON INDEX idx_forum_replies_thread_deleted IS '优化帖子详情页回复加载';
COMMENT ON INDEX idx_user_profiles_user_id IS '优化手动JOIN user_profiles查询';
