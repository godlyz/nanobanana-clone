-- 🔥 老王的评论系统数据库迁移
-- 用途: 创建评论表，支持嵌套评论（最多3层）
-- 老王警告: 嵌套评论用parent_id实现，查询时用递归CTE，别tm搞成N+1查询！

-- ============================================
-- 1. 创建评论表
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'artwork', 'video')),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 2), -- 最多3层嵌套（0, 1, 2）
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- 软删除
);

-- ============================================
-- 2. 创建索引（查询优化）
-- ============================================
-- 按内容查询评论（最常用）
CREATE INDEX idx_comments_content ON comments(content_type, content_id) WHERE deleted_at IS NULL;

-- 按用户查询评论
CREATE INDEX idx_comments_user ON comments(user_id) WHERE deleted_at IS NULL;

-- 按父评论查询回复
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE deleted_at IS NULL;

-- 按创建时间排序
CREATE INDEX idx_comments_created ON comments(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- 3. 创建评论点赞表
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- 点赞索引
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);

-- ============================================
-- 4. RLS策略
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 评论：所有人可读（未删除的）
CREATE POLICY "comments_select_policy" ON comments
  FOR SELECT
  USING (deleted_at IS NULL);

-- 评论：登录用户可创建
CREATE POLICY "comments_insert_policy" ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 评论：只能更新自己的评论
CREATE POLICY "comments_update_policy" ON comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 评论：只能删除自己的评论
CREATE POLICY "comments_delete_policy" ON comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 评论点赞：所有人可读
CREATE POLICY "comment_likes_select_policy" ON comment_likes
  FOR SELECT
  USING (true);

-- 评论点赞：登录用户可创建
CREATE POLICY "comment_likes_insert_policy" ON comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 评论点赞：只能删除自己的点赞
CREATE POLICY "comment_likes_delete_policy" ON comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. 触发器：自动更新reply_count
-- ============================================
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    -- 新回复：增加父评论的reply_count
    UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    -- 删除回复：减少父评论的reply_count
    UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_comment_reply_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_reply_count();

-- ============================================
-- 6. 触发器：自动更新like_count
-- ============================================
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- ============================================
-- 7. 触发器：自动设置嵌套深度
-- ============================================
CREATE OR REPLACE FUNCTION set_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth = 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth FROM comments WHERE id = NEW.parent_id;
    -- 限制最大深度为2（即最多3层）
    IF NEW.depth > 2 THEN
      RAISE EXCEPTION '评论嵌套层级不能超过3层';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_comment_depth
BEFORE INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION set_comment_depth();

-- ============================================
-- 8. 触发器：自动更新updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_updated_at
BEFORE UPDATE OF content ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_updated_at();

-- 🔥 老王备注：
-- 1. depth字段限制嵌套层级（0=顶级, 1=一级回复, 2=二级回复）
-- 2. 软删除用deleted_at，方便恢复和审计
-- 3. reply_count和like_count通过触发器自动维护，别tm手动改
-- 4. RLS策略确保用户只能操作自己的数据
-- 5. 查询时记得过滤deleted_at IS NULL
