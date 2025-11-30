-- =====================================================
-- Forum 图片存储配置
-- =====================================================
-- 创建时间: 2025-11-25
-- 用途: 配置论坛图片上传的 Storage Bucket
--
-- Features:
-- - 创建 forum-images 存储桶
-- - 配置公共访问权限
-- - 设置文件大小限制（5MB）
-- - 支持图片格式：jpg, jpeg, png, gif, webp
-- - RLS 策略：登录用户可上传，所有人可查看
-- =====================================================

-- 1. 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true,  -- 公共访问
  5242880,  -- 5MB (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 允许所有人查看图片（公共读取）
CREATE POLICY "forum_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images');

-- 3. 允许登录用户上传图片
CREATE POLICY "forum_images_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images'
  AND auth.uid()::text = (storage.foldername(name))[1]  -- 只能上传到自己的文件夹
);

-- 4. 允许用户删除自己上传的图片
CREATE POLICY "forum_images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'forum-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. 允许用户更新自己上传的图片元数据
CREATE POLICY "forum_images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'forum-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'forum-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. 创建图片上传记录表（用于追踪和管理）
CREATE TABLE IF NOT EXISTS public.forum_image_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,  -- Storage 中的完整路径
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,  -- bytes
  mime_type TEXT NOT NULL,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE SET NULL,  -- 关联的帖子（可选）
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE SET NULL,  -- 关联的回复（可选）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 添加索引
CREATE INDEX IF NOT EXISTS idx_forum_image_uploads_user_id
  ON public.forum_image_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_forum_image_uploads_thread_id
  ON public.forum_image_uploads(thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_image_uploads_reply_id
  ON public.forum_image_uploads(reply_id) WHERE reply_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_image_uploads_created_at
  ON public.forum_image_uploads(created_at DESC);

-- 8. 添加触发器自动更新 updated_at
CREATE TRIGGER update_forum_image_uploads_updated_at
  BEFORE UPDATE ON public.forum_image_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 9. RLS 策略：用户可以查看所有图片记录
ALTER TABLE public.forum_image_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_image_uploads_public_read"
ON public.forum_image_uploads FOR SELECT
USING (true);

-- 10. RLS 策略：用户只能插入自己的上传记录
CREATE POLICY "forum_image_uploads_authenticated_insert"
ON public.forum_image_uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 11. RLS 策略：用户只能更新自己的上传记录
CREATE POLICY "forum_image_uploads_authenticated_update"
ON public.forum_image_uploads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 12. RLS 策略：用户只能删除自己的上传记录
CREATE POLICY "forum_image_uploads_authenticated_delete"
ON public.forum_image_uploads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 13. 添加注释
COMMENT ON TABLE public.forum_image_uploads IS '论坛图片上传记录表';
COMMENT ON COLUMN public.forum_image_uploads.storage_path IS 'Supabase Storage 中的完整路径';
COMMENT ON COLUMN public.forum_image_uploads.thread_id IS '关联的帖子ID（可选）';
COMMENT ON COLUMN public.forum_image_uploads.reply_id IS '关联的回复ID（可选）';
