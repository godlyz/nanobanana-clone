-- ============================================
-- 🔥 老王创建：论坛举报系统数据库迁移
-- 日期：2025-11-25
-- 功能：创建举报表 + 审核记录 + 索引 + RLS策略
-- ============================================

-- ============================================
-- 1. 举报表 (forum_reports)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 举报目标
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id UUID NOT NULL,  -- 帖子ID或回复ID

  -- 举报人信息
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 举报内容
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',           -- 垃圾广告
    'harassment',     -- 骚扰辱骂
    'inappropriate',  -- 不当内容
    'illegal',        -- 违法内容
    'other'           -- 其他
  )),
  description TEXT,  -- 详细说明（可选）

  -- 审核状态
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',

  -- 审核信息
  reviewed_by UUID REFERENCES auth.users(id),  -- 审核员ID
  reviewed_at TIMESTAMPTZ,                     -- 审核时间
  review_note TEXT,                            -- 审核备注

  -- 处理结果
  action_taken TEXT CHECK (action_taken IN (
    'none',           -- 不处理
    'warning',        -- 警告
    'content_removed',-- 删除内容
    'user_banned'     -- 封禁用户
  )),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_forum_reports_target ON forum_reports(target_type, target_id);
CREATE INDEX idx_forum_reports_reporter ON forum_reports(reporter_id);
CREATE INDEX idx_forum_reports_status ON forum_reports(status);
CREATE INDEX idx_forum_reports_created ON forum_reports(created_at DESC);

-- 防止重复举报（同一用户对同一目标只能举报一次）
CREATE UNIQUE INDEX idx_forum_reports_unique ON forum_reports(
  reporter_id,
  target_type,
  target_id
) WHERE status = 'pending';

-- RLS策略
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己提交的举报
CREATE POLICY "forum_reports_select_own" ON forum_reports
  FOR SELECT
  USING (reporter_id = auth.uid());

-- 管理员可以查看所有举报
CREATE POLICY "forum_reports_select_admin" ON forum_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- 登录用户可以提交举报
CREATE POLICY "forum_reports_insert" ON forum_reports
  FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND auth.uid() IS NOT NULL
  );

-- 管理员可以更新举报状态
CREATE POLICY "forum_reports_update" ON forum_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- 2. 更新触发器（自动更新 updated_at）
-- ============================================
CREATE TRIGGER update_forum_reports_updated_at
  BEFORE UPDATE ON forum_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 举报统计视图（方便管理员查看）
-- ============================================
CREATE OR REPLACE VIEW forum_reports_stats AS
SELECT
  target_type,
  reason,
  status,
  COUNT(*) AS count,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS count_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS count_7d
FROM forum_reports
GROUP BY target_type, reason, status;

-- ============================================
-- 4. 函数：获取目标内容的举报数量
-- ============================================
CREATE OR REPLACE FUNCTION get_report_count(
  p_target_type TEXT,
  p_target_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM forum_reports
    WHERE target_type = p_target_type
    AND target_id = p_target_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 函数：检查用户是否已举报过
-- ============================================
CREATE OR REPLACE FUNCTION has_user_reported(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM forum_reports
    WHERE reporter_id = p_user_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 触发器：更新帖子/回复的举报标记
-- ============================================
CREATE OR REPLACE FUNCTION update_target_report_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- 当举报状态为 pending 时，标记目标为已举报
  IF NEW.status = 'pending' THEN
    IF NEW.target_type = 'thread' THEN
      UPDATE forum_threads
      SET is_reported = TRUE
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'reply' THEN
      UPDATE forum_replies
      SET is_reported = TRUE
      WHERE id = NEW.target_id;
    END IF;
  END IF;

  -- 当所有举报都被处理完后，取消举报标记
  IF NEW.status IN ('approved', 'rejected') THEN
    IF NEW.target_type = 'thread' THEN
      IF NOT EXISTS (
        SELECT 1 FROM forum_reports
        WHERE target_type = 'thread'
        AND target_id = NEW.target_id
        AND status = 'pending'
      ) THEN
        UPDATE forum_threads
        SET is_reported = FALSE
        WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'reply' THEN
      IF NOT EXISTS (
        SELECT 1 FROM forum_reports
        WHERE target_type = 'reply'
        AND target_id = NEW.target_id
        AND status = 'pending'
      ) THEN
        UPDATE forum_replies
        SET is_reported = FALSE
        WHERE id = NEW.target_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_target_report_flag
  AFTER INSERT OR UPDATE ON forum_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_target_report_flag();

-- ============================================
-- 完成
-- ============================================
-- 举报系统表创建完成！
-- 下一步：创建 API 路由和管理界面
