-- =============================================================================
-- Storage Bucket 设置脚本
-- 老王出品：创建 generation-history bucket 用于保存生成的图片
-- =============================================================================

-- 注意：这个脚本需要在 Supabase Dashboard 的 SQL Editor 中执行
-- 或者使用 Supabase CLI: supabase db reset

-- 1. 创建 Storage Bucket (如果不存在)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-history', 'generation-history', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 设置 Bucket 的 RLS 策略
-- 允许所有已认证用户读取自己上传的文件
CREATE POLICY IF NOT EXISTS "Users can view own generation history images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generation-history' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允许 Service Role 插入文件（API使用）
CREATE POLICY IF NOT EXISTS "Service role can upload generation history images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'generation-history');

-- 允许用户删除自己的文件
CREATE POLICY IF NOT EXISTS "Users can delete own generation history images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generation-history' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- 执行完成提示
-- =============================================================================
-- ✅ Storage Bucket 'generation-history' 已创建
-- ✅ RLS 策略已配置
-- ✅ 用户可以查看和删除自己的历史图片
-- ✅ Service Role 可以上传图片
