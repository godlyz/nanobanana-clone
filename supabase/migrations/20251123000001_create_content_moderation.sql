-- Migration: Create content_moderation table
-- Created: 2025-11-23
-- Author: 老王（暴躁技术流）
-- Description: NSFW 内容审核系统 - 自动扫描图像和视频

-- ============================================
-- Main Table
-- ============================================

CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 内容信息
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
  content_id UUID NOT NULL,
  content_url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 扫描状态
  scan_status TEXT NOT NULL CHECK (scan_status IN ('pending', 'scanned', 'failed')) DEFAULT 'pending',
  scan_provider TEXT DEFAULT 'google_vision',
  scan_error TEXT,

  -- 风险评分（0-100）
  adult_score FLOAT DEFAULT 0 CHECK (adult_score >= 0 AND adult_score <= 100),
  violence_score FLOAT DEFAULT 0 CHECK (violence_score >= 0 AND violence_score <= 100),
  racy_score FLOAT DEFAULT 0 CHECK (racy_score >= 0 AND racy_score <= 100),
  medical_score FLOAT DEFAULT 0 CHECK (medical_score >= 0 AND medical_score <= 100),
  spoof_score FLOAT DEFAULT 0 CHECK (spoof_score >= 0 AND spoof_score <= 100),
  overall_risk_score FLOAT DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),

  -- 审核决策
  moderation_decision TEXT NOT NULL CHECK (moderation_decision IN ('approved', 'pending', 'rejected')) DEFAULT 'pending',
  decision_reason TEXT,

  -- 人工审核（可选）
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_reviewer_id UUID REFERENCES auth.users(id),
  manual_review_at TIMESTAMPTZ,
  manual_review_notes TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_content_moderation_content_id
  ON content_moderation(content_id);

CREATE INDEX IF NOT EXISTS idx_content_moderation_decision
  ON content_moderation(moderation_decision);

CREATE INDEX IF NOT EXISTS idx_content_moderation_scan_status
  ON content_moderation(scan_status);

CREATE INDEX IF NOT EXISTS idx_content_moderation_manual_review
  ON content_moderation(manual_review_required)
  WHERE manual_review_required = TRUE;

CREATE INDEX IF NOT EXISTS idx_content_moderation_user_id
  ON content_moderation(user_id);

CREATE INDEX IF NOT EXISTS idx_content_moderation_created_at
  ON content_moderation(created_at DESC);

-- 复合索引：查询待审核内容
CREATE INDEX IF NOT EXISTS idx_content_moderation_pending_review
  ON content_moderation(moderation_decision, manual_review_required)
  WHERE moderation_decision = 'pending';

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的审核记录
CREATE POLICY "Users can view own moderation records"
  ON content_moderation
  FOR SELECT
  USING (auth.uid() = user_id);

-- 管理员可以查看所有记录
CREATE POLICY "Admins can view all moderation records"
  ON content_moderation
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 服务角色可以插入和更新（用于API和Cron Jobs）
CREATE POLICY "Service role can insert moderation records"
  ON content_moderation
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY "Service role can update moderation records"
  ON content_moderation
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 管理员可以更新（人工审核）
CREATE POLICY "Admins can update moderation records"
  ON content_moderation
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- Functions
-- ============================================

-- 自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_content_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_moderation_updated_at
  BEFORE UPDATE ON content_moderation
  FOR EACH ROW
  EXECUTE FUNCTION update_content_moderation_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE content_moderation IS
  'NSFW content moderation records for images and videos';

COMMENT ON COLUMN content_moderation.content_type IS
  'Type of content: image or video';

COMMENT ON COLUMN content_moderation.overall_risk_score IS
  'Weighted overall risk score (0-100): 0-30 = safe, 30-70 = review, 70-100 = reject';

COMMENT ON COLUMN content_moderation.moderation_decision IS
  'Final moderation decision: approved, pending (awaiting review), rejected';

COMMENT ON COLUMN content_moderation.scan_provider IS
  'Service used for scanning: google_vision, nsfw_js, manual';

COMMENT ON COLUMN content_moderation.manual_review_required IS
  'TRUE if content needs human review (risk score 30-70)';
