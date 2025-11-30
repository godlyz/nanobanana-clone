/**
 * 🔥 老王修复：添加 showcase_likes 表的 RLS 策略
 * 问题：表启用了 RLS 但没有任何策略，导致所有查询被阻止
 * 解决：添加必要的 SELECT、INSERT、DELETE 策略
 */

-- ============================================
-- showcase_likes 表 RLS 策略
-- ============================================

-- 1. 所有用户（包括匿名）可以查看点赞记录
-- 说明：用于展示点赞数量，不涉及敏感信息
CREATE POLICY "Anyone can view likes"
ON public.showcase_likes FOR SELECT
TO public
USING (true);

-- 2. 已认证用户可以点赞（INSERT）
-- 说明：只能给自己的用户ID创建点赞记录
CREATE POLICY "Authenticated users can like"
ON public.showcase_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. 已认证用户可以取消自己的点赞（DELETE）
-- 说明：只能删除自己的点赞记录
CREATE POLICY "Users can unlike their own likes"
ON public.showcase_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- ✅ 修复完成
-- ============================================
-- 现在 showcase_likes 表已经有完整的 RLS 策略：
-- - SELECT: 所有人可查看（public）
-- - INSERT: 认证用户可点赞（仅自己的记录）
-- - DELETE: 认证用户可取消点赞（仅自己的记录）
