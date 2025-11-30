-- =====================================================
-- Challenges & Competitions System - 数据库迁移
-- 创建时间: 2025-11-30
-- 作者: 老王
-- 描述: 创建挑战系统的4个核心表
-- =====================================================

-- =====================================================
-- Table 1: challenges (挑战表)
-- =====================================================
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  cover_image_url TEXT,

  -- 奖励配置（JSON格式）
  prizes JSONB NOT NULL DEFAULT '{
    "1st": {"credits": 1000, "badge": "gold_challenge_winner"},
    "2nd": {"credits": 500, "badge": "silver_challenge_winner"},
    "3rd": {"credits": 300, "badge": "bronze_challenge_winner"},
    "top10": {"credits": 100, "badge": "challenge_participant"}
  }'::jsonb,

  -- 时间控制
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- 状态管理
  status TEXT NOT NULL DEFAULT 'draft',

  -- 统计信息（冗余字段，提升查询性能）
  submission_count INT NOT NULL DEFAULT 0,
  participant_count INT NOT NULL DEFAULT 0,
  total_votes INT NOT NULL DEFAULT 0,

  -- 管理信息
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- 约束
  CONSTRAINT valid_time_range CHECK (end_at > start_at),
  CONSTRAINT valid_voting_period CHECK (voting_ends_at > end_at),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'voting', 'closed')),
  CONSTRAINT valid_category CHECK (category IN ('general', 'creative', 'technical', 'artistic'))
);

-- 索引
CREATE INDEX idx_challenges_status ON challenges(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_category ON challenges(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_start_at ON challenges(start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_end_at ON challenges(end_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_created_by ON challenges(created_by) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE challenges IS '挑战表 - 存储所有挑战/竞赛的基本信息';
COMMENT ON COLUMN challenges.prizes IS '奖励配置 - JSON格式存储各排名的奖励详情';
COMMENT ON COLUMN challenges.status IS '挑战状态: draft(草稿) | active(进行中) | voting(投票中) | closed(已结束)';
COMMENT ON COLUMN challenges.submission_count IS '提交数 - 冗余字段，通过触发器自动更新';
COMMENT ON COLUMN challenges.participant_count IS '参与人数 - 冗余字段，通过触发器自动更新';
COMMENT ON COLUMN challenges.total_votes IS '总投票数 - 冗余字段，通过触发器自动更新';

-- =====================================================
-- Table 2: challenge_submissions (作品提交表)
-- =====================================================
CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联关系
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 作品信息
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  thumbnail_url TEXT,

  -- 投票统计（冗余字段）
  vote_count INT NOT NULL DEFAULT 0,
  rank INT,

  -- 审计字段
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- 约束
  CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video')),
  CONSTRAINT unique_user_challenge UNIQUE (challenge_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- 创建唯一索引（排除软删除的记录）
CREATE UNIQUE INDEX idx_unique_active_user_challenge
ON challenge_submissions(challenge_id, user_id)
WHERE deleted_at IS NULL;

-- 其他索引
CREATE INDEX idx_submissions_challenge_id ON challenge_submissions(challenge_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_user_id ON challenge_submissions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_vote_count ON challenge_submissions(vote_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_rank ON challenge_submissions(rank) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_submitted_at ON challenge_submissions(submitted_at DESC) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE challenge_submissions IS '作品提交表 - 存储用户提交的挑战作品';
COMMENT ON COLUMN challenge_submissions.media_type IS '媒体类型: image | video';
COMMENT ON COLUMN challenge_submissions.vote_count IS '投票数 - 冗余字段，通过触发器自动更新';
COMMENT ON COLUMN challenge_submissions.rank IS '排名 - 投票结束后通过函数计算';

-- =====================================================
-- Table 3: challenge_votes (投票记录表)
-- =====================================================
CREATE TABLE IF NOT EXISTS challenge_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联关系
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 防作弊信息
  ip_address TEXT,
  user_agent TEXT,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,

  -- 时间戳
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,

  -- 约束（每人每个作品只能投1票，未撤回时）
  CONSTRAINT unique_active_user_submission_vote UNIQUE (submission_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- 创建唯一索引（排除已撤回的投票）
CREATE UNIQUE INDEX idx_unique_active_vote
ON challenge_votes(submission_id, user_id)
WHERE revoked_at IS NULL;

-- 其他索引
CREATE INDEX idx_votes_challenge_id ON challenge_votes(challenge_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_votes_submission_id ON challenge_votes(submission_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_votes_user_id ON challenge_votes(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_votes_ip_address ON challenge_votes(ip_address) WHERE revoked_at IS NULL;
CREATE INDEX idx_votes_voted_at ON challenge_votes(voted_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX idx_votes_suspicious ON challenge_votes(is_suspicious) WHERE is_suspicious = TRUE AND revoked_at IS NULL;

-- 注释
COMMENT ON TABLE challenge_votes IS '投票记录表 - 存储所有投票行为，包括防作弊信息';
COMMENT ON COLUMN challenge_votes.ip_address IS 'IP地址 - 用于防刷票检测';
COMMENT ON COLUMN challenge_votes.is_suspicious IS '可疑标记 - 异常投票行为标记';
COMMENT ON COLUMN challenge_votes.revoked_at IS '撤回时间 - NULL表示未撤回';

-- =====================================================
-- Table 4: challenge_rewards (奖励发放记录表)
-- =====================================================
CREATE TABLE IF NOT EXISTS challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联关系
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,

  -- 奖励信息
  rank INT NOT NULL,
  credits_awarded INT NOT NULL DEFAULT 0,
  badge_awarded TEXT,

  -- 发放状态
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- 时间戳
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- 约束
  CONSTRAINT valid_rank CHECK (rank > 0),
  CONSTRAINT valid_credits CHECK (credits_awarded >= 0),
  CONSTRAINT valid_reward_status CHECK (status IN ('pending', 'awarded', 'failed')),
  CONSTRAINT unique_challenge_user_reward UNIQUE (challenge_id, user_id)
);

-- 索引
CREATE INDEX idx_rewards_challenge_id ON challenge_rewards(challenge_id);
CREATE INDEX idx_rewards_user_id ON challenge_rewards(user_id);
CREATE INDEX idx_rewards_submission_id ON challenge_rewards(submission_id);
CREATE INDEX idx_rewards_status ON challenge_rewards(status) WHERE status != 'awarded';
CREATE INDEX idx_rewards_rank ON challenge_rewards(rank);

-- 注释
COMMENT ON TABLE challenge_rewards IS '奖励发放记录表 - 追踪挑战奖励的发放情况';
COMMENT ON COLUMN challenge_rewards.status IS '发放状态: pending(待发放) | awarded(已发放) | failed(发放失败)';
COMMENT ON COLUMN challenge_rewards.error_message IS '错误信息 - 发放失败时记录原因';

-- =====================================================
-- 触发器：自动更新 updated_at 字段
-- =====================================================

-- 函数：更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到 challenges 表
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 应用到 challenge_submissions 表
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 触发器：自动更新统计字段
-- =====================================================

-- 函数：更新挑战的提交统计
CREATE OR REPLACE FUNCTION update_challenge_submission_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    -- 新增提交
    UPDATE challenges
    SET
      submission_count = submission_count + 1,
      participant_count = (
        SELECT COUNT(DISTINCT user_id)
        FROM challenge_submissions
        WHERE challenge_id = NEW.challenge_id
          AND deleted_at IS NULL
      )
    WHERE id = NEW.challenge_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 软删除或恢复
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- 软删除
      UPDATE challenges
      SET
        submission_count = submission_count - 1,
        participant_count = (
          SELECT COUNT(DISTINCT user_id)
          FROM challenge_submissions
          WHERE challenge_id = NEW.challenge_id
            AND deleted_at IS NULL
        )
      WHERE id = NEW.challenge_id;

    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- 恢复
      UPDATE challenges
      SET
        submission_count = submission_count + 1,
        participant_count = (
          SELECT COUNT(DISTINCT user_id)
          FROM challenge_submissions
          WHERE challenge_id = NEW.challenge_id
            AND deleted_at IS NULL
        )
      WHERE id = NEW.challenge_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- 硬删除（不推荐使用）
    UPDATE challenges
    SET
      submission_count = submission_count - 1,
      participant_count = (
        SELECT COUNT(DISTINCT user_id)
        FROM challenge_submissions
        WHERE challenge_id = OLD.challenge_id
          AND deleted_at IS NULL
      )
    WHERE id = OLD.challenge_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
CREATE TRIGGER update_challenge_submission_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_submission_stats();

-- 函数：更新作品的投票统计
CREATE OR REPLACE FUNCTION update_submission_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.revoked_at IS NULL THEN
    -- 新增投票
    UPDATE challenge_submissions
    SET vote_count = vote_count + 1
    WHERE id = NEW.submission_id;

    UPDATE challenges
    SET total_votes = total_votes + 1
    WHERE id = NEW.challenge_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 撤回或恢复投票
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      -- 撤回投票
      UPDATE challenge_submissions
      SET vote_count = vote_count - 1
      WHERE id = NEW.submission_id;

      UPDATE challenges
      SET total_votes = total_votes - 1
      WHERE id = NEW.challenge_id;

    ELSIF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NULL THEN
      -- 恢复投票（理论上不应该发生）
      UPDATE challenge_submissions
      SET vote_count = vote_count + 1
      WHERE id = NEW.submission_id;

      UPDATE challenges
      SET total_votes = total_votes + 1
      WHERE id = NEW.challenge_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- 硬删除（不推荐使用）
    IF OLD.revoked_at IS NULL THEN
      UPDATE challenge_submissions
      SET vote_count = vote_count - 1
      WHERE id = OLD.submission_id;

      UPDATE challenges
      SET total_votes = total_votes - 1
      WHERE id = OLD.challenge_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
CREATE TRIGGER update_submission_vote_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON challenge_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_vote_stats();

-- =====================================================
-- RLS (Row Level Security) 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_rewards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS 策略：challenges 表
-- =====================================================

-- 所有人可查看非草稿、未删除的挑战
CREATE POLICY "所有人可查看已发布的挑战"
  ON challenges FOR SELECT
  TO public
  USING (status != 'draft' AND deleted_at IS NULL);

-- 管理员可查看所有挑战（包括草稿）
CREATE POLICY "管理员可查看所有挑战"
  ON challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- 管理员可创建挑战
CREATE POLICY "管理员可创建挑战"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- 管理员可更新挑战
CREATE POLICY "管理员可更新挑战"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- 管理员可删除挑战（软删除）
CREATE POLICY "管理员可删除挑战"
  ON challenges FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS 策略：challenge_submissions 表
-- =====================================================

-- 所有人可查看未删除的提交作品
CREATE POLICY "所有人可查看提交作品"
  ON challenge_submissions FOR SELECT
  TO public
  USING (deleted_at IS NULL);

-- 认证用户可创建提交作品
CREATE POLICY "认证用户可提交作品"
  ON challenge_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- 用户可更新自己的提交作品
CREATE POLICY "用户可更新自己的作品"
  ON challenge_submissions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 用户可删除自己的提交作品（软删除）
CREATE POLICY "用户可删除自己的作品"
  ON challenge_submissions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- RLS 策略：challenge_votes 表
-- =====================================================

-- 用户可查看自己的投票记录
CREATE POLICY "用户可查看自己的投票"
  ON challenge_votes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 认证用户可投票
CREATE POLICY "认证用户可投票"
  ON challenge_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND revoked_at IS NULL
  );

-- 用户可更新（撤回）自己的投票
CREATE POLICY "用户可撤回自己的投票"
  ON challenge_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 禁止硬删除投票记录
-- （不创建 DELETE 策略，强制使用软删除）

-- =====================================================
-- RLS 策略：challenge_rewards 表
-- =====================================================

-- 用户可查看自己的奖励记录
CREATE POLICY "用户可查看自己的奖励"
  ON challenge_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理员可查看所有奖励记录
CREATE POLICY "管理员可查看所有奖励"
  ON challenge_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- 系统可创建奖励记录（通过 service_role）
-- （不创建 INSERT 策略，仅允许 service_role 操作）

-- 系统可更新奖励状态（通过 service_role）
-- （不创建 UPDATE 策略，仅允许 service_role 操作）

-- =====================================================
-- 初始化数据（可选）
-- =====================================================

-- 插入示例挑战（仅开发环境）
-- UNCOMMENT BELOW FOR DEVELOPMENT ONLY
/*
INSERT INTO challenges (
  title,
  description,
  rules,
  category,
  start_at,
  end_at,
  voting_ends_at,
  status,
  created_by
) VALUES (
  'AI Art Challenge - December 2025',
  'Create stunning AI-generated art using any AI tool. Theme: Winter Wonderland',
  '1. Use any AI art tool\n2. Original creations only\n3. Maximum 1 submission per user\n4. Follow community guidelines',
  'artistic',
  '2025-12-01 00:00:00+00',
  '2025-12-31 23:59:59+00',
  '2026-01-02 23:59:59+00',
  'draft',
  (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
);
*/

-- =====================================================
-- 完成提示
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Challenges & Competitions tables created successfully!';
  RAISE NOTICE '📊 4 tables: challenges, challenge_submissions, challenge_votes, challenge_rewards';
  RAISE NOTICE '🔒 RLS policies enabled for all tables';
  RAISE NOTICE '⚡ Triggers configured for auto-updating stats';
  RAISE NOTICE '🎉 老王出品，必属精品！';
END $$;
