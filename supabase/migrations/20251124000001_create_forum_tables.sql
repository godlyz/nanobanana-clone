-- ============================================
-- 🔥 老王创建：Phase 4 Community Forum 数据库迁移
-- 日期：2025-11-24
-- 功能：创建论坛核心表（7个表 + 索引 + 触发器 + RLS策略）
-- ============================================

-- ============================================
-- 1. 论坛分类表 (forum_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                  -- 分类名称（中文）
  name_en TEXT,                         -- 英文名称
  slug TEXT UNIQUE NOT NULL,            -- URL slug
  description TEXT,                     -- 分类描述（中文）
  description_en TEXT,                  -- 英文描述
  icon TEXT,                            -- 图标（emoji 或 URL）
  color TEXT DEFAULT '#3B82F6',        -- 主题颜色（#hexcode）
  sort_order INTEGER DEFAULT 0,         -- 排序权重
  is_visible BOOLEAN DEFAULT TRUE,      -- 是否可见
  thread_count INTEGER DEFAULT 0,       -- 帖子数量（触发器维护）
  reply_count INTEGER DEFAULT 0,        -- 回复数量（触发器维护）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_forum_categories_visible ON forum_categories(is_visible);
CREATE INDEX idx_forum_categories_sort ON forum_categories(sort_order ASC);

-- RLS策略
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "forum_categories_select" ON forum_categories
  FOR SELECT
  USING (is_visible = TRUE);

-- 仅管理员可写
CREATE POLICY "forum_categories_insert" ON forum_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "forum_categories_update" ON forum_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "forum_categories_delete" ON forum_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================
-- 2. 论坛帖子表 (forum_threads)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 帖子内容
  title TEXT NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title) <= 200),
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 10),

  -- 状态管理
  status TEXT CHECK (status IN ('open', 'closed', 'archived')) DEFAULT 'open',
  is_locked BOOLEAN DEFAULT FALSE,      -- 锁定（禁止回复）
  is_pinned BOOLEAN DEFAULT FALSE,      -- 置顶
  is_featured BOOLEAN DEFAULT FALSE,    -- 精华帖

  -- 统计字段
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,

  -- 最新回复信息（方便排序）
  last_reply_at TIMESTAMPTZ,
  last_reply_user_id UUID REFERENCES auth.users(id),

  -- 审核字段
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 全文搜索向量
  search_vector tsvector
);

-- 索引
CREATE INDEX idx_forum_threads_category ON forum_threads(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_threads_user ON forum_threads(user_id);
CREATE INDEX idx_forum_threads_status ON forum_threads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_last_reply ON forum_threads(last_reply_at DESC NULLS LAST);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned DESC, created_at DESC);
CREATE INDEX idx_forum_threads_search ON forum_threads USING GIN(search_vector);

-- RLS策略
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;

-- 所有人可读（未删除的帖子）
CREATE POLICY "forum_threads_select" ON forum_threads
  FOR SELECT
  USING (deleted_at IS NULL);

-- 登录用户可创建
CREATE POLICY "forum_threads_insert" ON forum_threads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 作者可更新
CREATE POLICY "forum_threads_update" ON forum_threads
  FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'moderator')
  ));

-- 作者或管理员可删除
CREATE POLICY "forum_threads_delete" ON forum_threads
  FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'moderator')
  ));

-- ============================================
-- 3. 论坛回复表 (forum_replies)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE, -- 嵌套回复

  -- 回复内容
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1),

  -- 状态管理
  is_accepted_answer BOOLEAN DEFAULT FALSE, -- 最佳答案
  is_edited BOOLEAN DEFAULT FALSE,

  -- 统计字段
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,

  -- 审核字段
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_forum_replies_thread ON forum_replies(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX idx_forum_replies_parent ON forum_replies(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_replies_created ON forum_replies(created_at ASC);

-- RLS策略
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- 所有人可读（未删除的回复）
CREATE POLICY "forum_replies_select" ON forum_replies
  FOR SELECT
  USING (deleted_at IS NULL);

-- 登录用户可创建
CREATE POLICY "forum_replies_insert" ON forum_replies
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 作者可更新
CREATE POLICY "forum_replies_update" ON forum_replies
  FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'moderator')
  ));

-- 作者或管理员可删除
CREATE POLICY "forum_replies_delete" ON forum_replies
  FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'moderator')
  ));

-- ============================================
-- 4. 投票表 (forum_votes)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id) -- 一个用户只能对一个目标投一次票
);

-- 索引
CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX idx_forum_votes_target ON forum_votes(target_type, target_id);

-- RLS策略
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;

-- 用户可查看自己的投票
CREATE POLICY "forum_votes_select" ON forum_votes
  FOR SELECT
  USING (user_id = auth.uid());

-- 登录用户可投票
CREATE POLICY "forum_votes_insert" ON forum_votes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 用户可更新自己的投票（切换upvote/downvote）
CREATE POLICY "forum_votes_update" ON forum_votes
  FOR UPDATE
  USING (user_id = auth.uid());

-- 用户可删除自己的投票
CREATE POLICY "forum_votes_delete" ON forum_votes
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 5. 标签表 (forum_tags)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_forum_tags_slug ON forum_tags(slug);
CREATE INDEX idx_forum_tags_usage ON forum_tags(usage_count DESC);

-- RLS策略
ALTER TABLE forum_tags ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "forum_tags_select" ON forum_tags
  FOR SELECT
  USING (TRUE);

-- 登录用户可创建（通过发帖自动创建）
CREATE POLICY "forum_tags_insert" ON forum_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 6. 帖子-标签关联表 (forum_thread_tags)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_thread_tags (
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, tag_id)
);

-- 索引
CREATE INDEX idx_forum_thread_tags_thread ON forum_thread_tags(thread_id);
CREATE INDEX idx_forum_thread_tags_tag ON forum_thread_tags(tag_id);

-- RLS策略
ALTER TABLE forum_thread_tags ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "forum_thread_tags_select" ON forum_thread_tags
  FOR SELECT
  USING (TRUE);

-- 作者可添加标签
CREATE POLICY "forum_thread_tags_insert" ON forum_thread_tags
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM forum_threads
    WHERE forum_threads.id = thread_id
    AND forum_threads.user_id = auth.uid()
  ));

-- 作者可删除标签
CREATE POLICY "forum_thread_tags_delete" ON forum_thread_tags
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM forum_threads
    WHERE forum_threads.id = thread_id
    AND forum_threads.user_id = auth.uid()
  ));

-- ============================================
-- 7. 关注帖子表 (forum_thread_subscriptions)
-- ============================================
CREATE TABLE IF NOT EXISTS forum_thread_subscriptions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, thread_id)
);

-- 索引
CREATE INDEX idx_forum_thread_subs_user ON forum_thread_subscriptions(user_id);
CREATE INDEX idx_forum_thread_subs_thread ON forum_thread_subscriptions(thread_id);

-- RLS策略
ALTER TABLE forum_thread_subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户可查看自己的订阅
CREATE POLICY "forum_thread_subs_select" ON forum_thread_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- 用户可订阅帖子
CREATE POLICY "forum_thread_subs_insert" ON forum_thread_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 用户可取消订阅
CREATE POLICY "forum_thread_subs_delete" ON forum_thread_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 触发器：自动维护帖子回复统计
-- ============================================
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE forum_threads
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        last_reply_user_id = NEW.user_id
    WHERE id = NEW.thread_id;

    -- 同时更新分类的回复数
    UPDATE forum_categories
    SET reply_count = reply_count + 1
    WHERE id = (SELECT category_id FROM forum_threads WHERE id = NEW.thread_id);

  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE forum_threads
    SET reply_count = reply_count - 1
    WHERE id = OLD.thread_id;

    -- 同时更新分类的回复数
    UPDATE forum_categories
    SET reply_count = reply_count - 1
    WHERE id = (SELECT category_id FROM forum_threads WHERE id = OLD.thread_id);

  ELSIF TG_OP = 'UPDATE' AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    IF NEW.deleted_at IS NOT NULL THEN
      -- 软删除
      UPDATE forum_threads
      SET reply_count = reply_count - 1
      WHERE id = NEW.thread_id;

      UPDATE forum_categories
      SET reply_count = reply_count - 1
      WHERE id = (SELECT category_id FROM forum_threads WHERE id = NEW.thread_id);
    ELSE
      -- 恢复
      UPDATE forum_threads
      SET reply_count = reply_count + 1,
          last_reply_at = NEW.created_at,
          last_reply_user_id = NEW.user_id
      WHERE id = NEW.thread_id;

      UPDATE forum_categories
      SET reply_count = reply_count + 1
      WHERE id = (SELECT category_id FROM forum_threads WHERE id = NEW.thread_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_reply_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_reply_count();

-- ============================================
-- 触发器：自动维护分类帖子统计
-- ============================================
CREATE OR REPLACE FUNCTION update_category_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE forum_categories
    SET thread_count = thread_count + 1
    WHERE id = NEW.category_id;

  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE forum_categories
    SET thread_count = thread_count - 1
    WHERE id = OLD.category_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    IF NEW.deleted_at IS NOT NULL THEN
      -- 软删除
      UPDATE forum_categories
      SET thread_count = thread_count - 1
      WHERE id = NEW.category_id;
    ELSE
      -- 恢复
      UPDATE forum_categories
      SET thread_count = thread_count + 1
      WHERE id = NEW.category_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_thread_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_category_thread_count();

-- ============================================
-- 触发器：自动维护投票统计
-- ============================================
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'thread' THEN
      IF NEW.vote_type = 'upvote' THEN
        UPDATE forum_threads SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE forum_threads SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'reply' THEN
      IF NEW.vote_type = 'upvote' THEN
        UPDATE forum_replies SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE forum_replies SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'thread' THEN
      IF OLD.vote_type = 'upvote' THEN
        UPDATE forum_threads SET upvote_count = upvote_count - 1 WHERE id = OLD.target_id;
      ELSE
        UPDATE forum_threads SET downvote_count = downvote_count - 1 WHERE id = OLD.target_id;
      END IF;
    ELSIF OLD.target_type = 'reply' THEN
      IF OLD.vote_type = 'upvote' THEN
        UPDATE forum_replies SET upvote_count = upvote_count - 1 WHERE id = OLD.target_id;
      ELSE
        UPDATE forum_replies SET downvote_count = downvote_count - 1 WHERE id = OLD.target_id;
      END IF;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.vote_type <> OLD.vote_type THEN
    -- 切换 upvote/downvote
    IF NEW.target_type = 'thread' THEN
      IF NEW.vote_type = 'upvote' THEN
        UPDATE forum_threads SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE forum_threads SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'reply' THEN
      IF NEW.vote_type = 'upvote' THEN
        UPDATE forum_replies SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE forum_replies SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_count();

-- ============================================
-- 触发器：自动更新全文搜索向量
-- ============================================
CREATE OR REPLACE FUNCTION update_forum_thread_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forum_thread_search_vector
  BEFORE INSERT OR UPDATE OF title, content ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_thread_search_vector();

-- ============================================
-- 触发器：自动维护标签使用统计
-- ============================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_usage_count
  AFTER INSERT OR DELETE ON forum_thread_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- ============================================
-- 初始数据：4个默认分类
-- ============================================
INSERT INTO forum_categories (name, name_en, slug, description, description_en, icon, color, sort_order)
VALUES
  ('通用讨论', 'General Discussion', 'general', '分享你的想法和经验', 'Share your ideas and experiences', '💬', '#3B82F6', 1),
  ('教程与技巧', 'Tutorials & Tips', 'tutorials', '学习和分享AI创作技巧', 'Learn and share AI creation tips', '📚', '#10B981', 2),
  ('反馈与建议', 'Feedback & Suggestions', 'feedback', '帮助我们改进产品', 'Help us improve the product', '💡', '#F59E0B', 3),
  ('Bug报告', 'Bug Reports', 'bugs', '报告问题和错误', 'Report issues and bugs', '🐛', '#EF4444', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 🎉 老王完成：Phase 4 Community Forum 数据库迁移成功！
-- ============================================
