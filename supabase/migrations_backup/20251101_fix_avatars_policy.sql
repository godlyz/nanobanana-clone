-- =============================================================================
-- 修复 avatars 桶的 RLS 策略，确保仅允许用户管理自己的文件
-- =============================================================================

BEGIN;

-- 尝试启用 storage.objects RLS；若无权限则忽略
DO $$
BEGIN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN insufficient_privilege THEN
        NULL;
END
$$;

-- 根据当前环境情况创建或更新 avatars_manage_own_files 策略
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'avatars_manage_own_files'
    ) THEN
        CREATE POLICY "avatars_manage_own_files"
        ON storage.objects
        AS PERMISSIVE
        FOR ALL
        TO authenticated
        USING (bucket_id = 'avatars'::text AND auth.uid() = owner)
        WITH CHECK (bucket_id = 'avatars'::text AND auth.uid() = owner);
    ELSE
        ALTER POLICY "avatars_manage_own_files"
        ON storage.objects
        TO authenticated
        USING (bucket_id = 'avatars'::text AND auth.uid() = owner)
        WITH CHECK (bucket_id = 'avatars'::text AND auth.uid() = owner);
    END IF;
END
$$;

COMMIT;
