-- Migration: Create RLS policies for videos storage bucket
-- Created: 2025-01-17
-- Author: Nano Banana Team
-- Description: Set up Row Level Security policies for videos bucket
-- NOTE: You must create the 'videos' bucket in Supabase Dashboard first!

-- ============================================
-- Storage RLS Policies for 'videos' Bucket
-- ============================================

-- Policy: Service role can upload videos (download job uses this)
CREATE POLICY "Service role can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'service_role'
  );

-- Policy: Users can view their own videos
CREATE POLICY "Users can view own videos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Service role can update videos (for re-uploading or updating thumbnails)
CREATE POLICY "Service role can update videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'videos' AND
    auth.role() = 'service_role'
  );

-- Policy: Service role can delete videos (cleanup)
CREATE POLICY "Service role can delete videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'videos' AND
    auth.role() = 'service_role'
  );

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "Service role can upload videos" ON storage.objects IS
  'Allows Vercel Cron jobs to download videos from Google and upload to Supabase Storage';

COMMENT ON POLICY "Users can view own videos" ON storage.objects IS
  'Users can only view videos in their own folder (user_id prefix)';
