-- Migration: Add video generation system configs
-- Created: 2025-01-17
-- Author: Nano Banana Team
-- Description: Insert video generation configuration into system_configs table

-- ============================================
-- 1. Insert Video Configuration
-- ============================================

-- Video credit pricing and system settings
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('video_credit_per_second', '10'::jsonb, 'number', 'Base credits charged per second of video (before resolution multiplier)'),
('video_1080p_multiplier', '1.5'::jsonb, 'number', 'Credit multiplier for 1080p resolution (1.0 for 720p)'),
('video_concurrent_limit', '3'::jsonb, 'number', 'Maximum concurrent video generation tasks per user'),
('video_generation_enabled', 'true'::jsonb, 'boolean', 'Enable/disable video generation feature globally'),
('video_max_retry_attempts', '3'::jsonb, 'number', 'Maximum download retry attempts for failed videos'),
('video_retry_delay_seconds', '30'::jsonb, 'number', 'Delay between download retry attempts')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 2. Helper Function for Config Retrieval
-- ============================================

-- Function to safely get video config value (returns JSONB)
CREATE OR REPLACE FUNCTION get_video_config(
  p_key TEXT,
  p_default JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT config_value INTO v_value
  FROM system_configs
  WHERE config_key = p_key;

  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_video_config IS
  'Retrieve video generation config value by key, with optional default';

-- ============================================
-- 3. Verification Query (commented out)
-- ============================================

/*
-- Verify all video configs exist
SELECT config_key, config_value, config_type, description
FROM system_configs
WHERE config_key LIKE 'video%'
ORDER BY config_key;

-- Test config retrieval
SELECT
  get_video_config('video_credit_per_second') AS credits_per_second,
  get_video_config('video_1080p_multiplier') AS multiplier_1080p,
  get_video_config('video_concurrent_limit') AS concurrent_limit,
  get_video_config('video_generation_enabled') AS is_enabled;
*/
