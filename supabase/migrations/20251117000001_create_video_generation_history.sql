-- Migration: Create video_generation_history table
-- Created: 2025-01-17
-- Author: Nano Banana Team
-- Description: Video generation tracking with Google Veo 3.1 API

-- ============================================
-- Main Table
-- ============================================

CREATE TABLE IF NOT EXISTS video_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'downloading', 'completed', 'failed')),

  -- Input parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16:9', '9:16')),
  resolution TEXT NOT NULL CHECK (resolution IN ('720p', '1080p')),
  duration INTEGER NOT NULL CHECK (duration IN (4, 6, 8)),
  reference_image_url TEXT,

  -- Credit tracking
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),

  -- Video URLs
  google_video_url TEXT,  -- Temporary (2-day expiry)
  permanent_video_url TEXT,  -- Supabase Storage
  thumbnail_url TEXT,

  -- Metadata
  file_size_bytes BIGINT,

  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,

  CONSTRAINT valid_status_timestamps CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- ============================================
-- Indexes
-- ============================================

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_video_generation_user_id
  ON video_generation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_video_generation_status
  ON video_generation_history(status)
  WHERE status IN ('processing', 'downloading');

CREATE INDEX IF NOT EXISTS idx_video_generation_created_at
  ON video_generation_history(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_generation_operation_id
  ON video_generation_history(operation_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Enable RLS
ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own video generation history
CREATE POLICY "Users can view own video history"
  ON video_generation_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own records (via API)
CREATE POLICY "Users can create own video tasks"
  ON video_generation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update all records (for cron jobs)
CREATE POLICY "Service role can update all records"
  ON video_generation_history
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE video_generation_history IS
  'Stores all video generation requests and their status';

COMMENT ON COLUMN video_generation_history.operation_id IS
  'Google Veo operation ID (unique identifier from API response)';

COMMENT ON COLUMN video_generation_history.google_video_url IS
  'Temporary video URL from Google (expires after 2 days)';

COMMENT ON COLUMN video_generation_history.permanent_video_url IS
  'Permanent video URL in Supabase Storage (never expires)';

COMMENT ON COLUMN video_generation_history.status IS
  'processing: Waiting for Google to finish | downloading: Download in progress | completed: Ready | failed: Error occurred';

COMMENT ON COLUMN video_generation_history.credit_cost IS
  'Credits deducted for this video (calculated: duration × 10 × resolution_multiplier)';
