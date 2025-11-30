-- Migration: Extend credit_transactions for video generation
-- Created: 2025-01-17
-- Author: Nano Banana Team
-- Description: Add video generation support to credit transaction system

-- ============================================
-- 1. Extend Transaction Types
-- ============================================

-- Drop existing CHECK constraint
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

-- Add new CHECK constraint with video types
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type IN (
    -- Existing types (from current database)
    'subscription_refill',
    'image_generation',
    'purchase',
    'refund_image_generation',
    'admin_adjustment',
    'promotional_bonus',
    -- New video types
    'video_generation',
    'video_refund'
  ));

-- ============================================
-- 2. Add Metadata Column
-- ============================================

-- Add metadata column to store video-specific info
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create GIN index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_metadata
  ON credit_transactions USING GIN (metadata);

COMMENT ON COLUMN credit_transactions.metadata IS
  'Stores video generation details: task_id, duration, resolution, aspect_ratio, etc.';

-- ============================================
-- 3. Helper Function for Credit Calculation
-- ============================================

-- Function to calculate video generation credit cost
CREATE OR REPLACE FUNCTION calculate_video_credits(
  p_duration INTEGER,
  p_resolution TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_base_credits INTEGER;
  v_multiplier NUMERIC;
BEGIN
  -- Validate inputs
  IF p_duration NOT IN (4, 6, 8) THEN
    RAISE EXCEPTION 'Invalid duration: %. Must be 4, 6, or 8 seconds.', p_duration;
  END IF;

  IF p_resolution NOT IN ('720p', '1080p') THEN
    RAISE EXCEPTION 'Invalid resolution: %. Must be 720p or 1080p.', p_resolution;
  END IF;

  -- Base credits = duration × 10
  v_base_credits := p_duration * 10;

  -- Apply 1080p multiplier
  IF p_resolution = '1080p' THEN
    v_multiplier := 1.5;
  ELSE
    v_multiplier := 1.0;
  END IF;

  RETURN FLOOR(v_base_credits * v_multiplier);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_video_credits IS
  'Calculate credit cost for video generation: credits = duration × 10 × (is1080p ? 1.5 : 1.0)';

-- ============================================
-- 4. Example Usage (commented out)
-- ============================================

/*
-- Example: Insert video generation transaction
INSERT INTO credit_transactions (
  user_id, amount, balance_after, transaction_type, description, metadata
) VALUES (
  'user-uuid-here',
  -60,
  940,
  'video_generation',
  '生成6秒视频 (720p)',
  jsonb_build_object(
    'task_id', 'abc123',
    'duration', 6,
    'resolution', '720p',
    'aspect_ratio', '16:9'
  )
);

-- Example: Calculate credits
SELECT calculate_video_credits(6, '720p'); -- Returns 60
SELECT calculate_video_credits(8, '1080p'); -- Returns 120
*/
