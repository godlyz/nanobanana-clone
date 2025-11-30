-- ============================================
-- 🔥 老王创建：修复Forum表和user_profiles之间的关系
-- 日期：2025-11-25
-- 问题：API代码尝试JOIN user_profiles，但forum_threads.user_id指向auth.users
-- 解决：添加命名的外键约束，让Supabase能识别关系
-- ============================================

-- 注意：我们不能直接添加指向user_profiles的外键（会违反数据完整性）
-- 但是可以通过视图或者改变JOIN方式来解决

-- 方案1：创建视图，自动JOIN user_profiles
CREATE OR REPLACE VIEW forum_threads_with_profiles AS
SELECT
  ft.*,
  up_author.display_name AS author_display_name,
  up_author.avatar_url AS author_avatar_url,
  up_last_reply.display_name AS last_reply_display_name,
  up_last_reply.avatar_url AS last_reply_avatar_url
FROM forum_threads ft
LEFT JOIN user_profiles up_author ON ft.user_id = up_author.user_id
LEFT JOIN user_profiles up_last_reply ON ft.last_reply_user_id = up_last_reply.user_id;

-- 授予视图查询权限
GRANT SELECT ON forum_threads_with_profiles TO authenticated, anon;

-- 方案2：创建辅助函数，返回用户信息
CREATE OR REPLACE FUNCTION get_user_profile_info(user_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.display_name,
    up.avatar_url
  FROM user_profiles up
  WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 🔥 老王备注：
-- 1. 视图 forum_threads_with_profiles 自动JOIN了user_profiles
-- 2. API代码应该从这个视图查询，而不是直接用外键名JOIN
-- 3. 或者API代码需要改为手动LEFT JOIN user_profiles ON forum_threads.user_id = user_profiles.user_id
-- 4. Supabase的外键语法 `table!fkey_name` 仅适用于真实外键，不能用于跨表桥接
