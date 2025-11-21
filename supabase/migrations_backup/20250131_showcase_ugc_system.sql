/**
 * 🔥 老王的案例展示UGC推荐系统
 * 用途: 用户生成内容推荐、自动审核、点赞、积分奖励
 * 创建时间: 2025-01-31
 * 老王警告: 这个tm的系统涉及3个核心表，别乱改！
 */

-- ============================================
-- 1. showcase_submissions（推荐提交表）
-- ============================================
CREATE TABLE IF NOT EXISTS public.showcase_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_history_id UUID NOT NULL REFERENCES public.generation_history(id) ON DELETE CASCADE,
  image_index INTEGER NOT NULL DEFAULT 0, -- 指定是第几张图片（generation_history.generated_images数组索引）

  -- 作品信息
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('portrait', 'landscape', 'product', 'creative', 'anime', 'all')),
  tags JSONB DEFAULT '[]'::jsonb,

  -- 审核信息
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  similarity_score DECIMAL(5,4), -- 相似度分数（0-1）
  rejection_reason TEXT,
  admin_notes TEXT,

  -- 审核者
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：防止重复推荐同一张图片
  UNIQUE(generation_history_id, image_index)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_showcase_submissions_user_id ON public.showcase_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_showcase_submissions_status ON public.showcase_submissions(status);
CREATE INDEX IF NOT EXISTS idx_showcase_submissions_category ON public.showcase_submissions(category);
CREATE INDEX IF NOT EXISTS idx_showcase_submissions_created_at ON public.showcase_submissions(created_at DESC);

-- 自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_showcase_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_showcase_submissions_updated_at
BEFORE UPDATE ON public.showcase_submissions
FOR EACH ROW
EXECUTE FUNCTION update_showcase_submissions_updated_at();

-- ============================================
-- 2. showcase（公开展示表）
-- ============================================
CREATE TABLE IF NOT EXISTS public.showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  submission_id UUID NOT NULL UNIQUE REFERENCES public.showcase_submissions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 作品信息（冗余字段，提升查询性能）
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,

  -- 图片信息
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_hash TEXT, -- 图片哈希值（用于相似度检测）

  -- 创作者信息（冗余字段）
  creator_name VARCHAR(255),
  creator_avatar TEXT,

  -- 统计数据
  likes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,

  -- 精选相关
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_order INTEGER,

  -- 奖励状态
  milestone_100_rewarded BOOLEAN NOT NULL DEFAULT FALSE, -- 100赞奖励是否已发放
  similarity_checked BOOLEAN NOT NULL DEFAULT FALSE, -- 是否已检测相似度

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_showcase_creator_id ON public.showcase(creator_id);
CREATE INDEX IF NOT EXISTS idx_showcase_category ON public.showcase(category);
CREATE INDEX IF NOT EXISTS idx_showcase_likes_count ON public.showcase(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_showcase_published_at ON public.showcase(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_showcase_featured ON public.showcase(featured, featured_order) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_showcase_image_hash ON public.showcase(image_hash) WHERE image_hash IS NOT NULL;

-- 自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_showcase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_showcase_updated_at
BEFORE UPDATE ON public.showcase
FOR EACH ROW
EXECUTE FUNCTION update_showcase_updated_at();

-- ============================================
-- 3. showcase_likes（点赞记录表）
-- ============================================
CREATE TABLE IF NOT EXISTS public.showcase_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联信息
  showcase_id UUID NOT NULL REFERENCES public.showcase(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 唯一约束：防止重复点赞
  UNIQUE(showcase_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_showcase_likes_showcase_id ON public.showcase_likes(showcase_id);
CREATE INDEX IF NOT EXISTS idx_showcase_likes_user_id ON public.showcase_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_showcase_likes_created_at ON public.showcase_likes(created_at DESC);

-- ============================================
-- 4. 点赞触发器：自动更新likes_count
-- ============================================

-- 点赞后增加计数
CREATE OR REPLACE FUNCTION increment_showcase_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.showcase
  SET likes_count = likes_count + 1
  WHERE id = NEW.showcase_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_showcase_likes
AFTER INSERT ON public.showcase_likes
FOR EACH ROW
EXECUTE FUNCTION increment_showcase_likes();

-- 取消点赞后减少计数
CREATE OR REPLACE FUNCTION decrement_showcase_likes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.showcase
  SET likes_count = likes_count - 1
  WHERE id = OLD.showcase_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_showcase_likes
AFTER DELETE ON public.showcase_likes
FOR EACH ROW
EXECUTE FUNCTION decrement_showcase_likes();

-- ============================================
-- 5. 积分奖励触发器：100赞奖励10永久积分
-- ============================================
CREATE OR REPLACE FUNCTION reward_showcase_milestone_100()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
  v_showcase_title VARCHAR(255);
BEGIN
  -- 检查是否达到100赞且未奖励过
  IF NEW.likes_count >= 100 AND OLD.likes_count < 100 AND NEW.milestone_100_rewarded = FALSE THEN

    -- 标记为已奖励（防止重复奖励）
    UPDATE public.showcase
    SET milestone_100_rewarded = TRUE
    WHERE id = NEW.id;

    -- 获取创作者ID和作品标题
    SELECT creator_id, title INTO v_creator_id, v_showcase_title
    FROM public.showcase
    WHERE id = NEW.id;

    -- 奖励10永久积分
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      expiry_date,
      created_at
    ) VALUES (
      v_creator_id,
      10,
      'showcase_milestone_100',
      '🎉 案例《' || v_showcase_title || '》达到100赞！奖励10永久积分',
      NULL, -- 永久积分
      NOW()
    );

    -- 日志记录
    RAISE NOTICE '✅ 案例ID % 达到100赞，奖励创作者 % 10永久积分', NEW.id, v_creator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reward_showcase_milestone_100
AFTER UPDATE OF likes_count ON public.showcase
FOR EACH ROW
EXECUTE FUNCTION reward_showcase_milestone_100();

-- ============================================
-- 6. RLS（行级安全策略）
-- ============================================

-- 启用RLS
ALTER TABLE public.showcase_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_likes ENABLE ROW LEVEL SECURITY;

-- showcase_submissions表策略
-- 用户可以查看自己的提交
CREATE POLICY "Users can view their own submissions"
ON public.showcase_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 用户可以创建推荐（仅自己的作品）
CREATE POLICY "Users can create submissions for their own history"
ON public.showcase_submissions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.generation_history
    WHERE id = showcase_submissions.generation_history_id
    AND user_id = auth.uid()
  )
);

-- 用户可以更新自己的推荐（仅pending状态）
CREATE POLICY "Users can update their own pending submissions"
ON public.showcase_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的推荐（仅pending状态）
CREATE POLICY "Users can delete their own pending submissions"
ON public.showcase_submissions FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- showcase表策略
-- 所有人可以查看公开展示的作品
CREATE POLICY "Anyone can view approved showcase items"
ON public.showcase FOR SELECT
TO authenticated, anon
USING (TRUE);

-- showcase_likes表策略
-- 用户可以查看所有点赞记录
CREATE POLICY "Users can view all likes"
ON public.showcase_likes FOR SELECT
TO authenticated
USING (TRUE);

-- 用户可以点赞任何作品
CREATE POLICY "Users can like any showcase item"
ON public.showcase_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 用户可以取消自己的点赞
CREATE POLICY "Users can unlike their own likes"
ON public.showcase_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 7. 辅助函数：获取用户的推荐统计
-- ============================================
CREATE OR REPLACE FUNCTION get_user_submission_stats(p_user_id UUID)
RETURNS TABLE(
  total_submissions INTEGER,
  pending_submissions INTEGER,
  approved_submissions INTEGER,
  rejected_submissions INTEGER,
  total_likes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_submissions,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_submissions,
    COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved_submissions,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected_submissions,
    COALESCE(SUM(s.likes_count), 0)::INTEGER AS total_likes
  FROM public.showcase_submissions ss
  LEFT JOIN public.showcase s ON s.submission_id = ss.id
  WHERE ss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 辅助函数：检查用户是否已点赞
-- ============================================
CREATE OR REPLACE FUNCTION check_user_liked_showcase(p_user_id UUID, p_showcase_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.showcase_likes
    WHERE user_id = p_user_id AND showcase_id = p_showcase_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 🔥 老王的注释说明
-- ============================================
COMMENT ON TABLE public.showcase_submissions IS '🔥 用户推荐提交表：存储所有推荐请求，包含pending/approved/rejected状态';
COMMENT ON TABLE public.showcase IS '🔥 公开展示表：存储审核通过的作品，支持点赞、排序、筛选';
COMMENT ON TABLE public.showcase_likes IS '🔥 点赞记录表：防止重复点赞，自动更新likes_count';
COMMENT ON COLUMN public.showcase.milestone_100_rewarded IS '100赞奖励是否已发放（防止重复奖励）';
COMMENT ON COLUMN public.showcase.image_hash IS '图片哈希值，用于相似度检测（Phase 3实现）';

-- ✅ 迁移完成
SELECT '🎉 案例展示UGC系统数据库迁移完成！' AS message;
