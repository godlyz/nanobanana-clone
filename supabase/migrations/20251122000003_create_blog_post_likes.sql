-- Migration: Create blog_post_likes table
-- Created: 2025-11-22
-- Author: 老王
-- Purpose: 博客文章点赞系统，支持用户点赞/取消点赞、点赞统计、防重复点赞

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 创建blog_post_likes表（博客文章点赞）
-- ============================================
CREATE TABLE IF NOT EXISTS blog_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：一个用户对一篇文章只能点赞一次
  UNIQUE(post_id, user_id)
);

-- Create indexes for blog_post_likes
CREATE INDEX idx_blog_post_likes_post_id ON blog_post_likes(post_id);
CREATE INDEX idx_blog_post_likes_user_id ON blog_post_likes(user_id);
CREATE INDEX idx_blog_post_likes_created_at ON blog_post_likes(created_at DESC);

-- ============================================
-- 2. Triggers: Auto-update blog_posts.like_count
-- ============================================

-- 🔥 文章like_count自动更新（当点赞变化时）
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE blog_posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE blog_posts
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_like_count_insert
  AFTER INSERT ON blog_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER trigger_update_post_like_count_delete
  AFTER DELETE ON blog_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

ALTER TABLE blog_post_likes ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看点赞记录
CREATE POLICY "Anyone can view post likes"
  ON blog_post_likes
  FOR SELECT
  USING (true);

-- 认证用户可以为文章点赞
CREATE POLICY "Authenticated users can like posts"
  ON blog_post_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以取消自己的点赞
CREATE POLICY "Users can unlike their own likes"
  ON blog_post_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- 🔥 老王备注：
-- 1. 唯一约束防止重复点赞（一个用户对一篇文章只能点赞一次）
-- 2. like_count通过trigger自动维护，确保统计准确
-- 3. ON DELETE CASCADE确保删除文章或用户时自动清理点赞记录
-- 4. RLS策略：所有人可读，认证用户可创建和删除自己的点赞
-- 5. 索引优化：post_id查询、user_id查询、时间排序都有对应索引
-- 6. 点赞按钮逻辑：前端通过唯一约束判断是否已点赞，重复INSERT会报错（409 Conflict）
