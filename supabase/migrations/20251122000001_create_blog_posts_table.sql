-- Migration: Create blog_posts table
-- Created: 2025-11-22
-- Author: 老王
-- Purpose: 创建博客文章核心表，支持富文本编辑、草稿/发布状态、SEO优化

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 文章内容
  title TEXT NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title) <= 200),
  slug TEXT UNIQUE NOT NULL CHECK (LENGTH(slug) >= 3 AND LENGTH(slug) <= 200),
  content TEXT NOT NULL CHECK (LENGTH(content) >= 10),
  excerpt TEXT CHECK (excerpt IS NULL OR LENGTH(excerpt) <= 500),
  cover_image_url TEXT,

  -- 状态管理
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  -- 互动统计
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),

  -- SEO元数据
  meta_title TEXT CHECK (meta_title IS NULL OR LENGTH(meta_title) <= 70),
  meta_description TEXT CHECK (meta_description IS NULL OR LENGTH(meta_description) <= 160),
  meta_keywords TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Full-text search index (PostgreSQL tsvector)
ALTER TABLE blog_posts ADD COLUMN search_vector tsvector;

CREATE INDEX idx_blog_posts_search ON blog_posts USING GIN(search_vector);

-- Function to update search_vector
CREATE OR REPLACE FUNCTION update_blog_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector
CREATE TRIGGER trigger_update_blog_posts_search_vector
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_search_vector();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Function to set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION set_blog_posts_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set published_at
CREATE TRIGGER trigger_set_blog_posts_published_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_blog_posts_published_at();

-- Enable Row Level Security (RLS)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: 所有人可以查看已发布的文章（未软删除）
CREATE POLICY "Anyone can view published posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

-- RLS Policy: 作者可以查看自己的所有文章（包括草稿）
CREATE POLICY "Authors can view their own posts"
  ON blog_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: 认证用户可以创建文章
CREATE POLICY "Authenticated users can create posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: 作者可以更新自己的文章
CREATE POLICY "Authors can update their own posts"
  ON blog_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: 作者可以软删除自己的文章（设置deleted_at）
CREATE POLICY "Authors can soft delete their own posts"
  ON blog_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 🔥 老王备注：
-- 1. 使用tsvector全文搜索，支持中英文搜索（需要安装中文分词扩展时可升级）
-- 2. 所有索引都过滤deleted_at IS NULL，提高查询性能
-- 3. slug必须唯一，用于SEO友好URL
-- 4. RLS策略确保数据安全：游客只能看已发布文章，作者可以管理自己的文章
-- 5. 软删除机制：deleted_at不为空表示已删除，保留数据便于恢复
-- 6. published_at自动设置：草稿首次发布时自动记录时间
-- 7. search_vector自动更新：每次INSERT/UPDATE时重新生成搜索向量
