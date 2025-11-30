-- 🔥 老王的通知系统数据库迁移
-- 用途: 创建通知表，支持多种通知类型和已读状态
-- 老王警告: 通知要及时清理，别让表越来越大撑爆数据库！

-- ============================================
-- 1. 创建通知表
-- ============================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'mention', 'reply', 'system')),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 触发通知的用户
  content_id UUID, -- 关联的内容ID（文章/作品/评论等）
  content_type TEXT CHECK (content_type IN ('blog_post', 'artwork', 'video', 'comment', NULL)),
  title TEXT, -- 通知标题（系统通知用）
  message TEXT, -- 通知内容预览
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ, -- 已读时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 创建索引（查询优化）
-- ============================================
-- 用户的未读通知（最常用）
CREATE INDEX idx_notifications_user_unread ON user_notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- 用户的所有通知（按时间倒序）
CREATE INDEX idx_notifications_user_time ON user_notifications(user_id, created_at DESC);

-- 按类型筛选
CREATE INDEX idx_notifications_type ON user_notifications(user_id, type);

-- 清理旧通知用
CREATE INDEX idx_notifications_created ON user_notifications(created_at);

-- ============================================
-- 3. RLS策略
-- ============================================
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 通知：只能查看自己的通知
CREATE POLICY "notifications_select_policy" ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 通知：系统或触发器创建（不允许用户直接创建）
-- 实际上通知由后端API创建，这里用service_role绕过RLS
CREATE POLICY "notifications_insert_policy" ON user_notifications
  FOR INSERT
  WITH CHECK (false); -- 禁止用户直接插入，由service_role创建

-- 通知：只能更新自己的通知（标记已读）
CREATE POLICY "notifications_update_policy" ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 通知：只能删除自己的通知
CREATE POLICY "notifications_delete_policy" ON user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. 辅助函数：创建通知（后端调用）
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_from_user_id UUID DEFAULT NULL,
  p_content_id UUID DEFAULT NULL,
  p_content_type TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- 不给自己发通知
  IF p_user_id = p_from_user_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_notifications (
    user_id, type, from_user_id, content_id, content_type, title, message
  ) VALUES (
    p_user_id, p_type, p_from_user_id, p_content_id, p_content_type, p_title, p_message
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 辅助函数：批量标记已读
-- ============================================
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL -- NULL表示全部标记已读
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- 全部标记已读
    UPDATE user_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
  ELSE
    -- 指定ID标记已读
    UPDATE user_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = FALSE;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 辅助函数：获取未读通知数量
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 触发器：关注时自动创建通知
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- 获取关注者昵称
  SELECT display_name INTO v_follower_name
  FROM user_profiles
  WHERE user_id = NEW.follower_id;

  -- 创建关注通知
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    NEW.follower_id,
    NULL,
    NULL,
    NULL,
    COALESCE(v_follower_name, '有人') || ' 关注了你'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 绑定到user_follows表
CREATE TRIGGER trigger_notify_on_follow
AFTER INSERT ON user_follows
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- ============================================
-- 8. 清理函数：删除30天前的已读通知
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM user_notifications
  WHERE is_read = TRUE AND read_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔥 老王备注：
-- 1. 通知类型：follow/like/comment/mention/reply/system
-- 2. 通知由后端API通过service_role创建，用户无法直接插入
-- 3. from_user_id设置ON DELETE SET NULL，用户删除后通知保留但显示"已注销用户"
-- 4. read_at记录已读时间，方便统计用户活跃度
-- 5. cleanup_old_notifications可以定期调用，清理30天前的已读通知
-- 6. 关注通知已通过触发器自动创建，其他通知需要在API层创建
