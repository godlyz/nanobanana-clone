-- Migration: Fix videos storage bucket public access (Version 2)
-- Created: 2025-01-19
-- Author: 老王 (修复视频公开访问400错误 - 正确版本)
-- Description: 添加公开访问策略，允许任何人通过public URL访问视频
--
-- 🔥 老王说明：
-- 之前的策略只允许登录用户查看自己的视频，但代码中使用的是 getPublicUrl()
-- 这会生成公开URL，但RLS策略阻止了未登录用户访问，导致400错误
-- 现在添加一个公开访问策略，允许所有人通过public URL查看视频
--
-- ⚠️ 注意：这个迁移需要使用 service_role 权限执行
-- 如果报错 "must be owner of relation objects"，请在 Supabase Dashboard 中手动配置

-- ============================================
-- 方法1：使用 Supabase 的 storage schema（推荐）
-- ============================================

-- 1. 删除旧的限制性策略（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can view own videos'
  ) THEN
    DROP POLICY "Users can view own videos" ON storage.objects;
  END IF;
END $$;

-- 2. 创建新的公开访问策略（允许匿名用户查看）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public videos access'
  ) THEN
    CREATE POLICY "Public videos access"
      ON storage.objects
      FOR SELECT
      TO public, anon, authenticated  -- 🔥 允许所有角色访问
      USING (bucket_id = 'videos');
  END IF;
END $$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "Public videos access" ON storage.objects IS
  '🔥 老王修复：允许任何人（包括未登录用户）通过public URL访问videos bucket中的视频文件。
   原因：代码中使用 getPublicUrl() 生成公开链接，不应该被RLS策略阻止。

   安全说明：
   - 虽然允许公开访问，但视频文件名使用UUID，难以被猜测
   - 如果未来需要私有访问，应该：
     1. 使用 createSignedUrl() 生成临时签名链接
     2. 修改此策略为更严格的条件

   角色说明：
   - public: 所有用户（包括未登录）
   - anon: 未登录用户（Supabase 匿名角色）
   - authenticated: 已登录用户';
