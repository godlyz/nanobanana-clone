/**
 * 🔥 老王的作品点赞表
 * 用途: 统一管理图片和视频作品的点赞
 * 老王警告: 这个表要兼容image_generations和video_generations两个表！
 */

-- 1. 创建artwork_likes表
CREATE TABLE IF NOT EXISTS public.artwork_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL,
  artwork_type TEXT NOT NULL CHECK (artwork_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, artwork_id, artwork_type)
);

-- 2. 添加注释
COMMENT ON TABLE public.artwork_likes IS '作品点赞表（统一管理图片和视频）';
COMMENT ON COLUMN public.artwork_likes.user_id IS '点赞用户ID';
COMMENT ON COLUMN public.artwork_likes.artwork_id IS '作品ID（image_id或video_id）';
COMMENT ON COLUMN public.artwork_likes.artwork_type IS '作品类型（image或video）';
COMMENT ON COLUMN public.artwork_likes.created_at IS '点赞时间';

-- 3. 创建索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_artwork_likes_user_id ON public.artwork_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_likes_artwork_id_type ON public.artwork_likes(artwork_id, artwork_type);
CREATE INDEX IF NOT EXISTS idx_artwork_likes_created_at ON public.artwork_likes(created_at DESC);

-- 4. 创建触发器函数：点赞时增加like_count
CREATE OR REPLACE FUNCTION public.increment_artwork_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.artwork_type = 'image' THEN
    -- 增加图片的点赞数
    UPDATE public.image_generations
    SET like_count = like_count + 1
    WHERE id = NEW.artwork_id;
  ELSIF NEW.artwork_type = 'video' THEN
    -- 增加视频的点赞数
    UPDATE public.video_generations
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.artwork_id;
  END IF;

  -- 增加作品作者的总获赞数
  IF NEW.artwork_type = 'image' THEN
    UPDATE public.user_profiles
    SET total_likes = total_likes + 1
    WHERE user_id = (SELECT user_id FROM public.image_generations WHERE id = NEW.artwork_id);
  ELSIF NEW.artwork_type = 'video' THEN
    UPDATE public.user_profiles
    SET total_likes = total_likes + 1
    WHERE user_id = (SELECT user_id FROM public.video_generations WHERE id = NEW.artwork_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器：新增点赞记录时
DROP TRIGGER IF EXISTS trigger_increment_artwork_like_count ON public.artwork_likes;
CREATE TRIGGER trigger_increment_artwork_like_count
  AFTER INSERT ON public.artwork_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_artwork_like_count();

-- 6. 创建触发器函数：取消点赞时减少like_count
CREATE OR REPLACE FUNCTION public.decrement_artwork_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.artwork_type = 'image' THEN
    -- 减少图片的点赞数
    UPDATE public.image_generations
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.artwork_id;
  ELSIF OLD.artwork_type = 'video' THEN
    -- 减少视频的点赞数
    UPDATE public.video_generations
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.artwork_id;
  END IF;

  -- 减少作品作者的总获赞数
  IF OLD.artwork_type = 'image' THEN
    UPDATE public.user_profiles
    SET total_likes = GREATEST(total_likes - 1, 0)
    WHERE user_id = (SELECT user_id FROM public.image_generations WHERE id = OLD.artwork_id);
  ELSIF OLD.artwork_type = 'video' THEN
    UPDATE public.user_profiles
    SET total_likes = GREATEST(total_likes - 1, 0)
    WHERE user_id = (SELECT user_id FROM public.video_generations WHERE id = OLD.artwork_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器：删除点赞记录时
DROP TRIGGER IF EXISTS trigger_decrement_artwork_like_count ON public.artwork_likes;
CREATE TRIGGER trigger_decrement_artwork_like_count
  AFTER DELETE ON public.artwork_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_artwork_like_count();

-- 8. 启用RLS（行级安全）
ALTER TABLE public.artwork_likes ENABLE ROW LEVEL SECURITY;

-- 9. RLS策略：所有人都可以查看点赞记录
DROP POLICY IF EXISTS "Artwork likes are viewable by everyone" ON public.artwork_likes;
CREATE POLICY "Artwork likes are viewable by everyone"
  ON public.artwork_likes
  FOR SELECT
  USING (true);

-- 10. RLS策略：用户只能创建自己的点赞记录
DROP POLICY IF EXISTS "Users can like artworks" ON public.artwork_likes;
CREATE POLICY "Users can like artworks"
  ON public.artwork_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 11. RLS策略：用户只能删除自己的点赞记录
DROP POLICY IF EXISTS "Users can unlike artworks" ON public.artwork_likes;
CREATE POLICY "Users can unlike artworks"
  ON public.artwork_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- 🔥 老王备注：
-- 1. 复合主键（user_id, artwork_id, artwork_type）防止重复点赞同一作品
-- 2. artwork_type用于区分图片和视频，CHECK约束确保只能是'image'或'video'
-- 3. 触发器自动维护image_generations和video_generations的like_count
-- 4. 同时更新作品作者的total_likes（user_profiles表）
-- 5. 使用GREATEST确保计数器不会变成负数
-- 6. 使用COALESCE处理video_generations表可能为NULL的like_count
-- 7. 索引优化了常用查询（查某用户的所有点赞、某作品的点赞数等）
-- 8. RLS策略确保安全：所有人可查看，但只能管理自己的点赞记录
