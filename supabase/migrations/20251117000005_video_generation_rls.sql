-- supabase/migrations/20251117000005_video_generation_rls.sql
-- video_generation_history 表的 Row Level Security (RLS) 策略
-- 确保用户只能访问自己的视频记录

-- ============================================
-- 1. 启用 RLS
-- ============================================

ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除旧策略（如果存在）
-- ============================================

DROP POLICY IF EXISTS "Users can view own video history" ON video_generation_history;
DROP POLICY IF EXISTS "Users can insert own video records" ON video_generation_history;
DROP POLICY IF EXISTS "Service role can manage all video records" ON video_generation_history;

-- ============================================
-- 3. 用户策略：只能查看自己的视频
-- ============================================

CREATE POLICY "Users can view own video history"
ON video_generation_history
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- 4. 用户策略：只能插入自己的视频记录
-- ============================================
-- 注意：实际插入由 Service Role 执行（API端点），
-- 此策略仅用于应用层直接调用时的安全保障

CREATE POLICY "Users can insert own video records"
ON video_generation_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Service Role 策略：完全访问权限
-- ============================================
-- Service Role 需要完全权限来执行 Cron 任务、状态更新等

CREATE POLICY "Service role can manage all video records"
ON video_generation_history
FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- 6. 注释说明
-- ============================================

COMMENT ON POLICY "Users can view own video history" ON video_generation_history IS
'允许用户查询自己的视频生成历史记录';

COMMENT ON POLICY "Users can insert own video records" ON video_generation_history IS
'允许用户插入自己的视频生成记录（实际由API端点通过Service Role执行）';

COMMENT ON POLICY "Service role can manage all video records" ON video_generation_history IS
'Service Role拥有完全访问权限，用于执行Cron任务、状态更新、失败处理等';
