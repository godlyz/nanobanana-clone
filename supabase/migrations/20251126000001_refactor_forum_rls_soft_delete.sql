/**
 * 🔥 老王创建：重构Forum RLS策略（软删除优化）
 * 日期：2025-11-26
 *
 * 问题：
 * 1. 当前DELETE策略允许物理删除，但trigger实现的是软删除逻辑
 * 2. 逻辑不一致，可能导致数据丢失
 *
 * 解决方案：
 * 1. 禁用DELETE策略（阻止物理删除）
 * 2. 更新UPDATE策略，允许作者设置deleted_at进行软删除
 * 3. 保持SELECT策略的deleted_at IS NULL过滤
 */

-- ==============================================
-- 1. Forum Threads 软删除RLS重构
-- ==============================================

-- 删除旧的DELETE策略
DROP POLICY IF EXISTS "forum_threads_delete" ON forum_threads;

-- 🔥 老王新增：禁止物理删除（强制使用软删除）
CREATE POLICY "forum_threads_no_physical_delete" ON forum_threads
  FOR DELETE
  USING (FALSE); -- 禁止所有DELETE操作

-- 更新UPDATE策略：允许作者和管理员软删除（设置deleted_at）
DROP POLICY IF EXISTS "forum_threads_update" ON forum_threads;

CREATE POLICY "forum_threads_update" ON forum_threads
  FOR UPDATE
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ==============================================
-- 2. Forum Replies 软删除RLS重构
-- ==============================================

-- 删除旧的DELETE策略
DROP POLICY IF EXISTS "forum_replies_delete" ON forum_replies;

-- 🔥 老王新增：禁止物理删除（强制使用软删除）
CREATE POLICY "forum_replies_no_physical_delete" ON forum_replies
  FOR DELETE
  USING (FALSE); -- 禁止所有DELETE操作

-- 更新UPDATE策略：允许作者和管理员软删除（设置deleted_at）
DROP POLICY IF EXISTS "forum_replies_update" ON forum_replies;

CREATE POLICY "forum_replies_update" ON forum_replies
  FOR UPDATE
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ==============================================
-- 3. 辅助函数：软删除帖子
-- ==============================================

/**
 * 🔥 老王新增：辅助函数soft_delete_thread
 * 用途：通过函数调用实现软删除（绕过RLS限制）
 * 参数：thread_id UUID
 * 返回：TRUE表示成功，FALSE表示失败
 */
CREATE OR REPLACE FUNCTION soft_delete_thread(thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为作者或管理员
  IF NOT (EXISTS (
    SELECT 1 FROM forum_threads
    WHERE id = thread_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )) THEN
    RAISE EXCEPTION '无权删除此帖子';
  END IF;

  -- 执行软删除
  UPDATE forum_threads
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = thread_id AND deleted_at IS NULL;

  -- 检查是否成功
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ==============================================
-- 4. 辅助函数：软删除回复
-- ==============================================

/**
 * 🔥 老王新增：辅助函数soft_delete_reply
 * 用途：通过函数调用实现软删除（绕过RLS限制）
 * 参数：reply_id UUID
 * 返回：TRUE表示成功，FALSE表示失败
 */
CREATE OR REPLACE FUNCTION soft_delete_reply(reply_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查是否为作者或管理员
  IF NOT (EXISTS (
    SELECT 1 FROM forum_replies
    WHERE id = reply_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )) THEN
    RAISE EXCEPTION '无权删除此回复';
  END IF;

  -- 执行软删除
  UPDATE forum_replies
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = reply_id AND deleted_at IS NULL;

  -- 检查是否成功
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ==============================================
-- 老王备注：
-- ==============================================
-- 1. 禁止物理DELETE，强制使用软删除（UPDATE设置deleted_at）
-- 2. SELECT策略已经过滤deleted_at IS NULL，无需修改
-- 3. 新增辅助函数soft_delete_thread和soft_delete_reply，方便API调用
-- 4. trigger会自动更新相关计数器（thread_count, reply_count）
-- 5. 🔥 生产环境可以定期清理deleted_at超过30天的记录（物理删除）
