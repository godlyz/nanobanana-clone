-- Migration: Add privacy controls to generation history
-- Created: 2025-11-23
-- Author: 老王
-- Description: 添加作品隐私控制字段，支持 public/private/followers_only 三种模式

-- ============================================
-- Add privacy column to video_generation_history
-- ============================================

ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public'
CHECK (privacy IN ('public', 'private', 'followers_only'));

CREATE INDEX IF NOT EXISTS idx_video_generation_privacy
  ON video_generation_history(privacy)
  WHERE privacy = 'public';

COMMENT ON COLUMN video_generation_history.privacy IS
  'Visibility control: public (everyone), private (owner only), followers_only (owner + followers)';

-- ============================================
-- Add privacy column to generation_history (if exists)
-- ============================================

DO $$
BEGIN
  -- Check if generation_history table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generation_history') THEN
    -- Add privacy column
    ALTER TABLE generation_history
    ADD COLUMN IF NOT EXISTS privacy TEXT NOT NULL DEFAULT 'public'
    CHECK (privacy IN ('public', 'private', 'followers_only'));

    -- Create index for public artworks
    CREATE INDEX IF NOT EXISTS idx_generation_privacy
      ON generation_history(privacy)
      WHERE privacy = 'public';

    -- Add comment
    COMMENT ON COLUMN generation_history.privacy IS
      'Visibility control: public (everyone), private (owner only), followers_only (owner + followers)';
  END IF;
END $$;

-- ============================================
-- Update RLS policies for video_generation_history
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can view own video history" ON video_generation_history;

-- New policy: Users can see their own videos + public videos + followers-only videos if following
CREATE POLICY "Users can view videos based on privacy"
  ON video_generation_history
  FOR SELECT
  USING (
    auth.uid() = user_id OR  -- Own videos
    privacy = 'public' OR    -- Public videos
    (
      privacy = 'followers_only' AND  -- Followers-only videos
      EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = auth.uid() AND following_id = video_generation_history.user_id
      )
    )
  );

-- ============================================
-- Update RLS policies for generation_history (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generation_history') THEN
    -- Drop old policy
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own image history" ON generation_history';

    -- New policy: Users can see their own images + public images + followers-only images if following
    EXECUTE '
    CREATE POLICY "Users can view images based on privacy"
      ON generation_history
      FOR SELECT
      USING (
        auth.uid() = user_id OR  -- Own images
        privacy = ''public'' OR    -- Public images
        (
          privacy = ''followers_only'' AND  -- Followers-only images
          EXISTS (
            SELECT 1 FROM user_follows
            WHERE follower_id = auth.uid() AND following_id = generation_history.user_id
          )
        )
      )
    ';
  END IF;
END $$;

-- 🔥 老王备注：
-- 1. privacy字段默认值为'public'，保证向后兼容
-- 2. RLS策略更新为基于privacy字段的细粒度控制
-- 3. 索引优化：只索引public作品，提升查询性能
-- 4. followers_only模式依赖user_follows表（需要先有关注系统）
