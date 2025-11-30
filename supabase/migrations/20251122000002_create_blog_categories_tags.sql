-- Migration: Create blog_categories and blog_tags tables
-- Created: 2025-11-22
-- Author: 老王
-- Purpose: 博客分类和标签系统，支持文章分类管理、标签系统、多对多关系

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 创建blog_categories表（博客分类）
-- ============================================
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 分类信息
  name TEXT UNIQUE NOT NULL CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 50),
  slug TEXT UNIQUE NOT NULL CHECK (LENGTH(slug) >= 2 AND LENGTH(slug) <= 50),
  description TEXT CHECK (description IS NULL OR LENGTH(description) <= 200),

  -- 统计信息
  post_count INTEGER NOT NULL DEFAULT 0 CHECK (post_count >= 0),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for blog_categories
CREATE INDEX idx_blog_categories_slug ON blog_categories(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_categories_post_count ON blog_categories(post_count DESC) WHERE deleted_at IS NULL;

-- ============================================
-- 2. 创建blog_tags表（博客标签）
-- ============================================
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 标签信息
  name TEXT UNIQUE NOT NULL CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 30),
  slug TEXT UNIQUE NOT NULL CHECK (LENGTH(slug) >= 2 AND LENGTH(slug) <= 30),

  -- 统计信息
  post_count INTEGER NOT NULL DEFAULT 0 CHECK (post_count >= 0),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for blog_tags
CREATE INDEX idx_blog_tags_slug ON blog_tags(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_tags_post_count ON blog_tags(post_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_tags_name ON blog_tags(name) WHERE deleted_at IS NULL;

-- ============================================
-- 3. 创建blog_post_categories表（文章-分类关联）
-- ============================================
CREATE TABLE IF NOT EXISTS blog_post_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：一篇文章在同一分类下只能出现一次
  UNIQUE(post_id, category_id)
);

-- Create indexes for blog_post_categories
CREATE INDEX idx_blog_post_categories_post_id ON blog_post_categories(post_id);
CREATE INDEX idx_blog_post_categories_category_id ON blog_post_categories(category_id);

-- ============================================
-- 4. 创建blog_post_tags表（文章-标签关联）
-- ============================================
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：一篇文章在同一标签下只能出现一次
  UNIQUE(post_id, tag_id)
);

-- Create indexes for blog_post_tags
CREATE INDEX idx_blog_post_tags_post_id ON blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);

-- ============================================
-- 5. Triggers: Auto-update updated_at
-- ============================================

-- 🔥 分类表自动更新updated_at
CREATE OR REPLACE FUNCTION update_blog_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_categories_updated_at();

-- 🔥 标签表自动更新updated_at
CREATE OR REPLACE FUNCTION update_blog_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_tags_updated_at();

-- ============================================
-- 6. Triggers: Auto-update post_count
-- ============================================

-- 🔥 分类post_count自动更新（当文章-分类关联变化时）
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE blog_categories
    SET post_count = post_count + 1
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE blog_categories
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_post_count_insert
  AFTER INSERT ON blog_post_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_post_count();

CREATE TRIGGER trigger_update_category_post_count_delete
  AFTER DELETE ON blog_post_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_post_count();

-- 🔥 标签post_count自动更新（当文章-标签关联变化时）
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE blog_tags
    SET post_count = post_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE blog_tags
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_post_count_insert
  AFTER INSERT ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_post_count();

CREATE TRIGGER trigger_update_tag_post_count_delete
  AFTER DELETE ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_post_count();

-- ============================================
-- 7. Row Level Security (RLS)
-- ============================================

-- 🔥 blog_categories RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看未删除的分类
CREATE POLICY "Anyone can view categories"
  ON blog_categories
  FOR SELECT
  USING (deleted_at IS NULL);

-- 认证用户可以创建分类（实际生产环境可能需要管理员权限）
CREATE POLICY "Authenticated users can create categories"
  ON blog_categories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 认证用户可以更新分类（实际生产环境可能需要管理员权限）
CREATE POLICY "Authenticated users can update categories"
  ON blog_categories
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 🔥 blog_tags RLS
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看未删除的标签
CREATE POLICY "Anyone can view tags"
  ON blog_tags
  FOR SELECT
  USING (deleted_at IS NULL);

-- 认证用户可以创建标签（实际生产环境可能需要管理员权限）
CREATE POLICY "Authenticated users can create tags"
  ON blog_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 认证用户可以更新标签（实际生产环境可能需要管理员权限）
CREATE POLICY "Authenticated users can update tags"
  ON blog_tags
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 🔥 blog_post_categories RLS
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看文章-分类关联
CREATE POLICY "Anyone can view post categories"
  ON blog_post_categories
  FOR SELECT
  USING (true);

-- 文章作者可以管理自己文章的分类关联
CREATE POLICY "Authors can manage their post categories"
  ON blog_post_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_categories.post_id
      AND blog_posts.user_id = auth.uid()
    )
  );

-- 🔥 blog_post_tags RLS
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看文章-标签关联
CREATE POLICY "Anyone can view post tags"
  ON blog_post_tags
  FOR SELECT
  USING (true);

-- 文章作者可以管理自己文章的标签关联
CREATE POLICY "Authors can manage their post tags"
  ON blog_post_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_tags.post_id
      AND blog_posts.user_id = auth.uid()
    )
  );

-- 🔥 老王备注：
-- 1. 分类和标签都支持软删除（deleted_at字段）
-- 2. post_count字段通过trigger自动维护，确保统计准确
-- 3. 多对多关系通过junction表（blog_post_categories和blog_post_tags）实现
-- 4. 唯一约束防止重复关联（一篇文章不能多次关联同一分类/标签）
-- 5. ON DELETE CASCADE确保删除文章时自动清理关联关系
-- 6. RLS策略：所有人可读，认证用户可写（生产环境需改为管理员权限）
-- 7. 索引优化：slug查询、post_count排序、关联表查询都有对应索引
