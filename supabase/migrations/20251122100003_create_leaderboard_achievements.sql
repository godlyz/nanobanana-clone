-- 🔥 老王的排行榜和成就系统数据库迁移
-- 用途: 创建成就定义表、用户成就表、排行榜统计表
-- 老王警告: 这些表是激励用户的核心，别tm搞乱了！

-- =====================================================
-- 1. 成就定义表 - achievements_definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS achievements_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基础信息
  name TEXT NOT NULL,
  name_en TEXT,                    -- 英文名称
  description TEXT,
  description_en TEXT,             -- 英文描述
  badge_icon TEXT,                 -- 徽章图标URL或emoji

  -- 成就条件
  condition_type TEXT NOT NULL,    -- 条件类型: works_count, likes_received, followers_count, comments_count, etc.
  condition_value INTEGER NOT NULL, -- 条件值（达到多少触发）

  -- 成就等级和奖励
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points INTEGER DEFAULT 0,        -- 成就点数

  -- 显示控制
  is_hidden BOOLEAN DEFAULT FALSE, -- 是否隐藏成就（达成前不显示）
  is_active BOOLEAN DEFAULT TRUE,  -- 是否启用
  sort_order INTEGER DEFAULT 0,    -- 排序权重

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成就定义表索引
CREATE INDEX idx_achievements_condition_type ON achievements_definitions(condition_type);
CREATE INDEX idx_achievements_tier ON achievements_definitions(tier);
CREATE INDEX idx_achievements_active ON achievements_definitions(is_active) WHERE is_active = TRUE;

-- 成就定义表RLS策略
ALTER TABLE achievements_definitions ENABLE ROW LEVEL SECURITY;

-- 所有人可读成就定义
CREATE POLICY "achievements_definitions_select" ON achievements_definitions
  FOR SELECT USING (is_active = TRUE);

-- 只有管理员可以修改（通过service_role）

-- =====================================================
-- 2. 用户成就表 - user_achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements_definitions(id) ON DELETE CASCADE,

  -- 解锁信息
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,      -- 当前进度（未解锁时）

  -- 是否已通知
  notified BOOLEAN DEFAULT FALSE,

  -- 唯一约束：一个用户只能解锁一个成就一次
  UNIQUE (user_id, achievement_id)
);

-- 用户成就表索引
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);
CREATE INDEX idx_user_achievements_notified ON user_achievements(notified) WHERE notified = FALSE;

-- 用户成就表RLS策略
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 用户可以查看所有人的成就
CREATE POLICY "user_achievements_select" ON user_achievements
  FOR SELECT USING (TRUE);

-- 用户只能看到自己的成就进度（通过API控制）

-- =====================================================
-- 3. 用户统计表 - user_stats (排行榜数据源)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 创作统计
  total_works INTEGER DEFAULT 0,           -- 总作品数
  total_videos INTEGER DEFAULT 0,          -- 总视频数

  -- 社交统计
  total_likes_received INTEGER DEFAULT 0,  -- 收到的总点赞数
  total_comments_received INTEGER DEFAULT 0, -- 收到的总评论数
  total_views INTEGER DEFAULT 0,           -- 总浏览量

  -- 关注统计
  followers_count INTEGER DEFAULT 0,       -- 粉丝数
  following_count INTEGER DEFAULT 0,       -- 关注数

  -- 成就统计
  achievements_count INTEGER DEFAULT 0,    -- 解锁成就数
  total_achievement_points INTEGER DEFAULT 0, -- 成就总点数

  -- 排行榜积分（综合评分）
  leaderboard_score INTEGER DEFAULT 0,     -- 排行榜积分

  -- 周期统计（用于周榜/月榜）
  weekly_likes INTEGER DEFAULT 0,          -- 本周点赞
  monthly_likes INTEGER DEFAULT 0,         -- 本月点赞
  weekly_works INTEGER DEFAULT 0,          -- 本周作品
  monthly_works INTEGER DEFAULT 0,         -- 本月作品

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ           -- 最后计算时间
);

-- 用户统计表索引（排行榜查询优化）
CREATE INDEX idx_user_stats_leaderboard ON user_stats(leaderboard_score DESC);
CREATE INDEX idx_user_stats_likes ON user_stats(total_likes_received DESC);
CREATE INDEX idx_user_stats_followers ON user_stats(followers_count DESC);
CREATE INDEX idx_user_stats_works ON user_stats(total_works DESC);
CREATE INDEX idx_user_stats_weekly_likes ON user_stats(weekly_likes DESC);
CREATE INDEX idx_user_stats_monthly_likes ON user_stats(monthly_likes DESC);
CREATE INDEX idx_user_stats_achievement_points ON user_stats(total_achievement_points DESC);

-- 用户统计表RLS策略
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看统计数据（排行榜需要）
CREATE POLICY "user_stats_select" ON user_stats
  FOR SELECT USING (TRUE);

-- 只有系统可以更新（通过triggers或service_role）

-- =====================================================
-- 4. 触发器函数
-- =====================================================

-- 更新用户统计表的updated_at
CREATE OR REPLACE FUNCTION update_user_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_stats_updated
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_timestamp();

-- 更新成就定义表的updated_at
CREATE OR REPLACE FUNCTION update_achievements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_achievements_updated
  BEFORE UPDATE ON achievements_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_achievements_timestamp();

-- 用户注册时自动创建统计记录
CREATE OR REPLACE FUNCTION create_user_stats_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注意：这个触发器可能需要在auth.users上创建，取决于Supabase配置
-- 如果无法在auth.users上创建触发器，则在首次访问时通过API创建

-- 解锁成就时更新用户统计
CREATE OR REPLACE FUNCTION update_user_achievement_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 获取成就点数
    UPDATE user_stats
    SET
      achievements_count = achievements_count + 1,
      total_achievement_points = total_achievement_points + COALESCE(
        (SELECT points FROM achievements_definitions WHERE id = NEW.achievement_id), 0
      )
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 扣除成就点数
    UPDATE user_stats
    SET
      achievements_count = GREATEST(0, achievements_count - 1),
      total_achievement_points = GREATEST(0, total_achievement_points - COALESCE(
        (SELECT points FROM achievements_definitions WHERE id = OLD.achievement_id), 0
      ))
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_user_achievements_stats
  AFTER INSERT OR DELETE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_achievement_stats();

-- =====================================================
-- 5. 初始成就数据
-- =====================================================
INSERT INTO achievements_definitions (name, name_en, description, description_en, badge_icon, condition_type, condition_value, tier, points, sort_order) VALUES
  -- 创作里程碑
  ('初出茅庐', 'First Creation', '发布第一个作品', 'Publish your first work', '🎨', 'works_count', 1, 'bronze', 10, 1),
  ('小有成就', 'Getting Started', '发布10个作品', 'Publish 10 works', '🖼️', 'works_count', 10, 'silver', 50, 2),
  ('创作达人', 'Creative Master', '发布50个作品', 'Publish 50 works', '🎭', 'works_count', 50, 'gold', 200, 3),
  ('艺术大师', 'Art Maestro', '发布100个作品', 'Publish 100 works', '👑', 'works_count', 100, 'platinum', 500, 4),
  ('传奇创作者', 'Legendary Creator', '发布500个作品', 'Publish 500 works', '🏆', 'works_count', 500, 'diamond', 2000, 5),

  -- 视频创作里程碑
  ('视频新手', 'Video Beginner', '生成第一个视频', 'Generate your first video', '🎬', 'videos_count', 1, 'bronze', 15, 6),
  ('视频爱好者', 'Video Enthusiast', '生成10个视频', 'Generate 10 videos', '📽️', 'videos_count', 10, 'silver', 75, 7),
  ('视频达人', 'Video Expert', '生成50个视频', 'Generate 50 videos', '🎥', 'videos_count', 50, 'gold', 300, 8),

  -- 人气里程碑（收到点赞）
  ('初获好评', 'First Like', '收到第一个点赞', 'Receive your first like', '❤️', 'likes_received', 1, 'bronze', 5, 10),
  ('小有人气', 'Getting Popular', '收到100个点赞', 'Receive 100 likes', '💕', 'likes_received', 100, 'silver', 100, 11),
  ('人气王', 'Popular Creator', '收到1000个点赞', 'Receive 1000 likes', '💖', 'likes_received', 1000, 'gold', 400, 12),
  ('万人迷', 'Super Star', '收到10000个点赞', 'Receive 10000 likes', '💝', 'likes_received', 10000, 'platinum', 1500, 13),

  -- 粉丝里程碑
  ('首位粉丝', 'First Follower', '获得第一个粉丝', 'Gain your first follower', '👤', 'followers_count', 1, 'bronze', 10, 20),
  ('小有名气', 'Rising Star', '获得50个粉丝', 'Gain 50 followers', '👥', 'followers_count', 50, 'silver', 100, 21),
  ('影响力者', 'Influencer', '获得500个粉丝', 'Gain 500 followers', '🌟', 'followers_count', 500, 'gold', 500, 22),
  ('大V', 'Celebrity', '获得5000个粉丝', 'Gain 5000 followers', '⭐', 'followers_count', 5000, 'platinum', 2000, 23),

  -- 互动里程碑
  ('热情评论者', 'Active Commenter', '发表50条评论', 'Post 50 comments', '💬', 'comments_count', 50, 'silver', 50, 30),
  ('社交达人', 'Social Butterfly', '发表200条评论', 'Post 200 comments', '🗣️', 'comments_count', 200, 'gold', 200, 31),

  -- 综合成就
  ('全能新星', 'Rising All-Rounder', '成就点数达到100', 'Reach 100 achievement points', '🌈', 'achievement_points', 100, 'silver', 0, 40),
  ('全能大师', 'Master All-Rounder', '成就点数达到1000', 'Reach 1000 achievement points', '🔥', 'achievement_points', 1000, 'gold', 0, 41),
  ('传奇玩家', 'Legendary Player', '成就点数达到5000', 'Reach 5000 achievement points', '💎', 'achievement_points', 5000, 'diamond', 0, 42)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. 计算排行榜积分的函数
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_leaderboard_score(
  works INTEGER,
  likes INTEGER,
  followers INTEGER,
  achievement_points INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- 计算公式：作品*10 + 点赞*1 + 粉丝*5 + 成就点数*0.5
  RETURN (works * 10) + (likes * 1) + (followers * 5) + (achievement_points / 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新所有用户的排行榜积分
CREATE OR REPLACE FUNCTION refresh_all_leaderboard_scores()
RETURNS void AS $$
BEGIN
  UPDATE user_stats
  SET
    leaderboard_score = calculate_leaderboard_score(
      total_works,
      total_likes_received,
      followers_count,
      total_achievement_points
    ),
    last_calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 更新单个用户的排行榜积分
CREATE OR REPLACE FUNCTION refresh_user_leaderboard_score(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_stats
  SET
    leaderboard_score = calculate_leaderboard_score(
      total_works,
      total_likes_received,
      followers_count,
      total_achievement_points
    ),
    last_calculated_at = NOW()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 🔥 老王备注:
-- 1. achievements_definitions存储所有成就定义
-- 2. user_achievements记录用户解锁的成就
-- 3. user_stats汇总用户统计数据，是排行榜的数据源
-- 4. 成就分5个等级: bronze/silver/gold/platinum/diamond
-- 5. 排行榜积分综合考虑作品、点赞、粉丝、成就
-- 6. 周榜/月榜通过weekly_likes/monthly_likes实现
-- 7. 需要定时任务重置周期统计数据
-- =====================================================
