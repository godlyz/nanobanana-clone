/**
 * 🔥 老王的用户关注表
 * 用途: 存储用户之间的关注关系
 * 老王警告: 这个表必须防止自己关注自己，还要避免重复关注！
 */

-- 1. 创建user_follows表
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  -- 约束：不能关注自己
  CHECK (follower_id != following_id)
);

-- 2. 添加注释
COMMENT ON TABLE public.user_follows IS '用户关注关系表';
COMMENT ON COLUMN public.user_follows.follower_id IS '关注者ID';
COMMENT ON COLUMN public.user_follows.following_id IS '被关注者ID';
COMMENT ON COLUMN public.user_follows.created_at IS '关注时间';

-- 3. 创建索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- 4. 创建触发器函数：关注时更新follower_count和following_count
CREATE OR REPLACE FUNCTION public.increment_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- 增加被关注者的粉丝数
  UPDATE public.user_profiles
  SET follower_count = follower_count + 1
  WHERE user_id = NEW.following_id;

  -- 增加关注者的关注数
  UPDATE public.user_profiles
  SET following_count = following_count + 1
  WHERE user_id = NEW.follower_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器：新增关注记录时
DROP TRIGGER IF EXISTS trigger_increment_follow_counts ON public.user_follows;
CREATE TRIGGER trigger_increment_follow_counts
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_follow_counts();

-- 6. 创建触发器函数：取关时减少follower_count和following_count
CREATE OR REPLACE FUNCTION public.decrement_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- 减少被关注者的粉丝数
  UPDATE public.user_profiles
  SET follower_count = GREATEST(follower_count - 1, 0)
  WHERE user_id = OLD.following_id;

  -- 减少关注者的关注数
  UPDATE public.user_profiles
  SET following_count = GREATEST(following_count - 1, 0)
  WHERE user_id = OLD.follower_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器：删除关注记录时
DROP TRIGGER IF EXISTS trigger_decrement_follow_counts ON public.user_follows;
CREATE TRIGGER trigger_decrement_follow_counts
  AFTER DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_follow_counts();

-- 8. 启用RLS（行级安全）
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- 9. RLS策略：所有人都可以查看关注关系
DROP POLICY IF EXISTS "Follow relationships are viewable by everyone" ON public.user_follows;
CREATE POLICY "Follow relationships are viewable by everyone"
  ON public.user_follows
  FOR SELECT
  USING (true);

-- 10. RLS策略：用户只能创建自己的关注关系
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others"
  ON public.user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- 11. RLS策略：用户只能删除自己的关注关系
DROP POLICY IF EXISTS "Users can unfollow others" ON public.user_follows;
CREATE POLICY "Users can unfollow others"
  ON public.user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- 🔥 老王备注：
-- 1. 复合主键（follower_id, following_id）防止重复关注
-- 2. CHECK约束防止自己关注自己（这种SB操作必须拦截）
-- 3. 触发器自动维护user_profiles表的follower_count和following_count
-- 4. 使用GREATEST确保计数器不会变成负数
-- 5. 索引优化了常用查询（查某人的关注列表、粉丝列表等）
-- 6. RLS策略确保安全：所有人可查看，但只能管理自己的关注关系
