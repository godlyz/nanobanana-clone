-- =============================================================================
-- 检查 admin_users 表的 RLS 策略
-- =============================================================================

-- 查看 admin_users 表的所有 RLS 策略
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- 检查 admin_users 表是否启用了 RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'admin_users';
